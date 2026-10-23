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
  const status=(v)=>!valid(v)?"missing":v>=101?"above":v<=99?"below":"near";
  const stateLabel=(v)=>!valid(v)?"表示なし":v>=101?"基準より上":v<=99?"基準より下":"基準付近";
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
  function historyChart(){
    const values=[88,93,95,97,108.2,112.4],xmin=18,xmax=516,ymin=30,ymax=132;
    const point=(v,i)=>[(xmin+(xmax-xmin)*i/(values.length-1)).toFixed(1),(ymax-(v-70)/(125-70)*(ymax-ymin)).toFixed(1)];
    const points=values.map((v,i)=>point(v,i).join(",")).join(" ");
    const baseY=(ymax-(100-70)/(125-70)*(ymax-ymin)).toFixed(1);
    return `<svg class="spark-chart" viewBox="0 0 540 158" role="img" aria-label="架空の6走行における選択部位の値の推移。実データではありません"><line x1="18" x2="520" y1="${baseY}" y2="${baseY}" stroke="#829baa" stroke-dasharray="5 4"/><text x="20" y="${Number(baseY)-5}" fill="#748a99" font-size="11">基準100</text><polyline points="${points}" fill="none" stroke="#008a9c" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/>${values.map((v,i)=>{const [x,y]=point(v,i);return `<circle cx="${x}" cy="${y}" r="4" fill="white" stroke="#008a9c" stroke-width="2.5"/>`}).join("")}<text x="514" y="25" text-anchor="end" fill="#007589" font-weight="bold" font-size="13">デモ：112.4</text></svg>`;
  }
  function radarChart(){
    const labels=["距離","平均速度","ペース変動","上り密度","推定歩調","疲労変化"],a=[.63,.58,.42,.28,.5,.6],b=[.5,.51,.35,.22,.42,.47],cx=150,cy=115;
    const polygon=(data,r)=>data.map((v,i)=>{const theta=i*Math.PI/3;return `${(cx+Math.sin(theta)*r*v).toFixed(1)},${(cy-Math.cos(theta)*r*v).toFixed(1)}`}).join(" ");
    return `<svg class="radar-chart" viewBox="0 0 300 225" role="img" aria-label="架空の今回と前回を示す6軸走行プロフィール。能力点数ではありません">${[.33,.66,1].map(f=>`<polygon points="${polygon([f,f,f,f,f,f],76)}" fill="none" stroke="#c8d8e0"/>`).join("")}${labels.map((l,i)=>{const t=i*Math.PI/3;return `<line x1="${cx}" y1="${cy}" x2="${cx+Math.sin(t)*76}" y2="${cy-Math.cos(t)*76}" stroke="#cadbe3"/><text class="radar-label" text-anchor="middle" x="${cx+Math.sin(t)*108}" y="${cy-Math.cos(t)*97+4}">${l}</text>`}).join("")}<polygon points="${polygon(b,76)}" fill="#94a3b8" fill-opacity=".14" stroke="#94a3b8" stroke-width="2"/><polygon points="${polygon(a,76)}" fill="#0891b2" fill-opacity=".16" stroke="#0891b2" stroke-width="2.4"/></svg>`;
  }
  function home(){
    return header("ホーム","今日の記録から、振り返りと探究へ。",buttonLink("record","記録を始める",true))+
    `<section class="grid-2"><div class="card stack"><div class="section-title"><h2>今日の記録</h2>${badge("入力は任意")}</div><div class="empty-state"><strong>今日のコンディションは未入力です</strong><p class="lead">勝手な総合点をつけず、ご自身の記録だけを表示します。</p>${buttonLink("record","今の調子を記録する")}</div></div><div class="card stack"><div class="section-title"><h2>前回の記録（デモ）</h2>${badge("例示データ","warn")}</div><div class="metric-grid">${metric("距離","8.2","km")}${metric("時間","45","分")}${metric("平均ペース","5:29","/km")}${metric("入力した疲労感","6 → 8","/10")}</div>${buttonLink("result","結果を見る",true)}</div></section>
    <section class="grid-3"><a class="simple-card emphasis" href="#/exploration-tree"><strong>✦ 探究ツリー</strong><p>自分の走りを起点に、気になる知識や問いを自由に探す。</p><span class="badge">7分野・28テーマ</span></a><a class="simple-card" href="#/measurement"><strong>◷ GPSで測定</strong><p>記録やコース情報につなぐための操作入口。</p></a><a class="simple-card" href="#/history"><strong>▥ 履歴を見る</strong><p>過去の記録と、自分の探究の足跡を確認する。</p></a></section>`;
  }
  function record(){
    return header("記録","走行・休養の記録を一つの入口から。",buttonLink("measurement","GPS測定へ"))+
    `<section class="grid-2"><div class="card stack"><div class="section-title"><h2>記録する種類</h2>${badge("画面操作デモ")}</div><div class="segmented"><button data-record-type="run" class="${state.recordType==="run"?"is-active":""}">走行</button><button data-record-type="rest" class="${state.recordType==="rest"?"is-active":""}">休養</button></div><div class="form-grid">${state.recordType==="run"?`<label class="field">距離（km）<input type="number" inputmode="decimal" value="8.2"></label><label class="field">時間（分）<input type="number" inputmode="decimal" value="45"></label>`:`<div class="info-note">休養の記録では、12部位の走行計算値を表示しません。</div>`}<label class="field">記録日<input type="date" value="2026-10-22"></label><label class="field">今の調子（任意）<select><option>選択しない</option><option>とても良い</option><option>良い</option><option>いつもどおり</option><option>あまり良くない</option><option>分からない</option></select></label></div><label class="field">気づいたこと（任意）<textarea placeholder="自分の言葉を残せます。空欄でも構いません。"></textarea></label><div class="btn-row"><button class="btn primary" data-demo-save>デモの結果を見る →</button></div><p class="project-status">現段階ではフォームの値を科学計算・履歴へ保存しません。</p></div><div class="card stack"><h2>記録の準備</h2><a href="#/course" class="simple-card"><strong>△ コース設計</strong><p>路面・坂・距離などの条件を整理する。</p></a><a href="#/measurement" class="simple-card"><strong>◷ GPS測定</strong><p>位置情報の取得や記録を行うための領域。</p></a><div class="info-note">走行コースの地図は、実際に保存されたGPS軌跡がある場合のみ表示する方針です。</div></div></section>`;
  }
  function result(){
    const current=regionData(state.region),v=current.value,prev=current.prev;
    return header("結果","12部位比較値と3種類の人体図が、この画面の中心です。",badge("参考指標・デモ","warn"))+
    `<section class="card stack"><div class="section-title"><h2>今回の走行（仮データ）</h2>${badge("GPS軌跡なし","ghost")}</div><div class="metric-grid">${metric("記録日","10/22","")}${metric("距離","8.20","km")}${metric("時間","45","分")}${metric("平均ペース","5:29","/km")}</div><div class="info-note">GPS軌跡がない状態の例です。実データのない地図は表示しません。</div></section>
    <section class="result-primary"><div class="card"><div class="section-title"><h2>身体の部位から見る</h2>${badge("前面・後面・足裏")}</div><p class="lead">気になる部位をタップすると、12部位の数値と詳細が連動します。</p><div class="body-map-row">${BODY_REGION_VIEWS.map(svgBody).join("")}</div>${legend()}<p class="chart-caption">数値は部位自身の基準100に対する参考値。筋肉の使用量を直接測定したものではありません。</p></div>
    <div class="card"><div class="section-title"><h2>12部位比較値</h2><div class="segmented"><button data-result-mode="all" class="${state.resultMode==="all"?"is-active":""}">全12部位</button><button data-result-mode="focus" class="${state.resultMode==="focus"?"is-active":""}">注目</button></div></div><div class="region-grid">${regionTiles()}</div><p class="chart-caption">部位間の順位ではありません。表示がない部位を0として扱いません。</p></div></section>
    <section class="result-lower"><div class="card stack" id="selected-detail"><div class="section-title"><div class="detail-head"><h2>選択部位の詳細：${esc(current.friendly)}</h2>${badge(current.name)}</div>${buttonLink("body-part-detail","詳しく見る")}</div><div class="detail-summary"><div><small>今回（デモ）</small><div class="detail-value">${valid(v)?v.toFixed(1):"—"}</div></div><div class="detail-mini"><small>基準100との差</small><h3>${valid(v)?pct(v-100):"—"}</h3></div><div class="detail-mini"><small>前回（デモ）</small><h3>${valid(prev)?prev.toFixed(1):"—"}</h3></div><div class="detail-mini"><small>前回との差</small><h3>${valid(v)&&valid(prev)?pct(v-prev):"—"}</h3></div></div><div class="chart-card">${historyChart()}<p class="chart-caption">このグラフの値も固定の仮表示です。将来は同じ意味の記録だけを比較します。</p></div><div class="info-note">各部位自身の基準を100とした文献由来の参考値です。実測した組織負荷、正常値、傷害リスクではありません。</div></div>
    <div class="support-stack"><div class="card stack"><div class="section-title"><h2>運動前後の疲労感</h2>${badge("ROF-J")}</div><div class="fatigue-flex"><div><small>運動前</small><div class="fatigue-value">6</div></div><span class="arrow">→</span><div><small>運動後</small><div class="fatigue-value">8</div></div><span class="arrow">＝</span><div><small>変化</small><div class="fatigue-value">+2</div></div></div><p class="chart-caption">デモ数値。ROF-Jは0〜10の主観的疲労評価です。</p></div><div class="card stack"><div class="section-title"><h2>走行プロフィール（補助）</h2>${badge("6軸・参考")}</div>${radarChart()}<div class="map-legend"><span><i class="dot" style="background:#0891b2"></i>今回</span><span><i class="dot missing"></i>前回</span></div><p class="chart-caption">距離・平均速度・ペース変動・上り密度・推定歩調・疲労変化。レーダーは総合点ではありません。</p></div></div></section>
    <section class="card"><div class="section-title"><h2>次にできること</h2>${badge("本人が選択")}</div><div class="btn-row">${buttonLink("exploration-tree","探究ツリーへ",true)}${buttonLink("history","履歴を見る")}${buttonLink("simulation","シミュレーション")}</div></section>`;
  }
  function history(){
    const data=[["10月22日","8.20km / 45分","走行"],["10月12日","5.40km / 31分","走行"],["10月5日","休養・記録メモ","休養"]];
    const shown=data.filter(x=>state.historyMode==="all"||x[2]===state.historyMode);
    return header("履歴","走行・休養・振り返りの記録を見つける。")+
    `<section class="card stack"><div class="section-title"><h2>記録一覧（デモ）</h2><div class="segmented">${[["all","すべて"],["走行","走行"],["休養","休養"]].map(([key,label])=>`<button data-history-mode="${key}" class="${state.historyMode===key?"is-active":""}">${label}</button>`).join("")}</div></div><div class="timeline">${shown.map(row=>`<a href="#/result" class="timeline-item"><span><strong>${row[0]}</strong><p class="lead">${row[1]}</p></span>${badge(row[2])}</a>`).join("")}</div><p class="chart-caption">架空の履歴です。本番連携時には休養記録から部位計算結果へ誘導しないよう分岐します。</p></section><section class="grid-2"><a class="simple-card" href="#/exploration-tree"><strong>探究の足跡</strong><p>以前の問いや、気になったテーマを振り返る入口。</p></a><a class="simple-card" href="#/result"><strong>12部位の推移</strong><p>比較適格な記録だけを表示する設計。</p></a></section>`;
  }
  function explore(){
    const category=CATEGORIES.find(c=>c.id===state.category)||CATEGORIES[0];
    return header("探究ツリー","走るたび、自分への理解が育つ。",badge("7分野・28テーマ"))+
    `<section class="card stack"><div class="section-title"><h2>どこから探しますか？</h2><div class="segmented">${[["today","今回の走り"],["free","自由探索"],["questions","過去の問い"]].map(([id,name])=>`<button data-explore-mode="${id}" class="${state.mode===id?"is-active":""}">${name}</button>`).join("")}</div></div><p class="lead">${state.mode==="today"?"今日は仮データを使った探索例です。実際の記録による淡い発光は本番連携後に行います。":state.mode==="free"?"分野やテーマを自由に選べます。": "本人が保存した問いがある場合に表示する予定です。"}</p></section>
    <section class="topic-layout"><div class="card"><div class="section-title"><h2>7つの分野</h2>${badge("自由に選べます")}</div><div class="grid-2">${CATEGORIES.map(c=>`<div class="topic-cluster ${state.category===c.id?"is-selected":""}" style="--cluster-color:${c.color};--cluster-tint:${c.tint}"><h3><span class="cluster-icon">${c.icon}</span>${c.name}</h3><div class="topics">${c.topics.map(topic=>`<button type="button" data-topic="${c.id}|${esc(topic)}">${esc(topic)}</button>`).join("")}</div></div>`).join("")}</div></div><div class="card stack"><div class="section-title"><h2>選択したテーマ</h2>${badge(category.name)}</div><div class="topic-detail"><strong>${esc(state.topic)}</strong><p class="lead">今のテーマに関連する走行記録・科学的な知識・以前の問いを、ここから順に確認できる設計です。</p></div><div class="info-note">UI試作段階では推論や自動記録を行いません。関連データがない場合は「記録なし」として表示します。</div><h3>このテーマでできること</h3><div class="stack"><a href="#/result" class="simple-card"><strong>自分の結果と照らし合わせる</strong><p>12部位の参考値、比較可能な過去の記録など。</p></a><a href="#/history" class="simple-card"><strong>過去の記録を見る</strong><p>以前の経験を参照する。</p></a><div class="simple-card"><strong>自分の問い</strong><p>保存は本人が選択した場合だけ。今は表示構成の仮置きです。</p></div></div><div class="btn-row">${buttonLink("record","次の記録へ")}</div></div></section>`;
  }
  function settings(){
    return header("設定","使いやすさ、安全、保存の扱いを確認する。")+
    `<section class="grid-2">${[["表示とアクセシビリティ","文字・配色・動きの設定を今後ここへ集約します。"],["記録とデータ","削除・エクスポート・バックアップの方針を整理します。"],["プライバシー","入力や日誌、GPSの取り扱いを明示します。"],["アプリ情報","RunLoad UI Next — 新UI試作版。科学計算は未接続です。"]].map(([n,s])=>`<div class="card stack"><h2>${n}</h2><p class="lead">${s}</p></div>`).join("")}</section>`;
  }
  function secondary(page){
    const title=pageLabels[page]||"付属機能";
    const details={measurement:"GPS測定画面の配置・操作を検討中です。位置情報は取得・保存していません。",course:"コース名・路面・上り下りなどの条件を入力する画面です。",simulation:"条件を変えた場合の表示領域。計算モデルや結果を実行していません。",consultation:"相談・共有のための画面。安全案内と共有範囲を別途確認します。","body-part-detail":"選択した部位の正式名称、本人の記録、比較できる過去の値を確認する詳細領域です。"};
    return header(title,"主要6領域から利用する付属機能です。",badge("配置・動線の試作"))+
    `<section class="card stack"><div class="empty-state"><strong>${title}</strong><p class="lead">${details[page]||""}</p><span class="badge warn">まだ機能連携はありません</span></div><div class="btn-row">${buttonLink("record","記録へ")}${buttonLink("result","結果へ")}${buttonLink("exploration-tree","探究ツリーへ")}</div></section>`;
  }
  function render(){
    const page=currentPage(),content={home,record,result,history,"exploration-tree":explore,settings}[page]?.()||secondary(page);
    app.innerHTML=`<div class="app-shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">↗</span>RunLoad</div><nav class="side-nav" aria-label="デスクトップの主ナビゲーション">${navHtml(desktopNav,page,false)}</nav><div class="side-foot">走るたび、自分への理解が育つ。<br>UI Next / Prototype</div></aside><div class="main-frame"><header class="topbar"><div class="topbar-title"><strong>RunLoad</strong> <span class="muted">／ ${pageLabels[page]}</span></div><div class="topbar-right"><span class="topbar-status">UI 試作版</span></div></header><main class="main-content"><div class="banner"><span><strong>デモ専用：</strong>表示中の走行記録・比較値・グラフは架空のサンプルです。科学計算・本人の履歴・GPSは未接続です。</span><span class="badge warn">実データではありません</span></div>${state.toast?`<div class="info-note">${esc(state.toast)}</div>`:""}${content}<p class="project-status">RunLoad UI Next — 画面設計・操作導線の検証用。旧アプリの正式計算結果ではありません。</p></main></div><nav class="mobile-nav" aria-label="スマートフォンの主ナビゲーション">${navHtml(mobileNav,page,true)}</nav></div>`;
  }
  app.addEventListener("click",(event)=>{
    const region=event.target.closest("[data-region]");
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
    if(event.target.closest("[data-demo-save]")){state.toast="試作操作：この画面では記録を保存していません。仮の結果画面へ移ります。";location.hash="#/result";window.scrollTo(0,0)}
  });
  app.addEventListener("keydown",(event)=>{
    if((event.key==="Enter"||event.key===" ")&&event.target.matches("path[data-region]")){event.preventDefault();event.target.dispatchEvent(new MouseEvent("click",{bubbles:true}))}
  });
  window.addEventListener("hashchange",()=>{state.toast="";render();window.scrollTo(0,0)});
  render();
})();
