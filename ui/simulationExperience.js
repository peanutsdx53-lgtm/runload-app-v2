/* RunLoad What-if V32: descriptive, client-only arithmetic. No V4/ROF or predictive training model. */
import {courseSummary,initialCourseUi} from './recordExperience.js';
import {readGpxFile,renderGpxVisual,projectToRoute} from './gpxImport.js';
import {gpsRecordToFeature} from './gpsMeasurementStore.js';
import {gpsCourseEvidence} from './gpsCourseEvidence.js';
export const SIMULATION_VERSION='35.0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
export const newSimulationUi=()=>({source:'manual',presetId:'',recordId:'',gpsId:'',gpsFeature:null,distance:'3.5',manualDistance:'3.5',budget:'30',runPace:'7',walkPace:'12',runMin:'5',walkMin:'2',focus:'a',notice:'',gpxRoutes:[],gpxIndex:0,gpxName:''});
export function computeSteady(minutes,pace){
 if(num(minutes,1,600)===null||num(pace,2,40)===null)return null;
 return {distanceKm:minutes/pace,runMinutes:minutes,walkMinutes:0,changeCount:0};
}
export function computeRunWalk(minutes,runPace,walkPace,runMin,walkMin){
 if([num(minutes,1,600),num(runPace,2,40),num(walkPace,2,40),num(runMin,1,60),num(walkMin,1,60)].some(x=>x===null))return null;
 const cycle=runMin+walkMin,full=Math.floor(minutes/cycle),remaining=minutes-full*cycle;
 const runTime=full*runMin+Math.min(runMin,remaining);
 const walkTime=full*walkMin+Math.max(0,remaining-runMin);
 const changes=full*2+(remaining>0?1:0);
 return {distanceKm:runTime/runPace+walkTime/walkPace,runMinutes:runTime,walkMinutes:walkTime,changeCount:changes};
}
export function reachTime(distance,kind,runPace,walkPace,runMin,walkMin){
 if(num(distance,.01,1000)===null||num(runPace,2,40)===null)return null;
 if(kind==='steady')return distance*runPace;
 if([num(walkPace,2,40),num(runMin,1,60),num(walkMin,1,60)].some(x=>x===null))return null;
 const cycleDist=runMin/runPace+walkMin/walkPace,full=Math.floor(distance/cycleDist);
 const left=distance-full*cycleDist;
 const tail=left<=runMin/runPace?left*runPace:runMin+(left-runMin/runPace)*walkPace;
 return full*(runMin+walkMin)+tail;
}
export function computeComparison(s){
 const budget=Number(s.budget),runPace=Number(s.runPace),walkPace=Number(s.walkPace),runMin=Number(s.runMin),walkMin=Number(s.walkMin);
 // Blank inputs must not coerce to zero. Zero is not a valid pace or duration.
 if([s.budget,s.runPace,s.walkPace,s.runMin,s.walkMin].some(v=>String(v).trim()===''))return {ok:false,reason:'時間・ペース・走歩の区間をすべて入力してください'};
 const a=computeSteady(budget,runPace),b=computeRunWalk(budget,runPace,walkPace,runMin,walkMin);
 if(!a||!b)return {ok:false,reason:'時間1〜600分・ペース2〜40分/km・各区間1〜60分の範囲で入力してください'};
 const goal=s.source==='none'||(s.source==='gpx'&&!s.gpxRoutes?.[s.gpxIndex])||(s.source==='gps'&&!s.gpsFeature)?null:String(s.distance).trim()===''?null:Number(s.distance);
 if(s.source==='manual'&&num(goal,.1,1000)===null || ['gpx','gps'].includes(s.source)&&goal!==null&&num(goal,.01,1000)===null)return {ok:false,reason:'仮のコース距離は0.1〜1000kmで入力してください'};
 return {ok:true,budget,goal,a:{...a,finish:goal===null?null:reachTime(goal,'steady',runPace,walkPace,runMin,walkMin)},b:{...b,finish:goal===null?null:reachTime(goal,'mixed',runPace,walkPace,runMin,walkMin)},diff:a.distanceKm-b.distanceKm};
}
// Only an explicit, saved running-only record is a valid RUN pace reference.
export function eligibleRunningPaceRecord(r){
 return r?.source==='manual'&&r?.type==='run'&&r?.draft?.activityGait==='RUNNING'&&r?.draft?.runningFormat!=='RUN_WALK'
  &&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&Number.isInteger(r.durationSeconds)&&r.durationSeconds>0;
}
export function courseDescription(preset){
 if(!preset?.data)return {slope:'コース未選択',surface:'コース未選択'};
 const summary=courseSummary(preset.data,initialCourseUi(preset.data));
 return {slope:summary.slope,surface:summary.surface};
}
const formatKm=d=>Number(d).toFixed(2);
const formatMin=m=>m===null?'—':`${(Math.round(m*10)/10).toLocaleString('ja-JP',{maximumFractionDigits:1})}分`;
/* A/B GPS evidence is descriptive and independent of the scientific model. */
function renderGpsEvidence(feature,aKm,bKm){
 const evidence=gpsCourseEvidence(feature,aKm,bKm);
 if(!evidence)return '';
 const point=(id,title,item)=>{
  if(!item)return '';
  const altitude=item.beyond?'コース終点を超過：標高は外挿しません':item.elevationM===null?'標高は参照できません（欠損・精度不足）':item.elevationM+'m（'+(item.elevationMethod==='sample'?'保存GPS位置点の記録値':'保存位置点間の補間')+'）';
  return `<article class="sm-gps-evidence-card"><b>${id}｜${title}</b><strong>${formatKm(item.distanceKm)}km</strong><span>${altitude}</span></article>`;
 };
 return `<aside class="sm-gps-evidence" data-sm-gps-evidence><h3>GPS保存コースの確認情報</h3><p>標高を利用できる位置点：${evidence.altitudePoints}/${evidence.sampledPoints}（${evidence.altitudeCoveragePct}%）。区間の途切れ：${evidence.gapCount}件。${evidence.simplified?'長時間記録の軌跡は点数を間引いています。':''}</p><div class="sm-gps-evidence-grid">${point('A','一定ペース',evidence.a)}${point('B','走る＋歩く',evidence.b)}</div><p>位置は保存軌跡上の仮の地点で、標高はGPS記録値またはその点間補間です。欠損区間の標高は作りません。勾配による速度や12部位の負荷の計算には使いません。</p></aside>`;
}
const stat=(label,value,detail,cls='')=>`<article class="sm-metric ${cls}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span>${esc(detail)}</span></article>`;
export function renderSimulationResults(ui){
 const c=computeComparison(ui);
 if(!c.ok)return `<section class="sm-error" role="alert">${esc(c.reason)}</section>`;
 const {a,b,goal,budget}=c;
 const card=(id,data,title)=>{
  const remain=goal===null?'距離目標なし':data.distanceKm+1e-8>=goal?'設定距離に届く計算':`残り ${formatKm(goal-data.distanceKm)} km`;
  const pct=goal===null?null:Math.max(0,Math.min(100,data.distanceKm/goal*100));
  return `<article class="sm-result ${id}"><div class="sm-result-heading"><span class="sm-circle">${id.toUpperCase()}</span><strong>${title}</strong></div><div class="sm-distance">${formatKm(data.distanceKm)}<small>km</small></div><p>${id==='a'?`${formatMin(data.runMinutes)}走る（一定ペース）`:`走る${formatMin(data.runMinutes)} ＋ 歩く${formatMin(data.walkMinutes)}`}</p>${goal===null?'':`<div class="sm-track" aria-label="設定距離への割合"><i style="width:${pct.toFixed(2)}%"></i></div>`}<div class="sm-result-bottom"><span>${remain}</span><span>${goal===null?'到達時間は計算しません':`目標距離まで ${formatMin(data.finish)}`}</span></div></article>`;
 };
 const feature=ui.source==='gpx'?ui.gpxRoutes?.[ui.gpxIndex]:ui.source==='gps'?ui.gpsFeature:null;
 const map=feature?`<section class="sm-gpx-result"><div class="sm-gpx-result-header"><strong>コース軌跡上の仮の進行位置</strong><div class="sm-gpx-focus" role="group" aria-label="表示するシナリオ"><button type="button" data-sm-focus="a" aria-pressed="${ui.focus!=='b'}">Aを確認</button><button type="button" data-sm-focus="b" aria-pressed="${ui.focus==='b'}">Bを確認</button></div></div>${renderGpxVisual(feature,a.distanceKm,b.distanceKm,ui.focus)}${ui.source==='gps'?renderGpsEvidence(feature,a.distanceKm,b.distanceKm):''}<p class="sm-gpx-result-caption">${ui.focus==='b'?'B｜走る＋歩く':'A｜一定ペース'}：計算上の進行距離 ${formatKm((ui.focus==='b'?b:a).distanceKm)}km。${(ui.focus==='b'?b:a).distanceKm>feature.distanceKm?'設定したコースの終点に到達します。超過分は地図上に描きません。':'保存軌跡上の対応地点を表示しています。'}<br>実際にその地点に到達できる保証はありません。</p></section>`:'';
 return `<div class="sm-results-grid">${card('a',a,'一定ペース')}${card('b',b,'走る＋歩く')}</div>${map}
 <div class="sm-comparison-note"><strong>比較で分かること</strong><p>${budget}分間、入力したペースが変わらないと仮定すると、Aは${formatKm(a.distanceKm)}km、Bは${formatKm(b.distanceKm)}kmです。進行距離の差は${formatKm(Math.abs(c.diff))}kmです。${goal===null?'コース距離が未設定なので、到達地点・残り距離は表示しません。':feature?'保存された軌跡に沿って仮の進行位置を表示します。':'実際の道路上の到達地点は不明です。手動設定だけでは位置・坂道の順序を特定できません。'}</p></div>
 <p class="sm-limits">これは入力した速度が続くと仮定した<strong>算術上の結果</strong>です。実際の疲労・走行能力・傷害リスク・12部位の身体負荷を予測しません。歩きの方が速い設定も禁止しませんが、現実的な仮定か本人が確認してください。</p>`;
}
// Decorative icons are fixed inline SVGs; no downloaded art or new location data.
const sourceIcon=(id)=>{
 const d={manual:'<path d="M4 7h16v13H4zM8 4v6M16 4v6M4 12h16"/>',gpx:'<path d="m3 8 6-4 6 4 6-4v13l-6 4-6-4-6 4zM9 4v13m6-9v13"/>',none:'<circle cx="12" cy="12" r="8"/><path d="M6 18 18 6"/>',gps:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9" stroke-dasharray="3 4"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/>'};
 return `<svg viewBox="0 0 24 24" width="19" height="19" stroke="currentColor" fill="none" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d[id]}</svg>`;
};
const mode=(id,label,caption,selected,disabled=false)=>`<button type="button" class="sm-source-option${selected?' is-picked':''}" ${disabled?'disabled title="GPS走行軌跡の保存機能が接続されてから利用できます"':''}${disabled?'':' data-sm-source="'+id+'"'} aria-pressed="${selected}"${disabled?' aria-label="GPS実走履歴：今後対応"':''}><span class="sm-source-symbol">${sourceIcon(id)}</span><span class="sm-source-text"><strong>${label}</strong><small>${caption}</small></span>${selected?'<span class="sm-source-tick" aria-hidden="true">●</span>':''}</button>`;
const field=(title,key,val,unit,{min='1',max='600',step='1',type='number',inputmode='decimal',wide=false}={})=>`<label class="sm-field${wide?' sm-field-wide':''}"><span class="sm-field-label">${title}</span><span class="sm-input-wrap"><input data-sm-field="${key}" type="${type}" min="${min}" max="${max}" step="${step}" inputmode="${inputmode}" value="${esc(val)}" aria-label="${title}"><em aria-hidden="true">${unit}</em></span></label>`;
const scenarioSummary=(ui)=>{
 const r=Number(ui.runMin),w=Number(ui.walkMin),p=Number(ui.runPace),walkP=Number(ui.walkPace),budget=Number(ui.budget);
 return {a:Number.isFinite(budget)&&Number.isFinite(p)&&p>0?`${esc(ui.budget)}分の時間枠 · ${esc(ui.runPace)}分/km`:'仮の条件を確認してください',
 b:r>0&&w>0&&Number.isFinite(walkP)?`${esc(ui.runMin)}分走る → ${esc(ui.walkMin)}分歩く · ${r+w}分サイクル`:'走歩区間を入力してください',
 pct:r>0&&w>0?`${Math.max(0,Math.min(100,100*r/(r+w))).toFixed(2)}%`:'50%'};
};
const row=(n,title,subtitle)=>`<div class="sm-step-head"><span class="sm-number">${n}</span><div><h2 id="sm-s${n}">${title}</h2><p>${subtitle}</p></div></div>`;
export function renderSimulation(ui,{presets,manualRuns,gpsRuns}={}){
 const hasPresets=presets?.ok&&presets.records.length>0;
 const p=presets?.ok?presets.records.find(r=>r.id===ui.presetId):null;
 const summary=courseDescription(p);
 const eligibleRunningRecords=manualRuns?.ok?manualRuns.records.filter(eligibleRunningPaceRecord):[];
 const record=eligibleRunningRecords.find(r=>r.id===ui.recordId)||null;
 return `<div class="sm-page" data-sim-page>
 <header class="sm-heading"><a class="sm-back" href="#/home" aria-label="ホームへ戻る">‹</a><div><span>WHAT IF / もしもの比較</span><h1>走りのシミュレーション</h1><p>「仮にこう走るなら？」を、時間と距離の違いから考える</p></div></header>
 <div class="sm-steps" aria-label="操作の順序"><span>01 コース</span><span>02 仮の走り方</span><span>03 比較結果</span><span>04 次につなぐ</span></div>
 <section class="sm-panel" aria-labelledby="sm-s1">${row('01','コースを用意する','GPS・GPXがなくても条件を試せます。')}
 <div class="sm-source-selector"><div class="sm-source-row" role="group" aria-label="コースの入力方法">${mode('manual','手動・保存','コース条件',ui.source==='manual')}${mode('gpx','GPX読込','ファイルから',ui.source==='gpx')}${mode('none','コースなし','時間だけ',ui.source==='none')}${mode('gps','GPS実走履歴','保存ルート',ui.source==='gps')}</div></div>
 ${ui.source==='gps'?`<div class="sm-source-detail"><label class="sm-field"><span class="sm-field-label">保存したGPS軌跡を使う</span><span class="sm-select-wrap"><select data-sm-field="gpsId"><option value="">保存済みの軌跡を選択</option>${gpsRuns?.ok?gpsRuns.records.filter(r=>r.track.length>=2).slice().reverse().map(r=>`<option value="${esc(r.id)}" ${ui.gpsId===r.id?'selected':''}>${esc(r.date)}・${esc(r.activity)}・${r.distanceKm.toFixed(2)}km</option>`).join(''):''}</select></span></label>${ui.gpsFeature?`<p class="sm-source-meta">${esc(ui.gpsFeature.name)}｜軌跡 ${ui.gpsFeature.distanceKm.toFixed(2)}km。仮の到達位置を下の比較結果に表示します。</p>`:'<p class="sm-source-meta">GPS計測で「軌跡も保存」を選んだ記録だけ表示します。保存がなければ手動・GPXを利用できます。</p>'}</div>`:ui.source==='gpx'?`<div class="sm-source-detail sm-gpx-source"><label class="sm-file-field">GPXファイル（最大5MB・25,000点）<input data-sm-gpx-file type="file" accept=".gpx,application/gpx+xml,application/xml,text/xml"></label><p class="sm-tiny">GPXはこの端末のブラウザー内で解析します。サーバー送信・GPS測位・自動保存は行いません。</p>${ui.gpxRoutes.length?`<div class="sm-gpx-loaded"><strong>${esc(ui.gpxName)} を読み込みました</strong>${ui.gpxRoutes.length>1?`<label>使うトラック・ルート<select data-sm-field="gpxIndex">${ui.gpxRoutes.map((f,i)=>`<option value="${i}" ${i===ui.gpxIndex?'selected':''}>${esc(f.name)}（${f.distanceKm.toFixed(2)}km）</option>`).join('')}</select></label>`:''}<p><strong>${esc(ui.gpxRoutes[ui.gpxIndex].name)}</strong>｜${ui.gpxRoutes[ui.gpxIndex].distanceKm.toFixed(2)}km・${ui.gpxRoutes[ui.gpxIndex].points.toLocaleString('ja-JP')}点・${ui.gpxRoutes[ui.gpxIndex].elevationStatus==='none'?'標高なし':ui.gpxRoutes[ui.gpxIndex].elevationStatus==='partial'?'標高が一部欠損':'標高あり'}</p><p>走る場所の形状と高低差は下の比較結果に表示します。GPXの距離はファイルの位置点から概算しています。</p></div>`:'<div class="sm-gpx-await">GPXがまだ読み込まれていません。ファイル選択前も時間・走歩の比較は利用できます。</div>'}${ui.notice?`<p class="sm-error" role="alert">${esc(ui.notice)}</p>`:''}</div>`:ui.source==='none'?`<div class="sm-source-detail"><strong>コースを設定していません</strong><p>時間と走歩の仮定から進む距離だけを算術的に比較します。到達地点・残り距離は表示しません。</p></div>`:`<div class="sm-source-detail"><div class="sm-form-grid sm-course-fields"><label class="sm-field"><span class="sm-field-label">保存コースを選ぶ</span><span class="sm-select-wrap"><select data-sm-field="presetId"><option value="">選ばず手動で試す</option>${presets?.ok?presets.records.map(v=>`<option value="${esc(v.id)}" ${v.id===ui.presetId?'selected':''}>${esc(v.data.courseName)}</option>`).join(''):''}</select></span></label>${field('仮のコース距離','distance',ui.distance,'km',{min:'0.1',max:'1000',step:'0.1'})}</div><p class="sm-source-meta">${p?`「${esc(p.data.courseName)}」：${esc(summary.slope)} ／ ${esc(summary.surface)}`:hasPresets?'保存コースは任意です。未選択でも距離を入力して試せます。':'保存コースなしでも使えます。坂道・路面を追加したい場合はコース設計へ。'}</p>${!presets?.ok?`<p class="sm-error" role="alert">${esc(presets?.reason||'保存コースを読み取れません')}</p>`:''}<a href="#/course" class="sm-text-link">コースを設計・編集する ›</a></div>`}
 <p class="sm-note">手動コースには軌跡がなく、地図上の位置は示しません。GPXの場合は位置点と標高を表示しますが、道路・通行可否・身体への負荷の予測は行いません。</p>
 </section>
 <section class="sm-panel">${row('02','「もしも」の走り方を設定','実際に走る速さではなく、計算の前提を入力します。')}
 <div class="sm-two"><div class="sm-inner sm-assumptions"><div class="sm-inner-heading"><span class="sm-detail-icon" aria-hidden="true">◷</span><div><h3>時間とペース</h3><p>2つの案に共通する計算の前提</p></div></div><div class="sm-form-grid">${field('使える時間','budget',ui.budget,'分',{min:'1',max:'600',step:'1',inputmode:'numeric'})}${field('走るペース','runPace',ui.runPace,'分/km',{min:'2',max:'40',step:'0.1'})}</div><label class="sm-full-label"><span class="sm-field-label">過去の実記録を参考にする（任意）</span><span class="sm-select-wrap"><select data-sm-field="recordId"><option value="">選択しない（入力した仮のペース）</option>${eligibleRunningRecords.slice().reverse().map(r=>`<option value="${esc(r.id)}" data-distance-km="${r.distanceKm}" data-duration-seconds="${r.durationSeconds}" ${r.id===ui.recordId?'selected':''}>${esc(r.date)}｜${formatKm(r.distanceKm)}km・${Math.round(r.durationSeconds/60)}分</option>`).join(''):''}</select></span></label><p class="sm-tiny">${record?'ランニング単独の保存記録の平均ペースだけを「走るペース」の参考値として反映します。今回も同じ速度で走れるという予測ではありません。':'未選択・歩行・ジョギング・走歩混在の保存記録は「走るペース」に転用しません。初期値の7分/kmは仮の数値です。'}</p>${!manualRuns?.ok?`<p class="sm-error" role="alert">${esc(manualRuns?.reason||'保存済みの走行記録を読み取れません')}</p>`:''}</div>
 <div class="sm-inner sm-scenarios"><div class="sm-inner-heading"><span class="sm-detail-icon" aria-hidden="true">⇄</span><div><h3>比較する2つのシナリオ</h3><p>同じ時間枠で走り方を変えてみる</p></div></div>
 <article class="sm-scenario sm-a"><div class="sm-scenario-title"><span class="sm-scenario-identity">A</span><div><strong>一定ペース</strong><small>時間枠の間、同じペースで走る仮定</small></div></div><div class="sm-scenario-summary" data-sm-summary-a>${scenarioSummary(ui).a}</div></article>
 <article class="sm-scenario sm-b"><div class="sm-scenario-title"><span class="sm-scenario-identity">B</span><div><strong>走る＋歩く</strong><small>走る区間と歩く区間を繰り返す</small></div></div><div class="sm-form-grid sm-scenario-inputs">${field('走る時間','runMin',ui.runMin,'分',{min:'1',max:'60',step:'1'})}${field('歩く時間','walkMin',ui.walkMin,'分',{min:'1',max:'60',step:'1'})}${field('歩くペース','walkPace',ui.walkPace,'分/km',{min:'2',max:'40',step:'0.1',wide:true})}</div><div class="sm-cycle"><div class="sm-cycle-track" data-sm-cycle-track style="--sm-run-share:${scenarioSummary(ui).pct}"></div><p data-sm-summary-b>${scenarioSummary(ui).b}</p></div></article></div></div>
 </section>
 <section class="sm-panel">${row('03','もしもの結果を見比べる','保存済みの実記録とは異なる、仮の計算結果です。')}<div data-sm-results aria-live="polite">${renderSimulationResults(ui)}</div></section>
 <section class="sm-panel">${row('04','次につなぐ','仮の計算を実際の走行結果と混同しません。')}<div class="sm-actions"><a href="#/record" class="sm-action-primary">実績を手入力する ›</a><a href="#/measurement" class="sm-action-secondary">GPSで実際に測定する ›</a><a href="#/history" class="sm-action-secondary">保存済みの履歴を見る ›</a></div><p class="sm-note">仮のペース・走歩比率を実績へ自動転記しません。実際の距離・時間・活動種別を入力・保存し、単独活動で適格なら結果画面に文献参考値を表示します。混合運動の12部位統合値は算出しません。計画と実績の自動照合は未実装です。</p></section>
 </div>`;
}
export function bindSimulation(root,ui){
 if(!root)return;
 const refresh=()=>{const target=root.querySelector('[data-sm-results]');if(target)target.innerHTML=renderSimulationResults(ui);const summary=scenarioSummary(ui);const a=root.querySelector('[data-sm-summary-a]'),b=root.querySelector('[data-sm-summary-b]'),track=root.querySelector('[data-sm-cycle-track]');if(a)a.textContent=summary.a;if(b)b.textContent=summary.b;if(track)track.style.setProperty('--sm-run-share',summary.pct);};
 root.addEventListener('input',e=>{const key=e.target.dataset.smField;if(!key||!['distance','budget','runPace','walkPace','runMin','walkMin'].includes(key))return;ui[key]=e.target.value;if(key==='distance'&&ui.source==='manual')ui.manualDistance=ui.distance;refresh();});
 root.addEventListener('change',e=>{
  const key=e.target.dataset.smField;
  if(key==='gpsId'){ui.gpsId=e.target.value;ui.needsRedraw=true;root.dispatchEvent(new CustomEvent('sim-redraw',{bubbles:true}));return;}
  if(key==='gpxIndex'){
   const index=Number(e.target.value);
   if(!Number.isInteger(index)||!ui.gpxRoutes[index])return;
   ui.gpxIndex=index;ui.distance=String(ui.gpxRoutes[index].distanceKm);
   root.dispatchEvent(new CustomEvent('sim-redraw',{bubbles:true}));return;
  }
  if(key==='presetId'){
   ui.presetId=e.target.value;
   const val=root.querySelector('.sm-source-meta');
   // No stale summary: host route redraws the selected source from validated store.
   ui.needsRedraw=true;
  }else if(key==='recordId'){
   ui.recordId=e.target.value;
   const selected=e.target.selectedOptions?.[0];
   const distance=Number(selected?.dataset.distanceKm),seconds=Number(selected?.dataset.durationSeconds);
   if(distance>0&&seconds>0)ui.runPace=String(Math.round(seconds/60/distance*100)/100);
  }else return;
  root.dispatchEvent(new CustomEvent('sim-redraw',{bubbles:true}));
 });
 root.addEventListener('change',async e=>{
  if(!e.target.matches('[data-sm-gpx-file]'))return;
  const file=e.target.files?.[0];if(!file)return;
  e.target.disabled=true;
  try{
   const routes=await readGpxFile(file);
   ui.gpxRoutes=routes;ui.gpxIndex=0;ui.gpxName=String(file.name).slice(0,100);ui.distance=String(routes[0].distanceKm);ui.notice='';
  }catch(err){ui.notice='GPXを読み込めません：'+String(err?.message||'ファイルを確認してください').slice(0,160);}
  root.dispatchEvent(new CustomEvent('sim-redraw',{bubbles:true}));
 });
 root.addEventListener('click',e=>{
  const focus=e.target.closest('[data-sm-focus]');
  if(focus){ui.focus=focus.dataset.smFocus;refresh();return;}
  const button=e.target.closest('[data-sm-source]');if(!button)return;
  ui.source=button.dataset.smSource;if(ui.source==='manual')ui.distance=ui.manualDistance||'3.5';if(ui.source==='gps'&&ui.gpsFeature)ui.distance=String(ui.gpsFeature.distanceKm);if(ui.source==='gpx'&&ui.gpxRoutes?.[ui.gpxIndex])ui.distance=String(ui.gpxRoutes[ui.gpxIndex].distanceKm);ui.notice='';root.dispatchEvent(new CustomEvent('sim-redraw',{bubbles:true}));
 });
}
