const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const db = require('./db.cjs');
const { decrypt } = require('./crypto.cjs');

// State maps
const serverConnections = new Map(); // serverId -> Connection Object
// toolServerMap is removed as we dynamically lookup tool routing to support ZTA scoping

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
                console.log(`[MCP Router] Server ${connState.name} loaded ${toolsList.tools.length} tools.`);
            }
        } catch (e) {
            console.error(`[MCP ${connState.name}] Failed to list tools:`, e.message);
        }
    }

    return connState.mcpClientInstance;
}

/**
 * Calls a tool, routing it to the correct MCP server
 * @param {string} name - The tool name
 * @param {object} args - The arguments for the tool
 * @param {string[]} allowedWidgets - The user's allowed widgets array to enforce granular permissions
 */
async function callMcpTool(name, args, allowedWidgets = ['*']) {
    if (serverConnections.size === 0) {
        await refreshConnections();
    }

    // Dynamically find a server that provides this tool AND the user has access to
    const hasWildcard = allowedWidgets.includes('*');
    let targetConnState = null;

    for (const [id, conn] of serverConnections.entries()) {
        if (!hasWildcard && !allowedWidgets.includes(`mcp:${id}`)) continue;
        
        if (conn.tools && conn.tools.some(t => t.name === name)) {
            targetConnState = conn;
            break; // Found an accessible server providing this tool
        }
    }

    if (!targetConnState) {
        throw new Error(`Access denied or Tool '${name}' is not registered by any accessible MCP Server.`);
    }

    try {
        const client = await ensureConnection(targetConnState);
        const result = await client.callTool({
            name: name,
            arguments: args || {}
        });
        return result;
    } catch (error) {
        console.error(`[MCP ${targetConnState.name}] Error calling Tool ${name}:`, error);
        
        if (targetConnState.mcpTransport) {
             try { await targetConnState.mcpTransport.close(); } catch(e) {}
             targetConnState.mcpTransport = null;
        }
        targetConnState.mcpClientInstance = null;
        
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
    }
}

/**
 * Gets all tools from all connected MCP servers formatted for Gemini functionDeclarations
 * @param {string[]} allowedWidgets - The user's allowed widgets array to filter the tools
 */
async function getAllMcpToolsForGemini(allowedWidgets = ['*']) {
    if (serverConnections.size === 0) {
        await refreshConnections();
    }
    
    const functionDeclarations = [];
    const addedToolNames = new Set();
    const hasWildcard = allowedWidgets.includes('*');
    
    for (const [id, conn] of serverConnections.entries()) {
        if (!hasWildcard && !allowedWidgets.includes(`mcp:${id}`)) {
            continue; // Skip tools from this server if user doesn't have permission
        }

        if (conn.tools) {
            for (const tool of conn.tools) {
                const safeName = tool.name.replace(/[^a-zA-Z0-9_]/g, '_'); // Gemini only allows a-z, A-Z, 0-9, and _
                
                if (addedToolNames.has(safeName)) {
                    continue; // Skip duplicate tool declarations
                }
                addedToolNames.add(safeName);

                const funcDecl = {
                    name: safeName,
                    description: tool.description || `MCP Tool: ${tool.name}`,
                };
                
                if (tool.inputSchema) {
                    // MCP uses JSON Schema. Gemini supports a subset of JSON Schema.
                    const properties = {};
                    const required = [];
                    
                    if (tool.inputSchema.properties) {
                        for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
                            // Map type to one of Gemini's supported types
                            let typeStr = 'string';
                            if (value.type === 'integer' || value.type === 'number') typeStr = 'number';
                            if (value.type === 'boolean') typeStr = 'boolean';
                            if (value.type === 'array') typeStr = 'array';
                            if (value.type === 'object') typeStr = 'object';
                            
                            properties[key] = {
                                type: typeStr,
                                description: value.description || ''
                            };
                        }
                    }
                    if (Array.isArray(tool.inputSchema.required)) {
                        required.push(...tool.inputSchema.required);
                    }
                    
                    funcDecl.parameters = {
                        type: "object",
                        properties: Object.keys(properties).length > 0 ? properties : undefined,
                        required: required.length > 0 ? required : undefined
                    };
                }
        }
    }
    
    return functionDeclarations;
}

/**
 * Tests an MCP connection without saving to the database
 * @param {object} config - The temporary server configuration
 * @returns {object} Result with success boolean and tool count or error message
 */
async function testMcpConnection(config) {
    const { endpoint_url, token_url, client_id, client_secret } = config;
    
    if (!endpoint_url) {
        return { success: false, error: "Endpoint URL is required." };
    }

    const tempState = {
        name: 'TestConnection',
        endpoint_url,
        token_url,
        client_id,
        client_secret,
        tokenCache: { accessToken: null, expiresAt: null }
    };

    let mcpTransport = null;
    let mcpClientInstance = null;

    try {
        // 1. Attempt to get Token if configured
        let token = null;
        if (token_url && client_id && client_secret) {
            token = await getOAuthToken(tempState);
        }

        // 2. Attempt SSE connection
        const sseUrl = new URL(endpoint_url);
        let requestInit = {};

        if (token) {
            sseUrl.searchParams.set('access_token', token);
            requestInit = {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };
        }

        mcpTransport = new SSEClientTransport(sseUrl, { requestInit });
        mcpClientInstance = new Client({ name: "macos-ui-test", version: "1.0.0" }, { capabilities: {} });

        await mcpClientInstance.connect(mcpTransport);
        
        // 3. Fetch tools to verify functionality
        const toolsList = await mcpClientInstance.listTools();
        const toolCount = toolsList?.tools?.length || 0;

        return { success: true, toolCount };

    } catch (error) {
        return { success: false, error: error.message || String(error) };
    } finally {
        // Cleanup connection
        if (mcpTransport) {
            try { await mcpTransport.close(); } catch(e) {}
        }
    }
}

// Auto-init on load
setTimeout(() => refreshConnections(), 2000);

module.exports = {
    callMcpTool,
    refreshConnections,
    disconnectServer,
    getAllMcpToolsForGemini,
    testMcpConnection
};
