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
 * GET /api/payments/me
 * Get current user's payment history
 */
app.get('/me', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const page = parseInt(c.req.query('page')) || 1;
    const limit = parseInt(c.req.query('limit')) || 10;
    const offset = (page - 1) * limit;

    const { results } = await c.env.DB.prepare(
        'SELECT id, amount, currency, status, description, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(userId, limit, offset).all();

    const { total } = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM payments WHERE user_id = ?'
    ).bind(userId).first();

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
 * POST /api/payments/create-intent
 * Create a payment intent
 */
app.post('/create-intent', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const { amount, description, plan } = await c.req.json();

    if (!amount || amount <= 0) {
        return c.json({ message: 'Invalid amount' }, 400);
    }

    const paymentId = crypto.randomUUID();

    // In production, create Stripe payment intent here
    // For MVP, create a pending payment record
    await c.env.DB.prepare(
        'INSERT INTO payments (id, user_id, amount, currency, status, description) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(paymentId, userId, amount, 'USD', 'pending', description || `Payment for ${plan || 'service'}`).run();

    return c.json({
        message: 'Payment intent created',
        payment: {
            id: paymentId,
            amount,
            currency: 'USD',
            status: 'pending',
            description: description || `Payment for ${plan || 'service'}`
        },
        // In production, this would include client_secret for Stripe
        client_secret: paymentId // Mock for MVP
    });
});

/**
 * POST /api/payments/confirm
 * Confirm a payment
 */
app.post('/confirm', requireAuth, async (c) => {
    const userId = c.get('user').id;
    const { payment_id } = await c.req.json();

    if (!payment_id) {
        return c.json({ message: 'Payment ID is required' }, 400);
    }

    const payment = await c.env.DB.prepare(
        'SELECT * FROM payments WHERE id = ? AND user_id = ?'
    ).bind(payment_id, userId).first();

    if (!payment) {
        return c.json({ message: 'Payment not found' }, 404);
    }

    if (payment.status !== 'pending') {
        return c.json({ message: 'Payment is not pending' }, 400);
    }

    // In production, verify with Stripe first
    // For MVP, mark as completed
    await c.env.DB.prepare(
        'UPDATE payments SET status = ?, updated_at = ? WHERE id = ?'
    ).bind('completed', Date.now(), payment_id).run();

    // Add videos to subscription
    const videosToAdd = Math.floor(payment.amount / 1); // 1 video per dollar
    await c.env.DB.prepare(
        'UPDATE subscriptions SET videos_remaining = videos_remaining + ?, updated_at = ? WHERE user_id = ?'
    ).bind(videosToAdd, Date.now(), userId).run();

    return c.json({
        message: 'Payment confirmed',
        videos_added: videosToAdd
    });
});

/**
 * POST /api/payments/webhook
 * Webhook for payment providers (Stripe, etc.)
 */
app.post('/webhook', async (c) => {
    const body = await c.req.json();
    const { event, payment_intent_id, amount, status } = body;

    // In production, verify webhook signature
    // For MVP, process the webhook

    if (event === 'payment_intent.succeeded' || status === 'completed') {
        // Find the payment and update it
        const payment = await c.env.DB.prepare(
            'SELECT user_id FROM payments WHERE stripe_payment_intent_id = ? OR id = ?'
        ).bind(payment_intent_id, payment_intent_id).first();

        if (payment) {
            await c.env.DB.prepare(
                'UPDATE payments SET status = ?, updated_at = ? WHERE id = ?'
            ).bind('completed', Date.now(), payment.id).run();

            // Add videos to subscription
            const videosToAdd = Math.floor(amount / 1);
            await c.env.DB.prepare(
                'UPDATE subscriptions SET videos_remaining = videos_remaining + ?, updated_at = ? WHERE user_id = ?'
            ).bind(videosToAdd, Date.now(), payment.user_id).run();
        }
    }

    return c.json({ received: true });
});

/**
 * GET /api/payments/:id
 * Get a specific payment
 */
app.get('/:id', requireAuth, async (c) => {
    const paymentId = c.req.param('id');
    const userId = c.get('user').id;

    const payment = await c.env.DB.prepare(
        'SELECT id, amount, currency, status, description, created_at FROM payments WHERE id = ? AND user_id = ?'
    ).bind(paymentId, userId).first();

    if (!payment) {
        return c.json({ message: 'Payment not found' }, 404);
    }

    return c.json({ payment });
});

export default app;