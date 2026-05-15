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

// Admin verification middleware
const requireAdmin = async (c, next) => {
    const userId = c.get('user')?.id;
    if (!userId) {
        return c.json({ message: 'Unauthorized' }, 401);
    }

    // Check if user has admin role (in production, check user role in DB)
    // For MVP, check if email contains "admin"
    const user = await c.env.DB.prepare('SELECT email FROM users WHERE id = ?').bind(userId).first();
    if (!user || !user.email.includes('admin')) {
        return c.json({ message: 'Admin access required' }, 403);
    }

    await next();
};

/**
 * GET /api/admin/dashboard
 * Get admin dashboard stats
 */
app.get('/dashboard', requireAuth, requireAdmin, async (c) => {
    // Get total users
    const { total: totalUsers } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first();

    // Get total videos
    const { total: totalVideos } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM videos').first();

    // Get total revenue
    const { total: totalRevenue } = await c.env.DB.prepare('SELECT SUM(amount) as total FROM payments WHERE status = ?', 'completed').first();

    // Get subscription breakdown
    const subscriptions = await c.env.DB.prepare(`
        SELECT plan, COUNT(*) as count
        FROM subscriptions
        GROUP BY plan
    `).all();

    // Get recent jobs
    const recentJobs = await c.env.DB.prepare(`
        SELECT id, user_id, status, emotion, created_at
        FROM ai_jobs
        ORDER BY created_at DESC
        LIMIT 10
    `).all();

    return c.json({
        stats: {
            totalUsers: totalUsers || 0,
            totalVideos: totalVideos || 0,
            totalRevenue: totalRevenue || 0,
            subscriptions: subscriptions.results || []
        },
        recentJobs: recentJobs.results || []
    });
});

/**
 * GET /api/admin/users
 * List all users (paginated)
 */
app.get('/users', requireAuth, requireAdmin, async (c) => {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
        'SELECT id, email, name, avatar_url, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    const { total } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first();

    return c.json({
        users: results || [],
        pagination: {
            page,
            limit,
            total: total || 0,
            pages: Math.ceil((total || 0) / limit)
        }
    });
});

/**
 * GET /api/admin/jobs
 * List all AI jobs (paginated)
 */
app.get('/jobs', requireAuth, requireAdmin, async (c) => {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;
    const status = c.req.query('status');

    let query = 'SELECT id, user_id, status, emotion, output_url, error, created_at, completed_at FROM ai_jobs';
    let params = [];

    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    const countQuery = status
        ? 'SELECT COUNT(*) as total FROM ai_jobs WHERE status = ?'
        : 'SELECT COUNT(*) as total FROM ai_jobs';

    const { total } = await c.env.DB.prepare(countQuery).bind(...(status ? [status] : [])).first();

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

/**
 * GET /api/admin/videos
 * List all videos (paginated)
 */
app.get('/videos', requireAuth, requireAdmin, async (c) => {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
        'SELECT id, user_id, title, emotion, status, view_count, created_at FROM videos ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    const { total } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM videos').first();

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
 * DELETE /api/admin/videos/:id
 * Delete a video (admin)
 */
app.delete('/videos/:id', requireAuth, requireAdmin, async (c) => {
    const videoId = c.req.param('id');

    await c.env.DB.prepare('DELETE FROM url_analytics WHERE video_id = ?').bind(videoId).run();
    await c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(videoId).run();

    return c.json({ message: 'Video deleted successfully' });
});

/**
 * GET /api/admin/payments
 * List all payments (paginated)
 */
app.get('/payments', requireAuth, requireAdmin, async (c) => {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
        'SELECT id, user_id, amount, currency, status, created_at FROM payments ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    const { total } = await c.env.DB.prepare('SELECT COUNT(*) as total FROM payments').first();

    return c.json({
        payments: results || [],
        pagination: {
            page,
            limit,
            total: total || 0,
            pages: Math.ceil((total || 0) / limit)
        }
    });
});

/**
 * GET /api/admin/system/health
 * Get system health status
 */
app.get('/system/health', requireAuth, requireAdmin, async (c) => {
    // Check database connectivity
    let dbStatus = 'healthy';
    try {
        await c.env.DB.prepare('SELECT 1').first();
    } catch {
        dbStatus = 'unhealthy';
    }

    // Check KV connectivity
    let kvStatus = 'healthy';
    try {
        if (c.env.KV) {
            await c.env.KV.get('health_check');
        }
    } catch {
        kvStatus = 'unhealthy';
    }

    return c.json({
        status: dbStatus === 'healthy' && kvStatus === 'healthy' ? 'healthy' : 'degraded',
        services: {
            database: dbStatus,
            kvStore: kvStatus
        },
        timestamp: Date.now()
    });
});

export default app;