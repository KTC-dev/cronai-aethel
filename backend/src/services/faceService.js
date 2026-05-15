// Face Processing Service for CronAi Aethel
// Handles face detection, embedding extraction, and consistency using fal.ai InsightFace

import { callFal } from './aiPipelineService.js';

/**
 * Process face photos to extract embeddings for face consistency
 * @param {Array<string>} photoUrls - Array of publicly accessible URLs to face photos
 * @param {Object} env - Cloudflare environment bindings
 * @param {string} userId - User ID for storing embeddings
 * @returns {Promise<string>} - Key for the stored face embedding in KV
 */
export async function processFacePhotos(photoUrls, env, userId) {
  // Validate input
  if (!photoUrls || photoUrls.length === 0) {
    throw new Error('No face photos provided');
  }
  
  if (photoUrls.length < 10) {
    console.warn(`[FaceProcessing] Only ${photoUrls.length} photos provided, recommended 10-15 for best results`);
  }
  
  if (photoUrls.length > 15) {
    console.warn(`[FaceProcessing] More than 15 photos provided, using first 15`);
    photoUrls = photoUrls.slice(0, 15);
  }

  // Process all photos in parallel to minimize latency
  const results = await Promise.all(
    photoUrls.map(async (url, index) => {
      try {
        console.log(`[FaceProcessing] Processing photo ${index + 1}/${photoUrls.length}: ${url}`);
        const result = await callFal('fal-ai/insightface/embedding', { image_url: url }, env);
        
        // Validate response
        if (!result || !result.embedding) {
          throw new Error('Invalid response from InsightFace API');
        }
        
        return result.embedding;
      } catch (error) {
        console.error(`[FaceProcessing] Failed to process face photo ${url}:`, error);
        // Return null for failed photos, we'll filter them out later
        return null;
      }
    })
  );
  
  // Filter out failed results
  const embeddings = results.filter(Boolean);
  
  if (embeddings.length === 0) {
    throw new Error('Could not extract face embeddings from any photos');
  }
  
  console.log(`[FaceProcessing] Successfully processed ${embeddings.length}/${photoUrls.length} photos`);
  
  // Validate embedding dimensions (InsightFace typically returns 512-dim vectors)
  const embeddingLength = embeddings[0].length;
  if (embeddingLength !== 512) {
    console.warn(`[FaceProcessing] Unexpected embedding dimension: ${embeddingLength}, expected 512`);
  }
  
  // Check if all embeddings have the same dimension
  const dimensionMismatch = embeddings.some(emb => emb.length !== embeddingLength);
  if (dimensionMismatch) {
    throw new Error('Inconsistent embedding dimensions across photos');
  }
  
  // Average embeddings into a master vector
  const masterEmbedding = new Array(embeddingLength).fill(0);
  
  for (let i = 0; i < embeddingLength; i++) {
    let sum = 0;
    for (const emb of embeddings) {
      sum += emb[i];
    }
    masterEmbedding[i] = sum / embeddings.length;
  }
  
  // Normalize the master embedding (L2 normalization)
  const norm = Math.sqrt(masterEmbedding.reduce((acc, val) => acc + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < masterEmbedding.length; i++) {
      masterEmbedding[i] /= norm;
    }
  }
  
  // Store in KV for later use in video generation
  const key = `face_embedding:${userId}`;
  await env.KV.put(key, JSON.stringify(masterEmbedding));
  
  console.log(`[FaceProcessing] Face embedding stored for user ${userId} with key ${key}`);
  
  // Return the key for reference
  return key;
}

/**
 * Get stored face embedding for a user
 * @param {Object} env - Cloudflare environment bindings
 * @param {string} userId - User ID
 * @returns {Promise<Array<number>|null>} - Face embedding or null if not found
 */
export async function getFaceEmbedding(env, userId) {
  const key = `face_embedding:${userId}`;
  const embeddingJson = await env.KV.get(key);
  
  if (!embeddingJson) {
    return null;
  }
  
  try {
    return JSON.parse(embeddingJson);
  } catch (error) {
    console.error(`[FaceProcessing] Failed to parse face embedding for user ${userId}:`, error);
    return null;
  }
}

/**
 * Delete face embedding for a user (for privacy/GDPR compliance)
 * @param {Object} env - Cloudflare environment bindings
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
export async function deleteFaceEmbedding(env, userId) {
  const key = `face_embedding:${userId}`;
  await env.KV.delete(key);
  
  console.log(`[FaceProcessing] Face embedding deleted for user ${userId}`);
}

export default {
  processFacePhotos,
  getFaceEmbedding,
  deleteFaceEmbedding
};