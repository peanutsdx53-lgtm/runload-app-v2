/* RunLoad v2 — common record confirmation, presentation only.
 * Both manual and GPS-unavailable paths use this view; no false GPS values.
 * The authoritative record validation remains in recordDraftReview.js.
 */
import { checkRecordDraft } from './recordDraftReview.js';
import { courseSummary } from './recordExperience.js';
const present=x=>x!==null&&x!==undefined&&String(x).trim()!=='';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=k=>{const s={calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',course:'<path d="M3 20h18M4 16l5-10 5 7 5-3 2 8"/>',rof:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',gait:'<path d="M6 3c4-1 5 3 4 6L8 16c-1 3-5 4-6 1s2-10 4-14zm11 4c4-1 5 3 4 6l-2 6c-1 3-5 4-6 1s2-10 4-13z"/>',environment:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',body:'<circle cx="12" cy="4.5" r="2.2"/><path d="M8 10q4-3 8 0l2 6h-3l-1 6h-4l-1-6H6l2-6z"/>',distance:'<path d="m4 19 5-13 6 9 5-4v8H4z"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 3"/>',pace:'<circle cx="12" cy="13" r="8"/><path d="m12 13 4-4M10 2h4"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',alert:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/>'};return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${s[k]||s.alert}</svg>`};
export function secondsFromDraft(d){
 if(!['hours','minutes','seconds'].some(k=>present(d[k])))return null;
 let total=0;
 for(const [key,factor] of [['hours',3600],['minutes',60],['seconds',1]]){
  if(!present(d[key]))continue;
  const v=Number(d[key]);if(!Number.isFinite(v)||v<0)return null;
  total+=v*factor;
 }
 return total>0?Math.round(total):null;
}
export function durationLabel(d){const s=secondsFromDraft(d);if(s===null)return '—';const h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return (h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')}
export function paceLabel(d){const secs=secondsFromDraft(d),km=Number(d.distance);if(secs===null||!present(d.distance)||!Number.isFinite(km)||km<=0)return '—';const per=Math.round(secs/km);return `${Math.floor(per/60)}:${String(per%60).padStart(2,'0')}`}
export function reviewView(d={},opts={}){
 const isGps=opts.source==='gps',isRest=opts.recordType==='rest';
 // The GPS engine is not connected: unverified preview clocks/distances may not be shown as facts.
 const values=isGps?{date:'',distance:'',hours:'',minutes:'',seconds:'',courseName:'',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN',rofBefore:null,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN',temperatureC:'',environmentNote:'',bodyObservation:'',shoeName:'',memo:''}:d;
 const audit=checkRecordDraft(values,!isRest);
 const errors=[...audit.errors];
 if(!present(values.date))errors.unshift('日付が未取得です');
 if(!isRest&&(!present(values.distance)||Number(values.distance)<=0))errors.push('距離が未取得です');
 if(!isRest&&secondsFromDraft(values)===null)errors.push('時間が未取得です');
 const warnings=[...audit.warnings];
 const metrics=isRest?null:{km:present(values.distance)&&Number.isFinite(Number(values.distance))&&Number(values.distance)>=0?Number(values.distance).toFixed(2):'—',time:durationLabel(values),pace:paceLabel(values)};
 const course=courseSummary(values,opts.courseUi);
 const rof=Number.isInteger(values.rofBefore)||Number.isInteger(values.rofAfter);
 const bodyHas=present(values.bodyObservation)||present(values.shoeName)||present(values.memo)||(!isGps&&!!opts.bodySelected?.length);
 const links=[
  ['record-course','course','コース・走行条件',present(values.courseName)?values.courseName:`${course.slope}・${course.surface}`,present(values.courseName)||values.gradeMode==='FLAT'||values.gradeMode==='SUMMARY'||values.gradeMode==='SECTIONS'||values.surfaceMode==='SINGLE'||values.surfaceMode==='MIXED'],
  ['record-rof','rof','運動前後の疲労感',`運動前 ${Number.isInteger(values.rofBefore)?values.rofBefore:'—'} ／ 運動後 ${Number.isInteger(values.rofAfter)?values.rofAfter:'—'}`,rof],
  ['record-compare','gait','歩数・走り方',present(values.steps)?`${values.steps}歩 ・ ${({DEVICE_MEASURED:'端末で計測',ESTIMATED:'推定・手入力',UNKNOWN:'出所不明'})[values.stepsProvenance]||'出所不明'}`:(values.runningFormat==='RUN_WALK'?'走歩混在（歩数未入力）':values.runningFormat==='CONTINUOUS_RUN'?'連続走行（歩数未入力）':'未入力'),present(values.steps)||['CONTINUOUS_RUN','RUN_WALK'].includes(values.runningFormat)],
  ['record-environment','environment','環境',present(values.temperatureC)?`気温 ${values.temperatureC}℃`:(present(values.environmentNote)?'環境メモあり':'未入力'),present(values.temperatureC)||present(values.environmentNote)],
  ['record-reflection','body','身体・使用品・メモ',[present(values.bodyObservation)?values.bodyObservation:'',present(values.shoeName)?`シューズ：${values.shoeName}`:'',present(values.memo)?'メモあり':'',(!isGps&&opts.bodySelected?.length)?`気になった部位 ${opts.bodySelected.length}件`:'' ].filter(Boolean).join('・')||'未入力',bodyHas]
 ];
 const visible=isRest?links.slice(3):links;
 const count=visible.filter(x=>x[4]).length;
 const date=present(values.date)?String(values.date).replaceAll('-','/'): '—';
 const src=isGps?'GPSでの記録はまだ利用できません':'手入力';
 const status=`${errors.length?`<div class="rr-alert-header">${icon('alert')}<h2>確認が必要な項目があります</h2></div><p>未取得の項目は0として扱いません。内容を確認してください。</p><ul class="rr-notes">${[...new Set(errors)].map(x=>`<li>${escape(x)}</li>`).join('')}</ul>`:`<div class="rr-alert-header">${icon('rof')}<h2>入力内容を確認しました</h2></div><p>入力内容の基本的な形式を確認しました。保存する際にも確認します。身体の部位別の参考値は計算していません。</p>`}${warnings.length?`<div class="rr-secondary-notes">${warnings.map(x=>`<p>${escape(x)}</p>`).join('')}</div>`:''}`;
 return `<div class="rr-page" data-record-review data-review-source="${isGps?'gps':'manual'}">
 <div class="rr-main-wrap"><div class="rr-content">
  <header class="rr-heading"><div class="rr-heading-left"><a href="${isGps?'#/measurement':'#/record'}" class="rr-back" aria-label="元の記録画面へ戻る">‹</a><div><h1>記録内容の確認</h1><p>今回の内容を確かめ、必要な項目を編集</p></div></div><span class="rr-top-tag"><b></b>保存前の下書き</span></header>
  <div class="rr-grid"><div class="rr-column"><section class="rr-panel rr-hero" aria-label="基本情報">
  <div class="rr-panel-label"><span class="rr-label-left"><span class="rr-label-icon">${icon('calendar')}</span><h2>基本情報</h2></span><span class="rr-origin">${escape(src)}</span></div>
  <div class="rr-date-line"><div><div class="rr-date-main">${escape(date)}</div><div class="rr-date-sub">${isGps?'実際のGPS測定データは取得されていません':isRest?'休養日の記録':'入力した日付・距離・時間を確認'}</div></div><a class="rr-date-edit" href="#/record">${isGps?'手入力で補足 ↗':'編集 ↗'}</a></div>
  ${metrics?`<div class="rr-metrics"><div class="rr-metric"><div class="rr-metric-head">${icon('distance')}距離</div><div><strong class="${metrics.km==='—'?'rr-miss':''}">${escape(metrics.km)}</strong>${metrics.km!=='—'?'<em>km</em>':''}</div></div><div class="rr-metric"><div class="rr-metric-head">${icon('clock')}時間</div><div><strong class="${metrics.time==='—'?'rr-miss':''}">${escape(metrics.time)}</strong></div></div><div class="rr-metric pace"><span class="rr-metric-head">${icon('pace')}平均ペース</span><div><strong class="${metrics.pace==='—'?'rr-miss':''}">${escape(metrics.pace)}</strong>${metrics.pace!=='—'?'<em>/km</em>':''}</div></div></div><p class="rr-metric-caption">平均ペースは距離と時間から計算しています。</p>`:`<p class="rr-rest-hint">休養日の記録では距離・時間・ペースを表示しません。</p>`}
  </section><section class="rr-panel rr-alert ${errors.length?'is-warning':''}" role="status">${status}</section></div>
  <section class="rr-panel rr-summary" aria-label="追加情報の確認"><div class="rr-summary-head"><h2>詳細情報</h2><small>${count} / ${visible.length} 項目に入力あり</small></div>${visible.map(([route,ic,name,description,has])=>`<a href="#/${route}" class="rr-row" data-review-link="${route}"><span class="rr-row-icon">${icon(ic)}</span><span class="rr-row-body"><span class="rr-row-title">${escape(name)}</span><small class="rr-row-desc">${escape(description)}</small></span><span class="rr-row-state ${has?'is-filled':''}">${has?'入力あり':'未入力'}</span><span class="rr-chevron">›</span></a>`).join('')}</section></div>
  <footer class="rr-foot"><div class="rr-foot-msg"><span class="lock">${icon('lock')}</span><div><strong>${isGps?'GPSでの記録はまだ保存できません':isRest?'休養日の記録はまだ保存できません':'手入力した走行を端末内に保存'}</strong><br>${isGps||isRest?'この種類の記録は保存できません。':'端末内に保存した走行記録は履歴・結果で見られます。身体の部位別の参考値は計算せず、外部への送信も行いません。'}</div></div><div class="rr-foot-actions"><button type="button" class="rr-save" data-manual-run-save ${errors.length||isGps||isRest?'disabled':''}>走行記録を保存する</button></div></footer>${opts.saveNotice?'<p role="status" class="rr-save-notice">'+escape(opts.saveNotice)+'</p>':''}
 </div></div></div>`;
}
