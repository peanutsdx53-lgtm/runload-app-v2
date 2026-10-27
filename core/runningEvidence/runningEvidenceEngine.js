// Proposed replacement *calculation kernel*, isolated from historical v3.1 and experimental walk/jog.
// Product routing, persistence, history and UI have deliberately not been switched.
import { RUNNING_REGION_SERIES, RUNNING_REGION_BY_ID, SCIENCE_REGISTRY_VERSION, APPROVED_E_EXTENSIONS } from './runningEvidenceRegistry.js';
export const RUNNING_MODEL_VERSION='runload-running-a1a2b-v4.0';
export const RUNNING_SEMANTIC_VERSION='runload-running-evidence-construct-v4.0';
const SAME_SPEED_EPS = 1e-11; // numeric unit conversion only; cannot snap 10.000 to 10.008km/h
const finite = x => typeof x === 'number' && Number.isFinite(x);
const unavailable = (regionId,reasonCode, context='FIXED_LITERATURE_SPEED') => ({
  activity:'RUNNING_PRIMARY',regionId,state:'NOT_CALCULABLE',reasonCode,
  rawValue:null,unit:null,reference100:null,route:null,sourceSha256:null,
  modelVersion:RUNNING_MODEL_VERSION,semanticVersion:RUNNING_SEMANTIC_VERSION,
  sourceRegistryVersion:SCIENCE_REGISTRY_VERSION,speedContext:context,hypothetical:context==='HYPOTHETICAL'
});
function formula(eq, speedMps){
  if(eq?.type!=='GAZENDAM_FF_POLYNOMIAL') return null;
  const q=speedMps/Math.sqrt(eq.gravityMps2*eq.legLengthM);
  return eq.D0+eq.D1*q+eq.D2*q*q;
}
function speedValue(series,speedMps){
  const anchors=series.anchors;
  if(series.routePolicy==='A2') {
    const raw=formula(series.equation,speedMps);
    return {raw,route:'A2_PUBLISHED_EQUATION',anchorIds:[`Table3:${series.equation.muscleCode}:FF${series.equation.ffComponent}`]};
  }
  for(let j=0;j<anchors.length;j++) {
    if(Math.abs(speedMps-anchors[j].speedMps)<=SAME_SPEED_EPS) {
      return {raw:anchors[j].raw,route:'A1_PUBLISHED_TABLE',anchorIds:[`${series.sourceLocation}@${anchors[j].speedMps}mps`]};
    }
  }
  for(let j=0;j<anchors.length-1;j++) {
    const a=anchors[j],b=anchors[j+1];
    if(speedMps>a.speedMps && speedMps<b.speedMps) {
      return {raw:a.raw + (b.raw-a.raw)*(speedMps-a.speedMps)/(b.speedMps-a.speedMps),
        route:'B_INTRA_SOURCE_INTERPOLATION',anchorIds:[`${series.sourceLocation}@${a.speedMps}mps`,`${series.sourceLocation}@${b.speedMps}mps`]};
    }
  }
  return null;
}
export function evaluateRunningRegion(regionId, speedMps, options={}) {
  const context = options.speedContext ?? 'FIXED_LITERATURE_SPEED';
  if(!finite(speedMps)||speedMps<=0) return unavailable(regionId,'INVALID_SPEED',context);
  if(options.activity && options.activity!=='RUNNING_PRIMARY') return unavailable(regionId,'ACTIVITY_MISMATCH',context);
  const series=RUNNING_REGION_BY_ID[regionId];
  if(!series) return unavailable(regionId,'UNKNOWN_REGION',context);
  if(options.walkingMixed===true) return unavailable(regionId,'MIXED_GAIT',context);
  // Grade/terrain/cadence are recorded context, not arbitrary numerical multipliers.
  if(options.requireMatchedProtocol && options.protocolMatched!==true) return unavailable(regionId,'CONDITION_NOT_VERIFIED',context);
  if(options.extensionId) return unavailable(regionId,'UNAPPROVED_EVIDENCE',context);
  if(series.evidenceApproval!=='APPROVED_RESEARCH_CURRENT_SPECIFICATION') return unavailable(regionId,'UNAPPROVED_EVIDENCE',context);
  const [min,max]=series.approvedSpeedMps;
  if(speedMps<min-SAME_SPEED_EPS||speedMps>max+SAME_SPEED_EPS) return unavailable(regionId,'OUTSIDE_SOURCE_RANGE',context);
  const at=Math.max(min,Math.min(max,speedMps));
  const val=speedValue(series,at);
  if(!val||!finite(val.raw)) return unavailable(regionId,'NO_ELIGIBLE_ROUTE',context);
  const ref=series.reference;
  if(!finite(ref.raw)||ref.raw<=0||series.referenceSignature===null||series.reference.unit && series.reference.unit!==series.unit) return unavailable(regionId,'INVALID_REFERENCE',context);
  const normalized = 100*val.raw/ref.raw;
  if(!finite(normalized)) return unavailable(regionId,'NONFINITE_RESULT',context);
  const contextLimited=context==='RECORD_AVERAGE_UNVERIFIED'||context==='HYPOTHETICAL'||options.protocolMatched!==true;
  return {
    activity:'RUNNING_PRIMARY',regionId,metricId:series.metricId,seriesId:series.seriesId,
    state:contextLimited?'CONTEXT_LIMITED':'CALCULATED',reasonCode:contextLimited?'LITERATURE_REFERENCE_NOT_PERSONAL_MEASUREMENT':null,
    rawValue:val.raw,unit:series.unit,reference100:normalized,route:val.route,
    anchorIds:val.anchorIds,reference:ref,referenceSignature:series.referenceSignature,
    sourceSha256:series.sourceSha256,sourceLocation:series.sourceLocation,
    sourceFile:series.sourceFile,metricDescription:series.metricDescription,
    modelVersion:RUNNING_MODEL_VERSION,semanticVersion:RUNNING_SEMANTIC_VERSION,
    sourceRegistryVersion:SCIENCE_REGISTRY_VERSION,speedMps:at,speedContext:context,
    hypothetical:context==='HYPOTHETICAL',estimated:true,
    note:'Published cohort reference or model-derived comparison; not a personal physiological measurement or injury risk.'
  };
}
export function evaluateRunningAtSpeed(speedMps,options={}) {
  return {
    activity:'RUNNING_PRIMARY', modelVersion:RUNNING_MODEL_VERSION, semanticVersion:RUNNING_SEMANTIC_VERSION,
    speedMps,regions:Object.fromEntries(RUNNING_REGION_SERIES.map(r=>[r.regionId,evaluateRunningRegion(r.regionId,speedMps,options)]))
  };
}
export function evaluateExtension(candidate={}) {
  // No caller-supplied {status:'APPROVED'} can bypass the immutable release registry.
  const accepted = APPROVED_E_EXTENSIONS.find(x=>x.id===candidate.id && x.registrySignature===candidate.registrySignature);
  return accepted?{state:'ROUTE_REGISTERED',id:accepted.id}:{state:'NOT_CALCULABLE',reasonCode:'UNAPPROVED_EVIDENCE',value:null};
}
export function compatibleForReferenceComparison(a,b){
  const keys=['activity','regionId','metricId','seriesId','unit','referenceSignature','modelVersion','semanticVersion'];
  return Boolean(a && b && finite(a.reference100) && finite(b.reference100) &&
    keys.every(k=>a[k]!=null && b[k]!=null && a[k]===b[k]) &&
    a.state!=='NOT_CALCULABLE' && b.state!=='NOT_CALCULABLE');
}
export function strictCommonSpeedRange() {
  const lows=RUNNING_REGION_SERIES.map(r=>r.approvedSpeedMps[0]);
  const highs=RUNNING_REGION_SERIES.map(r=>r.approvedSpeedMps[1]);
  const minMps=Math.max(...lows), maxMps=Math.min(...highs);
  return minMps<=maxMps?{minMps,maxMps,minKmh:minMps*3.6,maxKmh:maxMps*3.6,widthKmh:(maxMps-minMps)*3.6}:null;
}

// Research candidate adapter: converts running facts to a literature-speed reference.
// It NEVER changes the input record, stores a result, or infers a personal tissue measurement.
export function evaluateRunningRecordReference(record={}) {
  const distanceKm=record.distanceKm, durationMinutes=record.durationMinutes;
  const bad=(code)=>({activity:'RUNNING_PRIMARY',state:'NOT_CALCULABLE',reasonCode:code,regions:null,
    modelVersion:RUNNING_MODEL_VERSION,semanticVersion:RUNNING_SEMANTIC_VERSION});
  if(!finite(distanceKm)||!finite(durationMinutes)||distanceKm<=0||durationMinutes<=0) return bad('INVALID_DISTANCE_OR_DURATION');
  if(record.activity && record.activity!=='RUNNING_PRIMARY')return bad('ACTIVITY_MISMATCH');
  if(record.walkingMixed===true || ['RUN_WALK','MIXED','WALK'].includes(String(record.runningFormat||'').toUpperCase()))return bad('MIXED_GAIT');
  const speedMps=distanceKm*1000/(durationMinutes*60);
  if(!finite(speedMps)||speedMps<=0)return bad('INVALID_SPEED');
  const snapshot=evaluateRunningAtSpeed(speedMps,{
    activity:'RUNNING_PRIMARY',walkingMixed:false,
    speedContext:'RECORD_AVERAGE_UNVERIFIED',protocolMatched:false
  });
  return {...snapshot,state:'REFERENCE_ONLY',speedContext:'RECORD_AVERAGE_UNVERIFIED',
    note:'Record average speed selects published reference conditions; this is not a personal measurement.',
    unquantifiedConditions:Object.freeze({grade:record.gradePercent??null,surface:record.surface??null,cadence:record.cadenceSpm??null})};
}
