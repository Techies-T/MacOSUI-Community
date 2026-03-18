const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const db = require('./db.cjs');

// Memory store for multiple connections (if ever needed) or caching state
let mcpClientInstance = null;
let mcpTransport = null;
let tokenCache = {
    accessToken: null,
    expiresAt: null
};

/**
 * Fetches an OAuth token using Client Credentials
 */
async function getOAuthToken() {
    const tokenUrl = await db.getSetting('MCP_TOKEN_URL');
    if (!tokenUrl) {
        throw new Error("MCP_TOKEN_URL is not configured.");
    }
    
    const clientId = 'employee-agent'; // Requirement specific
    const clientSecret = process.env.JWT_SECRET;

    if (!clientSecret) {
        throw new Error("JWT_SECRET environment variable is missing (used for MCP OAuth client secret).");
    }

    try {
        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                'grant_type': 'client_credentials',
                'client_id': clientId,
                'client_secret': clientSecret
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Failed to fetch OAuth token: ${response.status} ${errText}`);
        }

        const data = await response.json();
        
        tokenCache.accessToken = data.access_token;
        // set expiry 5 minutes before actual expiry for buffer
        const expiresIn = data.expires_in || 3600; 
        tokenCache.expiresAt = Date.now() + (expiresIn - 300) * 1000; 

        console.log("MCP OAuth Token successfully acquired.");
        return tokenCache.accessToken;

    } catch (error) {
        console.error("OAuth Token Acquisition Error:", error);
        throw error;
    }
}

/**
 * Returns a valid access token, fetching a new one if necessary.
 */
async function getValidToken() {
    if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt) {
        return tokenCache.accessToken;
    }
    return await getOAuthToken();
}

/**
 * Ensures the MCP client is connected. Re-connects if token changed or connection lost.
 */
async function ensureConnection() {
    const endpoint = await db.getSetting('MCP_SERVER_ENDPOINT');
    if (!endpoint) {
        throw new Error("MCP_SERVER_ENDPOINT is not configured.");
    }

    const token = await getValidToken();

    // If already connected and transport exists, verify it (basic check). 
    // Usually SSE Client reconnects automatically or throws if failed. 
    // We will recreate if it's completely null.
    
    if (!mcpClientInstance || !mcpTransport) {
        console.log(`Connecting to MCP Server at ${endpoint}...`);
        
        // SDK internally uses `requestInit.headers` to inject headers into SSE fetch calls.
        // Also pass the token as ?access_token= as a fallback (some servers may prefer it).
        const sseUrl = new URL(endpoint);
        sseUrl.searchParams.set('access_token', token);

        mcpTransport = new SSEClientTransport(sseUrl, {
            requestInit: {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        });

        mcpClientInstance = new Client(
            {
                name: "macos-ui-client",
                version: "1.0.0"
            },
            {
                capabilities: {}
            }
        );

        await mcpClientInstance.connect(mcpTransport);
        console.log("MCP Client connected successfully.");
    }

    return mcpClientInstance;
}

/**
 * Calls a tool on the connected MCP server.
 */
async function callMcpTool(name, args) {
    try {
        const client = await ensureConnection();
        const result = await client.callTool({
            name: name,
            arguments: args || {}
        });
        return result;
    } catch (error) {
        console.error(`Error calling MCP Tool ${name}:`, error);
        
        // Basic error recovery: reset connection state so it tries again next time
        if (mcpTransport) {
             try { await mcpTransport.close(); } catch(e) {}
             mcpTransport = null;
        }
        mcpClientInstance = null;
        
        throw error;
    }
}

module.exports = {
    callMcpTool
};
