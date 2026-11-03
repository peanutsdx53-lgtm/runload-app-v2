// RunLoad UI Next: only publicly served static resources are cached.
// Network-first prevents installed devices from being pinned to outdated UI files.
const CACHE="runload-ui-next-shell-20261103-authorized-cleanup-v1";
const BASE=new URL("./",self.location.href);
const ASSETS=["./","./index.html","./styles.css","./app.js","./app.js?v=20261102-uiux-batch06-v2","./pwa.js","./assets/bodyRegionVisuals.js","./ui/homeDashboardLayout.js","./ui/homeDashboardDrag.js","./ui/homeExperience.js","./ui/homeExperience.css","./ui/homeExperience.css?v=20261101-s02-detail-colors-v4","./ui/recordExperience.js","./ui/recordExperience.js?v=20261102-s05s08-copy-v1","./ui/coursePresetStore.js","./ui/simulationExperience.js","./ui/simulationExperience.js?v=20261102-uiux-batch06-v1","./ui/gpsCourseEvidence.js","./ui/gpxImport.js","./ui/simulationExperience.css","./ui/simulationExperience.css?v=20261102-uiux-batch06-v2","./ui/recordExperience.css","./ui/recordExperience.css?v=20261102-s05-mobile-rail-v2","./ui/gaitExperience.js","./ui/gaitExperience.js?v=20261101-manual-dedup-v1","./ui/gaitExperience.css","./ui/environmentExperience.js","./ui/environmentExperience.css","./ui/bodyContextExperience.js","./ui/bodyContextExperience.js?v=20261101-uiux-s05s07s09-v4","./ui/bodyContextExperience.css","./ui/bodyContextExperience.css?v=20261101-uiux-s05s07s09-v2","./ui/resultExperience.js","./ui/resultExperience.js?v=20261102-uiux-batch06-v1","./ui/referenceEvidenceInfo.js","./ui/bodyReferencePresentation.js","./ui/resultExperience.css","./ui/resultInlineStyles.js","./ui/resultInlineStyles.js?v=20261102-result-state-v1","./ui/historyExperience.js","./ui/historyExperience.js?v=20261102-uiux-batch03-v1","./ui/historyExperience.css","./ui/historyInlineStyles.js","./ui/settingsExperience.js","./ui/settingsExperience.js?v=20261028-data-management-v1","./ui/settingsExperience.css","./ui/dataManagement.js","./ui/dataManagement.js?v=20261028-data-management-v1","./ui/dataManagementUi.js","./ui/dataManagementUi.js?v=20261102-uiux-batch05-v1","./ui/dataManagement.css","./ui/dataManagement.css?v=20261028-data-management-v1","./ui/firstUseExperience.js","./ui/firstUseExperience.js?v=20261028-first-use-v1","./ui/legalDocuments.js","./ui/legalDocuments.js?v=20261028-first-use-v1","./ui/firstUseExperience.css","./ui/firstUseExperience.css?v=20261028-first-use-v1","./ui/consultationExperience.js","./ui/consultationExperience.js?v=20261102-uiux-batch05-v1","./ui/consultationExperience.css","./ui/consultationExperience.css?v=20261028-print-integrity-v1","./ui/explorationExperience.js","./ui/explorationExperience.js?v=20261102-uiux-batch04-v1","./ui/explorationTopicGuides.js","./ui/explorationTopicView.js","./ui/explorationReadAdapter.js","./ui/interpretationExperience.css","./ui/interpretationView.js","./ui/interpretationRules.js","./ui/actionIntentStore.js","./ui/restDayStore.js","./ui/manualRunStore.js","./ui/manualRunLock.js","./ui/manualRunCanonical.js","./ui/runReflection.js","./ui/regionReferenceComparison.js","./ui/noteRunLink.js","./ui/runQuestionContinuation.js","./ui/manualRunStore.js?v=20261030-rof-evidence-v2","./ui/conditionJourney.js","./ui/conditionInsights.js","./ui/conditionJourney.css","./ui/conditionJourney.css?v=20261102-uiux-batch04-select-v1","./ui/explorationExperience.css","./ui/explorationExperience.css?v=20261102-uiux-batch04-v1","./ui/mobileInputFocus.css","./ui/recordIcons.js","./ui/recordIcons.js?v=20261101-review-density-v1","./ui/recordReviewExperience.js","./ui/recordReviewExperience.js?v=20261102-s05s08-copy-v1","./ui/recordReviewExperience.css","./ui/recordReviewExperience.css?v=20261101-review-density-v1","./ui/rofExperience.js","./ui/rofExperience.js?v=20261102-s05s08-copy-v1","./ui/rofExperience.css","./ui/rofExperience.css?v=20261101-illustration-help-v2","./ui/gpsPlatform.js","./ui/gpsPlatform.js?v=20261101-gps-mobile-v1","./ui/measurementExperience.js","./ui/measurementExperience.js?v=20261102-uiux-batch06-v2","./ui/gpsLiveMap.js","./ui/gpsLiveMap.js?v=20261027-measurement-polish-v2","./ui/gpsMeasurementCore.js","./ui/gpsMeasurementCore.js?v=20261027-measurement-polish-v2","./ui/gpsMeasurementStore.js","./ui/gpsIndexedDbStore.js","./ui/gpsReplayIndexedDbStore.js","./ui/gpsReplayReference.js","./ui/gpsMeasurementEnergy.js","./ui/gpsEnergyDisplay.js","./ui/gpsDynamicResult.js","./ui/gpsDynamicResult.js?v=20261028-back-symmetry-v2","./ui/gpsDynamicResult.css","./ui/gpsReplayIndexedDbStore.js?v=20261027-measurement-polish-v2","./ui/gpsDynamicResult.css?v=20261028-gps-overflow-v1","./ui/gpsStorageHealth.js","./ui/measurementExperience.css","./ui/measurementExperience.css?v=20261101-gps-mobile-v1","./ui/rofJScale.js","./assets/rof/rof-visual-lowest.png","./assets/rof/rof-visual-low.png","./assets/rof/rof-visual-moderate.png","./assets/rof/rof-visual-high.png","./assets/rof/rof-visual-highest.png","./ui/recordDraftReview.js","./core/activity/activityReference.js","./core/activity/running.js","./core/activity/jogging.js","./core/activity/walking.js","./core/runningEvidence/runningEvidenceProductBridge.js","./core/runningEvidence/runningEvidenceEngine.js","./core/runningEvidence/runningEvidenceRegistry.js","./core/internal/mobileWalkJogSpeedModel.js","./manifest.webmanifest","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png","./ui/homeExperience.js?v=20261103-real-data-only-v1","./ui/coursePresetStore.js?v=20261026-courses-v30","./ui/environmentExperience.js?v=20261026-user-copy-v21","./ui/gpsIndexedDbStore.js?v=20261027-gps-backup-v39","./ui/gpsStorageHealth.js?v=20261027-gps-storage-v40","./ui/firstUseExperience.js?v=20261028-optional-guide-v2","./ui/interpretationView.js?v=20261026-interpret-v14","./ui/interpretationRules.js?v=20261026-interpret-v14","./ui/actionIntentStore.js?v=20261026-interpret-v14","./ui/conditionJourney.js?v=20261026-condition-v15","./ui/conditionInsights.js?v=20261026-condition-v15","./manifest.webmanifest?v=20261026-user-copy-v21","./styles.css?v=20261026-result-chrome-v20","./ui/settingsExperience.css?v=20261025-settings-surface-05","./ui/interpretationExperience.css?v=20261026-interpret-v14","./ui/mobileInputFocus.css?v=20261026-ios-input-v25","./pwa.js?v=20261026-user-copy-v21"];
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