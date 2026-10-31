import {HISTORY_STYLES} from "./historyInlineStyles.js";
/* RunLoad v2 / History Ver.2 (approved visual contract)
 * Presentation only: receives saved records explicitly from an authorised source.
 * No localStorage reads, no synthetic history, no draft fallback, no speculative results.
 */
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ICONS={
  history:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
  run:'<path d="m7 20 3-6 3 3 5 2M13 6l3 3-3 5-4-2-3 3M16 4a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z"/>',
  route:'<path d="M3 18h18M6 18V5l7 4-2 4 5 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow:'<path d="m9 18 6-6-6-6"/>',
  back:'<path d="m15 18-6-6 6-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'
};
const ico=name=>'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(ICONS[name]||ICONS.info)+'</svg>';
const finite=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const positive=v=>{const n=finite(v);return n!==null&&n>0?n:null;};
const dateParts=v=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v)))return null;const [y,m,d]=v.split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));return dt.getUTCFullYear()===y&&dt.getUTCMonth()===m-1&&dt.getUTCDate()===d?{y,m,d}:null;};
const todayMonth=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const monthShift=(month,offset)=>{const m=/^(\d{4})-(\d{2})$/.exec(month||'');if(!m)return todayMonth();const d=new Date(Date.UTC(+m[1],+m[2]-1+offset,1));return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');};
const formattedSeconds=s=>{const sec=finite(s);if(sec===null||sec<0)return '—';const h=Math.floor(sec/3600),m=Math.floor(sec%3600/60),t=Math.floor(sec%60);return(h>0?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(t).padStart(2,'0');};
const distanceText=n=>positive(n)===null?'—':n.toFixed(2);
const activityName=r=>({RUNNING:'ランニング',JOGGING:'ジョギング',WALK:'ウォーキング',RUN_WALK:'走歩混在'})[r.activityGait]||'活動種別不明';
const pace=r=>{const d=positive(r.distanceKm),s=positive(r.durationSeconds);if(d===null||s===null)return '—';const v=Math.round(s/d);return Math.floor(v/60)+':'+String(v%60).padStart(2,'0');};
const humanDate=iso=>{const p=dateParts(iso);return p?`${p.y}年${p.m}月${p.d}日`:'日付未取得';};
const weekday=iso=>{const p=dateParts(iso);return p?['日','月','火','水','木','金','土'][new Date(Date.UTC(p.y,p.m-1,p.d)).getUTCDay()]:'';};
// A saved record must carry a stable explicit identity, valid date, and type.
// Invalid rows are *not* guessed from drafts or substituted with unrelated records.
export function normalizeRecords(rows){
 if(!Array.isArray(rows))return [];
 const ids=new Set();
 return rows.flatMap(item=>{
  if(!item||typeof item!=='object')return [];
  const id=typeof item.id==='string'?item.id.trim():'';
  const type=item.type==='run'?'run':item.type==='rest'?'rest':null;
  const date=typeof item.date==='string'?item.date:'';
  if(!id||ids.has(id)||!type||!dateParts(date))return [];
  ids.add(id);
  return [{id,type,date,time:typeof item.time==='string'?item.time:'',activityGait:item.type==='run'&&['RUNNING','JOGGING','WALK','RUN_WALK'].includes(item.activityGait)?item.activityGait:'UNKNOWN',distanceKm:positive(item.distanceKm),durationSeconds:positive(item.durationSeconds),courseName:String(item.courseName??''),shoeName:String(item.shoeName??''),memo:String(item.memo??''),rofBefore:Number.isInteger(item.rofBefore)&&item.rofBefore>=0&&item.rofBefore<=10?item.rofBefore:null,rofAfter:Number.isInteger(item.rofAfter)&&item.rofAfter>=0&&item.rofAfter<=10?item.rofAfter:null}];
 }).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)||a.id.localeCompare(b.id));
}
export const lookupRecord=(records,id)=>records.find(r=>r.id===id)??null;
export function createHistoryUi(){return {month:todayMonth(),day:null,type:'all',query:'',selectedId:null};}
export function filterRecords(records,ui){return records.filter(r=>r.date.startsWith(ui.month)&&(ui.day===null||Number(r.date.slice(-2))===ui.day)&&(ui.type==='all'||r.type===ui.type)&&(!ui.query||[r.courseName,r.memo,r.shoeName,r.date].some(s=>s.toLocaleLowerCase('ja').includes(ui.query.toLocaleLowerCase('ja')))));}
function hero(ui,records,connected){const month=records.filter(r=>r.date.startsWith(ui.month)),runs=month.filter(r=>r.type==='run');const distance=runs.reduce((a,r)=>a+(r.distanceKm??0),0),seconds=runs.reduce((a,r)=>a+(r.durationSeconds??0),0);const monthTitle=`${Number(ui.month.slice(0,4))}年${Number(ui.month.slice(5,7))}月の記録`;
 return `<section class="surface hero" aria-label="月間実績"><svg class="ridge" viewBox="0 0 600 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path fill="#1f7391" opacity=".22" d="M0 135L89 75 153 128 247 42 314 126 405 51 467 114 525 57 600 125V180H0Z"/><path fill="#2e91a1" opacity=".23" d="M0 175L105 119 181 153 285 93 361 147 449 115 528 138 600 99V180H0Z"/></svg><div class="hero-main"><div class="hero-row"><div class="hero-title"><strong>${monthTitle}</strong></div></div><div class="stats"><div class="stat"><div class="stat-label">${ico('run')} 運動回数</div><strong>${connected?runs.length:'—'}${connected?'<em>回</em>':''}</strong><div class="stat-sub">${connected?`休養 ${month.length-runs.length}日`:'保存履歴未接続'}</div></div><div class="stat"><div class="stat-label">${ico('route')} 運動距離</div><strong>${connected?distance.toFixed(1):'—'}${connected?'<em>km</em>':''}</strong><div class="stat-sub">${connected?'この月の合計':'保存履歴未接続'}</div></div><div class="stat"><div class="stat-label">${ico('clock')} 運動時間</div><strong>${connected?formattedSeconds(seconds):'—'}</strong><div class="stat-sub">${connected?'この月の合計':'保存履歴未接続'}</div></div></div></div></section>`;
}
function calendar(ui,records){const [y,m]=ui.month.split('-').map(Number),start=new Date(Date.UTC(y,m-1,1)).getUTCDay(),limit=new Date(Date.UTC(y,m,0)).getUTCDate();const monthRecords=records.filter(r=>r.date.startsWith(ui.month));const days=Array.from({length:start+limit},(_,i)=>{const n=i-start+1;if(n<1)return '<span class="day-empty"></span>';const date=ui.month+'-'+String(n).padStart(2,'0');const entries=monthRecords.filter(r=>r.date===date),isRun=entries.some(r=>r.type==='run'),isRest=entries.some(r=>r.type==='rest');const now=new Date(),isToday=y===now.getFullYear()&&m===now.getMonth()+1&&n===now.getDate();return `<button type="button" data-day="${n}" class="${entries.length?'has-record':''} ${isRest&&!isRun?'has-rest':''} ${ui.day===n?'selected':''} ${isToday?'today':''}" aria-label="${n}日、${entries.length}件" aria-pressed="${ui.day===n}">${n}</button>`;});
return `<section class="surface calendar-panel" aria-label="記録カレンダー"><div class="section-head"><h2>カレンダー</h2><div class="month-nav"><button class="round-btn" data-month="-1" aria-label="前の月">${ico('back')}</button><strong>${y}年${m}月</strong><button class="round-btn" data-month="1" aria-label="次の月">${ico('arrow')}</button></div></div><div class="week-grid">${['日','月','火','水','木','金','土'].map(x=>`<span>${x}</span>`).join('')}</div><div class="day-grid">${days.join('')}</div><div class="legend"><span><i></i>運動記録</span><span><i class="rest"></i>休養記録</span></div><div class="calendar-footer"><span>${ui.day?`${ui.day}日を選択中`:'日付を選ぶと一覧を絞れます'}</span>${ui.day?'<button type="button" class="link-button" data-clear-day>解除</button>':'<button type="button" class="link-button" data-month="0">今月へ</button>'}</div></section>`;}
const row=(r,selected)=>{const run=r.type==='run',d=Number(r.date.slice(-2));return `<button class="entry ${selected===r.id?'selected':''}" type="button" data-select-id="${escapeHtml(r.id)}" aria-pressed="${selected===r.id}"><span class="datebox"><strong>${d}</strong><span>${weekday(r.date)}曜日</span></span><span class="entry-main"><span class="entry-type"><i class="type-dot ${run?'':'rest'}"></i>${run?escapeHtml(activityName(r)):'休養'}　${r.time?escapeHtml(r.time)+' 開始':''}</span><strong class="entry-title">${run?escapeHtml(r.courseName||'走行記録'):'休養日の記録'}</strong><span class="entry-caption">${run?'走行時間 '+formattedSeconds(r.durationSeconds)+'　・　ペース '+pace(r)+' /km':'その日の状態を記録'}</span></span><span class="entry-side"><span class="entry-number">${run?distanceText(r.distanceKm):'—'}${run?'<small>km</small>':''}</span>${ico('arrow')}</span></button>`;};
function focusCard(ui,records,connected){const selected=lookupRecord(records,ui.selectedId);return `<aside class="surface focus-panel" aria-label="選択した記録の補足情報"><span class="focus-kicker">選択した記録</span><h3>${selected?humanDate(selected.date)+'の'+(selected.type==='run'?activityName(selected):'休養'):'その日のメモ・使用品'}</h3><div class="focus-fact"><span>シューズ</span><strong>${selected?escapeHtml(selected.shoeName||'—'):'—'}</strong></div><div class="focus-fact"><span>本人のメモ</span><strong>${selected?escapeHtml(selected.memo||'—'): '—'}</strong></div><div class="focus-id">${selected?'記録ID: '+escapeHtml(selected.id):connected?'記録を選択すると詳細が表示されます':'保存済みの記録との接続後に表示されます'}</div></aside>`;}
function list(ui,records,connected,canOpen){const rows=filterRecords(records,ui),selected=lookupRecord(rows,ui.selectedId);const emptyText=connected?'<strong>この条件の記録はありません</strong><p>日付・種類・検索条件を変更してください。</p><button class="link-button" data-reset-filters>条件を解除する</button>':'<strong>保存済みの履歴はまだ接続されていません</strong><p>未保存の入力内容やサンプル記録は<br>履歴として表示しません。</p>';
return `<section class="surface list-panel"><div class="list-head"><div><h2>記録を探す</h2><p>日付や種類から、その日の記録を選択</p></div></div><div class="controls"><div class="segmented" role="group" aria-label="記録の種類">${[['all','すべて'],['run','走行'],['rest','休養']].map(([id,label])=>`<button data-record-kind="${id}" type="button" class="${ui.type===id?'active':''}" aria-pressed="${ui.type===id}">${label}</button>`).join('')}</div><label class="search" aria-label="記録を検索">${ico('search')}<input id="hx-search" placeholder="コース・メモで検索" autocomplete="off" value="${escapeHtml(ui.query)}"/></label></div><div class="results-counter"><span><strong>${ui.day?`${ui.day}日の記録`:'記録一覧'}</strong></span><span>${connected?rows.length+'件':'未接続'}</span></div><div class="timeline">${rows.length?rows.map(r=>row(r,ui.selectedId)).join(''):`<div class="empty" data-history-unconnected="${!connected}"><div class="empty-symbol">${ico(connected?'search':'history')}</div>${emptyText}</div>`}</div>${selected?`<div class="selected-footer"><div><span class="kicker">選択した記録</span><strong>${humanDate(selected.date)}　${selected.type==='run'?escapeHtml(activityName(selected)):'休養'}</strong><span>記録ID：${escapeHtml(selected.id)}</span></div>${selected.type==='rest'?'<span class="pill">休養日の記録：走行結果・参考値なし</span>':canOpen?'<button class="primary" type="button" data-open-record>結果を開く　›</button>':'<span class="pill">結果の接続待ち</span>'}</div>`:''}</section>`;}
export function renderHistory(ui,rawRecords=[],options={}){const records=normalizeRecords(rawRecords),connected=options.connected===true;const visible=connected?records:[];return `<div class="stage"><div class="workspace"><div class="topline"><div><h1>履歴</h1><p>過去の運動を、日付から見つける。</p></div></div>${!connected?'<div class="review-notice" role="status"><i class="notice-dot"></i>保存済みの記録との接続は準備中です。未保存の入力内容は表示しません。</div>':''}${hero(ui,visible,connected)}<div class="layout"><div class="calendar-column">${calendar(ui,visible)}${focusCard(ui,visible,connected)}</div>${list(ui,visible,connected,typeof options.onOpen==='function')}</div></div></div>`;}
export function mountHistory(host,{records=[],connected=false,onOpen=null,ui=createHistoryUi()}={}){
 if(!host)return;
 const root=host.shadowRoot||host.attachShadow({mode:'open'});
 root.innerHTML='<style data-history-inline-styles>'+HISTORY_STYLES+'\n.selected-footer{scroll-margin-bottom:calc(110px + env(safe-area-inset-bottom))}</style><div id="hx-view"></div>';
 const safeRecords=connected===true?normalizeRecords(records):[];
 const context={connected:connected===true,onOpen};
 const draw=()=>root.querySelector('#hx-view').innerHTML=renderHistory(ui,safeRecords,context);
 root.addEventListener('click',event=>{
  const target=event.target.closest('button');if(!target)return;
  const d=target.dataset;
  if('month'in d){ui.month=d.month==='0'?todayMonth():monthShift(ui.month,Number(d.month));ui.day=null;ui.selectedId=null;}
  else if('day'in d){const day=Number(d.day);ui.day=ui.day===day?null:day;ui.selectedId=null;}
  else if('clearDay'in d){ui.day=null;ui.selectedId=null;}
  else if('recordKind'in d){ui.type=d.recordKind;ui.selectedId=null;}
  else if('resetFilters'in d){ui.day=null;ui.type='all';ui.query='';ui.selectedId=null;}
  else if('selectId'in d){const choice=lookupRecord(filterRecords(safeRecords,ui),d.selectId);ui.selectedId=choice?.id??null;}
  else if('openRecord'in d){const choice=lookupRecord(filterRecords(safeRecords,ui),ui.selectedId);if(choice&&typeof onOpen==='function')onOpen(choice.id);return;}
  else return;
  const y=window.scrollY;draw();window.scrollTo(0,y);
  if('selectId' in d&&ui.selectedId&&window.matchMedia('(max-width:800px)').matches){
   root.querySelector('.selected-footer')?.scrollIntoView({block:'end',behavior:'instant'});
  }
 });
 root.addEventListener('input',event=>{
  if(event.target.id!=='hx-search')return;
  // Keep the *same* focused input while filtering. Replacing and refocusing it
  // on every keystroke makes iOS Safari pan/zoom and can disturb the keyboard.
  ui.query=event.target.value;ui.selectedId=null;
  const panel=root.querySelector('.list-panel');
  if(!panel)return;
  const template=document.createElement('template');
  template.innerHTML=list(ui,safeRecords,context.connected,typeof context.onOpen==='function');
  const updated=template.content.querySelector('.list-panel');
  for(const selector of ['.results-counter','.timeline']){
   const previous=panel.querySelector(selector),replacement=updated?.querySelector(selector);
   if(previous&&replacement)previous.replaceWith(replacement);
  }
  panel.querySelector('.selected-footer')?.remove();
 });
 draw();
}
