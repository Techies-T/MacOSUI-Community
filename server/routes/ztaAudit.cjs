const express = require('express');
const router = express.Router();

// Cache for Gateway Admin JWT token
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Helper to obtain a valid JWT token from ZTA-MCP-Gateway using client credentials
 */
async function getGatewayToken(gatewayUrl) {
    const now = Date.now();
    if (cachedToken && tokenExpiresAt > now + 60000) {
        return cachedToken;
    }

    const clientId = process.env.ZTA_ADMIN_CLIENT_ID || 'macosui-admin';
    const clientSecret = process.env.ZTA_ADMIN_CLIENT_SECRET || 'admin-secret-2026';

    try {
        const tokenRes = await fetch(`${gatewayUrl}/oauth/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'client_credentials',
                client_id: clientId,
                client_secret: clientSecret
            }),
            signal: AbortSignal.timeout(3000)
        });

        if (!tokenRes.ok) {
            throw new Error(`Failed to authenticate with ZTA Gateway: ${tokenRes.status}`);
        }

        const data = await tokenRes.json();
        cachedToken = data.access_token;
        tokenExpiresAt = now + ((data.expires_in || 3600) * 1000);
        return cachedToken;
    } catch (err) {
        cachedToken = null;
        tokenExpiresAt = 0;
        throw err;
    }
}

/**
 * Middleware: Check if requesting user has admin / manage_system_settings permissions
 */
function requireAdmin(req, res, next) {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: 'unauthorized', message: 'Authentication required' });
    }

    const allowed = user.allowed_actions || [];
    const isSuperAdmin = user.role === 'admin' || allowed.includes('*') || allowed.includes('action:manage_system_settings');

    if (!isSuperAdmin) {
        return res.status(403).json({ error: 'forbidden', message: 'Admin access required' });
    }
    next();
}

/**
 * Resolve target ZTA Gateway URL
 * Supports docker network name or localhost
 */
function getTargetGatewayUrl() {
    return process.env.ZTA_GATEWAY_URL || 'http://localhost:8085';
}

/**
 * GET /api/zta/audit/logs
 * Query filtered logs from ZTA-MCP-Gateway
 */
router.get('/logs', requireAdmin, async (req, res) => {
    const gatewayUrl = getTargetGatewayUrl();

    try {
        const token = await getGatewayToken(gatewayUrl);
        const queryParams = new URLSearchParams(req.query).toString();
        const targetUrl = `${gatewayUrl}/api/v1/audit/logs${queryParams ? `?${queryParams}` : ''}`;

        const gatewayRes = await fetch(targetUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal: AbortSignal.timeout(4000)
        });

        if (!gatewayRes.ok) {
            const errText = await gatewayRes.text();
            return res.status(gatewayRes.status).json({
                connected: true,
                error: 'gateway_error',
                message: errText
            });
        }

        const data = await gatewayRes.json();
        return res.json({
            connected: true,
            gatewayUrl,
            ...data
        });
    } catch (err) {
        // Graceful degradation when Gateway is unreachable
        return res.json({
            connected: false,
            gatewayUrl,
            message: `ZTA-MCP-Gateway is currently unreachable (${err.message})`,
            total: 0,
            logs: []
        });
    }
});

/**
 * GET /api/zta/audit/summary
 * Query summary metrics from ZTA-MCP-Gateway
 */
router.get('/summary', requireAdmin, async (req, res) => {
    const gatewayUrl = getTargetGatewayUrl();

    try {
        const token = await getGatewayToken(gatewayUrl);
        const targetUrl = `${gatewayUrl}/api/v1/audit/summary`;

        const gatewayRes = await fetch(targetUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            signal: AbortSignal.timeout(4000)
        });

        if (!gatewayRes.ok) {
            const errText = await gatewayRes.text();
            return res.status(gatewayRes.status).json({
                connected: true,
                error: 'gateway_error',
                message: errText
            });
        }

        const data = await gatewayRes.json();
        return res.json({
            connected: true,
            gatewayUrl,
            ...data
        });
    } catch (err) {
        return res.json({
            connected: false,
            gatewayUrl,
            message: `ZTA-MCP-Gateway is currently unreachable (${err.message})`,
            total_transactions: 0,
            allowed_count: 0,
            blocked_count: 0,
            deviation_count: 0,
            top_tables: [],
            action_breakdown: {},
            client_breakdown: {}
        });
    }
});

module.exports = router;
