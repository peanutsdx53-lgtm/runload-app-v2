/* Activity boundary only. The authoritative numerical implementation is
 * byte-identical to runload-app/core/runningEvidence at the pinned source SHA.
 * This adapter must never add grade/terrain/cadence multipliers.
 */
import {calculateEvidenceRunningForProduct,V4_MODEL_VERSION,V4_OUTPUT_SEMANTIC_VERSION} from '../runningEvidence/runningEvidenceProductBridge.js';
export function calculateRunningReference({distanceKm,durationMinutes}){
 const original=calculateEvidenceRunningForProduct({distanceKm,durationMinutes,runningFormat:'RUN'});
 return {activity:'RUNNING',modelVersion:V4_MODEL_VERSION,semanticVersion:V4_OUTPUT_SEMANTIC_VERSION,
  speedMps:original.speedMps,rows:Object.entries(original.regions).map(([regionId,x])=>({
   regionId,value:x.scientificReference?.reference100??null,calculationState:x.scientificReference?.reference100==null?'NOT_CALCULABLE':'CALCULATED',
   reasonCode:x.scientificReference?.reasonCode||null,route:x.scientificReference?.route||null,sourceSha256:x.scientificReference?.sourceSha256||null,
   evidence:x.scientificReference||null})),source:'runload-app/runningEvidence/v4.0'};
}
