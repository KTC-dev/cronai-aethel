// Video Generation Service for CronAi Aethel
// Handles video generation using fal.ai Wan 2.5 Image-to-Video

import { callFal } from '../aiPipelineService.js';

/**
 * Generate video from text prompt with optional face reference
 * @param {string} prompt - Text description for video generation
 * @param {string|null} faceEmbeddingId - Optional face embedding for consistency (KV key or similar)
 * @param {Object} env - Cloudflare environment bindings
 * @param {number} durationSeconds - Video duration in seconds (default: 30)
 * @returns {Promise<string>} - URL of the generated video
 */
export async function generateVideo(prompt, faceEmbeddingId = null, env, durationSeconds = 30) {
  // Validate input
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Valid prompt is required for video generation');
  }
  
  if (durationSeconds < 5 || durationSeconds > 60) {
    throw new Error('Video duration must be between 5 and 60 seconds');
  }
  
  console.log(`[VideoGeneration] Generating ${durationSeconds}s video with prompt: "${prompt.substring(0, 50)}..."`);
  
  // Prepare input for fal.ai Wan 2.5
  const videoInput = {
    prompt,
    duration: durationSeconds,
    // Note: Actual fal.ai Wan 2.5 parameters may vary
    // This is based on typical parameters for similar models
    resolution: "720p", // Could be made configurable
    fps: 24,
    // Add face reference if available
    // Note: The exact parameter name for face reference in Wan 2.5 needs to be verified
    // This is a placeholder for the face consistency feature
    ...(faceEmbeddingId ? { face_reference: faceEmbeddingId } : {})
  };
  
  try {
    // Call fal.ai Wan 2.5 API
    const result = await callFal('fal-ai/wan-video', videoInput, env);
    
    // Validate response
    if (!result || !result.video || !result.video.url) {
      throw new Error('Invalid response from video generation API');
    }
    
    const videoUrl = result.video.url;
    console.log(`[VideoGeneration] Video generated successfully: ${videoUrl}`);
    
    return videoUrl;
  } catch (error) {
    console.error('[VideoGeneration] Failed to generate video:', error);
    throw new Error(`Video generation failed: ${error.message}`);
  }
}

/**
 * Generate video from image (image-to-video) using Wan 2.5
 * @param {string} imageUrl - URL of the input image
 * @param {string} prompt - Text description for video generation
 * @param {Object} env - Cloudflare environment bindings
 * @param {number} durationSeconds - Video duration in seconds (default: 30)
 * @returns {Promise<string>} - URL of the generated video
 */
export async function generateVideoFromImage(imageUrl, prompt, env, durationSeconds = 30) {
  // Validate input
  if (!imageUrl || typeof imageUrl !== 'string') {
    throw new Error('Valid image URL is required for image-to-video generation');
  }
  
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Valid prompt is required for video generation');
  }
  
  console.log(`[VideoGeneration] Generating ${durationSeconds}s video from image: ${imageUrl}`);
  
  // Prepare input for fal.ai Wan 2.5 image-to-video
  const videoInput = {
    image_url: imageUrl,
    prompt,
    duration: durationSeconds,
    resolution: "720p",
    fps: 24
  };
  
  try {
    // Call fal.ai Wan 2.5 image-to-video API
    const result = await callFal('fal-ai/wan-video/image-to-video', videoInput, env);
    
    // Validate response
    if (!result || !result.video || !result.video.url) {
      throw new Error('Invalid response from image-to-video API');
    }
    
    const videoUrl = result.video.url;
    console.log(`[VideoGeneration] Image-to-video generated successfully: ${videoUrl}`);
    
    return videoUrl;
  } catch (error) {
    console.error('[VideoGeneration] Failed to generate video from image:', error);
    throw new Error(`Image-to-video generation failed: ${error.message}`);
  }
}

export default {
  generateVideo,
  generateVideoFromImage
};