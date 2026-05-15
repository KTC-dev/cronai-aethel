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
 * GET /api/videos
 * List all videos (public, paginated)
 */
app.get('/', async (c) => {
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 12;
    const offset = (page - 1) * limit;
    const emotion = c.req.query('emotion');

    let query = 'SELECT id, user_id, title, description, thumbnail_url, video_url, duration, emotion, status, view_count, created_at FROM videos WHERE status = ?';
    let countQuery = 'SELECT COUNT(*) as total FROM videos WHERE status = ?';
    let params = ['published'];

    if (emotion) {
        query += ' AND emotion = ?';
        countQuery += ' AND emotion = ?';
        params.push(emotion);
    }

    query += ' ORDER BY view_count DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    const { total } = await c.env.DB.prepare(countQuery).bind(...params.slice(0, emotion ? 2 : 1)).first();

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
 * GET /api/videos/:id
 * Get a single video by ID
 */
app.get('/:id', async (c) => {
    const videoId = c.req.param('id');

    const video = await c.env.DB.prepare(
        'SELECT id, user_id, title, description, thumbnail_url, video_url, duration, emotion, status, view_count, created_at FROM videos WHERE id = ?'
    ).bind(videoId).first();

    if (!video) {
        return c.json({ message: 'Video not found' }, 404);
    }

    // Increment view count
    await c.env.DB.prepare(
        'UPDATE videos SET view_count = view_count + 1 WHERE id = ?'
    ).bind(videoId).run();

    // Track analytics
    const analyticsId = crypto.randomUUID();
    const ipHeader = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const ipHash = crypto.randomUUID(); // In production, hash the actual IP

    await c.env.DB.prepare(
        'INSERT INTO url_analytics (id, video_id, event_type, ip_hash, user_agent, referrer, country) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(analyticsId, videoId, 'view', ipHash, c.req.header('User-Agent') || '', c.req.header('Referer') || '', c.req.header('CF-IPCountry') || '').run();

    video.view_count = (video.view_count || 0) + 1;

    return c.json({ video });
});

/**
 * GET /api/videos/:id/download
 * Get a presigned download URL for the video
 */
app.get('/:id/download', async (c) => {
    const videoId = c.req.param('id');

    const video = await c.env.DB.prepare(
        'SELECT video_url FROM videos WHERE id = ?'
    ).bind(videoId).first();

    if (!video) {
        return c.json({ message: 'Video not found' }, 404);
    }

    // If video_url is an R2 key, generate a presigned URL
    // For MVP, we'll return the direct URL or R2 proxy URL
    if (video.video_url && c.env['cronai-videos']) {
        // Generate presigned URL (valid for 1 hour)
        const key = video.video_url.replace('/r2/', '');
        const presignedUrl = await c.env['cronai-videos'].createSignedURL(key, {
            expires: Date.now() + 3600000 // 1 hour
        });
        return c.json({ downloadUrl: presignedUrl });
    }

    return c.json({ downloadUrl: video.video_url });
});

/**
 * POST /api/videos
 * Create a new video (for admin/testing purposes)
 */
app.post('/', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const { title, description, video_url, thumbnail_url, duration, emotion } = await c.req.json();

    if (!title || !video_url) {
        return c.json({ message: 'Title and video_url are required' }, 400);
    }

    const videoId = crypto.randomUUID();

    await c.env.DB.prepare(
        'INSERT INTO videos (id, user_id, title, description, video_url, thumbnail_url, duration, emotion, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(videoId, userId, title, description || null, video_url, thumbnail_url || null, duration || 30, emotion || null, 'draft').run();

    return c.json({
        message: 'Video created successfully',
        video: { id: videoId, title, description, video_url, thumbnail_url, duration, emotion, status: 'draft' }
    }, 201);
});

/**
 * PUT /api/videos/:id
 * Update a video
 */
app.put('/:id', requireAuth, async (c) => {
    const videoId = c.req.param('id');
    const userId = c.get('user').id;

    // Check ownership
    const video = await c.env.DB.prepare('SELECT user_id FROM videos WHERE id = ?').bind(videoId).first();
    if (!video) {
        return c.json({ message: 'Video not found' }, 404);
    }

    // For MVP, allow any authenticated user to update (in production, check ownership)
    const { title, description, status } = await c.req.json();

    await c.env.DB.prepare(
        'UPDATE videos SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?'
    ).bind(title, description, status || 'draft', Date.now(), videoId).run();

    return c.json({ message: 'Video updated successfully' });
});

/**
 * DELETE /api/videos/:id
 * Delete a video
 */
app.delete('/:id', requireAuth, async (c) => {
    const videoId = c.req.param('id');

    // Check if video exists
    const video = await c.env.DB.prepare('SELECT user_id, video_url FROM videos WHERE id = ?').bind(videoId).first();
    if (!video) {
        return c.json({ message: 'Video not found' }, 404);
    }

    // Delete from database
    await c.env.DB.prepare('DELETE FROM url_analytics WHERE video_id = ?').bind(videoId).run();
    await c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(videoId).run();

    // Note: In production, also delete from R2 storage

    return c.json({ message: 'Video deleted successfully' });
});

/**
 * GET /api/videos/:id/analytics
 * Get analytics for a video
 */
app.get('/:id/analytics', requireAuth, async (c) => {
    const videoId = c.req.param('id');
    const days = parseInt(c.req.query('days')) || 30;

    const video = await c.env.DB.prepare('SELECT user_id, view_count FROM videos WHERE id = ?').bind(videoId).first();
    if (!video) {
        return c.json({ message: 'Video not found' }, 404);
    }

    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    // Get daily views
    const dailyViews = await c.env.DB.prepare(`
        SELECT DATE(datetime(created_at, 'unixepoch')) as date, COUNT(*) as count
        FROM url_analytics
        WHERE video_id = ? AND created_at > ? AND event_type = 'view'
        GROUP BY date
        ORDER BY date DESC
    `).bind(videoId, cutoffTime).all();

    // Get country breakdown
    const countryBreakdown = await c.env.DB.prepare(`
        SELECT country, COUNT(*) as count
        FROM url_analytics
        WHERE video_id = ? AND created_at > ? AND event_type = 'view' AND country != ''
        GROUP BY country
        ORDER BY count DESC
        LIMIT 10
    `).bind(videoId, cutoffTime).all();

    return c.json({
        video: { id: videoId, view_count: video.view_count },
        analytics: {
            dailyViews: dailyViews.results || [],
            countryBreakdown: countryBreakdown.results || []
        }
    });
});

export default app;