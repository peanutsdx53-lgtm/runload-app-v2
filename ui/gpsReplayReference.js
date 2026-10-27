/* RunLoad GPS dynamic-reference adapter.
 * Independent of storage, UI and the authoritative three activity engines.
 * References describe literature speed conditions, NOT measured body load.
 * Sparse points, pause/GPS gaps and mixed activity must never be interpolated.
 */
import {calculateRunningReference} from '../core/activity/running.js';
import {calculateJoggingReference} from '../core/activity/jogging.js';
import {calculateWalkingReference} from '../core/activity/walking.js';

export const GPS_REPLAY_REFERENCE_VERSION='gps-replay-reference-v1';
export const GPS_REPLAY_ACTIVITY=['RUNNING','JOGGING','WALK'];
import {BODY_REFERENCE_IDS,bodyReferenceEngineId,engineReferenceBodyId} from './bodyReferencePresentation.js';
// Keep the public mapping names used by GPS tests and saved result screens.
export const GPS_REPLAY_BODY_IDS=BODY_REFERENCE_IDS;
export const gpsEngineRegionId=bodyReferenceEngineId;
export const gpsBodyRegionId=engineReferenceBodyId;
const finite=Number.isFinite;
const blank=(state,extra={})=>({state,referenceOnly:true,rows:[],...extra});

/** Validate independent GPS replay points {t,km,breakBefore}.
 * t: absolute GPS timestamp in ms, km: cumulative GPS distance.
 * Must not use the shape-compacted route as the source of speed.
 */
export function checkReplayPoints(points){
 if(!Array.isArray(points)||points.length<2||points.length>50000)return {ok:false,reason:'POINT_COUNT'};
 let previous=null;
 for(const point of points){
  if(!point||!finite(point.t)||!Number.isSafeInteger(point.t)||point.t<=0
      ||!finite(point.km)||point.km<0||point.km>1000
      ||typeof point.breakBefore!=='boolean')return {ok:false,reason:'INVALID_POINT'};
  if(previous&&(point.t<=previous.t||point.km<previous.km))return {ok:false,reason:'OUT_OF_ORDER'};
  if(point.activeMs!==undefined&&(!Number.isSafeInteger(point.activeMs)||point.activeMs<0||(previous&&previous.activeMs!==undefined&&point.activeMs<previous.activeMs)))return {ok:false,reason:'INVALID_ACTIVE_TIME'};
  previous=point;
 }
 return {ok:true};
}
/** A speed reference is derived only from adjacent valid GPS fixes.
 * This does NOT estimate acceleration or tissue forces.
 * Consecutive fixes separated by >30s form a GPS gap, even if absent from flags.
 * No averaging across pause, gap, or activity boundaries.
 */
export function deriveReplaySpeeds(points,{maxGapMs=30000}={}){
 const checked=checkReplayPoints(points);
 if(!checked.ok)throw new RangeError(checked.reason);
 if(!Number.isSafeInteger(maxGapMs)||maxGapMs<1000||maxGapMs>30000)throw new RangeError('INVALID_GAP');
 return points.map((point,index)=>{
  const base={t:point.t,km:point.km,activeMs:point.activeMs??null,speedMps:null};
  if(index===0)return {...base,state:'INITIAL_FIX'};
  if(point.breakBefore)return {...base,state:'GPS_GAP'};
  const previous=points[index-1],dt=point.t-previous.t;
  if(dt>maxGapMs)return {...base,state:'GPS_GAP'};
  const meters=(point.km-previous.km)*1000,seconds=dt/1000;
  if(meters<0||seconds<=0)return {...base,state:'INVALID_DELTA'};
  // Keep zero-speed steps as recorded speed, but scientific references may reject them.
  return {...base,speedMps:meters/seconds,state:'SPEED_AVAILABLE'};
 });
}
/** Apply the *existing* activity-specific scientific engine without coefficients.
 * Individual missing/out-of-range regions retain the engine's refusal.
 * Absence of calculated regions is NOT equivalent to reference value zero.
 */
export function evaluateGpsReplayReference({activity,speedMps}={}){
 if(activity==='MIXED')return blank('MIXED_NOT_SUPPORTED',{activity});
 if(!GPS_REPLAY_ACTIVITY.includes(activity))return blank('ACTIVITY_NOT_SUPPORTED',{activity});
 if(!finite(speedMps)||speedMps<=0||speedMps>15)return blank('SPEED_NOT_AVAILABLE',{activity,speedMps:null});
 let output;
 if(activity==='RUNNING'){
  // The v4 running adapter takes distance/time, so choose 60 seconds at the
  // provided speed: this selects the same speed without introducing a load integral.
  output=calculateRunningReference({distanceKm:speedMps*60/1000,durationMinutes:1});
 }else if(activity==='JOGGING'){
  output=calculateJoggingReference({speedMps});
 }else output=calculateWalkingReference({speedMps});
 const rows=output.rows.map(row=>({...row}));
 const validRows=rows.filter(r=>r.calculationState==='CALCULATED'&&finite(r.value));
 return {
  state:validRows.length?'REFERENCE_ONLY':'NO_AUTHORIZED_SPEED_REFERENCE',
  referenceOnly:true,activity,speedMps,rows,
  count:validRows.length,modelVersion:output.modelVersion,
  semanticVersion:output.semanticVersion,source:output.source
 };
}
/** Returns display-ready references aligned to raw replay fixes.
 * Values are per speed condition, never averaged into a session load.
 */
export function buildGpsReplayFrames({activity,points}={}){
 if(!GPS_REPLAY_ACTIVITY.includes(activity))return {ok:false,reason:'ACTIVITY_NOT_SUPPORTED',frames:[]};
 let speeds;
 try{speeds=deriveReplaySpeeds(points);}catch(err){return {ok:false,reason:err.message,frames:[]};}
 const frames=speeds.map(s=>({
  ...s,reference:s.speedMps===null?blank(s.state,{activity}):evaluateGpsReplayReference({activity,speedMps:s.speedMps})
 }));
 return {ok:true,version:GPS_REPLAY_REFERENCE_VERSION,activity,frames};
}
