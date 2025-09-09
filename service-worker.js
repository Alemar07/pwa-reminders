// Simple PWA service worker for GitHub Pages
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = 'wa-reminders-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './service-worker.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    self.clients.claim();
  })());
});

// Network-first for navigations, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // handle same-origin only
  if (url.origin === location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith((async () => {
        try {
          const fresh = await fetch(req);
          // Optionally cache the latest index
          const cache = await caches.open(CACHE_NAME);
          cache.put('./', fresh.clone());
          return fresh;
        } catch (err) {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('./')) || (await cache.match('/index.html'));
        }
      })());
      return;
    }

    // For static assets
    if (ASSETS.includes(url.pathname) || ASSETS.includes('.' + url.pathname.split(location.pathname.replace(/\/g, '/')).pop())) {
      event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      })());
      return;
    }
  }
});
