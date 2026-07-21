// Southwest Edge Portal — service worker
// Genuinely network-first: always tries the network first for the app shell,
// and only falls back to a cached copy if the network request itself fails
// (i.e., truly offline). The previous version returned a cached copy
// immediately whenever one existed, only refreshing it quietly in the
// background — that's cache-first behavior, not network-first, and it's
// why deploys sometimes appeared not to take effect for a session or two.
const CACHE_NAME = 'swe-portal-shell-v3';
const SHELL_FILES = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin || !isShellFile) {
    // Anything else (weather API, ORION feed, contact logo lookups, etc.) — let the
    // browser handle it normally, straight to the network, no caching involved.
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)) // offline — fall back to whatever we've cached
  );
});
