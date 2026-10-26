/* Explicit, independent GPS record store. Never alter manual-runs-v1 or V4 engine. */
import {GPS_ACTIVITY,GPS_LIMITS} from './gpsMeasurementCore.js';
export const GPS_RUN_KEY='runload-v2-gps-runs-v1';
const validNum=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const validPoint=p=>p&&validNum(p.lat,-90,90)&&validNum(p.lon,-180,180)&&validNum(p.km,0,1000)&&validNum(p.t,1,9e15)&&(p.ele===null||validNum(p.ele,-12000,9000))&&typeof p.breakBefore==='boolean'&&['RUNNING','JOGGING','WALK'].includes(p.activity);
const validRecord=r=>r&&/^gps-v1-[a-z0-9-]{8,45}$/.test(r.id)&&GPS_ACTIVITY[r.activity]&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&validNum(r.distanceKm,.01,1000)&&validNum(r.activeSeconds,1,1e6)&&Array.isArray(r.track)&&r.track.length<=GPS_LIMITS.maxTrack&&r.track.every(validPoint)&&validNum(r.accepted,2,1e7)&&validNum(r.rejected,0,1e7)&&typeof r.createdAt==='string';
const get=s=>s.getItem(GPS_RUN_KEY);
export function readGpsRuns(storage){
 try{
  if(!storage||typeof storage.getItem!=='function')return {ok:false,reason:'端末保存領域を使用できません',records:[]};
  const raw=get(storage);if(raw===null)return {ok:true,records:[]};
  if(raw.length>2400000)throw Error('size');
  const parsed=JSON.parse(raw);
  if(parsed?.version!==1||!Array.isArray(parsed.records)||parsed.records.length>150||!parsed.records.every(validRecord))throw Error('schema');
  return {ok:true,records:parsed.records};
 }catch{return {ok:false,reason:'GPS保存データを安全に読み取れません。既存データは変更しません',records:[]};}
}
export function saveGpsRun(storage,session,{saveRoute=false,date=new Date().toISOString().slice(0,10)}={}){
 const prev=readGpsRuns(storage);if(!prev.ok)return prev;
 if(!session||session.phase!=='finished'||!GPS_ACTIVITY[session.activity])return {ok:false,reason:'測定終了後に保存してください'};
 const secs=Math.round(session.elapsedMs/1000),km=session.distanceM/1000;
 if(!(km>=.01&&km<=1000&&secs>=1&&secs<=1e6&&session.accepted>=2))return {ok:false,reason:'GPSの有効な距離が10m以上必要です'};
 const source=saveRoute?session.track:[],track=[];
 for(let i=0;i<source.length;i+=Math.max(1,Math.ceil(source.length/2000))){const p=source[i];if(!validPoint(p))return {ok:false,reason:'位置情報が不正です'};track.push({lat:p.lat,lon:p.lon,ele:p.ele,km:p.km,t:p.t,breakBefore:p.breakBefore,activity:p.activity});}
 const record={id:`gps-v1-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`,date,createdAt:new Date().toISOString(),activity:session.activity,distanceKm:Number(km.toFixed(4)),activeSeconds:secs,accepted:session.accepted,rejected:session.rejected,track};
 if(!validRecord(record))return {ok:false,reason:'GPS記録を安全に保存できません'};
 if(prev.records.length>=150)return {ok:false,reason:'GPS保存の上限に達しました（150件）'};
 try{const serialized=JSON.stringify({version:1,records:[...prev.records,record]});if(serialized.length>2400000)return {ok:false,reason:'GPS記録の保存容量が上限です。過去の記録を整理してください'};storage.setItem(GPS_RUN_KEY,serialized);return {ok:true,record};}
 catch{return {ok:false,reason:'端末の保存容量が足りません。既存記録は変更されません'};}
}
export function removeGpsRun(storage,id){const prev=readGpsRuns(storage);if(!prev.ok)return prev;try{storage.setItem(GPS_RUN_KEY,JSON.stringify({version:1,records:prev.records.filter(r=>r.id!==id)}));return {ok:true};}catch{return {ok:false,reason:'削除できませんでした'};}}
export function gpsRecordToFeature(record){
 if(!validRecord(record)||record.track.length<2)return null;
 const segments=[];let segment=[];for(const p of record.track){if(p.breakBefore&&segment.length){segments.push(segment);segment=[];}segment.push({lat:p.lat,lon:p.lon,ele:p.ele,km:p.km});}if(segment.length)segments.push(segment);
 const length=record.track.at(-1).km,elevationPoints=record.track.filter(p=>p.ele!==null).length;
 if(!validNum(length,.01,1000))return null;
 return {name:`${record.date}・${GPS_ACTIVITY[record.activity]}`,kind:'gps',segments,distanceKm:length,points:record.track.length,elevationPoints,elevationStatus:elevationPoints===0?'none':elevationPoints===record.track.length?'complete':'partial',gapCount:segments.length-1};
}
