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
 <div class="rv-bottom-actions"><button type="button" class="rv-main-button" data-demo-save>入力内容を確認</button><p class="rv-muted">手入力した走行は確認後に端末へ保存できます。身体の部位別の参考値はまだ表示できません。</p></div></div>`;
}
export function recordMethodPage(){return `<div class="record-v3 rv-method"><header class="rv-head"><h1>記録</h1></header>
 <h2 class="rv-method-caption">記録方法を選択</h2><div class="rv-method-cards">
 <a class="rv-method-card rv-method-gps" href="#/measurement"><span class="rv-method-mark">⌖</span><span><strong>GPSで測定</strong><small>位置情報を使って走行を記録</small><em>GPSでの測定は準備中</em></span><span class="rv-chevron">›</span></a>
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
export function coursePage(state,ui,library={ok:true,records:[]},fromHome=false){
 const d=state.recordDraft,s=courseSummary(d,ui),summary=state.recordCourseUi?.notice||'';
 const selected=ui.selectedPresetId||'',pending=ui.pendingDelete||'',records=library.ok?library.records:[];
 const listing=library.ok?records.slice().reverse().map(p=>`<article class="rv-preset-item" data-course-row="${escape(p.id)}"><div><strong>${escape(p.data.courseName)}</strong><small>${escape(courseSummary(p.data,initialCourseUi(p.data)).slope)} / ${escape(courseSummary(p.data,initialCourseUi(p.data)).surface)}</small></div><div class="rv-preset-actions"><button type="button" data-course-use="${escape(p.id)}">使う</button><button type="button" data-course-delete="${escape(p.id)}">削除</button></div>${pending===p.id?`<div class="rv-course-confirm" role="group" aria-label="コース削除の確認"><p>「${escape(p.data.courseName)}」を削除しますか？保存済みの走行記録は変わりません。</p><button type="button" data-course-confirm-delete="${escape(p.id)}">削除を確定</button><button type="button" data-course-cancel-delete>キャンセル</button></div>`:''}</article>`).join(''):'<p class="rv-error" role="alert">'+escape(library.reason)+'</p>';
 return `<div class="record-v3 rv-course rv-proposed-desk">
 <header class="rv-head"><a href="${fromHome?'#/home':'#/record'}" class="rv-back" aria-label="${fromHome?'ホーム':'手入力'}へ戻る">‹</a><div><h1>コース・走行条件</h1><p class="rv-flow-intro">必要な条件だけ設定して、今回の記録に使えます。</p></div></header>
 <div class="rv-flow-rail" aria-label="操作の順番"><span><b>01</b> コースを選ぶ<small>保存済み・新規作成</small></span><span><b>02</b> 条件を整える<small>坂道・路面</small></span><span><b>03</b> 内容を確認<small>今回に適用・次回用に保存</small></span></div>
 <div class="rv-course-grid rv-course-flow">
 <section class="rv-panel rv-course-setup rv-course-step" aria-label="コースの選択と名前"><div class="rv-section-title rv-block-heading"><span class="rv-step-index">01</span><h2>今回のコース</h2><small>保存済み ${records.length}件</small></div>
 <div class="rv-course-select-strip"><div class="rv-block-label"><strong>保存コースから選ぶ</strong><span>使わない場合は次へ進めます</span></div>${records.length?`<div class="rv-preset-list">${listing}</div>`:library.ok?'<div class="rv-empty-mini">保存したコースはありません。下の名前と条件から設定できます。</div>':listing}</div>
 <div class="rv-course-name-inline"><label class="rv-field"><span>コース名 <small>保存時のみ必須</small></span><input type="text" maxlength="80" data-draft="courseName" value="${courseValue(d,'courseName')}" placeholder="例：川沿い往復"></label><p>この名前は保存コースの識別用です。走行距離・時間は含みません。</p></div>
 </section>
 <section class="rv-panel rv-course-conditions rv-course-step" aria-label="坂道と路面の条件"><div class="rv-section-title rv-block-heading"><span class="rv-step-index">02</span><h2>走行条件</h2><small>わからない項目は「不明」でOK</small></div><div class="rv-condition-pair">${slopeSection(d,ui).replace('class="rv-panel"','class="rv-panel rv-step-slope"')}${surfaceSection(d,ui).replace('class="rv-panel"','class="rv-panel rv-step-surface"')}</div></section>
 <section class="rv-panel rv-course-summary rv-course-step"><div class="rv-section-title rv-block-heading"><span class="rv-step-index">03</span><h2>設定内容の確認</h2><small>記録への適用と保存は別の操作</small></div>
 <div class="rv-summary-facts"><div class="rv-summary-line"><span>コース名</span><strong>${escape(d.courseName||'未入力')}</strong></div><div class="rv-summary-line"><span>坂道</span><strong data-rv-summary-slope>${escape(s.slope)}</strong></div><div class="rv-summary-line"><span>路面</span><strong data-rv-summary-surface>${escape(s.surface)}</strong></div></div>
 <div class="rv-summary-actions">
  <div class="rv-commit-group rv-commit-group--apply"><div class="rv-commit-label"><b>1</b> 今回の記録に反映</div>
   <button type="button" data-rv-apply class="rv-main-button">この条件を記録に使う</button>
   <p class="rv-commit-help">記録の入力画面に戻ります。保存コースは更新されません。</p>
  </div>
  <div class="rv-commit-group rv-commit-group--save"><div class="rv-commit-label"><b>2</b> 次回のために保存</div>
   <div class="rv-course-save-actions"><button type="button" data-course-save ${!library.ok?'disabled':''}>${selected?'保存コースを更新':'このコースを保存'}</button>${selected?'<button type="button" data-course-save-new>別名で保存</button>':''}</div>
   <p class="rv-commit-help">ここで保存した条件は、次回の走行で再利用できます。</p>
  </div>
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
 return {slope:'up',surfaceSelected:selected,sections:used.length?Math.max(...used)+1:0,notice:''};
}