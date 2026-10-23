// RunLoad UI Next — app shell only; no personal records are cached.
const CACHE="runload-ui-next-shell-2026-10-23-03";
const BASE=new URL("./",self.location.href);
const ASSETS=["./","./index.html","./styles.css","./app.js","./pwa.js","./assets/bodyRegionVisuals.js","./manifest.webmanifest","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(p=>new URL(p,BASE).href))).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("runload-ui-next-")&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE.pathname))return;
 if(req.mode==="navigate"){event.respondWith(fetch(req).then(res=>{if(res.ok){const c=res.clone();caches.open(CACHE).then(cache=>cache.put(new URL("./index.html",BASE),c))}return res}).catch(async()=>await caches.match(new URL("./index.html",BASE))||Response.error()));return}
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(req,copy))}return res})));
});
