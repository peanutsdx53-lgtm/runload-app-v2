(async function appMain(){
  "use strict";
  const {BODY_REGION_VIEWS}=await import("./assets/bodyRegionVisuals.js");
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
  const state={region:"BA-DISP-023",resultMode:"all",mode:"today",category:"03",topic:"上り坂・下り坂",recordType:"run",historyMode:"all",toast:"",sheetVisible:true,sheetExpanded:false};
  const pageLabels={home:"ホーム",record:"記録",result:"結果",history:"履歴","exploration-tree":"探究ツリー",settings:"設定",measurement:"測定",course:"コース設計",simulation:"シミュレーション",consultation:"相談・共有","body-part-detail":"部位詳細"};
  const desktopNav=[["home","⌂","ホーム"],["record","✎","記録"],["result","▥","結果"],["history","◷","履歴"],["exploration-tree","⚭","探究ツリー"],["settings","⚙","設定"]];
  const mobileNav=[["home","⌂","ホーム"],["record","✎","記録"],["exploration-tree","⚭","探究"],["history","◷","履歴"],["settings","⚙","設定"]];
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
    return `<figure class="body-view"><figcaption>${esc(view.title)}</figcaption><svg viewBox="70 10 160 430" aria-label="${esc(view.title)}の部位図" role="group"><defs><clipPath id="${cid}">${view.silhouette}</clipPath></defs><g class="body-silhouette">${view.silhouette}</g><g clip-path="url(#${cid})">${paths}</g></svg></figure>`;
  };
  const legend=()=>`<div class="map-legend"><span><i class="dot above"></i>100より上</span><span><i class="dot"></i>100付近</span><span><i class="dot below"></i>100より下</span><span><i class="dot missing"></i>未取得</span></div>`;
  const regionTiles=()=>REGIONS.filter(r=>state.resultMode==="all"||!valid(r.value)||Math.abs(r.value-100)>=1).map(r=>{
    const delta=valid(r.value)?r.value-100:null;
    return `<button type="button" class="region-tile ${state.region===r.id?"is-selected":""}" data-region="${r.id}" aria-pressed="${state.region===r.id}"><span class="name">${esc(r.friendly)}</span><span class="value">${valid(r.value)?r.value.toFixed(1):"—"}</span><span class="baseline ${status(r.value)}">${valid(delta)?"基準差 "+pct(delta):"数値なし"}</span></button>`;
  }).join("");
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
  function radarChart(){
    const labels=["距離","平均速度","ペース変動","上り密度","推定歩調","疲労変化"],a=[.63,.58,.42,.28,.5,.6],b=[.5,.51,.35,.22,.42,.47],cx=150,cy=115;
    const polygon=(data,r)=>data.map((v,i)=>{const theta=i*Math.PI/3;return `${(cx+Math.sin(theta)*r*v).toFixed(1)},${(cy-Math.cos(theta)*r*v).toFixed(1)}`}).join(" ");
    return `<svg class="radar-chart" viewBox="0 0 300 225" role="img" aria-label="架空の今回と前回を示す6軸走行プロフィール。能力点数ではありません">${[.33,.66,1].map(f=>`<polygon points="${polygon([f,f,f,f,f,f],76)}" fill="none" stroke="#c8d8e0"/>`).join("")}${labels.map((l,i)=>{const t=i*Math.PI/3;return `<line x1="${cx}" y1="${cy}" x2="${cx+Math.sin(t)*76}" y2="${cy-Math.cos(t)*76}" stroke="#cadbe3"/><text class="radar-label" text-anchor="middle" x="${cx+Math.sin(t)*108}" y="${cy-Math.cos(t)*97+4}">${l}</text>`}).join("")}<polygon points="${polygon(b,76)}" fill="#94a3b8" fill-opacity=".14" stroke="#94a3b8" stroke-width="2"/><polygon points="${polygon(a,76)}" fill="#0891b2" fill-opacity=".16" stroke="#0891b2" stroke-width="2.4"/></svg>`;
  }
  function home(){
return `<section class="home-head"><div><div class="eyebrow">YOUR RUNNING SPACE</div><h1>ホーム</h1><p class="lead">走る日も、休む日も。自分のペースで続けよう。</p></div><a href="#/record" class="btn primary">＋ 記録する</a></section>
<section class="home-dashboard">
<div class="card home-feature">
 <div class="section-title"><div><h2>今日のコンディション</h2><p class="lead">今の自分を知る、小さな記録</p></div><span class="wellness-sun" aria-hidden="true">☀</span></div>
 <div class="condition-profile"><div class="condition-ring"><span aria-hidden="true">◌</span></div><div class="condition-copy"><strong>今日の調子は？</strong><p>自分の感じ方を、好きなときに残しましょう。</p><a href="#/record" class="btn soft">コンディションを記録する →</a></div></div>
 <div class="mini-head"><strong>最近の記録</strong><a href="#/history">履歴を見る ↗</a></div>
 <div class="quick-run-facts"><span>◷ 45分</span><span>◇ 8.20km</span><span>♡ 疲労感 6 → 8</span></div>
</div>
<div class="card latest-run-card">
 <div class="section-title"><h2>直近の走行</h2><a class="text-link" href="#/history">すべて見る ↗</a></div>
 <div class="latest-run-top"><div class="route-placeholder"><span class="route-placeholder-icon" aria-hidden="true">⌁</span><div class="route-placeholder-label">GPS軌跡なし</div></div>
 <div class="latest-run-content"><span class="badge">10月22日</span><h3>今日の走行記録</h3><div class="home-metrics"><div><strong>8.20</strong><small>km</small><p>距離</p></div><div><strong>45</strong><small>分</small><p>時間</p></div><div><strong>5:29</strong><small>/km</small><p>ペース</p></div></div><a class="btn primary" href="#/result">結果を見る →</a></div></div>
</div>
</section>
<section class="grid-3 dashboard-bottom">
<a class="card home-shortcut home-shortcut-explore" href="#/exploration-tree"><div class="shortcut-icon">✧</div><div><strong>探究ツリー</strong><p>気になる枝から、自分の走りを探究する。</p></div><span>↗</span></a>
<a class="card home-shortcut" href="#/measurement"><div class="shortcut-icon">◷</div><div><strong>走行を測定</strong><p>GPSで走行を記録する。</p></div><span>↗</span></a>
<a class="card home-shortcut" href="#/history"><div class="shortcut-icon">▥</div><div><strong>過去を振り返る</strong><p>これまでの変化を確かめる。</p></div><span>↗</span></a>
</section>
<section class="grid-2 dashboard-bottom"><div class="card"><div class="section-title"><h2>記録の移り変わり</h2><a href="#/history" class="text-link">詳細を見る ↗</a></div><div class="home-trend">${historyChart(regionData("BA-DISP-023"))}</div></div><div class="card"><div class="section-title"><h2>探究の続きを見る</h2><a href="#/exploration-tree" class="text-link">開く ↗</a></div><div class="home-question"><div class="question-leaf">✦</div><div><strong>自分が感じた疲れ</strong><p class="lead">走行記録を見比べながら、気になるテーマを探してみましょう。</p></div></div></div></section>`;
}
    function record(){
return `<section class="home-head"><div><div class="eyebrow">RUNNING LOG</div><h1>記録</h1><p class="lead">その日の走りと感じたことを、無理なく残す。</p></div>${buttonLink("measurement","GPS測定へ",true)}</section>
<section class="grid-2"><div class="card stack"><div class="section-title"><h2>今日の記録をつける</h2><div class="segmented"><button data-record-type="run" class="${state.recordType==="run"?"is-active":""}">走行</button><button data-record-type="rest" class="${state.recordType==="rest"?"is-active":""}">休養</button></div></div>
<div class="record-form-hero"><span class="record-form-icon">✎</span><div><strong>${state.recordType==="run"?"走った内容を記録する":"休養の内容を記録する"}</strong><p class="lead">入力する項目は必要なものだけで構いません。</p></div></div><div class="form-grid">${state.recordType==="run"?`<label class="field">距離（km）<input type="number" inputmode="decimal" value="8.2"></label><label class="field">時間（分）<input type="number" inputmode="decimal" value="45"></label>`:""}<label class="field">記録日<input type="date" value="2026-10-22"></label><label class="field">今の調子（任意）<select><option>選択しない</option><option>とても良い</option><option>良い</option><option>いつもどおり</option><option>あまり良くない</option><option>分からない</option></select></label></div><label class="field">感じたこと・気づいたこと（任意）<textarea placeholder="今日の気づきを自由に"></textarea></label><div class="record-bottom-actions"><button class="btn primary" type="button" data-demo-save>記録を確認する　→</button><a class="text-link" href="#/history">過去の記録を見る</a></div></div>
<div class="card stack"><div class="section-title"><h2>走る前の準備</h2></div><a href="#/measurement" class="feature-entry"><span class="entry-icon cyan">◷</span><span><strong>GPSで測定</strong><small>走行ルートと時間を記録</small></span><span class="entry-arrow">›</span></a><a href="#/course" class="feature-entry"><span class="entry-icon blue">△</span><span><strong>コース設計</strong><small>距離・坂・路面を整理</small></span><span class="entry-arrow">›</span></a><a href="#/exploration-tree" class="feature-entry"><span class="entry-icon violet">✦</span><span><strong>探究ツリー</strong><small>記録を振り返り、理解を深める</small></span><span class="entry-arrow">›</span></a></div></section>`;
}
    function result(){
 const current=regionData(state.region),v=current.value,prev=current.prev;
 const comparison=valid(v)&&valid(prev)?pct(v-prev):"—";
 return `<section class="result-top card"><div class="result-heading"><div><div class="eyebrow">RUN REPORT</div><h1>結果</h1><p class="lead">走りを振り返り、自分のペースで次へつなげる。</p></div><div class="result-top-signals"><div class="signal-box"><span class="signal-icon">▥</span><span><small>数値あり</small><strong>11/12</strong></span></div><div class="signal-box"><span class="signal-icon">⇄</span><span><small>前回の参考値</small><strong>あり</strong></span></div><div class="signal-box warm"><span class="signal-icon">⌁</span><span><small>疲労感の変化</small><strong>+2</strong></span></div></div></div>
 <div class="run-facts"><span>◫　10月22日</span><span>◇　<strong>8.20</strong> km</span><span>◷　<strong>45</strong> 分</span><span>◉　<strong>5:29</strong> /km</span><span>⌁　コース情報なし</span></div></section>
 <section class="result-primary">
 <div class="card anatomy-card"><div class="section-title"><h2>身体の部位から見る</h2><a href="#/body-part-detail" class="help-link">部位の見方　ⓘ</a></div><div class="body-map-row">${BODY_REGION_VIEWS.map(svgBody).join("")}</div>${legend()}<p class="chart-caption">色は各部位自身の基準100との関係を示します。</p></div>
 <div class="card regions-card"><div class="section-title"><h2>12部位を見渡す</h2><div class="segmented"><button data-result-mode="all" class="${state.resultMode==="all"?"is-active":""}">全体</button><button data-result-mode="focus" class="${state.resultMode==="focus"?"is-active":""}">注目</button></div></div><div class="region-grid">${regionTiles()}</div><p class="chart-caption">部位を選ぶと、人体図と詳細が連動します。</p></div>
 </section>
 <section class="result-lower"><div class="card region-detail-card" id="selected-detail"><div class="section-title"><div class="detail-head"><h2>選択部位の詳細</h2><span class="selected-name"><i class="detail-icon">◍</i>${esc(current.friendly)}</span></div>${buttonLink("body-part-detail","部位の詳細")}</div><div class="detail-metrics"><div class="highlight-detail"><small>今回の数値</small><strong>${valid(v)?v.toFixed(1):"—"}</strong></div><div><small>基準値</small><strong>100</strong></div><div><small>基準からの差</small><strong class="${status(v)}">${valid(v)?pct(v-100):"—"}</strong></div><div><small>前回の数値</small><strong>${valid(prev)?prev.toFixed(1):"—"}</strong></div><div><small>前回からの変化</small><strong class="${status(v)}">${comparison}</strong></div></div>
 <h3 class="detail-chart-title">${esc(current.friendly)}の推移</h3><div class="chart-card">${historyChart(current)}</div>
 <p class="reference-note">ⓘ 各部位自身の基準を100とする文献由来の参考値です。実測した筋負荷・健康状態・傷害リスクを表すものではありません。</p></div>
 <div class="support-stack">
 <div class="card fatigue-panel"><div class="section-title"><h2>運動前後の疲労感 <small>(ROF-J)</small></h2></div><div class="fatigue-flex"><div class="fatigue-cell"><small>運動前</small><strong>6</strong><span class="scale blue"></span></div><div class="fatigue-cell"><small>運動後</small><strong>8</strong><span class="scale orange"></span></div><div class="fatigue-cell difference"><small>変化</small><strong>+2</strong></div></div><p class="chart-caption">本人が回答した0〜10の主観的な疲労感。</p></div>
 <div class="card radar-panel"><div class="section-title"><h2>走行プロフィール <small>(参考)</small></h2></div>${radarChart()}<div class="map-legend"><span><i class="dot" style="background:#0891b2"></i>今回</span><span><i class="dot missing"></i>比較する記録</span></div><p class="chart-caption">6つの走行指標の形。身体能力の判定ではありません。</p></div>
 <div class="result-actions">${buttonLink("exploration-tree","探究ツリーへ",true)}${buttonLink("history","履歴を見る")}</div></div>
 </section>`;
}
    function history(){
 const data=[["10月22日","8.20 km　・　45分","走行"],["10月12日","5.40 km　・　31分","走行"],["10月5日","休養日の記録","休養"]];
 const shown=data.filter(x=>state.historyMode==="all"||x[2]===state.historyMode);
 return `<section class="home-head"><div><div class="eyebrow">RUNNING HISTORY</div><h1>履歴</h1><p class="lead">これまでの記録を、日付や条件から振り返る。</p></div>${buttonLink("record","記録する",true)}</section><section class="card"><div class="section-title"><h2>記録を探す</h2><div class="segmented">${[["all","すべて"],["走行","走行"],["休養","休養"]].map(([k,n])=>`<button data-history-mode="${k}" class="${state.historyMode===k?"is-active":""}">${n}</button>`).join("")}</div></div><div class="history-layout"><div class="history-calendar"><h3>2026年10月</h3><div class="mini-calendar">${["日","月","火","水","木","金","土",...Array(4).fill(""),...Array.from({length:31},(_,i)=>String(i+1))].map(day=>`<span class="${day==="22"?"calendar-today":""}">${day}</span>`).join("")}</div></div><div class="history-records"><h3>最近の記録</h3><div class="timeline">${shown.map(([date,distance,type])=>`<a class="timeline-item" href="#/${type==="休養"?"history":"result"}"><span class="history-row-mark">${type==="走行"?"↗":"◌"}</span><span><strong>${date}</strong><p class="lead">${distance}</p></span><span class="badge">${type}</span><span>›</span></a>`).join("")}</div></div></div></section><section class="grid-2"><a class="card home-shortcut" href="#/exploration-tree"><span class="shortcut-icon">✧</span><span><strong>探究の足跡</strong><p>興味を持ったテーマや問いを振り返る。</p></span><span>↗</span></a><a class="card home-shortcut" href="#/result"><span class="shortcut-icon">▥</span><span><strong>身体の推移</strong><p>12部位の過去の参考値を確かめる。</p></span><span>↗</span></a></section>`;
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
 // Original UI decoration drawn from geometry; no downloaded or AI-rendered imagery.
 const decorativeLeaf=(px,py,angle,scale=1,shade="#8bcbb3")=>`<g class="tree-decoration" transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${angle.toFixed(1)}) scale(${scale.toFixed(2)})"><path d="M0 0 Q -5 -17 -22 -20 Q -19 -4 0 0Z" fill="${shade}" opacity=".82"/><path d="M0 0 Q 6 11 19 13 Q 17 1 0 0Z" fill="#bcd8a0" opacity=".85"/></g>`;
 const branchLeaves=(x0,y0,x1,y1,index=0)=>{
   const vx=x1-x0,vy=y1-y0;
   const base=Math.atan2(vy,vx)*180/Math.PI;
   const colors=["#9fd5c2","#a7cfbb","#bcd6aa","#96caba"];
   return [0.38,0.62,0.79].map((t,k)=>decorativeLeaf(
     x0+vx*t + Math.sin((index+1)*(k+1))*4,
     y0+vy*t + Math.cos((index+1)*(k+2))*4,
     base+(k%2===0?-17:23),
     0.67+(k===1?0.17:0),
     colors[(index+k)%colors.length]
   )).join("");
 };
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
return hero+tabs+summary+`<section class="explore-main"><div class="card exploration-stage"><div class="explore-stage-title"><div><small>EXPLORATION MAP</small><h2>自分だけの探究を見つける</h2></div><span class="subtle-note">● 選択中の枝</span></div>${treeOverview()}
 <div class="explore-topic-detail"><div class="explore-topic-header"><div><small>選択中の分野</small><h3 style="color:${c.color}">${esc(c.name)}</h3></div><span class="badge">4つのテーマ</span></div>
 <div class="tree-topics">${topicButtons}</div>
 <div class="selected-topic-summary"><div><small>選択したテーマ</small><strong>${esc(state.topic)}</strong></div><div class="btn-row">${buttonLink("result","自分の結果を見る")}${buttonLink("history","記録を比べる")}</div></div></div>
 </div>${right}</section>${sheetBody}`;
}
    function settings(){
return `<section class="home-head"><div><div class="eyebrow">PREFERENCES</div><h1>設定</h1><p class="lead">表示・データ管理・アプリの使い方を設定する。</p></div></section>
<section class="settings-grid">${[["◈","表示とアクセシビリティ",[["文字と表示","読みやすい表示方法を選ぶ"],["動きの設定","アニメーションを抑える"]]],["♧","プライバシーとデータ",[["記録の管理","保存した記録の確認"],["位置情報","GPS利用時の取り扱い"]]],["?","ヘルプとアプリ",[["使い方","各機能の使い方を確認"],["RunLoadについて","アプリの情報"]]]].map(([icon,title,options])=>`<div class="card settings-card"><div class="settings-title"><span>${icon}</span><h2>${title}</h2></div>${options.map(([name,desc])=>`<div class="settings-row"><div><strong>${name}</strong><p>${desc}</p></div><span>›</span></div>`).join("")}</div>`).join("")}<div class="card settings-card install-settings"><div class="settings-title"><span>↗</span><h2>アプリをインストール</h2></div><p class="lead">ホーム画面からすぐにRunLoadを開けます。</p><button class="btn primary" data-install-app type="button">ホーム画面に追加する　→</button></div></section>`;
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
    function render(){
 const page=currentPage(),content={home,record,result,history,"exploration-tree":explore,settings}[page]?.()||secondary(page);
 const navPage=page==="result"?"result":page;
 app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 42 38"><path d="M3 29 16 9l6 9 5-6 12 17m-26 0 5-8 5 8M6 34h32" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="3.6" stroke-linecap="round"/></svg></span>RunLoad</div><nav class="side-nav" aria-label="メニュー">${navHtml(desktopNav,navPage,false)}</nav><div class="side-foot"><div class="side-mountains" aria-hidden="true"></div><strong>走ることで、<br>もっと自分を知る。</strong></div></aside><div class="main-frame"><header class="topbar"><div class="topbar-title"><span class="topbar-brand">RunLoad</span><span class="topbar-subtitle">走るほど、わたしが見えてくる</span></div><div class="topbar-right"><a href="#/exploration-tree" class="topbar-search" aria-label="探究ツリーからテーマを探す">⌕ <span>知りたいことを探す...</span></a><button type="button" class="icon-install" data-install-app aria-label="RunLoadをホーム画面に追加">⇩</button></div></header><main class="main-content">${state.toast?`<div class="toast-notice">${esc(state.toast)}</div>`:""}${content}</main></div><nav class="mobile-nav" aria-label="スマートフォンのメニュー">${navHtml(mobileNav,page,true)}</nav></div>`;
}
  app.addEventListener("click",(event)=>{
    const region=event.target.closest("[data-region]");
    const sheetExpand=event.target.closest("[data-sheet-expand]");
    if(sheetExpand){const y=window.scrollY;state.sheetExpanded=!state.sheetExpanded;render();window.scrollTo(0,y);return}
    const sheetToggle=event.target.closest("[data-sheet-toggle]");
    if(sheetToggle){const y=window.scrollY;state.sheetVisible=!state.sheetVisible;render();window.scrollTo(0,y);return}
    const category=event.target.closest("[data-tree-category]");
    if(category){const y=window.scrollY;const c=CATEGORIES.find(c=>c.id===category.dataset.treeCategory);if(c){state.category=c.id;state.topic=c.topics[0]}render();window.scrollTo(0,y);return}
    if(region){const y=window.scrollY;state.region=region.dataset.region;render();window.scrollTo(0,y);return}
    const mode=event.target.closest("[data-result-mode]");
    if(mode){const y=window.scrollY;state.resultMode=mode.dataset.resultMode;render();window.scrollTo(0,y);return}
    const type=event.target.closest("[data-record-type]");
    if(type){const y=window.scrollY;state.recordType=type.dataset.recordType;render();window.scrollTo(0,y);return}
    const filter=event.target.closest("[data-history-mode]");
    if(filter){const y=window.scrollY;state.historyMode=filter.dataset.historyMode;render();window.scrollTo(0,y);return}
    const em=event.target.closest("[data-explore-mode]");
    if(em){const y=window.scrollY;state.mode=em.dataset.exploreMode;render();window.scrollTo(0,y);return}
    const topic=event.target.closest("[data-topic]");
    if(topic){const y=window.scrollY;const [c,t]=topic.dataset.topic.split("|");state.category=c;state.topic=t;render();window.scrollTo(0,y);return}
    if(event.target.closest("[data-demo-save]")){state.toast="";location.hash="#/result";window.scrollTo(0,0)}
  });
  app.addEventListener("keydown",(event)=>{
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("path[data-region],g[data-tree-category],g[data-topic]")){event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  });
  window.addEventListener("hashchange",()=>{state.toast="";render();window.scrollTo(0,0)});
  render();
})();
