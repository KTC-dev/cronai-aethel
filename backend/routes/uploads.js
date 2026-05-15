// Upload Handling Endpoints for CronAi Aethel
// Handles file uploads for face photos, voice samples, scripts, and logos

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';

const app = new Hono();

// Middleware to authenticate user
const authenticateUser = createMiddleware(async (c, next) => {
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
});

// Upload face photos (10-15 images)
app.post('/upload/face-photos', authenticateUser, async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('face_photos');
    
    if (!files || files.length === 0) {
      return c.json({ message: 'No face photos provided' }, 400);
    }
    
    if (files.length < 10) {
      return c.json({ 
        message: 'At least 10 face photos are required for optimal results', 
        received: files.length 
      }, 400);
    }
    
    if (files.length > 15) {
      return c.json({ 
        message: 'Maximum 15 face photos allowed', 
        received: files.length 
      }, 400);
    }
    
    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return c.json({ 
          message: `Invalid file type: ${file.type}. Only JPG and PNG are allowed.` 
        }, 400);
      }
      
      // Optional: Check file size (e.g., max 10MB per photo)
      if (file.size > 10 * 1024 * 1024) {
        return c.json({ 
          message: `File too large: ${file.name}. Maximum size is 10MB.` 
        }, 400);
      }
    }
    
    // Upload files to R2
    const uploadedUrls = [];
    for (const file of files) {
      const fileName = `face-photos/${c.get('user').id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      
      // Put file in R2
      await c.env.CRONAI_ASSETS.put(fileName, file.stream(), {
        httpMetadata: {
          contentType: file.type
        }
      });
      
      // Get public URL (assuming bucket is public or we'll generate signed URL)
      const url = `https://pub-${c.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${fileName}`;
      uploadedUrls.push(url);
    }
    
    return c.json({
      message: 'Face photos uploaded successfully',
      urls: uploadedUrls,
      count: uploadedUrls.length
    });
  } catch (error) {
    console.error('Face photo upload error:', error);
    return c.json({ message: 'Upload failed', error: error.message }, 500);
  }
});

// Upload voice sample
app.post('/upload/voice-sample', authenticateUser, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('voice_sample');
    
    if (!file) {
      return c.json({ message: 'No voice sample provided' }, 400);
    }
    
    // Validate file type (audio)
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        message: `Invalid file type: ${file.type}. Only MP3, WAV, M4A, and WebM are allowed.` 
      }, 400);
    }
    
    // Check duration would need to be done client-side or via FFmpeg
    // For now, we'll rely on client-side validation
    
    // Optional: Check file size (e.g., max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return c.json({ 
        message: `File too large: ${file.name}. Maximum size is 20MB.` 
      }, 400);
    }
    
    // Upload file to R2
    const fileName = `voice-samples/${c.get('user').id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    // Put file in R2
    await c.env.CRONAI_ASSETS.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    });
    
    // Get public URL
    const url = `https://pub-${c.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${fileName}`;
    
    return c.json({
      message: 'Voice sample uploaded successfully',
      url: url,
      name: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Voice sample upload error:', error);
    return c.json({ message: 'Upload failed', error: error.message }, 500);
  }
});

// Upload logo (optional)
app.post('/upload/logo', authenticateUser, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('logo');
    
    if (!file) {
      return c.json({ message: 'No logo provided' }, 400);
    }
    
    // Validate file type (image)
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        message: `Invalid file type: ${file.type}. Only JPG, PNG, SVG, and WebP are allowed.` 
      }, 400);
    }
    
    // Optional: Check file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ 
        message: `File too large: ${file.name}. Maximum size is 5MB.` 
      }, 400);
    }
    
    // Upload file to R2
    const fileName = `logos/${c.get('user').id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    // Put file in R2
    await c.env.CRONAI_ASSETS.put(fileName, file.stream(), {
      httpMetadata: {
        contentType: file.type
      }
    });
    
    // Get public URL
    const url = `https://pub-${c.env.CLOUDFLARE_ACCOUNT_ID}.r2.dev/${fileName}`;
    
    return c.json({
      message: 'Logo uploaded successfully',
      url: url,
      name: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return c.json({ message: 'Upload failed', error: error.message }, 500);
  }
});

// Upload script (text)
app.post('/upload/script', authenticateUser, async (c) => {
  try {
    const { script } = await c.req.json();
    
    if (!script || typeof script !== 'string') {
      return c.json({ message: 'Valid script text is required' }, 400);
    }
    
    // Validate script length
    if (script.length < 10) {
      return c.json({ 
        message: 'Script is too short. Minimum 10 characters required.' 
      }, 400);
    }
    
    if (script.length > 5000) {
      return c.json({ 
        message: 'Script is too long. Maximum 5000 characters allowed.' 
      }, 400);
    }
    
    // In a real implementation, we might store this in D1 or KV
    // For now, we'll just return it as confirmation
    
    return c.json({
      message: 'Script received successfully',
      script: script,
      length: script.length
    });
  } catch (error) {
    console.error('Script upload error:', error);
    return c.json({ message: 'Invalid request', error: error.message }, 400);
  }
});

export default app;