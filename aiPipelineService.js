/**
 * CronAi Aethel — AI Pipeline Service
 * Handles multi-modal AI orchestration for emotion-driven video generation.
 * Uses Cloudflare Workers AI (Llama) for script analysis and scene direction.
 */

import { processFacePhotos } from './backend/src/services/faceService.js';
import { cloneVoice } from './backend/src/services/voiceService.js';
import { generateVideo } from './backend/src/services/videoService.js';
import { generateVoiceFromText } from './backend/src/services/voiceService.js';
import { generateMusic } from './backend/src/services/musicService.js';
import { assembleVideo } from './ffmpeg-sandbox.js'; // Import the FFmpeg sandbox worker
import { getLLMAnalysis } from './aiPipelineService.js'; // Keep the LLM analysis function

/* ── Helpers ─────────────────────────────────────────────────────────── */

async function callFal(modelId, input, env) {
    const res = await fetch(`https://fal.run/${modelId}`, {
        method: 'POST',
        headers: {
            'Authorization': `Key ${env.FAL_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error(`Fal.ai error: ${await res.text()}`);
    return res.json();
}

/**
 * Use Cloudflare Workers AI (Llama 3.1) for script analysis and scene direction.
 * This replaces external LLM calls with the built-in Workers AI.
 */
async function getLLMAnalysis(prompt, env) {
    if (!env.AI) {
        throw new Error("Workers AI binding not configured. Add [[ai]] binding to wrangler.toml");
    }

    const systemPrompt = `You are a creative director and script analyst for AI-generated video content. 
Your job is to analyze scripts and create detailed visual directions for video generation.

When analyzing a script:
1. Detect the primary emotion (excitement, trust, urgency, curiosity, or desire)
2. Generate a detailed visual prompt for a 30-second cinematic video
3. Include specific camera movements (push-in, pan, drift, static)
4. Specify lighting style (soft diffused, bright natural, dramatic, moody)
5. Describe the environment (studio, office, abstract, cozy, professional)
6. Suggest background music style that matches the emotion

Always respond with valid JSON in this exact format:
{
  "emotion": "detected_emotion",
  "video_prompt": "detailed visual description for video generation",
  "music_style": "music description",
  "camera_direction": "camera movement description",
  "lighting": "lighting description",
  "environment": "environment description"
}`;

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze this script for video generation: "${prompt}"` }
    ];

    const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages,
        temperature: 0.7,
        max_tokens: 512
    });

    return response.response;
}

/* ── Phase 1: Face Processing (Face Hashing) ─────────────────────────── */
export async function processFacePhotos(photosUrls, env, userId) {
    return await processFacePhotos(photosUrls, env, userId);
}

/* ── Phase 2: Voice Processing ────────────────────────────────────────── */
export async function processVoice(voiceAudioUrl, userId, env) {
    // Clone the voice first
    const voiceId = await cloneVoice(voiceAudioUrl, env);
    
    // Store in D1
    await env.DB.prepare('UPDATE users SET voice_id = ? WHERE id = ?')
        .bind(voiceId, userId)
        .run();

    return voiceId;
}

/* ── Phase 3: Emotion Detection & Prompt Gen ────────────────────────── */
export async function detectEmotionAndGeneratePrompts(script, faceEmbeddingId, brandColors = [], env) {
    const analysisPrompt = `
    Analyze this script: "${script}"
    1. Detect primary emotion (excitement, trust, urgency, curiosity, or desire).
    2. Generate a visual prompt for a 30s video. 
    3. Include camera (push-in, pan, etc.), lighting (dramatic, soft), and environment (office, abstract).
    Return strictly JSON: { "emotion": "...", "video_prompt": "...", "music_style": "..." }
    `;

    const response = await getLLMAnalysis(analysisPrompt, env);

    // Extraction logic to handle LLMs wrapping response in markdown code blocks
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse LLM analysis response");

    const { emotion, video_prompt, music_style } = JSON.parse(jsonMatch[0]);

    return { emotion, prompt: video_prompt, music_style };
}

/* ── Phase 4: Video Generation ────────────────────────────────────────── */
export async function generateVideo(prompt, faceEmbeddingId, env, durationSeconds = 30) {
    return await generateVideo(prompt, faceEmbeddingId, env, durationSeconds);
}

/* ── Phase 5: Voice Generation ────────────────────────────────────────── */
export async function generateVoice(text, voiceId, emotion, env) {
    return await generateVoiceFromText(text, voiceId, emotion, env);
}

/* ── Phase 6: Music Generation ─────────────────────────────────────────── */
export async function generateMusic(emotion, env, durationSeconds = 30) {
    return await generateMusic(emotion, env, durationSeconds);
}

/* ── Phase 7: Assembly (FFmpeg via Cloudflare Sandbox) ─────────────────── */
export async function assembleVideo(videoUrl, voiceUrl, musicUrl, logoUrl, emotion, env) {
    // Use the FFmpeg sandbox worker
    return await assembleVideo(
        { videoUrl, voiceUrl, musicUrl, logoUrl },
        {
            logoPosition: "bottom-right",
            voiceVolume: 1.0,
            musicVolume: 0.15,
            ducking: true,
            fade: 0.5,
            effects: {
                zoom: emotion === 'excitement',
                static: emotion === 'trust'
            }
        },
        env
    );
}

/* ── Phase 8: Orchestration ──────────────────────────────────────────── */
export async function runFullPipeline(job, env) {
    try {
        console.log(`[Pipeline] Starting job ${job.id}`);

        // 1. Face
        const faceId = await processFacePhotos(job.face_photos, env, job.user_id);

        // 2. Voice Clone
        const voiceId = await processVoice(job.voice_sample, job.user_id, env);

        // 3. Analysis
        const { emotion, prompt } = await detectEmotionAndGeneratePrompts(job.script, faceId, [], env);

        // 4, 5, 6. Parallel Generation
        const [finalVideoRaw, finalAudio, finalMusic] = await Promise.all([
            generateVideo(prompt, faceId, env),
            generateVoice(job.script, voiceId, emotion, env),
            generateMusic(emotion, env)
        ]);

        // 7. Assemble
        const finalVideoUrl = await assembleVideo(
            finalVideoRaw,
            finalAudio,
            finalMusic,
            job.logo_url,
            emotion,
            env
        );

        // Update DB
        await env.DB.prepare('UPDATE ai_jobs SET status = "completed", output_url = ?, emotion = ? WHERE id = ?')
            .bind(finalVideoUrl, emotion, job.id)
            .run();

        return { success: true, url: finalVideoUrl };
    } catch (error) {
        console.error(`[Pipeline] Job ${job.id} failed:`, error);
        await env.DB.prepare('UPDATE ai_jobs SET status = "failed", error = ? WHERE id = ?')
            .bind(error.message, job.id)
            .run();
        throw error;
    }
}