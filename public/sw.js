/* DúoFinanzas · service worker (PWA).
 * - Solo GET del mismo origen y dentro del scope. NUNCA toca peticiones a Supabase ni a otras
 *   APIs (otro origen): los datos financieros no se guardan en caché.
 * - /_next/static e iconos: cache-first (archivos con hash, inmutables).
 * - Páginas (HTML estático, sin datos): network-first con respaldo offline.
 * La versión llega en ?v= al registrarse: cada despliegue crea una caché nueva y borra la anterior.
 */
const VERSION = new URL(self.location.href).searchParams.get("v") || "dev";
const CACHE = `duofinanzas-${VERSION}`;
const SCOPE = new URL(self.registration.scope).pathname; // p. ej. "/duofinanzas/"

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add(SCOPE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("duofinanzas-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheable(res) {
  return res && res.ok && res.type === "basic";
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (cacheable(res)) (await caches.open(CACHE)).put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (cacheable(res)) (await caches.open(CACHE)).put(req, res.clone());
    return res;
  } catch {
    return (await caches.match(req, { ignoreSearch: true })) || (await caches.match(SCOPE)) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return;
  if (url.pathname.endsWith("/sw.js")) return;

  if (url.pathname.startsWith(`${SCOPE}_next/static/`) || url.pathname.startsWith(`${SCOPE}icons/`)) {
    event.respondWith(cacheFirst(req));
  } else if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
  }
});
