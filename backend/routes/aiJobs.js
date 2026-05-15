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
 * GET /api/ai-jobs
 * List all AI jobs for current user
 */
app.get('/', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const offset = (page - 1) * limit;
    const status = c.req.query('status');

    let query = 'SELECT id, status, emotion, output_url, error, created_at, completed_at FROM ai_jobs WHERE user_id = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM ai_jobs WHERE user_id = ?';
    let params = [userId];

    if (status) {
        query += ' AND status = ?';
        countQuery += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    const { total } = await c.env.DB.prepare(countQuery).bind(...params.slice(0, status ? 2 : 1)).first();

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
 * GET /api/ai-jobs/:id
 * Get a specific job by ID
 */
app.get('/:id', requireAuth, async (c) => {
    const jobId = c.req.param('id');
    const userId = c.get('user').id;

    const job = await c.env.DB.prepare(
        'SELECT id, status, emotion, output_url, error, created_at, completed_at FROM ai_jobs WHERE id = ? AND user_id = ?'
    ).bind(jobId, userId).first();

    if (!job) {
        return c.json({ message: 'Job not found' }, 404);
    }

    return c.json({ job });
});

/**
 * GET /api/ai-jobs/:id/status
 * Get real-time status of a job
 */
app.get('/:id/status', requireAuth, async (c) => {
    const jobId = c.req.param('id');
    const userId = c.get('user').id;

    const job = await c.env.DB.prepare(
        'SELECT id, status, emotion, output_url, error, created_at, completed_at FROM ai_jobs WHERE id = ? AND user_id = ?'
    ).bind(jobId, userId).first();

    if (!job) {
        return c.json({ message: 'Job not found' }, 404);
    }

    // Calculate estimated completion time
    const age = Date.now() - job.created_at;
    const estimatedTotal = 120000; // 2 minutes average
    const progress = Math.min(Math.floor((age / estimatedTotal) * 100), job.status === 'completed' ? 100 : 95);

    return c.json({
        job: {
            ...job,
            progress,
            estimated_completion: job.created_at + estimatedTotal
        }
    });
});

/**
 * POST /api/ai-jobs/:id/cancel
 * Cancel a pending or processing job
 */
app.post('/:id/cancel', requireAuth, async (c) => {
    const jobId = c.req.param('id');
    const userId = c.get('user').id;

    const job = await c.env.DB.prepare(
        'SELECT status FROM ai_jobs WHERE id = ? AND user_id = ?'
    ).bind(jobId, userId).first();

    if (!job) {
        return c.json({ message: 'Job not found' }, 404);
    }

    if (job.status === 'completed' || job.status === 'failed') {
        return c.json({ message: 'Cannot cancel a completed or failed job' }, 400);
    }

    await c.env.DB.prepare(
        'UPDATE ai_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?'
    ).bind('failed', 'Cancelled by user', Date.now(), jobId).run();

    return c.json({ message: 'Job cancelled successfully' });
});

/**
 * GET /api/ai-jobs/stats/summary
 * Get job statistics summary
 */
app.get('/stats/summary', requireAuth, async (c) => {
    const userId = c.get('user').id;

    const stats = await c.env.DB.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
        FROM ai_jobs WHERE user_id = ?
    `).bind(userId).first();

    return c.json({ stats });
});

export default app;