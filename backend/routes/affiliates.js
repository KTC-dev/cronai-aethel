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
 * GET /api/affiliates/me
 * Get current user's affiliate info
 */
app.get('/me', requireAuth, async (c) => {
    const userId = c.get('user').id;

    const affiliate = await c.env.DB.prepare(
        'SELECT id, referral_code, total_referrals, total_earned FROM affiliates WHERE user_id = ?'
    ).bind(userId).first();

    if (!affiliate) {
        // Create affiliate account for user
        const affiliateId = crypto.randomUUID();
        const referralCode = userId.substring(0, 8).toUpperCase();

        await c.env.DB.prepare(
            'INSERT INTO affiliates (id, user_id, referral_code) VALUES (?, ?, ?)'
        ).bind(affiliateId, userId, referralCode).run();

        return c.json({
            affiliate: {
                referral_code: referralCode,
                total_referrals: 0,
                total_earned: 0,
                referral_url: `https://cronai-aethel.com/?ref=${referralCode}`
            }
        });
    }

    return c.json({
        affiliate: {
            ...affiliate,
            referral_url: `https://cronai-aethel.com/?ref=${affiliate.referral_code}`
        }
    });
});

/**
 * GET /api/affiliates/stats
 * Get affiliate statistics
 */
app.get('/stats', requireAuth, async (c) => {
    const userId = c.get('user').id;

    const affiliate = await c.env.DB.prepare(
        'SELECT * FROM affiliates WHERE user_id = ?'
    ).bind(userId).first();

    if (!affiliate) {
        return c.json({ stats: { total_referrals: 0, total_earned: 0, pending_payout: 0 } });
    }

    // Get referral commission history (in production, track in separate table)
    const pendingPayout = affiliate.total_earned * 0.1; // 10% pending

    return c.json({
        stats: {
            total_referrals: affiliate.total_referrals,
            total_earned: affiliate.total_earned,
            pending_payout: pendingPayout
        }
    });
});

/**
 * POST /api/affiliates/payout
 * Request a payout
 */
app.post('/payout', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const { stripe_connect_id } = await c.req.json();

    const affiliate = await c.env.DB.prepare(
        'SELECT * FROM affiliates WHERE user_id = ?'
    ).bind(userId).first();

    if (!affiliate) {
        return c.json({ message: 'No affiliate account found' }, 404);
    }

    if (affiliate.total_earned < 50) {
        return c.json({ message: 'Minimum payout is $50', minimum: 50, current: affiliate.total_earned }, 400);
    }

    if (stripe_connect_id) {
        await c.env.DB.prepare(
            'UPDATE affiliates SET stripe_connect_id = ? WHERE user_id = ?'
        ).bind(stripe_connect_id, userId).run();
    }

    // In production, process payout via Stripe Connect
    // For MVP, just acknowledge the request

    return c.json({
        message: 'Payout request submitted',
        amount: affiliate.total_earned
    });
});

/**
 * GET /api/affiliates/verify/:code
 * Verify a referral code
 */
app.get('/verify/:code', async (c) => {
    const code = c.req.param('code');

    const affiliate = await c.env.DB.prepare(
        'SELECT user_id, referral_code FROM affiliates WHERE referral_code = ?'
    ).bind(code).first();

    if (!affiliate) {
        return c.json({ valid: false });
    }

    return c.json({
        valid: true,
        referral_code: affiliate.referral_code
    });
});

/**
 * POST /api/affiliates/track
 * Track a referral signup
 */
app.post('/track', async (c) => {
    const { referral_code, new_user_id } = await c.req.json();

    if (!referral_code || !new_user_id) {
        return c.json({ message: 'Referral code and user ID required' }, 400);
    }

    const affiliate = await c.env.DB.prepare(
        'SELECT * FROM affiliates WHERE referral_code = ?'
    ).bind(referral_code).first();

    if (!affiliate) {
        return c.json({ message: 'Invalid referral code' }, 404);
    }

    // Update referral count
    await c.env.DB.prepare(
        'UPDATE affiliates SET total_referrals = total_referrals + 1 WHERE user_id = ?'
    ).bind(affiliate.user_id).run();

    // In production, award commission when referred user makes a purchase

    return c.json({ message: 'Referral tracked successfully' });
});

export default app;