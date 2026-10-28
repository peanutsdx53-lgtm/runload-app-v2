// RunLoad UI Next: only publicly served static resources are cached.
// Network-first prevents installed devices from being pinned to outdated UI files.
const CACHE="runload-ui-next-shell-20261028-data-management-v1";
const BASE=new URL("./",self.location.href);
const ASSETS=["./","./index.html","./styles.css","./app.js","./app.js?v=20261028-data-management-v1","./pwa.js","./assets/bodyRegionVisuals.js","./ui/homeDashboardLayout.js","./ui/homeDashboardDrag.js","./ui/homeExperience.js","./ui/homeExperience.css","./ui/recordExperience.js","./ui/recordExperience.js?v=20261027-manual-gait-v5","./ui/coursePresetStore.js","./ui/simulationExperience.js","./ui/gpsCourseEvidence.js","./ui/gpxImport.js","./ui/simulationExperience.css","./ui/recordExperience.css","./ui/recordExperience.css?v=20261027-manual-gait-v5","./ui/gaitExperience.js","./ui/gaitExperience.css","./ui/environmentExperience.js","./ui/environmentExperience.css","./ui/bodyContextExperience.js","./ui/bodyContextExperience.css","./ui/resultExperience.js","./ui/resultExperience.js?v=20261028-back-symmetry-v2","./ui/bodyReferencePresentation.js","./ui/resultExperience.css","./ui/resultInlineStyles.js","./ui/historyExperience.js","./ui/historyExperience.css","./ui/historyInlineStyles.js","./ui/settingsExperience.js","./ui/settingsExperience.js?v=20261028-data-management-v1","./ui/settingsExperience.css","./ui/dataManagement.js","./ui/dataManagement.js?v=20261028-data-management-v1","./ui/dataManagementUi.js","./ui/dataManagementUi.js?v=20261028-data-management-v1","./ui/dataManagement.css","./ui/dataManagement.css?v=20261028-data-management-v1","./ui/firstUseExperience.js","./ui/firstUseExperience.js?v=20261028-first-use-v1","./ui/legalDocuments.js","./ui/legalDocuments.js?v=20261028-first-use-v1","./ui/firstUseExperience.css","./ui/firstUseExperience.css?v=20261028-first-use-v1","./ui/consultationExperience.js","./ui/consultationExperience.js?v=20261028-consultation-header-v1","./ui/consultationExperience.css","./ui/consultationExperience.css?v=20261028-consultation-no-install-v1","./ui/explorationExperience.js","./ui/explorationReadAdapter.js","./ui/interpretationExperience.css","./ui/interpretationView.js","./ui/interpretationRules.js","./ui/actionIntentStore.js","./ui/manualRunStore.js","./ui/manualRunStore.js?v=20261027-manual-gait-v5","./ui/conditionJourney.js","./ui/conditionInsights.js","./ui/conditionJourney.css","./ui/explorationExperience.css","./ui/mobileInputFocus.css","./ui/recordReviewExperience.js","./ui/recordReviewExperience.js?v=20261027-manual-gait-v5","./ui/recordReviewExperience.css","./ui/recordReviewExperience.css?v=20261027-manual-gait-v5","./ui/rofExperience.js","./ui/rofExperience.css","./ui/measurementExperience.js","./ui/measurementExperience.js?v=20261027-measurement-polish-v2","./ui/gpsLiveMap.js","./ui/gpsLiveMap.js?v=20261027-measurement-polish-v2","./ui/gpsMeasurementCore.js","./ui/gpsMeasurementCore.js?v=20261027-measurement-polish-v2","./ui/gpsMeasurementStore.js","./ui/gpsIndexedDbStore.js","./ui/gpsReplayIndexedDbStore.js","./ui/gpsReplayReference.js","./ui/gpsMeasurementEnergy.js","./ui/gpsEnergyDisplay.js","./ui/gpsDynamicResult.js","./ui/gpsDynamicResult.js?v=20261028-back-symmetry-v2","./ui/gpsDynamicResult.css","./ui/gpsReplayIndexedDbStore.js?v=20261027-measurement-polish-v2","./ui/gpsDynamicResult.js?v=20261027-measurement-polish-v2","./ui/gpsDynamicResult.css?v=20261028-gps-overflow-v1","./ui/gpsStorageHealth.js","./ui/measurementExperience.css","./ui/measurementExperience.css?v=20261027-gps-prestart-v3","./ui/rofJScale.js","./assets/rof/rof-visual-lowest.png","./assets/rof/rof-visual-low.png","./assets/rof/rof-visual-moderate.png","./assets/rof/rof-visual-high.png","./assets/rof/rof-visual-highest.png","./ui/recordDraftReview.js","./core/activity/activityReference.js","./core/activity/running.js","./core/activity/jogging.js","./core/activity/walking.js","./core/runningEvidence/runningEvidenceProductBridge.js","./core/runningEvidence/runningEvidenceEngine.js","./core/runningEvidence/runningEvidenceRegistry.js","./core/internal/mobileWalkJogSpeedModel.js","./manifest.webmanifest","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"];
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
 const approvedRof=url.origin==="https://raw.githubusercontent.com"&&/^\/peanutsdx53-lgtm\/runload-app\/main\/assets\/rof\/rof-visual-(lowest|low|moderate|high|highest)\.png$/.test(url.pathname);
 if(approvedRof){
  event.respondWith((async()=>{
   const cache=await caches.open(CACHE);
   try{
    const response=await fetch(req);
    if(response.ok||response.type==="opaque")await cache.put(req,response.clone());
    return response;
   }catch{return await cache.match(req)||Response.error()}
  })());
  return;
 }
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE.pathname))return;
 event.respondWith((async()=>{
  try{
   const response=await fetch(new Request(req,{cache:"no-cache"}));
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