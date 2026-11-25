const CACHE="mtl-v26-collapsed-set-entries";
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/cutphase-comic-v18.webp","./assets/cutphase-v19/monday-clock.webp","./assets/cutphase-v19/tuesday-clock.webp","./assets/cutphase-v19/wednesday-clock.webp","./assets/cutphase-v19/thursday-clock.webp","./assets/cutphase-v19/friday-clock.webp","./assets/cutphase-v19/weekend-clock.webp"];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(async cache=>{
    // Do not install a login page as the offline application.
    for(const path of ASSETS){
      const response=await fetch(path,{credentials:"same-origin",cache:"reload"});
      if(!response.ok||response.headers.get("Content-Security-Policy")?.includes("form-action 'self'"))throw new Error("Sign in before installing Cut Phase");
      await cache.put(path,response);
    }
  }));
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).pathname.startsWith("/__cutphase/"))return;
  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          if(response.ok && response.headers.get('Content-Type')?.includes('text/html') && !response.headers.get('Content-Security-Policy')?.includes("form-action 'self'")) caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          else if(response.ok && !response.headers.get('Content-Type')?.includes('text/html')) caches.open(CACHE).then(cache=>cache.put(event.request,copy));
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
        if(response.ok && response.headers.get('Content-Type')?.includes('text/html') && !response.headers.get('Content-Security-Policy')?.includes("form-action 'self'")) caches.open(CACHE).then(cache=>cache.put(event.request,copy));
          else if(response.ok && !response.headers.get('Content-Type')?.includes('text/html')) caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request))
  );
});