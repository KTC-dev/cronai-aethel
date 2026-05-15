-- CronAi Aethel Initial Database Schema
-- Migration: 001_initial_schema
-- Created: 2024-01-01

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    voice_id TEXT,
    face_embedding_key TEXT,
    brand_colors TEXT, -- JSON array
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- AI Jobs table
CREATE TABLE IF NOT EXISTS ai_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    payload TEXT NOT NULL, -- JSON: face_photos, voice_sample, script, logo_url
    output_url TEXT,
    emotion TEXT,
    error TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    description TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    duration INTEGER, -- in seconds
    emotion TEXT,
    status TEXT DEFAULT 'draft', -- draft, published, archived
    view_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan TEXT NOT NULL, -- free, pro, enterprise
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, expired
    stripe_subscription_id TEXT,
    current_period_start INTEGER,
    current_period_end INTEGER,
    videos_remaining INTEGER DEFAULT 3,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    stripe_payment_intent_id TEXT,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Affiliate table
CREATE TABLE IF NOT EXISTS affiliates (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    total_referrals INTEGER DEFAULT 0,
    total_earned REAL DEFAULT 0.0,
    stripe_connect_id TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- API Tokens table
CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    scopes TEXT, -- JSON array of permissions
    last_used_at INTEGER,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Analytics table for URL tracking
CREATE TABLE IF NOT EXISTS url_analytics (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- view, click, share
    referrer TEXT,
    country TEXT,
    user_agent TEXT,
    ip_hash TEXT, -- hashed IP for privacy
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON ai_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_url_analytics_video_id ON url_analytics(video_id);
CREATE INDEX IF NOT EXISTS idx_url_analytics_created_at ON url_analytics(created_at);