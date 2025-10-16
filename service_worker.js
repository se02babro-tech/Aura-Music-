// service-worker.js

// 1. Versione della Cache - CAMBIA QUESTO NUMERO AD OGNI AGGIORNAMENTO DEI FILE
const CACHE_VERSION = 'aura-cache-v1.0'; 
const CACHE_NAME = CACHE_VERSION;

// Lista dei file essenziali per l'interfaccia (App Shell)
// Questi file verranno memorizzati durante l'installazione.
const URLS_TO_CACHE = [
    '/', // L'URL radice (index.html)
    'index.html',
    'manifest.json',
    'service-worker.js',
    // DIPENDENZE ESTERNE ESSENZIALI (CDN)
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/lucide@latest',
    'https://cdnjs.cloudflare.com/ajax/libs/howler/2.2.3/howler.min.js' 
    // NOTA: I file audio, immagini e manifest esterni (tracks.json, User_videos.json)
    // non vengono cachati qui, ma possono essere aggiunti on-demand se necessario.
];


// =================================================================
// 2. Evento 'install': Apertura e memorizzazione della Cache Statica
// =================================================================
self.addEventListener('install', (event) => {
    console.log('SW: Installazione. Apertura cache statica...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('SW: Pre-caching file di App Shell');
                // Aggiunge tutti i file essenziali alla cache.
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('SW: Errore nel pre-caching:', error);
            })
    );
});


// =================================================================
// 3. Evento 'activate': Pulizia delle vecchie cache
// =================================================================
self.addEventListener('activate', (event) => {
    console.log('SW: Attivazione. Pulizia vecchie cache...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Elimina tutte le cache che NON corrispondono al nome corrente
                    if (cacheName !== CACHE_NAME) {
                        console.log('SW: Eliminazione cache obsoleta:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});


// =================================================================
// 4. Evento 'fetch': Strategia di Caching (Cache-First)
// =================================================================
self.addEventListener('fetch', (event) => {
    // Escludiamo le chiamate ai manifest JSON esterni (per averli sempre aggiornati)
    // e i video (che possono essere molto pesanti).
    if (event.request.url.includes('tracks.json') || 
        event.request.url.includes('User_videos.json') || 
        event.request.destination === 'video') {
        
        // Network-only per file remoti e contenuti dinamici
        return event.respondWith(fetch(event.request));
    }

    // Strategia Cache-First per tutti gli altri file (App Shell, CSS, JS)
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Se c'è una risposta in cache, la usiamo immediatamente
                if (response) {
                    return response;
                }
                
                // Altrimenti, andiamo in rete e, se troviamo qualcosa, lo mettiamo in cache
                return fetch(event.request).then(
                    (response) => {
                        // Verifica se la risposta è valida (es. HTTP 200, non opaca, ecc.)
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone la risposta perché il body può essere letto solo una volta
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                        return response;
                    }
                );
            })
    );
});
