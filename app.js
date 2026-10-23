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
  const state={region:"BA-DISP-023",resultMode:"all",mode:"today",category:"03",topic:"上り坂・下り坂",recordType:"run",historyMode:"all",toast:""};
  const pageLabels={home:"ホーム",record:"記録",result:"結果",history:"履歴","exploration-tree":"探究ツリー",settings:"設定",measurement:"測定",course:"コース設計",simulation:"シミュレーション",consultation:"相談・共有","body-part-detail":"部位詳細"};
  const desktopNav=[["home","⌂","ホーム"],["record","✎","記録"],["result","▥","結果"],["history","◷","履歴"],["exploration-tree","⚭","探究ツリー"],["settings","⚙","設定"]];
  const mobileNav=[["home","⌂","ホーム"],["record","✎","記録"],["exploration-tree","⚭","探究"],["history","◷","履歴"],["settings","⚙","設定"]];
  const currentPage=()=>{const path=location.hash.replace(/^#\/?/,"").split("?")[0];return pageLabels[path]?path:"home"};
  const navHtml=(items,page,mobile)=>items.map(([path,icon,label])=>`<a class="${mobile?"mobile-link":"side-link"} ${page===path?"is-active":""}" href="#/${path}" ${page===path?'aria-current="page"':""}><span class="nav-icon">${icon}</span>${label}</a>`).join("");
  const header=(name,description,right="")=>`<section class="card page-hero"><div><div class="eyebrow">RUNLOAD UI NEXT</div><h1>${name}</h1><p class="lead">${description}</p></div>${right}</section>`;
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
      return `<path d="${d}" data-region="${esc(id)}" class="region-path ${status(r.value)}${selected}" role="button" tabindex="0" aria-label="${esc(r.friendly)}の詳細を表示"><title>${esc(r.name)}：${valid(r.value)?r.value.toFixed(1):"未取得"}（デモ）</title></path>`;
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
    if(!Number.isFinite(region?.value))return `<div class="empty-state">この部位の推移は表示できません（仮データ未設定）。</div>`;
    const v=region.value;
    const vals=[v-9.5,v-7.1,v-8.0,v-5.1,Number.isFinite(region.prev)?region.prev:v-2.8,v];
    const lo=Math.min(...vals,100)-6,hi=Math.max(...vals,100)+6;
    const x1=20,x2=520,y1=25,y2=132;
    const coord=(val,i)=>[(x1+(x2-x1)*i/(vals.length-1)).toFixed(1),(y2-(val-lo)/(hi-lo)*(y2-y1)).toFixed(1)];
    const pts=vals.map((val,i)=>coord(val,i).join(",")).join(" ");
    const base=(y2-(100-lo)/(hi-lo)*(y2-y1)).toFixed(1);
    return `<svg class="spark-chart" viewBox="0 0 540 155" role="img" aria-label="${region.friendly}の仮の推移。実記録ではありません"><line x1="18" x2="520" y1="${base}" y2="${base}" stroke="#819eae" stroke-dasharray="5 4"/><text x="22" y="${Math.max(12,Number(base)-5)}" fill="#708895" font-size="11">基準100</text><polyline points="${pts}" fill="none" stroke="#008a9c" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/>${vals.map((val,i)=>{const [x,y]=coord(val,i);return `<circle cx="${x}" cy="${y}" r="4" fill="#fff" stroke="#008a9c" stroke-width="2.4"/>`}).join("")}<text x="516" y="16" text-anchor="end" fill="#007589" font-size="12" font-weight="800">デモ ${v.toFixed(1)}</text></svg>`;
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
 <div class="latest-run-top"><div class="route-placeholder"><svg viewBox="0 0 180 145" aria-hidden="true"><path d="M0 27 H180 M0 69 H180 M0 111 H180 M27 0 V145 M91 0 V145 M155 0 V145" stroke="#cce0e5" stroke-width="2"/><path d="M-10 120 Q36 80 70 106 T190 20" stroke="#9dd3c5" stroke-width="19" fill="none"/><path d="M10 6 Q76 38 180 76" stroke="#d2e8f3" stroke-width="13" fill="none"/></svg><div class="route-placeholder-label">GPSの走行軌跡なし</div></div>
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
 return `<section class="home-head"><div><div class="eyebrow">RUNNING HISTORY</div><h1>履歴</h1><p class="lead">これまでの記録を、日付や条件から振り返る。</p></div>${buttonLink("record","記録する",true)}</section><section class="card"><div class="section-title"><h2>記録を探す</h2><div class="segmented">${[["all","すべて"],["走行","走行"],["休養","休養"]].map(([k,n])=>`<button data-history-mode="${k}" class="${state.historyMode===k?"is-active":""}">${n}</button>`).join("")}</div></div><div class="history-layout"><div class="history-calendar"><h3>2026年10月</h3><div class="mini-calendar">${["日","月","火","水","木","金","土",...Array.from({length:31},(_,i)=>String(i+1))].map(day=>`<span class="${day==="22"?"calendar-today":""}">${day}</span>`).join("")}</div></div><div class="history-records"><h3>最近の記録</h3><div class="timeline">${shown.map(([date,distance,type])=>`<a class="timeline-item" href="#/${type==="休養"?"history":"result"}"><span class="history-row-mark">${type==="走行"?"↗":"◌"}</span><span><strong>${date}</strong><p class="lead">${distance}</p></span><span class="badge">${type}</span><span>›</span></a>`).join("")}</div></div></div></section><section class="grid-2"><a class="card home-shortcut" href="#/exploration-tree"><span class="shortcut-icon">✧</span><span><strong>探究の足跡</strong><p>興味を持ったテーマや問いを振り返る。</p></span><span>↗</span></a><a class="card home-shortcut" href="#/result"><span class="shortcut-icon">▥</span><span><strong>身体の推移</strong><p>12部位の過去の参考値を確かめる。</p></span><span>↗</span></a></section>`;
}
    function treeOverview(){
  const positions=[["01",150,96],["02",408,72],["03",729,100],["04",784,271],["05",674,389],["06",392,385],["07",138,304]];
  const paths=positions.map(([id,x,y])=>{const c=CATEGORIES.find(a=>a.id===id);const selected=state.category===id;
    return `<path d="M450,228 Q${Math.round((450+x)/2)},${Math.round((228+y)/2-22)} ${x},${y}" fill="none" stroke="${c.color}" stroke-opacity="${selected?".6":".3"}" stroke-width="${selected?4:2.4}" stroke-linecap="round"/>`;
  }).join("");
  const nodes=positions.map(([id,x,y])=>{
    const c=CATEGORIES.find(a=>a.id===id),sel=state.category===id;
    return `<g data-tree-category="${id}" class="tree-node ${sel?"is-selected":""}" role="button" tabindex="0" aria-label="${esc(c.name)}のテーマを表示" aria-pressed="${sel}"><rect x="${x-84}" y="${y-28}" width="168" height="56" rx="19" fill="#fff" stroke="${c.color}" stroke-width="${sel?3:1.5}"/><circle cx="${x-60}" cy="${y}" r="8" fill="${c.color}"/><text x="${x+8}" y="${y+5}" text-anchor="middle" fill="#1a354a" font-size="15" font-weight="700">${esc(c.name)}</text>${sel?`<rect x="${x-90}" y="${y-34}" width="180" height="68" rx="23" fill="none" stroke="${c.color}" stroke-opacity=".20" stroke-width="7"/>`:""}</g>`;
  }).join("");
  const desktop=`<svg class="tree-canvas tree-desktop" viewBox="0 0 920 470" role="group" aria-label="中心から7分野に枝分かれする探究ツリー。各分野を選択できます"><g>${paths}</g><circle cx="450" cy="228" r="65" fill="#e9f7f7"/><circle cx="450" cy="228" r="53" fill="#007e96"/><text x="450" y="221" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">RunLoad</text><text x="450" y="241" text-anchor="middle" font-size="13" fill="#ddf7f8">探究ツリー</text>${nodes}</svg>`;
  const mobilePositions=[["01",100,120],["02",260,172],["03",100,225],["04",260,278],["05",100,332],["06",260,385],["07",100,439]];
  const mobilePaths=mobilePositions.map(([id,x,y])=>{const c=CATEGORIES.find(a=>a.id===id);return `<path d="M180,77 L180,${y} L${x},${y}" stroke="${c.color}" stroke-width="${state.category===id?3:1.7}" stroke-opacity="${state.category===id?".65":".27"}" fill="none"/>`}).join("");
  const mobileNodes=mobilePositions.map(([id,x,y])=>{const c=CATEGORIES.find(a=>a.id===id),sel=state.category===id;return `<g data-tree-category="${id}" class="tree-node ${sel?"is-selected":""}" role="button" tabindex="0" aria-label="${esc(c.name)}のテーマを表示" aria-pressed="${sel}"><rect x="${x-81}" y="${y-21}" width="162" height="43" rx="15" fill="#fff" stroke="${c.color}" stroke-width="${sel?3:1.6}"/><circle cx="${x-60}" cy="${y}" r="6" fill="${c.color}"/><text x="${x+8}" y="${y+4}" text-anchor="middle" font-size="13" font-weight="750" fill="#233b4b">${esc(c.name)}</text></g>`}).join("");
  const mobile=`<svg class="tree-canvas tree-mobile" viewBox="0 0 360 483" role="group" aria-label="7分野の探究ツリー。分野の選択で下のテーマが変わります"><path d="M180,76 L180,439" fill="none" stroke="#a8d3dc" stroke-width="2" stroke-dasharray="5 5"/>${mobilePaths}<circle cx="180" cy="45" r="37" fill="#007e96"/><text x="180" y="41" text-anchor="middle" font-size="14" font-weight="800" fill="white">探究</text><text x="180" y="56" text-anchor="middle" font-size="11" fill="#ecfbfd">ツリー</text>${mobileNodes}</svg>`;
  return `<div class="tree-overview"><div class="tree-overview__decor" aria-hidden="true"></div>${desktop}${mobile}</div>`;
}
  function explore(){
  const c=CATEGORIES.find(c=>c.id===state.category)||CATEGORIES[0];
  const selectTopics=c.topics.map(topic=>`<button type="button" data-topic="${c.id}|${esc(topic)}" class="topic-choice ${state.topic===topic?"is-selected":""}" aria-pressed="${state.topic===topic}">${esc(topic)} <span aria-hidden="true">›</span></button>`).join("");
  const hint=state.mode==="today"?"今日の記録に関連した発光は、実際のデータと照合できるようになってから有効になります。":state.mode==="free"?"自分が関心を持った枝から自由に探せます。":"本人が保存した問いは、正式な保存機能の接続後に表示します。";
  return header("探究ツリー","走るたび、自分への理解が育つ。",badge("7分野・28テーマ"))+
    `<section class="card explore-toolbar"><div class="section-title"><h2>どこから探しますか？</h2><div class="segmented">${[["today","今回の走り"],["free","自由探索"],["questions","過去の問い"]].map(([mode,label])=>`<button data-explore-mode="${mode}" class="${state.mode===mode?"is-active":""}">${label}</button>`).join("")}</div></div><p class="lead">${hint}</p></section>
    <section class="topic-layout">
      <div class="card tree-panel">
        <div class="section-title"><div><div class="eyebrow">EXPLORE THE RUN</div><h2>気になる枝を選ぶ</h2></div>${badge("操作できるツリー")}</div>
        <p class="lead">7つの分野から一つ選ぶと、関連する4つのテーマが開きます。</p>
        ${treeOverview()}
        <div class="tree-selected-head"><div><small>現在の分野</small><h3 style="color:${c.color}">${esc(c.name)}</h3></div>${badge("4テーマ")}</div>
        <div class="tree-topics">${selectTopics}</div>
      </div>
      <div class="card tree-detail-panel">
        <div class="eyebrow">SELECTED TOPIC</div>
        <h2>${esc(state.topic)}</h2>
        <p class="lead">記録・知識・自分の問いをつなぐための探究テーマです。</p>
        <div class="topic-detail feature-insight"><strong>今回の記録との接点</strong><p>この試作版では科学計算・記録連携を行っていません。関係が確認できない情報を推測で補完しません。</p><span class="badge ghost">実データ未接続</span></div>
        <div class="tree-detail-step"><span class="step-num">01</span><div><strong>自分の記録を確かめる</strong><p>12部位の参考値や過去の走行と照らし合わせます。</p></div>${buttonLink("result","結果へ")}</div>
        <div class="tree-detail-step"><span class="step-num">02</span><div><strong>知識を探す</strong><p>出典のある関連コラムを統合する予定です。</p></div><span class="badge ghost">準備中</span></div>
        <div class="tree-detail-step"><span class="step-num">03</span><div><strong>自分の問いを残す</strong><p>本人が選んだ場合だけ記録し、次回も確かめられます。</p></div><span class="badge ghost">準備中</span></div>
        <div class="tree-next"><strong>次にできること</strong><p class="lead">知識を読む、記録を振り返る、何も選ばず終了する。いずれも本人の自由です。</p><div class="btn-row">${buttonLink("history","履歴へ")}${buttonLink("record","記録へ")}</div></div>
      </div>
    </section>`;
}
  function settings(){
return `<section class="home-head"><div><div class="eyebrow">PREFERENCES</div><h1>設定</h1><p class="lead">表示・データ管理・アプリの使い方を設定する。</p></div></section>
<section class="settings-grid">${[["◈","表示とアクセシビリティ",[["文字と表示","読みやすい表示方法を選ぶ"],["動きの設定","アニメーションを抑える"]]],["♧","プライバシーとデータ",[["記録の管理","保存した記録の確認"],["位置情報","GPS利用時の取り扱い"]]],["?","ヘルプとアプリ",[["使い方","各機能の使い方を確認"],["RunLoadについて","アプリの情報"]]]].map(([icon,title,options])=>`<div class="card settings-card"><div class="settings-title"><span>${icon}</span><h2>${title}</h2></div>${options.map(([name,desc])=>`<div class="settings-row"><div><strong>${name}</strong><p>${desc}</p></div><span>›</span></div>`).join("")}</div>`).join("")}<div class="card settings-card install-settings"><div class="settings-title"><span>↗</span><h2>アプリをインストール</h2></div><p class="lead">ホーム画面からすぐにRunLoadを開けます。</p><button class="btn primary" data-install-app type="button">ホーム画面に追加する　→</button></div></section>`;
}
    function secondary(page){
    const title=pageLabels[page]||"付属機能";
    const details={measurement:"GPS測定画面の配置・操作を検討中です。位置情報は取得・保存していません。",course:"コース名・路面・上り下りなどの条件を入力する画面です。",simulation:"条件を変えた場合の表示領域。計算モデルや結果を実行していません。",consultation:"相談・共有のための画面。安全案内と共有範囲を別途確認します。","body-part-detail":"選択した部位の正式名称、本人の記録、比較できる過去の値を確認する詳細領域です。"};
    return header(title,"主要6領域から利用する付属機能です。",badge("配置・動線の試作"))+
    `<section class="card stack"><div class="empty-state"><strong>${title}</strong><p class="lead">${details[page]||""}</p><span class="badge warn">まだ機能連携はありません</span></div><div class="btn-row">${buttonLink("record","記録へ")}${buttonLink("result","結果へ")}${buttonLink("exploration-tree","探究ツリーへ")}</div></section>`;
  }
  function render(){
 const page=currentPage(),content={home,record,result,history,"exploration-tree":explore,settings}[page]?.()||secondary(page);
 const navPage=page==="result"?"result":page;
 app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">↗</span>RunLoad</div><nav class="side-nav" aria-label="メニュー">${navHtml(desktopNav,navPage,false)}</nav><div class="side-foot"><div class="side-mountains" aria-hidden="true"></div><strong>走ることで、<br>もっと自分を知る。</strong></div></aside><div class="main-frame"><header class="topbar"><div class="topbar-title"><span class="topbar-brand">RunLoad</span><span class="topbar-subtitle">走るほど、わたしが見えてくる</span></div><div class="topbar-right"><a href="#/exploration-tree" class="topbar-search" aria-label="探究ツリーからテーマを探す">⌕ <span>知りたいことを探す...</span></a><button type="button" class="icon-install" data-install-app aria-label="RunLoadをホーム画面に追加">⇩</button></div></header><main class="main-content">${state.toast?`<div class="toast-notice">${esc(state.toast)}</div>`:""}${content}</main></div><nav class="mobile-nav" aria-label="スマートフォンのメニュー">${navHtml(mobileNav,page,true)}</nav></div>`;
}
  app.addEventListener("click",(event)=>{
    const region=event.target.closest("[data-region]");
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
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("path[data-region],g[data-tree-category]")){event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  });
  window.addEventListener("hashchange",()=>{state.toast="";render();window.scrollTo(0,0)});
  render();
})();
