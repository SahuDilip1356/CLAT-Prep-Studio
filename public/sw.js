const CACHE_PREFIX = 'clat-prep-studio';
const CACHE_VERSION = 'v1';
const APP_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-mark.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png'
];

async function precacheApplication() {
  const cache = await caches.open(APP_CACHE);
  const indexResponse = await fetch('/index.html', { cache: 'reload' });

  if (!indexResponse.ok) {
    throw new Error('Unable to cache the application shell.');
  }

  const html = await indexResponse.clone().text();
  const builtAssets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)]
    .map((match) => match[1]);
  const assets = [...new Set([...CORE_ASSETS, ...builtAssets])];

  await cache.addAll(assets);
  await cache.put('/', indexResponse.clone());
  await cache.put('/index.html', indexResponse);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApplication());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => (
          (await caches.match(request))
          || (await caches.match('/'))
          || (await caches.match('/index.html'))
        ))
    );
    return;
  }

  const isStaticAsset = ['script', 'style', 'image', 'font'].includes(request.destination)
    || url.pathname.startsWith('/assets/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkResponse = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkResponse;
      })
    );
  }
});
