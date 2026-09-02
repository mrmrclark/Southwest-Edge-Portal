// Southwest Edge Portal — offline app shell.
//
// This is deliberately narrow: its only job is letting the page itself (this HTML file,
// plus the two pinned CDN libraries it loads) open with no network connection at all. It
// does NOT cache or intercept anything from Supabase — all of the real offline data (your
// clients/deals/to-dos/contacts) lives in IndexedDB, managed by index.html itself, not here.
// Bump CACHE_VERSION any time the shell's own files change, so old caches get cleared out.
const CACHE_VERSION = 'swedge-shell-v1';
const SHELL_URLS = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-180.png',
  'icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // addAll fails the whole install if even one request 404s — try individually instead so
    // one bad/blocked URL (e.g. an ad-blocker on the CDN) doesn't prevent the rest from caching.
    await Promise.all(SHELL_URLS.map(async (url) => {
      try {
        const req = new Request(url, { cache: 'reload' });
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) await cache.put(url, res);
      } catch (e) { /* offline during install, or blocked — fine, will retry on next visit */ }
    }));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(n => n !== CACHE_VERSION).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

const CDN_URLS = SHELL_URLS.filter(u => u.startsWith('http'));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept writes — those go straight to Supabase

  const url = req.url;
  const isCdnLib = CDN_URLS.some(cdnUrl => url === cdnUrl || url.startsWith(cdnUrl));
  const isNavigation = req.mode === 'navigate';
  const sameOrigin = url.startsWith(self.location.origin);

  if (isCdnLib) {
    // Pinned versions — safe to serve straight from cache, no need to ever re-check network.
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (e) { return cached || Response.error(); }
    })());
    return;
  }

  if (isNavigation || (sameOrigin && (url.endsWith('.html') || url.endsWith('/') || url.endsWith('manifest.json') || url.endsWith('.png')))) {
    // The app shell itself: try the network first so you always get the latest deployed
    // version when there's a connection, falling back to the cached copy with none.
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(CACHE_VERSION);
        cache.put(req, res.clone());
        return res;
      } catch (e) {
        const cached = await caches.match(req) || await caches.match('index.html');
        return cached || Response.error();
      }
    })());
    return;
  }

  // Everything else (Supabase REST/auth/functions calls, Google Maps, Resend, etc.) — leave
  // completely untouched. The app's own online/offline + outbox logic handles those.
});
