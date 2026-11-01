// RunLoad v2: presentation/interaction helpers for approved record v2 screens.
// Not a replacement for the authoritative v1 record/scientific storage contract.
import {checkManualRequiredFields} from './recordDraftReview.js';
import {recordIcon} from './recordIcons.js?v=20261101-review-density-v1';
export const SURFACES = Object.freeze([
 ['paved','舗装路'],['track','陸上トラック'],['treadmill','トレッドミル'],
 ['soil','締まった土道'],['trail','不整地トレイル'],['naturalGrass','天然芝'],
 ['artificialTurf','人工芝'],['sand','砂地']
]);
export const DIRECTIONS = Object.freeze([['FLAT','平坦'],['UPHILL','上り'],['DOWNHILL','下り']]);
const names=Object.fromEntries(SURFACES);
const escape = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const filled = v=>v!==undefined&&v!==null&&String(v).trim()!=='';
const value = (x,unit='')=>filled(x)?escape(x)+unit:'—';
const choose=(items,current)=>items.map(([id,label])=>`<option value="${escape(id)}" ${current===id?'selected':''}>${escape(label)}</option>`).join('');
const optionGroup=(attr,choices,selected)=>`<div class="rv-choice-row ${choices.length===4?'rv-four':''}">${choices.map(([key,label])=>`<button type="button" ${attr}="${escape(key)}" aria-pressed="${selected===key}" class="rv-choice ${selected===key?'is-selected':''}">${escape(label)}</button>`).join('')}</div>`;
export function derivedFlat(d){
 if(!filled(d.upPercent)||!filled(d.downPercent))return null;
 const up=Number(d.upPercent),down=Number(d.downPercent);
 if(!Number.isFinite(up)||!Number.isFinite(down)||up<0||down<0||up+down>100)return null;
 return Math.round((100-up-down)*100)/100;
}
export function courseSummary(d,ui){
 const slope=d.gradeMode==='SUMMARY'?(derivedFlat(d)===null?'割合未入力':`上り ${d.upPercent}%・下り ${d.downPercent}%・平坦 ${derivedFlat(d)}%`):
 d.gradeMode==='FLAT'?'ほぼ平坦':d.gradeMode==='SECTIONS'?'区間で設定':'坂道は未設定';
 const surface=d.surfaceMode==='SINGLE'?(names[d.primarySurface]||'路面未選択'):
 d.surfaceMode==='MIXED'?(SURFACES.filter(([k])=>(ui?.surfaceSelected||[]).includes(k)&&filled(d['surface'+k])&&Number(d['surface'+k])>0).map(([k])=>names[k]).join('・')||'割合未入力'):'路面は未設定';
 return {slope,surface,courseName:filled(d.courseName)?String(d.courseName):'コース未設定'};
}
export function manualPage(state){
 const d=state.recordDraft,run=state.recordType==='run',s=courseSummary(d,state.recordCourseUi),required=checkManualRequiredFields(d);
 const requiredMessage=run?(required.ok?'<span class="rv-required-all-done">必須3項目が入力済みです</span>':'<span class="rv-required-pending">未入力・要確認：'+[['distance','距離'],['time','時間'],['activity','活動種目']].filter(([k])=>!required.fields[k]).map(([,n])=>n).join('・')+'</span>'):'';
 const date=escape(d.date);
 const time=filled(d.minutes)?Number(d.minutes):null;
 const pace=run&&filled(d.distance)&&Number(d.distance)>0&&Number.isFinite(time)&&time>0
 ? (()=>{const m=time/Number(d.distance);if(!Number.isFinite(m))return '—';const sec=Math.round(m*60);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} /km`;})():'';
 const access=[
  ['#/record-course','course','コース・走行条件',`${s.courseName} ・ ${s.slope}`],
  ['#/record-rof','rof','運動前後の疲労感',`${Number.isInteger(d.rofBefore)?'運動前 '+d.rofBefore:'運動前 未入力'} / ${Number.isInteger(d.rofAfter)?'運動後 '+d.rofAfter:'運動後 未入力'}`],
  ['#/record-compare','gait','歩数・走り方',filled(d.steps)?`歩数 ${escape(d.steps)} ・ 詳細を確認`:'未入力'],
  ['#/record-environment','environment','環境',filled(d.temperatureC)?`気温 ${escape(d.temperatureC)}℃`:filled(d.environmentNote)?'環境メモあり':'未入力'],
  ['#/record-reflection','body','身体・使用品・メモ',filled(d.bodyObservation)||filled(d.shoeName)||filled(d.memo)?'入力あり':'未入力']
 ];
 return `<div class="record-v3 rv-manual"><header class="rv-head"><a href="#/record-start" class="rv-back rv-phone-only" aria-label="記録方法の選択へ戻る">‹</a><div><h1>手入力で記録</h1></div></header>
 <div class="rv-manual-grid"><section class="rv-panel rv-primary"><h2 class="rv-section-title">基本情報 <small class="rv-required-heading">必須</small></h2>${run?`<p class="rv-required-progress" role="status">${requiredMessage}</p>`:''}
 ${optionGroup('data-record-type',[['run','走行'],['rest','休養']],state.recordType)}
 <label class="rv-field rv-date"><span>日付</span><span class="rl-date-control"><span class="rl-date-value" data-date-display aria-hidden="true">${date.replaceAll("-", "/")}</span><svg class="rl-date-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg><input aria-label="記録日" data-draft="date" type="date" value="${date}"></span></label>
 ${run?`<div class="rv-numbers"><label class="rv-field" data-required-field="distance" data-required-ok="${required.fields.distance}"><span>距離</span><div class="rv-unit-input"><input data-draft="distance" aria-label="距離（km）" aria-required="true" aria-invalid="${!required.fields.distance}" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" placeholder="0.00" value="${escape(d.distance)}"><em>km</em></div></label>
 <label class="rv-field" data-required-field="time" data-required-ok="${required.fields.time}"><span>時間</span><div class="rv-unit-input"><input data-draft="minutes" aria-label="時間（分）" aria-required="true" aria-invalid="${!required.fields.time}" type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" placeholder="0.0" value="${escape(d.minutes)}"><em>分</em></div></label></div>${pace?`<p class="rv-derived">平均ペース　<strong>${pace}</strong> <small>入力値から算出</small></p>`:''}
 <div class="rv-gait-entry" role="group" aria-label="必須：記録の活動種目" data-required-field="activity" data-required-ok="${required.fields.activity}">
  <div class="rv-gait-entry-title"><strong>活動種目</strong><small>走行に合った種目を選択してください</small></div>
  <div class="rv-gait-options">${[['RUNNING','ランニング'],['JOGGING','ジョギング'],['WALK','ウォーキング']].map(([key,label])=>`<button type="button" data-manual-gait="${key}" aria-pressed="${d.activityGait===key}">${label}</button>`).join('')}</div>

 </div>`:
 '<p class="rv-muted">休養日は距離・時間を入力しません。必要に応じてメモを追加できます。</p>'}
 </section><section class="rv-panel rv-secondary"><h2 class="rv-section-title">追加情報 <small>任意</small></h2>
 <div class="rv-links">${(run?access:access.slice(3)).map(([url,icon,label,sub])=>`<a href="${url}" class="rv-link"><span class="rv-link-icon">${recordIcon(icon)}</span><span class="rv-link-content"><strong>${label}</strong><small>${sub}</small></span><span class="rv-chevron">›</span></a>`).join('')}</div></section></div>
 <div class="rv-bottom-actions"><button type="button" class="rv-main-button" data-demo-save>入力内容を確認</button><p class="rv-muted">${run?'手入力した走行は確認後に端末へ保存できます。身体の部位別の文献参考値は、保存後に活動種別と速度の適用範囲が確認できる場合に表示します。':'休養日は日付と任意の本人メモを保存し、履歴から見返せます。休養日の走行結果や身体部位別文献参考値は表示しません。'}</p></div></div>`;
}
export function recordMethodPage(isGpsPhone=true){return `<div class="record-v3 rv-method"><header class="rv-head"><h1>記録</h1></header>
 <h2 class="rv-method-caption">記録方法を選択</h2><div class="rv-method-cards">
 ${isGpsPhone?`<a class="rv-method-card rv-method-gps" href="#/measurement"><span class="rv-method-mark">⌖</span><span><strong>GPSで測定</strong><small>スマートフォンで位置情報を測定</small></span><span class="rv-chevron">›</span></a>`:`<div class="rv-method-card rv-method-gps is-unavailable" aria-disabled="true"><span class="rv-method-mark">⌖</span><span><strong>GPSで測定</strong><small>スマートフォン専用・PCでは使用できません</small></span><span class="rv-method-unavailable">対象外</span></div>`}
 <a class="rv-method-card rv-method-manual" href="#/record"><span class="rv-method-mark">✎</span><span><strong>手入力で記録</strong><small>走行距離・時間などを入力</small></span><span class="rv-chevron">›</span></a>
 </div></div>`;}
function courseValue(d,key){return escape(d[key]);}
function slopeSection(d,ui){
 const mode=d.gradeMode||'UNKNOWN',flat=derivedFlat(d),has=mode==='SUMMARY',up=filled(d.upPercent)?d.upPercent:null,down=filled(d.downPercent)?d.downPercent:null;
 const tile=(key,name,v)=>`<button type="button" data-rv-slope-tile="${key}" class="rv-slope-tile ${ui.slope===key&&key!=='flat'?'is-selected':''}" aria-pressed="${ui.slope===key&&key!=='flat'}" ${key==='flat'?'disabled':''}><span>${name} <b>${v===null?'—':escape(v)+'%'}</b></span><i class="rv-slope-${key}"></i></button>`;
 const active=ui.slope==='down'?'down':'up',chosen=active==='up'?up:down,other=active==='up'?down:up,maximum=other===null?100:100-Number(other);
 return `<section class="rv-panel"><h2 class="rv-section-title">坂道の構成</h2>
 ${optionGroup('data-rv-grade',[['UNKNOWN','不明'],['FLAT','平坦'],['SUMMARY','割合'],['SECTIONS','区間']],mode)}
 ${has?`<div class="rv-slopes">${tile('up','上り',up)}${tile('down','下り',down)}${tile('flat','平坦',flat)}</div>
 <div class="rv-mix"><span class="rv-mix-up" style="width:${up===null?0:Number(up)}%"></span><span class="rv-mix-down" style="width:${down===null?0:Number(down)}%"></span><span class="rv-mix-flat" style="flex:1"></span></div>
 <div class="rv-fine"><div class="rv-fine-top"><strong>${active==='up'?'上り':'下り'}を調整</strong><label>割合 <input type="number" aria-label="${active==='up'?'上り':'下り'}の割合を直接入力" data-rv-slope-number min="0" max="${maximum}" step="1" value="${chosen===null?'':escape(chosen)}" placeholder="未入力"> %</label></div>
 <div class="rv-fine-control"><button type="button" data-rv-step="-1" aria-label="1%減らす">−</button><input data-rv-slope-range type="range" min="0" max="${maximum}" step="1" value="${chosen===null?0:escape(chosen)}" aria-label="割合をスライダーで調整"><button type="button" data-rv-step="1" aria-label="1%増やす">＋</button></div></div><p class="rv-hint">上り・下りの両方を入力すると、平坦は自動で計算されます。</p>`:
 mode==='SECTIONS'?segmentSection(d,ui):`<p class="rv-hint">${mode==='FLAT'?'ほぼ平坦として記録します。':'分からない場合は不明のままで構いません。'}</p>`}
 </section>`;
}
function segmentSection(d,ui){
 const count=ui.sections;
 const shares=Array.from({length:count},(_,i)=>d['sectionShare'+i]);
 const entered=shares.filter(filled);
 const values=entered.map(Number);
 const invalid=values.some(n=>!Number.isFinite(n)||n<0||n>100);
 const total=invalid?null:Math.round(values.reduce((sum,n)=>sum+n,0)*10)/10;
 const complete=count>0&&entered.length===count&&!invalid&&Math.abs(total-100)<=.01;
 const progress=count===0?'区間を追加してください。':invalid?'区間割合に範囲外の値があります。':`区間割合 ${entered.length} / ${count} 件入力・入力分の合計 ${total}%${complete?'（100%）':''}`;
 return `<div class="rv-section-rows"><p class="rv-hint">最大5区間。各区間の割合・方向・傾斜・路面を設定します。</p><p class="rv-section-progress ${complete?'is-complete':''}" data-rv-section-progress role="status">${progress}</p>
 ${Array.from({length:count},(_,i)=>`<div class="rv-section-row"><div class="rv-section-row-head"><strong>区間 ${i+1} <small>${filled(d['sectionShare'+i])?'割合 '+escape(d['sectionShare'+i])+'%':'割合 未入力'}</small></strong><button type="button" data-rv-remove="${i}" aria-label="区間 ${i+1} を削除">削除</button></div>
 <div class="rv-section-fields"><label>割合 (%)<input type="number" inputmode="decimal" min="0" max="100" step="0.1" data-draft="sectionShare${i}" value="${courseValue(d,'sectionShare'+i)}"></label>
 <label>坂道<select data-draft="sectionDirection${i}">${choose(DIRECTIONS,d['sectionDirection'+i])}</select></label>
 <label>傾斜 (%)<input data-draft="sectionGrade${i}" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${courseValue(d,'sectionGrade'+i)}"></label>
 <label>路面<select data-draft="sectionSurface${i}">${choose([['UNKNOWN','不明'],...SURFACES],d['sectionSurface'+i])}</select></label></div></div>`).join('')}
 <button type="button" class="rv-add" data-rv-add ${count>=5?'disabled':''}>＋ 区間を追加（${count} / 5）</button><p class="rv-hint">区間割合は全区間で合計100%にしてください。空欄を0とはみなしません。</p></div>`;
}

export function surfaceShareState(d,ui){
 const selected=ui.surfaceSelected||[];
 const active=selected.includes(ui.surfaceFocus)?ui.surfaceFocus:selected[0]||null;
 const share=k=>{const v=d['surface'+k];return filled(v)&&Number.isFinite(Number(v))?Number(v):null;};
 const total=selected.reduce((n,k)=>n+(share(k)??0),0);
 const others=selected.filter(k=>k!==active).reduce((n,k)=>n+(share(k)??0),0);
 const max=Math.max(0,Math.min(100,100-others));
 const valid=selected.length>=2&&selected.every(k=>share(k)!==null&&share(k)>0&&share(k)<=100)&&Math.abs(total-100)<.001;
 return {selected,active,share,total,max,valid};
}
function surfaceSection(d,ui){
 const mode=d.surfaceMode||'UNKNOWN';
 const selected=mode==='SINGLE'?(d.primarySurface?[d.primarySurface]:[]):ui.surfaceSelected;
 const state=surfaceShareState(d,ui),active=state.active,chosen=active?state.share(active):null;
 const tiles=mode==='UNKNOWN'?'<p class="rv-hint">不明のままにしても問題ありません。</p>':
 `<div class="rv-surfaces">${SURFACES.map(([k,label])=>`<button type="button" data-rv-surface="${k}" aria-pressed="${selected.includes(k)}" class="rv-surface-tile ${selected.includes(k)?'is-selected':''}"><span>${label}</span>${mode==='MIXED'&&selected.includes(k)?`<b data-rv-surface-tile-value="${k}">${state.share(k)===null?'—':escape(state.share(k))+'%'}</b>`:`<span aria-hidden="true">${selected.includes(k)?'●':'○'}</span>`}</button>`).join('')}</div>`;
 const mix=mode==='MIXED'&&selected.length?`<div class="rv-surface-head"><h3>路面の割合</h3><strong class="${state.valid?'rv-ok':'rv-invalid'}" data-rv-surface-total>合計 ${state.total}% / 100%</strong></div>
 <div class="rv-surface-mix" role="img" aria-label="入力済み路面割合">${state.selected.map((k,i)=>`<span class="rv-surface-mix-part" data-rv-surface-bar="${k}" style="width:${Math.max(0,Math.min(100,state.share(k)??0))}%;--surface-color:var(--surface-color-${i%4})"></span>`).join('')}</div>
 <div class="rv-surface-pick" role="group" aria-label="割合を調整する路面を選択">${selected.map(k=>`<button type="button" data-rv-surface-focus="${k}" aria-pressed="${active===k}">${names[k]} <b data-rv-surface-pick-value="${k}">${state.share(k)===null?'—':escape(state.share(k))+'%'}</b></button>`).join('')}</div>
 <div class="rv-fine rv-surface-fine"><div class="rv-fine-top"><strong>${names[active]}を調整</strong><label>割合 <input type="number" aria-label="${names[active]}の割合を直接入力" data-rv-surface-value="${active}" min="0" max="${state.max}" step="1" value="${chosen===null?'':escape(chosen)}" placeholder="未入力"> %</label></div>
 <div class="rv-fine-control"><button type="button" data-rv-surface-step="-1" aria-label="割合を1%減らす">−</button><input data-rv-surface-range="${active}" type="range" min="0" max="${state.max}" step="1" value="${chosen===null?0:escape(chosen)}" aria-label="${names[active]}の割合をスライダーで調整"><button type="button" data-rv-surface-step="1" aria-label="割合を1%増やす">＋</button></div></div>
 <p class="rv-hint ${state.valid?'rv-ok':'rv-invalid'}" data-rv-surface-warning>${state.valid?'割合の合計は100%です。':'選択した路面の割合を合計100%にしてください。'}</p>`:'';
 return `<section class="rv-panel"><h2 class="rv-section-title">路面の種類</h2>${optionGroup('data-rv-surface-mode',[['UNKNOWN','不明'],['SINGLE','1種類'],['MIXED','複数・割合']],mode)}${tiles}${mix}</section>`;
}
export function coursePage(state,ui,library={ok:true,records:[]},fromHome=false){
 const d=state.recordDraft,s=courseSummary(d,ui),summary=state.recordCourseUi?.notice||'';
 const selected=ui.selectedPresetId||'',pending=ui.pendingDelete||'',records=library.ok?library.records:[];
 const selectedPreset=selected&&library.ok?records.find(p=>p.id===selected):null;
 const listing=library.ok?records.slice().reverse().map(p=>`<article class="rv-preset-item" data-course-row="${escape(p.id)}"><div><strong>${escape(p.data.courseName)}</strong><small>${escape(courseSummary(p.data,initialCourseUi(p.data)).slope)} / ${escape(courseSummary(p.data,initialCourseUi(p.data)).surface)}</small></div><div class="rv-preset-actions"><button type="button" data-course-use="${escape(p.id)}">使う</button><button type="button" data-course-delete="${escape(p.id)}">削除</button></div>${pending===p.id?`<div class="rv-course-confirm" role="group" aria-label="コース削除の確認"><p>「${escape(p.data.courseName)}」を削除しますか？保存済みの走行記録は変わりません。</p><button type="button" data-course-confirm-delete="${escape(p.id)}">削除を確定</button><button type="button" data-course-cancel-delete>キャンセル</button></div>`:''}</article>`).join(''):'<p class="rv-error" role="alert">'+escape(library.reason)+'</p>';
 const quickSave=selectedPreset?`<div class="rv-inline-preset-tools" role="group" aria-label="選択中の保存コース"><div class="rv-inline-preset-status"><strong>選択中の保存コース</strong><span>「${escape(selectedPreset.data.courseName)}」</span></div><div class="rv-course-save-actions"><button type="button" data-course-save>保存コースを更新</button><button type="button" data-course-save-new>別名で保存</button></div></div>`:'';
 const saveHelp='保存すると、次回の入力で呼び出せます。';
 return `<div class="record-v3 rv-course rv-proposed-desk">
 <header class="rv-head"><a href="${fromHome?'#/home':'#/record'}" class="rv-back" aria-label="${fromHome?'ホーム':'手入力'}へ戻る">‹</a><div><h1>コース・走行条件</h1><p class="rv-flow-intro">必要な条件だけ設定して、今回の記録に使えます。</p></div></header>
 <div class="rv-flow-rail" aria-label="操作の順番"><span><b>01</b> コースを選ぶ<small>保存済み・新規作成</small></span><span><b>02</b> 条件を整える<small>坂道・路面</small></span><span><b>03</b> ${selectedPreset?'内容を確認':'使い方を選ぶ'}<small>今回の記録${selectedPreset?'':'・保存コース'}</small></span></div>
 <div class="rv-course-grid rv-course-flow">
 <section class="rv-panel rv-course-setup rv-course-step" aria-label="コースの選択と名前"><div class="rv-section-title rv-block-heading"><span class="rv-step-index">01</span><h2>今回のコース</h2><small>保存済み ${records.length}件</small></div>
 <div class="rv-course-select-strip"><div class="rv-block-label"><strong>保存コースから選ぶ</strong></div>${records.length?`<div class="rv-preset-list">${listing}</div>`:library.ok?'<div class="rv-empty-mini">保存したコースはありません。</div>':listing}</div>
 <div class="rv-course-name-inline"><label class="rv-field"><span>コース名 <small>保存時のみ必須</small></span><input type="text" maxlength="80" data-draft="courseName" value="${courseValue(d,'courseName')}" placeholder="例：川沿い往復"></label></div>
 ${quickSave}
 </section>
 <section class="rv-panel rv-course-conditions rv-course-step" aria-label="坂道と路面の条件"><div class="rv-section-title rv-block-heading"><span class="rv-step-index">02</span><h2>走行条件</h2><small>わからない項目は「不明」でOK</small></div><div class="rv-condition-pair">${slopeSection(d,ui).replace('class="rv-panel"','class="rv-panel rv-step-slope"')}${surfaceSection(d,ui).replace('class="rv-panel"','class="rv-panel rv-step-surface"')}</div></section>
 <section class="rv-panel rv-course-summary rv-course-step"><div class="rv-section-title rv-block-heading"><span class="rv-step-index">03</span><h2>設定内容の確認</h2><small>${selectedPreset?'今回の記録に反映':'使い方を選びます'}</small></div>
 <div class="rv-summary-facts"><div class="rv-summary-line"><span>コース名</span><strong>${escape(d.courseName||'未入力')}</strong></div><div class="rv-summary-line"><span>坂道</span><strong data-rv-summary-slope>${escape(s.slope)}</strong></div><div class="rv-summary-line"><span>路面</span><strong data-rv-summary-surface>${escape(s.surface)}</strong></div></div>
 <div class="rv-summary-actions ${selectedPreset?'rv-summary-actions--single':''}">
  <div class="rv-commit-group rv-commit-group--apply"><div class="rv-commit-label">今回の記録に使う</div>
   <button type="button" data-rv-apply class="rv-main-button">この条件を記録に使う</button>
   <p class="rv-commit-help">この画面を閉じて、記録の入力画面に戻ります。</p>
  </div>
  ${!selectedPreset?`<div class="rv-commit-group rv-commit-group--save"><div class="rv-commit-label">保存コースとして残す</div>
   <div class="rv-course-save-actions"><button type="button" data-course-save ${!library.ok?'disabled':''}>このコースを保存</button></div>
   <p class="rv-commit-help">${saveHelp}</p>
  </div>`:''}
 </div>
 <p class="rv-save-caption">コースの保存・削除によって、過去の走行記録は変更されません。</p>${summary?`<div class="rv-error" role="alert">${escape(summary)}</div>`:''}
 </section>
 </div></div>`;
}
export function courseReadiness(d,ui){
 const errors=[];
 if(d.gradeMode==='SUMMARY'&&(derivedFlat(d)===null))errors.push('上り・下りの割合を両方入力し、合計100%以下にしてください。');
 if(d.gradeMode==='SECTIONS'){
  if(!ui.sections)errors.push('区間を追加してください。');
  else {
   const shares=Array.from({length:ui.sections},(_,i)=>d['sectionShare'+i]);
   if(shares.some(v=>!filled(v)||!Number.isFinite(Number(v))||Number(v)<0||Number(v)>100)||Math.abs(shares.reduce((a,v)=>a+(filled(v)?Number(v):0),0)-100)>.01)errors.push('各区間の割合の合計を100%にしてください。');
  }
 }
 if(d.surfaceMode==='SINGLE'&&!d.primarySurface)errors.push('路面を1種類選択してください。');
 if(d.surfaceMode==='MIXED'){
  if(ui.surfaceSelected.length<2)errors.push('路面を2種類以上選択してください。');
  else if(ui.surfaceSelected.some(k=>!filled(d['surface'+k])||!Number.isFinite(Number(d['surface'+k]))||Number(d['surface'+k])<=0)||Math.abs(ui.surfaceSelected.reduce((sum,k)=>sum+Number(d['surface'+k]),0)-100)>.01)errors.push('選択した路面の割合を合計100%にしてください。');
 }
 return errors;
}
export function initialCourseUi(d){
 const selected=SURFACES.map(x=>x[0]).filter(k=>filled(d['surface'+k])&&Number(d['surface'+k])>0);
 const used=Array.from({length:5},(_,i)=>i).filter(i=>filled(d['sectionShare'+i])||filled(d['sectionGrade'+i])||d['sectionSurface'+i]!=='UNKNOWN'&&filled(d['sectionSurface'+i]));
 return {slope:'up',surfaceSelected:selected,surfaceFocus:selected[0]||null,sections:used.length?Math.max(...used)+1:0,notice:''};
}