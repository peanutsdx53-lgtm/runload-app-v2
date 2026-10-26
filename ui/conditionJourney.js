/** Condition journey: direct exploration of saved dates, feelings and optional notes. */
import {readLifeEntries} from './explorationReadAdapter.js';
import {buildLifePacket,evaluateLifeIntent,minuteText,KNOWLEDGE} from './interpretationRules.js';
import {insightRecordStatus} from './conditionInsights.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const moods={'とても良い':{icon:'☀',className:'very-good'},'良い':{icon:'☺',className:'good'},'ふつう':{icon:'◐',className:'normal'},'疲れ気味':{icon:'☁',className:'tired'},'良くない':{icon:'☂',className:'low'}};
const symbol=s=>moods[s]||{icon:'·',className:'unknown'};
const label=source=>source==='self-reported'?'本人申告の睡眠時間':source==='time-in-bed'?'就床から起床までの経過時間':'方法不明';
const iso=d=>d.toISOString().slice(0,10);
const asDay=date=>new Date(date+'T12:00:00Z');
const visibleDate=date=>date.slice(5,7)+'/'+date.slice(8,10);
export function prepareConditionJourney(conditions,{days=30,method='auto',focus='all',selected=''}={}){
 const life=readLifeEntries(conditions);
 if(life.status!=='complete')return {status:'unavailable',reason:life.reason||'生活記録を確認できません',days:[]};
 const count=[7,30,90].includes(days)?days:30;
 const valid=life.records.filter(e=>e.minutes!==null&&['self-reported','time-in-bed'].includes(e.source));
 const activeMethod=method==='self-reported'||method==='time-in-bed'?method:valid.at(-1)?.source||'self-reported';
 const byDate=new Map(valid.filter(x=>x.source===activeMethod).map(x=>[x.date,x]));
 const now=new Date();const last=iso(new Date(now.getTime()-now.getTimezoneOffset()*60000));
 const first=asDay(last);
 first.setUTCDate(first.getUTCDate()-count+1);
 const dates=Array.from({length:count},(_,i)=>{const d=new Date(first);d.setUTCDate(d.getUTCDate()+i);const date=iso(d);return {date,entry:byDate.get(date)||null};});
 const current=dates.find(x=>x.date===selected&&x.entry)?.entry||dates.filter(x=>x.entry).at(-1)?.entry||null;
 const entries=dates.flatMap(x=>x.entry?[x.entry]:[]);
 const maxMinutes=Math.max(480,...entries.map(x=>x.minutes));
 const latest=entries.at(-1),previous=entries.at(-2);
 const packet=latest&&previous?buildLifePacket(conditions,previous.date,latest.date):null;
 return {status:'ready',days:dates,count,method:activeMethod,focus,selected:current,entries,maxMinutes,packet,allEntries:life.records};
}
const insightsMarkup=(insights,conditions,compact=false)=>{
 if(!insights?.ok)return '<p class="cj-warning" role="alert">'+esc(insights?.reason||'保存した気づきを確認できません')+'</p>';
 const entries=insights.entries.slice().reverse();
 if(!entries.length)return '<p class="cj-muted">まだ気づきの記録はありません。書きたいときだけ残せます。</p>';
 const chosen=compact?entries.slice(0,2):entries.slice(0,12);
 return '<div class="cj-insight-list">'+chosen.map(item=>{
  const status=insightRecordStatus(item,conditions);
  const warning=status==='current'?'':status==='changed'?'元の記録は後から変更されています':status==='missing'?'元の記録は削除されています':'元の記録を照合できません';
  return '<div class="cj-insight-item"><small>'+esc(item.date)+'に記録した気づき</small><p>'+esc(item.text)+'</p>'+(warning?'<small class="cj-warning">'+esc(warning)+'</small>':'')+(compact?'':'<button type="button" data-cj-delete-insight="'+esc(item.id)+'" aria-label="'+esc(item.date)+'の気づきを削除">削除</button>')+'</div>';
 }).join('')+'</div>';
};
export function renderConditionJourney(conditions,ui={},insights={ok:true,entries:[]}){
 const data=prepareConditionJourney(conditions,ui);
 const range=[7,30,90].map(days=>'<button type="button" data-cj-range="'+days+'" aria-pressed="'+String(data.count===days)+'">'+days+'日</button>').join('');
 const header='<section class="cj-panel" data-condition-journey id="condition-journey"><div class="cj-title"><div><small>履歴 / 生活記録</small><h2>コンディションの歩み</h2></div><span class="cj-hint">日をタップするとメモを確認できます</span></div>';
 if(data.status!=='ready')return header+'<p role="alert">'+esc(data.reason)+'</p></section>';
 const chosen=data.selected;
 const filters=[['all','すべて'],['good','調子が良かった日'],['other','それ以外'],['memo','メモがある日']];
 const methods=[['auto','最新の方法'],['self-reported','申告した睡眠時間'],['time-in-bed','就床〜起床の経過時間']];
 const selectedFocus=filters.some(x=>x[0]===ui.focus)?ui.focus:'all';
 const selectedMethod=methods.some(x=>x[0]===ui.method)?ui.method:'auto';
 const daysHtml=data.days.map(({date,entry})=>{
  const tag=entry?symbol(entry.feeling):symbol('');
  const highlighted=entry&&(selectedFocus==='all'||selectedFocus==='good'&&['良い','とても良い'].includes(entry.feeling)||selectedFocus==='other'&&!['良い','とても良い'].includes(entry.feeling)||selectedFocus==='memo'&&!!conditions.entries.find(x=>x.date===date&&x.memo?.trim()));
  const value=entry?Math.max(3,Math.round(entry.minutes/data.maxMinutes*110)):0;
  const detail=entry?label(entry.source)+' '+minuteText(entry.minutes)+'、調子 '+(entry.feeling||'未入力'):'記録なし';
  const cls='cj-day '+(entry?'':'cj-day--empty ')+(highlighted?'':'cj-day--muted ')+(chosen?.date===date?'cj-day--selected':'');
  return '<button class="'+cls+'" type="button" data-cj-day="'+esc(date)+'" '+(entry?'':'disabled ')+'aria-pressed="'+String(chosen?.date===date)+'" aria-label="'+esc(date+' '+detail)+'"><span class="cj-bar-area"><span class="cj-bar" style="height:'+value+'px"></span></span><span class="cj-mood cj-mood--'+tag.className+'" aria-hidden="true">'+tag.icon+'</span><span class="cj-day-label">'+esc(visibleDate(date))+'</span></button>';
 }).join('');
 const orig=chosen?conditions.entries.find(e=>e.date===chosen.date):null;
 const memo=orig&&typeof orig.memo==='string'&&orig.memo.trim()?orig.memo:'この日のメモはありません';
 const overview=data.packet?.status==='ready'?'<div class="cj-observation"><strong>最近の2件で確認できること</strong><p>'+esc(data.packet.observation)+'</p><p>本人の調子：'+esc(data.packet.feelings.join(' ／ '))+'</p><small>違いの原因やランニングへの影響は、この記録だけでは分かりません。</small></div>':'<p class="cj-muted">同じ方法の記録が増えると、最近の違いも確認できます。</p>';
 const noteForm=chosen?'<div class="cj-write"><label for="cj-history-note">この記録について気づいたこと（任意）</label><textarea id="cj-history-note" data-cj-note maxlength="160" rows="2" placeholder="気になったことを書いて残せます"></textarea><button type="button" data-cj-save-insight data-cj-origin="'+esc(chosen.date)+'">気づきを保存する</button></div>':'';
 const detail=chosen?'<div class="cj-detail"><div class="cj-detail-head"><strong>'+esc(chosen.date)+'の記録</strong><span class="cj-mood cj-mood--'+symbol(chosen.feeling).className+'">'+symbol(chosen.feeling).icon+' '+esc(chosen.feeling||'未入力')+'</span></div><p class="cj-detail-time">'+esc(minuteText(chosen.minutes))+'<small>'+esc(label(chosen.source))+'</small></p><div class="cj-day-memo"><strong>その日のメモ</strong><p>'+esc(memo)+'</p></div>' +noteForm+'<div class="cj-next-step"><p>この日の記録を基準に、次の同じ入力方法の記録と見比べられます。</p><button type="button" data-cj-create-intent data-cj-origin="'+esc(chosen.date)+'">次の記録で確かめる</button></div></div>':'<p class="cj-muted">この期間の記録はありません。記録のある期間に切り替えてください。</p>';
 return header+'<p class="cj-intro">棒の高さは時間、記号は本人が入力したその日の調子です。長いほど調子が良いという意味ではありません。</p><div class="cj-controls"><div class="cj-range" aria-label="表示期間">'+range+'</div><label>表示する時間<select data-cj-method>'+methods.map(([key,title])=>'<option value="'+key+'" '+(selectedMethod===key?'selected':'')+'>'+title+'</option>').join('')+'</select></label><label>注目する日<select data-cj-focus>'+filters.map(([key,title])=>'<option value="'+key+'" '+(selectedFocus===key?'selected':'')+'>'+title+'</option>').join('')+'</select></label></div><p class="cj-legend">'+esc(label(data.method))+'：'+data.entries.length+'日分 ／ 棒の基準：最大'+esc(minuteText(data.maxMinutes))+'</p><div class="cj-chart-viewport" data-cj-chart><div class="cj-chart-days">'+daysHtml+'</div></div>'+detail+'<div class="cj-context">'+overview+'<details><summary>睡眠とランニングの知識</summary><p>'+esc(KNOWLEDGE.summary)+'</p><p>'+esc(KNOWLEDGE.applicability)+'</p><a href="'+esc(KNOWLEDGE.url)+'" target="_blank" rel="noopener noreferrer">参考研究：'+esc(KNOWLEDGE.citation)+'</a></details></div><div class="cj-saved"><h3>自分の気づき</h3>'+insightsMarkup(insights,conditions)+'</div><p class="cj-disclaimer">2日間の差だけから原因や健康状態、走行能力の良し悪しは判定しません。</p>'+ (ui.notice?'<p class="cj-message" role="status">'+esc(ui.notice)+'</p>':'')+'</section>';
}
export function renderHomeConditionFollowup(intent,conditions,insights,warning='',notice=''){
 if(!intent&&!warning&&(!insights?.ok||!insights.entries.length))return '';
 const match=intent?evaluateLifeIntent(intent,conditions):null;
 const ready=intent?.status==='active'&&match?.status==='ready';
 const labelStatus=intent?.status==='paused'?'一時停止中':intent?.status==='reviewed'?'以前の確認':ready?'新しい記録と見比べられます':match?.status==='unavailable'?'基準記録を確認できません':'次の記録を待っています';
 let main='';
 if(ready){
  const p=match.packet;const a=p.entries[0],b=p.entries[1];
  main='<div class="cj-home-pair"><div><small>'+esc(a.date)+'</small><strong>'+esc(minuteText(a.minutes))+'</strong><span>'+esc(symbol(a.feeling).icon+' '+(a.feeling||'未入力'))+'</span></div><div><small>'+esc(b.date)+'</small><strong>'+esc(minuteText(b.minutes))+'</strong><span>'+esc(symbol(b.feeling).icon+' '+(b.feeling||'未入力'))+'</span></div></div><p class="cj-home-observation">'+esc(p.observation)+'</p><p class="cj-muted">調子やランニングへの影響の原因は、この比較だけでは分かりません。</p><div class="cj-write"><label for="cj-home-note">見比べて気づいたこと（任意）</label><textarea id="cj-home-note" data-cj-note maxlength="160" rows="2" placeholder="気づいたことを自分の言葉で残せます"></textarea><button type="button" data-cj-save-insight data-cj-origin="'+esc(b.date)+'">気づきを保存する</button></div>';
 }else if(intent){
  main='<p class="cj-muted">'+esc(match?.reason||'本人が選んだ確認事項です')+'</p><p class="cj-muted">基準：'+esc(intent.baseline.date)+'（'+esc(label(intent.baseline.method))+'）</p>';
 }
 const actions=intent?'<div class="cj-home-actions"><a href="#/history?life=1">記録を詳しく見る</a>'+(intent.status==='paused'?'<button type="button" data-interpret-resume>再開</button>':'<button type="button" data-interpret-pause>一時停止</button>')+'<button type="button" data-interpret-delete>確認事項を削除</button></div>':'<a href="#/history?life=1">コンディションの歩みを見る</a>';
 return '<section class="cj-panel cj-home-panel" aria-label="コンディションの次回確認"><div class="cj-title"><div><small>自分で選んだこと</small><h2>次に確認すること</h2></div></div>'+(intent?'<p class="cj-state">'+esc(labelStatus)+'</p>':'')+main+actions+ (insights?.ok&&insights.entries.length?'<div class="cj-saved"><h3>残してきた気づき</h3>'+insightsMarkup(insights,conditions,true)+'</div>':'')+(warning?'<p role="alert">'+esc(warning)+'</p>':'')+(notice?'<p role="status">'+esc(notice)+'</p>':'')+'</section>';
}
