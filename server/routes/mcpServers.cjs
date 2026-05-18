const express = require('express');
const router = express.Router();
const db = require('../db.cjs');
const { encrypt, decrypt } = require('../crypto.cjs');
const { refreshConnections, disconnectServer, testMcpConnection } = require('../mcpClient.cjs');

// POST to test MCP server connection
router.post('/test', async (req, res) => {
    const { endpoint_url, token_url, client_id, client_secret } = req.body;
    
    if (!endpoint_url) {
        return res.status(400).json({ error: 'Endpoint URL is required' });
    }

    const result = await testMcpConnection({ endpoint_url, token_url, client_id, client_secret });
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
