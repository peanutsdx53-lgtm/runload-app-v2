/* Isolated jogging adapter. All numeric rules are the original v1.3 module. */
import {evaluateMobileWalkJogAllRegions,MOBILE_WALK_JOG_MODEL_VERSION} from '../internal/mobileWalkJogSpeedModel.js';
export function calculateJoggingReference({speedMps}){
 const result=evaluateMobileWalkJogAllRegions({gaitId:'JOGGING',speedMps,allowProvisional:false});
 return {activity:'JOGGING',modelVersion:MOBILE_WALK_JOG_MODEL_VERSION,
  semanticVersion:'mobile-walk-jog-reference-v1.3',speedMps,
  rows:result.map(x=>({regionId:x.regionId,value:x.index,calculationState:x.index===null?'NOT_CALCULABLE':'CALCULATED',
   reasonCode:x.reasonCode||null,route:x.evidenceTier||null,sourceSha256:null,evidence:x})),
  source:'runload-app/mobileWalkJogSpeedModel/v1.3'};
}
