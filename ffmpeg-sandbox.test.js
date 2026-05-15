// Simple test to verify the FFmpeg sandbox worker
export default {
  async fetch(request) {
    if (request.method === 'GET' && request.url.endsWith('/test')) {
      return new Response('FFmpeg Sandbox Worker is running!', {
        headers: { 'Content-Type': 'text/plain' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};