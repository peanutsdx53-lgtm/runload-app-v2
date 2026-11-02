/* RunLoad v2 — common record confirmation, presentation only.
 * Both manual and GPS-unavailable paths use this view; no false GPS values.
 * The authoritative record validation remains in recordDraftReview.js.
 */
import { checkRecordDraft,checkManualRequiredFields } from './recordDraftReview.js';
import { courseSummary } from './recordExperience.js';
import {recordIcon as icon} from './recordIcons.js?v=20261101-review-density-v1';
const present=x=>x!==null&&x!==undefined&&String(x).trim()!=='';
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 const required=!isGps&&!isRest?checkManualRequiredFields(values):null;
 const errors=[...audit.errors,...(required?.errors||[])];
 if(!present(values.date))errors.unshift('日付が未取得です');
 if(!isRest&&(!present(values.distance)||Number(values.distance)<=0))errors.push('距離が未取得です');
 if(!isRest&&secondsFromDraft(values)===null)errors.push('時間が未取得です');
 const warnings=[...audit.warnings];
 const metrics=isRest?null:{km:present(values.distance)&&Number.isFinite(Number(values.distance))&&Number(values.distance)>=0?Number(values.distance).toFixed(2):'—',time:durationLabel(values),pace:paceLabel(values)};
 const course=courseSummary(values,opts.courseUi);
 const rof=Number.isInteger(values.rofBefore)||Number.isInteger(values.rofAfter);
 const compactReviewText=(v,max=60)=>{
  const letters=Array.from(String(v??'').trim());
  return letters.length>max?letters.slice(0,max).join('')+'…（全文は編集画面で確認）':letters.join('');
 };
 const environmentReported=String(values.environmentNote??'').split(/\r?\n/).find(line=>line.startsWith('【本人申告の環境選択】'))||'';
 const environmentPreview=[
  present(values.temperatureC)?'気温 '+values.temperatureC+'℃':'',
  environmentReported?'本人申告：'+compactReviewText(environmentReported.replace('【本人申告の環境選択】',''),45):present(values.environmentNote)?'環境メモあり':''
 ].filter(Boolean).join('・')||'未入力';
 const bodyHas=present(values.bodyObservation)||present(values.shoeName)||present(values.memo)||(!isGps&&!!opts.bodySelected?.length);
 const links=[
  ['record-course','course','コース・走行条件',present(values.courseName)?values.courseName:`${course.slope}・${course.surface}`,present(values.courseName)||values.gradeMode==='FLAT'||values.gradeMode==='SUMMARY'||values.gradeMode==='SECTIONS'||values.surfaceMode==='SINGLE'||values.surfaceMode==='MIXED'],
  ['record-rof','rof','運動前後の疲労感',`運動前 ${Number.isInteger(values.rofBefore)?values.rofBefore:'—'} ／ 運動後 ${Number.isInteger(values.rofAfter)?values.rofAfter:'—'}`,rof],
  ['record-compare','gait','歩数・走り方',present(values.steps)?`${values.steps}歩 ・ ${({DEVICE_MEASURED:'端末で計測',ESTIMATED:'推定・手入力',UNKNOWN:'出所不明'})[values.stepsProvenance]||'出所不明'}`:(values.runningFormat==='RUN_WALK'?'走歩混在（歩数未入力）':values.runningFormat==='CONTINUOUS_RUN'?'連続走行（歩数未入力）':'未入力'),present(values.steps)||['CONTINUOUS_RUN','RUN_WALK'].includes(values.runningFormat)],
  ['record-environment','environment','環境',environmentPreview,present(values.temperatureC)||present(values.environmentNote)],
  ['record-reflection','body','身体・使用品・メモ',[present(values.bodyObservation)?compactReviewText(values.bodyObservation):'',present(values.shoeName)?`シューズ：${compactReviewText(values.shoeName,45)}`:'',present(values.memo)?'メモあり':'',(!isGps&&opts.bodySelected?.length)?`気になった部位 ${opts.bodySelected.length}件`:'' ].filter(Boolean).join('・')||'未入力',bodyHas]
 ];
 const visible=isRest?links.slice(3):links;
 const count=visible.filter(x=>x[4]).length;
 const date=present(values.date)?String(values.date).replaceAll('-','/'): '—';
 const src=isGps?'GPSでの記録はまだ利用できません':'手入力';
 const unknownActivity=!isGps&&!isRest&&!['RUNNING','JOGGING','WALK'].includes(values.activityGait);
 const activityPrompt=unknownActivity?`<section class="rr-gait-warning" role="group" aria-label="保存前に活動種別を設定"><strong>活動種目の選択が必要です</strong><p>保存する走行の活動種目を選んでください。</p><div class="rr-gait-options">${[['RUNNING','ランニング'],['JOGGING','ジョギング'],['WALK','ウォーキング']].map(([k,name])=>`<button type="button" data-review-gait="${k}">${name}</button>`).join('')}</div><small>活動種目が未選択の場合は保存できません。走歩混在・速度条件外では参考値を算出しません。</small></section>`:'';
 const displayErrors=[...new Set(errors)].filter(message=>
  !(message==='距離が未取得です'&&errors.includes('距離を入力してください（必須）'))&&
  !(message==='時間が未取得です'&&errors.includes('時間を入力してください（必須）')));
 const status=errors.length?`<div class="rr-alert-header">${icon('alert')}<h2>保存前に入力が必要な項目があります</h2></div><ul class="rr-notes">${displayErrors.map(x=>`<li>${escape(x)}</li>`).join('')}</ul>${warnings.length?`<div class="rr-secondary-notes">${warnings.map(x=>`<p>${escape(x)}</p>`).join('')}</div>`:''}`:warnings.length?`<div class="rr-alert-header">${icon('alert')}<h2>確認事項</h2></div><div class="rr-secondary-notes">${warnings.map(x=>`<p>${escape(x)}</p>`).join('')}</div>`:'';
 return `<div class="rr-page" data-record-review data-review-source="${isGps?'gps':'manual'}">
 <div class="rr-main-wrap"><div class="rr-content">
  <header class="rr-heading"><div class="rr-heading-left"><a href="${isGps?'#/measurement':'#/record'}" class="rr-back" aria-label="元の記録画面へ戻る">‹</a><div><h1>記録内容の確認</h1></div></div><span class="rr-top-tag"><b></b>保存前の下書き</span></header>
  <div class="rr-grid"><div class="rr-column"><section class="rr-panel rr-hero" aria-label="基本情報">
  <div class="rr-panel-label"><span class="rr-label-left"><span class="rr-label-icon">${icon('calendar')}</span><h2>基本情報</h2></span><span class="rr-origin">${escape(src)}</span></div>
  <div class="rr-date-line"><div><div class="rr-date-main">${escape(date)}</div>${isGps||isRest?`<div class="rr-date-sub">${isGps?'実際のGPS測定データは取得されていません':'休養日の記録'}</div>`:''}</div><a class="rr-date-edit" href="#/record">${isGps?'手入力で補足 ↗':'編集 ↗'}</a></div>
  ${required?`<div class="rr-required-status" role="status" aria-label="保存の必須項目">${[['distance','距離'],['time','時間'],['activity','活動種目']].map(([key,title])=>`<span data-required-status="${key}" data-required-ok="${required.fields[key]}" aria-label="${title}：${required.fields[key]?'入力済み':'要入力'}"><b>${title}</b><em>${required.fields[key]?'入力済み':'要入力'}</em></span>`).join('')}</div>`:''}
  ${metrics?`<div class="rr-metrics"><div class="rr-metric"><div class="rr-metric-head">${icon('distance')}距離</div><div><strong class="${metrics.km==='—'?'rr-miss':''}">${escape(metrics.km)}</strong>${metrics.km!=='—'?'<em>km</em>':''}</div></div><div class="rr-metric"><div class="rr-metric-head">${icon('clock')}時間</div><div><strong class="${metrics.time==='—'?'rr-miss':''}">${escape(metrics.time)}</strong></div></div><div class="rr-metric pace"><span class="rr-metric-head">${icon('pace')}平均ペース</span><div><strong class="${metrics.pace==='—'?'rr-miss':''}">${escape(metrics.pace)}</strong>${metrics.pace!=='—'?'<em>/km</em>':''}</div></div></div><p class="rr-metric-caption">平均ペースは距離と時間から計算しています。</p>`:`<p class="rr-rest-hint">休養日の記録では距離・時間・ペースを表示しません。</p>`}
  </section>${activityPrompt}${status?`<section id="${errors.length?'rr-review-validation':'rr-review-notice'}" class="rr-panel rr-alert ${errors.length?'is-warning':''}" role="${errors.length?'alert':'status'}">${status}</section>`:''}</div>
  <section class="rr-panel rr-summary" aria-label="追加情報の確認"><div class="rr-summary-head"><h2>詳細情報</h2><small>${count} / ${visible.length} 項目に入力あり</small></div>${visible.map(([route,ic,name,description,has])=>`<a href="#/${route}" class="rr-row" data-review-link="${route}"><span class="rr-row-icon">${icon(ic)}</span><span class="rr-row-body"><span class="rr-row-title">${escape(name)}</span><small class="rr-row-desc">${escape(description)}</small></span><span class="rr-row-state ${has?'is-filled':''}">${has?'入力あり':'未入力'}</span><span class="rr-chevron">›</span></a>`).join('')}</section></div>
  <footer class="rr-foot"><div class="rr-foot-msg"><span class="lock">${icon('lock')}</span><div><strong>${isGps?'GPSでの記録はまだ保存できません':isRest?'休養日の記録を端末内に保存':'手入力した走行を端末内に保存'}</strong><br>${isGps?'この種類の記録は保存できません。':isRest?'本人が入力した日付と任意メモだけを休養日として履歴に保存します。走行の結果画面は表示しません。':'端末内に保存し、履歴・結果で確認できます。外部へ送信しません。'}</div></div><div class="rr-foot-actions"><button type="button" class="rr-save" ${isRest?'data-rest-day-save':'data-manual-run-save'} ${errors.length?'aria-describedby="rr-review-validation" ':''}${errors.length||isGps?'disabled':''}>${isRest?'休養日を保存する':'走行記録を保存する'}</button></div></footer>${opts.saveNotice?'<p role="status" class="rr-save-notice">'+escape(opts.saveNotice)+'</p>':''}
 </div></div></div>`;
}
