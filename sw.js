
const CACHE_NAME = 'insaan-hayawaan-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap',
];

self.addEventListener('install', (event) => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add core assets to cache. Others will be cached on demand.
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Network falling back to cache strategy
    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return fetch(event.request)
                .then((response) => {
                    // If we got a valid response, clone it and store it in the cache.
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                })
                .catch(() => {
                    // If the network request fails, try to serve from the cache.
                    return cache.match(event.request).then((response) => {
                        // If we have a match in the cache, return it.
                        if (response) {
                            return response;
                        }
                        // For navigation requests, fall back to the main HTML page.
                        if (event.request.mode === 'navigate') {
                             return caches.match('/index.html');
                        }
                    });
                });
        })
    );
});


self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
