import { Hono } from 'hono';

const app = new Hono();

// Helper function to hash strings using Web Crypto API
async function hashString(input) {
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Middleware to extract user from token
const requireAuth = async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ message: 'Unauthorized' }, 401);
    }

    const token = authHeader.substring(7);
    let userId;

    if (c.env.KV) {
        userId = await c.env.KV.get(`token:${token}`);
    }

    if (!userId) {
        return c.json({ message: 'Invalid or expired token' }, 401);
    }

    c.set('user', { id: userId });
    await next();
};

/**
 * GET /api/tokens
 * List all API tokens for current user
 */
app.get('/', requireAuth, async (c) => {
    const userId = c.get('user').id;

    const tokens = await c.env.DB.prepare(
        'SELECT id, name, last_used_at, expires_at, created_at FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json({
        tokens: tokens.results || []
    });
});

/**
 * POST /api/tokens/create
 * Create a new API token
 */
app.post('/create', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const { name, scopes, expires_in_days } = await c.req.json();

    if (!name) {
        return c.json({ message: 'Token name is required' }, 400);
    }

    const tokenId = crypto.randomUUID();
    // Generate a random token string
    const rawToken = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await hashString(rawToken);

    const expiresAt = expires_in_days ? Date.now() + (expires_in_days * 24 * 60 * 60 * 1000) : null;

    await c.env.DB.prepare(
        'INSERT INTO api_tokens (id, user_id, name, token_hash, scopes, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(tokenId, userId, name, tokenHash, scopes ? JSON.stringify(scopes) : null, expiresAt).run();

    // Return the raw token only once - user must save it
    return c.json({
        message: 'API token created successfully',
        token: {
            id: tokenId,
            name,
            token: rawToken, // Only shown once!
            scopes: scopes || ['read'],
            expires_at: expiresAt,
            created_at: Date.now()
        },
        warning: 'Save this token now. It will never be shown again.'
    }, 201);
});

/**
 * DELETE /api/tokens/:id
 * Revoke an API token
 */
app.delete('/:id', requireAuth, async (c) => {
    const tokenId = c.req.param('id');
    const userId = c.get('user').id;

    // Verify ownership
    const token = await c.env.DB.prepare(
        'SELECT user_id FROM api_tokens WHERE id = ?'
    ).bind(tokenId).first();

    if (!token) {
        return c.json({ message: 'Token not found' }, 404);
    }

    if (token.user_id !== userId) {
        return c.json({ message: 'Forbidden' }, 403);
    }

    await c.env.DB.prepare(
        'DELETE FROM api_tokens WHERE id = ?'
    ).bind(tokenId).run();

    return c.json({ message: 'Token revoked successfully' });
});

/**
 * GET /api/tokens/:id/usage
 * Get usage stats for a token
 */
app.get('/:id/usage', requireAuth, async (c) => {
    const tokenId = c.req.param('id');
    const userId = c.get('user').id;

    const token = await c.env.DB.prepare(
        'SELECT * FROM api_tokens WHERE id = ? AND user_id = ?'
    ).bind(tokenId, userId).first();

    if (!token) {
        return c.json({ message: 'Token not found' }, 404);
    }

    // Get usage stats (in production, track API calls in a separate table)
    return c.json({
        token: {
            id: token.id,
            name: token.name,
            last_used_at: token.last_used_at,
            expires_at: token.expires_at,
            created_at: token.created_at
        },
        usage: {
            total_requests: 0, // Would be tracked in production
            requests_today: 0
        }
    });
});

/**
 * POST /api/tokens/validate
 * Validate an API token (internal use)
 */
app.post('/validate', async (c) => {
    const { token } = await c.req.json();

    if (!token) {
        return c.json({ message: 'Token is required' }, 400);
    }

    const tokenHash = await hashString(token);

    const apiToken = await c.env.DB.prepare(
        'SELECT id, user_id, name, scopes, expires_at, last_used_at FROM api_tokens WHERE token_hash = ?'
    ).bind(tokenHash).first();

    if (!apiToken) {
        return c.json({ valid: false, message: 'Invalid token' }, 401);
    }

    // Check if expired
    if (apiToken.expires_at && Date.now() > apiToken.expires_at) {
        return c.json({ valid: false, message: 'Token expired' }, 401);
    }

    // Update last used
    await c.env.DB.prepare(
        'UPDATE api_tokens SET last_used_at = ? WHERE id = ?'
    ).bind(Date.now(), apiToken.id).run();

    let scopes = ['read'];
    if (apiToken.scopes) {
        try {
            scopes = JSON.parse(apiToken.scopes);
        } catch {
            scopes = ['read'];
        }
    }

    return c.json({
        valid: true,
        user_id: apiToken.user_id,
        token_name: apiToken.name,
        scopes
    });
});

export default app;