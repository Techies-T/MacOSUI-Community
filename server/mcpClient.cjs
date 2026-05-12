const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const db = require('./db.cjs');
const { decrypt } = require('./crypto.cjs');

// State maps
const serverConnections = new Map(); // serverId -> Connection Object
const toolServerMap = new Map(); // toolName -> serverId

/**
 * Loads all MCP servers from the database and initializes them if not already connected.
 */
async function refreshConnections() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM mcp_servers", [], async (err, rows) => {
            if (err) return reject(err);
            
            for (const row of rows) {
                if (!serverConnections.has(row.id)) {
                    let clientSecret = row.client_secret;
                    if (clientSecret) {
                        try {
                            clientSecret = decrypt(clientSecret);
                        } catch(e) {
                            console.error(`[MCP] Failed to decrypt secret for server ${row.name}`);
                            clientSecret = null;
                        }
                    }

                    const connState = {
                        id: row.id,
                        name: row.name,
                        endpoint_url: row.endpoint_url,
                        token_url: row.token_url,
                        client_id: row.client_id,
                        client_secret: clientSecret,
                        mcpClientInstance: null,
                        mcpTransport: null,
                        tokenCache: { accessToken: null, expiresAt: null },
                        tools: []
                    };
                    serverConnections.set(row.id, connState);
                }
                
                // Ensure connection is established in the background
                try {
                    await ensureConnection(serverConnections.get(row.id));
                } catch (e) {
                    console.error(`[MCP] Failed to connect to MCP Server ${row.name}:`, e.message);
                }
            }
            resolve();
        });
    });
}

/**
 * Fetches an OAuth token using Client Credentials for a specific server
 */
async function getOAuthToken(connState) {
    if (!connState.token_url) {
        return null;
    }
    
    if (!connState.client_id || !connState.client_secret) {
        return null;
    }

    try {
        const response = await fetch(connState.token_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'client_id': connState.client_id,
                'client_secret': connState.client_secret
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to fetch OAuth token: ${response.status} ${errText}`);
        }

        const data = await response.json();
        
        connState.tokenCache.accessToken = data.access_token;
        const expiresIn = data.expires_in || 3600; 
        connState.tokenCache.expiresAt = Date.now() + (expiresIn - 300) * 1000; 

        console.log(`[MCP ${connState.name}] OAuth Token successfully acquired.`);
        return connState.tokenCache.accessToken;

    } catch (error) {
        console.error(`[MCP ${connState.name}] OAuth Token Acquisition Error:`, error);
        throw error;
    }
}

/**
 * Returns a valid access token for a server
 */
async function getValidToken(connState) {
    if (connState.tokenCache.accessToken && connState.tokenCache.expiresAt && Date.now() < connState.tokenCache.expiresAt) {
        return connState.tokenCache.accessToken;
    }
    return await getOAuthToken(connState);
}

/**
 * Ensures the MCP client is connected for a specific server
 */
async function ensureConnection(connState) {
    if (!connState.endpoint_url) {
        throw new Error("Endpoint URL is not configured.");
    }

    const token = await getValidToken(connState);

    if (!connState.mcpClientInstance || !connState.mcpTransport) {
        console.log(`[MCP ${connState.name}] Connecting to MCP Server at ${connState.endpoint_url}...`);
        
        const sseUrl = new URL(connState.endpoint_url);
        let requestInit = {};

        if (token) {
            sseUrl.searchParams.set('access_token', token);
            requestInit = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
        }

        connState.mcpTransport = new SSEClientTransport(sseUrl, { requestInit });

        connState.mcpClientInstance = new Client(
            {
                name: "macos-ui-client",
                version: "1.0.0"
            },
            {
                capabilities: {}
            }
        );

        await connState.mcpClientInstance.connect(connState.mcpTransport);
        console.log(`[MCP ${connState.name}] Client connected successfully.`);
        
        // Fetch tools to populate routing map
        try {
            const toolsList = await connState.mcpClientInstance.listTools();
            if (toolsList && toolsList.tools) {
                connState.tools = toolsList.tools;
                for (const tool of toolsList.tools) {
                    toolServerMap.set(tool.name, connState.id);
                    console.log(`[MCP Router] Registered tool '${tool.name}' to server ${connState.name}`);
                }
            }
        } catch (e) {
            console.error(`[MCP ${connState.name}] Failed to list tools:`, e.message);
        }
    }

    return connState.mcpClientInstance;
}

/**
 * Calls a tool, routing it to the correct MCP server
 */
async function callMcpTool(name, args) {
    if (serverConnections.size === 0) {
        await refreshConnections();
    }

    const serverId = toolServerMap.get(name);
    if (!serverId) {
        await refreshConnections();
        if (!toolServerMap.has(name)) {
            throw new Error(`Tool '${name}' is not registered by any connected MCP Server.`);
        }
    }

    const connState = serverConnections.get(toolServerMap.get(name));
    if (!connState) {
        throw new Error(`Server for tool '${name}' is not available.`);
    }

    try {
        const client = await ensureConnection(connState);
        const result = await client.callTool({
            name: name,
            arguments: args || {}
        });
        return result;
    } catch (error) {
        console.error(`[MCP ${connState.name}] Error calling Tool ${name}:`, error);
        
        if (connState.mcpTransport) {
             try { await connState.mcpTransport.close(); } catch(e) {}
             connState.mcpTransport = null;
        }
        connState.mcpClientInstance = null;
        
        throw error;
    }
}

/**
 * Disconnects a specific server (e.g. when deleted or updated via API)
 */
function disconnectServer(serverId) {
    const connState = serverConnections.get(serverId);
    if (connState) {
        if (connState.mcpTransport) {
            try { connState.mcpTransport.close(); } catch(e) {}
        }
        serverConnections.delete(serverId);
        
        for (const [toolName, sid] of toolServerMap.entries()) {
            if (sid === serverId) {
                toolServerMap.delete(toolName);
            }
        }
    }
}

/**
 * Gets all tools from all connected MCP servers formatted for Gemini functionDeclarations
 */
async function getAllMcpToolsForGemini() {
    if (serverConnections.size === 0) {
        await refreshConnections();
    }
    
    const functionDeclarations = [];
    
    for (const [id, conn] of serverConnections.entries()) {
        if (conn.tools) {
            for (const tool of conn.tools) {
                const funcDecl = {
                    name: tool.name.replace(/[^a-zA-Z0-9_]/g, '_'), // Gemini only allows a-z, A-Z, 0-9, and _
                    description: tool.description || `MCP Tool: ${tool.name}`,
                };
                
                if (tool.inputSchema) {
                    // MCP uses JSON Schema. Gemini supports a subset of JSON Schema.
                    funcDecl.parameters = tool.inputSchema;
                }
                
                functionDeclarations.push(funcDecl);
            }
        }
    }
    
    return functionDeclarations;
}

// Auto-init on load
setTimeout(() => refreshConnections(), 2000);

module.exports = {
    callMcpTool,
    refreshConnections,
    disconnectServer,
    getAllMcpToolsForGemini
};
