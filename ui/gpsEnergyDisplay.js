/* Companion to original RunLoad running energy model.
 * GPS RUNNING/JOGGING only; never infer a mass or a walking/mixed MET.
 * Active duration excludes explicitly paused periods.
 */
import {estimateRunningEnergy,RUN_ENERGY_MODEL_ID} from './gpsMeasurementEnergy.js';
export const GPS_ENERGY_MODEL_ID=RUN_ENERGY_MODEL_ID;
export function estimateGpsEnergy(session){
 if(!session||!['RUNNING','JOGGING'].includes(session.activity))
  return {ok:false,reason:'ACTIVITY_NOT_SUPPORTED'};
 const result=estimateRunningEnergy({
  bodyMassKg:session.bodyMassKg,
  distanceKm:session.distanceM/1000,
  durationMs:session.elapsedMs
 });
 return result.ok?result:{ok:false,reason:result.reason};
}
export function gpsEnergyDisplay(session){
 const value=estimateGpsEnergy(session);
 if(value.ok)return {text:value.estimatedKcal.toFixed(1),note:'2024 MET参考値'};
 const messages={
  ACTIVITY_NOT_SUPPORTED:'RUN・JOGのみ対象',
  BODY_MASS_UNAVAILABLE:'設定で体重を登録',
  GPS_DISTANCE_INSUFFICIENT:'有効なGPS移動待ち',
  DURATION_UNAVAILABLE:'測定開始後に表示',
  SPEED_OUT_OF_SUPPORTED_RANGE:'速度が対象範囲外'
 };
 return {text:'—',note:messages[value.reason]||'推定できません'};
}
