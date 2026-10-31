/* GPS v2: opt-in replay details. Legacy gpsRuns database is never opened for writes.
 * One transaction contains v2 summary and optional route/speed/flag detail.
 */
import {prepareGpsRun,GPS_RECORD_LIMIT} from './gpsMeasurementStore.js';
import {estimateGpsEnergy} from './gpsEnergyDisplay.js';
import {checkReplayPoints,evaluateGpsReplayReference} from './gpsReplayReference.js';
export const GPS_V2_DB='runload-v2-gps-dynamic-v2';
export const GPS_V2_SUMMARIES='summaries',GPS_V2_DETAILS='details';
export const GPS_V2_BACKUP_FORMAT='runload-gps-v2-backup';
const good=n=>typeof n==='number'&&Number.isFinite(n);
const plain=x=>JSON.parse(JSON.stringify(x));
const finite=(x,lo,hi)=>good(x)&&x>=lo&&x<=hi;
const FAIL='GPSの保存領域を安全に処理できません。既存の記録は変更していません';
const RESULT_LIMIT=2000;
let opening=null;
const completion=tx=>new Promise((resolve,reject)=>{
 tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||Error('ABORT'));tx.onerror=()=>reject(tx.error||Error('TRANSACTION'));
});
const result=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('REQUEST'));});
function database(){
 if(typeof globalThis.indexedDB?.open!=='function')return Promise.reject(Error('INDEXED_DB_UNAVAILABLE'));
 if(opening)return opening;
 const pending=new Promise((resolve,reject)=>{
  let request,settled=false;
  const timer=setTimeout(()=>fail(Error('GPS_DB_TIMEOUT')),7000);
  function fail(error){if(settled)return;settled=true;clearTimeout(timer);reject(error);}
  try{request=globalThis.indexedDB.open(GPS_V2_DB,1);}catch(e){fail(e);return;}
  request.onupgradeneeded=()=>{
   try{const db=request.result;
    if(!db.objectStoreNames.contains(GPS_V2_SUMMARIES))db.createObjectStore(GPS_V2_SUMMARIES,{keyPath:'id'});
    if(!db.objectStoreNames.contains(GPS_V2_DETAILS))db.createObjectStore(GPS_V2_DETAILS,{keyPath:'id'});
   }catch(e){fail(e);}
  };
  request.onerror=()=>fail(request.error||Error('OPEN'));
  request.onblocked=()=>fail(Error('BLOCKED'));
  request.onsuccess=()=>{
   const db=request.result;
   if(settled){db.close();return;}
   settled=true;clearTimeout(timer);
   db.onversionchange=()=>{db.close();opening=null;};
   resolve(db);
  };
 });
 const guarded=pending.catch(err=>{if(opening===guarded)opening=null;throw err;});
 opening=guarded;return guarded;
}
const allowedActivity=a=>['RUNNING','JOGGING','WALK','MIXED'].includes(a);
/** Optional self-report saved with GPS identity; not GPS-measured evidence.
 * Older v2 summaries without this field remain valid and unchanged. */
const validGpsRof=x=>x===null||(Number.isInteger(x)&&x>=0&&x<=10);
const validCaptured=x=>x===null||(typeof x==='string'&&x.length<=40&&Number.isFinite(Date.parse(x))&&new Date(x).toISOString()===x);
export function validGpsExperience(e){
 return !!e&&e.source==='USER_REPORTED'&&validGpsRof(e.rofBefore)&&validGpsRof(e.rofAfter)&&
 validCaptured(e.beforeCapturedAt)&&validCaptured(e.afterCapturedAt)&&
 (e.rofBefore!==null||e.beforeCapturedAt===null)&&
 (e.rofAfter!==null||e.afterCapturedAt===null)&&
 typeof e.memo==='string'&&e.memo.length<=500&&
 Object.keys(e).sort().join(',')==='afterCapturedAt,beforeCapturedAt,memo,rofAfter,rofBefore,source';
}
export function prepareGpsExperience(x){
 if(x===undefined||x===null)return {ok:true,experience:null};
 const e={source:'USER_REPORTED',rofBefore:x.rofBefore??null,rofAfter:x.rofAfter??null,
  beforeCapturedAt:x.beforeCapturedAt??null,afterCapturedAt:x.afterCapturedAt??null,
  memo:x.memo??''};
 return validGpsExperience(e)?{ok:true,experience:e}:{ok:false,reason:'GPSの疲労感・本人メモの内容を確認してください'};
}
export function validGpsV2Summary(s){
 return !!s&&s.schema===2&&/^gps-v2-[0-9a-z-]{8,64}$/.test(s.id)
  &&/^\d{4}-\d{2}-\d{2}$/.test(s.date)&&allowedActivity(s.activity)
  &&finite(s.distanceKm,.01,1000)&&finite(s.activeSeconds,1,1e6)
  &&finite(s.accepted,2,1e7)&&finite(s.rejected,0,1e7)
  &&typeof s.createdAt==='string'&&typeof s.detailSaved==='boolean'
  &&(s.experience===undefined||validGpsExperience(s.experience))
  &&s.finalReference&&typeof s.finalReference==='object'
  &&Array.isArray(s.finalReference.regions)&&s.finalReference.regions.length===12;
}
const validRoutePoint=p=>p&&finite(p.lat,-90,90)&&finite(p.lon,-180,180)
 &&finite(p.km,0,1000)&&Number.isSafeInteger(p.t)&&p.t>0
 &&typeof p.breakBefore==='boolean';
const validFlag=f=>f&&/^flag-[0-9a-z-]{5,64}$/.test(f.id)
 &&Number.isSafeInteger(f.t)&&f.t>0&&finite(f.km,0,1000)
 &&finite(f.lat,-90,90)&&finite(f.lon,-180,180)
 &&(f.activeMs===undefined||(Number.isSafeInteger(f.activeMs)&&f.activeMs>=0))
 &&typeof f.note==='string'&&f.note.length<=240;
export function validGpsV2Detail(d){
 return !!d&&/^gps-v2-[0-9a-z-]{8,64}$/.test(d.id)&&d.schema===2
 &&Array.isArray(d.route)&&d.route.length>=2&&d.route.length<=2000
 &&d.route.every(validRoutePoint)
 &&Array.isArray(d.speedPoints)&&checkReplayPoints(d.speedPoints).ok
 &&Array.isArray(d.flags)&&d.flags.length<=500&&d.flags.every(validFlag)
 &&typeof d.trackSimplified==='boolean';
}
const shortRows=rows=>rows.map(r=>({
 regionId:r.regionId,value:r.calculationState==='CALCULATED'&&good(r.value)?r.value:null,
 calculationState:r.calculationState,reasonCode:r.reasonCode||null
}));
export function prepareGpsV2Run(session,{saveDetails=false,date=new Date().toISOString().slice(0,10),experience=null}={}){
 const subjective=prepareGpsExperience(experience);
 if(!subjective.ok)return subjective;
 const checked=prepareGpsRun(session,{saveRoute:saveDetails,date});
 if(!checked.ok)return checked;
 const old=checked.record;
 const id='gps-v2-'+(globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2));
 const avg=old.distanceKm*1000/old.activeSeconds;
 const ref=evaluateGpsReplayReference({activity:old.activity,speedMps:avg});
 const energy=estimateGpsEnergy(session);
 const summary={schema:2,id,activity:old.activity,date:old.date,createdAt:old.createdAt,
  ...(subjective.experience?{experience:subjective.experience}:{}),
  distanceKm:old.distanceKm,activeSeconds:old.activeSeconds,accepted:old.accepted,
  rejected:old.rejected,detailSaved:saveDetails,
  energyEstimate:energy.ok?energy:null,
  finalReference:{state:ref.state,speedMps:avg,modelVersion:ref.modelVersion||null,
   semanticVersion:ref.semanticVersion||null,source:ref.source||null,
   regions:ref.rows.length?shortRows(ref.rows):Array.from({length:12},(_,i)=>({
    regionId:'R'+String(i+1).padStart(2,'0'),value:null,
    calculationState:'NOT_CALCULABLE',reasonCode:ref.state
   }))}
 };
 if(!validGpsV2Summary(summary))return {ok:false,reason:'保存する概要情報が不正です'};
 if(!saveDetails)return {ok:true,summary,detail:null};
 if(session.replayTrackAvailable!==true||!Array.isArray(session.replayTrack))
  return {ok:false,reason:'速度時系列を完全に記録できなかったため詳細保存できません'};
 if(!checkReplayPoints(session.replayTrack).ok
    ||Math.abs(session.replayTrack.at(-1).km-old.distanceKm)>.00011)
  return {ok:false,reason:'速度時系列が不完全です。詳細保存を中止しました'};
 const flags=Array.isArray(session.flags)?session.flags:[];
 const detail={schema:2,id,route:old.track.map(p=>({
  lat:p.lat,lon:p.lon,km:p.km,t:p.t,breakBefore:p.breakBefore,
  ele:p.ele,altitudeAccuracy:p.altitudeAccuracy,altitudeQuality:p.altitudeQuality,activity:p.activity
 })),speedPoints:session.replayTrack.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore,...(p.activeMs===undefined?{}:{activeMs:p.activeMs})})),
  flags:flags.map(f=>({id:f.id,t:f.t,km:f.km,lat:f.lat,lon:f.lon,note:f.note||'',...(f.activeMs===undefined?{}:{activeMs:f.activeMs})})),
  trackSimplified:old.trackSimplified
 };
 if(!validGpsV2Detail(detail))return {ok:false,reason:'詳細データが不正です'};
 return {ok:true,summary,detail};
}
export async function readGpsV2Summaries(){
 try{
  const db=await database(),tx=db.transaction(GPS_V2_SUMMARIES,'readonly'),done=completion(tx);
  const records=await result(tx.objectStore(GPS_V2_SUMMARIES).getAll());await done;
  if(!Array.isArray(records)||records.length>RESULT_LIMIT||!records.every(validGpsV2Summary))
   return {ok:false,reason:FAIL,records:[]};
  return {ok:true,records:records.sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id))};
 }catch{return {ok:false,reason:FAIL,records:[]};}
}
export async function readGpsV2Detail(id){
 if(typeof id!=='string'||!/^gps-v2-/.test(id))return {ok:false,reason:'INVALID_ID'};
 try{
  const db=await database(),tx=db.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readonly'),done=completion(tx);
  const summary=await result(tx.objectStore(GPS_V2_SUMMARIES).get(id));
  const detail=await result(tx.objectStore(GPS_V2_DETAILS).get(id));
  await done;
  if(!validGpsV2Summary(summary)||!summary.detailSaved||!validGpsV2Detail(detail))
   return {ok:false,reason:'動的結果の保存データを確認できません'};
  return {ok:true,summary,detail};
 }catch{return {ok:false,reason:FAIL};}
}
export async function saveGpsV2Run(session,options={}){
 const candidate=prepareGpsV2Run(session,options);
 if(!candidate.ok)return candidate;
 try{
  const db=await database(),tx=db.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readwrite'),done=completion(tx);
  const store=tx.objectStore(GPS_V2_SUMMARIES);
  const count=await result(store.count());
  if(count>=GPS_RECORD_LIMIT){tx.abort();await done.catch(()=>{});return {ok:false,reason:'GPS記録の上限（2000件）に達しました'};}
  store.add(candidate.summary);
  if(candidate.detail)tx.objectStore(GPS_V2_DETAILS).add(candidate.detail);
  await done;
  return {ok:true,summary:candidate.summary};
 }catch{return {ok:false,reason:FAIL};}
}
export async function deleteGpsV2Run(id){
 try{
  const db=await database(),tx=db.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readwrite'),done=completion(tx);
  const found=await result(tx.objectStore(GPS_V2_SUMMARIES).get(id));
  if(!validGpsV2Summary(found)){tx.abort();await done.catch(()=>{});return {ok:false,reason:'記録がありません'};}
  tx.objectStore(GPS_V2_SUMMARIES).delete(id);
  tx.objectStore(GPS_V2_DETAILS).delete(id);
  await done;return {ok:true};
 }catch{return {ok:false,reason:FAIL};}
}
export async function exportGpsV2Backup(){
 const listing=await readGpsV2Summaries();if(!listing.ok)return listing;
 try{
  const db=await database(),tx=db.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readonly'),done=completion(tx);
  const summaries=await result(tx.objectStore(GPS_V2_SUMMARIES).getAll());
  const details=await result(tx.objectStore(GPS_V2_DETAILS).getAll());await done;
  if(!summaries.every(validGpsV2Summary)||!details.every(validGpsV2Detail)||
   !summaries.every(s=>s.detailSaved===details.some(d=>d.id===s.id)))
   return {ok:false,reason:FAIL};
  const text=JSON.stringify({format:GPS_V2_BACKUP_FORMAT,version:2,summaries,details});
  if(text.length>50_000_000)return {ok:false,reason:'バックアップが50MBを超えています。分割保存が必要です'};
  return {ok:true,text,count:summaries.length,detailCount:details.length};
 }catch{return {ok:false,reason:FAIL};}
}
export function inspectGpsV2Backup(text){
 if(typeof text!=='string'||text.length>50_000_000)return {ok:false,reason:'50MB以内のJSONを選んでください'};
 let data;try{data=JSON.parse(text);}catch{return {ok:false,reason:'バックアップを読み取れません'};}
 if(data?.format!==GPS_V2_BACKUP_FORMAT||data.version!==2||!Array.isArray(data.summaries)||
    !Array.isArray(data.details)||data.summaries.length>GPS_RECORD_LIMIT||
    !data.summaries.every(validGpsV2Summary)||!data.details.every(validGpsV2Detail))
  return {ok:false,reason:'バックアップ形式が不正です'};
 const keys=new Set(data.summaries.map(x=>x.id));
 const dkeys=new Set(data.details.map(x=>x.id));
 if(keys.size!==data.summaries.length||dkeys.size!==data.details.length||
    !data.details.every(d=>keys.has(d.id))||!data.summaries.every(s=>s.detailSaved===dkeys.has(s.id)))
  return {ok:false,reason:'バックアップ内の記録IDに重複・不整合があります'};
 return {ok:true,summaries:data.summaries,details:data.details,count:data.summaries.length,detailCount:data.details.length};
}
export async function importGpsV2Backup(text){
 const data=inspectGpsV2Backup(text);if(!data.ok)return data;
 try{
  const db=await database(),tx=db.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readwrite'),done=completion(tx);
  const s=tx.objectStore(GPS_V2_SUMMARIES),d=tx.objectStore(GPS_V2_DETAILS);
  const existing=await result(s.getAll()),details=await result(d.getAll());
  const prior=new Map(existing.map(x=>[x.id,x])),priorD=new Map(details.map(x=>[x.id,x]));
  const incoming=new Map(data.details.map(x=>[x.id,x]));
  const added=data.summaries.filter(x=>!prior.has(x.id));
  if(existing.length+added.length>RESULT_LIMIT||data.summaries.some(x=>prior.has(x.id)&&(
     JSON.stringify(prior.get(x.id))!==JSON.stringify(x)||
     (x.detailSaved&&JSON.stringify(priorD.get(x.id))!==JSON.stringify(incoming.get(x.id)))))){
   tx.abort();await done.catch(()=>{});return {ok:false,reason:'件数上限または同一IDの内容競合があります'};
  }
  for(const x of added){s.add(x);if(x.detailSaved)d.add(incoming.get(x.id));}
  await done;return {ok:true,added:added.length,skipped:data.summaries.length-added.length};
 }catch{return {ok:false,reason:FAIL};}
}

/** Reuse a saved v2 route in the existing simulation course interface. */
export function gpsV2DetailToFeature(summary,detail){
 if(!validGpsV2Summary(summary)||!summary.detailSaved||!validGpsV2Detail(detail)||detail.id!==summary.id)return null;
 const segments=[];let group=[];
 for(const p of detail.route){
  if(p.breakBefore&&group.length){segments.push(group);group=[];}
  group.push({lat:p.lat,lon:p.lon,km:p.km,ele:p.ele??null,altitudeAccuracy:p.altitudeAccuracy??null,altitudeQuality:p.altitudeQuality??'missing'});
 }if(group.length)segments.push(group);
 const ele=detail.route.filter(p=>Number.isFinite(p.ele)).length;
 return {kind:'gps',name:summary.date+'・GPS保存コース',segments,distanceKm:summary.distanceKm,
  points:detail.route.length,elevationPoints:ele,elevationStatus:ele?'partial':'none',
  gapCount:Math.max(0,segments.length-1),simplified:detail.trackSimplified};
}

export async function clearGpsV2Runs(){
 try{
  const db=await database(),tx=db.transaction([GPS_V2_SUMMARIES,GPS_V2_DETAILS],'readwrite'),done=completion(tx);
  tx.objectStore(GPS_V2_SUMMARIES).clear();
  tx.objectStore(GPS_V2_DETAILS).clear();
  await done;
  return {ok:true};
 }catch{return {ok:false,reason:'GPS結果の削除に失敗しました'};}
}
