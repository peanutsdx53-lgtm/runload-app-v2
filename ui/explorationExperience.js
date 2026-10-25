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
 const ui={selected:"03",topic:"",search:"",tab:"field",sample:false,notes:[],storage,canSave:true,notice:"",modal:"",trialDistance:5,trialMinutes:30};
 if(!storage){ui.canSave=false;return ui;}
 try{
  const raw=storage.getItem(EXPLORATION_NOTE_KEY);
  if(raw===null)return ui;
  const list=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>LIMIT||list.some(n=>!n||typeof n!=="object"||typeof n.id!=="string"||typeof n.category!=="string"||typeof n.text!=="string"||!n.text.trim()||n.text.length>500||!/^[A-Za-z0-9_-]{1,32}$/.test(n.category)||n.id.length>80||typeof n.createdAt!=="string"))throw Error("invalid notes");
  ui.notes=list;
 }catch{ui.canSave=false;ui.notice="メモを読み取れません。保存済みのデータは変更していません。";}
 return ui;
}
export function signals(draft,conditions){
 const linked=new Map();
 // Draft: can be reviewed here, but must never be presented as saved history.
 if(draft&&[draft.distance,draft.hours,draft.minutes,draft.seconds,draft.steps].some(isProvided))linked.set("01","入力中の走行距離・時間などに関連");
 if(draft&&(isProvided(draft.upPercent)||isProvided(draft.downPercent)||isProvided(draft.upGradePercent)||isProvided(draft.downGradePercent)||isProvided(draft.primarySurface)||isProvided(draft.courseName)||Object.keys(draft).some(k=>/^surface(Paved|Track|Treadmill|Soil|Trail|NaturalGrass|ArtificialTurf|Sand)$/.test(k)&&isProvided(draft[k]))))linked.set("03","入力中の坂道・路面・コース情報に関連");
 if(draft&&(draft.rofBefore!==null&&draft.rofBefore!==undefined||draft.rofAfter!==null&&draft.rofAfter!==undefined))linked.set("04","入力中の運動前後の疲れに関連");
 if(draft&&isProvided(draft.bodyObservation))linked.set("02","入力中の身体に関するメモに関連");
 const validConditions=Array.isArray(conditions?.entries)?conditions.entries:[];
 const latest=validConditions.at(-1);
 if(latest&&isProvided(latest.date))linked.set("05",`${latest.date} の生活コンディション記録に関連`);
 return {linked,hasDraft:[...linked.keys()].some(k=>k!=="05"),hasCondition:linked.has("05"),conditionDate:latest?.date||null};
}
function relevance(ui,ctx){
 if(ui.sample)return {linked:new Map([["01","表示例：走行距離の入力"],["03","表示例：上り坂の入力"]]),hasDraft:false,hasCondition:false,sample:true};
 return {...signals(ctx.draft,ctx.conditions),sample:false};
}
function buttonAction(name,label,kind="") {return `<button type="button" class="ex-action ${kind}" data-ex-action="${name}">${label}</button>`;}
function art(){
 const stars=Array.from({length:62},(_,i)=>{const x=(i*73+31)%760,y=(i*47+(i%5)*37+17)%520,r=i%7===0?1.75:.85;return `<circle cx="${x}" cy="${y}" r="${r}" fill="#c4efff" opacity="${i%4===0?.53:.19}"/>`}).join("");
 const routes=Object.entries(meta).map(([id,p])=>`<path d="M380 253 Q${380+(p.x*7.6-380)*.48} ${253+(p.y*5.1-253)*.62-18} ${p.x*7.6} ${p.y*5.1}" stroke="${p.accent}" opacity=".25" stroke-width="1.5" fill="none"/>`).join("");
 return `<svg class="ex-art" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="ex-glow"><stop stop-color="#59efd9" stop-opacity=".27"/><stop offset="1" stop-color="#59efd9" stop-opacity="0"/></radialGradient></defs>${stars}<path class="ex-contours" d="M-70 370 Q125 120 310 356 T820 192 M-70 405 Q125 155 310 391 T820 227 M-70 438 Q125 188 310 424 T820 260 M-70 470 Q125 220 310 456 T820 290 M-70 502 Q125 252 310 488 T820 323" fill="none" stroke="#85d4cd" opacity=".11" stroke-width="2"/>${routes}<circle cx="380" cy="253" r="155" fill="url(#ex-glow)" opacity=".34"/></svg>`;
}
function field(ui,ctx){
 const links=relevance(ui,ctx),cats=ctx.categories;
 const noteCounts=Object.create(null);for(const n of ui.notes)noteCounts[n.category]=(noteCounts[n.category]||0)+1;
 const selected=cats.find(c=>c.id===ui.selected)||cats[0];
 const m=meta[selected.id]||{why:"",short:selected.name};
 const linked=links.linked.get(selected.id);
 const nodes=cats.map(c=>{
   const p=meta[c.id];if(!p)return "";
   const glow=links.linked.has(c.id),chosen=ui.selected===c.id,n=noteCounts[c.id]||0;
   return `<button type="button" class="ex-node ${glow?"is-related":""} ${chosen?"is-selected":""}" data-ex-category="${esc(c.id)}" style="--ex-x:${p.x}%;--ex-y:${p.y}%;--ex-accent:${p.accent}" aria-pressed="${chosen}" aria-label="${esc(c.name)}${glow?"、記録と関連あり":""}"><span class="ex-node-orb"><span class="ex-node-icon" aria-hidden="true">${p.glyph}</span>${n?`<span class="ex-memory-count" aria-label="自分のメモ ${n}件">${n}</span>`:""}</span><span class="ex-node-title">${esc(p.short)}</span></button>`;
 }).join("");
 const status=links.sample?"表示例の入力に関連する分野を点灯しています":links.hasDraft&&links.hasCondition?"入力中の走行と保存した生活記録との接点":links.hasDraft?"入力中の走行に関連する分野を表示":links.hasCondition?"保存済みの生活記録に関連する分野を表示":"記録がなくても、すべての分野を開けます";
 return `<section class="ex-workspace"><div class="ex-map-card"><div class="ex-map-head"><div><span class="ex-eyebrow">EXPLORE / ${links.sample?"表示例":links.linked.size?"記録との接点":"自由に探す"}</span><h2>${links.sample?"表示例で見る":links.linked.size?"記録から見つける":"自由に探す"}</h2><p>${esc(status)}</p></div><span class="ex-count">${links.linked.size?`関連 ${links.linked.size} 分野`:"7分野"}</span></div><div class="ex-map" role="group" aria-label="7分野の探究フィールド">${art()}<div class="ex-core"><span>RUNLOAD</span><strong>探究</strong><small>選んで開く</small></div>${nodes}</div><div class="ex-legend"><span class="ex-legend-glow"></span>淡い光：入力や記録との接点 <span class="ex-legend-mem"></span>数字：自分で残したメモ</div><div class="ex-map-foot">${!links.linked.size&&!links.sample?buttonAction("sample","光の見え方を試す"):links.sample?buttonAction("sample","表示例を終了"):""}${buttonAction("catalog","すべてのテーマを見る","quiet")}</div></div>
 <aside class="ex-side"><section class="ex-focus"><div class="ex-focus-label">選択中の分野 ${linked?'<span class="ex-related-label">記録と関連</span>':""}</div><h2>${esc(selected.name)}</h2><p>${linked?esc(linked):links.sample?esc(relevance(ui,ctx).linked.get(selected.id)||"この分野は表示例の強調対象ではありません"):"選択した分野のテーマを自由に調べられます"}</p><div class="ex-topic-set">${selected.topics.map((name,i)=>`<button type="button" data-ex-topic="${esc(name)}" class="ex-topic ${ui.topic===name?"is-picked":""}"><span>${String(i+1).padStart(2,"0")}</span>${esc(name)}</button>`).join("")}</div><div class="ex-selected-topic"><small>選択中</small><strong>${esc(ui.topic||selected.topics[0]||selected.name)}</strong></div><div class="ex-action-grid">${buttonAction("know","知る")}${["01","03"].includes(selected.id)?buttonAction("try","試す"):""}${buttonAction("note","メモ")}${buttonAction("share","相談用にまとめる","quiet")}</div><small class="ex-caution">光は重要度や身体への負荷を示すものではありません。</small></section><section class="ex-memories"><div class="ex-side-head"><h3>これまでの気づき</h3><span>${ui.notes.length} 件</span></div><p>${ui.notes.length?"残した気づきを見返せます。":"気づいたことは、必要なときだけ残せます。"}</p>${buttonAction("memories","メモを見る","quiet")}</section></aside></section>`;
}
function catalog(ui,ctx){const all=ctx.categories.flatMap(c=>c.topics.map((title,i)=>({category:c,title,i})));const q=ui.search.trim().toLocaleLowerCase("ja");const filtered=all.filter(x=>(x.title+x.category.name).toLocaleLowerCase("ja").includes(q));return `<section class="ex-catalog"><div class="ex-catalog-head"><h2>すべてのテーマ</h2><span>${ctx.categories.length}分野・${all.length}テーマ</span></div><label class="ex-search-label"><span class="sr-only">テーマを検索</span><input type="search" data-ex-search placeholder="テーマを探す" value="${esc(ui.search)}" autocomplete="off"/></label><div class="ex-catalog-grid">${filtered.map(t=>`<button type="button" data-ex-category="${esc(t.category.id)}" data-ex-pick-topic="${esc(t.title)}"><small>${esc(t.category.name)}</small><strong>${esc(t.title)}</strong><span aria-hidden="true">↗</span></button>`).join("")||'<p>該当するテーマがありません</p>'}</div></section>`}
export function render(ui,ctx){return `<section class="ex-page" data-experience-v3><header class="ex-heading"><div><h1>探究</h1></div><div class="ex-heading-actions">${buttonAction("memories","気づき","quiet")}${buttonAction("catalog","テーマ一覧","quiet")}</div></header>${ui.notice?`<p class="ex-notice" role="status">${esc(ui.notice)}</p>`:""}<div class="ex-switch"><button type="button" data-ex-tab="field" aria-pressed="${ui.tab==="field"}">探究フィールド</button><button type="button" data-ex-tab="catalog" aria-pressed="${ui.tab==="catalog"}">テーマ一覧</button></div>${ui.tab==="catalog"?catalog(ui,ctx):field(ui,ctx)}${modal(ui,ctx)}</section>`;}
function modal(ui,ctx){if(!ui.modal)return "";const category=ctx.categories.find(c=>c.id===ui.selected)||ctx.categories[0],title=ui.topic||category.topics[0]||category.name,links=relevance(ui,ctx);let body="";
 if(ui.modal==="know")body=`<p>「${esc(title)}」に関連する知識を確認する場所です。</p><div class="ex-dialog-block"><strong>自分の情報との接点</strong><p>${esc(links.linked.get(category.id)||"このテーマを調べるのに記録は必要ありません。")}</p></div><div class="ex-dialog-block"><strong>読み取るときの注意</strong><p>記録や感覚の違いだけでは、原因や身体の状態を判断できません。</p></div><p class="ex-muted">根拠審査済みのコラム本文は今後接続します。未確認の医学的な説明は表示しません。</p>`;
 if(ui.modal==="try")body=`<p>距離と時間を動かして、平均ペースと平均速度の関係を確かめられます。</p><div class="ex-range-label"><label for="ex-distance">距離</label><output data-ex-distance-value>${ui.trialDistance.toFixed(1)} km</output></div><input id="ex-distance" type="range" min="1" max="15" step=".5" value="${ui.trialDistance}" data-ex-distance/><div class="ex-range-label"><label for="ex-minutes">時間</label><output data-ex-minutes-value>${ui.trialMinutes} 分</output></div><input id="ex-minutes" type="range" min="10" max="100" step="1" value="${ui.trialMinutes}" data-ex-minutes/><div class="ex-metric-grid"><div><small>平均ペース</small><strong data-ex-pace>—</strong><em>分/km</em></div><div><small>平均速度</small><strong data-ex-speed>—</strong><em>km/h</em></div></div><p class="ex-muted">算術計算のみ。個人の将来の走りや身体への負荷・ケガを予測するものではありません。</p>`;
 if(ui.modal==="note")body=`<p>自分で選んだ気づきだけを残します。メモしなくても探究できます。</p><label class="ex-form-label" for="ex-note">メモ（500文字まで）</label><textarea id="ex-note" maxlength="500" rows="4" placeholder="次に確かめてみたいことなど"></textarea><div class="ex-dialog-actions"><button type="button" data-ex-action="save-note" ${!ui.canSave?"disabled":""}>保存する</button></div>${!ui.canSave?'<p class="ex-muted">保存領域を安全に読み取れないため、上書きを防ぐために保存を停止しています。</p>':""}`;
 if(ui.modal==="memories")body=ui.notes.length?`<div class="ex-saved-list">${ui.notes.map(n=>`<div class="ex-saved"><div><small>${esc(ctx.categories.find(c=>c.id===n.category)?.name||"探究")} · ${esc(n.createdAt.slice(0,10))}</small><p>${esc(n.text)}</p></div><button type="button" data-ex-delete="${esc(n.id)}" ${!ui.canSave?"disabled":""} aria-label="このメモを削除">削除</button></div>`).join("")}</div>`:"<p>まだメモはありません。テーマを開くと、必要なときだけ残せます。</p>";
 if(ui.modal==="share")body=`<p>相談したいことを整理するための下書きです。自動で送信されません。</p><div class="ex-dialog-block" data-ex-draft-text><strong>話したいテーマ：${esc(title)}</strong><p>参考にした分野：${esc(category.name)}</p><p>記録との接点：${esc(links.linked.get(category.id)||"記録との直接的な接点はありません")}</p><p>相談したいこと：</p></div><div class="ex-dialog-actions"><button type="button" data-ex-action="copy">文章をコピー</button></div><p class="ex-muted">個人の走行データやメモを自動で共有しません。</p>`;
 return `<div class="ex-backdrop" data-ex-overlay><section class="ex-dialog" role="dialog" aria-modal="true" aria-labelledby="ex-dialog-title"><div class="ex-dialog-head"><div><small>${esc(category.name)}</small><h2 id="ex-dialog-title">${esc({know:"知る",try:"試す",note:"メモ",share:"相談用にまとめる",memories:"これまでの気づき"}[ui.modal]||ui.modal)}</h2></div><button type="button" data-ex-action="close" aria-label="閉じる">×</button></div>${body}</section></div>`;
}
export function updatePace(root){const d=root.querySelector("[data-ex-distance]"),m=root.querySelector("[data-ex-minutes]");if(!d||!m)return;const distance=Number(d.value),minutes=Number(m.value);root.querySelector("[data-ex-distance-value]").textContent=`${distance.toFixed(1)} km`;root.querySelector("[data-ex-minutes-value]").textContent=`${minutes} 分`;const seconds=Math.round(minutes/distance*60),mm=Math.floor(seconds/60),ss=seconds%60;root.querySelector("[data-ex-pace]").textContent=`${mm}:${String(ss).padStart(2,"0")}`;root.querySelector("[data-ex-speed]").textContent=(distance/(minutes/60)).toFixed(1);}
export function saveNote(ui,text){if(!ui.canSave||!ui.storage)return {ok:false,reason:"保存領域が利用できません"};const value=String(text??"").trim();if(!value||value.length>500)return {ok:false,reason:"1〜500文字で入力してください"};const time=new Date().toISOString();const id=`${time}-${Math.random().toString(36).slice(2,12)}`;const next=[{id,category:ui.selected,text:value,createdAt:time},...ui.notes].slice(0,LIMIT);try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);const expected=JSON.stringify(next);if(old!==(ui.notes.length?JSON.stringify(ui.notes):null)){ui.canSave=false;return {ok:false,reason:"他の画面で変更されています。元のデータを保護しました"};}ui.storage.setItem(EXPLORATION_NOTE_KEY,expected);if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==expected)return {ok:false,reason:"保存を確認できませんでした"};ui.notes=next;return {ok:true};}catch{return {ok:false,reason:"保存できませんでした"}}}
export function deleteNote(ui,id){if(!ui.canSave||!ui.storage)return false;const oldList=ui.notes;const next=oldList.filter(n=>n.id!==id);if(next.length===oldList.length)return false;try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);if(old!==JSON.stringify(oldList)){ui.canSave=false;return false;}ui.storage.setItem(EXPLORATION_NOTE_KEY,JSON.stringify(next));if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==JSON.stringify(next))return false;ui.notes=next;return true}catch{return false}}
