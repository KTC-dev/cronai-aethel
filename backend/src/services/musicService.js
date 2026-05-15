// Music Generation Service for CronAi Aethel
// Handles music generation using fal.ai MiniMax Music v2

import { callFal } from '../aiPipelineService.js';

/**
 * Generate background music based on emotion using fal.ai MiniMax Music v2
 * @param {string} emotion - Emotion to guide music generation (excitement, trust, urgency, curiosity, desire)
 * @param {Object} env - Cloudflare environment bindings
 * @param {number} durationSeconds - Music duration in seconds (default: 30)
 * @returns {Promise<string>} - URL of the generated music
 */
export async function generateMusic(emotion, env, durationSeconds = 30) {
  // Validate input
  if (!emotion || typeof emotion !== 'string') {
    throw new Error('Valid emotion is required for music generation');
  }
  
  if (durationSeconds < 5 || durationSeconds > 300) { // Max 5 minutes
    throw new Error('Music duration must be between 5 and 300 seconds');
  }
  
  // Map emotions to music prompts
  const emotionToPromptMap = {
    excitement: "Cinematic orchestral, high energy, inspiring, fast tempo, uplifting",
    trust: "Soft piano, warm ambient pads, professional, calm, steady rhythm",
    urgency: "Pulsing synth, cinematic tension, ticking elements, driving beat",
    curiosity: "Glitchy electronics, mysterious bells, intriguing, experimental textures",
    desire: "Smooth soul, deep bass, luxury atmosphere, sensual, smooth groove"
  };
  
  const prompt = emotionToPromptMap[emotion] || "Cinematic ambient, atmospheric, versatile background music";
  
  console.log(`[MusicGeneration] Generating ${durationSeconds}s music for emotion: ${emotion}`);
  console.log(`[MusicGeneration] Using prompt: ${prompt}`);
  
  try {
    // Call fal.ai MiniMax Music v2 API
    const result = await callFal('fal-ai/minimax-music', {
      prompt,
      duration: durationSeconds,
      // Additional parameters that might be available
      // These are typical for music generation models
      // tempo: 120, // BPM
      // intensity: 0.7
    }, env);
    
    // Validate response
    if (!result || !result.audio || !result.audio.url) {
      throw new Error('Invalid response from music generation API');
    }
    
    const musicUrl = result.audio.url;
    console.log(`[MusicGeneration] Music generated successfully: ${musicUrl}`);
    
    return musicUrl;
  } catch (error) {
    console.error('[MusicGeneration] Failed to generate music:', error);
    throw new Error(`Music generation failed: ${error.message}`);
  }
}

/**
 * Generate music from a custom prompt using fal.ai MiniMax Music v2
 * @param {string} prompt - Custom text prompt for music generation
 * @param {Object} env - Cloudflare environment bindings
 * @param {number} durationSeconds - Music duration in seconds (default: 30)
 * @returns {Promise<string>} - URL of the generated music
 */
export async function generateMusicFromPrompt(prompt, env, durationSeconds = 30) {
  // Validate input
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Valid prompt is required for music generation');
  }
  
  if (durationSeconds < 5 || durationSeconds > 300) { // Max 5 minutes
    throw new Error('Music duration must be between 5 and 300 seconds');
  }
  
  console.log(`[MusicGeneration] Generating ${durationSeconds}s music from custom prompt`);
  
  try {
    // Call fal.ai MiniMax Music v2 API
    const result = await callFal('fal-ai/minimax-music', {
      prompt,
      duration: durationSeconds
    }, env);
    
    // Validate response
    if (!result || !result.audio || !result.audio.url) {
      throw new Error('Invalid response from music generation API');
    }
    
    const musicUrl = result.audio.url;
    console.log(`[MusicGeneration] Music generated successfully: ${musicUrl}`);
    
    return musicUrl;
  } catch (error) {
    console.error('[MusicGeneration] Failed to generate music from prompt:', error);
    throw new Error(`Music generation failed: ${error.message}`);
  }
}

export default {
  generateMusic,
  generateMusicFromPrompt
};