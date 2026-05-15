/**
 * CronAi Aethel — Admin Mock Data
 * Used as fallback when API returns empty or is unavailable.
 */

export const MOCK_OVERVIEW = {
    users: { total: 1284 },
    videos: {
        total: 4671,
        completed: 4312,
        hd: 3890,
        fourK: 781,
        resolutionSplit: { hd_pct: 83, fourk_pct: 17 },
    },
    revenue: {
        cashTotal: 28_450.80,
        transactions: 892,
        affiliateCashPaid: 3_120.40,
        affiliateCoins: 182_500,
        affiliateCoinValueUSD: 1825.00,
        affiliatePrograms: 214,
    },
    /* ── Today-specific metrics ── */
    today: {
        videosGenerated: 47,
        activeUsers: 228,
        revenue: 340.50,
        avgCostPerVideo: 0.82,
        profitMarginPct: 68.4,
    },
};

export const MOCK_EMOTIONS = {
    topEmotions: [
        { emotion: 'desire', videoCount: 1240, avgWatchTimeSec: 78, avgClickThroughRate: 0.072, avgConversionRate: 0.031, performanceLabel: 'high_performer' },
        { emotion: 'excitement', videoCount: 980, avgWatchTimeSec: 62, avgClickThroughRate: 0.058, avgConversionRate: 0.022, performanceLabel: 'high_performer' },
        { emotion: 'aspiration', videoCount: 740, avgWatchTimeSec: 85, avgClickThroughRate: 0.064, avgConversionRate: 0.028, performanceLabel: 'high_performer' },
        { emotion: 'trust', videoCount: 620, avgWatchTimeSec: 55, avgClickThroughRate: 0.041, avgConversionRate: 0.019, performanceLabel: 'moderate_performer' },
        { emotion: 'curiosity', videoCount: 510, avgWatchTimeSec: 48, avgClickThroughRate: 0.038, avgConversionRate: 0.015, performanceLabel: 'moderate_performer' },
        { emotion: 'fear_of_missing_out', videoCount: 430, avgWatchTimeSec: 35, avgClickThroughRate: 0.031, avgConversionRate: 0.011, performanceLabel: 'low_performer' },
        { emotion: 'satisfaction', videoCount: 290, avgWatchTimeSec: 72, avgClickThroughRate: 0.052, avgConversionRate: 0.024, performanceLabel: 'moderate_performer' },
        { emotion: 'joy', videoCount: 180, avgWatchTimeSec: 41, avgClickThroughRate: 0.029, avgConversionRate: 0.008, performanceLabel: 'low_performer' },
    ],
    learningInsights: [
        { emotion: 'desire', avg_watch_time: 78, avg_ctr: 0.072, performance_score: 0.91, recorded_at: '2026-04-06T14:22:00Z' },
        { emotion: 'aspiration', avg_watch_time: 85, avg_ctr: 0.064, performance_score: 0.88, recorded_at: '2026-04-06T14:22:00Z' },
        { emotion: 'excitement', avg_watch_time: 62, avg_ctr: 0.058, performance_score: 0.79, recorded_at: '2026-04-06T14:22:00Z' },
    ],
    generatedAt: new Date().toISOString(),
};

export const MOCK_VIDEOS = [
    { id: 'v1', title: 'Artisan Coffee — Shock Hook', template: 'Shock Hook', primary_emotion: 'desire', resolution: '4K', status: 'completed', user_email: 'lena@brand.io', created_at: '2026-04-06T10:14:00Z', views: 2840, ctr: 0.081 },
    { id: 'v2', title: 'FitTrack App Launch', template: 'Money Proof', primary_emotion: 'excitement', resolution: 'HD', status: 'completed', user_email: 'kemi@fitstudio.ng', created_at: '2026-04-05T16:30:00Z', views: 1920, ctr: 0.062 },
    { id: 'v3', title: 'Luxury Skincare — Ritual', template: 'Us vs Them', primary_emotion: 'aspiration', resolution: '4K', status: 'completed', user_email: 'amara@luxe.co', created_at: '2026-04-05T09:10:00Z', views: 3200, ctr: 0.074 },
    { id: 'v4', title: 'Finance Trust Builder', template: 'Shock Hook', primary_emotion: 'trust', resolution: 'HD', status: 'completed', user_email: 'john@fintech.io', created_at: '2026-04-04T11:00:00Z', views: 980, ctr: 0.041 },
    { id: 'v5', title: 'Coding Bootcamp — Enroll', template: 'Money Proof', primary_emotion: 'curiosity', resolution: 'HD', status: 'processing', user_email: 'dev@techlearn.io', created_at: '2026-04-04T08:45:00Z', views: 0, ctr: 0 },
    { id: 'v6', title: 'Flash Sale — 24hr Drop', template: 'Shock Hook', primary_emotion: 'fear_of_missing_out', resolution: 'HD', status: 'completed', user_email: 'shop@dropship.co', created_at: '2026-04-03T20:00:00Z', views: 4100, ctr: 0.091 },
];

export const MOCK_USERS = [
    { id: 'u1', name: 'Lena Hoffmann', email: 'lena@brand.io', subscription_tier: 'Premium', cash_balance: 240.00, coins: 1250, videos_created: 18, affiliate_earnings: 80.00, status: 'active', joined: '2026-01-12' },
    { id: 'u2', name: 'Kemi Adeyemi', email: 'kemi@fitstudio.ng', subscription_tier: 'Basic', cash_balance: 40.00, coins: 300, videos_created: 7, affiliate_earnings: 22.00, status: 'active', joined: '2026-02-04' },
    { id: 'u3', name: 'Amara Osei', email: 'amara@luxe.co', subscription_tier: 'Premium', cash_balance: 520.00, coins: 5800, videos_created: 41, affiliate_earnings: 312.50, status: 'active', joined: '2025-12-20' },
    { id: 'u4', name: 'John Mensah', email: 'john@fintech.io', subscription_tier: 'Basic', cash_balance: 15.00, coins: 80, videos_created: 3, affiliate_earnings: 0, status: 'active', joined: '2026-03-18' },
    { id: 'u5', name: 'Dev Studio', email: 'dev@techlearn.io', subscription_tier: 'Premium', cash_balance: 190.00, coins: 2400, videos_created: 22, affiliate_earnings: 145.00, status: 'active', joined: '2026-02-28' },
    { id: 'u6', name: 'Drop Shop', email: 'shop@dropship.co', subscription_tier: 'Basic', cash_balance: 0, coins: 0, videos_created: 2, affiliate_earnings: 0, status: 'suspended', joined: '2026-04-01' },
];

export const MOCK_REVENUE = {
    totalEarnings: 28_450.80,
    monthlyTrend: [
        { month: 'Nov', cash: 1820, coins: 410 },
        { month: 'Dec', cash: 2640, coins: 590 },
        { month: 'Jan', cash: 3890, coins: 820 },
        { month: 'Feb', cash: 4720, coins: 1020 },
        { month: 'Mar', cash: 6180, coins: 1340 },
        { month: 'Apr', cash: 9200, coins: 1825 },
    ],
    upgradeRevenue: 6_240.00,
    coinStats: { totalCoins: 182_500, redeemed: 64_200, pending: 118_300, usdValue: 1825.00 },
    topSpenders: [
        { name: 'Amara Osei', amount: 520 },
        { name: 'Lena Hoffmann', amount: 240 },
        { name: 'Dev Studio', amount: 190 },
    ],
};

export const MOCK_SYSTEM = {
    services: [
        { name: 'OpenAI (GPT-4o)', status: 'operational', latencyMs: 820, uptime: 99.8 },
        { name: 'Gemini Pro', status: 'operational', latencyMs: 1140, uptime: 99.2 },
        { name: 'DeepSeek Chat', status: 'degraded', latencyMs: 3200, uptime: 96.4 },
        { name: 'D1 Database', status: 'operational', latencyMs: 18, uptime: 100 },
        { name: 'R2 Storage', status: 'operational', latencyMs: 42, uptime: 100 },
        { name: 'KV Cache', status: 'operational', latencyMs: 9, uptime: 100 },
    ],
    queue: { pending: 3, processing: 1, failed: 2, completed_today: 184 },
    recentErrors: [
        { id: 'e1', job_id: 'j_882', error: 'DeepSeek timeout after 30s', ts: '2026-04-07T08:14:00Z', resolved: false },
        { id: 'e2', job_id: 'j_879', error: 'OpenAI rate limit hit — retried OK', ts: '2026-04-07T07:50:00Z', resolved: true },
        { id: 'e3', job_id: 'j_871', error: 'R2 upload failed: object too large', ts: '2026-04-06T23:31:00Z', resolved: false },
        { id: 'e4', job_id: 'j_860', error: 'D1 constraint violation on video insert', ts: '2026-04-06T19:05:00Z', resolved: true },
    ],
};

export const MOCK_ACTIVITY = [
    { id: 1, type: 'video_created', text: 'Lena Hoffmann created "Artisan Coffee — Shock Hook"', ts: '2 min ago' },
    { id: 2, type: 'upgrade', text: 'Amara Osei upgraded to 4K', ts: '7 min ago' },
    { id: 3, type: 'signup', text: 'New user registered: yu@brand.co', ts: '12 min ago' },
    { id: 4, type: 'payment', text: 'Payment of $49 received from Dev Studio', ts: '18 min ago' },
    { id: 5, type: 'video_created', text: 'Dev Studio created "Coding Bootcamp — Enroll"', ts: '23 min ago' },
    { id: 6, type: 'error', text: 'DeepSeek timeout on job j_882 — retrying', ts: '31 min ago' },
];

/* ─────────────────────────────────────────────────────────────────────────
   PRICING CONTROL
   ──────────────────────────────────────────────────────────────────────── */
export const MOCK_PRICING = {
    hd: { base: 5, min: 2, max: 15, multiplier: 1.0 },
    fourk: { base: 10, min: 5, max: 30, multiplier: 1.2 },
    mode: 'auto',        // 'auto' | 'manual' | 'surge'
    surgeThreshold: 80,  // queue % that triggers surge
    surgeFactor: 1.5,
};

/* ─────────────────────────────────────────────────────────────────────────
   COST MONITOR
   ──────────────────────────────────────────────────────────────────────── */
export const MOCK_COSTS = {
    totalToday: 142.80,
    aiRenderingCost: 89.40,
    storageCostMonth: 24.60,
    bandwidthCostMonth: 18.30,
    costPerHD: 0.42,
    costPerFourK: 1.18,
    storageUsedGB: 128.4,
    storageLimitGB: 500,
    bandwidthUsedGB: 312.8,
    bandwidthLimitGB: 1000,
    trend: [
        { hour: '00', cost: 2.1 }, { hour: '03', cost: 1.4 }, { hour: '06', cost: 3.8 },
        { hour: '09', cost: 12.4 }, { hour: '12', cost: 18.2 }, { hour: '15', cost: 22.6 },
        { hour: '18', cost: 19.8 }, { hour: '21', cost: 14.3 }, { hour: '23', cost: 8.1 },
    ],
};

/* ─────────────────────────────────────────────────────────────────────────
   REWARD & CREDIT CONTROL
   ──────────────────────────────────────────────────────────────────────── */
export const MOCK_REWARDS = {
    rules: {
        upload: { credits: 2, enabled: true },
        liked: { credits: 1, enabled: true },
        trending: { credits: 5, enabled: true },
        shared: { credits: 3, enabled: true },
        referral: { credits: 10, enabled: true },
    },
    dailyCap: 20,
    expirationDays: 30,
    qualityGate: { minViews: 50, mustBePublic: true, mustBeSharedOrTrending: true },
    recentGrants: [
        { user: 'Lena Hoffmann', reason: 'trending video', credits: 5, ts: '2026-04-08T10:14:00Z' },
        { user: 'Amara Osei', reason: 'upload', credits: 2, ts: '2026-04-08T10:02:00Z' },
        { user: 'Dev Studio', reason: 'referral', credits: 10, ts: '2026-04-08T09:45:00Z' },
        { user: 'John Mensah', reason: 'video shared', credits: 3, ts: '2026-04-08T09:20:00Z' },
    ],
};

/* ─────────────────────────────────────────────────────────────────────────
   PREDICTIVE & PREMIUM
   ──────────────────────────────────────────────────────────────────────── */
export const MOCK_PREDICTIVE = {
    peakHours: [9, 12, 13, 18, 19, 20],
    currentLoad: 67,    // queue load %
    viralScore: 42,     // 0–100
    premiumSettings: {
        fixedPricing: true,
        priorityQueue: true,
        fasterRendering: true,
        renderBoostFactor: 1.5,
        priceCapMultiplier: 1.0,
    },
    notifications: {
        highDemandAlert: true,
        pricingChangeAlert: true,
        surgeWarningLeadMins: 30,
    },
    forecast: [
        { hour: '09:00', predictedLoad: 72 },
        { hour: '10:00', predictedLoad: 78 },
        { hour: '11:00', predictedLoad: 85 },
        { hour: '12:00', predictedLoad: 91 },
        { hour: '13:00', predictedLoad: 88 },
        { hour: '14:00', predictedLoad: 74 },
        { hour: '15:00', predictedLoad: 68 },
    ],
};
