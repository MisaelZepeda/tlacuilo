// Service worker de Tlacuilo: la app funciona sin conexión con la versión instalada
// y avisa cuando hay una nueva (SKIP_WAITING desde la app).
const CACHE_NAME = 'tlacuilo-cache-v4'; // v4: fase 3: registros

const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './logo.svg',
    './icon-192x192.png',
    './icon-512x512.png',
    './apple-touch-icon.png',
    './css/base.css',
    './css/components.css',
    './css/tokens.css',
    './css/views.css',
    './js/app.js',
    './js/components/capas.js',
    './js/components/evento-form.js',
    './js/components/piezas.js',
    './js/components/tarea-form.js',
    './js/components/teco.js',
    './js/core/actions.js',
    './js/core/db.js',
    './js/core/eventos.js',
    './js/core/router.js',
    './js/core/store.js',
    './js/domain/calendario.js',
    './js/domain/fechas.js',
    './js/domain/finanzas.js',
    './js/domain/morralla/calendario.js',
    './js/domain/morralla/fechas.js',
    './js/domain/morralla/msi.js',
    './js/domain/morralla/recurrentes.js',
    './js/domain/morralla/tarjetas.js',
    './js/domain/morralla/terceros.js',
    './js/domain/notas.js',
    './js/domain/tareas.js',
    './js/domain/teco.js',
    './js/firebase-init.js',
    './js/lib/apariencia.js',
    './js/lib/demo-data.js',
    './js/lib/dictado.js',
    './js/lib/format.js',
    './js/lib/icons.js',
    './js/views/acceso.js',
    './js/views/ajustes.js',
    './js/views/calendario.js',
    './js/views/hoy.js',
    './js/views/pendientes.js',
    './js/views/registro.js',
    './js/views/registros.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache =>
        cache.addAll(urlsToCache.map(url => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(nombres => Promise.all(nombres.filter(n => n.startsWith('tlacuilo-') && n !== CACHE_NAME).map(n => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    // Firebase (datos y sesión) siempre va directo a la red.
    if (/firebaseio\.com|googleapis\.com\/identitytoolkit|securetoken|workers\.dev/.test(url.href)) return;

    // Archivos de la app: de la versión instalada; las actualizaciones llegan con un service worker nuevo.
    if (url.origin === self.location.origin && url.pathname.startsWith(new URL(self.registration.scope).pathname)) {
        event.respondWith(
            caches.match(req, { ignoreSearch: true }).then(enCache => enCache || fetch(req).then(resp => {
                if (resp.ok) { const copia = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copia)); }
                return resp;
            }))
        );
        return;
    }
    if (url.origin === self.location.origin) return;   // otras apps del mismo sitio (Morralla)

    // Librerías externas (Firebase, fuentes): rápido desde caché y se refrescan en segundo plano.
    event.respondWith(
        caches.match(req).then(enCache => {
            const red = fetch(req).then(resp => {
                if (resp.ok || resp.type === 'opaque') { const copia = resp.clone(); caches.open(CACHE_NAME).then(c => c.put(req, copia)); }
                return resp;
            }).catch(() => enCache);
            return enCache || red;
        })
    );
});
