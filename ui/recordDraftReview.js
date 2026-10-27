// RunLoad v2 record presentation validation — UI advice only.
// The authoritative runload-app scientific engine and record schema are NOT replaced.
// Empty strings are missing values, never coerced to observed zero.
const nonblank=value=>value!==null&&value!==undefined&&String(value).trim()!=="";
const n=value=>nonblank(value)?Number(value):null;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const range=(value,min,max,errors,name)=>{const x=n(value);if(x!==null&&(!finite(x)||x<min||x>max))errors.push(name+"の入力値を確認してください");return x};
const surfaceKeys=["paved","track","treadmill","soil","trail","naturalGrass","artificialTurf","sand"];
export const legacyRecordDraftFields=Object.freeze(["distance","hours","minutes","seconds","date","rofBefore","rofAfter","steps","stepsProvenance","activityGait","runningFormat","runWalkRunningDistanceKm","runWalkRunningDurationMinutes","courseName","gradeMode","surfaceMode","primarySurface","upPercent","downPercent","upGradePercent","downGradePercent","temperatureC","environmentNote","bodyObservation","shoeName","memo",...surfaceKeys.map(k=>"surface"+k),...Array.from({length:5},(_,i)=>["sectionShare"+i,"sectionDirection"+i,"sectionGrade"+i,"sectionSurface"+i]).flat()]);
// Compare mixed running phases with measured totals, never calculate a mixed load.
export function checkRunWalkBounds(d={}){
 if(d.runningFormat!=='RUN_WALK')return [];
 const errors=[],value=k=>nonblank(d[k])&&Number.isFinite(Number(d[k]))?Number(d[k]):null;
 const total=value('distance'),running=value('runWalkRunningDistanceKm');
 if(total!==null&&total>0&&running!==null&&running>=total-1e-9)errors.push('走った距離は全体の距離より小さくしてください（歩いた距離も必要です）');
 const parts=['hours','minutes','seconds'];
 if(parts.some(k=>nonblank(d[k]))){
  const numbers=parts.map(k=>nonblank(d[k])?value(k):0);
  if(numbers.every(x=>x!==null&&x>=0)){
   const totalSeconds=numbers[0]*3600+numbers[1]*60+numbers[2],runningMinutes=value('runWalkRunningDurationMinutes');
   if(totalSeconds>0&&runningMinutes!==null&&runningMinutes*60>=totalSeconds-1e-6)errors.push('走った時間は全体の時間より短くしてください（歩いた時間も必要です）');
  }
 }
 return errors;
}
/** Required fields for NEW manual runs only.
 * Keeps historical UNKNOWN-activity snapshots readable; this gate must only be
 * applied to new saves, not readManualRuns/validRecord.
 */
export function checkManualRequiredFields(d={}){
 const errors=[],fields={distance:false,time:false,activity:false};
 const distanceText=String(d.distance??'').trim();
 if(!distanceText)errors.push('距離を入力してください（必須）');
 else if(!Number.isFinite(Number(distanceText))||Number(distanceText)<=0||Number(distanceText)>10000)
  errors.push('距離は0より大きい有効な値で入力してください');
 else fields.distance=true;
 const timeFields=['hours','minutes','seconds'];
 const hasTime=timeFields.some(k=>nonblank(d[k]));
 if(!hasTime)errors.push('時間を入力してください（必須）');
 else{
  const values=timeFields.map(k=>nonblank(d[k])?Number(d[k]):0);
  const duration=values[0]*3600+values[1]*60+values[2];
  if(values.some(n=>!Number.isFinite(n)||n<0)||!Number.isFinite(duration)||
     duration<=0||Math.round(duration)<1||Math.round(duration)>6000000)
   errors.push('時間は0より大きい有効な値で入力してください');
  else fields.time=true;
 }
 if(!['RUNNING','JOGGING','WALK'].includes(d.activityGait))
  errors.push('活動種目を選択してください（必須）');
 else fields.activity=true;
 return {ok:errors.length===0,errors,fields};
}
export function checkRecordDraft(d={},isRun=true){
 const errors=[],warnings=[];
 if(!['','UNKNOWN','RUNNING','JOGGING','WALK'].includes(String(d.activityGait??'UNKNOWN')))errors.push('活動種別の値を確認してください');
 if(!isRun)return {errors,warnings,ready:true}; // Rest uses a separate record contract.
 range(d.distance,0,10000,errors,"距離");
 range(d.hours,0,10000,errors,"時間（時）");
 range(d.minutes,0,100000,errors,"時間（分）");
 range(d.seconds,0,59,errors,"時間（秒）");
 const steps=range(d.steps,0,10000000,errors,"歩数");
 if(steps!==null&&!Number.isInteger(steps))errors.push("歩数は整数で入力してください");
 if(steps!==null&&String(d.stepsProvenance||"UNKNOWN")==="UNKNOWN")warnings.push("歩数を入力した場合は取得方法も選んでください");
 if(steps===null&&!["","UNKNOWN"].includes(String(d.stepsProvenance??"UNKNOWN")))warnings.push("歩数の取得方法を選択していますが歩数が未入力です");
 const temp=range(d.temperatureC,-50,60,errors,"気温");
 if(d.runningFormat==="RUN_WALK"){
  errors.push(...checkRunWalkBounds(d));
  for(const [key,label] of [["runWalkRunningDistanceKm","走った距離"],["runWalkRunningDurationMinutes","走った時間"]]){
   const x=range(d[key],0.01,100000,errors,label);
   if(x===null)errors.push("走歩混在のときは"+label+"を入力してください");
  }
 }
 if(d.gradeMode==="SUMMARY"){
  const up=range(d.upPercent,0,100,errors,"上りの割合"),down=range(d.downPercent,0,100,errors,"下りの割合");
  if(up!==null&&down!==null&&up+down>100.001)errors.push("上り・下りの割合は合計100%以下にしてください");
  range(d.upGradePercent,0,100,errors,"上りの傾斜");
  range(d.downGradePercent,0,100,errors,"下りの傾斜");
 }
 if(d.gradeMode==="SECTIONS"){
  const vals=Array.from({length:5},(_,i)=>range(d["sectionShare"+i],0,100,errors,"区間"+(i+1)+"の割合"));
  if(!vals.some(v=>v!==null))warnings.push("区間ごとの割合が未入力です");
  else if(Math.abs(vals.reduce((a,b)=>a+(b??0),0)-100)>0.01)errors.push("区間ごとの割合は合計100%にしてください");
  for(let i=0;i<5;i++)range(d["sectionGrade"+i],0,100,errors,"区間"+(i+1)+"の傾斜");
 }
 if(d.surfaceMode==="SINGLE"&&!d.primarySurface)warnings.push("路面を1種類選択してください");
 if(d.surfaceMode==="MIXED"){
  const vals=surfaceKeys.map(k=>range(d["surface"+k],0,100,errors,k+"の路面割合"));
  if(!vals.some(v=>v!==null))warnings.push("複数路面の割合が未入力です");
  else if(Math.abs(vals.reduce((a,b)=>a+(b??0),0)-100)>0.01)errors.push("路面の割合は合計100%にしてください");
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],ready:errors.length===0};
}