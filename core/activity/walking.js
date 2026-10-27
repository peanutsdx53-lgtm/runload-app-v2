/* Isolated walking adapter. No re-estimation of speed, steps or surface. */
import {evaluateMobileWalkJogAllRegions,MOBILE_WALK_JOG_MODEL_VERSION} from '../internal/mobileWalkJogSpeedModel.js';
export function calculateWalkingReference({speedMps}){
 const result=evaluateMobileWalkJogAllRegions({gaitId:'WALK',speedMps,allowProvisional:false});
 return {activity:'WALK',modelVersion:MOBILE_WALK_JOG_MODEL_VERSION,
  semanticVersion:'mobile-walk-jog-reference-v1.3',speedMps,
  rows:result.map(x=>({regionId:x.regionId,value:x.index,calculationState:x.index===null?'NOT_CALCULABLE':'CALCULATED',
   reasonCode:x.reasonCode||null,route:x.evidenceTier||null,sourceSha256:null,evidence:x})),
  source:'runload-app/mobileWalkJogSpeedModel/v1.3'};
}
