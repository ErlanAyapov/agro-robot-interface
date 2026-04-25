const CACHE = 'weed-ui-v1';
const ASSETS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // видео и ws не кешируем
  if (url.pathname.startsWith('/video') || url.pathname.startsWith('/ws')) return;
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});