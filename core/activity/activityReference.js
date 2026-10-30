/* Common INPUT -> original activity engine -> reference OUTPUT.
 * These outputs are literature speed-condition references, not measurements
 * of an individual's tissue load. Mixed running+walking is not collapsed.
 */
import {calculateRunningReference} from './running.js';
import {calculateJoggingReference} from './jogging.js';
import {calculateWalkingReference} from './walking.js';
export const ACTIVITY_GAITS=Object.freeze(['RUNNING','JOGGING','WALK']);
export const ACTIVITY_LABELS=Object.freeze({RUNNING:'ランニング',JOGGING:'ジョギング',WALK:'ウォーキング'});
const failure=(reason,activity=null)=>({state:'NOT_CALCULABLE',reason,activity,rows:[],count:0});
export function calculateActivityReference(record){
 if(!record||record.source!=='manual'||record.type!=='run'||record.schema!==2)return failure('NOT_SAVED_MANUAL_RUN');
 const gait=String(record.draft?.activityGait||'UNKNOWN');
 if(!ACTIVITY_GAITS.includes(gait))return failure('GAIT_NOT_SELECTED');
 if(String(record.draft?.runningFormat||'UNKNOWN')==='RUN_WALK')return failure('MIXED_GAIT_NOT_QUANTIFIED',gait);
 const km=record.distanceKm,seconds=record.durationSeconds;
 if(typeof km!=='number'||!Number.isFinite(km)||km<=0||!Number.isInteger(seconds)||seconds<=0)return failure('INVALID_INPUT',gait);
 const speedMps=km*1000/seconds;
 const args={distanceKm:km,durationMinutes:seconds/60,speedMps};
 const raw=gait==='RUNNING'?calculateRunningReference(args):gait==='JOGGING'?calculateJoggingReference(args):calculateWalkingReference(args);
 const count=raw.rows.filter(x=>x.calculationState==='CALCULATED'&&Number.isFinite(x.value)).length;
 return {...raw,state:count>0?'REFERENCE_ONLY':'NO_AUTHORIZED_SPEED_REFERENCE',count,availableCount:count,requiredRegionCount:12,
  calculationInput:{source:'saved-manual-run',recordId:record.id,distanceKm:km,durationSeconds:seconds,speedMps,activityGait:gait}};
}
