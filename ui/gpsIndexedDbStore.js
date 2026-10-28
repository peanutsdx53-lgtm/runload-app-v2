/* Durable origin-local GPS records: IndexedDB with atomic, validated writes.
 * The original research v2 project has no prior retained GPS runs to migrate.
 */
import {prepareGpsRun,isValidGpsRecord,GPS_RECORD_LIMIT,gpsRecordToFeature} from './gpsMeasurementStore.js';
export {gpsRecordToFeature};
export const GPS_DB_NAME='runload-v2-gps-measurements-v1',GPS_DB_STORE='gpsRuns';
export const GPS_BACKUP_FORMAT='runload-gps-backup';
export const GPS_BACKUP_MAX_CHARS=50_000_000; // roughly 50 MB of ASCII GPS coordinates
const readError='GPS保存領域を安全に読み取れません。既存記録は変更しません';
const saveError='GPS記録を保存できませんでした。既存記録は変更されません';
let opening=null,cache={ok:false,reason:'GPS保存領域を確認しています',records:[]};
const errorResult=reason=>({ok:false,reason,records:[]});
const requestResult=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IDB request failed'));});
const completed=tx=>new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('IDB transaction failed'));tx.onabort=()=>reject(tx.error||Error('IDB transaction aborted'));});
function openDatabase(){
 if(!globalThis.indexedDB)return Promise.reject(Error('IndexedDB unavailable'));
 if(opening)return opening;
 const requestPromise=new Promise((resolve,reject)=>{
  let req,settled=false;
  const clock=setTimeout(()=>{if(!settled){settled=true;reject(Error('IDB timed out'))}},7000);
  const fail=e=>{if(settled)return;settled=true;clearTimeout(clock);reject(e)};
  try{req=globalThis.indexedDB.open(GPS_DB_NAME,1);}catch(e){fail(e);return;}
  req.onupgradeneeded=()=>{try{if(!req.result.objectStoreNames.contains(GPS_DB_STORE))req.result.createObjectStore(GPS_DB_STORE,{keyPath:'id'});}catch(e){fail(e)}};
  req.onerror=()=>fail(req.error||Error('IDB open failed'));
  req.onblocked=()=>fail(Error('IDB upgrade blocked'));
  req.onsuccess=()=>{
   const db=req.result;if(settled){db.close();return;}
   settled=true;clearTimeout(clock);
   db.onversionchange=()=>{db.close();opening=null;cache=errorResult('GPS保存領域が変更されました。アプリを開き直してください');};
   resolve(db);
  };
 });
 const guard=requestPromise.catch(err=>{if(opening===guard)opening=null;throw err;});
 opening=guard;return guard;
}
const sorted=rs=>rs.slice().sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
export const readGpsRuns=()=>({ok:cache.ok,reason:cache.reason,records:cache.records.slice()});
export async function reloadGpsRuns(){
 try{
  const db=await openDatabase(),tx=db.transaction(GPS_DB_STORE,'readonly'),done=completed(tx),rs=await requestResult(tx.objectStore(GPS_DB_STORE).getAll());
  await done;
  if(!Array.isArray(rs)||rs.length>GPS_RECORD_LIMIT||!rs.every(isValidGpsRecord))throw Error('corrupt GPS record');
  cache={ok:true,records:sorted(rs)};
 }catch{cache=errorResult(readError);}
 return readGpsRuns();
}
export const initializeGpsStore=reloadGpsRuns;
export async function saveGpsRun(session,options={}){
 const prepared=prepareGpsRun(session,options);if(!prepared.ok)return prepared;
 if(!cache.ok)return {ok:false,reason:cache.reason||saveError};
 try{
  const db=await openDatabase(),tx=db.transaction(GPS_DB_STORE,'readwrite'),done=completed(tx),store=tx.objectStore(GPS_DB_STORE),current=await requestResult(store.getAll());
  if(!Array.isArray(current)||current.length>=GPS_RECORD_LIMIT||!current.every(isValidGpsRecord)){
   tx.abort();await done.catch(()=>{});
   return {ok:false,reason:current?.length>=GPS_RECORD_LIMIT?'GPS記録の上限（2000件）に達しました':readError};
  }
  store.add(prepared.record);await done;
  cache={ok:true,records:sorted([...current,prepared.record])};
  return {ok:true,record:prepared.record};
 }catch{return {ok:false,reason:saveError};}
}
export async function removeGpsRun(id){
 if(!cache.ok)return {ok:false,reason:cache.reason||readError};
 try{
  const db=await openDatabase(),tx=db.transaction(GPS_DB_STORE,'readwrite'),done=completed(tx),store=tx.objectStore(GPS_DB_STORE),current=await requestResult(store.getAll());
  if(!Array.isArray(current)||!current.every(isValidGpsRecord)){tx.abort();await done.catch(()=>{});return {ok:false,reason:readError};}
  const key=String(id||'');
  if(!current.some(r=>r.id===key)){tx.abort();await done.catch(()=>{});return {ok:false,reason:'削除対象のGPS記録が見つかりません'};}
  store.delete(key);await done;
  cache={ok:true,records:sorted(current.filter(r=>r.id!==key))};
  return {ok:true};
 }catch{return {ok:false,reason:'GPS記録を削除できませんでした。既存記録は変更されません'};}
}

/* User-controlled GPS backup; the file is unencrypted and may include precise
 * home/work route coordinates. Nothing is uploaded to a third-party service.
 */
export function createGpsBackupText(records){
 if(!Array.isArray(records)||records.length>GPS_RECORD_LIMIT||!records.every(isValidGpsRecord))
  return {ok:false,reason:'GPSバックアップに含まれる記録を検証できません'};
 const ids=new Set(records.map(r=>r.id));
 if(ids.size!==records.length)return {ok:false,reason:'GPS記録のIDが重複しているため書き出せません'};
 const text=JSON.stringify({format:GPS_BACKUP_FORMAT,version:1,exportedAt:new Date().toISOString(),records});
 if(text.length>GPS_BACKUP_MAX_CHARS)return {ok:false,reason:'GPSバックアップが50MBの上限を超えています'};
 return {ok:true,text,count:records.length,routeCount:records.filter(r=>r.track.length>0).length};
}
export function exportGpsBackup(){
 if(!cache.ok)return {ok:false,reason:cache.reason||readError};
 return createGpsBackupText(cache.records);
}
export function inspectGpsBackup(text){
 if(typeof text!=='string'||text.length>GPS_BACKUP_MAX_CHARS)
  return {ok:false,reason:'50MB以内のGPSバックアップJSONを選択してください'};
 let obj;
 try{obj=JSON.parse(text);}catch{return {ok:false,reason:'GPSバックアップのJSONを読み取れません'}}
 if(obj?.format!==GPS_BACKUP_FORMAT||obj.version!==1||!Array.isArray(obj.records)||
    obj.records.length>GPS_RECORD_LIMIT||!obj.records.every(isValidGpsRecord))
  return {ok:false,reason:'GPSバックアップの形式または記録内容が不正です'};
 const ids=obj.records.map(r=>r.id);
 if(new Set(ids).size!==ids.length)return {ok:false,reason:'同じGPS記録IDが複数含まれています'};
 return {ok:true,records:obj.records,count:obj.records.length,routeCount:obj.records.filter(r=>r.track.length>0).length};
}
export async function importGpsBackup(text){
 const checked=inspectGpsBackup(text);
 if(!checked.ok)return checked;
 if(!cache.ok)return {ok:false,reason:cache.reason||readError};
 try{
  const db=await openDatabase(),tx=db.transaction(GPS_DB_STORE,'readwrite'),done=completed(tx),
   store=tx.objectStore(GPS_DB_STORE),current=await requestResult(store.getAll());
  if(!Array.isArray(current)||current.length>GPS_RECORD_LIMIT||!current.every(isValidGpsRecord)){
   tx.abort();await done.catch(()=>{});
   return {ok:false,reason:readError};
  }
  const byId=new Map(current.map(r=>[r.id,r]));
  const additions=[];
  let skipped=0;
  for(const incoming of checked.records){
   const prior=byId.get(incoming.id);
   if(prior){
    if(JSON.stringify(prior)!==JSON.stringify(incoming)){
     tx.abort();await done.catch(()=>{});
     return {ok:false,reason:'同じIDで内容の異なるGPS記録があります。既存記録は変更しません'};
    }
    skipped++;
   }else{
    additions.push(incoming);byId.set(incoming.id,incoming);
   }
  }
  if(byId.size>GPS_RECORD_LIMIT){
   tx.abort();await done.catch(()=>{});
   return {ok:false,reason:'復元後のGPS記録が2000件の上限を超えます'};
  }
  for(const item of additions)store.add(item);
  await done;
  cache={ok:true,records:sorted([...current,...additions])};
  return {ok:true,added:additions.length,skipped};
 }catch{return {ok:false,reason:'GPSバックアップの復元に失敗しました。既存記録は変更されません'}}
}

export async function clearGpsRuns(){
 try{
  const db=await openDatabase(),tx=db.transaction(GPS_DB_STORE,'readwrite'),done=completed(tx);
  tx.objectStore(GPS_DB_STORE).clear();
  await done;
  cache={ok:true,records:[]};
  return {ok:true};
 }catch{return {ok:false,reason:'GPS記録の削除に失敗しました'};}
}
