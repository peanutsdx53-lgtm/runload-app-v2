/* Portable on-device data: no network requests, no legal consent or first-use completion in backups. */
import {MANUAL_RUN_KEY,readManualRuns} from "./manualRunStore.js";
import {CONDITION_KEY,readConditions} from "./homeExperience.js";
import {COURSE_PRESET_KEY,readCoursePresets} from "./coursePresetStore.js";
import {CONDITION_INSIGHTS_KEY,loadConditionInsights} from "./conditionInsights.js";
import {ACTION_INTENT_KEY,loadIntent} from "./actionIntentStore.js";
import {EXPLORATION_NOTE_KEY,makeUi as makeExplorationUi} from "./explorationExperience.js";
import {HOME_DASHBOARD_KEY,loadHomeDashboardLayout} from "./homeDashboardLayout.js";
const PROFILE_KEY="runload-v2-user-profile-v1",DISPLAY_KEY="runload-v2-display-preferences-v1";
import {LEGAL_CONSENT_KEY} from "./legalDocuments.js";
import * as gpsV1 from "./gpsIndexedDbStore.js?v=20261027-gps-backup-v39";
import * as gpsV2 from "./gpsReplayIndexedDbStore.js?v=20261027-measurement-polish-v2";

export const PORTABLE_FORMAT="running-data-portable-backup";
export const PORTABLE_VERSION=1;
export const PORTABLE_MAX_BYTES=80_000_000;
export const RECORD_KEYS=Object.freeze([MANUAL_RUN_KEY,CONDITION_KEY,COURSE_PRESET_KEY,CONDITION_INSIGHTS_KEY,EXPLORATION_NOTE_KEY]);
export const OPTION_KEYS=Object.freeze([ACTION_INTENT_KEY,HOME_DASHBOARD_KEY,PROFILE_KEY,DISPLAY_KEY]);
export const DATA_KEYS=Object.freeze([...RECORD_KEYS,...OPTION_KEYS]);
export const RESET_KEYS=Object.freeze([...DATA_KEYS,LEGAL_CONSENT_KEY,"runload-v2-introduction-preview-v1"]);
const countKey=Object.freeze({
 [MANUAL_RUN_KEY]:"records",[CONDITION_KEY]:null,[COURSE_PRESET_KEY]:"records",
 [CONDITION_INSIGHTS_KEY]:"entries",[EXPLORATION_NOTE_KEY]:null
});
const uidKey=Object.freeze({
 [MANUAL_RUN_KEY]:"id",[CONDITION_KEY]:"date",[COURSE_PRESET_KEY]:"id",
 [CONDITION_INSIGHTS_KEY]:"id",[EXPLORATION_NOTE_KEY]:"id"
});
const limits=Object.freeze({
 [MANUAL_RUN_KEY]:500,[CONDITION_KEY]:366,[COURSE_PRESET_KEY]:50,
 [CONDITION_INSIGHTS_KEY]:80,[EXPLORATION_NOTE_KEY]:50
});
const strictObject=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const encoded=x=>JSON.stringify(x);
const same=(a,b)=>encoded(a)===encoded(b);
const storeFor=(key,raw)=>({getItem:k=>k===key?raw:null,setItem() {},removeItem() {}});
const legalNote="同意記録、利用開始時の案内の完了状態及びブラウザのキャッシュはバックアップに含まれません。";

function checkLocal(key,raw){
 if(raw===null)return {ok:true,data:null,count:0};
 if(typeof raw!=="string"||raw.length>PORTABLE_MAX_BYTES)return {ok:false,reason:"保存データが大きすぎるか、形式が正しくありません"};
 let data;try{data=JSON.parse(raw);}catch{return {ok:false,reason:"保存データを読み取れません"};}
 const storage=storeFor(key,raw);
 if(key===MANUAL_RUN_KEY){if(!readManualRuns(storage).ok)return {ok:false,reason:"手入力の記録形式が正しくありません"};}
 else if(key===CONDITION_KEY){if(!readConditions(storage).canSave)return {ok:false,reason:"体調記録の形式が正しくありません"};}
 else if(key===COURSE_PRESET_KEY){if(!readCoursePresets(storage).ok)return {ok:false,reason:"保存コースの形式が正しくありません"};}
 else if(key===CONDITION_INSIGHTS_KEY){if(!loadConditionInsights(storage).ok)return {ok:false,reason:"振り返りの記録形式が正しくありません"};}
 else if(key===EXPLORATION_NOTE_KEY){
  const n=makeExplorationUi(storage);
  if(!n.canSave||new Set(n.notes.map(x=>x.id)).size!==n.notes.length)return {ok:false,reason:"メモの形式が正しくありません"};
 }
 else if(key===ACTION_INTENT_KEY){if(!loadIntent(storage).ok)return {ok:false,reason:"確認事項の形式が正しくありません"};}
 else if(key===HOME_DASHBOARD_KEY){if(!loadHomeDashboardLayout(storage).canSave)return {ok:false,reason:"ホーム表示設定の形式が正しくありません"};}
 else if(key===PROFILE_KEY){
  if(!strictObject(data)||Object.keys(data).some(k=>!["nickname","purpose","heightCm","weightKg","ageBand"].includes(k))||
   typeof data.nickname!=="string"||data.nickname.length>40||
   !["","health","record","learn","other"].includes(data.purpose)||
   ![data.heightCm,data.weightKg].every((v,i)=>v===null||typeof v==="number"&&Number.isFinite(v)&&v>=(i===0?80:15)&&v<=(i===0?250:400))||
   !["","under18","18-29","30-39","40-49","50-59","60plus"].includes(data.ageBand))
   return {ok:false,reason:"プロフィールの形式が正しくありません"};
 }
 else if(key===DISPLAY_KEY){
  if(!strictObject(data)||Object.keys(data).some(k=>!["textSize","motion"].includes(k))||
   !["standard","large"].includes(data.textSize)||!["system","reduce"].includes(data.motion))
   return {ok:false,reason:"表示設定の形式が正しくありません"};
 }else return {ok:false,reason:"対象外の保存情報です"};
 const field=countKey[key];
 const list=field===null?data:field?data?.[field]:null;
 return {ok:true,data,count:Array.isArray(list)?list.length:(data===null?0:1)};
}
export function inspectLocalStorage(storage){
 if(!storage||typeof storage.getItem!=="function")return {ok:false,reason:"端末の保存領域を利用できません"};
 const local={};const counts={};
 try{
  for(const key of DATA_KEYS){
   const raw=storage.getItem(key);
   const checked=checkLocal(key,raw);
   if(!checked.ok)return {ok:false,reason:checked.reason};
   local[key]=raw;counts[key]=checked.count;
  }
 }catch{return {ok:false,reason:"端末内の保存情報を読み取れません"};}
 return {ok:true,local,counts};
}
function validateEnvelope(o){
 if(!strictObject(o)||o.format!==PORTABLE_FORMAT||o.version!==PORTABLE_VERSION||
  !strictObject(o.local)||typeof o.exportedAt!=="string"||!Number.isFinite(Date.parse(o.exportedAt))||
  Object.keys(o).some(k=>!["format","version","exportedAt","local","gpsLegacy","gpsCurrent"].includes(k))||
  Object.keys(o.local).length!==DATA_KEYS.length||DATA_KEYS.some(k=>!Object.hasOwn(o.local,k))||
  Object.keys(o.local).some(k=>!DATA_KEYS.includes(k))||
  (o.gpsLegacy!==null&&!strictObject(o.gpsLegacy))||
  (o.gpsCurrent!==null&&!strictObject(o.gpsCurrent)))return {ok:false,reason:"バックアップの形式・バージョンが正しくありません"};
 const counts={};
 for(const key of DATA_KEYS){
  const checked=checkLocal(key,o.local[key]);
  if(!checked.ok)return checked;
  counts[key]=checked.count;
 }
 if(o.gpsLegacy!==null){
  const valid=gpsV1.inspectGpsBackup(encoded(o.gpsLegacy));
  if(!valid.ok)return {ok:false,reason:"GPS記録の検証に失敗しました："+valid.reason};
 }
 if(o.gpsCurrent!==null){
  const valid=gpsV2.inspectGpsV2Backup(encoded(o.gpsCurrent));
  if(!valid.ok)return {ok:false,reason:"GPS結果の検証に失敗しました："+valid.reason};
 }
 return {ok:true,data:o,counts,gpsCount:(o.gpsLegacy?.records?.length||0)+(o.gpsCurrent?.summaries?.length||0)};
}
export function inspectPortableBackup(text){
 if(typeof text!=="string"||new Blob([text]).size>PORTABLE_MAX_BYTES)return {ok:false,reason:"80MB以内のJSONファイルを選択してください"};
 let o;try{o=JSON.parse(text);}catch{return {ok:false,reason:"バックアップファイルを読み取れません"};}
 return validateEnvelope(o);
}
export async function exportPortableBackup(storage,{includeGps=false}={}){
 const snap=inspectLocalStorage(storage);if(!snap.ok)return snap;
 let legacy=null,current=null;
 if(includeGps){
  await gpsV1.initializeGpsStore();
  const first=gpsV1.exportGpsBackup();
  if(!first.ok)return {ok:false,reason:"GPS記録を書き出せません："+first.reason};
  const second=await gpsV2.exportGpsV2Backup();
  if(!second.ok)return {ok:false,reason:"GPS結果を書き出せません："+second.reason};
  legacy=JSON.parse(first.text);current=JSON.parse(second.text);
 }
 // All participating tabs use the shared lock, but older tabs might write
 // during a multi-store export. Detect changes across the snapshot read.
 // This cannot guarantee atomicity against non-cooperating writers or GPS
 // IndexedDB changes; never present it as a cross-store transaction.
 const checkedAgain=inspectLocalStorage(storage);
 if(!checkedAgain.ok)return {ok:false,reason:"保存情報の再確認に失敗したため、バックアップを作成しませんでした："+checkedAgain.reason};
 if(DATA_KEYS.some(key=>snap.local[key]!==checkedAgain.local[key]))
  return {ok:false,reason:"バックアップ中に端末の保存情報が変更されました。不整合なファイルを作成しないため中止しました。ほかのタブを閉じてから再試行してください"};
 const data={format:PORTABLE_FORMAT,version:PORTABLE_VERSION,exportedAt:new Date().toISOString(),
  local:snap.local,gpsLegacy:legacy,gpsCurrent:current};
 const text=encoded(data);
 if(text.length>PORTABLE_MAX_BYTES)return {ok:false,reason:"ファイルが80MBを超えます。GPS記録は履歴画面から個別に保存してください"};
 return {ok:true,text,counts:snap.counts,gpsCount:(legacy?.records.length||0)+(current?.summaries.length||0),includesGps:includeGps};
}
function mergeLocal(key,oldRaw,incomingRaw){
 if(incomingRaw===null)return {ok:true,raw:oldRaw,added:0};
 if(oldRaw===null)return {ok:true,raw:incomingRaw,added:checkLocal(key,incomingRaw).count};
 const a=checkLocal(key,oldRaw),b=checkLocal(key,incomingRaw);
 if(!a.ok||!b.ok)return {ok:false,reason:"既存データと復元データを確認できません"};
 if(!Object.hasOwn(uidKey,key)){
  if(!same(a.data,b.data))return {ok:false,reason:"既存の設定内容が異なります。現在の情報を変更せずに中止しました"};
  return {ok:true,raw:oldRaw,added:0};
 }
 const field=countKey[key],id=uidKey[key];
 const prior=field===null?a.data:a.data[field],incoming=field===null?b.data:b.data[field];
 const known=new Map(prior.map(x=>[x[id],x]));
 const add=[];
 for(const item of incoming){
  const old=known.get(item[id]);
  if(old){
   if(!same(old,item))return {ok:false,reason:"同じ記録ID又は日付に異なる内容があります。現在の記録を保護しました"};
  }else{known.set(item[id],item);add.push(item);}
 }
 if(known.size>limits[key])return {ok:false,reason:"復元後の記録件数が上限を超えます"};
 const joined=prior.concat(add);
 const data=field===null?joined:{...a.data,revision:Math.max(a.data.revision,b.data.revision)+1,[field]:joined};
 const raw=encoded(data);
 const verified=checkLocal(key,raw);
 if(!verified.ok)return {ok:false,reason:verified.reason};
 return {ok:true,raw,added:add.length};
}
export function planPortableRestore(storage,text){
 const parsed=inspectPortableBackup(text);if(!parsed.ok)return parsed;
 const existing=inspectLocalStorage(storage);if(!existing.ok)return existing;
 const writes={};const additions={};const before={};
 for(const key of DATA_KEYS){
  const oldRaw=existing.local[key];before[key]=oldRaw;
  const merged=mergeLocal(key,oldRaw,parsed.data.local[key]);
  if(!merged.ok)return {ok:false,reason:merged.reason};
  additions[key]=merged.added;
  if(merged.raw!==oldRaw)writes[key]=merged.raw;
 }
 return {ok:true,parsed,old:before,writes,additions,
  hasExisting:DATA_KEYS.some(k=>existing.local[k]!==null)};
}
const verifyGpsMerge=(incoming,prior,key,limit)=>{
 if(!incoming)return {ok:true,added:0};
 const existing=new Map(prior.map(x=>[x.id,x]));let added=0;
 for(const item of incoming){
  const old=existing.get(item.id);
  if(old&&!same(old,item))return {ok:false,reason:"GPS記録の識別子と内容が一致しません"};
  if(!old){existing.set(item.id,item);added++;}
 }
 if(existing.size>limit)return {ok:false,reason:"GPS記録の件数が上限を超えます"};
 return {ok:true,added};
};
export async function preflightPortableRestore(storage,text){
 const plan=planPortableRestore(storage,text);if(!plan.ok)return plan;
 const {data}=plan.parsed;
 if(data.gpsLegacy){
  await gpsV1.initializeGpsStore();
  const current=gpsV1.exportGpsBackup();
  if(!current.ok)return {ok:false,reason:current.reason};
  const check=verifyGpsMerge(data.gpsLegacy.records,JSON.parse(current.text).records,"id",2000);
  if(!check.ok)return check;
 }
 if(data.gpsCurrent){
  const current=await gpsV2.exportGpsV2Backup();
  if(!current.ok)return {ok:false,reason:current.reason};
  const was=JSON.parse(current.text),incoming=data.gpsCurrent;
  const summaries=verifyGpsMerge(incoming.summaries,was.summaries,"id",2000);
  const details=verifyGpsMerge(incoming.details,was.details,"id",2000);
  if(!summaries.ok)return summaries;if(!details.ok)return details;
 }
 return {...plan,hasExisting:plan.hasExisting||!!(data.gpsLegacy&&gpsV1.readGpsRuns().records.length)||
  !!(data.gpsCurrent&&(await gpsV2.readGpsV2Summaries()).records?.length)};
}
export async function restorePortableBackup(storage,text){
 const plan=await preflightPortableRestore(storage,text);if(!plan.ok)return plan;
 const {data}=plan.parsed;
 // Local Storage is reversible within the same operation. IndexedDB imports add-only:
 // a later failure cannot overwrite or remove the user's original records.
 // Track attempted writes BEFORE setItem: a storage adapter may write and then
 // throw, or a post-write verification may fail. Both paths need rollback.
 // A non-cooperating writer can still race this operation: do not overwrite
 // unexpected values during rollback or claim cross-tab atomicity.
 const attempted=[];
 let concurrentChange=false;
 try{
  for(const [key,next] of Object.entries(plan.writes)){
   if(storage.getItem(key)!==plan.old[key]){
    concurrentChange=true;
    throw Error("保存中に記録が変更されました");
   }
   attempted.push({key,next});
   storage.setItem(key,next);
   if(storage.getItem(key)!==next)throw Error("保存後のデータを検証できません");
  }
 }catch(e){
  let reverted=true;
  for(const {key,next} of attempted.reverse()){
   try{
    const observed=storage.getItem(key);
    if(observed===plan.old[key])continue;
    if(observed!==next){
     // An unknown value may belong to another writer; never clobber it.
     reverted=false;continue;
    }
    if(plan.old[key]===null)storage.removeItem(key);
    else storage.setItem(key,plan.old[key]);
    if(storage.getItem(key)!==plan.old[key])reverted=false;
   }catch{reverted=false;}
  }
  const unchanged=reverted&&!concurrentChange;
  return {ok:false,partial:!unchanged,
   reason:unchanged?"復元を中止し、今回の書込みを変更前の状態に戻しました":
    "復元を中止しました。別の変更または復旧できない保存状態がある可能性があります。記録を再読込し、バックアップと照合してください"};
 }
 const stages=[];
 if(data.gpsLegacy){
  const r=await gpsV1.importGpsBackup(encoded(data.gpsLegacy));
  if(!r.ok)return {ok:false,partial:true,reason:"GPS記録の復元に失敗しました。手入力等の保存は完了している場合があります："+r.reason};
  stages.push("GPS記録 "+r.added+"件");
 }
 if(data.gpsCurrent){
  const r=await gpsV2.importGpsV2Backup(encoded(data.gpsCurrent));
  if(!r.ok)return {ok:false,partial:true,reason:"GPS結果の復元に失敗しました。それ以前の復元は完了している場合があります："+r.reason};
  stages.push("GPS結果 "+r.added+"件");
 }
 return {ok:true,localAdded:Object.values(plan.additions).reduce((a,b)=>a+b,0),stages,
  reason:"復元が完了しました。表示を更新して記録を確認してください"};
}
export async function removeAllPortableData(storage){
 if(!storage||typeof storage.removeItem!=="function")return {ok:false,reason:"保存領域を利用できません"};
 // Clearing IndexedDB uses transactions confined to the app's own databases.
 const v1=await gpsV1.clearGpsRuns();
 if(!v1.ok)return {ok:false,reason:"GPS記録を削除できません："+v1.reason};
 const v2=await gpsV2.clearGpsV2Runs();
 if(!v2.ok)return {ok:false,partial:true,reason:"GPS結果を削除できません。GPS記録の一部は既に削除されています："+v2.reason};
 let failed=[];
 for(const key of RESET_KEYS){
  try{storage.removeItem(key);if(storage.getItem(key)!==null)failed.push(key);}catch{failed.push(key);}
 }
 return failed.length?{ok:false,partial:true,reason:"一部のデータが削除できませんでした。ブラウザの保存領域を確認してください"}:
  {ok:true,reason:"このアプリの記録と設定を削除しました。ダウンロードしたファイルやブラウザのキャッシュは別途管理してください"};
}
export const BACKUP_NOTICE=legalNote;
