const CACHE="mtl-v19-cinematic-wides";
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/cutphase-v19/monday-clock.webp","./assets/cutphase-v19/monday-finish.webp","./assets/cutphase-v19/tuesday-clock.webp","./assets/cutphase-v19/tuesday-finish.webp","./assets/cutphase-v19/wednesday-clock.webp","./assets/cutphase-v19/wednesday-finish.webp","./assets/cutphase-v19/thursday-clock.webp","./assets/cutphase-v19/thursday-finish.webp","./assets/cutphase-v19/friday-clock.webp","./assets/cutphase-v19/friday-finish.webp","./assets/cutphase-v19/weekend-clock.webp","./assets/cutphase-v19/weekend-finish.webp"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          return response;
        })
        .catch(()=>caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});