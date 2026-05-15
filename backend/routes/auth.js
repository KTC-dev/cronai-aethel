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

/**
 * POST /api/auth/register
 * Register a new user
 */
app.post('/register', async (c) => {
    try {
        const { email, password, name } = await c.req.json();

        if (!email || !password) {
            return c.json({ message: 'Email and password are required' }, 400);
        }

        // Check if user already exists
        const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
            .bind(email)
            .first();

        if (existing) {
            return c.json({ message: 'User already exists' }, 409);
        }

        // Hash password
        const passwordHash = await hashString(password);
        const userId = crypto.randomUUID();

        // Create user
        await c.env.DB.prepare(
            'INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)'
        ).bind(userId, email, name || null, passwordHash).run();

        // Create free subscription
        const subscriptionId = crypto.randomUUID();
        await c.env.DB.prepare(
            'INSERT INTO subscriptions (id, user_id, plan, videos_remaining) VALUES (?, ?, ?, ?)'
        ).bind(subscriptionId, userId, 'free', 3).run();

        return c.json({
            message: 'User registered successfully',
            user: { id: userId, email, name: name || null }
        }, 201);
    } catch (error) {
        console.error('Registration error:', error);
        return c.json({ message: 'Internal server error' }, 500);
    }
});

/**
 * POST /api/auth/login
 * Authenticate user
 */
app.post('/login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({ message: 'Email and password are required' }, 400);
        }

        const passwordHash = await hashString(password);

        const user = await c.env.DB.prepare(
            'SELECT id, email, name, avatar_url FROM users WHERE email = ? AND password_hash = ?'
        ).bind(email, passwordHash).first();

        if (!user) {
            return c.json({ message: 'Invalid credentials' }, 401);
        }

        // In production, generate a JWT or session token here
        // For MVP, we'll return a simple token
        const token = await hashString(`${user.id}-${Date.now()}-${Math.random()}`);

        // Store token in KV for validation
        if (c.env.KV) {
            await c.env.KV.put(`token:${token}`, user.id, { expirationTtl: 86400 * 7 }); // 7 days
        }

        return c.json({
            message: 'Login successful',
            token,
            user: { id: user.id, email: user.email, name: user.name, avatar_url: user.avatar_url }
        });
    } catch (error) {
        console.error('Login error:', error);
        return c.json({ message: 'Internal server error' }, 500);
    }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate token)
 */
app.post('/logout', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (c.env.KV) {
            await c.env.KV.delete(`token:${token}`);
        }
    }
    return c.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Get current user info
 */
app.get('/me', async (c) => {
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

    const user = await c.env.DB.prepare(
        'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?'
    ).bind(userId).first();

    if (!user) {
        return c.json({ message: 'User not found' }, 404);
    }

    // Get subscription info
    const subscription = await c.env.DB.prepare(
        'SELECT plan, status, videos_remaining, current_period_end FROM subscriptions WHERE user_id = ?'
    ).bind(userId).first();

    return c.json({
        user,
        subscription
    });
});

export default app;