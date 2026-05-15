// Voice Cloning Service for CronAi Aethel
// Handles voice cloning using fal.ai Chatterbox HD

import { callFal } from '../aiPipelineService.js';

/**
 * Clone a voice from an audio sample using fal.ai Chatterbox HD
 * @param {string} audioUrl - URL of the voice sample audio (minimum 3 seconds, optimal 10-15 seconds)
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Promise<string>} - Voice ID for use in TTS generation
 */
export async function cloneVoice(audioUrl, env) {
  // Validate input
  if (!audioUrl || typeof audioUrl !== 'string') {
    throw new Error('Valid audio URL is required for voice cloning');
  }
  
  console.log(`[VoiceCloning] Cloning voice from audio: ${audioUrl}`);
  
  try {
    // Call fal.ai Chatterbox HD voice cloning API
    // Note: Using minimax/voice-clone as referenced in existing code, but checking if Chatterbox has a specific endpoint
    const result = await callFal('fal-ai/minimax/voice-clone', {
      reference_audio_url: audioUrl
    }, env);
    
    // Validate response
    if (!result) {
      throw new Error('Invalid response from voice cloning API');
    }
    
    // Extract voice ID from response (format may vary by API)
    const voiceId = result.voice_id || result.speaker_embedding || result.id;
    
    if (!voiceId) {
      throw new Error('No voice ID returned from voice cloning API');
    }
    
    console.log(`[VoiceCloning] Voice cloned successfully with ID: ${voiceId}`);
    
    return voiceId;
  } catch (error) {
    console.error('[VoiceCloning] Failed to clone voice:', error);
    throw new Error(`Voice cloning failed: ${error.message}`);
  }
}

/**
 * Generate speech from text using a cloned voice via fal.ai Chatterbox HD TTS
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID from voice cloning process
 * @param {string} emotion - Emotion for voice modulation (excitement, trust, urgency, curiosity, desire)
 * @param {Object} env - Cloudflare environment bindings
 * @returns {Promise<string>} - URL of the generated audio
 */
export async function generateVoiceFromText(text, voiceId, emotion = 'neutral', env) {
  // Validate input
  if (!text || typeof text !== 'string') {
    throw new Error('Valid text is required for voice generation');
  }
  
  if (!voiceId || typeof voiceId !== 'string') {
    throw new Error('Valid voice ID is required for voice generation');
  }
  
  // Map emotions to exaggeration parameters for Chatterbox HD
  const emotionMap = {
    excitement: 0.8,
    trust: 0.4,
    urgency: 0.6,
    curiosity: 0.5,
    desire: 0.7,
    neutral: 0.0,
    sadness: 0.3,
    anger: 0.9
  };
  
  const exaggeration = emotionMap[emotion] || 0.0;
  
  console.log(`[VoiceGeneration] Generating voice for text: "${text.substring(0, 30)}..." with emotion: ${emotion}`);
  
  try {
    // Call fal.ai Chatterbox HD TTS API
    const result = await callFal('fal-ai/chatterbox-hd/tts', {
      text,
      voice_id: voiceId,
      emotion_exaggeration: exaggeration,
      // Additional parameters that might be available
      stability: 0.5,
      similarity_boost: 0.75
    }, env);
    
    // Validate response
    if (!result || !result.audio || !result.audio.url) {
      throw new Error('Invalid response from voice generation API');
    }
    
    const audioUrl = result.audio.url;
    console.log(`[VoiceGeneration] Voice generated successfully: ${audioUrl}`);
    
    return audioUrl;
  } catch (error) {
    console.error('[VoiceGeneration] Failed to generate voice:', error);
    throw new Error(`Voice generation failed: ${error.message}`);
  }
}

export default {
  cloneVoice,
  generateVoiceFromText
};