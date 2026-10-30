/** Descriptive comparison of two independently saved manual activity records.
 * Values are recorded facts, not physiological predictions or causal findings.
 * This module NEVER edits the run store or recomputes research reference data.
 */
const ELIGIBLE_GAITS=new Set(['RUNNING','JOGGING','WALK']);
const round=(value,digits=2)=>Number(value.toFixed(digits));
export const isComparableManualRun=r=>!!r&&r.schema===2&&r.source==='manual'&&r.type==='run'&&
 typeof r.id==='string'&&/^run-v1-[0-9a-f-]{36}$/.test(r.id)&&
 /^\d{4}-\d{2}-\d{2}$/.test(r.date||'')&&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&
 Number.isInteger(r.durationSeconds)&&r.durationSeconds>0;
export const gaitOf=r=>r?.draft?.activityGait||'UNKNOWN';
export const comparableRunChoices=(read,currentId)=>read?.ok===true&&Array.isArray(read.records)?
 read.records.filter(r=>isComparableManualRun(r)&&r.id!==currentId)
  .sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)):[];
const fatigue=n=>Number.isInteger(n)&&n>=0&&n<=10?n:null;
const paceSeconds=r=>Math.round(r.durationSeconds/r.distanceKm);
const paceText=seconds=>`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} 分/km`;
const durationText=r=>`${(r.durationSeconds/60).toFixed(1)} 分`;
const distanceText=r=>`${r.distanceKm.toFixed(2)} km`;
const makeRow=(key,label,first,second,change,unit)=>({key,label,first,second,change,unit});
export function compareSavedRuns(current,other){
 if(!isComparableManualRun(current)||!isComparableManualRun(other))
  return {status:'unavailable',reason:'保存済みの手入力記録を安全に確認できません'};
 if(current.id===other.id)return {status:'same-record',reason:'異なる2件の記録を選んでください'};
 const a=gaitOf(current),b=gaitOf(other);
 if(!ELIGIBLE_GAITS.has(a)||a!==b)
  return {status:'incompatible',reason:'活動種別が不明または異なります。距離や時間を無条件に同じ走行として比較しません'};
 const beforeA=fatigue(other.rofBefore),beforeB=fatigue(current.rofBefore);
 const afterA=fatigue(other.rofAfter),afterB=fatigue(current.rofAfter);
 const rows=[
  makeRow('distance','距離',distanceText(other),distanceText(current),round(current.distanceKm-other.distanceKm), 'km'),
  makeRow('duration','経過時間',durationText(other),durationText(current),round((current.durationSeconds-other.durationSeconds)/60,1),'分'),
  makeRow('pace','平均ペース',paceText(paceSeconds(other)),paceText(paceSeconds(current)),round((paceSeconds(current)-paceSeconds(other))/60,2),'分/km'),
  makeRow('rofBefore','運動前に感じた疲れ',beforeA===null?'未回答':String(beforeA),beforeB===null?'未回答':String(beforeB),beforeA!==null&&beforeB!==null?beforeB-beforeA:null,'点'),
  makeRow('rofAfter','運動後に感じた疲れ',afterA===null?'未回答':String(afterA),afterB===null?'未回答':String(afterB),afterA!==null&&afterB!==null?afterB-afterA:null,'点')
 ];
 return {status:'ready',current,other,gait:a,rows,
  uncertainty:'この表は入力した走行の事実と本人が回答した疲労感の記録間の差です。ROF-Jの回答操作時刻・本人申告の評価時刻があっても運動開始・終了との前後関係を実測で確認していないため、同じ記録内の時間的な前後変化量は判定しません。差が生じた原因、能力の向上、身体負荷や安全性は判断できません。文献参考値は測定量や適用条件が異なるため、この表では混ぜません。'};
}
