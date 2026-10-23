// RunLoad UI Next: only publicly served static resources are cached.
// Network-first prevents installed devices from being pinned to outdated UI files.
const CACHE="runload-ui-next-shell-2026-10-23-home-drag-02";
const BASE=new URL("./",self.location.href);
const ASSETS=["./","./index.html","./styles.css","./app.js","./pwa.js","./assets/bodyRegionVisuals.js","./ui/homeDashboardLayout.js","./ui/homeDashboardDrag.js","./manifest.webmanifest","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"];
const shellURL=new URL("./index.html",BASE).href;
self.addEventListener("install",event=>event.waitUntil(
 caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(name=>new URL(name,BASE).href))).then(()=>self.skipWaiting())
));
self.addEventListener("activate",event=>event.waitUntil(Promise.all([
 caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("runload-ui-next-")&&k!==CACHE).map(k=>caches.delete(k)))),
 self.clients.claim()
])));
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE.pathname))return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(req);
   if(response.ok){
    const copy=response.clone();
    const cache=await caches.open(CACHE);
    await cache.put(req.mode==="navigate"?shellURL:req,copy);
   }
   return response;
  }catch{
   const cached=await caches.match(req.mode==="navigate"?shellURL:req);
   return cached||Response.error();
  }
 })());
});
