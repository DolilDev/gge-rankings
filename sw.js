// ══════════════════════════════════════════════════════════════
//  GGE Rankings — service worker (offline app shell + fast loads)
//  Bump VERSION on every asset change (keep in sync with ?v= in index.html).
// ══════════════════════════════════════════════════════════════
const VERSION = '20260816-21';
const CACHE_PREFIX = 'gge-';
const CACHE = CACHE_PREFIX + VERSION;

// App shell — relative URLs so it works under the /gge-rankings/ GitHub Pages path.
const PRECACHE = [
  './',
  './index.html',
  './config.js?v=' + VERSION,
  './i18n.js?v=' + VERSION,
  './state.js?v=' + VERSION,
  './api.js?v=' + VERSION,
  './crest.js?v=' + VERSION,
  './render.js?v=' + VERSION,
  './features.js?v=' + VERSION,
  './main.js?v=' + VERSION,
  './style.css?v=' + VERSION,
  './manifest.json',
  './icon.svg',
  './favicon.ico',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Add individually so one failure doesn't abort the whole install.
    await Promise.allSettled(PRECACHE.map(u => cache.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never intercept cross-origin requests (game API, GitHub raw, translations).
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Same-origin static assets: cache-first, then network (and cache the result).
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    } catch {
      return hit || Response.error();
    }
  })());
});
