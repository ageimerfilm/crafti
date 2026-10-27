// Offline support: the app is stored on the device after the first visit
const CACHE = 'crafti-522742edda';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const fresh = (req, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('slow')), ms); fetch(req).then(r => { clearTimeout(t); res(r); }, err => { clearTimeout(t); rej(err); }); });
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin){
    // the page itself: newest copy when online (so updates arrive), the stored copy when offline or slow
    if (req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname)){
      e.respondWith(fresh(req, 4000).then(r => { const copy = r.clone(); if (r.ok) caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; }).catch(() => caches.match('./index.html', {ignoreSearch: true}).then(r => r || caches.match('./'))));
      return;
    }
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(r => r || fetch(req).then(n => { if (n.ok){ const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return n; })));
    return;
  }
  // display fonts: keep a copy so the type looks the same offline
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)){
    e.respondWith(caches.match(req).then(r => { const net = fetch(req).then(n => { if (n.ok || n.type === 'opaque'){ const copy = n.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return n; }).catch(() => r); return r || net; }));
  }
  // everything else (weather, maps lookups) goes straight to the network
});
