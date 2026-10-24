const KEY = "runload-v2-life-condition-v1";
const FEELINGS = Object.freeze(["とても良い","良い","ふつう","疲れ気味","良くない"]);
export const CONDITION_KEY = KEY;
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
 FEELINGS.includes(v.feeling) && typeof v.memo==="string" && v.memo.length<=160;
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
  pieces.push('<span class="hx-bar-col"><span class="hx-bar '+(Number.isInteger(m)?"":"hx-missing")+'" style="height:'+pct+'%" aria-label="'+escape(date+(Number.isInteger(m)?" "+sleepText(m):" 未入力"))+'"></span><small>'+Number(date.slice(-2))+'</small></span>');
 }
 return '<div class="hx-bars" role="img" aria-label="直近7日間の睡眠時間。未入力日は棒を表示しません">'+pieces.join("")+'</div>';
}
export function latestCard(preview){
 const body=preview ? '<div class="hx-latest-fig"><div><small>距離</small><strong>7.20 <em>km</em></strong></div><div><small>時間</small><strong>42 <em>分</em></strong></div><div><small>平均ペース</small><strong>5:50 <em>/km</em></strong></div></div>'
  : '<div class="hx-latest-empty"><span class="hx-runmark">'+icon("run")+'</span><div><strong>走行記録はまだありません</strong><p>正式な記録保存との接続後に表示されます</p></div></div>';
 return '<section class="hx-card hx-latest">'+head("最新の走行","run",preview?sample():"")+body+'<div class="hx-orbit" aria-hidden="true"></div></section>';
}
export function conditionCard(storage,preview){
 const state=readConditions(storage),entries=preview?demoEntries():state.entries,map=new Map(entries.map(x=>[x.date,x])),today=map.get(todayLocal());
 const count=Array.from({length:7},(_,i)=>pastDay(i)).filter(d=>map.has(d)).length;
 const sleep= sleepText(today?.sleepMinutes),feeling=today?.feeling||"未入力";
 const stat='<div class="hx-condition-stats"><div><small>睡眠</small><strong>'+escape(sleep)+'</strong></div><div><small>起床時の調子</small><strong>'+escape(feeling)+'</strong></div><div><small>直近7日の入力</small><strong>'+count+'<em> / 7日</em></strong></div></div>';
 return '<section class="hx-card hx-condition">'+
 '<button type="button" class="hx-title-button" data-condition-open aria-label="コンディションの入力と詳細を開く">'+head("コンディション","moon",preview?sample():'<span class="hx-right">開く ›</span>')+'</button>'+
 stat+'<div class="hx-chart-label">睡眠時間の推移 <span>直近7日</span></div>'+sevenBars(entries)+
 (!state.canSave&&!preview?'<p class="hx-warning">'+escape(state.reason)+'</p>':"")+'</section>';
}
export function achievementCard(preview){
 const track=preview?'<div class="hx-ach-main"><div class="hx-medal" aria-hidden="true">★</div><div class="hx-ach-data"><small>獲得 2 件 · 次の目標</small><strong>42.0 <em>/ 50 km</em></strong><div class="hx-progress"><span style="width:84%"></span></div><small>累計走行距離　84%</small></div></div><div class="hx-awards" aria-label="獲得済み2件、未獲得2件"><span class="won">★</span><span class="won">✦</span><span class="locked">◇</span><span class="locked">◇</span></div>'
 : '<div class="hx-ach-main"><div class="hx-medal hx-unearned" aria-hidden="true">☆</div><div class="hx-ach-data"><strong>実績データは未接続</strong><small>正式な走行記録に基づく実績判定を接続後に表示します</small></div></div>';
 return '<section class="hx-card hx-achievement"><button type="button" class="hx-title-button" data-achievement-open aria-label="実績の詳細を開く">'+head("実績","trophy",preview?sample():'<span class="hx-right">開く ›</span>')+'</button>'+track+'</section>';
}
export function shortcutsCard(){
 const links=[["course","コース設計","map"],["simulation","シミュレーション","sim"],["consultation","相談・共有","share"]];
 return '<section class="hx-card hx-shortcuts">'+head("クイックアクセス","bolt")+'<div class="hx-shortcut-grid">'+links.map(([url,label,ico])=>'<a href="#/'+url+'" class="hx-shortcut hx-shortcut-'+ico+'"><span>'+icon(ico)+'</span><strong>'+label+'</strong></a>').join("")+'</div></section>';
}
export function trendCard(preview){
 return '<section class="hx-card hx-optional">'+head("活動の推移","chart",preview?sample():"")+(preview?'<div class="hx-demo-activity">'+[24,50,32,68,45,80,65].map(v=>'<span style="height:'+v+'%"></span>').join("")+'</div><p>直近7日間の走行距離（表示例）</p>':'<p>正式な走行記録と接続すると推移が表示されます</p>')+'</section>';
}
export function discoveryCard(){
 return '<section class="hx-card hx-optional">'+head("探究の続き","leaf")+'<p>保存された探究の続きはありません</p></section>';
}
export function conditionPanel(storage,preview){
 const state=readConditions(storage),entries=preview?demoEntries():state.entries,today=entries.find(v=>v.date===todayLocal());
 const mins=today?.sleepMinutes??0,feeling=today?.feeling||"ふつう";
 const opts=FEELINGS.map(v=>'<option value="'+escape(v)+'"'+(feeling===v?' selected':'')+'>'+escape(v)+'</option>').join("");
 const bars=sevenBars(entries);
 return '<div class="hx-overlay" data-home-overlay><section class="hx-dialog" role="dialog" aria-modal="true" aria-labelledby="hx-dialog-label">'+
 '<div class="hx-dialog-head"><h2 id="hx-dialog-label">コンディション</h2><button data-home-close aria-label="閉じる" type="button">×</button></div>'+
 (preview?'<p class="hx-dialog-notice">表示例のデータです。入力は実際の保存内容に反映されます。</p>':'')+
 '<div class="hx-dialog-trend"><h3>睡眠時間の推移</h3>'+bars+'</div>'+
 '<form data-condition-form><h3>任意の生活記録</h3><label>日付<input type="date" name="date" required value="'+todayLocal()+'"></label>'+
 '<div class="hx-form-grid"><label>睡眠（時間）<input type="number" name="hours" min="0" max="24" value="'+Math.floor(mins/60)+'" required></label><label>睡眠（分）<input type="number" name="minutes" min="0" max="59" value="'+mins%60+'" required></label></div>'+
 '<label>起床時の調子<select name="feeling">'+opts+'</select></label><label>メモ（任意）<textarea name="memo" maxlength="160" rows="2">'+escape(today?.memo||"")+'</textarea></label>'+
 '<div class="hx-dialog-foot"><button type="button" data-home-close>キャンセル</button><button type="submit" class="hx-save" '+(!state.canSave?'disabled':'')+'>保存</button></div></form>'+
 (!state.canSave?'<p class="hx-warning">'+escape(state.reason)+'</p>':'')+'</section></div>';
}
export function achievementPanel(preview){
 return '<div class="hx-overlay" data-home-overlay><section class="hx-dialog hx-ach-dialog" role="dialog" aria-modal="true" aria-labelledby="hx-ach-label"><div class="hx-dialog-head"><h2 id="hx-ach-label">実績</h2><button type="button" data-home-close aria-label="閉じる">×</button></div>'+
 (preview?'<p>表示例：獲得2件、累計42.0 / 50 km（84%）</p><div class="hx-ach-grid"><span>★ 走行を始めた</span><span>✦ 初めての30分</span><span>◇ 累計50 km（未達成）</span><span>◇ 累計100 km（未達成）</span></div><p>※ サンプル値です。正式な達成条件・実績判定とは連動していません。</p>'
 :'<p>正式な走行記録・実績エンジンとの接続がまだ完了していません。未獲得と確定したわけではありません。</p>')+'</section></div>';
}
