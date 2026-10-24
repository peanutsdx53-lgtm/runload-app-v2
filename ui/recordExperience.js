// RunLoad v2: presentation/interaction helpers for approved record v2 screens.
// Not a replacement for the authoritative v1 record/scientific storage contract.
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
 const d=state.recordDraft,run=state.recordType==='run',s=courseSummary(d,state.recordCourseUi);
 const date=escape(d.date);
 const time=filled(d.minutes)?Number(d.minutes):null;
 const pace=run&&filled(d.distance)&&Number(d.distance)>0&&Number.isFinite(time)&&time>0
 ? (()=>{const m=time/Number(d.distance);if(!Number.isFinite(m))return '—';const sec=Math.round(m*60);return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')} /km`;})():'';
 const access=[
  ['#/record-course','⌁','コース・走行条件',`${s.courseName} ・ ${s.slope}`],
  ['#/record-rof','◉','運動前後の疲労感',`${Number.isInteger(d.rofBefore)?'運動前 '+d.rofBefore:'運動前 未入力'} / ${Number.isInteger(d.rofAfter)?'運動後 '+d.rofAfter:'運動後 未入力'}`],
  ['#/record-compare','◷','歩数・走り方',filled(d.steps)?`歩数 ${escape(d.steps)} ・ 詳細を確認`:'未入力'],
  ['#/record-environment','☀','環境',filled(d.temperatureC)?`気温 ${escape(d.temperatureC)}℃`:filled(d.environmentNote)?'環境メモあり':'未入力'],
  ['#/record-reflection','✎','身体・使用品・メモ',filled(d.bodyObservation)||filled(d.shoeName)||filled(d.memo)?'入力あり':'未入力']
 ];
 return `<div class="record-v3 rv-manual"><header class="rv-head"><a href="#/record-start" class="rv-back rv-phone-only" aria-label="記録方法の選択へ戻る">‹</a><div><h1>手入力で記録</h1></div></header>
 <div class="rv-manual-grid"><section class="rv-panel rv-primary"><h2 class="rv-section-title">基本情報</h2>
 ${optionGroup('data-record-type',[['run','走行'],['rest','休養']],state.recordType)}
 <label class="rv-field rv-date"><span>日付</span><span class="rl-date-control"><span class="rl-date-value" data-date-display aria-hidden="true">${date.replaceAll("-", "/")}</span><svg class="rl-date-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/></svg><input aria-label="記録日" data-draft="date" type="date" value="${date}"></span></label>
 ${run?`<div class="rv-numbers"><label class="rv-field"><span>距離</span><div class="rv-unit-input"><input data-draft="distance" aria-label="距離（km）" type="number" inputmode="decimal" min="0.01" max="10000" step="0.01" placeholder="0.00" value="${escape(d.distance)}"><em>km</em></div></label>
 <label class="rv-field"><span>時間</span><div class="rv-unit-input"><input data-draft="minutes" aria-label="時間（分）" type="number" inputmode="decimal" min="0.01" max="100000" step="0.01" placeholder="0.0" value="${escape(d.minutes)}"><em>分</em></div></label></div>${pace?`<p class="rv-derived">平均ペース　<strong>${pace}</strong> <small>入力値から算出</small></p>`:''}`:
 '<p class="rv-muted">休養日は距離・時間を入力しません。必要に応じてメモを追加できます。</p>'}
 </section><section class="rv-panel rv-secondary"><h2 class="rv-section-title">追加情報 <small>任意</small></h2>
 <div class="rv-links">${(run?access:access.slice(3)).map(([url,icon,label,sub])=>`<a href="${url}" class="rv-link"><span class="rv-link-icon">${icon}</span><span class="rv-link-content"><strong>${label}</strong><small>${sub}</small></span><span class="rv-chevron">›</span></a>`).join('')}</div></section></div>
 <div class="rv-bottom-actions"><button type="button" class="rv-main-button" data-demo-save>入力内容を確認</button><p class="rv-muted">正式な記録保存・科学計算は現在未接続です。</p></div></div>`;
}
export function recordMethodPage(){return `<div class="record-v3 rv-method"><header class="rv-head"><h1>記録</h1></header>
 <h2 class="rv-method-caption">記録方法を選択</h2><div class="rv-method-cards">
 <a class="rv-method-card rv-method-gps" href="#/measurement"><span class="rv-method-mark">⌖</span><span><strong>GPSで測定</strong><small>位置情報を使って走行を記録</small><em>測定エンジン連携前</em></span><span class="rv-chevron">›</span></a>
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
 return `<div class="rv-section-rows"><p class="rv-hint">最大5区間。割合・方向・傾斜・路面を必要な範囲で設定できます。</p>
 ${Array.from({length:count},(_,i)=>`<div class="rv-section-row"><div class="rv-section-row-head"><strong>区間 ${i+1}</strong><button type="button" data-rv-remove="${i}">削除</button></div>
 <div class="rv-section-fields"><label>割合 (%)<input type="number" inputmode="decimal" min="0" max="100" step="0.1" data-draft="sectionShare${i}" value="${courseValue(d,'sectionShare'+i)}"></label>
 <label>坂道<select data-draft="sectionDirection${i}">${choose(DIRECTIONS,d['sectionDirection'+i])}</select></label>
 <label>傾斜 (%)<input data-draft="sectionGrade${i}" type="number" min="0" max="100" step="0.1" inputmode="decimal" value="${courseValue(d,'sectionGrade'+i)}"></label>
 <label>路面<select data-draft="sectionSurface${i}">${choose([['UNKNOWN','不明'],...SURFACES],d['sectionSurface'+i])}</select></label></div></div>`).join('')}
 <button type="button" class="rv-add" data-rv-add ${count>=5?'disabled':''}>＋ 区間を追加（${count} / 5）</button><p class="rv-hint">区間割合は合計100%で確定します。空欄を0とみなしません。</p></div>`;
}
function surfaceSection(d,ui){
 const mode=d.surfaceMode||'UNKNOWN';
 const selected=mode==='SINGLE'?(d.primarySurface?[d.primarySurface]:[]):ui.surfaceSelected;
 const total=ui.surfaceSelected.reduce((sum,k)=>sum+(filled(d['surface'+k])?Number(d['surface'+k]):0),0);
 const valid=ui.surfaceSelected.length>=2&&ui.surfaceSelected.every(k=>filled(d['surface'+k])&&Number(d['surface'+k])>0)&&Math.abs(total-100)<.001;
 return `<section class="rv-panel"><h2 class="rv-section-title">路面の種類</h2>${optionGroup('data-rv-surface-mode',[['UNKNOWN','不明'],['SINGLE','1種類'],['MIXED','複数・割合']],mode)}
 ${mode!=='UNKNOWN'?`<div class="rv-surfaces">${SURFACES.map(([k,name])=>`<button type="button" data-rv-surface="${k}" aria-pressed="${selected.includes(k)}" class="rv-surface-tile ${selected.includes(k)?'is-selected':''}"><span>${name}</span><span aria-hidden="true">${selected.includes(k)?'●':'○'}</span></button>`).join('')}</div>`:'<p class="rv-hint">不明のままにしても問題ありません。</p>'}
 ${mode==='MIXED'&&ui.surfaceSelected.length?`<div class="rv-surface-head"><h3>路面の割合</h3><strong class="${valid?'rv-ok':'rv-invalid'}" data-rv-surface-total>合計 ${total}% / 100%</strong></div>
 <div class="rv-surface-percents">${ui.surfaceSelected.map(k=>`<div class="rv-surface-percent"><strong>${names[k]}</strong><label><input type="number" min="0" max="100" step="1" inputmode="numeric" data-rv-surface-value="${k}" value="${courseValue(d,'surface'+k)}" placeholder="—"> %</label><input type="range" data-rv-surface-range="${k}" min="0" max="100" step="1" value="${filled(d['surface'+k])?courseValue(d,'surface'+k):0}"></div>`).join('')}</div>
 <p class="rv-hint ${valid?'rv-ok':'rv-invalid'}" data-rv-surface-warning>${valid?'割合の合計は100%です。':'選択した路面に割合を入力し、合計100%にしてください。'}</p>`:''}
 </section>`;
}
export function coursePage(state,ui){
 const d=state.recordDraft,s=courseSummary(d,ui),summary=state.recordCourseUi?.notice||'';
 return `<div class="record-v3 rv-course"><header class="rv-head"><a href="#/record" class="rv-back" aria-label="手入力へ戻る">‹</a><h1>コース・走行条件</h1></header>
 <div class="rv-course-grid"><section class="rv-panel rv-course-name"><h2 class="rv-section-title">今回のコース</h2><label class="rv-field"><span>コース名 <small>任意</small></span><input type="text" maxlength="80" data-draft="courseName" value="${courseValue(d,'courseName')}" placeholder="コース名を入力"></label><p class="rv-hint">保存コースの選択・作成は、ライブラリ連携後に利用できます。</p></section>
 ${slopeSection(d,ui)}${surfaceSection(d,ui)}
 <section class="rv-panel rv-course-summary"><h2 class="rv-section-title">設定内容</h2><div class="rv-summary-line"><span>坂道</span><strong data-rv-summary-slope>${escape(s.slope)}</strong></div><div class="rv-summary-line"><span>路面</span><strong data-rv-summary-surface>${escape(s.surface)}</strong></div><button type="button" data-rv-apply class="rv-main-button">この条件を使う</button>${summary?`<div class="rv-error" role="alert">${escape(summary)}</div>`:''}</section></div>
 </div>`;
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
 return {slope:'up',surfaceSelected:selected,sections:used.length?Math.max(...used)+1:0,notice:''};
}