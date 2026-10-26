// Approved candidate: RunLoad v2 gait / steps. Only edits state.recordDraft;
// no run saving, pedometer calls, scientific calculation, or data migration.
const clean=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const sourceOptions=Object.freeze([
 ["DEVICE_MEASURED","端末計測"], ["ESTIMATED","概数入力"],["UNKNOWN","不明"]]);
const formatOptions=Object.freeze([
 ["UNKNOWN","不明"],["CONTINUOUS_RUN","連続走行"],["RUN_WALK","走行＋歩行"]]);
const parsed=value=>String(value??"").trim()===""?null:Number(value);
const quantity=(v,min,max)=>{const n=parsed(v);return n!==null&&Number.isFinite(n)&&n>=min&&n<=max?n:null};
const fmt=(n,d=1)=>Number(n).toFixed(d);
export const gaitKeys=Object.freeze(["steps","stepsProvenance","runningFormat","runWalkRunningDistanceKm","runWalkRunningDurationMinutes"]);
export function gaitValidation(d={}){
 const errors=[],warnings=[];
 const steps=parsed(d.steps),dist=parsed(d.runWalkRunningDistanceKm),time=parsed(d.runWalkRunningDurationMinutes);
 const fullDist=quantity(d.distance,0.000001,10000);
 const fullMinutes=quantity(d.minutes,0.000001,100000);
 if(steps!==null&&(!Number.isInteger(steps)||steps<0||steps>10000000))errors.push("歩数は0〜10,000,000の整数で入力してください。");
 if(steps!==null&&(d.stepsProvenance||"UNKNOWN")==="UNKNOWN")warnings.push("歩数の取得方法が未設定です。分かる場合は選択してください。");
 if(steps===null&&!(["UNKNOWN", ""].includes(String(d.stepsProvenance??"UNKNOWN"))))warnings.push("取得方法を選択していますが、歩数は未入力です。");
 if(d.runningFormat==="RUN_WALK"){
  if(dist===null||!Number.isFinite(dist)||dist<=0||dist>10000)errors.push("走った距離は0より大きい値を入力してください。");
  else if(fullDist!==null&&dist>fullDist+0.000001)errors.push("走った距離が全体の距離を超えています。");
  if(time===null||!Number.isFinite(time)||time<=0||time>100000)errors.push("走った時間は0より大きい値を入力してください。");
  else if(fullMinutes!==null&&time>fullMinutes+0.000001)errors.push("走った時間が全体の時間を超えています。");
 }
 return {errors,warnings,steps,dist,time,fullDist,fullMinutes,valid:errors.length===0};
}
export function gaitPage(d={}){
 const selectedSource=d.stepsProvenance||"UNKNOWN",selectedFormat=d.runningFormat||"UNKNOWN";
 const chips=sourceOptions.map(([key,label])=>`<button type="button" class="g4-chip" data-g4-source="${key}" aria-pressed="${selectedSource===key}">${label}</button>`).join("");
 const formats=formatOptions.map(([key,label])=>`<button type="button" class="g4-format" data-g4-format="${key}" aria-pressed="${selectedFormat===key}">${label}</button>`).join("");
 const fullDistance=quantity(d.distance,0.000001,10000),fullTime=quantity(d.minutes,0.000001,100000);
 const fullSummary=fullDistance!==null?`${fmt(fullDistance,2)} km`:'距離未入力';
 const timeSummary=fullTime!==null?`${fmt(fullTime,1)} 分`:'時間未入力';
 return `<div class="record-v3 gait-v4" data-g4-page>
  <header class="rv-head"><a href="#/record" class="rv-back" aria-label="記録画面に戻る">‹</a><h1>歩数・走り方</h1></header>
  <p class="g4-intro">必要な情報だけ記録できます。歩数と取得方法を別に扱います。</p>
  <div class="g4-grid">
   <section class="rv-panel g4-panel" aria-labelledby="g4-title-steps">
    <div class="g4-panel-top"><h2 id="g4-title-steps">歩数</h2><small>任意</small></div>
    <label class="g4-label">記録した歩数<span class="g4-step-input"><input data-draft="steps" type="number" inputmode="numeric" min="0" max="10000000" step="1" placeholder="未入力" value="${clean(d.steps)}"><b>歩</b></span></label>
    <p class="g4-field-title">歩数の取得方法</p><div class="g4-choice" role="group" aria-label="歩数の取得方法">${chips}</div>
    <p class="g4-note">端末計測＝スマホ・時計などで計測した値。概数入力＝自分で数えた値や目安。GPSから歩数を推定しません。</p>
   </section>
   <section class="rv-panel g4-panel" aria-labelledby="g4-title-style">
    <div class="g4-panel-top"><h2 id="g4-title-style">走り方</h2><small>任意</small></div>
    <p class="g4-field-title">当日の走行パターン</p><div class="g4-choice" role="group" aria-label="走り方を選択">${formats}</div>
    <div class="g4-runwalk" data-g4-runwalk ${selectedFormat==="RUN_WALK"?"":"hidden"}>
     <h3>走った区間</h3><p class="g4-note">走った部分の距離と時間を記録します。歩行分は走行の分析値に含めません。</p>
     <div class="g4-numbers">
      <label>走った距離<span class="g4-number"><input data-draft="runWalkRunningDistanceKm" type="number" inputmode="decimal" step="0.01" min="0.01" max="10000" placeholder="未入力" value="${clean(d.runWalkRunningDistanceKm)}"><small>km</small></span></label>
      <label>走った時間<span class="g4-number"><input data-draft="runWalkRunningDurationMinutes" type="number" inputmode="decimal" step="0.1" min="0.01" max="100000" placeholder="未入力" value="${clean(d.runWalkRunningDurationMinutes)}"><small>分</small></span></label>
     </div>
     <div data-g4-bar-container class="g4-compare" hidden><div class="g4-bar-title">全体距離に占める走行部分 <strong data-g4-percent>—</strong></div><div class="g4-bar" role="img" aria-label="全体距離に占める走行部分の割合"><span data-g4-run></span><span class="g4-rest"></span></div><div class="g4-bar-legend"><span data-g4-run-text>—</span><span data-g4-other>—</span></div></div>
     <p class="g4-note">残り（差分）は歩行の実測距離ではありません。走る区間と歩く区間の詳細はまだ保存できません。</p>
    </div>
    <p data-g4-issue class="g4-issue" role="alert" hidden></p>
    <div class="g4-summary" aria-label="入力内容の要約">
     <p>記録全体 <strong>${clean(fullSummary)} / ${clean(timeSummary)}</strong></p>
     <p>走り方 <strong data-g4-summary-format>—</strong></p>
     <p>歩数 <strong data-g4-summary-steps>—</strong></p>
    </div>
   </section>
  </div>
  <div class="g4-footer"><p>入力内容は手入力の確認画面に引き継がれます。保存できる項目は確認画面で確かめてください。</p><button type="button" data-g4-apply class="g4-apply">入力内容を反映</button></div>
 </div>`;
}
export function paintGait(page,d={}){
 if(!page)return null;
 const check=gaitValidation(d);
 page.querySelectorAll('[data-g4-source]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.g4Source===(d.stepsProvenance||'UNKNOWN'))));
 page.querySelectorAll('[data-g4-format]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.g4Format===(d.runningFormat||'UNKNOWN'))));
 const isMixed=d.runningFormat==='RUN_WALK';
 page.querySelector('[data-g4-runwalk]').hidden=!isMixed;
 const labels={UNKNOWN:'不明・未設定',CONTINUOUS_RUN:'連続走行',RUN_WALK:'走行＋歩行'};
 page.querySelector('[data-g4-summary-format]').textContent=labels[d.runningFormat]||labels.UNKNOWN;
 const provenance={UNKNOWN:'取得方法不明',DEVICE_MEASURED:'端末・時計で計測',ESTIMATED:'手入力・概数'};
 page.querySelector('[data-g4-summary-steps]').textContent=String(d.steps??'').trim()===''?'未入力':`${d.steps}歩・${provenance[d.stepsProvenance]||provenance.UNKNOWN}`;
 const issue=page.querySelector('[data-g4-issue]');issue.hidden=check.errors.length===0&&check.warnings.length===0;issue.textContent=[...check.errors,...check.warnings].join(' ');
 page.querySelector('[data-g4-apply]').disabled=!check.valid;
 const show=isMixed&&check.fullDist!==null&&check.dist!==null&&Number.isFinite(check.dist)&&check.dist>0&&check.dist<=check.fullDist;
 page.querySelector('[data-g4-bar-container]').hidden=!show;
 if(show){const ratio=check.dist/check.fullDist*100;
  page.querySelector('[data-g4-run]').style.width=`${ratio}%`;
  page.querySelector('[data-g4-percent]').textContent=`${fmt(ratio)}%`;
  page.querySelector('[data-g4-run-text]').textContent=`走行 ${fmt(check.dist,2)} km`;
  page.querySelector('[data-g4-other]').textContent=`残り（差分） ${fmt(check.fullDist-check.dist,2)} km`;
 }
 return check;
}