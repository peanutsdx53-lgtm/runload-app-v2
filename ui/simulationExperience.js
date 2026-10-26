/* RunLoad What-if V32: descriptive, client-only arithmetic. No V4/ROF or predictive training model. */
import {courseSummary,initialCourseUi} from './recordExperience.js';
export const SIMULATION_VERSION='32.0';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
export const newSimulationUi=()=>({source:'manual',presetId:'',recordId:'',distance:'3.5',budget:'30',runPace:'7',walkPace:'12',runMin:'5',walkMin:'2',focus:'a',notice:''});
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
 if(num(distance,.1,1000)===null||num(runPace,2,40)===null)return null;
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
 const goal=s.source==='none'?null:String(s.distance).trim()===''?null:Number(s.distance);
 if(s.source!=='none'&&(num(goal,.1,1000)===null))return {ok:false,reason:'仮のコース距離は0.1〜1000kmで入力してください'};
 return {ok:true,budget,goal,a:{...a,finish:goal===null?null:reachTime(goal,'steady',runPace,walkPace,runMin,walkMin)},b:{...b,finish:goal===null?null:reachTime(goal,'mixed',runPace,walkPace,runMin,walkMin)},diff:a.distanceKm-b.distanceKm};
}
export function courseDescription(preset){
 if(!preset?.data)return {slope:'コース未選択',surface:'コース未選択'};
 const summary=courseSummary(preset.data,initialCourseUi(preset.data));
 return {slope:summary.slope,surface:summary.surface};
}
const formatKm=d=>Number(d).toFixed(2);
const formatMin=m=>m===null?'—':`${(Math.round(m*10)/10).toLocaleString('ja-JP',{maximumFractionDigits:1})}分`;
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
 return `<div class="sm-results-grid">${card('a',a,'一定ペース')}${card('b',b,'走る＋歩く')}</div>
 <div class="sm-comparison-note"><strong>比較で分かること</strong><p>${budget}分間、入力したペースが変わらないと仮定すると、Aは${formatKm(a.distanceKm)}km、Bは${formatKm(b.distanceKm)}kmです。進行距離の差は${formatKm(Math.abs(c.diff))}kmです。${goal===null?'コースが未設定なので、地図上の位置・残り距離は表示しません。':'実際の道路上の到達地点は不明です。手動設定だけでは位置・坂道の順序を特定できません。'}</p></div>
 <p class="sm-limits">これは入力した速度が続くと仮定した<strong>算術上の結果</strong>です。実際の疲労・走行能力・傷害リスク・12部位の身体負荷を予測しません。歩きの方が速い設定も禁止しませんが、現実的な仮定か本人が確認してください。</p>`;
}
const row=(n,title,subtitle)=>`<div class="sm-step-head"><span class="sm-number">${n}</span><div><h2>${title}</h2><p>${subtitle}</p></div></div>`;
export function renderSimulation(ui,{presets,manualRuns}={}){
 const hasPresets=presets?.ok&&presets.records.length>0;
 const p=presets?.ok?presets.records.find(r=>r.id===ui.presetId):null;
 const summary=courseDescription(p);
 const record=manualRuns?.ok?manualRuns.records.find(r=>r.id===ui.recordId):null;
 return `<div class="sm-page" data-sim-page>
 <header class="sm-heading"><a class="sm-back" href="#/home" aria-label="ホームへ戻る">‹</a><div><span>WHAT IF / RUNLOAD</span><h1>走りのシミュレーション</h1><p>「仮にこう走るなら？」を、時間と距離の違いから考える</p></div></header>
 <div class="sm-steps" aria-label="操作の順序"><span>01 コース</span><span>02 仮の走り方</span><span>03 比較結果</span><span>04 次につなぐ</span></div>
 <section class="sm-panel" aria-labelledby="sm-s1">${row('01','コースを用意する','GPS・GPXがなくても条件を試せます。')}
 <div class="sm-source-row" role="group" aria-label="コースの入力方法"><button type="button" data-sm-source="manual" aria-pressed="${ui.source==='manual'}" class="${ui.source==='manual'?'is-picked':''}">手動・保存コース<small>利用できます</small></button><button type="button" data-sm-source="none" aria-pressed="${ui.source==='none'}" class="${ui.source==='none'?'is-picked':''}">コースなし<small>時間だけ試す</small></button><button disabled type="button" title="GPS軌跡の保存接続後に利用できます">GPS実走履歴<small>今後接続</small></button><button disabled type="button" title="GPX読込は次の工程で接続します">GPX読込<small>次工程</small></button></div>
 ${ui.source==='none'?`<div class="sm-source-detail"><strong>コースを設定していません</strong><p>時間と走歩の仮定から進む距離だけを算術的に比較します。到達地点・残り距離は表示しません。</p></div>`:`<div class="sm-source-detail"><div class="sm-form-grid"><label>保存コースを選ぶ<select data-sm-field="presetId"><option value="">選ばず手動で試す</option>${presets?.ok?presets.records.map(v=>`<option value="${esc(v.id)}" ${v.id===ui.presetId?'selected':''}>${esc(v.data.courseName)}</option>`).join(''):''}</select></label><label>仮のコース距離（km）<input data-sm-field="distance" type="number" min="0.1" max="1000" step="0.1" inputmode="decimal" value="${esc(ui.distance)}"></label></div><p class="sm-source-meta">${p?`「${esc(p.data.courseName)}」：${esc(summary.slope)} ／ ${esc(summary.surface)}`:hasPresets?'保存コースは任意です。未選択でも距離を入力して試せます。':'保存コースなしでも使えます。坂道・路面を追加したい場合はコース設計へ。'}</p>${!presets?.ok?`<p class="sm-error" role="alert">${esc(presets?.reason||'保存コースを読み取れません')}</p>`:''}<a href="#/course" class="sm-text-link">コースを設計・編集する ›</a></div>`}
 <p class="sm-note">手動コースの坂道・路面は本人の設定内容です。軌跡・標高を収集したことにはならないため、地図上の到達地点や架空の標高グラフは表示しません。</p>
 </section>
 <section class="sm-panel">${row('02','「もしも」の走り方を設定','実際に走る速さではなく、計算の前提を入力します。')}
 <div class="sm-two"><div class="sm-inner"><h3>時間と走行ペース</h3><div class="sm-form-grid"><label>使える時間（分）<input data-sm-field="budget" type="number" min="1" max="600" step="1" inputmode="numeric" value="${esc(ui.budget)}"></label><label>走るペース（分/km）<input data-sm-field="runPace" type="number" min="2" max="40" step="0.1" inputmode="decimal" value="${esc(ui.runPace)}"></label></div><label class="sm-full-label">実際の記録を仮定の参考にする<select data-sm-field="recordId"><option value="">選択しない（入力した仮のペース）</option>${manualRuns?.ok?manualRuns.records.slice().reverse().map(r=>`<option value="${esc(r.id)}" data-distance-km="${r.distanceKm}" data-duration-seconds="${r.durationSeconds}" ${r.id===ui.recordId?'selected':''}>${esc(r.date)}｜${formatKm(r.distanceKm)}km・${Math.round(r.durationSeconds/60)}分</option>`).join(''):''}</select></label><p class="sm-tiny">${record?'保存記録の平均ペースを「走るペース」の初期値として反映できます。今回も同じ速度で走れるという予測ではありません。':'初期値の7分/kmは仮の数値です。本人の走行データではありません。'}</p>${!manualRuns?.ok?`<p class="sm-error" role="alert">${esc(manualRuns?.reason||'保存済みの走行記録を読み取れません')}</p>`:''}</div><div class="sm-inner"><h3>比較する2つのシナリオ</h3><div class="sm-scenario sm-a"><b>A｜一定ペース</b><p>入力したペースで時間枠の間ずっと走る場合</p></div><div class="sm-scenario sm-b"><b>B｜走る＋歩く</b><div class="sm-form-grid"><label>走る時間（分）<input data-sm-field="runMin" type="number" min="1" max="60" step="1" value="${esc(ui.runMin)}"></label><label>歩く時間（分）<input data-sm-field="walkMin" type="number" min="1" max="60" step="1" value="${esc(ui.walkMin)}"></label><label>歩くペース（分/km）<input data-sm-field="walkPace" type="number" min="2" max="40" step="0.1" value="${esc(ui.walkPace)}"></label></div></div></div></div>
 </section>
 <section class="sm-panel">${row('03','もしもの結果を見比べる','保存済みの実記録とは異なる、仮の計算結果です。')}<div data-sm-results aria-live="polite">${renderSimulationResults(ui)}</div></section>
 <section class="sm-panel">${row('04','次につなぐ','仮の計算を実際の走行結果と混同しません。')}<div class="sm-actions"><a href="#/record" class="sm-action-primary">実際の走行を記録する ›</a><a href="#/history" class="sm-action-secondary">保存済みの履歴を見る ›</a></div><p class="sm-note">この画面ではシナリオを保存していません。GPS実走軌跡・GPX・計画と実績の照合は、後続の実装で接続します。</p></section>
 </div>`;
}
export function bindSimulation(root,ui){
 if(!root)return;
 const refresh=()=>{const target=root.querySelector('[data-sm-results]');if(target)target.innerHTML=renderSimulationResults(ui);};
 root.addEventListener('input',e=>{const key=e.target.dataset.smField;if(!key||!['distance','budget','runPace','walkPace','runMin','walkMin'].includes(key))return;ui[key]=e.target.value;refresh();});
 root.addEventListener('change',e=>{
  const key=e.target.dataset.smField;
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
 root.addEventListener('click',e=>{const button=e.target.closest('[data-sm-source]');if(!button)return;ui.source=button.dataset.smSource;root.dispatchEvent(new CustomEvent('sim-redraw',{bubbles:true}));});
}
