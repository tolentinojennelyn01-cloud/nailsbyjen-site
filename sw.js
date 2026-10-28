/* Nails by Jen (main website) – service worker.
   Lets the site open fast and still open when there is no internet.
   It remembers pages and pictures the first time they load, so you do NOT have to list the pictures.
   Change the version number below whenever you upload a new index.html. */
const VERSION = "nbj-site-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./images/logo.png", "./images/bg-marble.jpg"];
const LIBS = ["cdn.tailwindcss.com", "fonts.googleapis.com", "fonts.gstatic.com", "www.gstatic.com"];   /* styling, fonts, Firebase scripts */

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const keyOf = req => { const u = new URL(req.url); return u.origin + u.pathname; };

/* show the saved copy right away, refresh it quietly in the background */
const swr = (e, req, key) => e.respondWith(caches.open(VERSION).then(async c => {
  const hit = await c.match(key || req);
  const net = fetch(req).then(r => { if (r && (r.ok || r.type === "opaque")) c.put(key || req, r.clone()); return r; }).catch(() => null);
  return hit || (await net) || Response.error();
}));

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    if (LIBS.includes(url.hostname)) swr(e, req);               /* Firestore, analytics, etc. are not touched */
    return;
  }
  if (/\/(images|icons)\//.test(url.pathname)) { swr(e, req, keyOf(req)); return; }   /* pictures: instant, updated in background */
  /* the page itself: newest version first, saved copy when offline */
  e.respondWith(fetch(req).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(keyOf(req), copy)); }
    return res;
  }).catch(async () => (await caches.match(keyOf(req))) || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())));
});
