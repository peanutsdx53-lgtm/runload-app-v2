(async function appMain(){
  "use strict";
  const {BODY_REGION_VIEWS}=await import("./assets/bodyRegionVisuals.js");
  const dashboardPrefs=await import("./ui/homeDashboardLayout.js");
  const dashboardDrag=await import("./ui/homeDashboardDrag.js");
  const homeExperience=await import("./ui/homeExperience.js?v=20261028-reflection-ux-v1");
  const rofScale=await import("./ui/rofJScale.js");
  const rofExperience=await import("./ui/rofExperience.js?v=20261026-user-copy-v21");
  const reviewDraft=await import("./ui/recordDraftReview.js");
  const recordReviewExperience=await import("./ui/recordReviewExperience.js?v=20261027-manual-gait-v5");
  const manualRunStore=await import("./ui/manualRunStore.js?v=20261027-manual-gait-v5");
  const recordExperience=await import("./ui/recordExperience.js?v=20261027-manual-gait-v5");
  const coursePresets=await import("./ui/coursePresetStore.js?v=20261026-courses-v30");
  const simulationExperience=await import("./ui/simulationExperience.js?v=20261027-scope-close-v46");
  const gaitExperience=await import("./ui/gaitExperience.js?v=20261027-scope-close-v46");
  const environmentExperience=await import("./ui/environmentExperience.js?v=20261026-user-copy-v21");
  const bodyExperience=await import("./ui/bodyContextExperience.js?v=20261026-user-copy-v21");
  const measurementExperience=await import("./ui/measurementExperience.js?v=20261027-measurement-polish-v2");
  const gpsCore=await import("./ui/gpsMeasurementCore.js?v=20261027-measurement-polish-v2");
  const gpsStore=await import("./ui/gpsIndexedDbStore.js?v=20261027-gps-backup-v39");
  const gpsV2=await import("./ui/gpsReplayIndexedDbStore.js?v=20261027-measurement-polish-v2");
  const gpsDynamic=await import("./ui/gpsDynamicResult.js?v=20261028-back-symmetry-v2");
  const gpsStorageHealth=await import("./ui/gpsStorageHealth.js?v=20261027-gps-storage-v40");
  const resultExperience=await import("./ui/resultExperience.js?v=20261029-image-provenance-v1");
  const historyExperience=await import("./ui/historyExperience.js?v=20261026-history-focus-v26");
  const settingsExperience=await import("./ui/settingsExperience.js?v=20261028-data-management-v1");
  const dataManagement=await import("./ui/dataManagement.js?v=20261028-data-management-v1");
  const dataManagementUi=await import("./ui/dataManagementUi.js?v=20261028-data-management-v1");
  const firstUseExperience=await import("./ui/firstUseExperience.js?v=20261028-optional-guide-v2");
  const legalDocuments=await import("./ui/legalDocuments.js?v=20261028-first-use-v1");
  const consultationExperience=await import("./ui/consultationExperience.js?v=20261028-print-integrity-v1");
  const explorationExperience=await import("./ui/explorationExperience.js?v=20261028-life-separation-v1");
  const interpretationExperience=await import("./ui/interpretationView.js?v=20261026-interpret-v14");
  const interpretationRules=await import("./ui/interpretationRules.js?v=20261026-interpret-v14");
  const actionIntentStore=await import("./ui/actionIntentStore.js?v=20261026-interpret-v14");
  const conditionJourney=await import("./ui/conditionJourney.js?v=20261026-condition-v15");
  const conditionInsights=await import("./ui/conditionInsights.js?v=20261026-condition-v15");
  await gpsStore.initializeGpsStore(); // Failure appears in GPS history; other app features remain available.
  let gpsV2Cache=await gpsV2.readGpsV2Summaries();
  const app=document.querySelector("#app");
  const esc=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const CATEGORIES=[
    {id:"01",name:"走りの記録",color:"#2579dc",tint:"#e8f3ff",icon:"◷",topics:["距離・時間・ペース","自分が感じた疲れ","過去の走りとの比較","気付きと次の確認"]},
    {id:"02",name:"身体のしくみ",color:"#db8c28",tint:"#fff2df",icon:"◉",topics:["足・膝・股関節","姿勢と走る動作","体幹と腕の動き","12部位の参考値の見方"]},
    {id:"03",name:"コースと環境",color:"#16996f",tint:"#e2f9ec",icon:"△",topics:["上り坂・下り坂","路面","気温・天候","屋外・室内"]},
    {id:"04",name:"疲れと回復",color:"#b448d1",tint:"#f8e9ff",icon:"♡",topics:["疲れの感じ方","筋肉痛・違和感","休養と回復","疲れを考える視点"]},
    {id:"05",name:"暮らしと気持ち",color:"#129b9f",tint:"#e2fbf6",icon:"✦",topics:["睡眠","食事・水分","気分・ストレス","日々のコンディション"]},
    {id:"06",name:"走る前後の工夫",color:"#7658dc",tint:"#efebff",icon:"✳",topics:["ウォームアップ","走行中の対応","クールダウン・ストレッチ","無理をしない判断"]},
    {id:"07",name:"目的と楽しみ方",color:"#d44a86",tint:"#ffeaf2",icon:"⚑",topics:["走る目的","目標との付き合い方","楽しみ方","自分に合う記録の使い方"]}
  ];
  const REGIONS=[
    {id:"BA-DISP-014",name:"股関節部",friendly:"股関節部",value:101.7,prev:100.2},
    {id:"BA-DISP-015",name:"殿部",friendly:"殿部",value:103.2,prev:101.0},
    {id:"BA-DISP-016",name:"大腿前面",friendly:"大腿前面",value:107.4,prev:105.2},
    {id:"BA-DISP-018",name:"大腿後面",friendly:"大腿後面",value:98.8,prev:100.1},
    {id:"BA-DISP-019",name:"膝蓋大腿関節部",friendly:"膝蓋大腿関節部",value:96.7,prev:99.0},
    {id:"BA-DISP-021",name:"脛骨部",friendly:"脛骨部",value:100.8,prev:99.4},
    {id:"BA-DISP-023",name:"下腿後面",friendly:"下腿後面",value:112.4,prev:108.2},
    {id:"BA-DISP-024",name:"足関節部",friendly:"足関節部",value:100.1,prev:100.6},
    {id:"BA-DISP-025",name:"アキレス腱部",friendly:"アキレス腱部",value:99.5,prev:100.7},
    {id:"BA-DISP-027",name:"後足部",friendly:"後足部",value:95.2,prev:94.1},
    {id:"BA-DISP-028",name:"足底中部・内側縦足弓",friendly:"足底中部・内側縦足弓",value:null,prev:null},
    {id:"BA-DISP-029",name:"前足部",friendly:"前足部",value:106.3,prev:104.4}
  ];
  const state={region:"BA-DISP-023",resultMode:"all",mobileRegionsExpanded:false,mode:"today",category:"03",topic:"上り坂・下り坂",recordType:"run",feeling:"",recordDraft:{distance:"",hours:"",minutes:"",seconds:"",date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),memo:"",rofBefore:null,rofAfter:null,steps:"",stepsProvenance:"UNKNOWN",activityGait:"UNKNOWN",runningFormat:"UNKNOWN",runWalkRunningDistanceKm:"",runWalkRunningDurationMinutes:"",courseName:"",gradeMode:"UNKNOWN",upPercent:"",downPercent:"",upGradePercent:"",downGradePercent:"",surfaceMode:"UNKNOWN",primarySurface:"",temperatureC:"",environmentNote:"",bodyObservation:"",shoeName:"",...Object.fromEntries(Array.from({length:5},(_,i)=>[[`sectionShare${i}`,""],[`sectionDirection${i}`,"FLAT"],[`sectionGrade${i}`,""],[`sectionSurface${i}`,"UNKNOWN"]]).flat()),...Object.fromEntries(["paved","track","treadmill","soil","trail","naturalGrass","artificialTurf","sand"].map(k=>[`surface${k}`,""]))},recordPreviewOpen:false,recordReviewSource:"manual",recordReviewReturn:false,recordOpenSections:[],rofEditorOpen:false,treeZoom:1,treeScroll:null,historyMode:"all",historyDate:null,toast:"",sheetVisible:false,sheetExpanded:false};
  state.recordCourseUi=recordExperience.initialCourseUi(state.recordDraft);
  const homePreferenceStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const homePreferenceState=dashboardPrefs.loadHomeDashboardLayout(homePreferenceStorage);
  const homeEditState={editing:false,draft:null,notice:""};
  const homeUi={preview:false,conditionOpen:false,achievementOpen:false,conditionDate:homeExperience.todayLocal()};
  let gpsController=null;
  let dynamicPlayback=null;
  let gpsTicker=null;
  let gpsWakeLock=null,gpsWakeLockGeneration=0;
  const releaseGpsWakeLock=()=>{
    // Invalidate pending lock requests, including rapid pause/resume cycles.
    gpsWakeLockGeneration++;
    const lock=gpsWakeLock;gpsWakeLock=null;
    if(lock)Promise.resolve().then(()=>lock.release()).catch(()=>{});
  };
  const requestGpsWakeLock=async()=>{
    const gps=gpsController,generation=gpsWakeLockGeneration;
    if(!gps?.state.keepScreenAwake||gps.state.phase!=='running'||document.hidden||gpsWakeLock)return;
    if(typeof navigator.wakeLock?.request!=='function'){
      gps.state.notice='この端末は画面の点灯保持に対応していません。GPS計測は続きます。';
      measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gps.state,gps.elapsed());return;
    }
    try{
      const lock=await navigator.wakeLock.request('screen');
      if(gpsWakeLockGeneration!==generation||gpsController!==gps||gps.state.phase!=='running'||document.hidden||gpsWakeLock){await lock.release();return;}
      gpsWakeLock=lock;
      lock.addEventListener?.('release',()=>{if(gpsWakeLock===lock)gpsWakeLock=null;});
    }catch{
      if(gpsController===gps&&gps.state.phase==='running'){
        gps.state.notice='画面の点灯保持を利用できませんでした。GPS計測は続きます。';
        measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gps.state,gps.elapsed());
      }
    }
  };
  let pendingGpsDelete="";
  let pendingGpsBackup=null,gpsBackupNotice="";
  let pendingGpsV2Backup=null,gpsV2BackupNotice="";
  let gpsCapacity=null,gpsCapacityNotice="";
  // GPS access needs a fresh, app-level affirmative choice on every start/resume.
  // Browser OS permission persistence is not equivalent to session consent.
  let gpsConsentAction="";
  const ensureGps=()=>{
    if(!gpsController)gpsController=gpsCore.createGpsSession({
      geo:(()=>{try{return navigator.geolocation}catch{return null}})(),
      onChange:current=>{
        measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),current,gpsController?.elapsed()||0);
        if(current.phase!=='running'){
          refreshGpsTicker();releaseGpsWakeLock();
          if(app.querySelector('[data-gps-live-page]')?.dataset.phase!==current.phase&&currentPage()==='measurement')render();
        }
      }
    });
    return gpsController;
  };
  function refreshGpsTicker(){
    if(gpsTicker!==null){clearInterval(gpsTicker);gpsTicker=null;}
    if(gpsController?.state.phase==='running'&&currentPage()==='measurement')gpsTicker=setInterval(()=>{
      if(currentPage()!=='measurement'){clearInterval(gpsTicker);gpsTicker=null;return;}
      gpsController.checkGoal();measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gpsController.state,gpsController.elapsed());
    },1000);
  }
  const simulationUi=simulationExperience.newSimulationUi();
  const historyUi=historyExperience.createHistoryUi();
  let lastExploreRoute=null;
  const explorationUi=explorationExperience.makeUi((()=>{try{return window.localStorage}catch{return null}})());
  // Return keyboard users to the inquiry control that opened a modal, after re-rendering.
  let explorationReturnAction="";
  function restoreExplorationFocus(){
    const action=explorationReturnAction;explorationReturnAction="";
    if(!action)return;
    [...app.querySelectorAll('[data-ex-action]')].find(el=>el.dataset.exAction===action)?.focus();
  }
  const lifeCompareUi={a:"",b:"",open:false,notice:""};
  let manualSaveNotice="";
  let selectedRunId=null;
  const conditionUi={days:30,method:"auto",focus:"all",selected:"",notice:"",scrollLeft:null};
  const environmentUi=environmentExperience.newEnvironmentUi();
  const bodyUi=bodyExperience.makeUi();
  const rofUi=rofExperience.createRofUiState();
  const onboardingKey="runload-v2-introduction-preview-v1";
  const onboardStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const loadIntro=()=>{try{return JSON.parse(onboardStorage?.getItem(onboardingKey)||"null")}catch{return null}};
  const introStored=loadIntro();
  const settingsUi={profile:settingsExperience.loadProfile(onboardStorage,introStored||{}),display:settingsExperience.loadDisplay(onboardStorage),notice:""};
  const dataUi=dataManagementUi.makeDataUi();
  settingsExperience.applyDisplay(settingsUi.display,document.documentElement);
  const hasPriorLegalRecord=(()=>{try{return !!onboardStorage?.getItem(legalDocuments.LEGAL_CONSENT_KEY)}catch{return false}})();
  const needsLegalReconfirmation=!!introStored?.completed&&hasPriorLegalRecord&&!legalDocuments.readLegalConsent(onboardStorage);
  const onboardingState={open:!introStored?.completed||needsLegalReconfirmation,step:needsLegalReconfirmation?1:0,reconsentOnly:needsLegalReconfirmation,replay:false,language:"ja",termsAccepted:false,privacyConfirmed:false,error:"",nickname:settingsUi.profile.nickname,purpose:settingsUi.profile.purpose,heightCm:String(settingsUi.profile.heightCm??""),weightKg:String(settingsUi.profile.weightKg??""),ageBand:settingsUi.profile.ageBand};
  const pageLabels={condition:"コンディションの歩み",home:"ホーム",record:"記録","record-start":"記録を始める","record-review":"記録内容の確認","record-course":"コース・走行条件","record-rof":"運動前後の疲労感","record-more":"追加情報","record-compare":"歩数・走り方","record-reflection":"身体・使用品・メモ","record-environment":"環境",result:"結果","dynamic-result":"動的結果",history:"履歴","exploration-tree":"探究",settings:"設定",measurement:"測定",course:"コース設計",simulation:"シミュレーション",consultation:"相談・共有","body-part-detail":"部位詳細"};
  const desktopNav=[["home","⌂","ホーム"],["record","✎","記録"],["result","▥","結果"],["history","◷","履歴"],["exploration-tree","⚭","探究"],["settings","⚙","設定"]];
  const mobileNav=[["home","⌂","ホーム"],["record-start","✎","記録"],["exploration-tree","⚭","探究"],["history","◷","履歴"],["settings","⚙","設定"]];
  const currentPage=()=>{const raw=location.hash.replace(/^#\/?/,"");const path=raw.split("?")[0];return path==="history"&&raw.includes("life=1")?"condition":pageLabels[path]?path:"home"};
  const navIcon=function navIcon(name){
  const shapes={
   home:'<path d="m3 10 9-7 9 7v11H3z"/><path d="M9 21v-9h6v9"/>',
   record:'<path d="M7 3h10v3H7zM5 6h14v15H5z"/><path d="M9 11h6M9 15h6"/>',
   result:'<rect x="3" y="10" width="4" height="11" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="17" y="12" width="4" height="9" rx="1"/>',
   history:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4.5 3"/>',
   "exploration-tree":'<path d="M4 10c2-5 6-6 8-1 2-5 6-4 8 1-1 5-5 6-8 10-3-4-7-5-8-10z"/><path d="M12 20V10"/>',
   settings:'<circle cx="12" cy="12" r="3"/><path d="m9 2 1 3h4l1-3 4 2-1 3 3 3-1 4 3 1-2 5-3-1-3 2-1 3H9l-1-3-3-2-3 1-2-5 3-1-1-4 3-3-1-3z"/>'
  };
  return `<svg class="nav-svg" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.home}</svg>`;
};
  const navHtml=(items,page,mobile)=>items.map(([path,icon,label])=>`<a class="${mobile?"mobile-link":"side-link"} ${page===path?"is-active":""}" href="#/${path}" ${page===path?'aria-current="page"':""}><span class="nav-icon">${navIcon(path)}</span>${label}</a>`).join("");
  const header=(name,description,right="")=>`<section class="card page-hero"><div><h1>${name}</h1><p class="lead">${description}</p></div>${right}</section>${sheetBody}`;
  const badge=(text,style="")=>`<span class="badge ${style}">${esc(text)}</span>`;
  const buttonLink=(page,text,primary=false)=>`<a class="btn ${primary?"primary":""}" href="#/${page}">${text}<span aria-hidden="true">→</span></a>`;
  const metric=(title,value,unit="")=>`<div class="metric"><label>${title}</label><strong>${value}</strong><em>${unit}</em></div>`;
  const pct=(value)=>value===null?"—":(value>0?"+":"")+value.toFixed(1);
  const valid=(x)=>x!==null&&x!==undefined&&Number.isFinite(x);
  const regionData=(id)=>REGIONS.find(x=>x.id===id)||REGIONS[0];
  const status=(v)=>!valid(v)?"missing":v>110?"above":v<90?"below":"near";
  const stateLabel=(v)=>!valid(v)?"表示なし":v>110?"基準より上":v<90?"基準より下":"基準付近";
  const svgBody=(view)=>{
    const cid="clip-"+view.key;
    const paths=view.paths.map(([id,d])=>{
      const r=regionData(id);
      const selected=state.region===id?" is-selected":"";
      return `<path d="${d}" data-region="${esc(id)}" class="region-path ${status(r.value)}${selected}" role="button" tabindex="0" aria-label="${esc(r.friendly)}の詳細を表示"><title>${esc(r.name)}：${valid(r.value)?r.value.toFixed(1):"未取得"}</title></path>`;
    }).join("");
    return `<figure class="body-view"><figcaption>${esc(view.title)}</figcaption><svg viewBox="70 10 160 430" aria-label="${esc(view.title)}の部位図" role="group"><defs><linearGradient id="body-neutral-${cid}" x1="0" y1="0" x2="1" y2=".65"><stop offset="0" stop-color="#f5f9fb"/><stop offset=".48" stop-color="#dfe9f1"/><stop offset="1" stop-color="#cbdde9"/></linearGradient><clipPath id="${cid}">${view.silhouette}</clipPath></defs><g class="body-silhouette" style="fill:url(#body-neutral-${cid});stroke:#cad9e3;stroke-width:.35">${view.silhouette}</g><g clip-path="url(#${cid})">${paths}</g></svg></figure>`;
  };
  const legend=()=>`<div class="map-legend"><span><i class="dot above"></i>高め（110超）</span><span><i class="dot"></i>基準付近</span><span><i class="dot below"></i>低め（90未満）</span><span><i class="dot missing"></i>未取得</span></div>`;
  const regionTiles=()=>REGIONS.filter(r=>state.resultMode==="all"||!valid(r.value)||Math.abs(r.value-100)>=1).map(r=>{
    const delta=valid(r.value)?r.value-100:null;
    return `<button type="button" class="region-tile ${state.region===r.id?"is-selected":""}" data-region="${r.id}" aria-pressed="${state.region===r.id}"><span class="name">${esc(r.friendly)}</span><span class="value">${valid(r.value)?r.value.toFixed(1):"—"}</span><span class="baseline ${status(r.value)}">${valid(delta)?"基準差 "+pct(delta):"数値なし"}</span></button>`;
  }).join("");
  function regionPictogram(id,value){
 const view=BODY_REGION_VIEWS.find(v=>v.paths.some(p=>p[0]===id));
 if(!view)return `<span class="region-picto-fallback" aria-hidden="true">◍</span>`;
 const found=view.paths.find(p=>p[0]===id);
 const color=status(value)==="above"?"#ed9651":status(value)==="below"?"#65aade":status(value)==="near"?"#6cc4af":"#ced8e1";
 const cropByRegion={
  "BA-DISP-014":"92 128 116 160",
  "BA-DISP-015":"92 155 116 155",
  "BA-DISP-016":"92 207 116 166",
  "BA-DISP-018":"92 207 116 166",
  "BA-DISP-019":"92 260 116 145",
  "BA-DISP-021":"92 278 116 145",
  "BA-DISP-023":"92 278 116 145",
  "BA-DISP-024":"92 305 116 132",
  "BA-DISP-025":"92 305 116 132"
 };
 const crop=view.key==="sole"?"72 65 156 330":cropByRegion[id]||"90 145 120 285";
 return `<svg aria-hidden="true" focusable="false" class="region-picto" viewBox="${crop}"><g fill="#d9e4eb" opacity=".9">${view.silhouette}</g><path d="${found[1]}" fill="${color}" stroke="#fff" stroke-width=".8"/></svg>`;
}
  function mobileRegionRows(){
 const base=REGIONS.filter(r=>state.resultMode==="all"||!valid(r.value)||Math.abs(r.value-100)>=1);
 const preview=[...base].sort((a,b)=>Number(b.id===state.region)-Number(a.id===state.region)||Math.abs((b.value??100)-100)-Math.abs((a.value??100)-100));
 const listing=state.mobileRegionsExpanded?base:preview.slice(0,5);
 return `<div class="mobile-region-list">${listing.map(r=>{
 const v=r.value,d=valid(v)?v-100:null,prev=valid(v)&&valid(r.prev)?v-r.prev:null,active=r.id===state.region;
 return `<button type="button" data-region="${r.id}" aria-pressed="${active}" class="mobile-region-row ${active?"is-selected":""}">
   ${regionPictogram(r.id,v)}
   <span class="mobile-region-name">${esc(r.friendly)}</span>
   <strong class="mobile-region-value">${valid(v)?v.toFixed(1):"—"}</strong>
   <span class="mobile-region-diff ${status(v)}">${valid(d)?`基準差 ${pct(d)}`:"未取得"}</span>
   <span class="mobile-region-prev">${valid(prev)?`前回差 ${pct(prev)}`:"比較なし"}</span><span class="mobile-chevron">›</span>
 </button>`}).join("")}</div>
 <button type="button" class="mobile-region-more" data-expand-regions aria-expanded="${state.mobileRegionsExpanded}">${state.mobileRegionsExpanded?"一部だけ表示":"全12部位を見る"} <span aria-hidden="true">${state.mobileRegionsExpanded?"⌃":"⌄"}</span></button>`;
}
    function historyChart(region){
    // Demo only: values are derived from a mock selected region to keep the chart consistent with the card.
    if(!Number.isFinite(region?.value))return `<div class="empty-state">この部位の推移は表示できません。</div>`;
    const v=region.value;
    const vals=[v-9.5,v-7.1,v-8.0,v-5.1,Number.isFinite(region.prev)?region.prev:v-2.8,v];
    const lo=Math.min(...vals,100)-6,hi=Math.max(...vals,100)+6;
    const x1=20,x2=520,y1=25,y2=132;
    const coord=(val,i)=>[(x1+(x2-x1)*i/(vals.length-1)).toFixed(1),(y2-(val-lo)/(hi-lo)*(y2-y1)).toFixed(1)];
    const pts=vals.map((val,i)=>coord(val,i).join(",")).join(" ");
    const base=(y2-(100-lo)/(hi-lo)*(y2-y1)).toFixed(1);
    return `<svg class="spark-chart" viewBox="0 0 540 155" role="img" aria-label="${region.friendly}の参考値の推移"><line x1="18" x2="520" y1="${base}" y2="${base}" stroke="#819eae" stroke-dasharray="5 4"/><text x="22" y="${Math.max(12,Number(base)-5)}" fill="#708895" font-size="11">基準100</text><polyline points="${pts}" fill="none" stroke="#008a9c" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/>${vals.map((val,i)=>{const [x,y]=coord(val,i);return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#008a9c" stroke-width="2.4"/>`}).join("")}<text x="516" y="16" text-anchor="end" fill="#007589" font-size="12" font-weight="800">${v.toFixed(1)}</text></svg>`;
}
  function miniTrendChart(region){
 const v=region.value,prev=region.prev;
 if(!Number.isFinite(v))return `<div class="mini-empty">推移はありません</div>`;
 const ySeries=[v-9.5,v-7.1,v-8.0,v-5.1,Number.isFinite(prev)?prev:v-2.8,v];
 const low=Math.min(100,...ySeries)-5,high=Math.max(100,...ySeries)+5;
 const X=i=>24+i*37,Y=n=>74-(n-low)/(high-low)*55;
 const poly=ySeries.map((n,i)=>`${X(i)},${Y(n).toFixed(1)}`).join(" ");
 const base=Y(100).toFixed(1);
 return `<svg class="mobile-mini-trend" viewBox="0 0 220 103" role="img" aria-label="${esc(region.friendly)}の参考値の推移">
    <line x1="24" y1="${base}" x2="211" y2="${base}" stroke="#93afc9" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="23" y="${Math.max(9,Number(base)-4)}" fill="#7e92a5" font-size="8.5">基準100</text>
    <polyline points="${poly}" fill="none" stroke="#1686e3" stroke-width="2.7" stroke-linejoin="round" stroke-linecap="round"/>
    ${ySeries.map((n,i)=>`<circle cx="${X(i)}" cy="${Y(n).toFixed(1)}" r="3.4" fill="#fff" stroke="#1987e6" stroke-width="1.9"/>`).join("")}
    <text x="25" y="97" fill="#8ca0b3" font-size="9">過去</text><text x="210" y="97" text-anchor="end" fill="#4885b5" font-size="9">今回</text>
 </svg>`;
}
    function radarChart(){
    const labels=["距離","平均速度","ペース変動","上り密度","推定歩調","疲労変化"],a=[.63,.58,.42,.28,.5,.6],b=[.5,.51,.35,.22,.42,.47],cx=150,cy=115;
    const polygon=(data,r)=>data.map((v,i)=>{const theta=i*Math.PI/3;return `${(cx+Math.sin(theta)*r*v).toFixed(1)},${(cy-Math.cos(theta)*r*v).toFixed(1)}`}).join(" ");
    return `<svg class="radar-chart" viewBox="0 0 300 225" role="img" aria-label="架空の今回と前回を示す6軸走行プロフィール。能力点数ではありません">${[.33,.66,1].map(f=>`<polygon points="${polygon([f,f,f,f,f,f],76)}" fill="none" stroke="#c8d8e0"/>`).join("")}${labels.map((l,i)=>{const t=i*Math.PI/3;return `<line x1="${cx}" y1="${cy}" x2="${cx+Math.sin(t)*76}" y2="${cy-Math.cos(t)*76}" stroke="#cadbe3"/><text class="radar-label" text-anchor="middle" x="${cx+Math.sin(t)*108}" y="${cy-Math.cos(t)*97+4}" font-size="13.5" font-weight="650">${l}</text>`}).join("")}<polygon points="${polygon(b,76)}" fill="#94a3b8" fill-opacity=".14" stroke="#94a3b8" stroke-width="2"/><polygon points="${polygon(a,76)}" fill="#0891b2" fill-opacity=".16" stroke="#0891b2" stroke-width="2.4"/></svg>`;
  }
  function home(){
 const editing=homeEditState.editing;
 const pref=editing?homeEditState.draft:homePreferenceState.layout;
 const names=dashboardPrefs.HOME_DASHBOARD_WIDGETS;
 const savedRunState=manualRunStore.readManualRuns(onboardStorage);
 const cards={
  latest:homeExperience.latestCard(homeUi.preview,(()=>{const r=manualRunStore.readManualRuns(onboardStorage);return r.ok?r.records.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null:null})()),
  condition:homeExperience.conditionCard(homePreferenceStorage,homeUi.preview),
  topics:homeExperience.achievementCard(homeUi.preview,savedRunState),
  shortcuts:homeExperience.shortcutsCard(),
  trend:homeExperience.trendCard(homeUi.preview),
  discovery:homeExperience.discoveryCard(explorationUi.notes)
 };
 const storedLayout=pref||dashboardPrefs.defaultHomeDashboardLayout();
 // Only for the uncustomized default: a voluntary reflection makes the
 // optional continuation card relevant. Never override a saved hide choice.
 const hasReflection=explorationUi.notes.some(n=>n&&typeof n.text==='string'&&n.text.trim());
 const defaultUncustomized=(()=>{try{return homePreferenceStorage?.getItem(dashboardPrefs.HOME_DASHBOARD_KEY)===null}catch{return false}})();
 const current=!editing&&hasReflection&&defaultUncustomized&&!storedLayout.visible.includes('discovery')?
  {...storedLayout,visible:[...storedLayout.visible,'discovery']}:storedLayout;
 const widgets=current.order.map(id=>{
  const w=names.find(e=>e.id===id);
  const visible=current.visible.includes(id);
  if(!w||(!visible&&!editing))return "";
  const idx=current.order.indexOf(id);
  const editingControls=editing?`<div class="dashboard-widget-controls" role="group" aria-label="${esc(w.title)}の編集"><div class="widget-drag-title"><button type="button" class="widget-drag-handle" data-home-drag-handle aria-label="${esc(w.title)}を長押しして並べ替える" title="長押しして移動">⠿</button><span class="widget-edit-label">${esc(w.title)} ${!visible?"（非表示）":""}</span></div><div class="widget-edit-actions"><button type="button" data-widget-action="up" data-widget-id="${id}" ${idx===0?"disabled":""} aria-label="${esc(w.title)}を上へ">↑</button><button type="button" data-widget-action="down" data-widget-id="${id}" ${idx===current.order.length-1?"disabled":""} aria-label="${esc(w.title)}を下へ">↓</button><button type="button" data-widget-action="size" data-widget-id="${id}" aria-label="${esc(w.title)}のサイズ変更">${current.sizes[id]==="full"?"小さく":"横幅いっぱい"}</button><button type="button" data-widget-action="toggle" data-widget-id="${id}" aria-label="${esc(w.title)}を${visible?"隠す":"表示"}">${visible?"非表示":"追加"}</button></div></div>`:"";
  return `<div data-home-dashboard-id="${id}" class="dashboard-widget ${current.sizes[id]==="full"?"dashboard-widget--wide":"dashboard-widget--half"} ${!visible?"dashboard-widget--hidden":""}" ${editing?`data-home-editable="true"`:""}>${editingControls}<div class="dashboard-widget-content">${cards[id]||""}</div></div>`;
 }).join("");
 const controls=editing?`<section class="dashboard-edit-toolbar" role="group" aria-label="ホームの表示を編集"><div><strong>ホームの表示を編集</strong><p>ハンドルを長押しして移動できます。上下ボタン・表示・サイズ変更も使えます。変更の保存は手動です。</p></div><div class="dashboard-edit-buttons"><button type="button" class="btn" data-home-reset>初期配置に戻す</button><button type="button" class="btn" data-home-cancel>キャンセル</button><button type="button" class="btn primary" data-home-save ${!homePreferenceState.canSave?"disabled":""}>変更を保存</button></div></section>`:"";
 return `<div class="home-v3"><section class="home-head"><h1>ホーム</h1><div class="home-heading-actions">
 <button type="button" class="hx-preview-toggle" data-home-preview aria-pressed="${homeUi.preview}">${homeUi.preview?"表示例を終了":"表示例を見る"}</button>
 <button type="button" class="btn dashboard-edit-trigger" data-home-edit aria-pressed="${editing}" ${!homePreferenceState.canSave?"disabled":""}>${editing?"編集を終了":"編集"}</button>
 </div></section>
 ${homeUi.preview?'<div class="hx-preview-banner" role="status">表示例：走行・実績・睡眠は説明用の数字です。あなたの記録には保存されません。</div>':""}
 ${homeEditState.notice?`<div class="dashboard-edit-notice" role="status">${esc(homeEditState.notice)}</div>`:""}
 ${!homePreferenceState.canSave?`<p class="dashboard-storage-warning" role="alert">${esc(homePreferenceState.reason)}</p>`:""}
 ${controls}
 <div class="dashboard-custom-grid ${editing?"dashboard-custom-grid--editing":""}" aria-label="ホームの表示">${widgets}</div>
  ${(()=>{const r=actionIntentStore.loadIntent(onboardStorage);const conditions=homeExperience.readConditions(onboardStorage);const insights=conditionInsights.loadConditionInsights(onboardStorage);return conditionJourney.renderHomeConditionFollowup(r.intent,conditions,insights,r.ok?"":r.reason,conditionUi.notice);})()}
 ${homeUi.conditionOpen?homeExperience.conditionPanel(homePreferenceStorage,homeUi.preview,homeUi.conditionDate):""}
 ${homeUi.achievementOpen?homeExperience.achievementPanel(homeUi.preview,savedRunState):""}
 </div>`;
}
    function rofPanel(){
 const anchors=rofScale.ROF_J_ANCHORS.map(a=>`<div class="rof-anchor-card" aria-label="${esc(a.positionLabel)}、${esc(a.descriptor)}">
   <img src="${esc(rofScale.referenceImageUrl(a))}" alt="" loading="lazy">
   <strong>${esc(a.positionLabel)}</strong><span>${esc(a.descriptor)}</span></div>`).join("");
 const fields=[["rofBefore","運動前"],["rofAfter","運動後"]].map(([key,label])=>{
  const n=state.recordDraft[key],selected=rofScale.isValidRofJ(n);
  return `<div class="rof-entry" data-rof-entry="${key}"><label for="rof-${key}"><strong>${label}</strong><output data-rof-output="${key}">${selected?n:"—"}</output><span class="rof-of-ten">/ 10</span></label>
  <input id="rof-${key}" type="range" data-rof-input="${key}" min="0" max="10" step="1" value="${selected?n:5}" aria-label="${label}のROF-J疲労感（0〜10）">
  <div class="rof-endpoints"><span>0：まったく疲れていない</span><span>10：完全な疲労困憊</span></div>
  <p class="rof-selection-description" data-rof-description="${key}">${selected?esc(rofScale.guidanceForRofJ(n)):"未入力・任意"}</p>
  <button class="rof-clear" type="button" data-rof-clear="${key}" ${selected?"":"disabled"}>選択を消す</button></div>`;
 }).join("");
 return `<section class="record-rof-j" aria-label="ROF-J主観的疲労感">
 <div class="record-rof-header"><div><p class="eyebrow">ROF-J</p><h2>ROF-J｜運動前後の疲労感 <span>任意</span></h2></div><span class="rof-label">0–10</span></div>
 <details class="rof-editor-details" data-rof-editor><summary class="rof-editor-summary"><span class="rof-summary-mark" aria-hidden="true">◉</span><span class="rof-summary-text"><strong>運動前後の疲労感を入力・確認</strong><small>運動前 <b data-rof-summary-before>${rofScale.isValidRofJ(state.recordDraft.rofBefore)?state.recordDraft.rofBefore:"—"}</b> ／ 運動後 <b data-rof-summary-after>${rofScale.isValidRofJ(state.recordDraft.rofAfter)?state.recordDraft.rofAfter:"—"}</b> （各0〜10）</small></span><span class="rof-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rof-editor-body"><p class="rof-intro">今感じている疲れを数字で選びます。運動前と運動後は別々に入力してください。医学的な診断や走行可否の判断ではありません。</p>
 <div class="rof-anchor-guide" role="group" aria-label="著者確認済みROF-Jの5つの尺度目安">${anchors}</div>
 <div class="rof-entry-grid">${fields}</div>
 <details class="rof-rights"><summary>尺度・イラストの出典と利用条件</summary>
 <p>日本語の尺度表現：Suzuki &amp; Arai (2026)（CC BY-NC-ND 4.0）。配置は責任著者への確認に基づき原版ROFと同じ目安位置を使用。2と3の間・7と8の間は選択できる追加点数ではありません。</p>
 <p>図：Micklewright et al. (2017)（CC BY 4.0）。原版に基づくイラストを変更せず利用。<a href="${rofScale.ROF_J_RIGHTS.scaleUrl}" target="_blank" rel="noopener">日本語尺度の原文</a> ／ <a href="${rofScale.ROF_J_RIGHTS.imagesUrl}" target="_blank" rel="noopener">図の出典</a> ／ <a href="${rofScale.ROF_J_RIGHTS.scaleLicense}" target="_blank" rel="noopener">日本語資料のライセンス</a> ／ <a href="${rofScale.ROF_J_RIGHTS.imagesLicense}" target="_blank" rel="noopener">図のライセンス</a></p>
 </details><p class="rof-unsaved-note">ここで選んだ疲労感は、記録内容を確認して手入力の走行を保存すると一緒に保存されます。</p></div></details>
 </section>`;
}
  function onboardingView(){return firstUseExperience.renderFirstUse(onboardingState);}
  function finishOnboarding(){
    onboardingState.open=false;onboardingState.replay=false;onboardingState.error="";
    try{onboardStorage?.setItem(onboardingKey,JSON.stringify({completed:true,language:"ja"}))}catch{}
    render();
  }
  function recordStart(){return recordExperience.recordMethodPage();}
function recordExtras(){
 const d=state.recordDraft, field=(id)=>esc(d[id]??"");
 const select=(name,items,extra="")=>`<select data-draft="${name}" ${extra}>${items.map(([value,label])=>`<option value="${value}" ${d[name]===value?"selected":""}>${label}</option>`).join("")}</select>`;
 const num=(name,label,opts={})=>`<label class="record-extra-field"><span>${label}</span><input data-draft="${name}" type="number" inputmode="${opts.integer?"numeric":"decimal"}" min="${opts.min??0}" max="${opts.max??(opts.integer?10000000:100)}" step="${opts.step??(opts.integer?1:.1)}" placeholder="${opts.placeholder??"未入力"}" value="${field(name)}"></label>`;
 const surfaceLabels=[["paved","舗装路"],["track","陸上トラック"],["treadmill","トレッドミル"],["soil","締まった土道"],["trail","不整地トレイル"],["naturalGrass","天然芝"],["artificialTurf","人工芝"],["sand","砂地"]];
 const surfaces=[["","選択してください"],...surfaceLabels.map(([k,label])=>[k,label])];
 const sections=Array.from({length:5},(_,i)=>`<div class="record-course-section"><strong>区間 ${i+1}</strong><div class="record-extra-grid">
 ${num("sectionShare"+i,"割合 (%)",{max:100})}
 <label class="record-extra-field"><span>坂の向き</span>${select("sectionDirection"+i,[["FLAT","平坦"],["UPHILL","上り"],["DOWNHILL","下り"]])}</label>
 ${num("sectionGrade"+i,"傾斜 (%)",{max:100})}
 <label class="record-extra-field"><span>路面</span>${select("sectionSurface"+i,[["UNKNOWN","不明"],...surfaceLabels.map(([v,t])=>[v,t])])}</label>
 </div></div>`).join("");
 return `<div class="record-optional-stack" aria-label="旧版から引き継ぐ任意入力項目">
 <details class="record-extra-section" data-record-section="course"><summary><span class="record-extra-step">2</span><span><strong>コースと走行条件</strong><small>保存コース相当の情報・坂・路面を入力</small></span><span class="record-extra-chevron" aria-hidden="true">⌄</span></summary>
 <div class="record-extra-content">
 <p class="record-extra-help">入力できる条件だけ記録できます。分からない場合は「不明」のままにしてください。コースの登録やGPSで測定したコースはまだ取り込めません。</p>
 <label class="record-extra-field"><span>今回のコース名（任意）</span><input data-draft="courseName" type="text" maxlength="80" placeholder="例：川沿い往復" value="${field("courseName")}"></label>
 <div class="record-extra-grid"><label class="record-extra-field"><span>坂道</span>${select("gradeMode",[["UNKNOWN","不明・未設定"],["FLAT","ほぼ平坦"],["SUMMARY","坂あり：割合で入力"],["SECTIONS","区間ごとに入力"]])}</label>
 <label class="record-extra-field"><span>路面</span>${select("surfaceMode",[["UNKNOWN","不明・未設定"],["SINGLE","1種類を選択"],["MIXED","複数を割合で入力"]])}</label></div>
 <div data-grade-submode="SUMMARY" ${d.gradeMode==="SUMMARY"?"":"hidden"}><h3>坂の構成</h3><div class="record-extra-grid">${num("upPercent","上りの割合 (%)",{max:100})}${num("downPercent","下りの割合 (%)",{max:100})}${num("upGradePercent","上りの傾き (%)",{max:100})}${num("downGradePercent","下りの傾き (%)",{max:100})}</div><p class="record-extra-help">上り・下りの割合の合計は100%以下。残りを平坦として整理します。未入力を0とみなしません。</p></div>
 <div data-grade-submode="SECTIONS" ${d.gradeMode==="SECTIONS"?"":"hidden"}><h3>区間の内訳（最大5区間）</h3><p class="record-extra-help">割合の合計は100%。区間の速度を勝手に補うことはしません。</p>${sections}</div>
 <div data-surface-submode="SINGLE" ${d.surfaceMode==="SINGLE"?"":"hidden"}><label class="record-extra-field"><span>主な路面</span>${select("primarySurface",surfaces)}</label></div>
 <div data-surface-submode="MIXED" ${d.surfaceMode==="MIXED"?"":"hidden"}><h3>路面の割合</h3><div class="record-extra-grid">${surfaceLabels.map(([k,label])=>num("surface"+k,label+" (%)",{max:100})).join("")}</div><p class="record-extra-help">実際に使った路面の割合が合計100%になるように入力します。</p></div>
 </div></details>
 <details class="record-extra-section" data-record-section="compare"><summary><span class="record-extra-step">3</span><span><strong>歩数・走り方・環境</strong><small>比較に役立つ情報（任意）</small></span><span class="record-extra-chevron" aria-hidden="true">⌄</span></summary>
 <div class="record-extra-content">
 <div class="record-extra-grid">${num("steps","歩数（歩）",{integer:true,max:10000000,placeholder:"例：6000"})}<label class="record-extra-field"><span>歩数の取得方法</span>${select("stepsProvenance",[["UNKNOWN","不明・未設定"],["DEVICE_MEASURED","端末・時計で計測"],["ESTIMATED","手入力・おおよそ"]])}</label></div>
 <p class="record-extra-help">歩数の出所を区別します。GPS距離から歩数を自動推定しません。</p>
 <label class="record-extra-field"><span>走り方</span>${select("runningFormat",[["UNKNOWN","不明・未設定"],["CONTINUOUS_RUN","連続して走った"],["RUN_WALK","走行と歩行を組み合わせた"]])}</label>
 <div class="record-runwalk-fields" data-running-format="RUN_WALK" ${d.runningFormat==="RUN_WALK"?"":"hidden"}><p class="record-extra-help">部位別の参考値は、走った区間だけを対象にします。歩行区間を走行に含めません。</p><div class="record-extra-grid">${num("runWalkRunningDistanceKm","走った距離（km）",{max:10000,step:.01})}${num("runWalkRunningDurationMinutes","走った時間（分）",{max:100000,step:.1})}</div></div>
 <div class="record-extra-grid">${num("temperatureC","気温（℃）",{min:-50,max:60,step:.1})}<label class="record-extra-field"><span>環境メモ</span><textarea data-draft="environmentNote" rows="2" maxlength="500" placeholder="天気、湿度、向かい風など">${field("environmentNote")}</textarea></label></div>
 </div></details>
 <details class="record-extra-section" data-record-section="reflection"><summary><span class="record-extra-step">4</span><span><strong>身体・使用したもの・メモ</strong><small>自覚したことやシューズなど（任意）</small></span><span class="record-extra-chevron" aria-hidden="true">⌄</span></summary>
 <div class="record-extra-content"><p class="record-extra-help">身体の自覚情報はROF-Jや12部位の計算結果とは別に扱います。選んだ部位は、必要に応じて文章として記録できます。</p><label class="record-extra-field"><span>身体の気づき（自由記述）</span><textarea data-draft="bodyObservation" rows="2" maxlength="500" placeholder="気になった部位、違和感など">${field("bodyObservation")}</textarea></label><label class="record-extra-field"><span>今回のシューズ</span><input type="text" data-draft="shoeName" maxlength="120" placeholder="未入力" value="${field("shoeName")}"></label><label class="record-extra-field"><span>走行・休養時のメモ</span><textarea data-draft="memo" rows="3" maxlength="500" placeholder="自分が感じたことを記入">${field("memo")}</textarea></label></div></details>
 </div>`;
}
  function recordPreview(){
    if(!state.recordPreviewOpen)return "";
    const d=state.recordDraft,active=state.recordType==="run",v=reviewDraft.checkRecordDraft(d,active);
    const errors=[...v.errors];
    if(!d.date)errors.unshift("日付を入力してください");
    if(active&&(!d.distance||Number(d.distance)<=0||!d.minutes||Number(d.minutes)<=0))errors.unshift("距離と時間を入力してください");
    return `<div class="record-preview-overlay" data-close-preview><section class="record-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="record-preview-title"><h2 id="record-preview-title">入力内容の確認</h2>
      <p>手入力した走行は、確認画面から端末に保存できます。</p>
      <dl><dt>種類</dt><dd>${active?"走行":"休養"}</dd><dt>日付</dt><dd>${esc(d.date||"未入力")}</dd>${active?`<dt>距離</dt><dd>${esc(d.distance||"未入力")} km</dd><dt>時間</dt><dd>${esc(d.minutes||"未入力")} 分</dd><dt>コース</dt><dd>${esc(d.courseName||"未設定")}</dd><dt>ROF-J</dt><dd>${Number.isInteger(d.rofBefore)?d.rofBefore:"未入力"} → ${Number.isInteger(d.rofAfter)?d.rofAfter:"未入力"}</dd>`:""}<dt>メモ</dt><dd>${esc(d.memo||"未入力")}</dd></dl>
      ${errors.length||v.warnings.length?`<div class="record-review-alert" role="alert">${errors.map(t=>`<p class="is-error">${esc(t)}</p>`).join("")}${v.warnings.map(t=>`<p>${esc(t)}</p>`).join("")}</div>`:`<p class="record-review-success">入力内容を確認しました。身体の部位別の参考値は計算していません。</p>`}
      <button type="button" class="btn primary" data-close-preview>閉じる</button></section></div>`;
  }
  function record(){return recordExperience.manualPage(state);}
  function recordReview(){return recordReviewExperience.reviewView(state.recordDraft,{
    recordType:state.recordType,source:state.recordReviewSource,courseUi:state.recordCourseUi,bodySelected:bodyUi.selected,saveNotice:manualSaveNotice
  });}
  function recordCourse(fromHome=false){return recordExperience.coursePage(state,state.recordCourseUi,coursePresets.readCoursePresets(onboardStorage),fromHome);}
  function recordRof(){return rofExperience.rofPage(state.recordDraft,rofUi);}
  function recordMore(kind="both"){
    const all=recordExtras();
    const compareStart=all.indexOf('<details class="record-extra-section" data-record-section="compare">');
    const reflectionStart=all.indexOf('<details class="record-extra-section" data-record-section="reflection">');
    const compare=all.slice(compareStart,reflectionStart);
    const environmentAt=compare.indexOf('<div class="record-extra-grid"><label class="record-extra-field"><span>気温');
    const compareOnly=environmentAt>=0?compare.slice(0,environmentAt)+"</div></details>":compare;
    const fields=kind==="compare"?compareOnly:kind==="reflection"?all.slice(reflectionStart).replace(/\s*<\/div>\s*$/,''):all.slice(compareStart).replace(/\s*<\/div>\s*$/,'');
    const title=kind==="compare"?"歩数・走り方・環境":kind==="reflection"?"身体・使用品・メモ":"追加情報";
    return `<div class="record-v3 rv-aux"><header class="rv-head"><a href="#/record" class="rv-back" aria-label="手入力へ戻る">‹</a><h1>${title}</h1></header><div class="rv-aux-wrap"><section class="rv-panel"><div class="record-optional-stack">${fields}</div></section></div></div>`;
  }
  const recordCompare=()=>gaitExperience.gaitPage(state.recordDraft),recordReflection=()=>bodyExperience.renderScreen(state.recordDraft,bodyUi);
  function recordEnvironment(){return environmentExperience.environmentPage(state.recordDraft,environmentUi);}
  
    function result(){
 const current=regionData(state.region),v=current.value,prev=current.prev;
 const comparison=valid(v)&&valid(prev)?pct(v-prev):"—";
 const mobileDetail=`<div class="mobile-detail-feature">
   <div class="mobile-detail-headline">
      <div class="mobile-big-value ${status(v)}">${valid(v)?v.toFixed(1):"—"}</div>
      <div class="mobile-baseline-chip">基準比 <b>${valid(v)?pct(v-100):"—"}</b></div>
      <div class="mobile-past-stats"><div><small>前回の値</small><strong>${valid(prev)?prev.toFixed(1):"—"}</strong></div><div><small>前回から</small><strong class="${status(v)}">${comparison}</strong></div></div>
   </div>
   <div class="mobile-inline-trend"><h3>最近の推移</h3>${miniTrendChart(current)}</div>
 </div>`;
 return `<section class="result-top card"><div class="result-heading"><div><div class="eyebrow">RUN REPORT</div><h1>結果</h1><p class="lead">走りを振り返り、自分のペースで次へつなげる。</p></div><div class="result-top-signals"><div class="signal-box"><span class="signal-icon">▥</span><span><small>数値あり</small><strong>11/12</strong></span></div><div class="signal-box"><span class="signal-icon">⇄</span><span><small>前回の参考値</small><strong>あり</strong></span></div><div class="signal-box warm"><span class="signal-icon">⌁</span><span><small>疲労感の変化</small><strong>+2</strong></span></div></div></div>
 <div class="run-facts"><span class="run-fact-date">◫　10月22日</span><span class="run-fact"><small>距離</small><strong>8.20</strong><em>km</em></span><span class="run-fact"><small>時間</small><strong>45</strong><em>分</em></span><span class="run-fact"><small>平均ペース</small><strong>5:29</strong><em>/km</em></span><span class="run-fact-course">⌁　コース情報なし</span></div></section>
 <section class="result-primary">
 <div class="card anatomy-card"><div class="section-title"><h2>速度と身体の反応</h2><a href="#/body-part-detail" class="help-link">部位の見方　ⓘ</a></div><div class="body-map-row">${BODY_REGION_VIEWS.map(svgBody).join("")}</div>${legend()}<p class="chart-caption">色は各部位自身の基準100との関係を示します。</p></div>
 <div class="card regions-card"><div class="section-title"><h2>部位の一覧</h2><div class="segmented"><button data-result-mode="all" class="${state.resultMode==="all"?"is-active":""}">全体</button><button data-result-mode="focus" class="${state.resultMode==="focus"?"is-active":""}">注目</button></div></div><div class="region-grid">${regionTiles()}</div>${mobileRegionRows()}<p class="chart-caption regions-guidance">部位を選ぶと、人体図と詳細が連動します。</p></div>
 </section>
 <section class="result-lower"><div class="card region-detail-card" id="selected-detail"><div class="section-title"><div class="detail-head"><h2>選択部位の詳細</h2><span class="selected-name">${regionPictogram(current.id,current.value)}${esc(current.friendly)}</span></div>${buttonLink("body-part-detail","部位の詳細")}</div><div class="detail-metrics"><div class="highlight-detail"><small>今回の数値</small><strong>${valid(v)?v.toFixed(1):"—"}</strong></div><div><small>基準値</small><strong>100</strong></div><div><small>基準からの差</small><strong class="${status(v)}">${valid(v)?pct(v-100):"—"}</strong></div><div><small>前回の数値</small><strong>${valid(prev)?prev.toFixed(1):"—"}</strong></div><div><small>前回からの変化</small><strong class="${status(v)}">${comparison}</strong></div></div>
 ${mobileDetail}<h3 class="detail-chart-title">${esc(current.friendly)}の推移</h3><div class="chart-card">${historyChart(current)}</div>
 <p class="reference-note">ⓘ 各部位自身の基準を100とする文献由来の参考値です。実測した筋負荷・健康状態・傷害リスクを表すものではありません。</p></div>
 <div class="support-stack">
 <div class="card fatigue-panel"><div class="section-title"><h2>運動前後の疲労感 <small>(ROF-J)</small></h2></div><div class="fatigue-flex"><div class="fatigue-cell"><small>運動前</small><strong>6</strong><span class="scale blue"></span></div><span class="fatigue-arrow" aria-hidden="true">→</span><div class="fatigue-cell"><small>運動後</small><strong>8</strong><span class="scale orange"></span></div><div class="fatigue-cell difference"><small>変化</small><strong>+2</strong></div></div><p class="chart-caption">本人が回答した0〜10の主観的な疲労感。</p></div>
 <div class="card radar-panel"><div class="section-title"><h2>走行プロフィール <small>(参考)</small></h2></div>${radarChart()}<div class="map-legend"><span><i class="dot" style="background:#0891b2"></i>今回</span><span><i class="dot missing"></i>比較する記録</span></div><p class="chart-caption">6つの走行指標の形。身体能力の判定ではありません。</p></div>
 <div class="result-actions">${buttonLink("exploration-tree","探究へ",true)}${buttonLink("history","履歴を見る")}</div></div>
 </section>`;
}
    // History records are intentionally not sourced from the unsaved input draft.
    // Saved-history repository integration is a separate protected milestone.
    // Running history retains its approved, independent visual structure.
    function history(){
      return '<section id="runload-history-v2" aria-label="履歴"></section>';
    }
    // Condition inspection lives off the home dashboard, not inside running history.
    function condition(){
      const conditions=homeExperience.readConditions(onboardStorage);
      const insights=conditionInsights.loadConditionInsights(onboardStorage);
      return '<section class="cj-screen" aria-label="コンディションの歩み"><header class="cj-page-head"><a href="#/home" class="cj-back" aria-label="ホームに戻る">‹ ホームへ戻る</a><h1>コンディションの歩み</h1><p>睡眠・就床時間と、その日の調子を振り返る</p></header>'+conditionJourney.renderConditionJourney(conditions,conditionUi,insights)+'</section>';
    }
    function explore(){
      const conditions=homeExperience.readConditions(onboardStorage);
       const saved=manualRunStore.readManualRuns(onboardStorage);
       const route=location.hash;
       const params=new URLSearchParams(route.split('?')[1]||'');
       if(route!==lastExploreRoute){
         lastExploreRoute=route;
         const cat=CATEGORIES.find(c=>c.id===params.get('category'));
         if(cat&&cat.topics.includes(params.get('topic'))){explorationUi.selected=cat.id;explorationUi.topic=params.get('topic');explorationUi.tab='field';explorationUi.modal='';explorationUi.sample=false;}
       }
       const focusRunId=params.has('record')?params.get('record'):null;
       const focusRun=focusRunId&&saved.ok?saved.records.find(r=>r.id===focusRunId)||null:null;
       return explorationExperience.render(explorationUi,{categories:CATEGORIES,draft:focusRunId?null:state.recordDraft,conditions,manualRuns:saved,focusRunId,focusRun});
     }
    function settings(){return settingsExperience.renderSettings({...settingsUi,dataUi});}
    function secondary(page){
 const title=pageLabels[page]||"その他";
 const top=`<section class="home-head"><div><h1>${esc(title)}</h1><p class="lead">${esc({measurement:"走る時間とルートを確かめる。",course:"走りたいコースを、自分で組み立てる。",simulation:"条件を変えて、参考値の違いを考える。",consultation:"記録を振り返り、必要な情報を整理する。","body-part-detail":"気になる部位を、過去の記録と照らし合わせる。"}[page]||"自分の記録を大切に扱う。")}</p></div></section>`;
 if(page==="measurement")return measurementExperience.measurementPage(ensureGps().state,ensureGps().elapsed());
   if(page==="course")return recordCourse(true);
 if(page==="simulation"){
  const savedGps=gpsStore.readGpsRuns();
  const chosen=savedGps.ok?savedGps.records.find(r=>r.id===simulationUi.gpsId):null;
  simulationUi.gpsFeature=chosen?gpsStore.gpsRecordToFeature(chosen):simulationUi.gpsId?.startsWith('gps-v2-')?simulationUi.gpsFeature:null;
  if(simulationUi.source==='gps'&&simulationUi.gpsFeature)simulationUi.distance=String(simulationUi.gpsFeature.distanceKm);
  return simulationExperience.renderSimulation(simulationUi,{
  presets:coursePresets.readCoursePresets(onboardStorage),
  manualRuns:manualRunStore.readManualRuns(onboardStorage),
  gpsRuns:savedGps.ok?{ok:true,records:[...savedGps.records,...(gpsV2Cache.ok?gpsV2Cache.records.filter(r=>r.detailSaved).map(r=>({...r,track:[{},{}]})):[])]}:savedGps
 });}
 if(page==="consultation")return consultationExperience.renderConsultation();
 const cur=regionData(state.region);
 return top+`<section class="grid-2"><div class="card stack"><h2>${esc(cur.name===cur.friendly?cur.name:cur.name+"（"+cur.friendly+"）")}</h2><div class="detail-value">${valid(cur.value)?cur.value.toFixed(1):"—"}</div><div class="info-note">この部位自身の文献基準を100とした参考値であり、実測した身体負荷・傷害リスクではありません。</div><div class="chart-card">${historyChart(cur)}</div></div><div class="card stack"><h2>ほかの部位を見る</h2><div class="region-grid">${regionTiles()}</div>${buttonLink("result","全12部位へ戻る")}</div></section>`;
}
    let stopHomeDrag=null;
    function render(){
      if(dynamicPlayback){dynamicPlayback.dispose?.();dynamicPlayback=null;}
      if(stopHomeDrag){stopHomeDrag();stopHomeDrag=null;}
      const previousConditionStrip=app.querySelector("[data-cj-chart]");
      if(previousConditionStrip&&conditionUi.scrollLeft!==null)conditionUi.scrollLeft=previousConditionStrip.scrollLeft;
      const existingRof=app.querySelector(".rof-editor-details");if(existingRof)state.rofEditorOpen=existingRof.open;
      const openedRecordSections=app.querySelectorAll(".record-extra-section[open]");
      if(openedRecordSections.length||app.querySelector(".record-extra-section"))state.recordOpenSections=[...openedRecordSections].map(el=>el.dataset.recordSection);
 const page=currentPage(),content={home,condition,record,"record-review":recordReview,result:()=>'<section id="runload-result-v4" aria-label="走行結果"></section>',"dynamic-result":()=>'<section data-gps-dynamic aria-label="GPS動的結果"><p class="gd-empty">動的結果を読み込んでいます…</p></section>',history,"exploration-tree":explore,settings,"record-start":recordStart,"record-course":recordCourse,course:()=>recordCourse(true),"record-rof":recordRof,"record-more":recordMore,"record-compare":recordCompare,"record-reflection":recordReflection,"record-environment":recordEnvironment}[page]?.()||secondary(page);
 const navPage=page==="condition"?"home":page==="result"||page==="dynamic-result"?"result":page==="measurement"?"record":["record-review","record-course","record-rof","record-more","record-compare","record-reflection","record-environment"].includes(page)?"record":page;
 // Return links to the common confirmation when a detail was opened from that screen.
 const detailPages=["record-course","record-rof","record-more","record-compare","record-environment","record-reflection"];
 const detailContent=(state.recordReviewReturn&&detailPages.includes(page))
   ? content.replaceAll('href="#/record"','href="#/record-review"') : content;
 const gpsConsentMarkup=gpsConsentAction&&page==="measurement"
   ?`<div class="gps-consent-backdrop" data-gps-consent-overlay><section class="gps-consent-dialog" role="dialog" aria-modal="true" aria-labelledby="gps-consent-title" aria-describedby="gps-consent-description gps-consent-interruption"><div class="gps-consent-symbol" aria-hidden="true">⌖</div><h2 id="gps-consent-title">${gpsConsentAction==="resume"?"位置情報の取得を再開しますか？":"位置情報を使用しますか？"}</h2><p id="gps-consent-description">測定中は端末の現在地・移動経路・取得可能な標高を利用します。道路地図の表示時には、表示する場所の範囲がOpenStreetMapへ伝わります。走行軌跡は保存時に選択した場合だけ端末に保存します。</p><div class="gps-consent-interruption" id="gps-consent-interruption" role="note"><strong>画面ロック・アプリ切り替え時の動作</strong><p>画面をロックしたり別のアプリへ切り替えたりすると、<b>活動時間のタイマーとGPS測位は自動で一時停止</b>します。</p><p>画面に戻っても自動では再開しません。<b>「測定を再開」から位置情報の使用を確認</b>してください。停止中の時間・距離は加算されません。</p></div><div class="gps-consent-actions"><button type="button" data-gps-consent-cancel class="gps-v2-button gps-v2-secondary">使用しない</button><button type="button" data-gps-consent-confirm class="gps-v2-button gps-v2-primary">${gpsConsentAction==="resume"?"許可して再開":"許可して開始"}</button></div></section></div>` : "";
 app.innerHTML=`<div class="app-shell ${page==="consultation"?"cp-app":""}" data-mobile-view="edit" data-mode-preview="single"><aside class="sidebar"><nav class="side-nav" aria-label="メニュー">${navHtml(desktopNav,navPage,false)}</nav></aside><div class="main-frame"><header class="topbar"><div class="topbar-title" aria-hidden="true"></div><div class="topbar-right"><button type="button" class="icon-install" data-install-app aria-label="アプリをホーム画面に追加">⇩</button></div></header><main class="main-content">${state.toast?`<div class="toast-notice">${esc(state.toast)}</div>`:""}${detailContent}</main></div><nav class="mobile-nav" aria-label="スマートフォンのメニュー">${navHtml(mobileNav,page==="condition"?"home":["record","record-start","record-review","record-course","record-rof","record-more","record-compare","record-reflection","record-environment","measurement"].includes(page)?"record-start":page,true)}</nav></div>${onboardingState.open?onboardingView():""}${gpsConsentMarkup}`;
 if(page==="consultation"){
  consultationExperience.mountConsultation(app.querySelector('#runload-consultation'),consultationExperience.consultationSources({
   manual:manualRunStore.readManualRuns(onboardStorage),gps:gpsStore.readGpsRuns(),conditions:homeExperience.readConditions(onboardStorage)
  }));
 }
 if(page==="result"){
   const params=new URLSearchParams(location.hash.split("?")[1]||"");
   if(params.has('gps')){
    const v2id=params.get('gps');
    const saved=gpsV2Cache.ok?gpsV2Cache.records.find(r=>r.id===v2id):null;
    const host=app.querySelector('#runload-result-v4');
    if(saved)resultExperience.mountResult(host,{}, {gpsSummary:saved});
    else host.innerHTML='<div class="gd-empty">指定されたGPS記録がありません。</div>';
   }else{
   const stored=manualRunStore.readManualRuns(onboardStorage);
   const recent=stored.ok?stored.records.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null:null;
   // An invalid explicit ID never silently displays a different run.
   const runId=params.has("record")?params.get("record"):selectedRunId||recent?.id||null;
   const found=manualRunStore.findManualRun(onboardStorage,runId);
   const record=found.ok?found.record:null;
   resultExperience.mountResult(app.querySelector("#runload-result-v4"),record?.draft||{},record?{
    saved:true,recordId:record.id,record,compareRecords:stored,compareId:params.has('compare')?params.get('compare'):undefined,showCompare:params.get('view')==='compare',
    onAssignGait:gait=>{
     const changed=manualRunStore.classifySavedManualRun(onboardStorage,record.id,gait);
     state.toast=changed.ok?'活動種別を保存しました。文献の適用範囲内で参考値を更新しました。':changed.reason;
     render();
    }
   }:{});
   }
 }
 if(page==="dynamic-result"){
  const id=new URLSearchParams(location.hash.split("?")[1]||"").get("record");
  void gpsV2.readGpsV2Detail(id).then(saved=>{
   const currentId=new URLSearchParams(location.hash.split("?")[1]||"").get("record");
   if(currentPage()!=="dynamic-result"||id!==currentId)return;
   const host=app.querySelector("[data-gps-dynamic]");
   if(!host)return;
   if(!saved.ok){host.innerHTML=`<p class="gd-empty">${esc(saved.reason)}</p>`;return;}
   dynamicPlayback=gpsDynamic.mountGpsDynamicResult(host,saved.summary,saved.detail);
  }).catch(()=>{const host=app.querySelector("[data-gps-dynamic]");if(host)host.textContent="動的結果を読み込めませんでした";});
 }
 if(page==="measurement"){
   measurementExperience.updateMeasurementDom(app.querySelector("[data-gps-live-page]"),ensureGps().state,ensureGps().elapsed());
 }
 if(page==="simulation"){
   const panel=app.querySelector("[data-sim-page]");
   simulationExperience.bindSimulation(panel,simulationUi);
   panel?.addEventListener("sim-redraw",()=>{const y=window.scrollY;render();window.scrollTo(0,y);});
 }
 if(page==="history"){
   const saved=manualRunStore.readManualRuns(onboardStorage);
   if(!saved.ok){
     const alert=document.createElement("p");
     alert.setAttribute("role","alert");alert.className="toast-notice";
     alert.textContent=saved.reason;
     app.querySelector("#runload-history-v2")?.before(alert);
   }
   const gpsSaved=gpsStore.readGpsRuns();
   const gpsPanel=document.createElement('section');gpsPanel.className='gps-history-section';
   gpsPanel.innerHTML=`<h2>GPSで測定した記録</h2><p>位置情報は保存時に同意した記録のみ保管します。12部位の身体モデルとは別の測定事実です。</p>${!gpsSaved.ok?`<p role="alert">${esc(gpsSaved.reason)}</p>`:gpsSaved.records.length?gpsSaved.records.slice().reverse().map(r=>`<article class="gps-history-item"><span><strong>${esc(r.date)}｜${esc(gpsCore.GPS_ACTIVITY[r.activity])}</strong><small>${r.distanceKm.toFixed(2)} km ・ ${gpsCore.formatGpsClock(r.activeSeconds*1000)} ・ ${r.track.length?(r.trackSimplified?'軌跡保存あり（形状は間引き済み）':'軌跡保存あり'):'軌跡は保存していません'}</small></span><div>${r.track.length>=2?`<button type="button" data-gps-use="${esc(r.id)}">コースを試す</button>`:''}<button type="button" data-gps-delete="${esc(r.id)}">削除</button></div>${pendingGpsDelete===r.id?`<aside><span>このGPS記録を端末から削除しますか？</span><button data-gps-confirm-delete="${esc(r.id)}">削除を確定</button><button data-gps-cancel-delete>キャンセル</button></aside>`:''}</article>`).join(''):'<div class="gps-history-empty">GPS実走の保存記録はまだありません。</div>'}`;
   if(gpsV2Cache.ok){
    const recent=gpsV2Cache.records.slice().reverse();
    const markup=recent.length?recent.map(r=>`<article class="gps-history-item"><span><strong>${esc(r.date)}｜${esc(gpsCore.GPS_ACTIVITY[r.activity])}</strong><small>${r.distanceKm.toFixed(2)} km ・ ${gpsCore.formatGpsClock(r.activeSeconds*1000)} ・ ${r.detailSaved?(r.activity==='MIXED'?'コース保存あり（動的結果は対象外）':'動的結果データあり'):'概要のみ'}</small></span><div><a class="btn soft" href="#/result?gps=${encodeURIComponent(r.id)}">結果を見る</a>${r.detailSaved?`<button data-gps-v2-use="${esc(r.id)}">コースを試す</button>`:""}<button data-gps-v2-delete="${esc(r.id)}">削除</button></div></article>`).join(''):'<p class="lead">まだ新形式のGPS記録はありません。</p>';
    gpsPanel.insertAdjacentHTML('beforeend','<section class="gps-v2-history"><h3>GPS動的結果対応の記録</h3>'+markup+'</section>');
   }
   gpsPanel.insertAdjacentHTML('beforeend',`<div class="gps-history-backup"><h3>GPS動的結果（新形式）のバックアップ</h3><p>従来のGPSバックアップとは別に保存します。位置情報を含む場合があり、暗号化されません。</p><div class="gps-history-backup-actions"><button data-gps-v2-backup-export type="button">新形式の記録を書き出す</button><label>新形式のバックアップを読み込む<input data-gps-v2-backup-file type="file" accept=".json,application/json"></label></div>${gpsV2BackupNotice?`<p role="status" class="gps-history-backup-notice">${esc(gpsV2BackupNotice)}</p>`:''}${pendingGpsV2Backup?`<div class="gps-history-backup-confirm"><p>${pendingGpsV2Backup.count}件（詳細保存 ${pendingGpsV2Backup.detailCount}件）を検証しました。</p><button data-gps-v2-backup-confirm type="button">新形式の復元を確定</button><button data-gps-v2-backup-cancel type="button">キャンセル</button></div>`:''}</div>`);
   gpsPanel.insertAdjacentHTML('beforeend',`<div class="gps-history-backup"><h3>GPS記録のバックアップ</h3><p>位置情報を含む未暗号化のJSONファイルを端末に保存・復元できます。ファイルの保管場所に注意してください。外部サービスには送信しません。</p><div class="gps-history-backup-actions"><button type="button" data-gps-backup-export>GPS記録をファイルに保存</button><label>バックアップを読み込む<input data-gps-backup-file type="file" accept=".json,application/json"></label></div>${gpsBackupNotice?`<p role="status" class="gps-history-backup-notice">${esc(gpsBackupNotice)}</p>`:''}${pendingGpsBackup?`<div class="gps-history-backup-confirm"><p>GPS記録 ${pendingGpsBackup.count}件（軌跡あり ${pendingGpsBackup.routeCount}件）を検証しました。重複はスキップし、異なる内容の同じIDがある場合は復元を中止します。</p><button type="button" data-gps-backup-confirm>復元を確定</button><button type="button" data-gps-backup-cancel>キャンセル</button></div>`:''}</div>`);
   gpsPanel.insertAdjacentHTML('beforeend',`<div class="gps-history-capacity"><h3>端末の保存状況</h3><p>このサイト全体（GPS以外の記録・キャッシュを含む）のブラウザーによる概算です。保存容量に余裕があっても消去される場合があります。</p><div data-gps-capacity-status role="status">${gpsCapacity?(gpsCapacity.ok?(gpsCapacity.percent===null?'容量の割合は取得できません':`サイト全体の使用率 ${gpsCapacity.percent}%／使用 ${gpsCapacity.usageMiB} MiB・上限目安 ${gpsCapacity.quotaMiB} MiB`)+`。永続化：${gpsCapacity.persistent===true?'許可済み':gpsCapacity.persistent===false?'未許可':'確認できません'}。`+(gpsCapacity.warning?'容量不足に注意してください。バックアップを推奨します。':''):esc(gpsCapacity.reason)):'容量は未確認です'}</div><div class="gps-history-backup-actions"><button type="button" data-gps-capacity-check>容量を確認</button><button type="button" data-gps-persist-request>保存領域の永続化を依頼</button></div>${gpsCapacityNotice?`<p role="status" class="gps-history-capacity-notice">${esc(gpsCapacityNotice)}</p>`:''}<p>永続化はブラウザーが拒否する場合があり、端末故障・手動削除からは保護されません。</p>${gpsStorageHealth.sharedGithubPagesOrigin(location.href)?'<p class="gps-history-origin-warning">注意：GitHub Pagesのプロジェクトは同じオリジンの他アプリと保存領域を共有します。GPSデータを分離するには専用ドメイン等で独立したオリジンが必要です。</p>':''}</div>`);
   app.querySelector('#runload-history-v2')?.after(gpsPanel);
   historyExperience.mountHistory(app.querySelector("#runload-history-v2"),{
    records:manualRunStore.toHistoryRows(saved),connected:saved.ok,ui:historyUi,
    onOpen:id=>{selectedRunId=id;location.hash="#/result?record="+encodeURIComponent(id);}
   });
   const historyHeading=app.querySelector('#runload-history-v2')?.shadowRoot?.querySelector('.topline');
   if(historyHeading){
     const shortcut=document.createElement('button');shortcut.type='button';shortcut.className='gps-history-shortcut';
     shortcut.textContent=`GPS実走記録 ${gpsSaved.ok?gpsSaved.records.length:'—'}件を見る`;
     shortcut.style.cssText='border:1px solid #499dac;background:#143f51;color:#d6ffff;border-radius:11px;padding:9px 12px;font-weight:750;font-size:.76rem;cursor:pointer';
     shortcut.addEventListener('click',()=>gpsPanel.scrollIntoView({block:'start',behavior:'smooth'}));
     historyHeading.append(shortcut);
   }
 }
 if(page==="condition"){
   const strip=app.querySelector("[data-cj-chart]");
   if(strip)strip.scrollLeft=conditionUi.scrollLeft===null?strip.scrollWidth:conditionUi.scrollLeft;
 }
 document.body.classList.toggle("runload-dialog-open",Boolean(app.querySelector("[data-home-overlay],[data-gps-overlay],[data-gps-consent-overlay]")));
 if(page==="home"&&homeUi.conditionOpen)homeExperience.updateSleepForm(app.querySelector("[data-condition-form]"));
 if(page==="record-compare")gaitExperience.paintGait(app.querySelector("[data-g4-page]"),state.recordDraft);
 if(page==="record-environment")environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),state.recordDraft,environmentUi);
 if(["record-rof","record-more"].includes(page)){
  const rofEditor=app.querySelector(".rof-editor-details");if(rofEditor)rofEditor.open=state.rofEditorOpen;
  for(const id of state.recordOpenSections){const el=app.querySelector('.record-extra-section[data-record-section="'+id+'"]');if(el)el.open=true}
 }
 if(page==="exploration-tree")explorationExperience.updatePace(app);
 if(page==="home"&&homeEditState.editing){
  stopHomeDrag=dashboardDrag.bindHomeDashboardDrag(app.querySelector(".dashboard-custom-grid"),{
   onDrop:({sourceId,targetId,after})=>{
    if(!homeEditState.editing||!homeEditState.draft)return;
    const oldOrder=homeEditState.draft.order.join("|");
    homeEditState.draft=dashboardPrefs.moveHomeDashboardWidget(homeEditState.draft,sourceId,targetId,after);
    if(homeEditState.draft.order.join("|")!==oldOrder){
      const y=window.scrollY;
      homeEditState.notice="";
      render();
      window.scrollTo(0,y);
    }
   }
  });
 }
}
  const refreshDataSettings=()=>{
    const openNames=[...app.querySelectorAll('.s2-item[open]')].map(node=>node.querySelector('summary strong')?.textContent);
    render();
    app.querySelectorAll('.s2-item').forEach(node=>{if(openNames.includes(node.querySelector('summary strong')?.textContent))node.open=true;});
  };
  const downloadDataFile=(text)=>{
    const blob=new Blob([text],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url;anchor.download="運動記録バックアップ-"+new Date().toISOString().slice(0,10)+".json";
    document.body.append(anchor);anchor.click();anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  app.addEventListener("change",async(event)=>{
    const portable=event.target.closest('[data-dm-file]');
    if(portable){
      const file=portable.files?.[0];dataUi.pendingText="";dataUi.preview=null;dataUi.safetyCopy=false;
      if(file){
        if(file.size>dataManagement.PORTABLE_MAX_BYTES){dataUi.notice="80MB以内のJSONファイルを選択してください。";}
        else{
          try{
            const text=await file.text(),plan=await dataManagement.preflightPortableRestore(onboardStorage,text);
            if(plan.ok){dataUi.pendingText=text;dataUi.preview=plan;dataUi.notice="ファイルを検証しました。対象の内容を確認してください。";}
            else dataUi.notice=plan.reason;
          }catch{dataUi.notice="バックアップファイルを安全に確認できませんでした。";}
        }
      }
      refreshDataSettings();return;
    }
    if(event.target.matches('[data-dm-include-gps]')){dataUi.includeGps=event.target.checked;return;}
    if(event.target.matches('[data-dm-safety]')){
      dataUi.safetyCopy=event.target.checked;
      const button=app.querySelector('[data-dm-restore]');
      if(button)button.disabled=!(dataUi.preview?.ok&&(!dataUi.preview.hasExisting||dataUi.safetyCopy));
      return;
    }
    if(event.target.matches('[data-dm-delete-agree]')){
      dataUi.deleteAgreed=event.target.checked;
      const button=app.querySelector('[data-dm-delete-confirm]');
      if(button)button.disabled=!(dataUi.deleteAgreed&&dataUi.deleteWord==="削除");
      return;
    }
     const v2BackupFile=event.target.closest('[data-gps-v2-backup-file]');
     if(v2BackupFile){
      const file=v2BackupFile.files?.[0];pendingGpsV2Backup=null;gpsV2BackupNotice='';
      if(!file){render();return;}
      if(file.size>50_000_000){gpsV2BackupNotice='バックアップは50MB以内にしてください';render();return;}
      try{
       const text=await file.text(),checked=gpsV2.inspectGpsV2Backup(text);
       if(!checked.ok)gpsV2BackupNotice=checked.reason;
       else{pendingGpsV2Backup={text,count:checked.count,detailCount:checked.detailCount};gpsV2BackupNotice='検証が完了しました。復元する場合は確定してください。';}
      }catch{gpsV2BackupNotice='バックアップを読み取れませんでした';}
      render();return;
     }
     const backupFile=event.target.closest('[data-gps-backup-file]');
     if(backupFile){
       const file=backupFile.files?.[0];pendingGpsBackup=null;gpsBackupNotice="";
       if(!file){render();return;}
       if(file.size>gpsStore.GPS_BACKUP_MAX_CHARS){gpsBackupNotice='バックアップは50MB以下のJSONファイルを選んでください';render();return;}
       try{
         const text=await file.text(),checked=gpsStore.inspectGpsBackup(text);
         if(!checked.ok)gpsBackupNotice=checked.reason;
         else{pendingGpsBackup={text,count:checked.count,routeCount:checked.routeCount};gpsBackupNotice='読み込んだ記録を検証しました。復元前に内容を確認してください。';}
       }catch{gpsBackupNotice='GPSバックアップファイルを読み取れませんでした';}
       render();return;
     }
    if(event.target.matches('[data-gps-flag-note]')){
      ensureGps().setFlagNote(event.target.dataset.gpsFlagNote,event.target.value);return;
    }
    if(event.target.matches('[data-gps-keep-awake]')){ensureGps().setKeepScreenAwake(!!event.target.checked);return;}
    if(event.target.matches('[data-gps-activity]')){const gps=ensureGps();gps.setActivity(event.target.value);const y=window.scrollY;render();window.scrollTo(0,y);return;}
    if(event.target.matches('[data-gps-goal-mode]')){ensureGps().setGoalMode(event.target.value);const y=window.scrollY;render();window.scrollTo(0,y);return;}
    if(event.target.matches('[data-gps-goal-value]')){ensureGps().setGoalValue(event.target.value);return;}
    if(event.target.matches('[data-gps-segment]')){ensureGps().setSegment(event.target.value);const y=window.scrollY;render();window.scrollTo(0,y);return;}
    if(event.target.matches("[data-onboard-purpose]"))onboardingState.purpose=event.target.value;
    if(event.target.matches("[data-cj-method],[data-cj-focus]")){
      if(event.target.matches("[data-cj-method]"))conditionUi.method=event.target.value;
      else conditionUi.focus=event.target.value;
      conditionUi.selected="";conditionUi.scrollLeft=null;
      const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    if(event.target.matches("[data-interpret-date]")){
      lifeCompareUi[event.target.dataset.interpretDate]=event.target.value;
      const y=window.scrollY;render();window.scrollTo(0,y);
    }
  });
  const reportSettingsNotice=(message)=>{
    settingsUi.notice=message;
    const page=app.querySelector('[data-settings-v2]');if(!page)return;
    let notice=page.querySelector('.s2-notice');
    if(!notice){notice=document.createElement('p');notice.className='s2-notice';notice.setAttribute('role','status');page.querySelector('.s2-heading')?.after(notice)}
    notice.textContent=message;
  };
  app.addEventListener("input",(event)=>{
    if(event.target.matches('[data-dm-delete-word]')){
      dataUi.deleteWord=event.target.value;
      const button=app.querySelector('[data-dm-delete-confirm]');
      if(button)button.disabled=!(dataUi.deleteAgreed&&dataUi.deleteWord==="削除");
      return;
    }
    if(event.target.matches('[data-gps-goal-value]')){ensureGps().setGoalValue(event.target.value);return;}
    if(event.target.matches("[data-ex-search]")){
      const input=event.target,caret=input.selectionStart;
      explorationUi.search=input.value;
      const list=app.querySelector(".ex-catalog-grid");
      if(list)list.innerHTML=explorationExperience.catalogCards(CATEGORIES,input.value);
      return;
    }
    if(event.target.matches("[data-ex-life]")){
      const y=window.scrollY;explorationUi[event.target.dataset.exLife==="a"?"lifeA":"lifeB"]=event.target.value;render();window.scrollTo(0,y);return;
    }
    if(event.target.matches("[data-ex-distance],[data-ex-minutes]")){explorationExperience.updatePace(app);return;}
    const target=event.target,ui=state.recordCourseUi,d=state.recordDraft;
    if(target.matches('.hx-time-control input[type=time]')){
      const visual=target.closest('.hx-time-control')?.querySelector('[data-time-display]');
      if(visual)visual.textContent=target.value||"時刻を選択";
    }
    const sleepForm=target.closest("[data-condition-form]");
    if(sleepForm&&(target.matches('[name="bedTime"],[name="wakeTime"],[name="durationHours"],[name="durationMinutes"],[name="bedDayRule"]'))){
      homeExperience.updateSleepForm(sleepForm);
      return;
    }
    if(target.matches(".rl-date-control input[type=date]")){
      const visual=target.closest(".rl-date-control")?.querySelector("[data-date-display]");
      if(visual)visual.textContent=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(target.value)?target.value.replaceAll("-","/"):"日付を選択";
    }
    if(target.matches("[data-rv-slope-number],[data-rv-slope-range]")){
      const key=ui.slope==="down"?"downPercent":"upPercent",other=key==="upPercent"?"downPercent":"upPercent";
      const cap=100-(d[other]===""?0:Number(d[other]));
      if(target.value==="")d[key]="";
      else if(Number.isFinite(Number(target.value)))d[key]=String(Math.max(0,Math.min(cap,Math.round(Number(target.value)))));
      ui.notice="";
      const oldError=app.querySelector(".rv-error");if(oldError)oldError.remove();
      if(target.value!==d[key])target.value=d[key];
      const direct=app.querySelector("[data-rv-slope-number]"),slide=app.querySelector("[data-rv-slope-range]");
      if(direct&&direct!==target)direct.value=d[key];if(slide&&slide!==target)slide.value=d[key]===""?0:d[key];
      for(const [k,v] of [["up",d.upPercent],["down",d.downPercent],["flat",recordExperience.derivedFlat(d)]]){
        const el=app.querySelector('[data-rv-slope-tile="'+k+'"] b');if(el)el.textContent=v===null||v===""?"—":v+"%";
      }
      const sumSlope=app.querySelector("[data-rv-summary-slope]");if(sumSlope)sumSlope.textContent=recordExperience.courseSummary(d,ui).slope;
      const barUp=app.querySelector(".rv-mix-up"),barDown=app.querySelector(".rv-mix-down");
      if(barUp)barUp.style.width=(d.upPercent===""?0:Number(d.upPercent))+"%";
      if(barDown)barDown.style.width=(d.downPercent===""?0:Number(d.downPercent))+"%";
      return;
    }
    if(target.matches("[data-rv-surface-range],[data-rv-surface-value]")){
      const k=target.dataset.rvSurfaceRange||target.dataset.rvSurfaceValue;
      d["surface"+k]=target.value===""?"":String(Math.max(0,Math.min(100,Number(target.value))));ui.notice="";
      const oldError=app.querySelector(".rv-error");if(oldError)oldError.remove();
      const direct=app.querySelector('[data-rv-surface-value="'+k+'"]'),slide=app.querySelector('[data-rv-surface-range="'+k+'"]');
      if(direct&&direct!==target)direct.value=d["surface"+k];if(slide&&slide!==target)slide.value=d["surface"+k]||0;
      const selected=ui.surfaceSelected,total=selected.reduce((sum,key)=>sum+(d['surface'+key]===""?0:Number(d['surface'+key])),0);
      const ok=selected.length>=2&&selected.every(key=>d['surface'+key]!==""&&Number(d['surface'+key])>0)&&Math.abs(total-100)<.001;
      const sumSurface=app.querySelector("[data-rv-summary-surface]");if(sumSurface)sumSurface.textContent=recordExperience.courseSummary(d,ui).surface;
      const totalEl=app.querySelector('[data-rv-surface-total]'),warn=app.querySelector('[data-rv-surface-warning]');
      if(totalEl){totalEl.textContent='合計 '+total+'% / 100%';totalEl.className=ok?'rv-ok':'rv-invalid';}
      if(warn){warn.textContent=ok?'割合の合計は100%です。':'選択した路面の割合を合計100%にしてください。';warn.className='rv-hint '+(ok?'rv-ok':'rv-invalid');}
      return;
    }
    if(event.target.matches("[data-draft]")){
      state.recordDraft[event.target.dataset.draft]=event.target.value;
      if(event.target.closest("[data-g4-page]"))gaitExperience.paintGait(app.querySelector("[data-g4-page]"),state.recordDraft);
      if(event.target.closest("[data-e4-page]"))environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),state.recordDraft,environmentUi);
      if(event.target.closest("[data-cx-page]")){
        const k=event.target.dataset.draft;
        const count=app.querySelector(`[data-counter="${k}"]`);
        if(count)count.textContent=`${event.target.value.length}/${k==="shoeName"?120:500}`;
      }
    }
    if(event.target.matches("[data-onboard-nickname]"))onboardingState.nickname=event.target.value;
    if(event.target.matches("[data-onboard-height]"))onboardingState.heightCm=event.target.value;
    if(event.target.matches("[data-onboard-weight]"))onboardingState.weightKg=event.target.value;
    if(event.target.matches("[data-rof-v4-range]")){
      rofExperience.setRofScore(rofUi,state.recordDraft,event.target.value);
      rofExperience.reflectRofPage(app,state.recordDraft,rofUi);
      return;
    }
    if(event.target.matches("[data-rof-input]")){
      const key=event.target.dataset.rofInput,value=Number(event.target.value);
      if(!rofScale.isValidRofJ(value))return;
      state.recordDraft[key]=value;
      const box=event.target.closest("[data-rof-entry]");
      if(box){
        box.querySelector("[data-rof-output]").textContent=String(value);
        box.querySelector("[data-rof-description]").textContent=rofScale.guidanceForRofJ(value);
        box.querySelector("[data-rof-clear]").disabled=false;
        const summary=app.querySelector('[data-rof-summary-'+(key==="rofBefore"?"before":"after")+']');if(summary)summary.textContent=String(value);
      }
    }
  });
  app.addEventListener("change",(event)=>{
    if(event.target.matches("[data-onboard-terms],[data-onboard-privacy]")){
      if(event.target.hasAttribute("data-onboard-terms"))onboardingState.termsAccepted=event.target.checked;
      else onboardingState.privacyConfirmed=event.target.checked;
      const advance=app.querySelector("[data-onboard-next]");if(advance)advance.disabled=!(onboardingState.termsAccepted&&onboardingState.privacyConfirmed);
      return;
    }
    if(event.target.matches('[data-condition-form] [name="date"]')){
      if(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(event.target.value)){
        homeUi.conditionDate=event.target.value;render();
      }
      return;
    }
    if(event.target.matches('[data-condition-form] [name="bedDayRule"]')){
      homeExperience.updateSleepForm(event.target.closest("[data-condition-form]"));
      return;
    }
    if(!event.target.matches("[data-draft]"))return;
    const key=event.target.dataset.draft,value=event.target.value;state.recordDraft[key]=value;
    const container=event.target.closest(".record-editor, .record-v3");
    if(!container||!["gradeMode","surfaceMode","runningFormat"].includes(key))return;
    const attr=key==="gradeMode"?"data-grade-submode":key==="surfaceMode"?"data-surface-submode":"data-running-format";
    container.querySelectorAll("["+attr+"]").forEach(node=>node.hidden=node.getAttribute(attr)!==value);
  });
  app.addEventListener("submit",(event)=>{
    const profileForm=event.target.closest('[data-settings-profile-form]');
    if(profileForm){
      event.preventDefault();
      const fields=Object.fromEntries(new FormData(profileForm).entries());
      const stored=settingsExperience.saveProfile(onboardStorage,fields);
      if(stored.ok){settingsUi.profile=stored.value;onboardingState.nickname=stored.value.nickname;onboardingState.purpose=stored.value.purpose;onboardingState.heightCm=String(stored.value.heightCm??'');onboardingState.weightKg=String(stored.value.weightKg??'');reportSettingsNotice('プロフィールをこの端末に保存しました。');}
      else reportSettingsNotice(stored.message);
      return;
    }
    const form=event.target.closest("[data-condition-form]");
    if(!form)return;
    event.preventDefault();
    const fields=new FormData(form);
    const result=homeExperience.conditionEntryFromForm({
      date:String(fields.get("date")||""),feeling:String(fields.get("feeling")||""),
      memo:String(fields.get("memo")||""),sleepMode:String(fields.get("sleepMode")||""),
      bedTime:String(fields.get("bedTime")||""),wakeTime:String(fields.get("wakeTime")||""),
      bedDayRule:String(fields.get("bedDayRule")||"auto"),
      durationHours:String(fields.get("durationHours")??""),durationMinutes:String(fields.get("durationMinutes")??"")
    });
    const saved=result.ok?homeExperience.saveCondition(homePreferenceStorage,result.entry):result;
    if(!saved.ok){
      const msg=form.querySelector("[data-sleep-error]");
      if(msg){msg.hidden=false;msg.textContent=saved.reason;}return;
    }
    homeEditState.notice="生活記録を保存しました";
    homeUi.preview=false;homeUi.conditionOpen=false;
    render();
  });
  app.addEventListener("click",async(event)=>{
    const dataAction=event.target.closest('[data-dm-export],[data-dm-restore],[data-dm-delete-confirm]');
    if(dataAction){
      if(dataUi.busy)return;
      dataUi.busy=true;
      try{
        if(dataAction.hasAttribute('data-dm-export')){
          const result=await dataManagement.exportPortableBackup(onboardStorage,{includeGps:dataUi.includeGps});
          if(!result.ok)dataUi.notice=result.reason;
          else{
            try{downloadDataFile(result.text);dataUi.notice="ファイルの保存を開始しました。端末のダウンロード先を確認してください。";}
            catch{dataUi.notice="ファイルを保存できませんでした。ブラウザの設定を確認してください。";}
          }
        }else if(dataAction.hasAttribute('data-dm-restore')){
          if(!dataUi.preview?.ok||!dataUi.pendingText||(dataUi.preview.hasExisting&&!dataUi.safetyCopy))return;
          const restored=await dataManagement.restorePortableBackup(onboardStorage,dataUi.pendingText);
          if(restored.ok){location.reload();return;}
          dataUi.notice=restored.reason;
          if(restored.partial){dataUi.preview=null;dataUi.pendingText="";}
        }else if(dataAction.hasAttribute('data-dm-delete-confirm')){
          if(!dataUi.deleteAgreed||dataUi.deleteWord!=="削除")return;
          const removed=await dataManagement.removeAllPortableData(onboardStorage);
          if(removed.ok){location.reload();return;}
          dataUi.notice=removed.reason;
        }
      }catch{dataUi.notice="操作を完了できませんでした。記録の状態を確認してください。";}
      finally{dataUi.busy=false;}
      refreshDataSettings();return;
    }
    const showLegal=event.target.closest("[data-onboard-document],[data-legal-open]");
    if(showLegal){const kind=showLegal.dataset.onboardDocument||showLegal.dataset.legalOpen;
      if(kind==="terms"||kind==="privacy"){
        app.querySelector(".fu-doc-backdrop")?.remove();
        app.insertAdjacentHTML("beforeend",firstUseExperience.renderLegalDocumentModal(kind));
        app.querySelector(".fu-doc-scroll")?.focus();
      }return;
    }
    if(event.target.closest("[data-legal-dismiss]")){app.querySelector(".fu-doc-backdrop")?.remove();return;}
    const manualGait=event.target.closest("[data-manual-gait]");
    if(manualGait&&currentPage()==='record'){
      const gait=manualGait.dataset.manualGait;
      if(['RUNNING','JOGGING','WALK'].includes(gait)){
       state.recordDraft.activityGait=gait;
       const y=window.scrollY;render();window.scrollTo(0,y);
      }
      return;
    }
    const reviewGait=event.target.closest("[data-review-gait]");
    if(reviewGait&&currentPage()==='record-review'){
     const gait=reviewGait.dataset.reviewGait;
     if(['RUNNING','JOGGING','WALK'].includes(gait)){
      state.recordDraft.activityGait=gait;
      const y=window.scrollY;render();window.scrollTo(0,y);
     }
     return;
    }
    if(event.target.closest("[data-manual-run-save]")){
      if(state.recordReviewSource!=="manual"||state.recordType!=="run"){
        manualSaveNotice="手入力の走行記録以外は保存できません";render();return;
      }
      const saved=manualRunStore.saveManualRun(onboardStorage,state.recordDraft,{source:state.recordReviewSource,type:state.recordType});
      if(!saved.ok){manualSaveNotice=saved.reason;const y=window.scrollY;render();window.scrollTo(0,y);return;}
      selectedRunId=saved.record.id;manualSaveNotice="";state.recordReviewReturn=false;
      state.toast="手入力の走行記録をこの端末に保存しました";
      location.hash="#/result?record="+encodeURIComponent(saved.record.id);
      return;
    }
    const conditionControl=event.target.closest("[data-cj-range],[data-cj-day],[data-cj-save-insight],[data-cj-delete-insight],[data-cj-create-intent]");
    if(conditionControl){
      const y=window.scrollY;
      if(conditionControl.hasAttribute("data-cj-range")){
        conditionUi.days=Number(conditionControl.dataset.cjRange);conditionUi.selected="";conditionUi.scrollLeft=null;
      }else if(conditionControl.hasAttribute("data-cj-day")){
        conditionUi.scrollLeft=app.querySelector("[data-cj-chart]")?.scrollLeft??null;
        conditionUi.selected=conditionControl.dataset.cjDay;
      }else if(conditionControl.hasAttribute("data-cj-create-intent")){
        const conditions=homeExperience.readConditions(onboardStorage);
        const data=conditionJourney.prepareConditionJourney(conditions,{...conditionUi,selected:conditionControl.dataset.cjOrigin});
        const existing=actionIntentStore.loadIntent(onboardStorage);
        const result=!existing.ok?{ok:false,reason:existing.reason}:existing.intent?{ok:false,reason:"次回確認がすでに保存されています。ホームで確認事項を整理してから登録してください"}:data.selected?.date===conditionControl.dataset.cjOrigin?actionIntentStore.createLifeIntent(onboardStorage,data.selected):{ok:false,reason:"基準記録を確認できません"};
        conditionUi.notice=result.ok?"次回の確認事項をホームに保存しました":result.reason;
      }else if(conditionControl.hasAttribute("data-cj-save-insight")){
        conditionUi.scrollLeft=app.querySelector("[data-cj-chart]")?.scrollLeft??null;
        const note=conditionControl.closest(".cj-write")?.querySelector("[data-cj-note]")?.value||"";
        const result=conditionInsights.addConditionInsight(onboardStorage,homeExperience.readConditions(onboardStorage),conditionControl.dataset.cjOrigin,note);
        conditionUi.notice=result.ok?"気づきを保存しました":result.reason;
      }else{
        const result=conditionInsights.removeConditionInsight(onboardStorage,conditionControl.dataset.cjDeleteInsight);
        conditionUi.notice=result.ok?"気づきを削除しました":result.reason;
      }
      render();window.scrollTo(0,y);return;
    }
    const lifeAction=event.target.closest("[data-interpret-save-intent],[data-interpret-mark-reviewed],[data-interpret-pause],[data-interpret-resume],[data-interpret-delete]");
    if(lifeAction){
      const old=actionIntentStore.loadIntent(onboardStorage);
      if(!old.ok){lifeCompareUi.notice=old.reason;render();return;}
      let result;
      if(lifeAction.hasAttribute("data-interpret-save-intent")){
        const baseline=interpretationRules.latestEligibleLifeBaseline(homeExperience.readConditions(onboardStorage));
        result=actionIntentStore.createLifeIntent(onboardStorage,baseline);
      }else if(lifeAction.hasAttribute("data-interpret-delete"))result=actionIntentStore.updateIntent(onboardStorage,null);
      else if(old.intent){
        const newStatus=lifeAction.hasAttribute("data-interpret-pause")?"paused":lifeAction.hasAttribute("data-interpret-resume")?"active":"reviewed";
        result=actionIntentStore.updateIntent(onboardStorage,{...old.intent,status:newStatus});
      }else result={ok:false,reason:"保存された確認事項がありません"};
      lifeCompareUi.notice=result.ok?"確認事項を更新しました":result.reason;
      const y=window.scrollY;render();window.scrollTo(0,y);return;
    }
    const setting=event.target.closest('[data-settings-text],[data-settings-motion]');
    if(setting){
      const key=setting.hasAttribute('data-settings-text')?'textSize':'motion';
      const value=setting.dataset[key==='textSize'?'settingsText':'settingsMotion'];
      const updated={...settingsUi.display,[key]:value};
      const saved=settingsExperience.saveDisplay(onboardStorage,updated);
      if(saved.ok){settingsUi.display=saved.value;settingsExperience.applyDisplay(settingsUi.display,document.documentElement);
        setting.parentElement?.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el===setting)));
        reportSettingsNotice('表示設定を保存しました。');
      }else reportSettingsNotice(saved.message);
      return;
    }
    const gpsCapacityAction=event.target.closest('[data-gps-capacity-check],[data-gps-persist-request]');
    if(gpsCapacityAction){
      if(gpsCapacityAction.hasAttribute('data-gps-persist-request')){
        const requested=await gpsStorageHealth.requestGpsStoragePersistence();
        gpsCapacityNotice=requested.ok?requested.message:requested.reason;
      }else gpsCapacityNotice='';
      gpsCapacity=await gpsStorageHealth.readGpsOriginStorage();
      render();return;
    }
    const v2BackupAction=event.target.closest('[data-gps-v2-backup-export],[data-gps-v2-backup-confirm],[data-gps-v2-backup-cancel]');
    if(v2BackupAction){
     if(v2BackupAction.hasAttribute('data-gps-v2-backup-export')){
      const result=await gpsV2.exportGpsV2Backup();
      if(result.ok){
       try{
        const blob=new Blob([result.text],{type:'application/json;charset=utf-8'});
        const url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='runload-gps-v2-backup-'+new Date().toISOString().slice(0,10)+'.json';
        document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
        gpsV2BackupNotice='新形式のバックアップをダウンロードしました。保存先を確認してください。';
       }catch{gpsV2BackupNotice='バックアップファイルを生成できませんでした';}
      }else gpsV2BackupNotice=result.reason;
     }else if(v2BackupAction.hasAttribute('data-gps-v2-backup-cancel')){
      pendingGpsV2Backup=null;gpsV2BackupNotice='復元を取り消しました';
     }else if(pendingGpsV2Backup){
      const result=await gpsV2.importGpsV2Backup(pendingGpsV2Backup.text);
      pendingGpsV2Backup=null;
      gpsV2BackupNotice=result.ok?`新形式のGPS記録を${result.added}件復元しました。`:result.reason;
      gpsV2Cache=await gpsV2.readGpsV2Summaries();
     }
     render();return;
    }
    const gpsBackupAction=event.target.closest('[data-gps-backup-export],[data-gps-backup-confirm],[data-gps-backup-cancel]');
    if(gpsBackupAction){
      if(gpsBackupAction.hasAttribute('data-gps-backup-export')){
        const result=gpsStore.exportGpsBackup();
        if(!result.ok){gpsBackupNotice=result.reason;render();return;}
        try{
          const file=new Blob([result.text],{type:'application/json;charset=utf-8'});
          const url=URL.createObjectURL(file),anchor=document.createElement('a');
          anchor.href=url;anchor.download='runload-gps-backup-'+new Date().toISOString().slice(0,10)+'.json';
          document.body.append(anchor);anchor.click();anchor.remove();
          setTimeout(()=>URL.revokeObjectURL(url),30000);
          gpsBackupNotice='ファイルの保存を開始しました。端末のダウンロード先を確認してください。';
        }catch{gpsBackupNotice='GPSバックアップのファイルを生成できませんでした';}
      }else if(gpsBackupAction.hasAttribute('data-gps-backup-cancel')){
        pendingGpsBackup=null;gpsBackupNotice='GPSバックアップの復元を取り消しました';
      }else if(pendingGpsBackup){
        const result=await gpsStore.importGpsBackup(pendingGpsBackup.text);
        pendingGpsBackup=null;
        gpsBackupNotice=result.ok?`GPS記録 ${result.added}件を復元しました（重複 ${result.skipped}件）。`:result.reason;
      }
      render();return;
    }
    const gpsUse=event.target.closest('[data-gps-use]');
    if(gpsUse){simulationUi.source='gps';simulationUi.gpsId=gpsUse.dataset.gpsUse;location.hash='#/simulation';return;}
    const gpsDelete=event.target.closest('[data-gps-delete],[data-gps-confirm-delete],[data-gps-cancel-delete]');
    if(gpsDelete){if(gpsDelete.hasAttribute('data-gps-cancel-delete'))pendingGpsDelete='';else if(gpsDelete.hasAttribute('data-gps-delete'))pendingGpsDelete=gpsDelete.dataset.gpsDelete;else if(pendingGpsDelete===gpsDelete.dataset.gpsConfirmDelete){const res=await gpsStore.removeGpsRun(pendingGpsDelete);state.toast=res.ok?'GPS記録を削除しました':res.reason;pendingGpsDelete='';}render();return;}
    const gpsConsentChoice=event.target.closest('[data-gps-consent-confirm],[data-gps-consent-cancel]');
    if(gpsConsentChoice){
      const pending=gpsConsentAction;
      gpsConsentAction="";
      if(gpsConsentChoice.hasAttribute('data-gps-consent-confirm')&&currentPage()==='measurement'){
        const gps=ensureGps();
        if(pending==='start'&&gps.state.phase==='ready'){
          // Capture optional profile body mass only when measurement begins.
          // A later profile edit must not retroactively change this session.
          const mass=settingsExperience.loadProfile(onboardStorage).weightKg;
          gps.setBodyMassKg(typeof mass==='number'?mass:null);
          gps.start();
        }
        if(pending==='resume'&&gps.state.phase==='paused')gps.resume();
        refreshGpsTicker();if(gps.state.phase==='running')void requestGpsWakeLock();render();
      }else{
        render();app.querySelector(pending==='resume'?'[data-gps-action="resume"]':'[data-gps-action="start"]')?.focus();
      }
      return;
    }
    const gpsV2Use=event.target.closest('[data-gps-v2-use]');
    if(gpsV2Use){
     const saved=await gpsV2.readGpsV2Detail(gpsV2Use.dataset.gpsV2Use);
     if(!saved.ok){state.toast=saved.reason;render();return;}
     const feature=gpsV2.gpsV2DetailToFeature(saved.summary,saved.detail);
     if(!feature){state.toast='コースを読み込めませんでした';render();return;}
     simulationUi.source='gps';simulationUi.gpsId=saved.summary.id;
     simulationUi.gpsFeature=feature;simulationUi.distance=String(feature.distanceKm);
     location.hash='#/simulation';return;
    }
    const gpsV2Delete=event.target.closest('[data-gps-v2-delete],[data-gps-v2-confirm-delete],[data-gps-v2-cancel-delete]');
    if(gpsV2Delete){
      if(gpsV2Delete.hasAttribute('data-gps-v2-delete')){
       if(!confirm('このGPS記録を削除しますか？'))return;
       const done=await gpsV2.deleteGpsV2Run(gpsV2Delete.dataset.gpsV2Delete);
       gpsV2Cache=await gpsV2.readGpsV2Summaries();
       state.toast=done.ok?'GPS記録を削除しました':done.reason;render();
      }
      return;
    }
    const gpsAction=event.target.closest('[data-gps-action]');
    if(gpsAction){
      const gps=ensureGps(),action=gpsAction.dataset.gpsAction;
      if(action==='start'){
        if(!window.isSecureContext){gps.state.notice='GPS計測はHTTPSで開いてください';render();return;}
        if(gps.state.phase==='ready'){gpsConsentAction='start';render();app.querySelector('[data-gps-consent-confirm]')?.focus();return;}
      }else if(action==='flag'){gps.addFlag();}
      else if(action==='pause'){gps.pause();releaseGpsWakeLock();}
      else if(action==='resume'){
        if(gps.state.phase==='paused'){gpsConsentAction='resume';render();app.querySelector('[data-gps-consent-confirm]')?.focus();return;}
      }
      else if(action==='finish'){gps.finish();releaseGpsWakeLock();}
      else if(action==='discard'){gps.discard();releaseGpsWakeLock();gpsController=null;location.hash='#/record-start';return;}
      else if(action==='save'){
        const saveRoute=!!app.querySelector('[data-gps-save-route]')?.checked;
        const local=new Date(),date=`${local.getFullYear()}-${String(local.getMonth()+1).padStart(2,'0')}-${String(local.getDate()).padStart(2,'0')}`;
        const saved=await gpsV2.saveGpsV2Run(gps.getSnapshot(),{saveDetails:saveRoute,date});
        if(saved.ok){gpsV2Cache=await gpsV2.readGpsV2Summaries();state.toast='GPS実走の記録を端末に保存しました';gpsController=null;location.hash='#/result?gps='+encodeURIComponent(saved.summary.id);return;}
        gps.state.notice=saved.reason;
      }
      refreshGpsTicker();render();return;
    }
    const ui=state.recordCourseUi,d=state.recordDraft;
    const courseButton=event.target.closest('[data-course-save],[data-course-save-new],[data-course-use],[data-course-delete],[data-course-confirm-delete],[data-course-cancel-delete]');
    if(courseButton){
      const key=courseButton.dataset;
      const current=coursePresets.readCoursePresets(onboardStorage);
      const refresh=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
      if(key.courseCancelDelete!==undefined){ui.pendingDelete='';refresh();return;}
      if(key.courseDelete){ui.pendingDelete=key.courseDelete;ui.notice='';refresh();return;}
      if(key.courseConfirmDelete){
        if(ui.pendingDelete!==key.courseConfirmDelete){ui.notice='削除対象を再確認してください';refresh();return;}
        const result=coursePresets.deleteCoursePreset(onboardStorage,key.courseConfirmDelete);
        if(result.ok){if(ui.selectedPresetId===key.courseConfirmDelete)ui.selectedPresetId='';ui.notice='保存したコースを削除しました。現在の入力内容や走行記録は変更されません';}
        else ui.notice=result.reason;
        ui.pendingDelete='';refresh();return;
      }
      if(key.courseUse){
        const found=current.ok?current.records.find(r=>r.id===key.courseUse):null;
        const applied=coursePresets.applyCoursePreset(d,found);
        if(!applied.ok){ui.notice=current.ok?applied.reason:current.reason;refresh();return;}
        state.recordDraft=applied.draft;
        state.recordCourseUi={...applied.ui,selectedPresetId:found.id,pendingDelete:'',notice:'「'+found.data.courseName+'」を今回のコースとして読み込みました'};
        refresh();return;
      }
      const saving=coursePresets.saveCoursePreset(onboardStorage,d,ui,key.courseSaveNew!==undefined?'':(ui.selectedPresetId||''));
      if(saving.ok){ui.selectedPresetId=saving.preset.id;ui.pendingDelete='';ui.notice='「'+saving.preset.data.courseName+'」を保存しました';}
      else ui.notice=saving.reason;
      refresh();return;
    }
    const bodyRoot=event.target.closest('[data-cx-page]');
    if(bodyRoot){
      const obj=event.target.closest('[data-map-view],[data-region-focus],[data-confirm-id],[data-picker-id],[data-unselect],[data-picker-toggle],[data-clear-all],[data-append-name],[data-apply]');
      if(obj){
        if(obj.matches('[data-map-view]')) bodyExperience.setView(bodyUi,obj.dataset.mapView);
        else if(obj.matches('[data-region-focus]'))bodyExperience.focusRegion(bodyUi,obj.dataset.regionFocus);
        else if(obj.matches('[data-confirm-id]'))bodyExperience.toggleRegion(bodyUi,obj.dataset.confirmId);
        else if(obj.matches('[data-picker-id]')){
          bodyExperience.focusRegion(bodyUi,obj.dataset.pickerId);
          bodyExperience.toggleRegion(bodyUi,obj.dataset.pickerId);
          bodyUi.pickerOpen=true;
        }
        else if(obj.matches('[data-unselect]'))bodyExperience.toggleRegion(bodyUi,obj.dataset.unselect);
        else if(obj.matches('[data-picker-toggle]'))bodyUi.pickerOpen=!bodyUi.pickerOpen;
        else if(obj.matches('[data-clear-all]'))bodyExperience.clearSelected(bodyUi);
        else if(obj.matches('[data-append-name]'))bodyExperience.addRegionNamesToNote(d,bodyUi);
        else if(obj.matches('[data-apply]')){location.hash=state.recordReviewReturn?'#/record-review':'#/record';return;}
        const y=window.scrollY;render();window.scrollTo(0,y);
        if(obj.matches('[data-region-focus]'))app.querySelector(`[data-region-focus="${obj.dataset.regionFocus}"]`)?.focus({preventScroll:true});
        return;
      }
    }
    const weather=event.target.closest("[data-e4-weather]");
    if(weather){environmentExperience.toggleWeather(environmentUi,weather.dataset.e4Weather);environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),d,environmentUi);return;}
    const flag=event.target.closest("[data-e4-flag]");
    if(flag){environmentExperience.toggleFlag(environmentUi,flag.dataset.e4Flag);environmentExperience.paintEnvironment(app.querySelector("[data-e4-page]"),d,environmentUi);return;}
    if(event.target.closest("[data-e4-done]")&&environmentExperience.temperatureError(d.temperatureC)){event.preventDefault();return;}
    const gaitSource=event.target.closest("[data-g4-source]");
    if(gaitSource){d.stepsProvenance=gaitSource.dataset.g4Source;gaitExperience.paintGait(app.querySelector("[data-g4-page]"),d);return;}
    const gaitKind=event.target.closest("[data-g4-gait]");
    if(gaitKind){d.activityGait=gaitKind.dataset.g4Gait;gaitExperience.paintGait(app.querySelector("[data-g4-page]"),d);return;}
    const gaitFormat=event.target.closest("[data-g4-format]");
    if(gaitFormat){d.runningFormat=gaitFormat.dataset.g4Format;gaitExperience.paintGait(app.querySelector("[data-g4-page]"),d);return;}
    if(event.target.closest("[data-g4-apply]")){
      const check=gaitExperience.gaitValidation(d);
      if(check.valid){location.hash=state.recordReviewReturn?"#/record-review":"#/record";render();}
      return;
    }
    const drawRecord=()=>{const y=window.scrollY;render();window.scrollTo(0,y)};
    const grade=event.target.closest("[data-rv-grade]");
    if(grade){d.gradeMode=grade.dataset.rvGrade;ui.notice="";drawRecord();return;}
    const slopeTile=event.target.closest("[data-rv-slope-tile]");
    if(slopeTile&&slopeTile.dataset.rvSlopeTile!=="flat"){ui.slope=slopeTile.dataset.rvSlopeTile;drawRecord();return;}
    const slopeStep=event.target.closest("[data-rv-step]");
    if(slopeStep){
      const own=ui.slope==="down"?"downPercent":"upPercent",other=own==="upPercent"?"downPercent":"upPercent";
      const old=d[own]===""?0:Number(d[own]),max=100-(d[other]===""?0:Number(d[other]));
      d[own]=String(Math.max(0,Math.min(max,old+Number(slopeStep.dataset.rvStep))));ui.notice="";drawRecord();return;
    }
    const surfaceMode=event.target.closest("[data-rv-surface-mode]");
    if(surfaceMode){d.surfaceMode=surfaceMode.dataset.rvSurfaceMode;ui.notice="";drawRecord();return;}
    const surface=event.target.closest("[data-rv-surface]");
    if(surface){const k=surface.dataset.rvSurface;
      if(d.surfaceMode==="SINGLE")d.primarySurface=k;
      else if(d.surfaceMode==="MIXED")ui.surfaceSelected=ui.surfaceSelected.includes(k)?ui.surfaceSelected.filter(x=>x!==k):[...ui.surfaceSelected,k];
      ui.notice="";drawRecord();return;
    }
    if(event.target.closest("[data-rv-add]")){if(ui.sections<5){ui.sections++;ui.notice="";drawRecord()}return;}
    const remove=event.target.closest("[data-rv-remove]");
    if(remove){const n=Number(remove.dataset.rvRemove);
      if(n>=0&&n<ui.sections){for(let i=n;i<ui.sections-1;i++)for(const stem of ["sectionShare","sectionDirection","sectionGrade","sectionSurface"])d[stem+i]=d[stem+(i+1)];
      const last=ui.sections-1;d["sectionShare"+last]="";d["sectionDirection"+last]="FLAT";d["sectionGrade"+last]="";d["sectionSurface"+last]="UNKNOWN";ui.sections--;ui.notice="";drawRecord()}return;
    }
    if(event.target.closest("[data-rv-apply]")){
      const err=recordExperience.courseReadiness(d,ui);
      if(err.length){ui.notice=err.join(" ");drawRecord();return;}
      ui.notice="";location.hash=currentPage()==="course"?"#/record":"#/record";return;
    }
    const pick=event.target.closest("[data-duration-minute]");
    if(pick){
      const form=pick.closest("[data-condition-form]");
      const input=form.querySelector('[name="durationMinutes"]');
      input.value=String(Number(pick.dataset.durationMinute));
      homeExperience.updateSleepForm(form);
      return;
    }
    const modeButton=event.target.closest("[data-sleep-mode]");
    if(modeButton){
      const form=modeButton.closest("[data-condition-form]");
      form.querySelector('[name="sleepMode"]').value=modeButton.dataset.sleepMode;
      homeExperience.updateSleepForm(form);
      return;
    }
    if(event.target.closest("[data-home-preview]")){homeUi.preview=!homeUi.preview;render();return;}
    if(event.target.closest("[data-condition-open]")){homeUi.conditionDate=homeExperience.todayLocal();homeUi.conditionOpen=true;homeUi.achievementOpen=false;render();return;}
    if(event.target.closest("[data-achievement-open]")){homeUi.achievementOpen=true;homeUi.conditionOpen=false;render();return;}
    if(event.target.closest("[data-home-close]")||(event.target.matches("[data-home-overlay]"))){homeUi.conditionOpen=false;homeUi.achievementOpen=false;render();return;}
    if(event.target.closest("[data-onboard-open]")){onboardingState.open=true;onboardingState.replay=true;onboardingState.step=2;onboardingState.error="";render();return;}
    if(event.target.closest("[data-onboard-close]")){if(onboardingState.replay){onboardingState.open=false;onboardingState.replay=false;render();}return;}
    if(event.target.closest("[data-onboard-back]")){onboardingState.step=Math.max(onboardingState.replay?2:0,onboardingState.step-1);onboardingState.error="";render();return;}
    if(event.target.closest("[data-onboard-skip-guide]")&&onboardingState.open&&!onboardingState.replay&&onboardingState.step>=2&&onboardingState.step<=6){onboardingState.step=7;onboardingState.error="";render();return;}
    if(event.target.closest("[data-onboard-skip-profile]")&&onboardingState.step===7){finishOnboarding();return;}
    if(event.target.closest("[data-onboard-next]")){
      if(onboardingState.step===1){
        if(!onboardingState.termsAccepted||!onboardingState.privacyConfirmed)return;
        const accepted=legalDocuments.saveLegalConsent(onboardStorage);
        if(!accepted.ok){onboardingState.error=accepted.message;render();return;}
        if(onboardingState.reconsentOnly){onboardingState.reconsentOnly=false;finishOnboarding();return;}
      }
      if(onboardingState.step<7){onboardingState.step+=1;onboardingState.error="";render();return;}
      const savedProfile=settingsExperience.saveProfile(onboardStorage,{nickname:onboardingState.nickname,purpose:onboardingState.purpose,heightCm:onboardingState.heightCm,weightKg:onboardingState.weightKg,ageBand:onboardingState.ageBand});
      if(!savedProfile.ok){onboardingState.error=savedProfile.message;render();return;}
      settingsUi.profile=savedProfile.value;finishOnboarding();return;
    }
    const homeEdit=event.target.closest("[data-home-edit]");
    if(homeEdit){homeEditState.notice="";if(homeEditState.editing){homeEditState.editing=false;homeEditState.draft=null}else{homeEditState.editing=true;homeEditState.draft=dashboardPrefs.copyHomeDashboardLayout(homePreferenceState.layout)}render();return}
    if(event.target.closest("[data-home-cancel]")){homeEditState.editing=false;homeEditState.draft=null;homeEditState.notice="";render();return}
    if(event.target.closest("[data-home-reset]")){homeEditState.draft=dashboardPrefs.defaultHomeDashboardLayout();homeEditState.notice="";render();return}
    if(event.target.closest("[data-home-save]")){
      const saved=dashboardPrefs.saveHomeDashboardLayout(homePreferenceStorage,homeEditState.draft);
      if(saved.ok){homePreferenceState.layout=dashboardPrefs.copyHomeDashboardLayout(homeEditState.draft);homeEditState.editing=false;homeEditState.draft=null;homeEditState.notice="ホームの表示を保存しました"}
      else homeEditState.notice=saved.reason;
      render();return;
    }
    const widgetAction=event.target.closest("[data-widget-action]");
    if(widgetAction&&homeEditState.editing){
      const y=window.scrollY;
      homeEditState.draft=dashboardPrefs.editHomeDashboardLayout(homeEditState.draft,widgetAction.dataset.widgetAction,widgetAction.dataset.widgetId);
      homeEditState.notice="";render();window.scrollTo(0,y);return;
    }
    const region=event.target.closest("[data-region]");
    const sheetExpand=event.target.closest("[data-sheet-expand]");
    if(sheetExpand){const y=window.scrollY;state.sheetExpanded=!state.sheetExpanded;render();window.scrollTo(0,y);return}
    const sheetToggle=event.target.closest("[data-sheet-toggle]");
    if(sheetToggle){const y=window.scrollY;state.sheetVisible=!state.sheetVisible;render();window.scrollTo(0,y);return}
    const exploreSelect=event.target.closest("[data-ex-category]");
    if(exploreSelect){
      const id=exploreSelect.dataset.exCategory,c=CATEGORIES.find(c=>c.id===id);
      if(c){explorationUi.selected=id;explorationUi.topic=exploreSelect.dataset.exPickTopic||c.topics[0]||"";explorationUi.tab="field";explorationUi.notice="";render();
        if(matchMedia("(max-width:900px)").matches)app.querySelector(".ex-focus")?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":"smooth"});}
      return;
    }
    const exploreTopic=event.target.closest("[data-ex-topic]");
    if(exploreTopic){
       const before=exploreTopic.closest('.ex-topic-set');
       const oldLeft=before?.scrollLeft||0;
       explorationUi.topic=exploreTopic.dataset.exTopic;explorationUi.followup="";
       render();
       const rail=app.querySelector('.ex-topic-set'),active=rail?.querySelector('.ex-topic.is-picked');
       if(rail&&active){
         const r=rail.getBoundingClientRect(),b=active.getBoundingClientRect();
         rail.scrollLeft=Math.max(0,oldLeft+b.left-r.left-(r.width-b.width)/2);
       }
       return;
     }
    const exploreTab=event.target.closest("[data-ex-tab]");
    if(exploreTab){explorationUi.tab=exploreTab.dataset.exTab;explorationUi.notice="";render();return;}
    const bodyChoice=event.target.closest("[data-ex-body]");
    if(bodyChoice){const y=window.scrollY;explorationUi.bodyChoice=bodyChoice.dataset.exBody;render();window.scrollTo(0,y);return;}
    const slopeChoice=event.target.closest("[data-ex-slope]");
    if(slopeChoice){const y=window.scrollY;explorationUi.toolChoice=slopeChoice.dataset.exSlope;render();window.scrollTo(0,y);return;}
    const nextChoice=event.target.closest("[data-ex-next]");
    if(nextChoice){explorationReturnAction="note";const prompts={"02|足・膝・股関節":["次は走るときの股関節の動きを意識してみたい","足首の動きについてもう少し調べたい"],"03|上り坂・下り坂":["次は上りと下りで感じ方を確かめたい","坂道のある日とない日の記録を見比べたい"],"05|睡眠":["次は起床時の調子も記録してみたい","睡眠の記録を数日分見返してみたい"]};const options=prompts[explorationUi.selected+"|"+explorationUi.topic]||[];explorationUi.followup=options[Number(nextChoice.dataset.exNext)]||"";explorationUi.modal="note";render();app.querySelector("#ex-note")?.focus();return;}
    const exploreAction=event.target.closest("[data-ex-action]");
    if(exploreAction){
      const action=exploreAction.dataset.exAction;
      if(action==="close"){explorationUi.modal="";render();restoreExplorationFocus();return;}
      if(action==="catalog"){explorationUi.tab="catalog";render();return;}
      if(action==="sample"){explorationUi.sample=!explorationUi.sample;render();return;}
      if(action==="save-note"){
        const result=explorationExperience.saveNote(explorationUi,app.querySelector("#ex-note")?.value);
        explorationUi.notice=result.ok?"書いたことを保存しました":result.reason;if(result.ok)explorationUi.followup="";
        if(result.ok)explorationUi.modal="";
        render();if(result.ok)restoreExplorationFocus();return;
      }
      if(action==="copy"){
        const value=app.querySelector("[data-ex-draft-text]")?.innerText||"";
        if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>{const n=app.querySelector(".ex-dialog");if(n){const p=document.createElement("p");p.setAttribute("role","status");p.textContent="コピーしました";n.appendChild(p);}}).catch(()=>{const n=app.querySelector(".ex-dialog");if(n){const p=document.createElement("p");p.setAttribute("role","alert");p.textContent="コピーできませんでした";n.appendChild(p);}})}
        return;
      }
      explorationReturnAction=action;
      explorationUi.modal=action;explorationUi.notice="";render();app.querySelector(".ex-dialog-head button")?.focus();return;
    }
    const exploreDelete=event.target.closest("[data-ex-delete]");
    if(exploreDelete){const success=explorationExperience.deleteNote(explorationUi,exploreDelete.dataset.exDelete);explorationUi.notice=success?"削除しました":"削除できませんでした。保存データは保護しています。";render();return;}
    if(region){const y=window.scrollY;state.region=region.dataset.region;render();window.scrollTo(0,y);return}
    const expandRegions=event.target.closest("[data-expand-regions]");
    if(expandRegions){const y=window.scrollY;state.mobileRegionsExpanded=!state.mobileRegionsExpanded;render();window.scrollTo(0,y);return}
    const mode=event.target.closest("[data-result-mode]");
    if(mode){const y=window.scrollY;state.resultMode=mode.dataset.resultMode;render();window.scrollTo(0,y);return}
    const openTopic=event.target.closest("[data-open-topic]");
    if(openTopic){const [cat,topic]=openTopic.dataset.openTopic.split("|");if(CATEGORIES.some(c=>c.id===cat&&c.topics.includes(topic))){explorationUi.selected=cat;explorationUi.topic=topic;explorationUi.tab="field";explorationUi.modal="";location.hash="#/exploration-tree";render();window.scrollTo(0,0)}return}
    const rofTab=event.target.closest("[data-rof-v4-phase]");
    if(rofTab){
      rofExperience.setRofPhase(rofUi,rofTab.dataset.rofV4Phase,state.recordDraft);
      rofExperience.reflectRofPage(app,state.recordDraft,rofUi);return;
    }
    const rofAnchor=event.target.closest("[data-rof-v4-anchor]");
    if(rofAnchor){
      rofExperience.focusRofAnchor(rofUi,Number(rofAnchor.dataset.rofV4Anchor));
      rofExperience.reflectRofPage(app,state.recordDraft,rofUi);return;
    }
    const rofStep=event.target.closest("[data-rof-v4-step]");
    if(rofStep){
      rofExperience.adjustRofScore(rofUi,state.recordDraft,Number(rofStep.dataset.rofV4Step));
      rofExperience.reflectRofPage(app,state.recordDraft,rofUi);return;
    }
    if(event.target.closest("[data-rof-v4-clear]")){
      rofExperience.clearRofScore(rofUi,state.recordDraft);
      rofExperience.reflectRofPage(app,state.recordDraft,rofUi);return;
    }
    const rofClear=event.target.closest("[data-rof-clear]");
    if(rofClear){const y=window.scrollY;state.recordDraft[rofClear.dataset.rofClear]=null;render();window.scrollTo(0,y);return}
    const feeling=event.target.closest("[data-feeling]");
    if(feeling){const y=window.scrollY;state.feeling=feeling.dataset.feeling;render();window.scrollTo(0,y);return}
    const type=event.target.closest("[data-record-type]");
    if(type){const y=window.scrollY;state.recordType=type.dataset.recordType;render();window.scrollTo(0,y);return}
    const day=event.target.closest("[data-history-day]");
    if(day){const y=window.scrollY;const n=Number(day.dataset.historyDay);state.historyDate=state.historyDate===n?null:n;render();window.scrollTo(0,y);return}
    if(event.target.closest("[data-history-clear]")){const y=window.scrollY;state.historyDate=null;render();window.scrollTo(0,y);return}
    const filter=event.target.closest("[data-history-mode]");
    if(filter){const y=window.scrollY;state.historyMode=filter.dataset.historyMode;render();window.scrollTo(0,y);return}
    if(event.target.closest("[data-demo-save]")){
      state.recordReviewSource="manual";
      state.recordReviewReturn=false;manualSaveNotice="";
      location.hash="#/record-review";
      render();window.scrollTo(0,0);return;
    }
    if(event.target.closest(".rr-date-edit")&&state.recordReviewSource==="gps"){
      state.recordReviewSource="manual";
      state.recordReviewReturn=false;
    }
    if(event.target.closest("[data-review-link]")){
      if(state.recordReviewSource==="gps")state.recordReviewSource="manual";
      state.recordReviewReturn=true;
    }
    if(event.target.closest(".rv-link"))state.recordReviewReturn=false;
    if(event.target.matches(".record-preview-overlay")||event.target.closest(".record-preview-dialog button[data-close-preview]")){state.recordPreviewOpen=false;render();return}
  });
  app.addEventListener("keydown",(event)=>{
    if(gpsConsentAction){
      if(event.key==="Escape"){event.preventDefault();const pending=gpsConsentAction;gpsConsentAction="";render();app.querySelector(pending==='resume'?'[data-gps-action="resume"]':'[data-gps-action="start"]')?.focus();return;}
      if(event.key==="Tab"){
        const dialog=app.querySelector('.gps-consent-dialog');
        const controls=[...dialog?.querySelectorAll('button:not([disabled])')||[]];
        if(controls.length){
          const first=controls[0],last=controls.at(-1);
          if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last.focus();return;}
          if(!event.shiftKey&&(document.activeElement===last||!dialog.contains(document.activeElement))){event.preventDefault();first.focus();return;}
        }
      }
    }
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-region-focus]")){
      event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}));return;
    }
    const explorationDialog=app.querySelector('.ex-dialog');
    if(explorationUi.modal&&explorationDialog){
      if(event.key==="Escape"){event.preventDefault();explorationUi.modal="";render();restoreExplorationFocus();return;}
      if(event.key==="Tab"){
        const items=[...explorationDialog.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
          .filter(el=>el.getClientRects().length>0);
        if(items.length){
          const first=items[0],last=items.at(-1),inside=explorationDialog.contains(document.activeElement);
          if(event.shiftKey&&(!inside||document.activeElement===first)){event.preventDefault();last.focus();return;}
          if(!event.shiftKey&&(!inside||document.activeElement===last)){event.preventDefault();first.focus();return;}
        }
      }
    }
    if(event.key==="Escape"&&(homeUi.conditionOpen||homeUi.achievementOpen)){homeUi.conditionOpen=false;homeUi.achievementOpen=false;render();return;}
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("path[data-region]")){event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  });
  const pauseGpsOnHidden=()=>{
    if(gpsController?.state.phase==='running'){
      gpsController.pause();
      gpsController.state.notice='画面の非表示・ロックを検知したためGPS測定を一時停止しました。再開には位置情報の使用確認が必要です。';
      refreshGpsTicker();
      measurementExperience.updateMeasurementDom(app.querySelector('[data-gps-live-page]'),gpsController.state,gpsController.elapsed());
    }
    releaseGpsWakeLock();
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGpsOnHidden();});
  window.addEventListener('pagehide',pauseGpsOnHidden);
  window.addEventListener("focus",async()=>{await gpsStore.reloadGpsRuns();gpsV2Cache=await gpsV2.readGpsV2Summaries();if(["history","simulation"].includes(currentPage()))render();});
  window.addEventListener("hashchange",()=>{
    gpsConsentAction="";
    if(currentPage()!=='measurement'&&gpsController?.state.phase==='running'){gpsController.pause();refreshGpsTicker();releaseGpsWakeLock();}
    // GPS saves and deletes show toast; do not immediately erase them on navigation.
    const retainedToast=state.toast;render();state.toast='';if(location.hash.includes("life=1"))app.querySelector("#interpret-life")?.scrollIntoView({block:"start",behavior:"instant"});else window.scrollTo(0,0)});
  render();
})();