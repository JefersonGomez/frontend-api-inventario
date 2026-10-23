// Service worker (8A): la app abre sin internet. No toca la API: solo la página y sus archivos.
// - Páginas: primero la red (cada despliegue se ve de inmediato); sin red, la copia guardada de index.html.
// - /assets (llevan hash, nunca cambian) y las fuentes de Google: primero la copia; si no está, la red y se guarda.
const CACHE = "stockly-v1"

// Al instalarse guarda index.html y los archivos que carga, para que el primer arranque sin red ya funcione
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const html = await (await fetch("/index.html", { cache: "no-store" })).text()
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
      await cache.addAll(["/index.html", "/manifest.webmanifest", "/favicon.svg", ...assets])
      await self.skipWaiting()
    })()
  )
})

// Borra cachés de versiones anteriores y toma el control de las pestañas abiertas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })()
  )
})

const isFont = (url) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  const url = new URL(request.url)

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put("/index.html", copy))
          }
          return res
        })
        .catch(async () => (await caches.match("/index.html")) ?? Response.error())
    )
    return
  }

  const sameOriginStatic = url.origin === self.location.origin && (url.pathname.startsWith("/assets/") || /^\/[^/]+\.(svg|png|webmanifest)$/.test(url.pathname))
  if (sameOriginStatic || isFont(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((res) => {
            if (res.ok || res.type === "opaque") {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(request, copy))
            }
            return res
          })
      )
    )
  }
  // todo lo demás (la API, socket.io) va directo a la red, sin pasar por la caché
})
