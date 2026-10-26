(async function appMain(){
  "use strict";
  const {BODY_REGION_VIEWS}=await import("./assets/bodyRegionVisuals.js");
  const dashboardPrefs=await import("./ui/homeDashboardLayout.js");
  const dashboardDrag=await import("./ui/homeDashboardDrag.js");
  const homeExperience=await import("./ui/homeExperience.js");
  const rofScale=await import("./ui/rofJScale.js");
  const rofExperience=await import("./ui/rofExperience.js");
  const reviewDraft=await import("./ui/recordDraftReview.js");
  const recordReviewExperience=await import("./ui/recordReviewExperience.js");
  const recordExperience=await import("./ui/recordExperience.js");
  const gaitExperience=await import("./ui/gaitExperience.js");
  const environmentExperience=await import("./ui/environmentExperience.js");
  const bodyExperience=await import("./ui/bodyContextExperience.js?v=20261025-terminology-v1");
  const measurementExperience=await import("./ui/measurementExperience.js");
  const resultExperience=await import("./ui/resultExperience.js?v=20261025-result-v4-main-01");
  const historyExperience=await import("./ui/historyExperience.js?v=20261025-mobile-shell-01");
  const settingsExperience=await import("./ui/settingsExperience.js?v=20261025-settings-v4-01");
  const explorationExperience=await import("./ui/explorationExperience.js?v=20261026-explore-v14");
  const interpretationExperience=await import("./ui/interpretationView.js?v=20261026-interpret-v14");
  const interpretationRules=await import("./ui/interpretationRules.js?v=20261026-interpret-v14");
  const actionIntentStore=await import("./ui/actionIntentStore.js?v=20261026-interpret-v14");
  const conditionJourney=await import("./ui/conditionJourney.js?v=20261026-condition-v15");
  const conditionInsights=await import("./ui/conditionInsights.js?v=20261026-condition-v15");
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
  const state={region:"BA-DISP-023",resultMode:"all",mobileRegionsExpanded:false,mode:"today",category:"03",topic:"上り坂・下り坂",recordType:"run",feeling:"",recordDraft:{distance:"",hours:"",minutes:"",seconds:"",date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),memo:"",rofBefore:null,rofAfter:null,steps:"",stepsProvenance:"UNKNOWN",runningFormat:"UNKNOWN",runWalkRunningDistanceKm:"",runWalkRunningDurationMinutes:"",courseName:"",gradeMode:"UNKNOWN",upPercent:"",downPercent:"",upGradePercent:"",downGradePercent:"",surfaceMode:"UNKNOWN",primarySurface:"",temperatureC:"",environmentNote:"",bodyObservation:"",shoeName:"",...Object.fromEntries(Array.from({length:5},(_,i)=>[[`sectionShare${i}`,""],[`sectionDirection${i}`,"FLAT"],[`sectionGrade${i}`,""],[`sectionSurface${i}`,"UNKNOWN"]]).flat()),...Object.fromEntries(["paved","track","treadmill","soil","trail","naturalGrass","artificialTurf","sand"].map(k=>[`surface${k}`,""]))},recordPreviewOpen:false,recordReviewSource:"manual",recordReviewReturn:false,recordOpenSections:[],rofEditorOpen:false,treeZoom:1,treeScroll:null,historyMode:"all",historyDate:null,toast:"",sheetVisible:false,sheetExpanded:false};
  state.recordCourseUi=recordExperience.initialCourseUi(state.recordDraft);
  const homePreferenceStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const homePreferenceState=dashboardPrefs.loadHomeDashboardLayout(homePreferenceStorage);
  const homeEditState={editing:false,draft:null,notice:""};
  const homeUi={preview:false,conditionOpen:false,achievementOpen:false,conditionDate:homeExperience.todayLocal()};
  const measurementUi=measurementExperience.createMeasurementViewState();
  const historyUi=historyExperience.createHistoryUi();
  const explorationUi=explorationExperience.makeUi((()=>{try{return window.localStorage}catch{return null}})());
  const lifeCompareUi={a:"",b:"",open:false,notice:""};
  const conditionUi={days:30,method:"auto",focus:"all",selected:"",notice:"",scrollLeft:null};
  const environmentUi=environmentExperience.newEnvironmentUi();
  const bodyUi=bodyExperience.makeUi();
  const rofUi=rofExperience.createRofUiState();
  const onboardingKey="runload-v2-introduction-preview-v1";
  const onboardStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const loadIntro=()=>{try{return JSON.parse(onboardStorage?.getItem(onboardingKey)||"null")}catch{return null}};
  const introStored=loadIntro();
  const settingsUi={profile:settingsExperience.loadProfile(onboardStorage,introStored||{}),display:settingsExperience.loadDisplay(onboardStorage),notice:""};
  settingsExperience.applyDisplay(settingsUi.display,document.documentElement);
  const onboardingState={open:!introStored?.completed,step:0,language:"ja",nickname:settingsUi.profile.nickname,purpose:settingsUi.profile.purpose,heightCm:String(settingsUi.profile.heightCm??""),weightKg:String(settingsUi.profile.weightKg??""),ageBand:settingsUi.profile.ageBand};
  const pageLabels={home:"ホーム",record:"記録","record-start":"記録を始める","record-review":"記録内容の確認","record-course":"コース・走行条件","record-rof":"運動前後の疲労感","record-more":"追加情報","record-compare":"歩数・走り方","record-reflection":"身体・使用品・メモ","record-environment":"環境",result:"結果",history:"履歴","exploration-tree":"探究",settings:"設定",measurement:"測定",course:"コース設計",simulation:"シミュレーション",consultation:"相談・共有","body-part-detail":"部位詳細"};
  const desktopNav=[["home","⌂","ホーム"],["record","✎","記録"],["result","▥","結果"],["history","◷","履歴"],["exploration-tree","⚭","探究"],["settings","⚙","設定"]];
  const mobileNav=[["home","⌂","ホーム"],["record-start","✎","記録"],["exploration-tree","⚭","探究"],["history","◷","履歴"],["settings","⚙","設定"]];
  const currentPage=()=>{const path=location.hash.replace(/^#\/?/,"").split("?")[0];return pageLabels[path]?path:"home"};
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
 const cards={
  latest:homeExperience.latestCard(homeUi.preview),
  condition:homeExperience.conditionCard(homePreferenceStorage,homeUi.preview),
  topics:homeExperience.achievementCard(homeUi.preview),
  shortcuts:homeExperience.shortcutsCard(),
  trend:homeExperience.trendCard(homeUi.preview),
  discovery:homeExperience.discoveryCard()
 };
 const current=pref||dashboardPrefs.defaultHomeDashboardLayout();
 const widgets=current.order.map(id=>{
  const w=names.find(e=>e.id===id);
  const visible=current.visible.includes(id);
  if(!w||(!visible&&!editing))return "";
  const idx=current.order.indexOf(id);
  const editingControls=editing?`<div class="dashboard-widget-controls" role="group" aria-label="${esc(w.title)}の編集"><div class="widget-drag-title"><button type="button" class="widget-drag-handle" data-home-drag-handle aria-label="${esc(w.title)}を長押しして並べ替える" title="長押しして移動">⠿</button><span class="widget-edit-label">${esc(w.title)} ${!visible?"（非表示）":""}</span></div><div class="widget-edit-actions"><button type="button" data-widget-action="up" data-widget-id="${id}" ${idx===0?"disabled":""} aria-label="${esc(w.title)}を上へ">↑</button><button type="button" data-widget-action="down" data-widget-id="${id}" ${idx===current.order.length-1?"disabled":""} aria-label="${esc(w.title)}を下へ">↓</button><button type="button" data-widget-action="size" data-widget-id="${id}" aria-label="${esc(w.title)}のサイズ変更">${current.sizes[id]==="full"?"小さく":"横幅いっぱい"}</button><button type="button" data-widget-action="toggle" data-widget-id="${id}" aria-label="${esc(w.title)}を${visible?"隠す":"表示"}">${visible?"非表示":"追加"}</button></div></div>`:"";
  return `<div data-home-dashboard-id="${id}" class="dashboard-widget ${current.sizes[id]==="full"?"dashboard-widget--wide":"dashboard-widget--half"} ${!visible?"dashboard-widget--hidden":""}" ${editing?`data-home-editable="true"`:""}>${editingControls}<div class="dashboard-widget-content">${cards[id]||""}</div></div>`;
 }).join("");
 const controls=editing?`<section class="dashboard-edit-toolbar" role="group" aria-label="マイダッシュボードの編集"><div><strong>マイダッシュボードを編集</strong><p>ハンドルを長押しして移動できます。上下ボタン・表示・サイズ変更も使えます。変更の保存は手動です。</p></div><div class="dashboard-edit-buttons"><button type="button" class="btn" data-home-reset>初期配置に戻す</button><button type="button" class="btn" data-home-cancel>キャンセル</button><button type="button" class="btn primary" data-home-save ${!homePreferenceState.canSave?"disabled":""}>変更を保存</button></div></section>`:"";
 return `<div class="home-v3"><section class="home-head"><h1>ホーム</h1><div class="home-heading-actions">
 <button type="button" class="hx-preview-toggle" data-home-preview aria-pressed="${homeUi.preview}">${homeUi.preview?"表示例を終了":"表示例を見る"}</button>
 <button type="button" class="btn dashboard-edit-trigger" data-home-edit aria-pressed="${editing}" ${!homePreferenceState.canSave?"disabled":""}>${editing?"編集を終了":"編集"}</button>
 </div></section>
 ${homeUi.preview?'<div class="hx-preview-banner" role="status">表示例：走行・実績・睡眠はサンプルデータです。正式な記録として保存されません。</div>':""}
 ${homeEditState.notice?`<div class="dashboard-edit-notice" role="status">${esc(homeEditState.notice)}</div>`:""}
 ${!homePreferenceState.canSave?`<p class="dashboard-storage-warning" role="alert">${esc(homePreferenceState.reason)}</p>`:""}
 ${controls}
 <div class="dashboard-custom-grid ${editing?"dashboard-custom-grid--editing":""}" aria-label="マイダッシュボード">${widgets}</div>
  <div class="cj-home-shortcut"><a href="#/history?life=1">コンディションの歩みを見る</a></div>
  ${(()=>{const r=actionIntentStore.loadIntent(onboardStorage);const conditions=homeExperience.readConditions(onboardStorage);const insights=conditionInsights.loadConditionInsights(onboardStorage);return conditionJourney.renderHomeConditionFollowup(r.intent,conditions,insights,r.ok?"":r.reason,conditionUi.notice);})()}
 ${homeUi.conditionOpen?homeExperience.conditionPanel(homePreferenceStorage,homeUi.preview,homeUi.conditionDate):""}
 ${homeUi.achievementOpen?homeExperience.achievementPanel(homeUi.preview):""}
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
 <div class="record-rof-header"><div><p class="eyebrow">RATING OF FATIGUE</p><h2>ROF-J｜運動前後の疲労感 <span>任意</span></h2></div><span class="rof-label">0–10</span></div>
 <details class="rof-editor-details" data-rof-editor><summary class="rof-editor-summary"><span class="rof-summary-mark" aria-hidden="true">◉</span><span class="rof-summary-text"><strong>運動前後の疲労感を入力・確認</strong><small>運動前 <b data-rof-summary-before>${rofScale.isValidRofJ(state.recordDraft.rofBefore)?state.recordDraft.rofBefore:"—"}</b> ／ 運動後 <b data-rof-summary-after>${rofScale.isValidRofJ(state.recordDraft.rofAfter)?state.recordDraft.rofAfter:"—"}</b> （各0〜10）</small></span><span class="rof-summary-chevron" aria-hidden="true">⌄</span></summary><div class="rof-editor-body"><p class="rof-intro">今感じている疲れを数字で選びます。運動前と運動後は別々に入力してください。医学的な診断や走行可否の判断ではありません。</p>
 <div class="rof-anchor-guide" role="group" aria-label="著者確認済みROF-Jの5つの尺度目安">${anchors}</div>
 <div class="rof-entry-grid">${fields}</div>
 <details class="rof-rights"><summary>尺度・イラストの出典と利用条件</summary>
 <p>日本語の尺度表現：Suzuki &amp; Arai (2026)（CC BY-NC-ND 4.0）。配置は責任著者への確認に基づき原版ROFと同じ目安位置を使用。2と3の間・7と8の間は選択できる追加点数ではありません。</p>
 <p>図：Micklewright et al. (2017)（CC BY 4.0）。旧RunLoadに採用された切り抜き画像を変更せず利用。<a href="${rofScale.ROF_J_RIGHTS.scaleUrl}" target="_blank" rel="noopener">日本語尺度の原文</a> ／ <a href="${rofScale.ROF_J_RIGHTS.imagesUrl}" target="_blank" rel="noopener">図の出典</a> ／ <a href="${rofScale.ROF_J_RIGHTS.scaleLicense}" target="_blank" rel="noopener">日本語資料のライセンス</a> ／ <a href="${rofScale.ROF_J_RIGHTS.imagesLicense}" target="_blank" rel="noopener">図のライセンス</a></p>
 </details><p class="rof-unsaved-note">このv2では入力中の表示のみです。正式な走行記録にはまだ保存されません。</p></div></details>
 </section>`;
}
  function onboardingView(){
 const steps=[
  {title:"RunLoadへようこそ",eyebrow:"WELCOME",body:"走行・休養の記録と、身体の参考値を振り返るアプリです。現在のv2は画面と操作の検証段階です。",html:`<div class="onboard-preview-tiles"><span>◎<strong>GPS</strong><small>測定の入口</small></span><span>✎<strong>記録</strong><small>運動前後の疲れ</small></span><span>✦<strong>探究</strong><small>自分の問いを深める</small></span></div>`},
  {title:"言語を選ぶ",eyebrow:"LANGUAGE",body:"言語設定はあとから変更できます。現在の画面は日本語版のみ対応しています。",html:`<div class="onboard-language-options"><label class="is-selected"><input type="radio" name="onboard-language" value="ja" checked>日本語 <span>使用可能</span></label><label class="is-disabled"><input type="radio" name="onboard-language" disabled value="en">English <span>後日対応予定</span></label></div>`},
  {title:"利用規約とデータの扱い",eyebrow:"PRIVACY",body:"正式な利用規約・プライバシーポリシーはまだ確定していません。以下はUI確認用の案内であり、法的な同意の取得・記録ではありません。",html:`<div class="onboard-legal"><strong>現在のv2で扱う内容</strong><p>ホーム表示設定と希望者が入力した任意プロフィールは、このブラウザの保存領域にのみ保存します。現在のv2ではGPS測定・走行記録の正式保存は接続されていません。ROF-Jの既存イラストを表示する際には、旧RunLoadが管理するGitHub公開画像への通信が発生します。</p><p>位置情報の許可は、正式なGPS測定を開始する操作に合わせて確認する設計です。実装前に文面と導線を確定します。</p><small>正式な同意画面は規約の承認後に実装します。今は同意済みの扱いになりません。</small></div>`},
  {title:"共有用プロフィール（任意）",eyebrow:"YOUR PROFILE",body:"旧アプリの共有用プロフィールを参考に、最初の設定を用意しました。入力を省略しても進めます。記録や相談先への自動送信はしません。",html:`<div class="onboard-profile"><label>共有に使う表示名（任意）<input data-onboard-nickname maxlength="40" placeholder="未設定でも進めます" value="${esc(onboardingState.nickname)}"></label><label>RunLoadを使う目的（任意）<select data-onboard-purpose><option value="">まだ決めていない</option>${[["health","健康のため"],["record","ランニングの記録"],["learn","身体への理解"],["other","その他"]].map(([v,t])=>`<option value="${v}" ${onboardingState.purpose===v?"selected":""}>${t}</option>`).join("")}</select></label><div class="onboard-extra-profile"><label>身長（cm・任意）<input type="number" min="80" max="250" step="0.1" inputmode="decimal" data-onboard-height placeholder="スキップできます" value="${esc(onboardingState.heightCm)}"></label><label>体重（kg・任意）<input type="number" min="15" max="400" step="0.1" inputmode="decimal" data-onboard-weight placeholder="スキップできます" value="${esc(onboardingState.weightKg)}"></label></div><p>入力内容はこの端末のプロフィールに保存します。探究や測定への接続は今後行います。</p></div>`},
  {title:"始め方を確認",eyebrow:"QUICK TOUR",body:"まずGPS測定か手入力を選び、疲労感を振り返りましょう。探究では、分野を選んで知識や記録との接点を調べられます。",html:`<div class="onboard-tour"><div><b>1</b><span><strong>GPS／手入力を選択</strong><small>GPS測定は旧版エンジン接続後に利用可能</small></span></div><div><b>2</b><span><strong>運動前後の疲れを記録</strong><small>運動前後の0～10を別々に選択</small></span></div><div><b>3</b><span><strong>結果と探究を振り返る</strong><small>人体図・走りの記録・探究</small></span></div></div>`}
 ];
 const current=steps[onboardingState.step];
 return `<div class="onboard-overlay" data-onboard-overlay><section class="onboard-dialog" role="dialog" aria-modal="true" aria-labelledby="onboard-title"><div class="onboard-top"><strong>RunLoad</strong><span>初回案内・試作版</span><button type="button" data-onboard-close aria-label="案内を閉じる">×</button></div><div class="onboard-progress" aria-label="${onboardingState.step+1} / ${steps.length}">${steps.map((_,i)=>`<span class="${i<=onboardingState.step?"is-active":""}"></span>`).join("")}</div><div class="onboard-main"><p class="eyebrow">${current.eyebrow}</p><h2 id="onboard-title">${current.title}</h2><p class="onboard-description">${current.body}</p>${current.html}</div><div class="onboard-footer"><button type="button" class="btn" data-onboard-back ${onboardingState.step===0?"disabled":""}>戻る</button><span>${onboardingState.step+1} / ${steps.length}</span><button type="button" class="btn primary" data-onboard-next>${onboardingState.step===steps.length-1?"試用を始める":"次へ"}</button></div></section></div>`;
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
 <p class="record-extra-help">入力できる条件だけ記録できます。分からない場合は「不明」のままにしてください。コースの正式なライブラリ保存・GPX連携は未接続です。</p>
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
 <div class="record-extra-content"><p class="record-extra-help">身体の自覚情報はROF-Jや12部位の計算結果とは別に扱います。旧版の部位別詳細入力は、正式な保存契約を確認してから接続します。</p><label class="record-extra-field"><span>身体の気づき（自由記述）</span><textarea data-draft="bodyObservation" rows="2" maxlength="500" placeholder="気になった部位、違和感など">${field("bodyObservation")}</textarea></label><label class="record-extra-field"><span>今回のシューズ</span><input type="text" data-draft="shoeName" maxlength="120" placeholder="未入力" value="${field("shoeName")}"></label><label class="record-extra-field"><span>走行・休養時のメモ</span><textarea data-draft="memo" rows="3" maxlength="500" placeholder="自分が感じたことを記入">${field("memo")}</textarea></label></div></details>
 </div>`;
}
  function recordPreview(){
    if(!state.recordPreviewOpen)return "";
    const d=state.recordDraft,active=state.recordType==="run",v=reviewDraft.checkRecordDraft(d,active);
    const errors=[...v.errors];
    if(!d.date)errors.unshift("日付を入力してください");
    if(active&&(!d.distance||Number(d.distance)<=0||!d.minutes||Number(d.minutes)<=0))errors.unshift("距離と時間を入力してください");
    return `<div class="record-preview-overlay" data-close-preview><section class="record-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="record-preview-title"><h2 id="record-preview-title">入力内容の確認</h2>
      <p>正式な記録保存にはまだ接続していません。</p>
      <dl><dt>種類</dt><dd>${active?"走行":"休養"}</dd><dt>日付</dt><dd>${esc(d.date||"未入力")}</dd>${active?`<dt>距離</dt><dd>${esc(d.distance||"未入力")} km</dd><dt>時間</dt><dd>${esc(d.minutes||"未入力")} 分</dd><dt>コース</dt><dd>${esc(d.courseName||"未設定")}</dd><dt>ROF-J</dt><dd>${Number.isInteger(d.rofBefore)?d.rofBefore:"未入力"} → ${Number.isInteger(d.rofAfter)?d.rofAfter:"未入力"}</dd>`:""}<dt>メモ</dt><dd>${esc(d.memo||"未入力")}</dd></dl>
      ${errors.length||v.warnings.length?`<div class="record-review-alert" role="alert">${errors.map(t=>`<p class="is-error">${esc(t)}</p>`).join("")}${v.warnings.map(t=>`<p>${esc(t)}</p>`).join("")}</div>`:`<p class="record-review-success">入力形式に問題は検出されませんでした（正式保存・科学計算の検証ではありません）。</p>`}
      <button type="button" class="btn primary" data-close-preview>閉じる</button></section></div>`;
  }
  function record(){return recordExperience.manualPage(state);}
  function recordReview(){return recordReviewExperience.reviewView(state.recordDraft,{
    recordType:state.recordType,source:state.recordReviewSource,courseUi:state.recordCourseUi,bodySelected:bodyUi.selected
  });}
  function recordCourse(){return recordExperience.coursePage(state,state.recordCourseUi);}
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
    function history(){
      const show=lifeCompareUi.open||location.hash.includes("life=1");
      const conditions=homeExperience.readConditions(onboardStorage);
      const insights=conditionInsights.loadConditionInsights(onboardStorage);
      return '<section id="runload-history-v2" aria-label="履歴"></section><div class="iv-launch"><button type="button" data-interpret-toggle aria-expanded="'+String(show)+'">'+(show?'コンディションの歩みを閉じる':'コンディションの歩みを見る')+'</button></div>'+(show?conditionJourney.renderConditionJourney(conditions,conditionUi,insights):'');
    }
    function explore(){
      const conditions=homeExperience.readConditions(onboardStorage);
      return explorationExperience.render(explorationUi,{categories:CATEGORIES,draft:state.recordDraft,conditions});
    }
    function settings(){return settingsExperience.renderSettings(settingsUi);}
    function secondary(page){
 const title=pageLabels[page]||"その他";
 const top=`<section class="home-head"><div><h1>${esc(title)}</h1><p class="lead">${esc({measurement:"走る時間とルートを確かめる。",course:"走りたいコースを、自分で組み立てる。",simulation:"条件を変えて、参考値の違いを考える。",consultation:"記録を振り返り、必要な情報を整理する。","body-part-detail":"気になる部位を、過去の記録と照らし合わせる。"}[page]||"自分の記録を大切に扱う。")}</p></div></section>`;
 if(page==="measurement")return measurementExperience.measurementPage(measurementUi);
  if(page==="course")return top+`<section class="grid-2"><div class="card stack"><div class="section-title"><h2>コースの基本情報</h2></div><label class="field">コース名<input placeholder="コース名を入力"></label><div class="form-grid"><label class="field">距離（km）<input type="number" inputmode="decimal" placeholder="0.0"></label><label class="field">走る場所<select><option>屋外</option><option>室内</option></select></label></div><h3>路面の種類</h3><div class="form-grid"><label class="field">主要な路面<select><option>選択してください</option><option>舗装路</option><option>陸上トラック</option><option>土道・トレイル</option><option>天然芝</option><option>砂地</option></select></label><label class="field">坂の条件<select><option>選択してください</option><option>ほぼ平坦</option><option>上りがある</option><option>下りがある</option><option>上り・下りがある</option></select></label></div></div><div class="card stack"><h2>コースを確認する</h2><div class="route-large-empty"><div class="route-empty-icon">⌁</div><strong>位置情報の登録はありません</strong><p class="lead">GPSで測定した走行は、保存された軌跡がある場合にのみ地図へ表示します。</p></div>${buttonLink("measurement","測定へ")}</div></section>`;
 if(page==="simulation")return top+`<section class="grid-2"><div class="card stack"><h2>比較する条件</h2><div class="form-grid"><label class="field">距離（km）<input type="number" inputmode="decimal" value="8.2"></label><label class="field">時間（分）<input type="number" inputmode="decimal" value="45"></label><label class="field">傾斜<select><option>平坦</option><option>上り</option><option>下り</option></select></label><label class="field">路面<select><option>舗装路</option><option>トラック</option><option>天然芝</option><option>土道</option></select></label></div><div class="info-note">比較する条件を整理できます。利用可能なモデルにより、結果を表示できる範囲は異なります。</div></div><div class="card stack"><h2>比較結果</h2><div class="empty-state"><span style="font-size:2.5rem">▥</span><strong>条件の比較結果はありません</strong><p class="lead">比較可能な科学的根拠がある場合だけ、対応する値を表示します。</p></div>${buttonLink("result","結果へ戻る")}</div></section>`;
 if(page==="consultation")return top+`<section class="grid-2"><div class="card stack"><h2>自分の記録を整理する</h2><div class="info-note">共有する情報は、自分で選べます。個人の記録を自動送信しません。</div><label class="field">相談したい内容<textarea placeholder="気になっていることを整理する"></textarea></label><label class="field">共有する記録<select><option>記録を共有しない</option><option>今回の記録の概要</option></select></label></div><div class="card stack"><h2>相談するときの確認</h2><p class="lead">身体部位の参考値は医療診断ではありません。身体の違和感などがあるときは、必要な支援先に相談してください。</p>${buttonLink("result","結果へ")}</div></section>`;
 const cur=regionData(state.region);
 return top+`<section class="grid-2"><div class="card stack"><h2>${esc(cur.name===cur.friendly?cur.name:cur.name+"（"+cur.friendly+"）")}</h2><div class="detail-value">${valid(cur.value)?cur.value.toFixed(1):"—"}</div><div class="info-note">この部位自身の文献基準を100とした参考値であり、実測した身体負荷・傷害リスクではありません。</div><div class="chart-card">${historyChart(cur)}</div></div><div class="card stack"><h2>ほかの部位を見る</h2><div class="region-grid">${regionTiles()}</div>${buttonLink("result","全12部位へ戻る")}</div></section>`;
}
    let stopHomeDrag=null;
    function render(){
      if(stopHomeDrag){stopHomeDrag();stopHomeDrag=null;}
      const previousConditionStrip=app.querySelector("[data-cj-chart]");
      if(previousConditionStrip&&conditionUi.scrollLeft!==null)conditionUi.scrollLeft=previousConditionStrip.scrollLeft;
      const existingRof=app.querySelector(".rof-editor-details");if(existingRof)state.rofEditorOpen=existingRof.open;
      const openedRecordSections=app.querySelectorAll(".record-extra-section[open]");
      if(openedRecordSections.length||app.querySelector(".record-extra-section"))state.recordOpenSections=[...openedRecordSections].map(el=>el.dataset.recordSection);
 const page=currentPage(),content={home,record,"record-review":recordReview,result:()=>'<section id="runload-result-v4" aria-label="走行結果"></section>',history,"exploration-tree":explore,settings,"record-start":recordStart,"record-course":recordCourse,"record-rof":recordRof,"record-more":recordMore,"record-compare":recordCompare,"record-reflection":recordReflection,"record-environment":recordEnvironment}[page]?.()||secondary(page);
 const navPage=page==="result"?"result":page==="measurement"?"record":["record-review","record-course","record-rof","record-more","record-compare","record-reflection","record-environment"].includes(page)?"record":page;
 // Return links to the common confirmation when a detail was opened from that screen.
 const detailPages=["record-course","record-rof","record-more","record-compare","record-environment","record-reflection"];
 const detailContent=(state.recordReviewReturn&&detailPages.includes(page))
   ? content.replaceAll('href="#/record"','href="#/record-review"') : content;
 app.innerHTML=`<div class="app-shell"><aside class="sidebar"><nav class="side-nav" aria-label="メニュー">${navHtml(desktopNav,navPage,false)}</nav></aside><div class="main-frame"><header class="topbar"><div class="topbar-title" aria-hidden="true"></div><div class="topbar-right"><button type="button" class="icon-install" data-install-app aria-label="RunLoadをホーム画面に追加">⇩</button></div></header><main class="main-content">${state.toast?`<div class="toast-notice">${esc(state.toast)}</div>`:""}${detailContent}</main></div><nav class="mobile-nav" aria-label="スマートフォンのメニュー">${navHtml(mobileNav,["record","record-start","record-review","record-course","record-rof","record-more","record-compare","record-reflection","record-environment","measurement"].includes(page)?"record-start":page,true)}</nav></div>${onboardingState.open?onboardingView():""}`;
 if(page==="result")resultExperience.mountResult(app.querySelector("#runload-result-v4"),{}); // No saved-record selection: never treat an unsaved draft as a historical result.
 if(page==="history"){
   historyExperience.mountHistory(app.querySelector("#runload-history-v2"),{records:[],connected:false,ui:historyUi});
   const strip=app.querySelector("[data-cj-chart]");
   if(strip)strip.scrollLeft=conditionUi.scrollLeft===null?strip.scrollWidth:conditionUi.scrollLeft;
 }
 document.body.classList.toggle("runload-dialog-open",Boolean(app.querySelector("[data-home-overlay],[data-gps-overlay]")));
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
  app.addEventListener("change",(event)=>{
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
    if(event.target.matches("[data-ex-search]")){
      const input=event.target,caret=input.selectionStart;
      explorationUi.search=input.value;
      const list=app.querySelector(".ex-catalog-grid");
      if(list){const all=CATEGORIES.flatMap(c=>c.topics.map(t=>({c,t})));const q=input.value.trim().toLocaleLowerCase("ja");list.innerHTML=all.filter(x=>(x.c.name+x.t).toLocaleLowerCase("ja").includes(q)).map(x=>`<button type="button" data-ex-category="${esc(x.c.id)}" data-ex-pick-topic="${esc(x.t)}"><small>${esc(x.c.name)}</small><strong>${esc(x.t)}</strong><span aria-hidden="true">↗</span></button>`).join("")||"<p>該当するテーマがありません</p>";}
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
  app.addEventListener("click",(event)=>{
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
        const result=data.selected?.date===conditionControl.dataset.cjOrigin?actionIntentStore.createLifeIntent(onboardStorage,data.selected):{ok:false,reason:"基準記録を確認できません"};
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
    const interpretToggle=event.target.closest("[data-interpret-toggle]");
    if(interpretToggle){if(location.hash.includes("life=1")){lifeCompareUi.open=false;location.hash="#/history";}else {lifeCompareUi.open=!lifeCompareUi.open;render();}return;}
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
    const measurementControl=event.target.closest("[data-gps-preview]");
    if(measurementControl){
      if(measurementExperience.stepMeasurementPreview(measurementUi,measurementControl.dataset.gpsPreview)){
        if(measurementControl.dataset.gpsPreview==="confirm-end"){
          state.recordReviewSource="gps";
          state.recordReviewReturn=false;
          location.hash="#/record-review";
          render();window.scrollTo(0,0);return;
        }
        render();
        window.scrollTo(0,0);
        if(measurementUi.phase==="confirm"){
          app.querySelector('[data-gps-preview="cancel-end"]')?.focus({preventScroll:true});
        }
      }
      return;
    }
    const ui=state.recordCourseUi,d=state.recordDraft;
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
      ui.notice="";location.hash="#/record";return;
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
    if(event.target.closest("[data-onboard-open]")){onboardingState.open=true;onboardingState.step=0;render();return}
    if(event.target.closest("[data-onboard-close]")){onboardingState.open=false;render();return}
    if(event.target.closest("[data-onboard-back]")){onboardingState.step=Math.max(0,onboardingState.step-1);render();return}
    if(event.target.closest("[data-onboard-next]")){
      if(onboardingState.step<4){onboardingState.step+=1;render();return}
      onboardingState.open=false;
      const savedProfile=settingsExperience.saveProfile(onboardStorage,{nickname:onboardingState.nickname,purpose:onboardingState.purpose,heightCm:onboardingState.heightCm,weightKg:onboardingState.weightKg,ageBand:onboardingState.ageBand});
      if(savedProfile.ok)settingsUi.profile=savedProfile.value;
      try{onboardStorage?.setItem(onboardingKey,JSON.stringify({completed:true,language:"ja",nickname:onboardingState.nickname,purpose:onboardingState.purpose,formalTermsAccepted:false}))}catch{}
      render();return;
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
    if(exploreTopic){explorationUi.topic=exploreTopic.dataset.exTopic;explorationUi.followup="";render();return;}
    const exploreTab=event.target.closest("[data-ex-tab]");
    if(exploreTab){explorationUi.tab=exploreTab.dataset.exTab;explorationUi.notice="";render();return;}
    const bodyChoice=event.target.closest("[data-ex-body]");
    if(bodyChoice){const y=window.scrollY;explorationUi.bodyChoice=bodyChoice.dataset.exBody;render();window.scrollTo(0,y);return;}
    const slopeChoice=event.target.closest("[data-ex-slope]");
    if(slopeChoice){const y=window.scrollY;explorationUi.toolChoice=slopeChoice.dataset.exSlope;render();window.scrollTo(0,y);return;}
    const nextChoice=event.target.closest("[data-ex-next]");
    if(nextChoice){const prompts={"02|足・膝・股関節":["次は走るときの股関節の動きを意識してみたい","足首の動きについてもう少し調べたい"],"03|上り坂・下り坂":["次は上りと下りで感じ方を確かめたい","坂道のある日とない日の記録を見比べたい"],"05|睡眠":["次は起床時の調子も記録してみたい","睡眠の記録を数日分見返してみたい"]};const options=prompts[explorationUi.selected+"|"+explorationUi.topic]||[];explorationUi.followup=options[Number(nextChoice.dataset.exNext)]||"";explorationUi.modal="note";render();app.querySelector("#ex-note")?.focus();return;}
    const exploreAction=event.target.closest("[data-ex-action]");
    if(exploreAction){
      const action=exploreAction.dataset.exAction;
      if(action==="close"){explorationUi.modal="";render();return;}
      if(action==="catalog"){explorationUi.tab="catalog";render();return;}
      if(action==="sample"){explorationUi.sample=!explorationUi.sample;render();return;}
      if(action==="save-note"){
        const result=explorationExperience.saveNote(explorationUi,app.querySelector("#ex-note")?.value);
        explorationUi.notice=result.ok?"メモを保存しました":result.reason;if(result.ok)explorationUi.followup="";
        if(result.ok)explorationUi.modal="";
        render();return;
      }
      if(action==="copy"){
        const value=app.querySelector("[data-ex-draft-text]")?.innerText||"";
        if(navigator.clipboard?.writeText){navigator.clipboard.writeText(value).then(()=>{const n=app.querySelector(".ex-dialog");if(n){const p=document.createElement("p");p.setAttribute("role","status");p.textContent="コピーしました";n.appendChild(p);}}).catch(()=>{const n=app.querySelector(".ex-dialog");if(n){const p=document.createElement("p");p.setAttribute("role","alert");p.textContent="コピーできませんでした";n.appendChild(p);}})}
        return;
      }
      explorationUi.modal=action;explorationUi.notice="";render();app.querySelector(".ex-dialog-head button")?.focus();return;
    }
    const exploreDelete=event.target.closest("[data-ex-delete]");
    if(exploreDelete){const success=explorationExperience.deleteNote(explorationUi,exploreDelete.dataset.exDelete);explorationUi.notice=success?"メモを削除しました":"削除できませんでした。保存データは保護しています。";render();return;}
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
      state.recordReviewReturn=false;
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
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("[data-region-focus]")){
      event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}));return;
    }
    if(event.key==="Escape"&&explorationUi.modal){explorationUi.modal="";render();return;}
    if(event.key==="Escape"&&(homeUi.conditionOpen||homeUi.achievementOpen)){homeUi.conditionOpen=false;homeUi.achievementOpen=false;render();return;}
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("path[data-region]")){event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  });
  window.addEventListener("hashchange",()=>{state.toast="";render();if(location.hash.includes("life=1"))app.querySelector("#interpret-life")?.scrollIntoView({block:"start",behavior:"instant"});else window.scrollTo(0,0)});
  render();
})();