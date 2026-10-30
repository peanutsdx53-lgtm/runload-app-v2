import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {bodyReferenceRow,bodyReferenceEngineId,bodyReferenceColor,bodyReferenceScale,BODY_REFERENCE_GRADIENT,renderBodyReferenceLabels,referenceReliefDefs,referenceReliefOverlays,bodyReferenceSilhouetteClipDef} from './bodyReferencePresentation.js';
import {RESULT_STYLES,RESULT_GAIT_STYLES,RESULT_VISUAL_STYLES,RESULT_SIDEBYSIDE_PREVIEW_STYLES,RESULT_ANATOMY_RELIEF_STYLES,RESULT_GPS_GATE_STYLES,RESULT_REFLECTION_STYLES,RESULT_ROF_AUDIT_STYLES,RESULT_QUESTION_STYLES} from './resultInlineStyles.js';
import {REGIONS} from './bodyContextExperience.js';
import {comparableRunChoices,compareSavedRuns,gaitOf} from './runReflection.js';
import {compareBodyReferenceRows} from './regionReferenceComparison.js';
import {calculateActivityReference,ACTIVITY_LABELS} from '../core/activity/activityReference.js';
import {describeRegionEvidence} from './referenceEvidenceInfo.js';
const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const positive=v=>{const n=number(v);return n!==null&&n>0?n:null};
const format=(n,d=0)=>n===null||!Number.isFinite(n)?'—':n.toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d});
const icon=(name)=>({body:'◈',run:'↗',time:'◷',pace:'◉',fatigue:'♡',radar:'⬡',memo:'▤',save:'⇩',location:'⌁'})[name]||'◈';
export const OFFICIAL_NAMES=Object.freeze(REGIONS.map(r=>Object.freeze([r.id,r.name])));
/** The saved PNG must never misrepresent the scientific reference state. */
export function resultImageAnnotation({gps=false,saved=false,reference=null}={}){
 if(!gps&&!saved)return Object.freeze({status:'保存前：部位別値は未表示',detail:'保存した走行の文献適用条件を確認します'});
 const count=Number.isInteger(reference?.count)&&reference.count>0&&reference.count<=12?reference.count:0;
 if(count)return Object.freeze({status:'文献参考値：'+count+'/12 部位算出',detail:'各部位自身の文献基準を100とした参考値'});
 const reasons={GAIT_NOT_SELECTED:'活動種別が未選択のため算出しません',MIXED_GAIT_NOT_QUANTIFIED:'走歩混在を一つの値に換算しません',OUT_OF_SPEED_RANGE:'文献が扱う速度範囲外のため算出できません'};
 return Object.freeze({status:'文献参考値：算出対象外',detail:reasons[reference?.reason]||'該当条件で算出できる部位はありません'});
}
export function mountResult(host,inputDraft={},options={}){
 // GPS summaries reuse the same result experience; never convert GPS
 // reference values into an invented manual record.
 const gps=options.gpsSummary?.schema===2?options.gpsSummary:null;
 const gpsSeconds=gps?Math.round(gps.activeSeconds):0;
 const draft=gps?{date:gps.date,distance:gps.distanceKm,
  hours:Math.floor(gpsSeconds/3600),minutes:Math.floor(gpsSeconds%3600/60),seconds:gpsSeconds%60}:inputDraft;
 const fromGps=!!gps,fromSaved=options.saved===true&&typeof options.recordId==="string"&&options.recordId.length>0;
 const root=host.shadowRoot||host.attachShadow({mode:'open'});
 let chosen='BA-DISP-019',view='front',tab=options.showCompare?'radar':'body',picker=false,showBodyNumbers=false;
 const distance=positive(draft.distance),h=number(draft.hours),m=number(draft.minutes),s=number(draft.seconds);
 const duration=h===null&&m===null&&s===null?null:(h??0)*60+(m??0)+(s??0)/60;
 const seconds=distance!==null&&duration>0?Math.round(duration*60/distance):null;
 const pace=seconds===null?'—':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 const validRof=x=>{const n=number(x);return n!==null&&Number.isInteger(n)&&n>=0&&n<=10?n:null};
 const before=validRof(draft.rofBefore),after=validRof(draft.rofAfter);
 const hasInput=[distance,duration>0?duration:null,before,after,positive(draft.steps),draft.bodyObservation,draft.shoeName,draft.memo].some(x=>x!==null&&x!==undefined&&x!=='');
 const titleDate=hasInput?clean(draft.date||''):'記録未取得';
 const data=OFFICIAL_NAMES.map(([id,name])=>({id,name,value:null}));
 // Derive reference values on demand from the real saved record. Never
 // silently reclassify an old/unknown activity or use an unsaved preview.
 const reference=fromGps?{rows:gps.finalReference.regions,
  count:gps.finalReference.regions.filter(r=>r.calculationState==='CALCULATED'&&Number.isFinite(r.value)).length,
  activity:gps.activity,speedMps:gps.finalReference.speedMps}
  :fromSaved&&options.record?.id===options.recordId?calculateActivityReference(options.record):null;
 const activityMissing=fromSaved&&reference?.reason==='GAIT_NOT_SELECTED';
 // Explicit saved ID only. An invalid ?compare= never silently selects another run.
 const choices=fromSaved?comparableRunChoices(options.compareRecords,options.recordId):[];
 const sameGait=choices.filter(r=>gaitOf(r)===gaitOf(options.record));
 const compareId=options.compareId!==undefined?options.compareId:(sameGait[0]?.id||null);
 const other=choices.find(r=>r.id===compareId)||null;
 const comparison=fromSaved&&other?compareSavedRuns(options.record,other):null;
 const hasInvalidCompare=options.compareId!==undefined&&options.compareId!==null&&!other;
 const resultLink=fromSaved?'#/result?record='+encodeURIComponent(options.recordId):'#/result';
 const exploreLink=(category,topic)=>'#/exploration-tree'+(fromSaved?
  '?record='+encodeURIComponent(options.recordId)+'&category='+category+'&topic='+encodeURIComponent(topic):
  '?category='+category+'&topic='+encodeURIComponent(topic));
 for(const [i,item] of data.entries()){
   const row=bodyReferenceRow(reference?.rows,item.id);
   if(row?.calculationState==='CALCULATED'&&Number.isFinite(row.value))item.value=row.value;
 }
 // The previous fixed knee selection can legitimately be unavailable while
 // other body regions have calculated values. Start on a real available region.
 const firstAvailable=data.find(item=>item.value!==null);
 if(firstAvailable){
  chosen=firstAvailable.id;
  view=BODY_REGION_VIEWS.find(v=>v.paths.some(([id])=>id===chosen))?.key||view;
 }
 const current=()=>data.find(x=>x.id===chosen)||data[0];
 const selectedView=()=>BODY_REGION_VIEWS.find(x=>x.key===view)||BODY_REGION_VIEWS[0];
 const svgMap=()=>{
   const v=selectedView();
   const paths=v.paths.map(([id,path])=>{
    const item=data.find(r=>r.id===id),row=bodyReferenceRow(reference?.rows,id),tone=bodyReferenceColor(row);
    const label=item?.name||id,reading=item?.value===null?'算出できません':format(item.value,1);
    return '<g class="rv4-region-stack"><path d="'+path+'" class="rv4-region '+(id===chosen?'selected':'')+
      '" data-region="'+id+'" data-reference-state="'+tone.state+'" style="fill:'+tone.fill+
      '" tabindex="0" role="button" aria-label="'+clean(label)+'：'+reading+
      '" aria-pressed="'+(id===chosen)+'"><title>'+clean(label)+'：'+reading+'</title></path>'+referenceReliefOverlays(path,'rv4',tone.state)+'</g>';
   }).join('');
   return '<svg class="rv4-body-svg" viewBox="70 10 160 430" role="group" aria-label="'+v.title+'の身体図と部位別参考値">'+
      '<defs><linearGradient id="rv4skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#22687e"/>'+
      '<stop offset="1" stop-color="#09283a"/></linearGradient>'+referenceReliefDefs('rv4')+bodyReferenceSilhouetteClipDef(v,'rv4')+'</defs>'+
      '<g class="rv4-silhouette" fill="url(#rv4skin)">'+v.silhouette+'</g>'+
      '<g clip-path="url(#rv4-silhouette-clip)">'+paths+'</g>'+(showBodyNumbers?renderBodyReferenceLabels(v,reference?.rows||[]):'')+
      '</svg>';
  };
 const chart=()=>{const labels=['距離','平均速度','走行時間','上り割合','歩数','運動後疲労感'];const p=(i,r)=>{const a=i*2*Math.PI/6-Math.PI/2;return (153+Math.cos(a)*r*83).toFixed(1)+','+(128+Math.sin(a)*r*83).toFixed(1)};return '<svg viewBox="0 0 306 267" class="rv4-radar" role="img" aria-label="比較する記録はありませんの六軸チャート">'+[.25,.5,.75,1].map(k=>'<polygon points="'+labels.map((_,i)=>p(i,k)).join(' ')+'" />').join('')+labels.map((l,i)=>'<line x1="153" y1="128" x2="'+p(i,1).split(',')[0]+'" y2="'+p(i,1).split(',')[1]+'"/><text x="'+p(i,1.27).split(',')[0]+'" y="'+p(i,1.27).split(',')[1]+'" text-anchor="middle">'+l+'</text>').join('')+'<text x="153" y="127" class="rv4-chart-empty" text-anchor="middle">比較する記録はありません</text><text x="153" y="144" class="rv4-chart-sub" text-anchor="middle">今後の記録を振り返れます</text></svg>'};
 const nav=()=>'<div class="rv4-mobile-tabs" role="group" aria-label="結果の表示切替">'+[['body','身体'],['fatigue','疲労感'],['radar','過去と比較']].map(([k,label])=>'<button type="button" data-tab="'+k+'" aria-pressed="'+(tab===k)+'" class="'+(tab===k?'active':'')+'">'+label+'</button>').join('')+'</div>';
  const evidencePanel=()=>{
  if(!fromSaved&&!fromGps)return '';
  const selected=current(),row=bodyReferenceRow(reference?.rows,selected.id);
  const evidence=describeRegionEvidence({row,bodyId:selected.id,activity:reference?.activity,
   source:fromSaved?'saved-manual':'gps'});
  const badge=evidence.kind==='unavailable'?'出典の確認が必要':evidence.status;
  const entry=evidence.kind==='unavailable'?'<p>'+clean(evidence.message)+'</p>':
   '<p><strong>研究上の測定量：</strong>'+clean(evidence.metric)+'</p>'+
   '<p><strong>参考原著・識別子：</strong>'+clean(evidence.citation)+'</p>'+
   '<p><strong>'+clean(evidence.domainLabel||'研究上の速度域')+'：</strong>'+clean(evidence.domain)+'</p>'+
   '<p>基準100：'+clean(evidence.reference)+'</p>'+
   (evidence.unit?'<p>原著の単位：'+clean(evidence.unit)+'</p>':'')+
   (evidence.sourceLocation?'<p>出典内の位置：'+clean(evidence.sourceLocation)+'</p>':'')+
   (evidence.url?'<p><a href="'+clean(evidence.url)+'" target="_blank" rel="noopener noreferrer">原著の書誌・公開ページを見る ↗</a></p>':'')+
   '<p>'+clean(evidence.note)+'</p>';
  return '<details class="rv4-details rv4-region-evidence" data-region-evidence="'+clean(selected.id)+'">'+
   '<summary><span class="rv4-icon">'+icon('memo')+'</span><span><strong>この部位の研究根拠と条件</strong><small>'+clean(badge)+'</small></span><b>⌄</b></summary>'+
   '<div class="rv4-note">'+entry+'</div></details>';
 };
 const body=()=>{const r=current(),v=selectedView(),scale=bodyReferenceScale(r.value);
   const delta=r.value===null?'':(r.value>=100?'+':'')+format(r.value-100,1);
   return '<section class="rv4-card rv4-body" data-pane="body"><div class="rv4-card-heading"><span class="rv4-icon">'+icon('body')+'</span><div><h2>速度に対応する文献参考値</h2><p>本人の身体を測定した数値ではありません</p></div><span class="rv4-mini">'+(reference?.count?reference.count+'/12 算出':'未取得')+'</span></div>'
    +'<div class="rv4-tone-legend"><span><i class="rv4-low"></i>100より低い</span><span><i class="rv4-mid"></i>基準100</span><span><i class="rv4-high"></i>100より高い</span></div>'
    +'<div class="rv4-view-tabs">'+BODY_REGION_VIEWS.map(item=>'<button type="button" data-view="'+item.key+'" aria-pressed="'+(view===item.key)+'" class="'+(view===item.key?'active':'')+'">'+item.title+'</button>').join('')+'</div>'
    +'<div class="rv4-body-content"><div class="rv4-body-figure"><span class="rv4-orbit"></span>'+svgMap()
    +'<div class="rv4-figure-actions"><span>部位をタップして確認</span><button type="button" data-label-toggle aria-pressed="'+showBodyNumbers+'">'+(showBodyNumbers?'数値を隠す':'図に数値を表示')+'</button></div></div>'
    +'<div class="rv4-reading"><small>選択中の部位</small><h3>'+clean(r.name)+'</h3>'
    +'<div class="rv4-big-score" data-reference-region="'+clean(r.id)+'">'+(r.value===null?'—':format(r.value,1))+'</div>'
    +(r.value!==null?'<div class="rv4-value-diff">部位内基準100との差 <strong>'+delta+'</strong></div>':'')
    +'<div class="rv4-score-caption">'+(r.value!==null?'この部位自身の文献基準100に対する参考値（個人の測定値ではありません）':'この速度条件で算出可能な文献参考値はありません')+'</div>'
    +'<div class="rv4-scale" style="background:'+BODY_REFERENCE_GRADIENT+'" role="img" aria-label="基準100を中心とする連続カラースケール">'
    +'<span class="rv4-scale-ref"></span>'+(scale?'<span class="rv4-scale-current" style="left:'+scale.position.toFixed(2)+'%"></span>':'')+'</div>'
    +'<div class="rv4-scale-labels"><span>60</span><span>100</span><span>140</span></div>'
    +(scale?.clipped?'<div class="rv4-scale-note">現在値は配色表示範囲（60〜140）の外側です。数値はそのまま表示しています。</div>':'')
    +'<button type="button" class="rv4-picker" data-picker-toggle aria-expanded="'+picker+'"><span>部位を選ぶ</span> <span>⌄</span></button></div></div>'
    +(picker?'<div class="rv4-choices">'+v.paths.map(([id])=>{const n=data.find(x=>x.id===id);return '<button type="button" data-region="'+id+'" class="'+(id===chosen?'active':'')+'">'+clean(n?.name||id)+'</button>'}).join('')+'</div>':'')
    +(fromGps&&gps.detailSaved&&['RUNNING','JOGGING','WALK'].includes(gps.activity)?
       '<div class="rv4-gps-gate"><div><small>GPSコースと身体の変化</small><strong>フラッグ地点の参考値を振り返る</strong><span>コース上の地点・速度・人体図を連動表示します</span></div><a data-gps-dynamic-gate href="#/dynamic-result?record='+encodeURIComponent(gps.id)+'">動的結果を見る ›</a></div>':'')
    +'<p class="rv4-disclaimer">色は各部位自身の基準100との差を示します。危険度・部位間の順位ではありません。算出できない部位は灰色で表示します。</p>'
    +'<a class="rv4-learn-link" href="'+exploreLink('02','12部位の参考値の見方')+'">この数値の意味を探究で確かめる ›</a>'+evidencePanel()+'</section>';
  };
 const fatigue=()=>'<section class="rv4-card rv4-fatigue" data-pane="fatigue" data-rof-time-status="unverified"><div class="rv4-card-heading"><span class="rv4-icon warm">'+icon('fatigue')+'</span><div><h2>疲労感の記録</h2><p>「運動前／後」として入力した回答（0〜10）</p></div></div><div class="rv4-fatigue-numbers"><div><small>運動前</small><strong>'+ (before??'—')+'</strong></div><span class="rv4-arrow">→</span><div><small>運動後</small><strong>'+(after??'—')+'</strong></div><div class="rv4-change"><small>前後差</small><strong>—</strong></div></div><div class="rv4-tracks"><span style="width:'+(before===null?0:before*10)+'%"></span><span style="width:'+(after===null?0:after*10)+'%"></span></div><p class="rv4-caption">本人の回答です。入力操作時刻と本人申告の評価時刻を分けて記録します。運動の開始・終了時刻と順序が検証できないため、時間的な前後差は判定しません。未回答は「—」です。</p>'
 +(fromSaved&&options.record?.rofEvidence?'<details class="rv4-rof-audit"><summary>回答時刻と訂正履歴を確認・訂正</summary><p>取得時刻は端末での入力操作の時刻、評価時刻は本人申告です。実測的な保証ではありません。</p>'+
 ['before','after'].map(phase=>{const e=options.record.rofCorrections?.filter(x=>x.phase===phase).at(-1)?.next||options.record.rofEvidence[phase];return '<p>'+(phase==='before'?'運動前':'運動後')+'：入力 '+clean(e?.capturedAt||'不明')+'／評価（本人申告） '+clean(e?.assessedAt||'不明')+'／'+clean(e?.timeBasis||'UNKNOWN')+'</p>'}).join('')+
 '<p>運動開始（本人申告）：'+clean(options.record.exerciseTiming?.startedAt||'不明')+'／運動終了（本人申告）：'+clean(options.record.exerciseTiming?.endedAt||'不明')+'</p><p>訂正履歴 '+(options.record.rofCorrections?.length||0)+'件。訂正前の回答も保存されています。</p>'+
 (options.record.rofCorrections?.length?'<details><summary>訂正履歴を開く</summary>'+options.record.rofCorrections.map(x=>'<p>'+clean(x.changedAt)+' '+clean(x.phase==='before'?'運動前':'運動後')+'：'+clean(x.from??'未回答')+' → '+clean(x.to??'未回答')+'／'+clean(x.reason||'理由未記入')+'</p>').join('')+'</details>':'')+
 '<div class="rv4-rof-correct-form"><label>訂正する区分<select data-rof-correct-phase><option value="before">運動前</option><option value="after">運動後</option></select></label><label>訂正後の値（空欄は未回答）<input data-rof-correct-score type="number" min="0" max="10" step="1" placeholder="未回答"></label>'+
 '<label>評価時点（本人申告）<select data-rof-correct-basis><option value="UNKNOWN">不明</option><option value="AT_ENTRY">今、この画面で評価した</option><option value="RECALLED">過去の状態を思い出して入力</option></select></label><label>過去の評価日時（任意・本人申告）<input data-rof-correct-assessed type="datetime-local"></label><label>訂正理由（任意）<input data-rof-correct-reason maxlength="140"></label><button type="button" data-rof-correct-save>訂正して履歴を保存</button></div></details>':'')+'</section>';
 const radar=()=>{
  const optionsHtml=choices.map(r=>'<option value="'+clean(r.id)+'"'+(compareId===r.id?' selected':'')+'>'+clean(r.date)+' ｜ '+r.distanceKm.toFixed(2)+' km ｜ '+clean(ACTIVITY_LABELS[gaitOf(r)]||'活動種別不明')+' ｜ ID末尾 '+clean(r.id.slice(-8))+(gaitOf(r)===gaitOf(options.record)?'':'（活動種別が異なる）')+'</option>').join('');
  const selector=fromSaved&&choices.length?'<label class="rv4-compare-label" for="rv4-compare-select">比べる保存記録</label><select id="rv4-compare-select" data-compare-select><option value="">記録を選ぶ</option>'+optionsHtml+'</select>':'';
  // Reference values are re-evaluated from both saved records using the current model.
  // This is not a stored historical output snapshot from the original run date.
  const regionCmp=fromSaved&&other?compareBodyReferenceRows(
    options.record,other,reference,calculateActivityReference(other),bodyReferenceEngineId(chosen)):null;
  // The compared record may share a date or be later than the selected record.
   const provenance=fromSaved&&other?'<div class="rv4-compare-provenance" role="note"><span>比較相手：'+clean(other.date)+'／記録ID '+clean(other.id)+'</span><span>選択中：'+clean(options.record.date)+'／記録ID '+clean(options.record.id)+'</span></div>':'';
   const regionCmpView=fromSaved&&other?'<section class="rv4-region-compare" aria-label="同一部位の文献参考値比較">'+
    '<h3>選択した部位の文献参考値</h3><label>比較する部位 <select data-reference-compare-region>'+
    OFFICIAL_NAMES.map(([id,name])=>'<option value="'+clean(id)+'"'+(id===chosen?' selected':'')+'>'+clean(name)+'</option>').join('')+
    '</select></label>'+
    (regionCmp?.status==='ready'?
      '<p>比較相手 '+clean(other.date)+'：'+format(regionCmp.previousValue,1)+'　選択中 '+clean(options.record.date)+'：'+format(regionCmp.currentValue,1)+
      '　差 '+(regionCmp.difference>0?'+':'')+format(regionCmp.difference,1)+' ポイント</p><p>'+clean(regionCmp.note)+'</p>':
      '<p>この部位は比較できません：'+clean(regionCmp?.reason||'比較対象がありません')+'</p>')+
    '<p>保存された走行情報を、現在の同一モデルでそれぞれ再計算した参考値です。記録当時の計算結果を保存・復元したものではありません。</p></section>':'';
  const compareCards=comparison?.status==='ready'?'<div class="rv4-compare-cards" aria-label="二件の記録の比較">'+comparison.rows.map(r=>'<div class="rv4-compare-card"><strong>'+clean(r.label)+'</strong><div><span><small>比較相手 '+clean(comparison.other.date)+'</small>'+clean(r.first)+'</span><span><small>選択中 '+clean(comparison.current.date)+'</small>'+clean(r.second)+'</span><span><small>差</small>'+(r.change===null?'比較できません':(r.change>0?'+':'')+r.change+' '+clean(r.unit))+'</span></div></div>').join('')+'</div>':'';
  const compareTable=comparison?.status==='ready'?'<div class="rv4-comparison-scroller"><table class="rv4-comparison-table"><thead><tr><th scope="col">項目</th><th scope="col">比較相手 '+clean(comparison.other.date)+'</th><th scope="col">選択中 '+clean(comparison.current.date)+'</th><th scope="col">差</th></tr></thead><tbody>'+comparison.rows.map(r=>'<tr><th scope="row">'+clean(r.label)+'</th><td>'+clean(r.first)+'</td><td>'+clean(r.second)+'</td><td>'+(r.change===null?'比較できません':(r.change>0?'+':'')+r.change+' '+clean(r.unit))+'</td></tr>').join('')+'</tbody></table></div>'+compareCards+'<div class="rv4-comparison-memos"><div><small>比較相手のメモ</small><p>'+clean(comparison.other.memo||'メモなし')+'</p></div><div><small>選択中の記録のメモ</small><p>'+clean(comparison.current.memo||'メモなし')+'</p></div></div><p class="rv4-comparison-caution">'+comparison.uncertainty+'</p>':
   '<p class="rv4-comparison-empty">'+clean(hasInvalidCompare?'指定された比較相手は保存記録にありません。':comparison?.reason||'同じ活動種別の保存記録をもう1件残すと、距離・時間・疲労感を見比べられます。')+'</p>';

  // A previous note remains on its original run. The user chooses a specific
  // note AND writes a new observation before any new run-linked note is saved.
  const applicable=fromSaved&&other&&comparison?.status==='ready'&&
   other.date<=options.record.date&&
   (other.date!==options.record.date||Date.parse(other.createdAt)<Date.parse(options.record.createdAt));
  const notes=applicable&&Array.isArray(options.questionNotes)?
   options.questionNotes.filter(n=>n.recordId===other.id&&typeof n.text==='string'&&n.text.trim()&&typeof n.id==='string'):[];
  const questionPanel=notes.length?'<section class="rv4-question-continuation" aria-label="元の問いを今回の記録で振り返る">'+
   '<h3>元の問いを今回の記録で振り返る（任意）</h3><p>比較相手 '+clean(other.date)+' ／ ID '+clean(other.id)+' の本人の問いです。自動では転記しません。</p>'+
   '<label>元の問いを選ぶ<select data-run-question-source><option value="">選択してください</option>'+
   notes.map(n=>'<option value="'+clean(n.id)+'">'+clean(n.text.slice(0,90))+'</option>').join('')+'</select></label>'+
   '<label>今回考えたこと（1〜500文字）<textarea data-run-question-text maxlength="500" rows="3" placeholder="前回の問いを見て、今回どう感じたかを書きます"></textarea></label>'+
   '<button type="button" data-run-question-save>本人が選んで保存する</button><small>元の問いや走行記録は変更しません。科学的な因果や改善を判定する機能ではありません。</small></section>':'';
  return '<section class="rv4-card rv4-history" data-pane="radar"><div class="rv4-card-heading"><span class="rv4-icon">'+icon('radar')+'</span><div><h2>過去と比較</h2><p>保存した走行の違いを確かめる</p></div></div>'+selector+provenance+regionCmpView+compareTable+questionPanel+
   '<div class="rv4-comparison-actions"><a class="rv4-learn-link" href="'+exploreLink('01','過去の走りとの比較')+'">比較の読み方を探究で確かめる ›</a><a class="rv4-back-link" href="#/history">履歴で記録を選ぶ ›</a></div></section>';
 };
 const extras=()=>'<details class="rv4-details"><summary><span class="rv4-icon">'+icon('memo')+'</span><span><strong>その日の記録</strong><small>使用品・コース・メモ</small></span><b>⌄</b></summary><div class="rv4-extra-grid"><div><small>シューズ</small><strong>'+clean(draft.shoeName||'—')+'</strong></div><div><small>歩数</small><strong>'+(positive(draft.steps)!==null?format(positive(draft.steps))+' 歩':'—')+'</strong></div><div><small>上り割合</small><strong>'+(number(draft.upPercent)!==null?format(number(draft.upPercent))+'%':'—')+'</strong></div></div><div class="rv4-note"><small>メモ</small><p>'+clean(draft.memo||'記録がありません')+'</p></div></details>';
 const missingActivityPanel=()=>!activityMissing?'':`<section class="rv4-activity-missing" role="group" aria-label="保存済み記録の活動種別を設定"><div><strong>12部位の参考値を表示するために、活動種別を選択してください</strong><p>この記録は活動種別が未設定です。距離と時間から活動の種類を推測しないため、数値は未取得となっています。</p></div><div class="rv4-activity-options">${[['RUNNING','ランニング'],['JOGGING','ジョギング'],['WALK','ウォーキング']].map(([id,label])=>`<button type="button" data-result-gait="${id}">${label}</button>`).join('')}</div><small>選択した活動種別だけをこの記録に保存します。走歩混在や文献の適用速度範囲外では、数値を算出できない場合があります。</small></section>`;
 const summary=()=>!hasInput?'走行記録がありません。':distance!==null&&duration>0?'距離と時間から平均ペースを確認できます。':'入力した内容を確認できます。';
 const reflectionPath=()=>'<div class="rv4-reading-route" aria-label="記録の振り返り方"><strong>記録を理解する順番</strong><span>① 走行の事実</span><span>② 自分が感じた疲れ</span><span>③ 文献の参考情報と限界</span><span>④ 過去と見比べる</span></div>'+
  '<div class="rv4-next-path"><a href="'+exploreLink('01','距離・時間・ペース')+'">走行情報の意味を調べる ›</a><a href="'+exploreLink('04','疲れの感じ方')+'">疲労感の見方を調べる ›</a></div>';
 const hero=()=>'<section class="rv4-hero"><div class="rv4-hero-glow"></div><div class="rv4-hero-left"><small class="rv4-date">'+titleDate+'　<span>走行</span></small><div class="rv4-measures"><div class="rv4-distance"><small>距離</small><strong>'+format(distance,2)+'</strong><span>km</span></div><div class="rv4-secondary"><div><small>時間</small><strong>'+(duration>0?format(duration,0)+' 分':'—')+'</strong></div><div><small>平均ペース</small><strong>'+pace+' <em>/km</em></strong></div></div></div></div><div class="rv4-hero-report"><span>今回の走り</span><h2>'+summary()+'</h2><div class="rv4-today-chips"><span>運動前 <b>'+(before??'—')+'</b></span><span>運動後 <b>'+(after??'—')+'</b></span></div><small>'+(fromGps?'この端末に保存したGPS記録':fromSaved?'この端末に保存した手入力記録':'保存前の入力内容')+'</small></div></section>';
 function draw(){
  root.querySelector('.rv4-app').innerHTML='<div class="rv4-frame"><header class="rv4-header"><div><h1>結果</h1></div><div class="rv4-actions"><button type="button" data-download '+(!(distance!==null&&duration>0)?'disabled':'')+'>画像で保存 ↓</button><button type="button" data-print>印刷</button></div></header><p class="rv4-notice">'+(fromGps?`GPSで保存した記録です。平均速度 ${format(reference.speedMps,2)}m/s に対応する文献参考値を${reference.count}/12部位に表示します。個人の身体負荷の測定値ではありません。`:
     fromSaved?(reference?.count?`この端末に保存した手入力記録です。 ${clean(ACTIVITY_LABELS[reference.activity])}・平均速度 ${format(reference.speedMps,2)}m/s の文献条件における部位内基準100の参考値を${reference.count}/12部位に表示しています。個人の身体負荷測定値ではありません。路面・勾配等は数値補正していません。`:`この端末に保存した手入力の走行記録です。${reference?.reason==='MIXED_GAIT_NOT_QUANTIFIED'?'走歩混在は単一の活動として数値化しません。':reference?.reason==='GAIT_NOT_SELECTED'?'活動種別が未選択のため部位別値は表示しません。':'この速度条件で算出可能な部位別文献参考値はありません。'}`):hasInput?'まだ保存していない入力内容です。身体の部位別の参考値は表示できません。':'保存された走行記録はまだありません。')+'</p>'+hero()+reflectionPath()+missingActivityPanel()+nav()+'<div class="rv4-grid" data-tab-state="'+tab+'">'+body()+'<div class="rv4-side">'+fatigue()+radar()+'</div></div>'+extras()+'</div>';
  root.querySelectorAll('[data-result-gait]').forEach(b=>b.addEventListener('click',()=>{
    if(!activityMissing||!['RUNNING','JOGGING','WALK'].includes(b.dataset.resultGait))return;
    options.onAssignGait?.(b.dataset.resultGait);
   }));
  root.querySelector('[data-rof-correct-save]')?.addEventListener('click',()=>{
   const phase=root.querySelector('[data-rof-correct-phase]')?.value;
   const raw=root.querySelector('[data-rof-correct-score]')?.value;
   const timeBasis=root.querySelector('[data-rof-correct-basis]')?.value||'UNKNOWN';
   const text=root.querySelector('[data-rof-correct-assessed]')?.value||'';
   const assessedAt=timeBasis==='RECALLED'&&text&&!Number.isNaN(Date.parse(text))?new Date(text).toISOString():null;
   const reason=root.querySelector('[data-rof-correct-reason]')?.value||'';
   options.onCorrectRof?.(phase,raw===''?null:Number(raw),{timeBasis,assessedAt,reason});
  });
  root.querySelector('[data-label-toggle]')?.addEventListener('click',()=>{showBodyNumbers=!showBodyNumbers;draw()});
   root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;const v=selectedView();if(!v.paths.some(x=>x[0]===chosen))chosen=v.paths[0][0];picker=false;draw()}));
  root.querySelectorAll('[data-region]').forEach(b=>{const select=()=>{chosen=b.dataset.region;draw()};b.addEventListener('click',select);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}})});
  // Accept taps on the SVG itself when a thin/nonconvex region is hit but the
  // browser targets the SVG container instead of its path.
  root.querySelector('.rv4-body-svg')?.addEventListener('click',e=>{
    if(e.target.closest?.('[data-region]'))return;
    const svg=e.currentTarget,point=svg.createSVGPoint();
    point.x=e.clientX;point.y=e.clientY;
    const transform=svg.getScreenCTM();
    if(!transform)return;
    const local=point.matrixTransform(transform.inverse());
    const parts=[...svg.querySelectorAll('.rv4-region')];
    let hit=parts.find(path=>path.isPointInFill(local));
    if(!hit){
      const distance=path=>{
        const b=path.getBBox();
        const dx=Math.max(b.x-local.x,0,local.x-(b.x+b.width));
        const dy=Math.max(b.y-local.y,0,local.y-(b.y+b.height));
        return Math.hypot(dx,dy);
      };
      const ranked=parts.map(path=>({path,d:distance(path)})).sort((a,b)=>a.d-b.d);
      if(ranked[0]?.d<=12)hit=ranked[0].path;
    }
    if(hit){chosen=hit.dataset.region;draw()}
  });
  // Invisible accessible tap targets supplement narrow multi-contour official paths;
  // no official region geometry or scientific data is modified.
  const liveSvg=root.querySelector('.rv4-body-svg');
  liveSvg?.querySelectorAll('.rv4-region').forEach(path=>{
    const b=path.getBBox();
    let best=null;
    const svgPoint=liveSvg.createSVGPoint();
    for(let yi=1;yi<=15;yi++)for(let xi=1;xi<=15;xi++){
      svgPoint.x=b.x+b.width*xi/16;svgPoint.y=b.y+b.height*yi/16;
      if(!path.isPointInFill(svgPoint))continue;
      const score=Math.hypot(svgPoint.x-(b.x+b.width/2),svgPoint.y-(b.y+b.height/2));
      if(!best||score<best.score)best={x:svgPoint.x,y:svgPoint.y,score};
    }
    if(!best)return;
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',String(best.x));dot.setAttribute('cy',String(best.y));
    dot.setAttribute('r','9');dot.setAttribute('fill','transparent');
    dot.setAttribute('stroke','none');dot.setAttribute('pointer-events','all');
    dot.setAttribute('data-tap-region',path.dataset.region);
    dot.setAttribute('aria-hidden','true');
    dot.style.cursor='pointer';
    dot.addEventListener('click',e=>{e.stopPropagation();chosen=path.dataset.region;draw()});
    liveSvg.append(dot);
  });
  root.querySelector('[data-run-question-save]')?.addEventListener('click',()=>{
    const sourceNoteId=root.querySelector('[data-run-question-source]')?.value||'';
    const text=root.querySelector('[data-run-question-text]')?.value||'';
    if(!sourceNoteId||!text.trim())return;
    options.onContinueQuestion?.(sourceNoteId,text,other?.id);
  });
  root.querySelector('[data-compare-select]')?.addEventListener('change',event=>{
    const target=event.currentTarget.value;
    // Stay on the same saved record; never treat a missing comparison as a different run.
    if(target&&choices.some(r=>r.id===target))location.hash=resultLink+'&compare='+encodeURIComponent(target)+'&view=compare';
    else location.hash=resultLink+'&compare=&view=compare';
  });
  root.querySelector('[data-reference-compare-region]')?.addEventListener('change',event=>{
    const id=event.currentTarget.value;
    if(OFFICIAL_NAMES.some(([official])=>official===id)){
      chosen=id;
      view=BODY_REGION_VIEWS.find(v=>v.paths.some(([bodyId])=>bodyId===chosen))?.key||view;
      draw();
    }
  });
  root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;draw()}));
  root.querySelector('[data-picker-toggle]')?.addEventListener('click',()=>{picker=!picker;draw()});
  root.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
  root.querySelector('[data-download]')?.addEventListener('click',saveCard);
 }
 function saveCard(){
  if(distance===null||!(duration>0))return;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const c=canvas.getContext('2d');
  const fill=c.createLinearGradient(0,0,1200,630);fill.addColorStop(0,'#0e4158');fill.addColorStop(1,'#061622');c.fillStyle=fill;c.fillRect(0,0,1200,630);
  c.strokeStyle='#35d4da';c.lineWidth=3;c.strokeRect(38,38,1124,554);
  const t=(str,x,y,size,color='#effdff')=>{c.font='700 '+size+'px system-ui,sans-serif';c.fillStyle=color;c.fillText(str,x,y)};
  t('走行結果',70,100,28);t(clean(draft.date||''),70,148,20,'#9ecbd7');
  t('距離',70,205,22,'#9ecbd7');t(format(distance,2)+' km',65,333,100);
  t('時間  '+format(duration,0)+' 分',70,414,28);t('平均ペース  '+pace+' /km',70,465,28);
  t(fromGps?'端末に保存したGPS記録':fromSaved?'端末に保存した手入力記録':'まだ保存していない記録',70,553,20,'#9ecbd7');
  const evidence=resultImageAnnotation({gps:fromGps,saved:fromSaved,reference});
  t('文献参考値の表示状況',685,211,20,'#abd6de');
  t(evidence.status,685,255,21);
  t(evidence.detail,685,298,16,'#abd6de');
  t('本人の身体負荷の実測値ではありません',685,353,17,'#effdff');
  t('部位間の順位・傷害リスクを示しません',685,387,17,'#effdff');
  t('ROF-Jは本人が回答した疲労感です',685,431,17,'#abd6de');
  t('入力値：前 '+(before??'—')+' ／ 後 '+(after??'—'),685,478,24,'#f6d7b4');
  t('評価時刻未記録：前後差は判定不可',685,506,15,'#abd6de');
  t('部位別数値の詳細はアプリ内で確認',685,550,16,'#abd6de');
  /* No internal branding in the saved image. */
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='走行結果.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)},'image/png');
 }
 if(!root.querySelector('.rv4-app'))root.innerHTML='<style data-result-inline-styles>'+RESULT_STYLES+RESULT_GAIT_STYLES+RESULT_VISUAL_STYLES+RESULT_SIDEBYSIDE_PREVIEW_STYLES+RESULT_ANATOMY_RELIEF_STYLES+RESULT_GPS_GATE_STYLES+RESULT_REFLECTION_STYLES+RESULT_ROF_AUDIT_STYLES+RESULT_QUESTION_STYLES+'</style><div class="rv4-app"></div>';
 draw();
}