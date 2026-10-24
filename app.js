(async function appMain(){
  "use strict";
  const {BODY_REGION_VIEWS}=await import("./assets/bodyRegionVisuals.js");
  const dashboardPrefs=await import("./ui/homeDashboardLayout.js");
  const dashboardDrag=await import("./ui/homeDashboardDrag.js");
  const homeExperience=await import("./ui/homeExperience.js");
  const rofScale=await import("./ui/rofJScale.js");
  const reviewDraft=await import("./ui/recordDraftReview.js");
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
    {id:"BA-DISP-014",name:"股関節部",friendly:"股関節まわり",value:101.7,prev:100.2},
    {id:"BA-DISP-015",name:"殿部",friendly:"お尻",value:103.2,prev:101.0},
    {id:"BA-DISP-016",name:"大腿前面",friendly:"太ももの前",value:107.4,prev:105.2},
    {id:"BA-DISP-018",name:"大腿後面",friendly:"太ももの後ろ",value:98.8,prev:100.1},
    {id:"BA-DISP-019",name:"膝蓋大腿関節部",friendly:"膝の前",value:96.7,prev:99.0},
    {id:"BA-DISP-021",name:"脛骨部",friendly:"すね",value:100.8,prev:99.4},
    {id:"BA-DISP-023",name:"下腿後面",friendly:"ふくらはぎ",value:112.4,prev:108.2},
    {id:"BA-DISP-024",name:"足関節部",friendly:"足首まわり",value:100.1,prev:100.6},
    {id:"BA-DISP-025",name:"アキレス腱部",friendly:"足首の後ろ",value:99.5,prev:100.7},
    {id:"BA-DISP-027",name:"後足部",friendly:"かかと",value:95.2,prev:94.1},
    {id:"BA-DISP-028",name:"足底中部・内側縦足弓",friendly:"土踏まず",value:null,prev:null},
    {id:"BA-DISP-029",name:"前足部",friendly:"足裏の前",value:106.3,prev:104.4}
  ];
  const state={region:"BA-DISP-023",resultMode:"all",mobileRegionsExpanded:false,mode:"today",category:"03",topic:"上り坂・下り坂",recordType:"run",feeling:"",recordDraft:{distance:"",hours:"",minutes:"",seconds:"",date:"",memo:"",rofBefore:null,rofAfter:null,steps:"",stepsProvenance:"UNKNOWN",runningFormat:"UNKNOWN",runWalkRunningDistanceKm:"",runWalkRunningDurationMinutes:"",courseName:"",gradeMode:"UNKNOWN",upPercent:"",downPercent:"",upGradePercent:"",downGradePercent:"",surfaceMode:"UNKNOWN",primarySurface:"",temperatureC:"",environmentNote:"",bodyObservation:"",shoeName:"",...Object.fromEntries(Array.from({length:5},(_,i)=>[[`sectionShare${i}`,""],[`sectionDirection${i}`,"FLAT"],[`sectionGrade${i}`,""],[`sectionSurface${i}`,"UNKNOWN"]]).flat()),...Object.fromEntries(["paved","track","treadmill","soil","trail","naturalGrass","artificialTurf","sand"].map(k=>[`surface${k}`,""]))},recordPreviewOpen:false,recordOpenSections:[],rofEditorOpen:false,treeZoom:1,treeScroll:null,historyMode:"all",historyDate:null,toast:"",sheetVisible:false,sheetExpanded:false};
  const homePreferenceStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const homePreferenceState=dashboardPrefs.loadHomeDashboardLayout(homePreferenceStorage);
  const homeEditState={editing:false,draft:null,notice:""};
  const homeUi={preview:false,conditionOpen:false,achievementOpen:false};
  const onboardingKey="runload-v2-introduction-preview-v1";
  const onboardStorage=(()=>{try{return window.localStorage}catch{return null}})();
  const loadIntro=()=>{try{return JSON.parse(onboardStorage?.getItem(onboardingKey)||"null")}catch{return null}};
  const introStored=loadIntro();
  const onboardingState={open:!introStored?.completed,step:0,language:"ja",nickname:String(introStored?.nickname||""),purpose:String(introStored?.purpose||"")};
  const pageLabels={home:"ホーム",record:"記録","record-start":"記録を始める",result:"結果",history:"履歴","exploration-tree":"探究ツリー",settings:"設定",measurement:"測定",course:"コース設計",simulation:"シミュレーション",consultation:"相談・共有","body-part-detail":"部位詳細"};
  const desktopNav=[["home","⌂","ホーム"],["record","✎","記録"],["result","▥","結果"],["history","◷","履歴"],["exploration-tree","⚭","探究ツリー"],["settings","⚙","設定"]];
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
  const header=(name,description,right="")=>`<section class="card page-hero"><div><div class="eyebrow">RUNLOAD UI NEXT</div><h1>${name}</h1><p class="lead">${description}</p></div>${right}</section>${sheetBody}`;
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
 ${homeUi.conditionOpen?homeExperience.conditionPanel(homePreferenceStorage,homeUi.preview):""}
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
  {title:"RunLoadへようこそ",eyebrow:"WELCOME",body:"走行・休養の記録と、身体の参考値を振り返るアプリです。現在のv2は画面と操作の検証段階です。",html:`<div class="onboard-preview-tiles"><span>◎<strong>GPS</strong><small>測定の入口</small></span><span>✎<strong>記録</strong><small>ROF-Jの疲労感</small></span><span>✦<strong>探究</strong><small>自分の問いを深める</small></span></div>`},
  {title:"言語を選ぶ",eyebrow:"LANGUAGE",body:"言語設定はあとから変更できます。現在の画面は日本語版のみ対応しています。",html:`<div class="onboard-language-options"><label class="is-selected"><input type="radio" name="onboard-language" value="ja" checked>日本語 <span>使用可能</span></label><label class="is-disabled"><input type="radio" name="onboard-language" disabled value="en">English <span>後日対応予定</span></label></div>`},
  {title:"利用規約とデータの扱い",eyebrow:"PRIVACY",body:"正式な利用規約・プライバシーポリシーはまだ確定していません。以下はUI確認用の案内であり、法的な同意の取得・記録ではありません。",html:`<div class="onboard-legal"><strong>現在のv2で扱う内容</strong><p>ホーム表示設定と希望者が入力した任意プロフィールは、このブラウザの保存領域にのみ保存します。現在のv2ではGPS測定・走行記録の正式保存は接続されていません。ROF-Jの既存イラストを表示する際には、旧RunLoadが管理するGitHub公開画像への通信が発生します。</p><p>位置情報の許可は、正式なGPS測定を開始する操作に合わせて確認する設計です。実装前に文面と導線を確定します。</p><small>正式な同意画面は規約の承認後に実装します。今は同意済みの扱いになりません。</small></div>`},
  {title:"共有用プロフィール（任意）",eyebrow:"YOUR PROFILE",body:"旧アプリの共有用プロフィールを参考に、最初の設定を用意しました。入力を省略しても進めます。記録や相談先への自動送信はしません。",html:`<div class="onboard-profile"><label>共有に使う表示名（任意）<input data-onboard-nickname maxlength="40" placeholder="未設定でも進めます" value="${esc(onboardingState.nickname)}"></label><label>RunLoadを使う目的（任意）<select data-onboard-purpose><option value="">まだ決めていない</option>${[["health","健康のため"],["record","ランニングの記録"],["learn","身体への理解"],["other","その他"]].map(([v,t])=>`<option value="${v}" ${onboardingState.purpose===v?"selected":""}>${t}</option>`).join("")}</select></label><p>性別・年齢帯・身長・体重など旧版の追加項目は、必要性と共有条件を確認した後に移植します。</p></div>`},
  {title:"始め方を確認",eyebrow:"QUICK TOUR",body:"まずGPS測定か手入力を選び、疲労感を振り返りましょう。探究ツリーはスクロールとズームで自由に見られます。",html:`<div class="onboard-tour"><div><b>1</b><span><strong>GPS／手入力を選択</strong><small>GPS測定は旧版エンジン接続後に利用可能</small></span></div><div><b>2</b><span><strong>ROF-Jの疲労感を記入</strong><small>運動前後の0～10を別々に選択</small></span></div><div><b>3</b><span><strong>結果と探究を振り返る</strong><small>人体図・6軸レーダー・探究ツリー</small></span></div></div>`}
 ];
 const current=steps[onboardingState.step];
 return `<div class="onboard-overlay" data-onboard-overlay><section class="onboard-dialog" role="dialog" aria-modal="true" aria-labelledby="onboard-title"><div class="onboard-top"><strong>RunLoad</strong><span>初回案内・試作版</span><button type="button" data-onboard-close aria-label="案内を閉じる">×</button></div><div class="onboard-progress" aria-label="${onboardingState.step+1} / ${steps.length}">${steps.map((_,i)=>`<span class="${i<=onboardingState.step?"is-active":""}"></span>`).join("")}</div><div class="onboard-main"><p class="eyebrow">${current.eyebrow}</p><h2 id="onboard-title">${current.title}</h2><p class="onboard-description">${current.body}</p>${current.html}</div><div class="onboard-footer"><button type="button" class="btn" data-onboard-back ${onboardingState.step===0?"disabled":""}>戻る</button><span>${onboardingState.step+1} / ${steps.length}</span><button type="button" class="btn primary" data-onboard-next>${onboardingState.step===steps.length-1?"試用を始める":"次へ"}</button></div></section></div>`;
}
  function recordStart(){
 return `<section class="record-choose-head"><span class="eyebrow">START YOUR RUN</span><h1>記録の方法を選ぶ</h1><p class="lead">GPSで測定するか、あとから手入力するか選べます。</p></section>
 <section class="record-choose-grid"><a class="record-choose-primary" href="#/measurement"><span class="choose-icon" aria-hidden="true">◎</span><strong>GPSで測定</strong><p>走行中の時間と距離を測るための画面へ</p><small>※ v2ではGPS測定エンジン接続前です</small><span class="choose-arrow">開始画面へ →</span></a><a class="record-choose-secondary" href="#/record"><span class="choose-icon" aria-hidden="true">✎</span><strong>手入力で記録</strong><p>走行時間・距離・ROF-Jの疲労感を記入する</p><span class="choose-arrow">入力画面へ →</span></a></section>
 <p class="record-choose-note">旧アプリのGPS・保存エンジンと接続するまでは、v2からの測定開始や正式保存はできません。</p>`;
}
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
  function record(){
 const draft=state.recordDraft,active=state.recordType==="run";
 const review=reviewDraft.checkRecordDraft(draft,active);
 
 const moods=[["very-good","☺","とても良い"],["good","◡","良い"],["regular","•","ふつう"],["tired","◠","疲れ気味"],["low","○","あまり良くない"]];
 return `<section class="record-page-head"><div><h1>記録をつけましょう</h1><p>ランニングや休養、その日の気分を記録する。</p></div></section>
 <section class="record-editor card">
 <div class="record-segments" aria-label="記録の種類">${[["run","ラン"],["rest","休養"]].map(([id,label])=>`<button type="button" data-record-type="${id}" class="${state.recordType===id?"is-active":""}" aria-pressed="${state.recordType===id}">${label}</button>`).join("")}</div>
 ${active?"":`<div class="record-rest-note"><span aria-hidden="true">☾</span><div><strong>休養日の記録</strong><p>身体を休めた日も、気づきを残せます。</p></div></div>`}
 <div class="record-area record-measurements">${active?`<div class="record-distance"><h2>距離</h2><label class="record-number"><input aria-label="距離（km）" data-draft="distance" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.0" value="${esc(draft.distance)}"><span>km</span></label></div><div class="record-duration"><h2>時間</h2><div class="duration-inputs">${[["hours","時"],["minutes","分"],["seconds","秒"]].map(([id,unit])=>`<label><input aria-label="時間・${unit}" data-draft="${id}" type="number" inputmode="numeric" min="0" ${id==="hours"?"":'max="59"'} placeholder="00" value="${esc(draft[id])}"><span>${unit}</span></label>`).join("")}</div></div>`:""}<div class="record-date"><h2>日付</h2><input aria-label="記録日" type="date" data-draft="date" value="${esc(draft.date)}"></div></div>
 ${active?rofPanel():""}
 ${active?recordExtras():""}
 <div class="record-area"><h2>気分の記録 <small>任意・本人が選択</small></h2><div class="feelings-choice">${moods.map(([id,icon,label])=>`<button type="button" data-feeling="${id}" aria-label="${label}" aria-pressed="${state.feeling===id}" class="feeling-choice ${state.feeling===id?"is-active":""}"><span class="mood-symbol">${icon}</span><small>${label}</small></button>`).join("")}</div></div>
 ${active?"":`<div class="record-area"><label class="field record-memo"><span>休養日のメモ <small>任意</small></span><textarea data-draft="memo" rows="2" placeholder="休養日の気づき">${esc(draft.memo)}</textarea></label></div>`}
 <div class="record-save-actions"><button class="btn primary" type="button" data-demo-save>入力内容を確認する <span aria-hidden="true">→</span></button></div>
 </section>
 ${state.recordPreviewOpen?`<div class="record-preview-overlay" data-close-preview><section class="record-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="record-preview-title"><h2 id="record-preview-title">入力内容の確認</h2><p>この画面ではまだ正式な記録保存を行いません。</p><dl><dt>種類</dt><dd>${active?"走行":"休養"}</dd><dt>日付</dt><dd>${esc(draft.date||"未入力")}</dd>${active?`<dt>距離</dt><dd>${esc(draft.distance||"未入力")} km</dd>`:""}${active?`<dt>ROF-J 運動前</dt><dd>${rofScale.isValidRofJ(draft.rofBefore)?draft.rofBefore:"未入力"}</dd><dt>ROF-J 運動後</dt><dd>${rofScale.isValidRofJ(draft.rofAfter)?draft.rofAfter:"未入力"}</dd>`:""}${active?`<dt>歩数</dt><dd>${esc(draft.steps||"未入力")}</dd><dt>歩数の取得方法</dt><dd>${esc({DEVICE_MEASURED:"端末・時計で計測",ESTIMATED:"手入力・おおよそ",UNKNOWN:"不明・未設定"}[draft.stepsProvenance]||"不明・未設定")}</dd><dt>走り方</dt><dd>${esc({RUN_WALK:"走歩混在",CONTINUOUS_RUN:"連続走行",UNKNOWN:"不明・未設定"}[draft.runningFormat]||"不明・未設定")}</dd><dt>コース</dt><dd>${esc(draft.courseName||"未入力")}</dd><dt>坂・路面</dt><dd>${esc({UNKNOWN:"不明・未設定",FLAT:"ほぼ平坦",SUMMARY:"割合で入力",SECTIONS:"区間ごとに入力"}[draft.gradeMode]||"不明・未設定")} ／ ${esc({UNKNOWN:"不明・未設定",SINGLE:"単一路面",MIXED:"複数路面の割合"}[draft.surfaceMode]||"不明・未設定")}</dd><dt>気温</dt><dd>${esc(draft.temperatureC||"未入力")}</dd><dt>身体の気づき</dt><dd>${esc(draft.bodyObservation||"未入力")}</dd><dt>シューズ</dt><dd>${esc(draft.shoeName||"未入力")}</dd>`:""}<dt>メモ</dt><dd>${esc(draft.memo||"未入力")}</dd></dl>${review.errors.length||review.warnings.length?`<div class="record-review-alert" role="alert"><strong>入力内容の確認事項</strong>${review.errors.map(t=>`<p class="is-error">${esc(t)}</p>`).join("")}${review.warnings.map(t=>`<p>${esc(t)}</p>`).join("")}</div>`:`<p class="record-review-success">入力項目の形式上の問題は検出されませんでした。正式保存・科学計算の検証ではありません。</p>`}<button type="button" class="btn primary" data-close-preview>閉じる</button></section></div>`:""}`;
}
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
 <div class="card anatomy-card"><div class="section-title"><h2>身体の部位から見る</h2><a href="#/body-part-detail" class="help-link">部位の見方　ⓘ</a></div><div class="body-map-row">${BODY_REGION_VIEWS.map(svgBody).join("")}</div>${legend()}<p class="chart-caption">色は各部位自身の基準100との関係を示します。</p></div>
 <div class="card regions-card"><div class="section-title"><h2>12部位を見渡す</h2><div class="segmented"><button data-result-mode="all" class="${state.resultMode==="all"?"is-active":""}">全体</button><button data-result-mode="focus" class="${state.resultMode==="focus"?"is-active":""}">注目</button></div></div><div class="region-grid">${regionTiles()}</div>${mobileRegionRows()}<p class="chart-caption regions-guidance">部位を選ぶと、人体図と詳細が連動します。</p></div>
 </section>
 <section class="result-lower"><div class="card region-detail-card" id="selected-detail"><div class="section-title"><div class="detail-head"><h2>選択部位の詳細</h2><span class="selected-name">${regionPictogram(current.id,current.value)}${esc(current.friendly)}</span></div>${buttonLink("body-part-detail","部位の詳細")}</div><div class="detail-metrics"><div class="highlight-detail"><small>今回の数値</small><strong>${valid(v)?v.toFixed(1):"—"}</strong></div><div><small>基準値</small><strong>100</strong></div><div><small>基準からの差</small><strong class="${status(v)}">${valid(v)?pct(v-100):"—"}</strong></div><div><small>前回の数値</small><strong>${valid(prev)?prev.toFixed(1):"—"}</strong></div><div><small>前回からの変化</small><strong class="${status(v)}">${comparison}</strong></div></div>
 ${mobileDetail}<h3 class="detail-chart-title">${esc(current.friendly)}の推移</h3><div class="chart-card">${historyChart(current)}</div>
 <p class="reference-note">ⓘ 各部位自身の基準を100とする文献由来の参考値です。実測した筋負荷・健康状態・傷害リスクを表すものではありません。</p></div>
 <div class="support-stack">
 <div class="card fatigue-panel"><div class="section-title"><h2>運動前後の疲労感 <small>(ROF-J)</small></h2></div><div class="fatigue-flex"><div class="fatigue-cell"><small>運動前</small><strong>6</strong><span class="scale blue"></span></div><span class="fatigue-arrow" aria-hidden="true">→</span><div class="fatigue-cell"><small>運動後</small><strong>8</strong><span class="scale orange"></span></div><div class="fatigue-cell difference"><small>変化</small><strong>+2</strong></div></div><p class="chart-caption">本人が回答した0〜10の主観的な疲労感。</p></div>
 <div class="card radar-panel"><div class="section-title"><h2>走行プロフィール <small>(参考)</small></h2></div>${radarChart()}<div class="map-legend"><span><i class="dot" style="background:#0891b2"></i>今回</span><span><i class="dot missing"></i>比較する記録</span></div><p class="chart-caption">6つの走行指標の形。身体能力の判定ではありません。</p></div>
 <div class="result-actions">${buttonLink("exploration-tree","探究ツリーへ",true)}${buttonLink("history","履歴を見る")}</div></div>
 </section>`;
}
    function history(){
 const data=[{day:22,label:"10月22日",detail:"8.20 km　・　45分",type:"走行",distance:8.2},{day:12,label:"10月12日",detail:"5.40 km　・　31分",type:"走行",distance:5.4},{day:5,label:"10月5日",detail:"休養日の記録",type:"休養",distance:0}];
 const shown=data.filter(x=>(state.historyMode==="all"||x.type===state.historyMode)&&(state.historyDate===null||x.day===state.historyDate));
 const recorded=new Set(data.map(x=>x.day));
 const sum=data.filter(x=>x.type==="走行").reduce((n,x)=>n+x.distance,0);
 const days=["日","月","火","水","木","金","土",...Array(4).fill(""),...Array.from({length:31},(_,i)=>String(i+1))];
 return `<section class="home-head"><div><div class="eyebrow">RUNNING HISTORY</div><h1>履歴</h1><p class="lead">これまでの記録を、日付や条件から振り返る。</p></div>${buttonLink("record","記録する",true)}</section>
 <section class="card">
  <div class="section-title"><h2>記録を探す</h2><div class="segmented">${[["all","すべて"],["走行","走行"],["休養","休養"]].map(([key,label])=>`<button type="button" data-history-mode="${key}" class="${state.historyMode===key?"is-active":""}">${label}</button>`).join("")}</div></div>
  <div class="history-layout">
   <div class="history-calendar">
    <div class="calendar-header"><h3>2026年10月</h3><span class="badge">記録 ${data.length}件</span></div>
    <div class="mini-calendar">${days.map((d,i)=>i<7?`<span class="calendar-weekday">${d}</span>`:d===""?`<span aria-hidden="true"></span>`:`<button type="button" data-history-day="${d}" aria-pressed="${Number(d)===state.historyDate}" class="calendar-day ${recorded.has(Number(d))?"has-entry":""} ${Number(d)===state.historyDate?"is-selected":""}">${d}</button>`).join("")}</div>
    <div class="calendar-legend"><span><i class="calendar-dot"></i>記録した日</span>${state.historyDate!==null?`<button type="button" data-history-clear>日付の絞り込みを解除</button>`:""}</div>
    <div class="month-summary"><strong>今月のまとめ</strong><div><span><b>${data.filter(x=>x.type==="走行").length}</b><small>走行</small></span><span><b>${sum.toFixed(2)}</b><small>km</small></span><span><b>${data.filter(x=>x.type==="休養").length}</b><small>休養</small></span></div></div>
   </div>
   <div class="history-records"><h3>${state.historyDate!==null?`10月${state.historyDate}日の記録`:"最近の記録"}</h3><div class="timeline">${shown.length?shown.map(entry=>`<a class="timeline-item" href="#/${entry.type==="休養"?"history":"result"}"><span class="history-row-mark">${entry.type==="走行"?"↗":"◌"}</span><span><strong>${entry.label}</strong><p class="lead">${entry.detail}</p></span><span class="badge">${entry.type}</span><span>›</span></a>`).join(""):`<div class="empty-state"><strong>この条件の記録はありません</strong><p>別の日付や種類を選択できます。</p></div>`}</div></div>
  </div>
 </section>
 <section class="grid-2"><a class="card home-shortcut" href="#/exploration-tree"><span class="shortcut-icon">✧</span><span><strong>探究の足跡</strong><p>興味を持ったテーマや問いを振り返る。</p></span><span>↗</span></a><a class="card home-shortcut" href="#/result"><span class="shortcut-icon">▥</span><span><strong>身体の推移</strong><p>12部位の過去の参考値を確かめる。</p></span><span>↗</span></a></section>`;
}
    function treeOverview(){
 const graphPositions=[
 ["01",160,175,[[65,95],[150,78],[44,245],[172,276]]],
 ["02",500,80,[[367,38],[475,16],[606,33],[664,94]]],
 ["03",855,166,[[896,50],[1003,122],[952,237],[1004,284]]],
 ["04",871,385,[[977,326],[1001,396],[952,473],[1009,523]]],
 ["05",690,531,[[618,623],[731,623],[837,568],[839,626]]],
 ["06",389,535,[[223,606],[331,624],[458,628],[538,587]]],
 ["07",143,404,[[43,334],[33,423],[74,497],[195,550]]]
 ];
 const xcenter=516,ycenter=314;
 const line=(x1,y1,x2,y2,color,thick=2,opacity=.5)=>`<path d="M${x1} ${y1} Q${(x1+x2)/2} ${(y1+y2)/2-12} ${x2} ${y2}" stroke="${color}" stroke-opacity="${opacity}" stroke-width="${thick}" stroke-linecap="round" fill="none"/>`;
 // Tree structure is intentionally kept diagrammatic until a separately approved visual asset exists.
 const branchPath=(x0,y0,x1,y1,color,weight,opacity)=>`<path class="tree-branch-line" d="M${x0} ${y0} C${(x0*2+x1)/3} ${(y0*2+y1)/3-19} ${(x0+x1*2)/3} ${(y0+y1*2)/3+17} ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${weight}" stroke-linecap="round" stroke-opacity="${opacity}"/>`;
  const drawDesktop=graphPositions.map(([id,x,y,leaves])=>{
  const c=CATEGORIES.find(item=>item.id===id),active=state.category===id;
  const branches=leaves.map(([tx,ty],i)=>branchPath(x,y,tx,ty,c.color,active?3:2,active?.64:.37)).join("");
  const nodes=leaves.map(([tx,ty],i)=>{
   const name=c.topics[i],sel=state.category===id&&state.topic===name;
   const align=tx<=100?"start":tx>=940?"end":"middle";
   const labelY=ty<62?ty+23:ty>585?ty-13:ty-13;
   return `<g class="tree-leaf ${sel?"is-selected":""}" data-topic="${id}|${esc(name)}" role="button" tabindex="0" aria-label="${esc(name)}" aria-pressed="${sel}">
     ${sel?`<circle cx="${tx}" cy="${ty}" r="16" fill="${c.color}" fill-opacity=".11"/>`:""}
     <circle cx="${tx}" cy="${ty}" r="${sel?9:7}" fill="${c.color}" stroke="#fff" stroke-width="3"/>
     <text x="${tx}" y="${labelY}" text-anchor="${align}" font-size="12.5" font-weight="${sel?800:590}" fill="#476273">${esc(name)}</text>
   </g>`;
  }).join("");
  const textColor=active?"#fff":c.color;
  const glow=active?`<circle cx="${x}" cy="${y}" r="66" fill="${c.color}" fill-opacity=".15"/>`:"";
  return `${branchPath(xcenter,ycenter,x,y,c.color,active?9:6,active?.77:.53)}${branches}${glow}<g class="tree-hub ${active?"is-selected":""}" data-tree-category="${id}" tabindex="0" role="button" aria-pressed="${active}" aria-label="${esc(c.name)}の分野を開く"><rect x="${x-79}" y="${y-23}" width="158" height="46" rx="21" fill="${active?c.color:c.tint}" stroke="${c.color}" stroke-width="${active?3:2}"/><text x="${x}" y="${y+5}" text-anchor="middle" font-weight="800" font-size="17" fill="${textColor}">${esc(c.name)}</text></g>${nodes}`;
 }).join("");
 const desktop=`<svg class="tree-canvas tree-desktop" viewBox="0 0 1040 650" role="group" aria-label="7分野28テーマからなる探究ツリー。枝とテーマを選択できます"><defs><radialGradient id="tree-core-glow"><stop offset="0" stop-color="#e5f5ff" stop-opacity=".96"/><stop offset=".65" stop-color="#cfecff" stop-opacity=".54"/><stop offset="1" stop-color="#d8f2f8" stop-opacity="0"/></radialGradient><linearGradient id="tree-core"><stop offset="0" stop-color="#4395e8"/><stop offset="1" stop-color="#146ad0"/></linearGradient></defs><circle cx="${xcenter}" cy="${ycenter}" r="108" fill="url(#tree-core-glow)"/><circle cx="${xcenter}" cy="${ycenter}" r="66" fill="#1d79c9"/><circle cx="${xcenter}" cy="${ycenter}" r="56" fill="url(#tree-core)"/><g fill="#fff" text-anchor="middle"><text x="${xcenter}" y="${ycenter-4}" font-size="29">♙</text><text x="${xcenter}" y="${ycenter+22}" font-size="15" font-weight="800">今回の走り</text></g>${drawDesktop}</svg>`;
 const centers=[[90,99],[270,99],[75,224],[285,224],[90,357],[270,357],[180,470]];
 const mobileLines=centers.map(([x,y],i)=>branchPath(179,260,x,y,CATEGORIES[i].color,8,.44)).join("");

 const mobileNodes=centers.map(([x,y],i)=>{
  const c=CATEGORIES[i],active=state.category===c.id;
  const short=c.name==="走る前後の工夫"?"走る前後の工夫":c.name;
  let first=short.length>6?short.slice(0,Math.ceil(short.length/2)):short;
  let second=short.length>6?short.slice(Math.ceil(short.length/2)):"";
  return `<g class="tree-hub tree-bubble" data-tree-category="${c.id}" role="button" tabindex="0" aria-label="${esc(c.name)}" aria-pressed="${active}"><circle cx="${x}" cy="${y}" r="${active?68:61}" fill="${c.color}" fill-opacity=".09" stroke="${c.color}" stroke-opacity=".28" stroke-width="${active?6:3}"/><circle cx="${x}" cy="${y}" r="53" fill="${c.tint}" fill-opacity=".98" stroke="${c.color}" stroke-width="2"/><circle cx="${x}" cy="${y-24}" r="15" fill="${c.color}" fill-opacity=".15"/><text x="${x}" y="${y-18}" font-size="19" text-anchor="middle" font-weight="850" fill="${c.color}">${esc(c.icon)}</text><text x="${x}" y="${y+5}" text-anchor="middle" font-weight="820" font-size="14" fill="#27465b">${esc(first)}</text>${second?`<text x="${x}" y="${y+22}" text-anchor="middle" font-weight="780" font-size="14" fill="#27465b">${esc(second)}</text>`:""}${active?`<circle cx="${x}" cy="${y}" r="68" stroke="${c.color}" stroke-opacity=".24" fill="none" stroke-width="8"/>`:""}</g>`;
 }).join("");
 const mobile=`<svg class="tree-canvas tree-mobile" viewBox="0 0 360 540" role="group" aria-label="7分野を選べる探究ツリー">${mobileLines}<defs><radialGradient id="tree-mobile-core"><stop offset="0" stop-color="#398de4"/><stop offset="1" stop-color="#1466bd"/></radialGradient></defs><circle cx="179" cy="260" r="66" fill="#d5e8ff" fill-opacity=".64"/><circle cx="179" cy="260" r="48" fill="url(#tree-mobile-core)"/><text x="179" y="254" font-size="20" fill="#fff" font-weight="800" text-anchor="middle">走る</text><text x="179" y="274" font-size="13" fill="#fff" font-weight="700" text-anchor="middle">自分の探究</text>${mobileNodes}</svg>`;
 return `<div class="tree-overview"><div class="tree-overview__decor" aria-hidden="true"></div>${desktop}${mobile}</div>`;
}
  function explore(){
 const c=CATEGORIES.find(c=>c.id===state.category)||CATEGORIES[0];
 const topicButtons=c.topics.map((name,i)=>`<button data-topic="${c.id}|${esc(name)}" class="topic-choice ${state.topic===name?"is-selected":""}" aria-pressed="${state.topic===name}"><span class="topic-index">${String(i+1).padStart(2,"0")}</span>${esc(name)}<span>›</span></button>`).join("");
 const hero=`<section class="explore-heading"><div><h1>探究ツリー</h1><p class="lead">今回の走りを起点に、気になるテーマから自由に探究できます。</p></div></section>`;
 const tabs=`<section class="explore-tabs">${[["today","今回の走りから探す"],["questions","過去の問いに戻る"],["free","自由に探す"]].map(([m,n])=>`<button class="explore-tab ${state.mode===m?"is-active":""}" data-explore-mode="${m}" type="button">${n}</button>`).join("")}</section>`;
 const summary=state.mode==="today"?`<section class="explore-run-snapshot"><div class="small-route"><span aria-hidden="true">⌁</span></div><div><small>最近の走行</small><strong>10月22日</strong></div><div><small>距離</small><strong>8.20 <em>km</em></strong></div><div><small>時間</small><strong>45 <em>分</em></strong></div><a href="#/result" class="btn soft">結果を見る →</a></section>`:"";
 const right=`<aside class="explore-aside">
 <div class="explore-aside-hero"><div class="nature-header" aria-hidden="true"><span>⛰</span></div><h2>${state.mode==="free"?"自由探索のはじめ方":state.mode==="questions"?"過去の問い":"はじめに"}</h2><p>あなたの関心に合わせて、記録や知識を行き来できます。答えを決めるのは、あなた自身です。</p></div>
 <div class="insight-card rose"><div class="aside-title"><span>✧</span><h3>${state.mode==="today"?"今日の接点":"関連する知識"}</h3></div><strong>${esc(c.name)}</strong><p>選択した分野から、4つのテーマを確かめましょう。</p></div>
 <div class="insight-card blue"><div class="aside-title"><span>⌑</span><h3>続けている問い</h3></div><p>保存した問いは、いつでも見返せます。</p><div class="empty-inline">まだ問いはありません</div></div>
 <div class="insight-card green"><div class="aside-title"><span>✦</span><h3>次にできること</h3></div><a href="#/result" class="aside-action">今回の結果を振り返る　→</a><a href="#/history" class="aside-action">過去の記録を確かめる　→</a></div></aside>`;
 
 const sheetBody=`<div class="mobile-explore-sheet ${state.sheetExpanded?"is-expanded":""} ${state.sheetVisible?"":"is-hidden"}">
   <div class="mobile-sheet-bar"></div>
   <div class="mobile-sheet-title">
     <div class="mobile-sheet-title-icon" style="background:${c.tint};color:${c.color}">✦</div>
     <button class="mobile-sheet-title-label" type="button" data-sheet-expand aria-expanded="${state.sheetExpanded}"><small>${esc(c.name)}</small><h2>${esc(state.topic)}</h2><span class="sheet-expand-hint">${state.sheetExpanded?"⌃":"⌄"}</span></button>
     <button class="sheet-toggle" type="button" data-sheet-toggle aria-label="${state.sheetVisible?"詳細シートを閉じる":"詳細シートを開く"}">${state.sheetVisible?"×":"⌃"}</button>
   </div>
   ${state.sheetVisible?`<div class="mobile-sheet-content">
    <div class="mobile-sheet-insight"><span>⌁</span><div><strong>自分の記録と照らし合わせる</strong><p>このテーマについて、今までの記録を確かめられます。</p></div><a href="#/result" aria-label="結果を見る">›</a></div>
    <div class="mobile-sheet-cards"><div><span>▤</span><strong>知識</strong><p>関連する読みものを探す</p></div><div><span>✎</span><strong>自分の問い</strong><p>気づいたことを振り返る</p></div></div>
    <a href="#/history" class="mobile-sheet-next"><span>✧</span><div><strong>次にできること</strong><small>以前の記録を見返す</small></div><span>›</span></a>
   </div>`:""}
 </div>`;
return hero+tabs+summary+`<section class="explore-main"><div class="card exploration-stage"><div class="explore-stage-title"><div><small>EXPLORATION MAP</small><h2>自分だけの探究を見つける</h2></div><span class="subtle-note">● 選択中の枝</span></div><div class="tree-zoom-head"><span>図をスクロールして探索</span><div class="tree-zoom-actions" role="group" aria-label="探究ツリーの拡大縮小"><button type="button" data-tree-zoom="out" aria-label="縮小">−</button><output data-tree-zoom-value>100%</output><button type="button" data-tree-zoom="in" aria-label="拡大">＋</button><button type="button" data-tree-zoom="reset">全体表示</button></div></div>
 <div class="tree-pan-viewport" tabindex="0" role="region" aria-label="上下左右に移動できる探究ツリー" style="--tree-zoom:${state.treeZoom}">${treeOverview()}</div>
 <div class="tree-pan-hint">上下左右に移動できます。＋／−で文字やテーマを拡大して確認できます。</div>
 <div class="explore-topic-detail"><div class="explore-topic-header"><div><small>選択中の分野</small><h3 style="color:${c.color}">${esc(c.name)}</h3></div><span class="badge">4つのテーマ</span></div>
 <div class="tree-topics">${topicButtons}</div>
 <div class="selected-topic-summary"><div><small>選択したテーマ</small><strong>${esc(state.topic)}</strong></div><div class="btn-row">${buttonLink("result","自分の結果を見る")}${buttonLink("history","記録を比べる")}</div></div></div>
 </div>${right}</section>${sheetBody}`;
}
    function settings(){
 const sections=[
  ["♙","利用者情報",[["記録者の情報","自分の記録を管理"],["記録の振り返り","これまでの走行を見る"]]],
  ["◈","表示と操作",[["文字と表示","自分に合う見た目で利用"],["動きの設定","画面演出の強さを調整"]]],
  ["♧","通知",[["記録のリマインダー","記録を続けるための通知"],["お知らせ","アプリに関する情報"]]],
  ["▤","プライバシー・データ",[["記録の管理","保存した記録を確認"],["位置情報","GPS利用時の取り扱い"]]],
  ["?","ヘルプ",[["各画面の使い方","RunLoadの機能を確認"],["身体の参考値について","12部位比較の見方"]]],
  ["▦","アプリ情報",[["RunLoadについて","研究・アプリの情報"],["ホーム画面への追加","アプリとしてすぐに開く"]]]
 ];
 return `<section class="home-head"><div><div class="eyebrow">PREFERENCES</div><h1>設定</h1><p class="lead">表示・データ管理・アプリの使い方を設定する。</p></div></section>
 <section class="settings-grid">${sections.map(([icon,title,options],idx)=>`<div class="card settings-card"><div class="settings-title"><span>${icon}</span><h2>${title}</h2></div>${options.map(([name,desc],j)=>{
   const route=name==="記録の振り返り"?"history":name==="身体の参考値について"?"result":name==="各画面の使い方"?"exploration-tree":null;
   const install=name==="ホーム画面への追加";
   const intro=name==="記録者の情報"||name==="文字と表示"||name==="各画面の使い方";
   return route?`<a href="#/${route}" class="settings-row settings-row-link"><div><strong>${name}</strong><p>${desc}</p></div><span>›</span></a>`:
   intro?`<button type="button" class="settings-row settings-row-link" data-onboard-open><div><strong>${name}</strong><p>${desc}・初期案内を開く</p></div><span>›</span></button>`:
   install?`<button class="settings-row settings-row-link" data-install-app type="button"><div><strong>${name}</strong><p>${desc}</p></div><span>›</span></button>`:
   `<div class="settings-row"><div><strong>${name}</strong><p>${desc}</p></div></div>`;
  }).join("")}</div>`).join("")}</section>`;
}
    function secondary(page){
 const title=pageLabels[page]||"その他";
 const top=`<section class="home-head"><div><div class="eyebrow">RUNLOAD</div><h1>${esc(title)}</h1><p class="lead">${esc({measurement:"走る時間とルートを確かめる。",course:"走りたいコースを、自分で組み立てる。",simulation:"条件を変えて、参考値の違いを考える。",consultation:"記録を振り返り、必要な情報を整理する。","body-part-detail":"気になる部位を、過去の記録と照らし合わせる。"}[page]||"自分の記録を大切に扱う。")}</p></div></section>`;
 if(page==="measurement")return top+`<section class="measurement-layout"><div class="card measurement-main"><div class="measurement-display"><span class="gps-status"><span class="status-dot"></span>GPSを確認</span><div class="measurement-clock">00:00:00</div><p>走行時間</p><div class="measurement-numbers"><div><strong>0.00</strong><small>km　距離</small></div><div><strong>--:--</strong><small>/km　ペース</small></div></div></div><div class="measurement-controls"><button class="btn primary" type="button" disabled title="GPS測定機能は現在利用できません">▶　測定開始</button><button class="btn" type="button" disabled>一時停止</button></div></div><div class="card stack"><h2>測定の前に</h2><div class="feature-entry"><span class="entry-icon cyan">◇</span><span><strong>位置情報</strong><small>現在地が取得できると表示されます。</small></span></div><div class="feature-entry"><span class="entry-icon blue">⌁</span><span><strong>コースの確認</strong><small>保存したGPS軌跡のみ地図に表示します。</small></span></div>${buttonLink("course","コースを選ぶ")}${buttonLink("record","手動で記録する")}</div></section>`;
 if(page==="course")return top+`<section class="grid-2"><div class="card stack"><div class="section-title"><h2>コースの基本情報</h2></div><label class="field">コース名<input placeholder="コース名を入力"></label><div class="form-grid"><label class="field">距離（km）<input type="number" inputmode="decimal" placeholder="0.0"></label><label class="field">走る場所<select><option>屋外</option><option>室内</option></select></label></div><h3>路面の種類</h3><div class="form-grid"><label class="field">主要な路面<select><option>選択してください</option><option>舗装路</option><option>陸上トラック</option><option>土道・トレイル</option><option>天然芝</option><option>砂地</option></select></label><label class="field">坂の条件<select><option>選択してください</option><option>ほぼ平坦</option><option>上りがある</option><option>下りがある</option><option>上り・下りがある</option></select></label></div></div><div class="card stack"><h2>コースを確認する</h2><div class="route-large-empty"><div class="route-empty-icon">⌁</div><strong>位置情報の登録はありません</strong><p class="lead">GPSで測定した走行は、保存された軌跡がある場合にのみ地図へ表示します。</p></div>${buttonLink("measurement","測定へ")}</div></section>`;
 if(page==="simulation")return top+`<section class="grid-2"><div class="card stack"><h2>比較する条件</h2><div class="form-grid"><label class="field">距離（km）<input type="number" inputmode="decimal" value="8.2"></label><label class="field">時間（分）<input type="number" inputmode="decimal" value="45"></label><label class="field">傾斜<select><option>平坦</option><option>上り</option><option>下り</option></select></label><label class="field">路面<select><option>舗装路</option><option>トラック</option><option>天然芝</option><option>土道</option></select></label></div><div class="info-note">比較する条件を整理できます。利用可能なモデルにより、結果を表示できる範囲は異なります。</div></div><div class="card stack"><h2>比較結果</h2><div class="empty-state"><span style="font-size:2.5rem">▥</span><strong>条件の比較結果はありません</strong><p class="lead">比較可能な科学的根拠がある場合だけ、対応する値を表示します。</p></div>${buttonLink("result","結果へ戻る")}</div></section>`;
 if(page==="consultation")return top+`<section class="grid-2"><div class="card stack"><h2>自分の記録を整理する</h2><div class="info-note">共有する情報は、自分で選べます。個人の記録を自動送信しません。</div><label class="field">相談したい内容<textarea placeholder="気になっていることを整理する"></textarea></label><label class="field">共有する記録<select><option>記録を共有しない</option><option>今回の記録の概要</option></select></label></div><div class="card stack"><h2>相談するときの確認</h2><p class="lead">12部位比較値は医療診断ではありません。身体の違和感などがあるときは、必要な支援先に相談してください。</p>${buttonLink("result","結果へ")}</div></section>`;
 const cur=regionData(state.region);
 return top+`<section class="grid-2"><div class="card stack"><h2>${esc(cur.name)}（${esc(cur.friendly)}）</h2><div class="detail-value">${valid(cur.value)?cur.value.toFixed(1):"—"}</div><div class="info-note">この部位自身の文献基準を100とした参考値であり、実測した身体負荷・傷害リスクではありません。</div><div class="chart-card">${historyChart(cur)}</div></div><div class="card stack"><h2>ほかの部位を見る</h2><div class="region-grid">${regionTiles()}</div>${buttonLink("result","全12部位へ戻る")}</div></section>`;
}
    let stopHomeDrag=null;
    function render(){
      if(stopHomeDrag){stopHomeDrag();stopHomeDrag=null;}
      const existingRof=app.querySelector(".rof-editor-details");if(existingRof)state.rofEditorOpen=existingRof.open;
      const openedRecordSections=app.querySelectorAll(".record-extra-section[open]");
      if(openedRecordSections.length||app.querySelector(".record-extra-section"))state.recordOpenSections=[...openedRecordSections].map(el=>el.dataset.recordSection);
      const previousTreeViewport=app.querySelector(".tree-pan-viewport");
      if(previousTreeViewport)state.treeScroll={left:previousTreeViewport.scrollLeft,top:previousTreeViewport.scrollTop};
 const page=currentPage(),content={home,record,result,history,"exploration-tree":explore,settings,"record-start":recordStart}[page]?.()||secondary(page);
 const navPage=page==="result"?"result":page==="record-start"?"record-start":page;
 app.innerHTML=`<div class="app-shell"><aside class="sidebar"><nav class="side-nav" aria-label="メニュー">${navHtml(desktopNav,navPage,false)}</nav><div class="side-foot"><div class="side-mountains" aria-hidden="true"></div><strong>走ることで、<br>もっと自分を知る。</strong></div></aside><div class="main-frame"><header class="topbar"><div class="topbar-title" aria-hidden="true"></div><div class="topbar-right"><button type="button" class="icon-install" data-install-app aria-label="RunLoadをホーム画面に追加">⇩</button></div></header><main class="main-content">${state.toast?`<div class="toast-notice">${esc(state.toast)}</div>`:""}${content}</main></div><nav class="mobile-nav" aria-label="スマートフォンのメニュー">${navHtml(mobileNav,["record","record-start","measurement"].includes(page)?"record-start":page,true)}</nav></div>${onboardingState.open?onboardingView():""}`;
 if(page==="record"){
  const rofEditor=app.querySelector(".rof-editor-details");if(rofEditor)rofEditor.open=state.rofEditorOpen;
  for(const id of state.recordOpenSections){const el=app.querySelector('.record-extra-section[data-record-section="'+id+'"]');if(el)el.open=true}
 }
 if(page==="exploration-tree"){
  const viewport=app.querySelector(".tree-pan-viewport");
  if(viewport){
    viewport.scrollLeft=state.treeScroll?.left??Math.max(0,(viewport.scrollWidth-viewport.clientWidth)/2);
    viewport.scrollTop=state.treeScroll?.top??Math.max(0,(viewport.scrollHeight-viewport.clientHeight)/2);
    const display=app.querySelector("[data-tree-zoom-value]");
    if(display)display.textContent=Math.round(state.treeZoom*100)+"%";
  }
 }
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
  app.addEventListener("change",(event)=>{if(event.target.matches("[data-onboard-purpose]"))onboardingState.purpose=event.target.value});
  app.addEventListener("input",(event)=>{
    if(event.target.matches("[data-draft]"))state.recordDraft[event.target.dataset.draft]=event.target.value;
    if(event.target.matches("[data-onboard-nickname]"))onboardingState.nickname=event.target.value;
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
    if(!event.target.matches("[data-draft]"))return;
    const key=event.target.dataset.draft,value=event.target.value;state.recordDraft[key]=value;
    const container=event.target.closest(".record-editor");
    if(!container||!["gradeMode","surfaceMode","runningFormat"].includes(key))return;
    const attr=key==="gradeMode"?"data-grade-submode":key==="surfaceMode"?"data-surface-submode":"data-running-format";
    container.querySelectorAll("["+attr+"]").forEach(node=>node.hidden=node.getAttribute(attr)!==value);
  });
  app.addEventListener("submit",(event)=>{
    const form=event.target.closest("[data-condition-form]");
    if(!form)return;
    event.preventDefault();
    const data=new FormData(form);
    const hours=Number(data.get("hours")),minutes=Number(data.get("minutes"));
    const saved=homeExperience.saveCondition(homePreferenceStorage,{date:String(data.get("date")||""),sleepMinutes:hours*60+minutes,feeling:String(data.get("feeling")||""),memo:String(data.get("memo")||"")});
    homeEditState.notice=saved.ok?"生活記録を保存しました":saved.reason;
    if(saved.ok){homeUi.preview=false;homeUi.conditionOpen=false;}
    render();
  });
  app.addEventListener("click",(event)=>{
    if(event.target.closest("[data-home-preview]")){homeUi.preview=!homeUi.preview;render();return;}
    if(event.target.closest("[data-condition-open]")){homeUi.conditionOpen=true;homeUi.achievementOpen=false;render();return;}
    if(event.target.closest("[data-achievement-open]")){homeUi.achievementOpen=true;homeUi.conditionOpen=false;render();return;}
    if(event.target.closest("[data-home-close]")||(event.target.matches("[data-home-overlay]"))){homeUi.conditionOpen=false;homeUi.achievementOpen=false;render();return;}
    if(event.target.closest("[data-onboard-open]")){onboardingState.open=true;onboardingState.step=0;render();return}
    if(event.target.closest("[data-onboard-close]")){onboardingState.open=false;render();return}
    if(event.target.closest("[data-onboard-back]")){onboardingState.step=Math.max(0,onboardingState.step-1);render();return}
    if(event.target.closest("[data-onboard-next]")){
      if(onboardingState.step<4){onboardingState.step+=1;render();return}
      onboardingState.open=false;
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
    const zoom=event.target.closest("[data-tree-zoom]");
    if(zoom){
      const dir=zoom.dataset.treeZoom;
      const viewport=app.querySelector(".tree-pan-viewport");
      const mobile=window.matchMedia("(max-width:800px)").matches;
      const fit=viewport?Math.min(1,(viewport.clientWidth-4)/(mobile?470:1040),(viewport.clientHeight-4)/(mobile?705:650)):1;
      state.treeZoom=dir==="reset"?Math.max(.4,Math.round(fit*100)/100):Math.min(2.25,Math.max(.4,Math.round((state.treeZoom+(dir==="in"?.2:-.2))*100)/100));
      if(viewport){
        const centerX=(viewport.scrollLeft+viewport.clientWidth/2)/Math.max(.01,viewport.scrollWidth);
        const centerY=(viewport.scrollTop+viewport.clientHeight/2)/Math.max(.01,viewport.scrollHeight);
        viewport.style.setProperty("--tree-zoom",state.treeZoom);
        viewport.scrollLeft=centerX*viewport.scrollWidth-viewport.clientWidth/2;
        viewport.scrollTop=centerY*viewport.scrollHeight-viewport.clientHeight/2;
        state.treeScroll={left:viewport.scrollLeft,top:viewport.scrollTop};
        const o=app.querySelector("[data-tree-zoom-value]");if(o)o.textContent=Math.round(state.treeZoom*100)+"%";
      }
      return;
    }
    const category=event.target.closest("[data-tree-category]");
    if(category){const y=window.scrollY;const c=CATEGORIES.find(c=>c.id===category.dataset.treeCategory);if(c){state.category=c.id;state.topic=c.topics[0];state.sheetVisible=true}render();window.scrollTo(0,y);return}
    if(region){const y=window.scrollY;state.region=region.dataset.region;render();window.scrollTo(0,y);return}
    const expandRegions=event.target.closest("[data-expand-regions]");
    if(expandRegions){const y=window.scrollY;state.mobileRegionsExpanded=!state.mobileRegionsExpanded;render();window.scrollTo(0,y);return}
    const mode=event.target.closest("[data-result-mode]");
    if(mode){const y=window.scrollY;state.resultMode=mode.dataset.resultMode;render();window.scrollTo(0,y);return}
    const openTopic=event.target.closest("[data-open-topic]");
    if(openTopic){const [cat,topic]=openTopic.dataset.openTopic.split("|");if(CATEGORIES.some(c=>c.id===cat&&c.topics.includes(topic))){state.category=cat;state.topic=topic;state.mode="free";state.sheetVisible=true;location.hash="#/exploration-tree";render();window.scrollTo(0,0)}return}
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
    const em=event.target.closest("[data-explore-mode]");
    if(em){const y=window.scrollY;state.mode=em.dataset.exploreMode;render();window.scrollTo(0,y);return}
    const topic=event.target.closest("[data-topic]");
    if(topic){const y=window.scrollY;const [c,t]=topic.dataset.topic.split("|");state.category=c;state.topic=t;state.sheetVisible=true;render();window.scrollTo(0,y);return}
    if(event.target.closest("[data-demo-save]")){state.recordPreviewOpen=true;render();return}
    if(event.target.matches(".record-preview-overlay")||event.target.closest(".record-preview-dialog button[data-close-preview]")){state.recordPreviewOpen=false;render();return}
  });
  app.addEventListener("keydown",(event)=>{
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("path[data-region],g[data-tree-category],g[data-topic]")){event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  });
  window.addEventListener("hashchange",()=>{state.toast="";render();window.scrollTo(0,0)});
  render();
})();
