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
 * GET /api/ai/emotions
 * Get available emotions and their characteristics
 */
app.get('/emotions', async (c) => {
    return c.json({
        emotions: [
            {
                id: 'excitement',
                name: 'Excitement',
                description: 'High energy, enthusiastic, dynamic',
                camera: 'Slow push-in or dynamic movement',
                lighting: 'Bright, high contrast',
                music: 'Cinematic orchestral, high energy',
                colorPalette: ['#FF6B6B', '#FFE66D', '#4ECDC4']
            },
            {
                id: 'trust',
                name: 'Trust',
                description: 'Professional, reliable, calm',
                camera: 'Static or slow pan',
                lighting: 'Soft, diffused, natural',
                music: 'Soft piano, warm ambient',
                colorPalette: ['#4A90D9', '#87CEEB', '#F5F5F5']
            },
            {
                id: 'urgency',
                name: 'Urgency',
                description: 'Time-sensitive, important, pressing',
                camera: 'Quick cuts, dynamic',
                lighting: 'Dramatic, high contrast',
                music: 'Pulsing synth, cinematic tension',
                colorPalette: ['#FF4444', '#FF8C00', '#333333']
            },
            {
                id: 'curiosity',
                name: 'Curiosity',
                description: 'Intriguing, mysterious, engaging',
                camera: 'Slow reveal, pan',
                lighting: 'Moody, focused',
                music: 'Glitchy electronics, mysterious',
                colorPalette: ['#9B59B6', '#3498DB', '#2C3E50']
            },
            {
                id: 'desire',
                name: 'Desire',
                description: 'Aspirational, luxurious, appealing',
                camera: 'Smooth, elegant movements',
                lighting: 'Warm, golden hour',
                music: 'Smooth soul, deep bass',
                colorPalette: ['#E74C3C', '#C0392B', '#F39C12']
            }
        ]
    });
});

/**
 * POST /api/ai/analyze-script
 * Analyze a script and detect emotion
 */
app.post('/analyze-script', requireAuth, async (c) => {
    const { script } = await c.req.json();

    if (!script || script.length < 10) {
        return c.json({ message: 'Script must be at least 10 characters' }, 400);
    }

    // Simple keyword-based emotion detection (in production, use AI)
    const emotionKeywords = {
        excitement: ['amazing', 'incredible', 'excited', 'wow', 'fantastic', 'revolutionary', 'breakthrough', 'game-changing'],
        trust: ['reliable', 'trusted', 'professional', 'proven', 'secure', 'guaranteed', 'certified', 'established'],
        urgency: ['now', 'limited', 'hurry', 'today', 'deadline', 'expiring', 'last chance', 'act fast'],
        curiosity: ['discover', 'secret', 'hidden', 'reveal', 'mystery', 'unknown', 'what if', 'imagine'],
        desire: ['luxury', 'premium', 'exclusive', 'elite', 'success', 'achieve', 'dream', 'aspirational']
    };

    const scriptLower = script.toLowerCase();
    let detectedEmotion = 'trust'; // Default
    let maxScore = 0;

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
        const score = keywords.filter(kw => scriptLower.includes(kw)).length;
        if (score > maxScore) {
            maxScore = score;
            detectedEmotion = emotion;
        }
    }

    // Get emotion details
    const emotionDetails = {
        excitement: { intensity: 'high', pace: 'fast', tone: 'enthusiastic' },
        trust: { intensity: 'medium', pace: 'steady', tone: 'professional' },
        urgency: { intensity: 'high', pace: 'fast', tone: 'pressing' },
        curiosity: { intensity: 'medium', pace: 'moderate', tone: 'intriguing' },
        desire: { intensity: 'medium', pace: 'slow', tone: 'aspirational' }
    };

    return c.json({
        detected_emotion: detectedEmotion,
        confidence: maxScore > 0 ? Math.min(maxScore * 25, 95) : 50,
        emotion_details: emotionDetails[detectedEmotion],
        script_length: script.length,
        estimated_duration: Math.ceil(script.split(' ').length / 2.5) // ~2.5 words per second
    });
});

/**
 * POST /api/ai/generate-prompt
 * Generate a video prompt based on script and emotion
 */
app.post('/generate-prompt', requireAuth, async (c) => {
    const { script, emotion, brand_colors } = await c.req.json();

    if (!script) {
        return c.json({ message: 'Script is required' }, 400);
    }

    const promptTemplates = {
        excitement: `Dynamic cinematic shot, high energy atmosphere, bright and vibrant lighting, professional studio setting, confident expression, engaging camera presence, modern aesthetic, ${brand_colors ? `incorporating colors ${brand_colors.join(', ')}` : ''}`,
        trust: `Professional studio portrait, soft diffused lighting, calm and confident demeanor, clean background, trustworthy expression, corporate aesthetic, ${brand_colors ? `with subtle ${brand_colors.join(' and ')} accents` : ''}`,
        urgency: `Dramatic lighting, high contrast, intense expression, dynamic camera angle, sense of immediacy, bold visual style, ${brand_colors ? `featuring ${brand_colors.join(', ')}` : ''}`,
        curiosity: `Mysterious atmosphere, focused lighting, intriguing expression, slow reveal composition, engaging visual narrative, ${brand_colors ? `with ${brand_colors.join(', ')} color tones` : ''}`,
        desire: `Luxurious setting, warm golden lighting, aspirational aesthetic, elegant composition, premium feel, sophisticated visual style, ${brand_colors ? `accented with ${brand_colors.join(', ')}` : ''}`
    };

    const basePrompt = promptTemplates[emotion] || promptTemplates.trust;
    const enhancedPrompt = `${basePrompt}, high quality, 4K, cinematic, professional video production, smooth motion, natural movements`;

    return c.json({
        prompt: enhancedPrompt,
        emotion,
        estimated_duration: Math.ceil(script.split(' ').length / 2.5),
        word_count: script.split(' ').length
    });
});

/**
 * GET /api/ai/voice-options
 * Get available voice options for cloning
 */
app.get('/voice-options', async (c) => {
    return c.json({
        voice_styles: [
            { id: 'natural', name: 'Natural', description: 'Clear, conversational tone' },
            { id: 'professional', name: 'Professional', description: 'Formal, business-appropriate' },
            { id: 'energetic', name: 'Energetic', description: 'Upbeat, enthusiastic delivery' },
            { id: 'calm', name: 'Calm', description: 'Soothing, relaxed tone' },
            { id: 'authoritative', name: 'Authoritative', description: 'Confident, commanding presence' }
        ],
        supported_languages: ['en-US', 'en-UK', 'en-AU', 'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-BR', 'ja-JP', 'zh-CN'],
        sample_duration_required: 11, // seconds
        supported_audio_formats: ['mp3', 'wav', 'm4a', 'ogg']
    });
});

/**
 * POST /api/ai/validate-assets
 * Validate uploaded assets before processing
 */
app.post('/validate-assets', requireAuth, async (c) => {
    const { face_photos, voice_sample, script, logo_url } = await c.req.json();

    const errors = [];
    const warnings = [];

    // Validate face photos
    if (!face_photos || !Array.isArray(face_photos)) {
        errors.push('face_photos array is required');
    } else if (face_photos.length < 10) {
        warnings.push('Recommended: at least 10 face photos for best results');
    } else if (face_photos.length > 20) {
        warnings.push('Only first 20 photos will be used');
    }

    // Validate voice sample
    if (!voice_sample) {
        errors.push('voice_sample URL is required');
    }

    // Validate script
    if (!script) {
        errors.push('script is required');
    } else if (script.length < 50) {
        warnings.push('Script is short - recommended minimum 50 characters');
    } else if (script.length > 500) {
        warnings.push('Script is long - may result in longer video than expected');
    }

    // Calculate estimated cost
    const estimatedCredits = 1; // 1 credit per video for MVP

    return c.json({
        valid: errors.length === 0,
        errors,
        warnings,
        estimated_credits: estimatedCredits,
        estimated_duration: Math.ceil(script ? script.split(' ').length / 2.5 : 30),
        assets: {
            face_photos_count: face_photos?.length || 0,
            has_voice_sample: !!voice_sample,
            has_logo: !!logo_url
        }
    });
});

export default app;