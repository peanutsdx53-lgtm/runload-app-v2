/* RunLoad v2: local manual-run saved-record contract V1.
 * This is NOT the legacy scientific-engine store and never runs a biomechanical calculation.
 * Source and persistence status are explicit; GPS previews / drafts cannot be saved as runs.
 */
import {checkRecordDraft,checkManualRequiredFields,legacyRecordDraftFields} from './recordDraftReview.js';
import {secondsFromDraft} from './recordReviewExperience.js';
export const MANUAL_RUN_KEY='runload-v2-manual-runs-v1';
const MAX_RECORDS=500, MAX_CHARS=600;
const isoDate=s=>{
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const [y,m,d]=s.split('-').map(Number),v=new Date(Date.UTC(y,m-1,d));
 return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d;
};
const cleanString=(v,max=MAX_CHARS)=>typeof v==='string'&&v.length<=max?v:null;
const nullable=(v,min,max)=>v===null||(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max);
const rof=v=>v===null||(Number.isInteger(v)&&v>=0&&v<=10);
const allowed=new Set(legacyRecordDraftFields);
const validSnapshot=(draft)=>{
 if(!draft||typeof draft!=='object'||Array.isArray(draft))return false;
 if(Object.keys(draft).some(k=>!allowed.has(k)))return false;
 return Object.entries(draft).every(([k,v])=>v===null||typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=MAX_CHARS);
};
const validRecord=r=>{
 if(!r||typeof r!=='object'||Array.isArray(r))return false;
 if(typeof r.id!=='string'||!/^run-v1-[0-9a-f-]{36}$/.test(r.id))return false;
 if(r.source!=='manual'||r.type!=='run'||r.schema!==1||!isoDate(r.date))return false;
 if(typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))return false;
 if(!nullable(r.distanceKm,0.01,10000)||r.distanceKm===null)return false;
 if(!Number.isInteger(r.durationSeconds)||r.durationSeconds<1||r.durationSeconds>6000000)return false;
 if(!rof(r.rofBefore)||!rof(r.rofAfter)||!nullable(r.steps,0,10000000)||r.steps!==null&&!Number.isInteger(r.steps))return false;
 if(!['courseName','shoeName','memo'].every(k=>cleanString(r[k],k==='memo'?MAX_CHARS:100)!==null))return false;
 if(!validSnapshot(r.draft))return false;
 return r.draft.date===r.date&&Number(r.draft.distance)===r.distanceKm&&secondsFromDraft(r.draft)===r.durationSeconds;
};
export function readManualRuns(storage){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')
  return {ok:false,reason:'この端末の保存領域を使用できません',records:[],revision:0};
 try{
  const raw=storage.getItem(MANUAL_RUN_KEY);
  if(raw===null)return {ok:true,records:[],revision:0};
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||
   !Array.isArray(data.records)||data.records.length>MAX_RECORDS||!data.records.every(validRecord)||
   new Set(data.records.map(r=>r.id)).size!==data.records.length)
   throw Error('invalid');
  return {ok:true,records:data.records,revision:data.revision};
 }catch{return {ok:false,reason:'保存済み走行記録を安全に読み取れません。元のデータは変更しません',records:[],revision:0};}
}
export function validateManualRunDraft(draft,{source='manual',type='run'}={}){
 if(source!=='manual'||type!=='run')return {ok:false,reason:'この保存方式は手入力の走行記録に限ります'};
 if(!draft||typeof draft!=='object')return {ok:false,reason:'入力を読み取れません'};
 const required=checkManualRequiredFields(draft);
 if(!required.ok)return {ok:false,reason:required.errors.join('、'),fields:required.fields};
 const audit=checkRecordDraft(draft,true);
 if(audit.errors.length)return {ok:false,reason:audit.errors.join('、')};
 if(!isoDate(draft.date))return {ok:false,reason:'実在する日付を入力してください'};
 const distance=Number(draft.distance),seconds=secondsFromDraft(draft);
 if(String(draft.distance??'').trim()===''||!Number.isFinite(distance)||distance<=0||distance>10000||
  seconds===null||!Number.isInteger(seconds)||seconds>6000000)
   return {ok:false,reason:'距離・時間が正しく入力されていません'};
 if(['courseName','shoeName'].some(k=>String(draft[k]??'').length>100))
  return {ok:false,reason:'コース名とシューズ名は100文字以内で入力してください。入力内容は変更していません'};
 const snapshot={};
 for(const key of legacyRecordDraftFields){
  const v=draft[key];
  if(v===null) {snapshot[key]=null;continue;}
  if(v===undefined){snapshot[key]='';continue;}
  const string=String(v);
  if(string.length>MAX_CHARS)return {ok:false,reason:'文字数が上限を超える項目があります'};
  snapshot[key]=string;
 }
 for(const k of ['rofBefore','rofAfter']){
  const value=draft[k];
  const x=value==null||value===''?null:Number(value);
  if(!rof(x))return {ok:false,reason:'運動前後の疲労感は0〜10で記録してください'};
 }
 const step=draft.steps==null||String(draft.steps).trim()===''?null:Number(draft.steps);
 if(!nullable(step,0,10000000)||step!==null&&!Number.isInteger(step))return {ok:false,reason:'歩数は整数で入力してください'};
 const cleaned={
  date:draft.date,distanceKm:distance,durationSeconds:seconds,
  rofBefore:draft.rofBefore==null||draft.rofBefore===''?null:Number(draft.rofBefore),
  rofAfter:draft.rofAfter==null||draft.rofAfter===''?null:Number(draft.rofAfter),
  steps:step,
  courseName:String(draft.courseName??'').slice(0,100),
  shoeName:String(draft.shoeName??'').slice(0,100),
  memo:String(draft.memo??'').slice(0,MAX_CHARS),
  draft:snapshot
 };
 return {ok:true,value:cleaned,warnings:audit.warnings};
}
export function saveManualRun(storage,draft,options={}){
 const checked=validateManualRunDraft(draft,options);
 if(!checked.ok)return checked;
 const previous=readManualRuns(storage);
 if(!previous.ok)return previous;
 if(previous.records.length>=MAX_RECORDS)return {ok:false,reason:'この端末の保存件数の上限に達しました'};
 const uuid=globalThis.crypto?.randomUUID?.();
 if(!uuid)return {ok:false,reason:'安全な記録IDを生成できないため保存を中止しました'};
 const createdAt=new Date().toISOString();
 const item={...checked.value,id:'run-v1-'+uuid,source:'manual',type:'run',schema:1,createdAt};
 try{
  const old=storage.getItem(MANUAL_RUN_KEY);
  const current=readManualRuns(storage);
  if(!current.ok||current.revision!==previous.revision||storage.getItem(MANUAL_RUN_KEY)!==old)
   return {ok:false,reason:'保存領域が変更されたため、再確認してから保存してください'};
  const payload=JSON.stringify({version:1,revision:previous.revision+1,records:[...previous.records,item]});
  storage.setItem(MANUAL_RUN_KEY,payload);
  if(storage.getItem(MANUAL_RUN_KEY)!==payload)
   return {ok:false,reason:'保存後のデータ照合に失敗しました'};
  return {ok:true,record:item};
 }catch{return {ok:false,reason:'保存できませんでした。入力内容は画面に残っています'};}
}
/** User-directed classification of an existing UNKNOWN-activity manual run.
 * Do not infer gait from speed, title, or distance. Preserve its ID and all
 * measurements. This does not convert mixed RUN_WALK into a single activity.
 */
export function classifySavedManualRun(storage,id,activityGait){
 if(!['RUNNING','JOGGING','WALK'].includes(activityGait))return {ok:false,reason:'活動種別を選択してください'};
 if(typeof id!=='string'||!/^run-v1-[0-9a-f-]{36}$/.test(id))return {ok:false,reason:'記録IDが正しくありません'};
 const before=readManualRuns(storage);
 if(!before.ok)return before;
 const original=before.records.find(r=>r.id===id);
 if(!original)return {ok:false,reason:'対象の走行記録が見つかりません'};
 if(!['','UNKNOWN'].includes(String(original.draft?.activityGait??'UNKNOWN')))
  return {ok:false,reason:'この記録にはすでに活動種別が設定されています'};
 // Even explicitly choosing a gait cannot authorize a RUN_WALK reference.
 const updated={...original,draft:{...original.draft,activityGait}};
 if(!validRecord(updated))return {ok:false,reason:'変更後の記録を検証できません'};
 try{
  const oldRaw=storage.getItem(MANUAL_RUN_KEY);
  const current=readManualRuns(storage);
  if(!current.ok||current.revision!==before.revision||storage.getItem(MANUAL_RUN_KEY)!==oldRaw)
   return {ok:false,reason:'保存領域が変更されたため、もう一度確認してください'};
  const records=before.records.map(r=>r.id===id?updated:r);
  const next=JSON.stringify({version:1,revision:before.revision+1,records});
  storage.setItem(MANUAL_RUN_KEY,next);
  if(storage.getItem(MANUAL_RUN_KEY)!==next)
   return {ok:false,reason:'更新後の記録を照合できません'};
  return {ok:true,record:updated};
 }catch{return {ok:false,reason:'この端末の記録を更新できませんでした'};}
}
export function findManualRun(storage,id){
 const read=readManualRuns(storage);
 return !read.ok?read:{ok:true,record:read.records.find(r=>r.id===id)||null};
}
export function toHistoryRows(readResult){
 if(!readResult?.ok)return [];
 return readResult.records.map(r=>({id:r.id,type:r.type,date:r.date,time:'',distanceKm:r.distanceKm,
  durationSeconds:r.durationSeconds,courseName:r.courseName,shoeName:r.shoeName,
  memo:r.memo,rofBefore:r.rofBefore,rofAfter:r.rofAfter}));
}
