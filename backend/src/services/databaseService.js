// D1 Database Initialization Script for CronAi Aethel
// This script can be run via wrangler d1 execute or imported into the worker

/**
 * Initialize the database with the schema
 * This function should be called during worker startup or via migration script
 * @param {D1Database} db - D1 database instance
 */
export async function initializeDatabase(db) {
  try {
    console.log('[Database] Initializing database schema...');
    
    // Users table
    await db.exec(`
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
      )
    `);
    
    // AI Jobs table
    await db.exec(`
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
      )
    `);
    
    // Videos table
    await db.exec(`
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
      )
    `);
    
    // Subscriptions table
    await db.exec(`
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
      )
    `);
    
    // Payments table
    await db.exec(`
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
      )
    `);
    
    // Affiliate table
    await db.exec(`
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
      )
    `);
    
    // API Tokens table
    await db.exec(`
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
      )
    `);
    
    // Analytics table for URL tracking
    await db.exec(`
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
      )
    `);
    
    // Create indexes for better query performance
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_jobs_user_id ON ai_jobs(user_id);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_url_analytics_video_id ON url_analytics(video_id);
    `);
    
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_url_analytics_created_at ON url_analytics(created_at);
    `);
    
    console.log('[Database] Database schema initialized successfully');
    
  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
    throw error;
  }
}

// This function can be called from your worker's fetch handler or scheduled handler
export async function setupDatabaseIfNeeded(env) {
  try {
    // Try to query a table to see if it exists
    await env.DB.prepare('SELECT 1 FROM users LIMIT 1').all();
    // If we get here, the table exists
  } catch (error) {
    // Table doesn't exist, initialize the database
    console.log('[Database] Database not initialized, initializing now...');
    await initializeDatabase(env.DB);
  }
}

export default { initializeDatabase, setupDatabaseIfNeeded };