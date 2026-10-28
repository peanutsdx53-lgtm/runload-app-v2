const KEY = "runload-v2-life-condition-v1";
const FEELINGS = Object.freeze(["とても良い","良い","ふつう","疲れ気味","良くない"]);
export const CONDITION_KEY = KEY;

const CLOCK_PATTERN=/^([01]\d|2[0-3]):([0-5]\d)$/;
function clockMinutes(value) {
 const match=CLOCK_PATTERN.exec(value||"");
 return match?Number(match[1])*60+Number(match[2]):null;
}
export function calculatedTimeInBed(bedTime,wakeTime,relation="auto"){
 const start=clockMinutes(bedTime),end=clockMinutes(wakeTime);
 if(start===null||end===null||!["auto","previous","same"].includes(relation))return null;
 const offset=relation==="previous"?1:relation==="same"?0:Number(start>end);
 const minutes=end-start+offset*1440;
 if(minutes<=0||minutes>=1440)return null;
 return {minutes,bedDayOffset:offset};
}
export function conditionEntryFromForm(fields) {
 const date=String(fields.date||""),feeling=String(fields.feeling||""),
  memo=String(fields.memo||""),mode=String(fields.sleepMode||"");
 let entry={date,feeling,memo,sleepMinutes:0};
 if(mode==="clock"){
  const bedTime=String(fields.bedTime||""),wakeTime=String(fields.wakeTime||""),
   bedDayRule=String(fields.bedDayRule||"auto"),
   calculated=calculatedTimeInBed(bedTime,wakeTime,bedDayRule);
  if(!calculated)return {ok:false,reason:"就寝・起床時刻と日付の関係を確認してください"};
  entry={...entry,sleepMinutes:calculated.minutes,sleepSource:"clock",bedTime,wakeTime,
   bedDayOffset:calculated.bedDayOffset,bedDayRule};
 }else if(mode==="duration"){
  const explicit=fields.durationHours!==undefined||fields.durationMinutes!==undefined;
  const hours=explicit?String(fields.durationHours??"").trim():null;
  const minuteText=explicit?String(fields.durationMinutes??"").trim():null;
  const parts=explicit
   ?(/^(?:[0-9]|1[0-9]|2[0-3])$/.test(hours)&&/^(?:[0-9]|[1-5][0-9])$/.test(minuteText)?[null,hours,minuteText]:null)
   :/^([0-9]{1,2}):([0-5][0-9])$/.exec(String(fields.duration||"").trim());
  if(!parts)return {ok:false,reason:"合計時間の「時間」「分」を確認してください"};
  const minutes=Number(parts[1])*60+Number(parts[2]);
  if(minutes<=0||minutes>=1440)return {ok:false,reason:"合計時間は1分以上24時間未満にしてください"};
  entry={...entry,sleepMinutes:minutes,sleepSource:"duration"};
 }else return {ok:false,reason:"睡眠の入力方法を選択してください"};
 if(!validEntry(entry))return {ok:false,reason:"日付・起床時の調子・メモを確認してください"};
 return {ok:true,entry};
}
export function updateSleepForm(form){
 if(!form)return;
 const mode=form.querySelector('[name="sleepMode"]')?.value||"clock";
 form.querySelectorAll("[data-sleep-mode]").forEach(btn=>{
  const active=btn.dataset.sleepMode===mode;
  btn.setAttribute("aria-pressed",String(active));btn.classList.toggle("is-selected",active);
 });
 form.querySelectorAll("[data-sleep-panel]").forEach(el=>el.hidden=el.dataset.sleepPanel!==mode);
 const result=form.querySelector("[data-sleep-result]");
 const label=form.querySelector("[data-sleep-result-label]");
 const note=form.querySelector("[data-sleep-result-note]");
 const error=form.querySelector("[data-sleep-error]");
 if(error){error.hidden=true;error.textContent="";}
 let minutes=null,message="";
 if(mode==="clock"){
  const bed=form.querySelector('[name="bedTime"]')?.value,
    wake=form.querySelector('[name="wakeTime"]')?.value,
    rule=form.querySelector('[name="bedDayRule"]:checked')?.value||"auto";
  const calc=calculatedTimeInBed(bed,wake,rule);
  minutes=calc?.minutes??null;
  message=calc?(calc.bedDayOffset===1?"前日に就寝した記録として計算":"当日に就寝した記録として計算"):
   (bed&&wake?"時刻と就寝日を確認してください":"就寝・起床時刻を選んでください");
 }else{
  const hours=form.querySelector('[name="durationHours"]')?.value.trim()||"";
  const fraction=form.querySelector('[name="durationMinutes"]')?.value.trim()||"";
  const complete=/^(?:[0-9]|1[0-9]|2[0-3])$/.test(hours)&&/^(?:[0-9]|[1-5][0-9])$/.test(fraction);
  const parsed=complete?Number(hours)*60+Number(fraction):null;
  minutes=parsed!==null&&parsed>0&&parsed<1440?parsed:null;
  message=minutes!==null?"本人が申告した睡眠時間として記録":"時間と分を入力してください";
  form.querySelectorAll("[data-duration-minute]").forEach(button=>{
   const pressed=fraction!==""&&Number(button.dataset.durationMinute)===Number(fraction);
   button.setAttribute("aria-pressed",String(pressed));
  });
 }
 if(result)result.textContent=minutes!==null?sleepText(minutes):"—";
 if(label)label.textContent=mode==="clock"?"就寝から起床までの経過時間":"申告した睡眠時間";
 if(note)note.textContent=message;
}

function dayText(date) {
 const d = date instanceof Date ? date : new Date(date);
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
}
export function todayLocal(){return dayText(new Date());}
function pastDay(offset) {const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-offset);return dayText(d);}
export function validEntry(v) {
 return !!v && typeof v==="object" && !Array.isArray(v) &&
 /^\d{4}-\d{2}-\d{2}$/.test(v.date) && !Number.isNaN(new Date(v.date+"T12:00:00").getTime()) &&
 Number.isInteger(v.sleepMinutes) && v.sleepMinutes>=0 && v.sleepMinutes<=1440 &&
 FEELINGS.includes(v.feeling) && typeof v.memo==="string" && v.memo.length<=160 &&
 (v.sleepSource===undefined ||
  (v.sleepSource==="duration" && v.sleepMinutes>0 && v.sleepMinutes<1440 &&
   !("bedTime" in v) && !("wakeTime" in v)) ||
  (v.sleepSource==="clock" && typeof v.bedTime==="string" && typeof v.wakeTime==="string" &&
   ["auto","previous","same"].includes(v.bedDayRule) &&
   (v.bedDayOffset===0||v.bedDayOffset===1) &&
   (()=>{const r=calculatedTimeInBed(v.bedTime,v.wakeTime,v.bedDayRule);
   return !!r&&r.minutes===v.sleepMinutes&&r.bedDayOffset===v.bedDayOffset;})()));
}
export function readConditions(storage) {
 try {
  if(!storage || typeof storage.getItem!=="function" || typeof storage.setItem!=="function")
   return {entries:[],canSave:false,reason:"保存領域にアクセスできません"};
  const raw=storage.getItem(KEY);
  if(raw===null)return {entries:[],canSave:true,reason:""};
  const data=JSON.parse(raw);
  if(!Array.isArray(data)||data.length>366||data.some(v=>!validEntry(v))||new Set(data.map(v=>v.date)).size!==data.length)
   return {entries:[],canSave:false,reason:"保存済みの入力を読み取れません。元のデータは保護しています"};
  return {entries:data.slice().sort((a,b)=>a.date.localeCompare(b.date)),canSave:true,reason:""};
 }catch{return {entries:[],canSave:false,reason:"入力データにアクセスできません。元のデータは保護しています"};}
}
export function saveCondition(storage, entry) {
 if(!validEntry(entry))return {ok:false,reason:"睡眠時間・体調の入力を確認してください"};
 const before=readConditions(storage);
 if(!before.canSave)return {ok:false,reason:before.reason};
 try {
  const old=storage.getItem(KEY);
  const entries=before.entries.filter(v=>v.date!==entry.date).concat([{...entry}]).sort((a,b)=>a.date.localeCompare(b.date)).slice(-366);
  const next=JSON.stringify(entries);
  if(storage.getItem(KEY)!==old)return {ok:false,reason:"別の画面で内容が変更されました"};
  storage.setItem(KEY,next);
  if(storage.getItem(KEY)!==next)return {ok:false,reason:"保存を確認できません"};
  return {ok:true,reason:""};
 }catch{return {ok:false,reason:"保存できませんでした"};}
}
function demoEntries(){
 const sleeps=[320,410,null,460,345,null,400],out=[];
 for(let offset=6;offset>=0;offset--){const n=sleeps[6-offset];if(n!==null)out.push({date:pastDay(offset),sleepMinutes:n,feeling:offset===0?"ふつう":"良い",memo:""});}
 return out;
}
function escape(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function icon(which){
 const shape={
 run:'<path d="m13 5 2-2 3 2-2 3-3-3ZM11 9l4 3 4 1M11 9 8 14l-4 1M15 12l-3 4-1 5M11 9l3 1-3 4-5 6"/>',
 moon:'<path d="M20.5 14a9 9 0 0 1-10.5-10.5A9 9 0 1 0 20.5 14Z"/>',
 trophy:'<path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 15v4M8 21h8"/>',
 bolt:'<path d="m13 2-9 12h7l-1 8 10-13h-7Z"/>',
 chart:'<path d="M3 20h18M5 16v-4h4v4M11 16V5h4v11M17 16V9h4v7"/>',
 leaf:'<path d="M12 21v-8m0 7C7 19 4 16 4 12c4-1 8 0 8 5m0-4c0-6 3-9 8-10 1 5-1 10-8 12"/>',
 map:'<path d="M3 6 9 3l6 3 6-3v15l-6 3-6-3-6 3V6ZM9 3v15M15 6v15"/>',
 sim:'<path d="M3 20h18M5 17l5-5 4 2 5-8m-3 0h3v3"/>',
 share:'<path d="M7 12 17 6M7 12l10 6"/><circle cx="5" cy="12" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="19" r="2"/>'
 }[which]||'';
 return '<svg viewBox="0 0 24 24" aria-hidden="true" class="hx-icon" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round">'+shape+'</svg>';
}
function head(title,which,extra){
 return '<div class="hx-head"><span class="hx-symbol">'+icon(which)+'</span><h2>'+title+'</h2>'+(extra||"")+'</div>';
}
function sample(){return '<span class="hx-sample">表示例</span>';}
function sleepText(minutes){return Number.isInteger(minutes)?Math.floor(minutes/60)+'時間'+String(minutes%60).padStart(2,"0")+'分':"未入力";}
function sevenBars(entries){
 const map=new Map(entries.map(x=>[x.date,x])), pieces=[];
 for(let offset=6;offset>=0;offset--){
  const date=pastDay(offset),item=map.get(date),m=item?.sleepMinutes;
  const pct=Number.isInteger(m)?Math.max(4,Math.min(100,Math.round(m/600*100))):0;
  pieces.push('<span class="hx-bar-col"><span class="hx-bar '+(Number.isInteger(m)?"":"hx-missing")+'" style="height:'+pct+'%" aria-label="'+escape(date+(Number.isInteger(m)?" "+(item.sleepSource==="clock"?"就床 ":"睡眠 ")+sleepText(m):" 未入力"))+'"></span><small>'+Number(date.slice(-2))+'</small></span>');
 }
 return '<div class="hx-bars" role="img" aria-label="直近7日間の睡眠・就床の記録時間。未入力日は棒を表示しません">'+pieces.join("")+'</div>';
}
export function latestCard(preview,record=null){
 const recent=!preview&&record?.source==='manual'&&record?.type==='run'&&typeof record?.id==='string'&&Number.isFinite(record.distanceKm)&&Number.isInteger(record.durationSeconds)?record:null;
 const secs=recent?Math.round(recent.durationSeconds/recent.distanceKm):0;
 const pace=secs?Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0'):'—';
 // The manual editor accepts minutes (including decimals); preserve that unit on Home.
 // A rounded seconds store must not produce a misleading "35分00秒" label.
 const time=recent?String(Number((recent.durationSeconds/60).toFixed(2)))+'分':'—';
 const body=preview ? '<div class="hx-latest-fig"><div><small>距離</small><strong>7.20 <em>km</em></strong></div><div><small>時間</small><strong>42 <em>分</em></strong></div><div><small>平均ペース</small><strong>5:50 <em>/km</em></strong></div></div>'
  :recent?'<div class="hx-latest-fig"><div><small>距離</small><strong>'+escape(recent.distanceKm.toFixed(2))+' <em>km</em></strong></div><div><small>時間</small><strong>'+escape(time)+'</strong></div><div><small>平均ペース</small><strong>'+escape(pace)+' <em>/km</em></strong></div></div><a class="hx-condition-explore" href="#/result?record='+encodeURIComponent(recent.id)+'">保存した走行の結果を見る <span aria-hidden="true">›</span></a>'
  : '<div class="hx-latest-empty"><span class="hx-runmark">'+icon("run")+'</span><div><strong>走行記録はまだありません</strong><p>手入力した走行を保存すると、ここに表示されます。</p></div></div>';
 return '<section class="hx-card hx-latest">'+head("最新の走行","run",preview?sample():recent?'<span class="hx-right">端末に保存した記録</span>':"")+body+'<div class="hx-orbit" aria-hidden="true"></div></section>';
}
export function conditionCard(storage,preview){
 const state=readConditions(storage),entries=preview?demoEntries():state.entries,map=new Map(entries.map(x=>[x.date,x])),today=map.get(todayLocal());
 const count=Array.from({length:7},(_,i)=>pastDay(i)).filter(d=>map.has(d)).length;
 const sleep= sleepText(today?.sleepMinutes),feeling=today?.feeling||"未入力",sleepLabel=today?.sleepSource==="clock"?"就床時間":"睡眠";
 const stat='<div class="hx-condition-stats"><div><small>'+sleepLabel+'</small><strong>'+escape(sleep)+'</strong>'+(today?.sleepSource==="clock"?'<span class="hx-wake-time">起床 '+escape(today.wakeTime)+'</span>':'')+'</div><div><small>起床時の調子</small><strong>'+escape(feeling)+'</strong></div><div><small>直近7日の入力</small><strong>'+count+'<em> / 7日</em></strong></div></div>';
 return '<section class="hx-card hx-condition">'+
 '<button type="button" class="hx-title-button" data-condition-open aria-label="コンディションの入力と詳細を開く">'+head("コンディション","moon",preview?sample():'<span class="hx-right">開く ›</span>')+'</button>'+
 stat+'<div class="hx-chart-label">記録時間の推移 <span>直近7日</span></div>'+sevenBars(entries)+'<a class="hx-condition-explore" href="#/condition" aria-label="コンディションの歩みを開き、長期の変化とメモを確認">コンディションの歩みを見る <span aria-hidden="true">›</span></a>'+
 (!state.canSave&&!preview?'<p class="hx-warning">'+escape(state.reason)+'</p>':"")+'</section>';
}
// Derived display-only milestones. The only source is a successfully read, saved
// manual run collection; no new storage key or scientific inference is used.
export function achievementSummary(savedRuns){
 if(!savedRuns?.ok||!Array.isArray(savedRuns.records))return {ok:false,reason:savedRuns?.reason||"保存済みの走行記録を読み取れません"};
 const runs=savedRuns.records.filter(r=>r?.source==="manual"&&r.type==="run"&&typeof r.id==="string"&&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&Number.isInteger(r.durationSeconds)&&r.durationSeconds>0);
 const distance=runs.reduce((n,r)=>n+r.distanceKm,0);
 const achieved=[runs.length>0,runs.some(r=>r.durationSeconds>=1800),distance>=50,distance>=100];
 return {ok:true,runs:runs.length,distance,achieved,count:achieved.filter(Boolean).length,
  target:distance<50?50:100,progress:Math.min(100,Math.round(distance/(distance<50?50:100)*100))};
}
export function achievementCard(preview,savedRuns={ok:true,records:[]}){
 const result=achievementSummary(savedRuns);
 const track=preview?'<div class="hx-ach-main"><div class="hx-medal" aria-hidden="true">★</div><div class="hx-ach-data"><small>獲得 2 件 · 次の目標</small><strong>42.0 <em>/ 50 km</em></strong><div class="hx-progress"><span style="width:84%"></span></div><small>累計走行距離　84%</small></div></div><div class="hx-awards" aria-label="獲得済み2件、未獲得2件"><span class="won">★</span><span class="won">✦</span><span class="locked">◇</span><span class="locked">◇</span></div>'
 :!result.ok?'<div class="hx-ach-main"><div class="hx-medal hx-unearned" aria-hidden="true">☆</div><div class="hx-ach-data"><strong>実績を確認できません</strong><small>'+escape(result.reason)+'</small></div></div>'
 :'<div class="hx-ach-main"><div class="hx-medal '+(result.count?'':'hx-unearned')+'" aria-hidden="true">'+(result.count?'★':'☆')+'</div><div class="hx-ach-data"><small>保存済み手入力走行から確認 · '+result.count+' / 4 項目</small><strong>'+result.distance.toFixed(1)+' <em>/ '+result.target+' km</em></strong><div class="hx-progress" role="progressbar" aria-label="累計走行距離の節目" aria-valuemin="0" aria-valuemax="'+result.target+'" aria-valuenow="'+Math.min(result.distance,result.target).toFixed(1)+'"><span style="width:'+result.progress+'%"></span></div><small>'+(result.runs?'累計走行距離 '+result.distance.toFixed(1)+' km':'記録を保存すると実績を確認できます')+'</small></div></div><div class="hx-awards" aria-label="'+result.count+'件達成、'+(4-result.count)+'件未達成">'+result.achieved.map((yes,i)=>'<span class="'+(yes?'won':'locked')+'" title="'+['初回の走行','30分以上の走行','累計50 km','累計100 km'][i]+'">'+(yes?'★':'◇')+'</span>').join('')+'</div>';
 return '<section class="hx-card hx-achievement"><button type="button" class="hx-title-button" data-achievement-open aria-label="実績の詳細を開く">'+head("実績","trophy",preview?sample():'<span class="hx-right">開く ›</span>')+'</button>'+track+'</section>';
}
export function shortcutsCard(){
 const links=[["course","コース設計","map"],["simulation","条件を変えて考える","sim"],["consultation","相談・共有","share"]];
 return '<section class="hx-card hx-shortcuts">'+head("クイックアクセス","bolt")+'<div class="hx-shortcut-grid">'+links.map(([url,label,ico])=>'<a href="#/'+url+'" class="hx-shortcut hx-shortcut-'+ico+'"><span>'+icon(ico)+'</span><strong>'+label+'</strong></a>').join("")+'</div></section>';
}
export function trendCard(preview){
 return '<section class="hx-card hx-optional">'+head("活動の推移","chart",preview?sample():"")+(preview?'<div class="hx-demo-activity">'+[24,50,32,68,45,80,65].map(v=>'<span style="height:'+v+'%"></span>').join("")+'</div><p>直近7日間の走行距離（表示例）</p>':'<p>正式な走行記録と接続すると推移が表示されます</p>')+'</section>';
}
export function discoveryCard(notes=[]){
 const latest=Array.isArray(notes)?notes.filter(x=>x&&typeof x.text==='string'&&x.text.trim()&&typeof x.createdAt==='string').slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0]:null;
 return '<section class="hx-card hx-optional">'+head('探究の続き','leaf')
  +(latest?'<p class="hx-discovery-note">'+escape(latest.text.slice(0,140))+'</p><p class="hx-discovery-date">'+escape(latest.createdAt.slice(0,10))+'に自分で残した気づき</p>':'<p>気になるテーマを自由に調べられます。メモは任意です。</p>')
  +'<a class="hx-condition-explore" href="#/exploration-tree">探究を開く ›</a></section>';
}
export function conditionPanel(storage,preview,selectedDate=todayLocal()){
 const state=readConditions(storage),chartEntries=preview?demoEntries():state.entries;
 const existing=state.entries.find(x=>x.date===selectedDate);
 const mode=existing?.sleepSource==="clock"||!existing?"clock":"duration";
 const feeling=existing?.feeling||"ふつう";
 const opts=FEELINGS.map(v=>'<option value="'+escape(v)+'"'+(feeling===v?' selected':'')+'>'+escape(v)+'</option>').join("");
 const bars=chartEntries.length?sevenBars(chartEntries):'<p class="hx-no-sleep">睡眠の記録はまだありません</p>';
 const durationHours=existing?Math.floor(existing.sleepMinutes/60):"";
 const durationMinutes=existing?existing.sleepMinutes%60:"";
 const bed=existing?.sleepSource==="clock"?existing.bedTime:"";
 const wake=existing?.sleepSource==="clock"?existing.wakeTime:"";
 const dayRule=existing?.sleepSource==="clock"?existing.bedDayRule:"auto";
 const modeButtons=[["clock","時刻から入力"],["duration","合計時間だけ"]].map(([value,label])=>
  '<button type="button" data-sleep-mode="'+value+'" class="'+(mode===value?'is-selected':'')+'" aria-pressed="'+String(mode===value)+'">'+label+'</button>').join("");
 const dayRadios=[["auto","自動判定"],["previous","前日に就寝"],["same","当日に就寝"]].map(([v,label])=>
  '<label class="hx-day-radio"><input type="radio" name="bedDayRule" value="'+v+'"'+(dayRule===v?' checked':'')+'><span>'+label+'</span></label>').join("");
 return '<div class="hx-overlay" data-home-overlay><section class="hx-dialog" role="dialog" aria-modal="true" aria-labelledby="hx-dialog-label">'+
 '<div class="hx-dialog-head"><h2 id="hx-dialog-label">コンディション</h2><button data-home-close aria-label="閉じる" type="button">×</button></div>'+
 (preview?'<p class="hx-dialog-notice">グラフは表示例です。以下の入力は実際の記録として保存されます。</p>':'')+
 
 '<form data-condition-form novalidate><h3>任意の生活記録</h3>'+
 '<label class="hx-date-row"><span>日付</span><span class="rl-date-control"><span class="rl-date-value" data-date-display aria-hidden="true">'+selectedDate.replaceAll("-", "/")+'</span><svg class="rl-date-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg><input type="date" name="date" required value="'+selectedDate+'" aria-label="生活記録の日付"></span></label>'+
 '<section class="hx-sleep-section" aria-label="睡眠の記録"><div class="hx-sleep-head"><h3>睡眠の記録</h3></div>'+
 '<input type="hidden" name="sleepMode" value="'+mode+'"><div class="hx-sleep-modes" role="group" aria-label="睡眠の入力方法">'+modeButtons+'</div>'+
 '<div data-sleep-panel="clock"'+(mode!=="clock"?' hidden':'')+'><div class="hx-time-grid">'+
 '<label class="hx-time-card"><span class="hx-time-label">'+icon("moon")+' 就寝</span><span class="hx-time-control"><span data-time-display="bedTime" aria-hidden="true">'+escape(bed||"時刻を選択")+'</span><svg viewBox="0 0 24 24" class="hx-time-clock" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg><input type="time" name="bedTime" value="'+escape(bed)+'" aria-label="就寝時刻"></span><small>起床日より前の場合もあります</small></label>'+
 '<label class="hx-time-card"><span class="hx-time-label">☀ 起床</span><span class="hx-time-control"><span data-time-display="wakeTime" aria-hidden="true">'+escape(wake||"時刻を選択")+'</span><svg viewBox="0 0 24 24" class="hx-time-clock" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></svg><input type="time" name="wakeTime" value="'+escape(wake)+'" aria-label="起床時刻"></span><small>記録した日の時刻</small></label></div>'+
 '<details class="hx-day-details"><summary>就寝日を修正</summary><div class="hx-day-options">'+dayRadios+'</div></details></div>'+
 '<div data-sleep-panel="duration"'+(mode!=="duration"?' hidden':'')+'><div class="hx-duration-entry"><strong>覚えている睡眠時間</strong><div class="hx-duration-grid">'+
 '<label>時間<input type="number" inputmode="numeric" name="durationHours" min="0" max="23" step="1" placeholder="例：7" value="'+durationHours+'" aria-label="睡眠時間（時間）"></label>'+
 '<label>分<input type="number" inputmode="numeric" name="durationMinutes" min="0" max="59" step="1" placeholder="例：30" value="'+durationMinutes+'" aria-label="睡眠時間（分）"></label></div>'+
 '<div class="hx-duration-picks" role="group" aria-label="分を簡単に選択">'+
 [0,15,30,45].map(v=>'<button type="button" data-duration-minute="'+v+'" aria-pressed="'+String(durationMinutes!==""&&Number(durationMinutes)===v)+'">'+String(v).padStart(2,"0")+'分</button>').join("")+
 '</div><small>分は1分単位で直接入力もできます。</small></div></div>'+
 '<div class="hx-sleep-result" aria-live="polite"><div data-sleep-result-label></div><strong data-sleep-result>—</strong><p data-sleep-result-note></p><small>時刻からの計算は実際に眠っていた時間とは異なる場合があります。</small></div></section>'+
 '<label>起床時の調子<select name="feeling">'+opts+'</select></label>'+
 '<label>メモ（任意）<textarea name="memo" maxlength="160" rows="2">'+escape(existing?.memo||"")+'</textarea></label>'+
 '<p class="hx-form-error" data-sleep-error role="alert" hidden></p>'+
 '<div class="hx-dialog-foot"><button type="button" data-home-close>キャンセル</button><button type="submit" class="hx-save" '+(!state.canSave?'disabled':'')+'>保存</button></div></form>'+
 '<div class="hx-dialog-trend"><h3>睡眠・就床の記録推移</h3>'+bars+'</div>'+
 (!state.canSave?'<p class="hx-warning">'+escape(state.reason)+'</p>':'')+'</section></div>';
}
export function achievementPanel(preview,savedRuns={ok:true,records:[]}){
 const r=achievementSummary(savedRuns);
 const labels=['初回の走行記録を保存','30分以上の走行記録を保存','累計50 km','累計100 km'];
 const body=preview?'<p>表示例：獲得2件、累計42.0 / 50 km（84%）</p><div class="hx-ach-grid"><span>★ 走行を始めた</span><span>✦ 初めての30分</span><span>◇ 累計50 km（未達成）</span><span>◇ 累計100 km（未達成）</span></div><p>※ サンプル値です。正式な達成条件・実績判定とは連動していません。</p>'
 :!r.ok?'<p role="alert">'+escape(r.reason)+'。元のデータは変更しません。</p>'
 :'<p>この端末に保存された手入力の走行記録：'+r.runs+'件、累計'+r.distance.toFixed(1)+' km。以下の4つの節目を確認できます。</p><div class="hx-ach-grid">'+labels.map((label,i)=>'<span class="'+(r.achieved[i]?'is-earned':'is-unearned')+'">'+(r.achieved[i]?'★ ':'◇ ')+label+(r.achieved[i]?'（達成）':'（未達成）')+'</span>').join('')+'</div><p>GPSの未保存データや入力途中の内容は含みません。医学的な評価、走力の判定、達成を勧めるものではありません。</p>';
 return '<div class="hx-overlay" data-home-overlay><section class="hx-dialog hx-ach-dialog" role="dialog" aria-modal="true" aria-labelledby="hx-ach-label"><div class="hx-dialog-head"><h2 id="hx-ach-label">実績</h2><button type="button" data-home-close aria-label="閉じる">×</button></div>'+body+'</section></div>';
}
