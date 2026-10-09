const CACHE = 'dishdash-v2';
const ASSETS = [
  './', 'index.html', 'styles.css', 'site.webmanifest',
  'js/app.js', 'js/data.js', 'js/pricing.js', 'js/payments.js',
  'privacy.html', 'terms.html', 'refunds.html',
  'images/icon.svg', 'images/dish-1.svg', 'images/dish-4.svg', 'images/dish-8.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(cached => {
      const network = fetch(event.request).then(res => {
        if (res.ok && new URL(event.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
