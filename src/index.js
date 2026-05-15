import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import authRoutes from '../backend/routes/auth.js';
import userRoutes from '../backend/routes/users.js';
import videoRoutes from '../backend/routes/videos.js';
import paymentRoutes from '../backend/routes/payments.js';
import subscriptionRoutes from '../backend/routes/subscriptions.js';
import affiliateRoutes from '../backend/routes/affiliates.js';
import tokenRoutes from '../backend/routes/tokens.js';
import aiJobRoutes from '../backend/routes/aiJobs.js';
import adminRoutes from '../backend/routes/admin.js';
import aiRoutes from '../backend/routes/ai.js';
import uploadRoutes from '../backend/routes/uploads.js';
import { runFullPipeline } from '../aiPipelineService.js';
import { processJob } from '../backend/jobs/aiJobQueue.js';
import { setupDatabaseIfNeeded } from './backend/src/services/databaseService.js';

const app = new Hono();

app.use('*', cors({
    origin: (origin) => {
        if (!origin) return origin;
        if (origin.startsWith('http://localhost')) return origin;
        if (origin.endsWith('.cronai-aethel-frontend.pages.dev')) return origin;
        if (origin === 'https://cronai-aethel-frontend.pages.dev') return origin;
        return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));
app.use('*', logger());

/* ── Simple IP-based rate limiter for auth endpoints ───────────────
   Tracks login/register attempts per IP in KV (if available).
   Allows 10 attempts per 15-minute window. No KV = soft-fail open. */
const rateLimitAuth = async (c, next) => {
    const kv = c.env?.KV;
    if (!kv) return next(); // graceful fallback if KV not bound
    const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const key = `rl:auth:${ip}`;
    const WINDOW = 15 * 60; // 15 minutes in seconds
    const MAX = 10;
    try {
        const raw = await kv.get(key);
        const count = raw ? parseInt(raw, 10) : 0;
        if (count >= MAX) {
            return c.json({ message: 'Too many attempts. Please wait 15 minutes.' }, 429);
        }
        await kv.put(key, String(count + 1), { expirationTtl: WINDOW });
    } catch { /* KV error — soft-fail open */ }
    return next();
};

app.use('/api/auth/login', rateLimitAuth);
app.use('/api/auth/register', rateLimitAuth);

app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/videos', videoRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/subscriptions', subscriptionRoutes);
app.route('/api/affiliates', affiliateRoutes);
app.route('/api/tokens', tokenRoutes);
app.route('/api/ai-jobs', aiJobRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/ai', aiRoutes);
app.route('/api/upload', uploadRoutes);

/**
 * POST /api/generate
 * Main entry point for CronAi Aethel video pipeline.
 */
app.post('/api/generate', async (c) => {
    try {
        const body = await c.req.json();
        const { face_photos, voice_sample, script, logo_url, webhook_url } = body;

        // 1. Initialize Job in D1
        const jobId = crypto.randomUUID(); // This uses the global crypto object available in Workers

        if (c.env.DB) {
            // Check subscription credits
            const user = c.get('user');
            if (user?.id) {
                const subscription = await c.env.DB.prepare(
                    'SELECT videos_remaining, status FROM subscriptions WHERE user_id = ?'
                ).bind(user.id).first();

                if (subscription && subscription.status === 'active' && subscription.videos_remaining <= 0) {
                    return c.json({
                        message: 'No video credits remaining. Please upgrade your plan.',
                        videos_remaining: 0
                    }, 402);
                }
            }

            await c.env.DB.prepare(
                'INSERT INTO ai_jobs (id, user_id, status, payload) VALUES (?, ?, "pending", ?)'
            ).bind(jobId, user?.id || 'guest', JSON.stringify({
                face_photos,
                voice_sample,
                script,
                logo_url,
                webhook_url
            })).run();
        }

        // 2. Queue for async processing
        if (c.env.AI_QUEUE) {
            await c.env.AI_QUEUE.send({
                id: jobId,
                user_id: user?.id || 'guest',
                face_photos,
                voice_sample,
                script,
                logo_url,
                webhook_url
            });
        }

        return c.json({ message: 'Generation started', jobId, status: 'processing' });
    } catch (error) {
        console.error('Generate error:', error);
        return c.json({ message: 'Internal server error', error: error.message }, 500);
    }
});

app.get('/api/health', (c) => c.json({ status: 'ok', system: 'CronAi Aethel Worker' }));

/**
 * GET /r2/:key*
 * Serves small R2 assets (user uploads, thumbnails, voiceover MP3s).
 * For full video downloads, use GET /api/videos/:id/download instead —
 * that returns a presigned URL so bytes never flow through this Worker.
 *
 * Scale note: DO NOT serve large generated videos through this route.
 * Workers have a 128 MB memory limit per invocation.
 */
app.get('/r2/:key{.+}', async (c) => {
    const key = c.req.param('key');
    // Block path traversal
    if (key.includes('..')) return c.json({ message: 'Forbidden' }, 403);

    // Serve music and other assets from cronai-assets, everything else from cronai-videos
    let r2;
    if (key.startsWith('music/') || key.startsWith('assets/') || key.startsWith('thumbnails/') || key.endsWith('.mp3') || key.endsWith('.jpg') || key.endsWith('.png')) {
        r2 = c.env['cronai-assets'];
    } else {
        r2 = c.env['cronai-videos'];
    }
    if (!r2) return c.json({ message: 'Storage not configured' }, 503);

    const object = await r2.get(key);
    if (!object) return c.json({ message: 'Not found' }, 404);

    const contentType = object.httpMetadata?.contentType || 'application/octet-stream';
    // Stream the body — avoids buffering the entire file in Worker memory
    return new Response(object.body, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
        },
    });
});

app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Internal Server Error', message: err.message }, 500);
});

export default {
    async fetch(request, env, ctx) {
        // Initialize database if needed
        await setupDatabaseIfNeeded(env);
        
        const url = new URL(request.url);

        // Handle API routes first
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/r2/')) {
            return app.fetch(request, env, ctx);
        }

        // Handle static assets
        if (env.ASSETS) {
            const assetManifest = env.ASSETS;

            // Try to serve the asset
            const response = await assetManifest.fetch(request);

            // If found, return it
            if (response.status !== 404) {
                return response;
            }

            // If not found and requesting root or HTML, serve index.html
            if (url.pathname === '/' || url.pathname.endsWith('.html') || !url.pathname.includes('.')) {
                const indexRequest = new Request(new URL('/index.html', url).toString());
                return assetManifest.fetch(indexRequest);
            }

            return response;
        }

        // Fallback
        return new Response('Not Found', { status: 404 });
    },
    async scheduled(event, env, ctx) {
        console.log('[Scheduled] Running scheduled task');
    },
    async queue(batch, env, ctx) {
        for (const message of batch.messages) {
            ctx.waitUntil(processJob(message, env));
        }
    }
};
