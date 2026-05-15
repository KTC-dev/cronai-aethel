import { handleAuth } from './handlers/authHandler';
import { handleVideo } from './handlers/videoHandler';

addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/api/auth')) {
        event.respondWith(handleAuth(event.request));
    } else if (url.pathname.startsWith('/api/video')) {
        event.respondWith(handleVideo(event.request));
    } else {
        event.respondWith(new Response('Not Found', { status: 404 }));
    }
});
