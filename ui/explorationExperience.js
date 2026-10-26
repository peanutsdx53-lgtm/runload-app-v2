import {createExplorationContext, compareLifeDays, readCourseDraft} from "./explorationReadAdapter.js";
// RunLoad exploration field v3. Relevance is a traceable link to available data,
// not a diagnosis, performance ranking, inferred cause, or physiological score.
// Separate opt-in exploration notes never mutate or read the run history store.
export const EXPLORATION_NOTE_KEY="runload-v2-exploration-notes-v1";
const LIMIT=50;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const meta={
 "01":{short:"走行記録",glyph:"◷",x:17,y:20,accent:"#79c2f4",why:"走行距離や時間の入力があります"},
 "02":{short:"身体",glyph:"◎",x:49,y:12,accent:"#f4b978",why:"身体についてのメモがあります"},
 "03":{short:"コース",glyph:"⌁",x:82,y:20,accent:"#65e5c2",why:"坂道や路面の情報があります"},
 "04":{short:"疲れと回復",glyph:"♡",x:85,y:54,accent:"#d4adfb",why:"運動前後の疲れを入力しています"},
 "05":{short:"暮らし",glyph:"✦",x:69,y:85,accent:"#9de9e0",why:"生活コンディションの記録があります"},
 "06":{short:"走る前後",glyph:"✳",x:30,y:85,accent:"#c3b5ff",why:"走る前後の工夫についての記録があります"},
 "07":{short:"楽しみ方",glyph:"⚑",x:15,y:54,accent:"#faa6c8",why:"自分の目標についての記録があります"}
};
const isProvided=x=>x!==null&&x!==undefined&&String(x).trim()!=="";
export function makeUi(storage){
 const ui={selected:"03",topic:"",search:"",tab:"field",sample:false,notes:[],storage,canSave:true,notice:"",modal:"",trialDistance:5,trialMinutes:30,toolChoice:"up",bodyChoice:"hip",lifeA:"",lifeB:"",followup:""};
 if(!storage){ui.canSave=false;return ui;}
 try{
  const raw=storage.getItem(EXPLORATION_NOTE_KEY);
  if(raw===null)return ui;
  const list=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>LIMIT||list.some(n=>!n||typeof n!=="object"||typeof n.id!=="string"||typeof n.category!=="string"||typeof n.text!=="string"||!n.text.trim()||n.text.length>500||!/^[A-Za-z0-9_-]{1,32}$/.test(n.category)||n.id.length>80||typeof n.createdAt!=="string"||(n.topicId!==undefined&&typeof n.topicId!=="string")))throw Error("invalid notes");
  ui.notes=list;
 }catch{ui.canSave=false;ui.notice="メモを読み取れません。保存済みのデータは変更していません。";}
 return ui;
}

/* Only validated local manual-run records may light a saved-activity theme.
   Do not derive any injury, body loading or health interpretation here. */
function latestSavedManualRun(read){
 if(read?.ok!==true||!Array.isArray(read.records))return null;
 return read.records.filter(r=>r?.source==="manual"&&r.type==="run"&&r.schema===1&&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&
    Number.isInteger(r.durationSeconds)&&r.durationSeconds>0)
  .slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;
}
export function signals(draft,conditions,manualRuns=null){
 const linked=new Map();
 const strict=createExplorationContext({draft,conditions});
 const sources=new Map(),recentRun=latestSavedManualRun(manualRuns);
 const mark=(id,label,source)=>{if(!linked.has(id)){linked.set(id,label);sources.set(id,source);}};
 // Current draft is kept separate from confirmed saved runs.
 if(draft&&[draft.distance,draft.hours,draft.minutes,draft.seconds,draft.steps].some(isProvided))
  mark("01","入力中の走行距離・時間などに関連","draft");
 if(strict.highlights.some(h=>h.themeId==="上り坂・下り坂"))
  mark("03","入力中の上り坂・下り坂の情報に関連","draft");
 if(draft&&(draft.rofBefore!==null&&draft.rofBefore!==undefined&&String(draft.rofBefore).trim()!==""||
   draft.rofAfter!==null&&draft.rofAfter!==undefined&&String(draft.rofAfter).trim()!==""))
  mark("04","入力中の運動前後の疲れに関連","draft");
 if(draft&&isProvided(draft.bodyObservation))mark("02","入力中の身体に関するメモに関連","draft");
 if(recentRun){
  const date=recentRun.date;
  mark("01",date+" に保存した走行距離と時間に関連","saved-run");
  const course=readCourseDraft(recentRun.draft);
  if(course.status==="complete"&&(course.shares.up>0||course.shares.down>0))
   mark("03",date+" に保存した坂道の入力に関連","saved-run");
  if([recentRun.rofBefore,recentRun.rofAfter].some(x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=10))
   mark("04",date+" に保存したROF-Jの入力に関連","saved-run");
  if(isProvided(recentRun.draft?.bodyObservation))
   mark("02",date+" に保存した身体に関するメモに関連","saved-run");
 }
 const recent=strict.life.status==="complete"?strict.life.records.filter(n=>n.minutes!==null).at(-1):null;
 if(recent)mark("05",recent.date+" の生活コンディション記録に関連","saved-life");
 return {linked,sources,hasDraft:[...sources.values()].includes("draft"),hasSavedRun:[...sources.values()].includes("saved-run"),
  hasCondition:linked.has("05"),conditionDate:recent?.date||null,recentRunDate:recentRun?.date||null,strict};
}

function relevance(ui,ctx){
 if(ui.sample)return {linked:new Map([["01","表示例：走行距離の入力"],["03","表示例：上り坂の入力"]]),sources:new Map([["01","sample"],["03","sample"]]),hasDraft:false,hasCondition:false,sample:true};
 return {...signals(ctx.draft,ctx.conditions,ctx.manualRuns),sample:false};
}
function buttonAction(name,label,kind="") {return `<button type="button" class="ex-action ${kind}" data-ex-action="${name}">${label}</button>`;}

function art(links){
 const stars=Array.from({length:72},(_,i)=>{const x=(i*73+31)%760,y=(i*47+(i%5)*37+17)%520,r=i%7===0?1.75:.85;return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#c4efff" opacity="'+(i%4===0?.52:.16)+'"/>';}).join("");
 const routes=Object.entries(meta).map(([id,p])=>{
  const active=links.linked.has(id);
  return '<path class="'+(active?'ex-constellation-link is-related':'ex-constellation-link')+'" d="M380 253 Q'+(380+(p.x*7.6-380)*.48)+' '+(253+(p.y*5.1-253)*.62-18)+' '+p.x*7.6+' '+p.y*5.1+'" stroke="'+p.accent+'" stroke-width="'+(active?'2.7':'1.5')+'" fill="none" opacity="'+(active?'.75':'.19')+'"/>';
 }).join("");
 return '<svg class="ex-art" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="ex-glow"><stop stop-color="#59efd9" stop-opacity=".4"/><stop offset="1" stop-color="#59efd9" stop-opacity="0"/></radialGradient></defs>'+stars+'<path class="ex-contours" d="M-70 370 Q125 120 310 356 T820 192 M-70 405 Q125 155 310 391 T820 227 M-70 438 Q125 188 310 424 T820 260 M-70 470 Q125 220 310 456 T820 290 M-70 502 Q125 252 310 488 T820 323" fill="none" stroke="#85d4cd" opacity=".12" stroke-width="2"/>'+routes+'<circle cx="380" cy="253" r="155" fill="url(#ex-glow)" opacity=".3"/></svg>';
}

const KNOWLEDGE={
 "足・膝・股関節":{
   heading:"走るとき、脚の関節はどう働く？",lead:"地面を押して前に進むとき、股関節・膝・足首が連携して動きます。走る速さが変わると、関節の動きや仕事の分担も変化し得ます。",
   cite:"Fukuchi ほか（2017）",url:"https://doi.org/10.7717/peerj.3298",warning:"一定条件で走った人々の研究に基づく一般知識です。あなたの関節への負荷やけがの可能性を判定するものではありません。"},
 "上り坂・下り坂":{
   heading:"上り坂と下り坂、走る動きの違い",lead:"上り坂では体を持ち上げて進む働きが、下り坂では前に進む勢いを受け止めて制御する働きが重要になります。",
   cite:"Vernillo ほか（2020）",url:"https://doi.org/10.1111/sms.13708",warning:"主に条件を管理した走行の研究に基づきます。記録の割合だけから、あなたの筋肉への負荷やけがの危険を計算できません。"},
 "睡眠":{
   heading:"睡眠と、走る日の調子",lead:"睡眠は回復や日中の注意・気分とも関係します。短い睡眠や質の低下が続くと運動への影響が懸念されますが、必要な睡眠の長さには個人差があります。",
   cite:"Walsh ほか（2021）",url:"https://doi.org/10.1136/bjsports-2020-102025",warning:"競技者を対象とした研究を含む一般知識です。本人の記録が同じ日に並んでも、睡眠が調子の原因と判断することはできません。"}
};
const STARTER_GUIDES=Object.freeze({
  "距離・時間・ペース": "記録した距離と時間を見て、今日はどんなペースだったか確かめてみましょう。",
  "自分が感じた疲れ": "運動前と運動後に感じた疲れを、ROF-Jの記録と一緒に見返してみましょう。",
  "過去の走りとの比較": "距離やコースが近い日の走りを並べると、どこが違ったか考えるきっかけになります。",
  "気付きと次の確認": "気になったことを一つだけ書いておくと、次に走ったときに見返しやすくなります。",
  "姿勢と走る動作": "走っているとき、体がどんなふうに動いているか。気になる動きを言葉にしてみましょう。",
  "体幹と腕の動き": "腕の振りや上半身の動きについて、走っているときに気付いたことはありますか？",
  "12部位の参考値の見方": "部位ごとの数値を見る前に、その数値が「何と比べた値か」を確認してみましょう。",
  "路面": "同じ距離でも、舗装路と土の道では走った感じが違うことがあります。自分はどう感じましたか？",
  "気温・天候": "暑い日、寒い日、雨の日。走りやすかった条件を思い出してみましょう。",
  "屋外・室内": "外と室内、どちらが走りやすいですか？そう感じた理由をメモできます。",
  "疲れの感じ方": "走り終えた後の疲れだけでなく、走る前の感覚も振り返ってみましょう。",
  "筋肉痛・違和感": "どこに、いつ、どんな感じがありましたか？無理に原因を決めず、まず記録を整理しましょう。",
  "休養と回復": "休んだ次の日はどう感じましたか？休んだ日と調子の記録を見返してみましょう。",
  "疲れを考える視点": "疲れを考えるときは、その日の運動だけでなく、睡眠や気分なども思い出してみましょう。",
  "食事・水分": "走る前後に食べたものや飲んだものについて、気になったことはありますか？",
  "気分・ストレス": "走りたい気分の日も、そうでない日もあります。気持ちの変化を記録してみましょう。",
  "日々のコンディション": "朝の調子と睡眠の記録を見返して、続けて気付いたことがあるか探してみましょう。",
  "ウォームアップ": "走り始める前に何をしていますか？次も続けたいことや、気になることを書いておけます。",
  "走行中の対応": "走っている途中にペースを変えたことや、休んだことはありますか？",
  "クールダウン・ストレッチ": "走り終えた後、いつも何をしていますか？自分の習慣を整理してみましょう。",
  "無理をしない判断": "走るのをやめたり、休むことを選んだときは、どんな理由がありましたか？",
  "走る目的": "何のために走りたいと思いましたか？今の気持ちを短く書いてもかまいません。",
  "目標との付き合い方": "目標を決めるなら、今の自分にとって無理のないものから考えてみましょう。",
  "楽しみ方": "景色、音楽、友人との時間など、走って楽しかったことを思い出してみましょう。",
  "自分に合う記録の使い方": "毎回すべてを記録する必要はありません。何を見返したいかから決めてみましょう。"
});
export const LEARNING_TOPICS=Object.freeze({"02|足・膝・股関節":"body-movement","03|上り坂・下り坂":"slope-running","05|睡眠":"sleep-recovery"});
const followups={
 "body-movement":["次は走るときの股関節の動きを意識してみたい","足首の動きについてもう少し調べたい"],
 "slope-running":["次は上りと下りで感じ方を確かめたい","坂道のある日とない日の記録を見比べたい"],
 "sleep-recovery":["次は起床時の調子も記録してみたい","睡眠の記録を数日分見返してみたい"]
};
function experience(ui,ctx,cat,topic){
 const entry=KNOWLEDGE[topic],key=LEARNING_TOPICS[cat.id+"|"+topic];
 if(!entry||!key)return '<div class="ex-learning ex-learning-empty"><div class="ex-learning-head"><span>まずは考えてみよう</span><button type="button" class="ex-help" data-ex-action="learn-help" aria-label="情報の見方">？</button></div><h3>'+esc(topic)+'</h3><p class="ex-learning-lead">'+esc(STARTER_GUIDES[topic]||'気になったことを、自分の経験や記録から考えてみましょう。')+'</p><div class="ex-note-invite"><div><strong>自分の言葉で残す</strong><p>今の気持ちや、次に確かめたいことを書いておけます。</p></div><button type="button" data-ex-action="note">メモを残す ＋</button></div></div>';
 const strict=createExplorationContext({draft:ctx.draft,conditions:ctx.conditions});
 const reason=strict.highlights.find(h=>h.themeId===topic);
 const who=ui.sample?"これは光の見え方の表示例です。保存した本人の記録ではありません。":reason?`${reason.why}（${reason.source==="unsaved-draft"?"まだ保存していない入力":"保存済みの生活記録"}）`:"関連する入力がなくても、内容を自由に学べます";
 const h=(text)=>esc(text);
 let tool='';
 if(key==='body-movement'){
  const parts={hip:{label:"股関節",body:"脚を前後に動かす関節。走るときに身体を前へ進める動きに関係します。"},knee:{label:"膝",body:"着地して体を支える間に曲げ伸ばしし、力を受け止める動きに関わります。"},ankle:{label:"足首",body:"地面を押して進むときや、着地の姿勢を調整するときに働きます。"}};
  const part=parts[ui.bodyChoice]||parts.hip;
  tool=`<div class="ex-tool-switch" role="group" aria-label="注目する関節">${Object.entries(parts).map(([id,p])=>`<button type="button" data-ex-body="${id}" aria-pressed="${ui.bodyChoice===id}">${p.label}</button>`).join('')}</div>
  <div class="ex-tool-result"><strong>${h(part.label)}</strong><p>${h(part.body)}</p><small>一般的な働きの説明です。個人の関節を測定した結果ではありません。</small></div><a class="ex-learning-link" href="#/result">結果画面の参考情報を見る ↗</a>`;
 }else if(key==='slope-running'){
  const course=strict.course;
  const choices={up:{label:"上り",title:"押して進む",body:"上りでは重力に逆らって身体を持ち上げる必要があり、平坦路とは動きや力の使い方が異なります。"},down:{label:"下り",title:"勢いを受け止める",body:"下りでは前へ進む勢いを制御するため、着地時のブレーキの働きが大切になります。"}};
  const c=choices[ui.toolChoice]||choices.up;
  const shares=course.status==='complete'&&course.shares?
   `<div class="ex-course-bars" role="img" aria-label="入力途中の上り${course.shares.up}％、下り${course.shares.down}％、入力上の平坦${course.shares.flat}％"><span style="width:${course.shares.up}%;background:#65ddce"></span><span style="width:${course.shares.down}%;background:#80a9ef"></span><span style="width:${course.shares.flat}%;background:#426577"></span></div><small>入力途中の割合：上り ${course.shares.up}％／下り ${course.shares.down}％／平坦 ${course.shares.flat}％。GPSによる標高断面ではありません。</small>`:
   `<p>確定できる坂道の割合はありません。走行の入力がない場合も学べます。</p>`;
  tool=`<div class="ex-tool-switch" role="group" aria-label="坂道の方向">${Object.entries(choices).map(([id,item])=>`<button type="button" data-ex-slope="${id}" aria-pressed="${ui.toolChoice===id}">${item.label}</button>`).join('')}</div><div class="ex-tool-result"><strong>${c.title}</strong><p>${c.body}</p></div><div class="ex-course-source">${shares}</div><a class="ex-learning-link" href="#/record-course">自分のコース入力を確認 ↗</a>`;
 }else{
  const life=strict.life,records=life.status==='complete'?life.records:[];
  const latest=records.at(-1)||null;
  const fmt=n=>n===null?'時間の記録なし':Math.floor(n/60)+'時間'+String(n%60)+'分';
  const type=s=>s==='time-in-bed'?'就床から起床までの時間':s==='self-reported'?'記録した睡眠時間':'入力方法が不明';
  tool='<div class="ex-tool-result"><strong>'+(latest?'いちばん新しい生活記録':'生活記録はまだありません')+'</strong>'
   +(latest?'<p>'+h(latest.date)+'　'+h(fmt(latest.minutes))+'</p><p>朝の調子：'+h(latest.feeling||'記録なし')+'</p><small>'+h(type(latest.source))+'</small>':'<p>睡眠や朝の調子を記録すると、後から振り返れます。</p>')
   +'</div><a class="ex-learning-link" href="#/condition">睡眠と朝の調子を見てみる ›</a>';

 }
 const saved=ui.notes.filter(n=>n.topicId===key).slice(0,2);
 return '<div class="ex-learning" data-ex-learning="'+key+'"><div class="ex-learning-head"><span>まずは知ってみよう</span><button type="button" data-ex-action="learn-help" class="ex-help" aria-label="研究の出典と注意点">？</button></div><h3>'+h(entry.heading)+'</h3><p class="ex-learning-lead">'+h(entry.lead)+'</p>'
 +'<div class="ex-tool"><h4>'+(key==='body-movement'?'動きを選んでみよう':key==='slope-running'?'上りと下りを比べよう':'自分の記録も見てみよう')+'</h4>'+tool+'</div>'
 +(reason&&!ui.sample?'<div class="ex-context"><small>あなたの記録とのつながり</small><p>'+h(who)+'</p></div>':'')
 +'<div class="ex-note-invite"><div><small>03　自分の言葉で</small><strong>気になったこと、覚えておく？</strong><p>感じたことや、次の走りで試したいことを自由に残せます。</p></div><button type="button" data-ex-action="note">メモを残す ＋</button></div>'
 +(saved.length?'<div class="ex-note-preview"><strong>前に書いたメモ</strong>'+saved.map(n=>'<p>'+h(n.text)+'</p>').join('')+'</div>':'')+'</div>';
}

function field(ui,ctx){
 const links=relevance(ui,ctx),cats=ctx.categories;
 const counts=Object.create(null);for(const n of ui.notes)counts[n.category]=(counts[n.category]||0)+1;
 const selected=cats.find(c=>c.id===ui.selected)||cats[0],linked=links.linked.get(selected.id);
 const nodes=cats.map(c=>{
  const p=meta[c.id]||{glyph:"○",accent:"#69d5d7",x:50,y:50};
  const chosen=c.id===selected.id,related=links.linked.has(c.id),n=counts[c.id]||0;
  const source=links.sources.get(c.id)||"none";
  return '<button type="button" class="ex-node '+(related?'is-related ':'')+(chosen?'is-selected':'')+'" data-ex-category="'+esc(c.id)+'" data-ex-source="'+esc(source)+'" style="--ex-accent:'+p.accent+';--ex-x:'+p.x+'%;--ex-y:'+p.y+'%" aria-pressed="'+chosen+'" aria-label="'+esc(c.name)+(related?'、'+esc(links.linked.get(c.id)):'')+'"><span class="ex-node-orb"><span class="ex-node-icon" aria-hidden="true">'+p.glyph+'</span>'+(related?'<span class="ex-node-signal" aria-hidden="true"></span>':'')+'</span><span class="ex-node-copy"><strong class="ex-node-title">'+esc(c.name)+'</strong></span>'+(n?'<span class="ex-memory-count" aria-label="'+n+'件のメモ">'+n+'</span>':'')+'</button>';
 }).join("");
 const currentTopic=selected.topics.includes(ui.topic)?ui.topic:selected.topics[0]||selected.name;
 const summary=links.sample?'光る星は説明用の例です。自分の記録ではありません。':linked?linked:'記録がなくても自由に選べます。';
 const any=links.linked.size>0;
 return '<section class="ex-workspace ex-orbit-workspace"><div class="ex-map-card ex-constellation"><div class="ex-map-head"><div><span class="ex-eyebrow">記録からも広がる発見</span><h2>今日は何が気になる？</h2><p>気になる星をタップしてみましょう。</p></div><button type="button" class="ex-help" data-ex-action="field-help" aria-label="星が光る理由と表示の意味">？</button></div>'
 +'<div class="ex-map" role="group" aria-label="星座型の7分野から探す">'+art(links)+'<div class="ex-core" aria-hidden="true"><span>気になることから</span><strong>探究</strong><small>好きな星を選ぼう</small></div>'+nodes+'</div>'
 +'<div class="ex-legend ex-signal-legend"><span class="ex-legend-glow" aria-hidden="true"></span><span>'+(any?'光る星は、入力や記録とつながる分野です。':'どの星からでも自由に始められます。')+'</span></div>'
 +'<div class="ex-map-foot">'+(!any&&!links.sample?buttonAction("sample","光る星の表示例を見る","quiet"):links.sample?buttonAction("sample","表示例を終了","quiet"):'')+'</div></div>'
 +'<div class="ex-side"><section class="ex-focus" id="ex-topic-content"><div class="ex-focus-label"><span>選んだ分野</span>'+(linked?'<span class="ex-related-label">記録とつながる</span>':'')+'</div><h2>'+esc(selected.name)+'</h2><p class="ex-focus-intro">'+esc(summary)+'</p><div class="ex-topic-label">どれから読んでみる？</div><div class="ex-topic-set" role="group" aria-label="読むテーマ">'+selected.topics.map((name,i)=>'<button type="button" data-ex-topic="'+esc(name)+'" aria-pressed="'+(currentTopic===name)+'" class="ex-topic '+(currentTopic===name?'is-picked':'')+'"><span aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(name)+'</strong><span aria-hidden="true">›</span></button>').join('')+'</div>'
 +experience(ui,ctx,selected,currentTopic)+'</section>'
 +'<section class="ex-memories"><div class="ex-side-head"><h3>自分のメモ</h3><span>'+ui.notes.length+' 件</span></div><p>'+(ui.notes.length?'前に書いたことを読み返せます。':'気になったことは、あとで見返せるように残せます。')+'</p>'+buttonAction("memories","メモを見る","quiet")+'</section></div></section>';
}

export function catalogCards(categories,search=""){
 const q=String(search).trim().toLocaleLowerCase("ja");
 const all=categories.flatMap(c=>c.topics.map((title,i)=>({category:c,title,i})));
 const rows=all.filter(x=>(x.title+x.category.name).toLocaleLowerCase("ja").includes(q));
 if(!rows.length)return '<p class="ex-catalog-empty">見つかりませんでした。別の言葉でも探してみてください。</p>';
 return categories.map(c=>{
  const list=rows.filter(x=>x.category.id===c.id);if(!list.length)return '';
  const p=meta[c.id]||{accent:'#72dbd7',glyph:'○'};
  return '<section class="ex-catalog-group" style="--ex-accent:'+p.accent+'"><div class="ex-catalog-group-head"><span class="ex-catalog-group-icon" aria-hidden="true">'+p.glyph+'</span><h3>'+esc(c.name)+'</h3><small>'+list.length+' テーマ</small></div><div class="ex-catalog-items">'+list.map(t=>'<button type="button" data-ex-category="'+esc(c.id)+'" data-ex-pick-topic="'+esc(t.title)+'"><strong>'+esc(t.title)+'</strong><span aria-hidden="true">›</span></button>').join('')+'</div></section>';
 }).join('');
}
function catalog(ui,ctx){
 const all=ctx.categories.reduce((n,c)=>n+c.topics.length,0);
 return '<section class="ex-catalog"><div class="ex-catalog-head"><div><span class="ex-eyebrow">知りたいことを探す</span><h2>テーマから探す</h2><p>言葉で探したり、分野ごとに眺めたりできます。</p></div><span class="ex-count">'+all+' テーマ</span></div><label class="ex-search-label"><span class="sr-only">テーマを検索</span><input type="search" data-ex-search placeholder="例：睡眠、上り坂、ペース" value="'+esc(ui.search)+'" autocomplete="off"/></label><div class="ex-catalog-grid">'+catalogCards(ctx.categories,ui.search)+'</div></section>';
}
export function render(ui,ctx){
 return '<section class="ex-page" data-experience-v3><header class="ex-heading"><h1>探究</h1><button type="button" class="ex-header-memo" data-ex-action="memories">自分のメモ <span>'+ui.notes.length+'</span></button></header>'+(ui.notice?'<p class="ex-notice" role="status">'+esc(ui.notice)+'</p>':'')+'<div class="ex-switch" role="group" aria-label="探し方"><button type="button" data-ex-tab="field" aria-pressed="'+(ui.tab==="field")+'">気になることから</button><button type="button" data-ex-tab="catalog" aria-pressed="'+(ui.tab==="catalog")+'">テーマから探す</button></div>'+(ui.tab==="catalog"?catalog(ui,ctx):field(ui,ctx))+modal(ui,ctx)+'</section>';
}
function modal(ui,ctx){if(!ui.modal)return "";const category=ctx.categories.find(c=>c.id===ui.selected)||ctx.categories[0],title=ui.topic||category.topics[0]||category.name,links=relevance(ui,ctx);let body="";
 if(ui.modal==="field-help")body='<p>光る星は、現在入力している情報や、保存した走行・生活記録とつながる分野です。優先順位や、身体への負担の大きさを示すものではありません。</p><p>記録がなくても、どの分野も自由に選べます。</p>';
 if(ui.modal==="learn-help"){
  const k=KNOWLEDGE[title];
  body='<p>学びの内容は一般的な知識です。あなたの身体や調子の原因を自動的に判定しているわけではありません。</p>'
  +(k?'<div class="ex-dialog-block"><strong>研究で分かっている範囲</strong><p>'+esc(k.warning)+'</p></div><p>参考資料：<a class="ex-dialog-source" href="'+esc(k.url)+'" target="_blank" rel="noopener noreferrer">'+esc(k.cite)+' ↗</a></p>':'<p>このテーマの詳しい説明や研究資料は準備中です。</p>')
  +'<p class="ex-muted">光る星は、入力・保存記録とのつながりを表す目印です。重要度や危険度を示すものではありません。</p>';
 }
 if(ui.modal==="know")body=`<p>「${esc(title)}」に関連する知識を確認する場所です。</p><div class="ex-dialog-block"><strong>自分の情報との接点</strong><p>${esc(links.linked.get(category.id)||"このテーマを調べるのに記録は必要ありません。")}</p></div><div class="ex-dialog-block"><strong>読み取るときの注意</strong><p>記録や感覚の違いだけでは、原因や身体の状態を判断できません。</p></div><p class="ex-muted">根拠審査済みのコラム本文は今後接続します。未確認の医学的な説明は表示しません。</p>`;
 if(ui.modal==="try")body=`<p>距離と時間を動かして、平均ペースと平均速度の関係を確かめられます。</p><div class="ex-range-label"><label for="ex-distance">距離</label><output data-ex-distance-value>${ui.trialDistance.toFixed(1)} km</output></div><input id="ex-distance" type="range" min="1" max="15" step=".5" value="${ui.trialDistance}" data-ex-distance/><div class="ex-range-label"><label for="ex-minutes">時間</label><output data-ex-minutes-value>${ui.trialMinutes} 分</output></div><input id="ex-minutes" type="range" min="10" max="100" step="1" value="${ui.trialMinutes}" data-ex-minutes/><div class="ex-metric-grid"><div><small>平均ペース</small><strong data-ex-pace>—</strong><em>分/km</em></div><div><small>平均速度</small><strong data-ex-speed>—</strong><em>km/h</em></div></div><p class="ex-muted">算術計算のみ。個人の将来の走りや身体への負荷・ケガを予測するものではありません。</p>`;
 if(ui.modal==="note")body=`<p>「${esc(title)}」について、今の自分が感じたことを残せます。あとで「自分のメモ」から読み返せます。</p><label class="ex-form-label" for="ex-note">自分のメモ（500文字まで）</label><textarea id="ex-note" maxlength="500" rows="4" placeholder="例：上り坂は思っていたより息が上がった。次回はペースを意識してみたい。">${esc(ui.followup||"")}</textarea>${followups[LEARNING_TOPICS[category.id+"|"+title]]?.length?'<div class="ex-note-prompts"><small>書く内容に迷ったら</small>'+followups[LEARNING_TOPICS[category.id+"|"+title]].map((t,i)=>'<button type="button" data-ex-next="'+i+'">'+esc(t)+'</button>').join('')+'</div>':''}<div class="ex-dialog-actions"><button type="button" data-ex-action="save-note" ${!ui.canSave?"disabled":""}>この端末に保存する</button></div>${!ui.canSave?'<p class="ex-muted">保存されたメモを安全に読み取れないため、上書き防止のため保存を停止しています。</p>':""}`;
 if(ui.modal==="memories")body=ui.notes.length?`<div class="ex-saved-list">${ui.notes.map(n=>`<div class="ex-saved"><div><small>${esc(ctx.categories.find(c=>c.id===n.category)?.name||"探究")} · ${esc(n.createdAt.slice(0,10))}</small><p>${esc(n.text)}</p></div><button type="button" data-ex-delete="${esc(n.id)}" ${!ui.canSave?"disabled":""} aria-label="このメモを削除">削除</button></div>`).join("")}</div>`:"<p>まだメモはありません。気になるテーマを開いて、必要なときだけ書けます。</p>";
 if(ui.modal==="share")body=`<p>相談したいことを整理するための下書きです。自動で送信されません。</p><div class="ex-dialog-block" data-ex-draft-text><strong>話したいテーマ：${esc(title)}</strong><p>参考にした分野：${esc(category.name)}</p><p>記録との接点：${esc(links.linked.get(category.id)||"記録との直接的な接点はありません")}</p><p>相談したいこと：</p></div><div class="ex-dialog-actions"><button type="button" data-ex-action="copy">文章をコピー</button></div><p class="ex-muted">個人の走行データやメモを自動で共有しません。</p>`;
 return `<div class="ex-backdrop" data-ex-overlay><section class="ex-dialog" role="dialog" aria-modal="true" aria-labelledby="ex-dialog-title"><div class="ex-dialog-head"><div><small>${esc(category.name)}</small><h2 id="ex-dialog-title">${esc({know:"知る",try:"試す",note:"メモ",share:"相談用にまとめる","learn-help":"研究の出典と注意点","field-help":"分野の印について",memories:"自分のメモ"}[ui.modal]||ui.modal)}</h2></div><button type="button" data-ex-action="close" aria-label="閉じる">×</button></div>${body}</section></div>`;
}
export function updatePace(root){const d=root.querySelector("[data-ex-distance]"),m=root.querySelector("[data-ex-minutes]");if(!d||!m)return;const distance=Number(d.value),minutes=Number(m.value);root.querySelector("[data-ex-distance-value]").textContent=`${distance.toFixed(1)} km`;root.querySelector("[data-ex-minutes-value]").textContent=`${minutes} 分`;const seconds=Math.round(minutes/distance*60),mm=Math.floor(seconds/60),ss=seconds%60;root.querySelector("[data-ex-pace]").textContent=`${mm}:${String(ss).padStart(2,"0")}`;root.querySelector("[data-ex-speed]").textContent=(distance/(minutes/60)).toFixed(1);}
export function saveNote(ui,text){if(!ui.canSave||!ui.storage)return {ok:false,reason:"保存領域が利用できません"};const value=String(text??"").trim();if(!value||value.length>500)return {ok:false,reason:"1〜500文字で入力してください"};const time=new Date().toISOString();const id=`${time}-${Math.random().toString(36).slice(2,12)}`;const key=LEARNING_TOPICS[ui.selected+"|"+ui.topic];const next=[{id,category:ui.selected,text:value,createdAt:time,...(key?{topicId:key}:{})},...ui.notes].slice(0,LIMIT);try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);const expected=JSON.stringify(next);if(old!==(ui.notes.length?JSON.stringify(ui.notes):null)){ui.canSave=false;return {ok:false,reason:"他の画面で変更されています。元のデータを保護しました"};}ui.storage.setItem(EXPLORATION_NOTE_KEY,expected);if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==expected)return {ok:false,reason:"保存を確認できませんでした"};ui.notes=next;return {ok:true};}catch{return {ok:false,reason:"保存できませんでした"}}}
export function deleteNote(ui,id){if(!ui.canSave||!ui.storage)return false;const oldList=ui.notes;const next=oldList.filter(n=>n.id!==id);if(next.length===oldList.length)return false;try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);if(old!==JSON.stringify(oldList)){ui.canSave=false;return false;}ui.storage.setItem(EXPLORATION_NOTE_KEY,JSON.stringify(next));if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==JSON.stringify(next))return false;ui.notes=next;return true}catch{return false}}
