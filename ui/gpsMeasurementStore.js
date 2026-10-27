/* Versioned, pure GPS record contract. Persistence belongs to gpsIndexedDbStore.js. */
import {GPS_ACTIVITY,GPS_LIMITS,GPS_ALTITUDE_QUALITY} from './gpsMeasurementCore.js';
export const GPS_RECORD_LIMIT=2000;
const validNum=(x,min,max)=>typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max;
const validPoint=p=>p&&validNum(p.lat,-90,90)&&validNum(p.lon,-180,180)&&validNum(p.km,0,1000)&&validNum(p.t,1,9e15)&&(p.ele===null||validNum(p.ele,-12000,9000))&&(p.altitudeAccuracy===null||validNum(p.altitudeAccuracy,0,1e6))&&GPS_ALTITUDE_QUALITY.includes(p.altitudeQuality)&&(p.altitudeQuality==='usable'?(p.ele!==null&&p.altitudeAccuracy!==null&&p.altitudeAccuracy<=GPS_LIMITS.altitudeAccuracyM):p.ele===null)&&typeof p.breakBefore==='boolean'&&['RUNNING','JOGGING','WALK'].includes(p.activity);
export const isValidGpsRecord=r=>r&&/^gps-v1-[a-z0-9-]{8,45}$/.test(r.id)&&GPS_ACTIVITY[r.activity]&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&validNum(r.distanceKm,.01,1000)&&validNum(r.activeSeconds,1,1e6)&&Array.isArray(r.track)&&r.track.length<=GPS_LIMITS.maxTrack&&r.track.every(validPoint)&&(r.trackSimplified===undefined||typeof r.trackSimplified==='boolean')&&(r.track.length===0||Math.abs(r.track.at(-1).km-r.distanceKm)<=0.00011)&&r.track.every((p,i)=>i===0||(p.t>r.track[i-1].t&&p.km>=r.track[i-1].km))&&validNum(r.accepted,2,1e7)&&validNum(r.rejected,0,1e7)&&typeof r.createdAt==='string';
export function prepareGpsRun(session,{saveRoute=false,date=new Date().toISOString().slice(0,10)}={}){
 if(!session||session.phase!=='finished'||!GPS_ACTIVITY[session.activity])return {ok:false,reason:'測定終了後に保存してください'};
 const secs=Math.round(session.elapsedMs/1000),km=session.distanceM/1000;
 if(!(km>=.01&&km<=1000&&secs>=1&&secs<=1e6&&session.accepted>=2))return {ok:false,reason:'GPSの有効な距離が10m以上必要です'};
 const source=saveRoute?session.track:[],track=[];
 if(!Array.isArray(source))return {ok:false,reason:'位置情報が不正です'};
 for(const p of source){
  if(!validPoint(p))return {ok:false,reason:'位置情報が不正です'};
  track.push({lat:p.lat,lon:p.lon,ele:p.ele,altitudeAccuracy:p.altitudeAccuracy,altitudeQuality:p.altitudeQuality,km:p.km,t:p.t,breakBefore:p.breakBefore,activity:p.activity});
 }
 if(track.length&&Math.abs(track.at(-1).km-km)>0.00011)return {ok:false,reason:'GPS軌跡の終点と測定距離が一致しません。保存を中止しました'};
 const record={id:`gps-v1-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`,date,createdAt:new Date().toISOString(),activity:session.activity,distanceKm:Number(km.toFixed(4)),activeSeconds:secs,accepted:session.accepted,rejected:session.rejected,track,trackSimplified:!!(saveRoute&&session.trackSimplified)};
 return isValidGpsRecord(record)?{ok:true,record}:{ok:false,reason:'GPS記録を安全に保存できません'};
}
export function gpsRecordToFeature(record){
 if(!isValidGpsRecord(record)||record.track.length<2)return null;
 const segments=[];let segment=[];for(const p of record.track){if(p.breakBefore&&segment.length){segments.push(segment);segment=[];}segment.push({lat:p.lat,lon:p.lon,ele:p.ele,km:p.km,altitudeAccuracy:p.altitudeAccuracy,altitudeQuality:p.altitudeQuality});}if(segment.length)segments.push(segment);
 const length=record.track.at(-1).km,elevationPoints=record.track.filter(p=>p.ele!==null).length;
 if(!validNum(length,.01,1000))return null;
 const qualityUnknown=record.track.some(p=>p.altitudeQuality!=='usable'&&p.altitudeQuality!=='missing');
 return {name:`${record.date}・${GPS_ACTIVITY[record.activity]}`,kind:'gps',segments,distanceKm:length,points:record.track.length,elevationPoints,elevationStatus:elevationPoints===0?(qualityUnknown?'unverified':'none'):elevationPoints===record.track.length?'complete':'partial',gapCount:segments.length-1,simplified:!!record.trackSimplified};
}
