const CACHE_NAME = 'btf-cache-v2';
const CORE_ASSETS = ['.', 'index.html', 'manifest.webmanifest', 'icon.svg'];

const buildAssetUrl = asset => new URL(asset, self.registration.scope).toString();

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS.map(buildAssetUrl)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(event.request)
            .then(cached => cached || caches.match(buildAssetUrl('index.html')))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetch(event.request)
          .then(response => {
            if (!response || !response.ok) return;
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          })
          .catch(() => undefined);
        return cached;
      }

      return fetch(event.request)
        .then(response => {
          if (!response || !response.ok) return response;
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
