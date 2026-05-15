import { Hono } from 'hono';

const app = new Hono();

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
 * GET /api/users/:id
 * Get user profile
 */
app.get('/:id', async (c) => {
    const userId = c.req.param('id');

    const user = await c.env.DB.prepare(
        'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
        return c.json({ message: 'User not found' }, 404);
    }

    return c.json({ user });
});

/**
 * PUT /api/users/:id
 * Update user profile
 */
app.put('/:id', requireAuth, async (c) => {
    const userId = c.req.param('id');
    const authenticatedUser = c.get('user');

    if (userId !== authenticatedUser.id) {
        return c.json({ message: 'Forbidden' }, 403);
    }

    const { name, avatar_url, brand_colors } = await c.req.json();

    await c.env.DB.prepare(
        'UPDATE users SET name = ?, avatar_url = ?, brand_colors = ?, updated_at = ? WHERE id = ?'
    ).bind(name || null, avatar_url || null, brand_colors ? JSON.stringify(brand_colors) : null, Date.now(), userId).run();

    const updatedUser = await c.env.DB.prepare(
        'SELECT id, email, name, avatar_url, brand_colors, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (updatedUser.brand_colors) {
        try {
            updatedUser.brand_colors = JSON.parse(updatedUser.brand_colors);
        } catch {
            updatedUser.brand_colors = [];
        }
    }

    return c.json({ user: updatedUser, message: 'Profile updated successfully' });
});

/**
 * DELETE /api/users/:id
 * Delete user account
 */
app.delete('/:id', requireAuth, async (c) => {
    const userId = c.req.param('id');
    const authenticatedUser = c.get('user');

    if (userId !== authenticatedUser.id) {
        return c.json({ message: 'Forbidden' }, 403);
    }

    // Delete user data (in production, implement proper soft delete and data retention)
    await c.env.DB.prepare('DELETE FROM ai_jobs WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM videos WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM payments WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM affiliates WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM api_tokens WHERE user_id = ?').bind(userId).run();
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return c.json({ message: 'Account deleted successfully' });
});

/**
 * GET /api/users/me/videos
 * Get current user's videos
 */
app.get('/me/videos', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const offset = (page - 1) * limit;

    const { results, success } = await c.env.DB.prepare(
        'SELECT id, title, description, thumbnail_url, video_url, duration, emotion, status, view_count, created_at FROM videos WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(userId, limit, offset).all();

    const { total } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM videos WHERE user_id = ?'
    ).bind(userId).first();

    return c.json({
        videos: results || [],
        pagination: {
            page,
            limit,
            total: total || 0,
            pages: Math.ceil((total || 0) / limit)
        }
    });
});

/**
 * GET /api/users/me/jobs
 * Get current user's AI jobs
 */
app.get('/me/jobs', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
        'SELECT id, status, emotion, output_url, error, created_at, completed_at FROM ai_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(userId, limit, offset).all();

    const { total } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM ai_jobs WHERE user_id = ?'
    ).bind(userId).first();

    return c.json({
        jobs: results || [],
        pagination: {
            page,
            limit,
            total: total || 0,
            pages: Math.ceil((total || 0) / limit)
        }
    });
});

export default app;