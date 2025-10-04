self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => self.clients.claim());

self.addEventListener('fetch', (e) => {
  // Basic network-first strategy with cache fallback for core assets
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // only handle same-origin

  e.respondWith((async () => {
    try {
      const r = await fetch(e.request);
      const cache = await caches.open('wa-v1');
      cache.put(e.request, r.clone());
      return r;
    } catch (err) {
      const cache = await caches.open('wa-v1');
      const match = await cache.match(e.request);
      if (match) return match;
      // fallback to root
      return cache.match('/') || fetch('/');
    }
  })());
});
