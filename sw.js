const CACHE = 'glyphstudio-v49';
const RUNTIME_CACHE = 'glyphstudio-runtime-v1';
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
const OPTIONAL_ASSETS = [
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js',
  'https://unpkg.com/opentype.js@1.3.4/dist/opentype.min.js',
  'https://cdn.jsdelivr.net/npm/perfect-freehand@1.2.2/+esm',
  'https://esm.sh/perfect-freehand@1.2.2',
  'https://cdn.skypack.dev/perfect-freehand@1.2.2'
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
      .then(async () => {
        // Warm up the external libraries during installation, so the first
        // successful online visit can be followed by an offline launch.
        // CDN failures are non-fatal: the local editor shell must still install.
        const runtime = await caches.open(RUNTIME_CACHE);
        await Promise.all(OPTIONAL_ASSETS.map(async url => {
          const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
          const timeout = controller ? setTimeout(() => controller.abort(), 8000) : null;
          try {
            const response = await fetch(url, {
              mode: 'cors',
              credentials: 'omit',
              signal: controller ? controller.signal : undefined
            });
            if (response.ok || response.type === 'opaque') {
              await runtime.put(url, response);
            }
          } catch (error) {
            // Keep the PWA installable even when one CDN is unavailable.
          } finally {
            if (timeout) clearTimeout(timeout);
          }
        }));
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(async keys => {
      // Keep previously downloaded CDN libraries when the app shell is updated.
      // Otherwise an update performed online could remove the only offline copy
      // of Tailwind, opentype.js or the brush engine.
      const runtime = await caches.open(RUNTIME_CACHE);
      const oldRuntimeCaches = keys.filter(key =>
        key.startsWith('glyphstudio-runtime-') && key !== RUNTIME_CACHE
      );
      for (const oldName of oldRuntimeCaches) {
        const oldCache = await caches.open(oldName);
        for (const request of await oldCache.keys()) {
          if (await runtime.match(request)) continue;
          const response = await oldCache.match(request);
          if (response) await runtime.put(request, response);
        }
      }
      await Promise.all(
        keys.filter(key => key.startsWith('glyphstudio-') &&
          key !== CACHE && key !== RUNTIME_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
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
