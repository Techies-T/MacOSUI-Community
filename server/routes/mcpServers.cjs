const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { encrypt, decrypt } = require('../crypto.cjs');
const { refreshConnections, disconnectServer, testMcpConnection } = require('../mcpClient.cjs');

// Helper function to enforce ZTA HTTPS compliance for MCP URLs
function validateZtaUrls(endpointUrl, tokenUrl) {
    const isDev = process.env.NODE_ENV === 'development';
    
    const checkUrl = (urlStr) => {
        if (!urlStr) return true;
        try {
            const parsed = new URL(urlStr);
            if (parsed.protocol === 'https:') {
                return true;
            }
            // Only allow non-secure http on localhost/127.0.0.1 in development environment
            if (isDev && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    };

    if (!checkUrl(endpointUrl)) {
        return 'ZTA Security Policy requires HTTPS for all MCP endpoints. Non-secure HTTP is only permitted on localhost in development mode.';
    }
    if (tokenUrl && !checkUrl(tokenUrl)) {
        return 'ZTA Security Policy requires HTTPS for all OAuth token endpoints. Non-secure HTTP is only permitted on localhost in development mode.';
    }
    return null;
}

// POST to test an existing MCP server connection (by ID)
router.post('/:id/test', async (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM mcp_servers WHERE id = ?", [id], async (err, row) => {
        if (err || !row) {
            return res.status(404).json({ error: 'Server not found' });
        }
        
        let clientSecret = row.client_secret;
        if (clientSecret) {
            try {
                clientSecret = decrypt(clientSecret);
            } catch (e) {
                console.error("Failed to decrypt secret for test:", e);
                clientSecret = null;
            }
        }
        
        const result = await testMcpConnection({
            endpoint_url: row.endpoint_url,
            token_url: row.token_url,
            client_id: row.client_id,
            client_secret: clientSecret
        }, req.user, req);
        
        if (result.success) {
            res.json(result);
        } else {
            res.status(400).json(result);
        }
    });
});

// POST to test a new or edited MCP server connection
router.post('/test', async (req, res) => {
    const { id, endpoint_url, token_url, client_id, client_secret } = req.body;
    
    if (!endpoint_url) {
        return res.status(400).json({ error: 'Endpoint URL is required' });
    }

    const validationError = validateZtaUrls(endpoint_url, token_url);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    let finalSecret = client_secret;

    // If testing an edit and secret is blank, fetch the existing secret from DB
    if (!finalSecret && id) {
        try {
            const row = await new Promise((resolve, reject) => {
                db.get("SELECT client_secret FROM mcp_servers WHERE id = ?", [id], (err, row) => {
                    if (err) reject(err); else resolve(row);
                });
            });
            if (row && row.client_secret) {
                finalSecret = decrypt(row.client_secret);
            }
        } catch (e) {
            console.error("Failed to fetch/decrypt existing secret for test:", e);
        }
    }

    const result = await testMcpConnection({ endpoint_url, token_url, client_id, client_secret: finalSecret }, req.user, req);
    if (result.success) {
        res.json(result);
    } else {
        res.status(400).json(result);
    }
});

// GET all MCP servers (client_secret is NOT returned)
router.get('/', (req, res) => {
    db.all("SELECT id, name, endpoint_url, token_url, client_id, created_at FROM mcp_servers", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch MCP servers' });
        }
        res.json(rows);
    });
});

// POST a new MCP server
router.post('/', (req, res) => {
    const { name, endpoint_url, token_url, client_id, client_secret } = req.body;

    if (!name || !endpoint_url) {
        return res.status(400).json({ error: 'Name and Endpoint URL are required' });
    }

    const validationError = validateZtaUrls(endpoint_url, token_url);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    let encryptedSecret = null;
    if (client_secret) {
        encryptedSecret = encrypt(client_secret);
    }

    db.run(
        `INSERT INTO mcp_servers (name, endpoint_url, token_url, client_id, client_secret) VALUES (?, ?, ?, ?, ?)`,
        [name, endpoint_url, token_url || null, client_id || null, encryptedSecret],
        function (err) {
            if (err) {
                console.error("Error creating MCP server:", err);
                return res.status(500).json({ error: 'Failed to create MCP server' });
            }
            refreshConnections().catch(e => console.error("Error refreshing MCP connections:", e));
            res.status(201).json({ id: this.lastID, message: 'MCP server created successfully' });
        }
    );
});

// PUT (update) an existing MCP server
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { name, endpoint_url, token_url, client_id, client_secret } = req.body;

    if (!name || !endpoint_url) {
        return res.status(400).json({ error: 'Name and Endpoint URL are required' });
    }

    const validationError = validateZtaUrls(endpoint_url, token_url);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    // If client_secret is provided and not empty, encrypt and update it.
    // If it's empty/undefined, do not update the client_secret column.
    if (client_secret) {
        const encryptedSecret = encrypt(client_secret);
        db.run(
            `UPDATE mcp_servers SET name = ?, endpoint_url = ?, token_url = ?, client_id = ?, client_secret = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, endpoint_url, token_url || null, client_id || null, encryptedSecret, id],
            function (err) {
                if (err) return res.status(500).json({ error: 'Failed to update MCP server' });
                
                disconnectServer(parseInt(id)); // Disconnect old to force reconnect with new credentials
                refreshConnections().catch(e => console.error("Error refreshing MCP connections:", e));
                res.json({ message: 'MCP server updated successfully' });
            }
        );
    } else {
        db.run(
            `UPDATE mcp_servers SET name = ?, endpoint_url = ?, token_url = ?, client_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [name, endpoint_url, token_url || null, client_id || null, id],
            function (err) {
                if (err) return res.status(500).json({ error: 'Failed to update MCP server' });
                
                disconnectServer(parseInt(id));
                refreshConnections().catch(e => console.error("Error refreshing MCP connections:", e));
                res.json({ message: 'MCP server updated successfully' });
            }
        );
    }
});

// DELETE an MCP server
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM mcp_servers WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to delete MCP server' });
        
        disconnectServer(parseInt(id));
        res.json({ message: 'MCP server deleted successfully' });
    });
});

module.exports = router;
