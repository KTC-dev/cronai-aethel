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
 * GET /api/subscriptions/me
 * Get current user's subscription
 */
app.get('/me', requireAuth, async (c) => {
    const userId = c.get('user').id;

    const subscription = await c.env.DB.prepare(
        'SELECT id, plan, status, videos_remaining, current_period_start, current_period_end FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first();

    if (!subscription) {
        return c.json({ message: 'No subscription found' }, 404);
    }

    return c.json({ subscription });
});

/**
 * POST /api/subscriptions/upgrade
 * Upgrade subscription plan
 */
app.post('/upgrade', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const { plan } = await c.req.json(); // 'pro' or 'enterprise'

    if (!plan || !['pro', 'enterprise'].includes(plan)) {
        return c.json({ message: 'Invalid plan. Choose pro or enterprise.' }, 400);
    }

    // In production, this would create a Stripe checkout session
    // For MVP, we'll simulate the upgrade

    const videosRemaining = plan === 'pro' ? 30 : 100;

    await c.env.DB.prepare(
        'UPDATE subscriptions SET plan = ?, videos_remaining = ?, status = ?, updated_at = ? WHERE user_id = ?'
    ).bind(plan, videosRemaining, 'active', Date.now(), userId).run();

    return c.json({
        message: `Upgraded to ${plan} plan successfully`,
        subscription: { plan, videos_remaining: videosRemaining, status: 'active' }
    });
});

/**
 * POST /api/subscriptions/cancel
 * Cancel subscription
 */
app.post('/cancel', requireAuth, async (c) => {
    const userId = c.get('user').id;

    await c.env.DB.prepare(
        'UPDATE subscriptions SET status = ?, updated_at = ? WHERE user_id = ?'
    ).bind('canceled', Date.now(), userId).run();

    return c.json({ message: 'Subscription canceled successfully' });
});

/**
 * POST /api/subscriptions/use-credit
 * Use one video credit
 */
app.post('/use-credit', requireAuth, async (c) => {
    const userId = c.get('user').id;

    const subscription = await c.env.DB.prepare(
        'SELECT videos_remaining, status FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first();

    if (!subscription) {
        return c.json({ message: 'No subscription found' }, 404);
    }

    if (subscription.status !== 'active') {
        return c.json({ message: 'Subscription is not active' }, 400);
    }

    if (subscription.videos_remaining <= 0) {
        return c.json({ message: 'No videos remaining. Please upgrade your plan.', videos_remaining: 0 }, 402);
    }

    await c.env.DB.prepare(
        'UPDATE subscriptions SET videos_remaining = videos_remaining - 1, updated_at = ? WHERE user_id = ?'
    ).bind(Date.now(), userId).run();

    const updated = await c.env.DB.prepare(
        'SELECT videos_remaining FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first();

    return c.json({
        message: 'Video credit used',
        videos_remaining: updated.videos_remaining
    });
});

/**
 * GET /api/subscriptions/plans
 * Get available plans
 */
app.get('/plans', async (c) => {
    return c.json({
        plans: [
            {
                id: 'free',
                name: 'Free',
                price: 0,
                videos_per_month: 3,
                features: [
                    '3 videos per month',
                    '720p resolution',
                    'Basic emotions',
                    'Watermarked videos'
                ]
            },
            {
                id: 'pro',
                name: 'Pro',
                price: 29,
                videos_per_month: 30,
                features: [
                    '30 videos per month',
                    '1080p resolution',
                    'All emotions',
                    'No watermark',
                    'Priority processing',
                    'Custom branding'
                ]
            },
            {
                id: 'enterprise',
                name: 'Enterprise',
                price: 99,
                videos_per_month: 100,
                features: [
                    '100 videos per month',
                    '4K resolution',
                    'All emotions + custom',
                    'No watermark',
                    'Priority processing',
                    'Custom branding',
                    'API access',
                    'Dedicated support'
                ]
            }
        ]
    });
});

export default app;