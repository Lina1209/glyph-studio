const CACHE = 'glyphstudio-v25';
const RUNTIME_CACHE = 'glyphstudio-runtime-v25';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './lib/project.js',
  './lib/worksheet.js',
  './lib/clipper.js',
  './lib/CLIPPER-LICENSE.txt',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];
const CDN_HOSTS = new Set([
  'cdn.tailwindcss.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'esm.sh',
  'cdn.skypack.dev'
]);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('glyphstudio-') &&
          key !== CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAllowedCdn = CDN_HOSTS.has(url.hostname);
  if (!isSameOrigin && !isAllowedCdn) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
        }
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  const cacheName = isSameOrigin ? CACHE : RUNTIME_CACHE;
  event.respondWith(
    caches.open(cacheName).then(async cache => {
      const cached = await cache.match(request);
      const network = fetch(request).then(response => {
        // Opaque responses are cacheable too (classic cross-origin scripts).
        if (response.ok || response.type === 'opaque') {
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
