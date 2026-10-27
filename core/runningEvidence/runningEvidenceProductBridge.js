import {RUNNING_REGION_SERIES,SCIENCE_REGISTRY_VERSION} from './runningEvidenceRegistry.js';
import {evaluateRunningAtSpeed,RUNNING_MODEL_VERSION,RUNNING_SEMANTIC_VERSION} from './runningEvidenceEngine.js';

export const V4_MODEL_VERSION = RUNNING_MODEL_VERSION;
export const V4_OUTPUT_SEMANTIC_VERSION = RUNNING_SEMANTIC_VERSION;
export const V4_ROUTE_TRACE_VERSION = 'running-evidence-route-v4.0';
const regionDisplayIds=Object.freeze({R01:'BA-DISP-014',R02:'BA-DISP-015',R03:'BA-DISP-016',R04:'BA-DISP-018',R05:'BA-DISP-019',R06:'BA-DISP-021',R07:'BA-DISP-023',R08:'BA-DISP-024',R09:'BA-DISP-025',R10:'BA-DISP-027',R11:'BA-DISP-028',R12:'BA-DISP-029'});
const finite=x=>typeof x==='number'&&Number.isFinite(x);
export function calculateEvidenceRunningForProduct(input={}) {
  const mixed=String(input.runningFormat||'RUN').toUpperCase()==='RUN_WALK';
  const distance=mixed?Number(input.runningDistanceKm):Number(input.distanceKm);
  const duration=mixed?Number(input.runningDurationMinutes):Number(input.durationMinutes);
  const speed=distance>0&&duration>0?distance*1000/(duration*60):NaN;
  // RUN_WALK is not the 12-region running-only domain, even when running-phase facts exist.
  const snap=evaluateRunningAtSpeed(speed,{activity:'RUNNING_PRIMARY',walkingMixed:mixed,
    speedContext:'HYPOTHETICAL',protocolMatched:false});
  const regions=Object.fromEntries(Object.entries(snap.regions).map(([id,x])=>[id,{
    value:x.reference100,state:x.reference100===null?'EVIDENCE_INSUFFICIENT':'OK',
    segmentEvidence:[x.route||'EVIDENCE_INSUFFICIENT'],supportedDistanceKm:x.reference100===null?0:distance,
    unsupportedDistanceKm:x.reference100===null?distance:0,coverageProportion:x.reference100===null?0:1,
    routeTrace:[{speedMps:speed,route:x.route,reasonCode:x.reasonCode,sourceSha256:x.sourceSha256,anchorIds:x.anchorIds||[],metricId:x.metricId,seriesId:x.seriesId,rawValue:x.rawValue,unit:x.unit}],
    scientificReference:x
  }]));
  return {state:finite(speed)&&speed>0?'OK':'INVALID_REQUIRED_RUNNING_FACT',courseState:'LITERATURE_SPEED_REFERENCE_ONLY',
    combinedConditionState:'RUNNING_CONDITIONS_NOT_QUANTIFIED',
    speedMps:speed,exposure:{state:finite(speed)&&speed>0?'OK':'INVALID',speedMps:speed,distanceKm:distance,durationMinutes:duration},
    regions,modelVersion:V4_MODEL_VERSION,outputSemanticVersion:V4_OUTPUT_SEMANTIC_VERSION,
    sourceRegistryVersion:SCIENCE_REGISTRY_VERSION};
}
export function createEvidenceRunningResultRecord({record}={}) {
  if(!record||!record.id) return {ok:false,code:'INVALID_RECORD'};
  const rev=String(record.updatedAt||record.createdAt||'');
  const clean=x=>String(x||'').replace(/[^0-9A-Za-z._-]/g,'_');
  const common={id:`evidence-running-v4-result-${clean(record.id)}-${clean(rev)}`,record_id:record.id,
    source_record_revision:rev,generated_at:new Date().toISOString(),model_version:V4_MODEL_VERSION,
    output_semantic_version:V4_OUTPUT_SEMANTIC_VERSION,engine_build_version:'running-evidence-v4.0-20261019',
    route_trace_version:V4_ROUTE_TRACE_VERSION,authority_version:SCIENCE_REGISTRY_VERSION,
    research_limitations:['PUBLISHED_COHORT_REFERENCE_ONLY','PERSONAL_TISSUE_LOAD_NOT_MEASURED','NO_CROSS_REGION_COMPARISON','CONDITIONS_NOT_QUANTIFIED'],
    source_registry:Object.fromEntries(RUNNING_REGION_SERIES.map(r=>[r.regionId,{sourceFile:r.sourceFile,sourceSha256:r.sourceSha256,sourceLocation:r.sourceLocation}]))};
  if(record.activityType==='rest')return {ok:true,resultRecord:{...common,state:'REST',result:null,engine_input_snapshot:null,body_map_payload:{version:'running-evidence-v4-bodymap',regions:[]},comparison_signatures:{}}};
  const distance=Number(record.distanceKm),duration=Number(record.durationMinutes);
  const mixed=String(record.runningFormat||'').toUpperCase()==='RUN_WALK';
  const speed=distance>0&&duration>0?distance*1000/(duration*60):NaN;
  const raw=evaluateRunningAtSpeed(speed,{activity:'RUNNING_PRIMARY',walkingMixed:mixed,
    speedContext:'RECORD_AVERAGE_UNVERIFIED',protocolMatched:false});
  const rows=RUNNING_REGION_SERIES.map(s=>{
    const r=raw.regions[s.regionId];const calculated=finite(r.reference100);
    return {regionId:regionDisplayIds[s.regionId],primaryRegionId:s.regionId,regionName:s.label,
      value:calculated?r.reference100:null,indexValue:calculated?r.reference100:null,
      valueEnvelope:null,calculationState:calculated?'CALCULATED':'NOT_CALCULABLE',
      provenance:r.route||r.reasonCode,evidenceState:r.route||r.reasonCode,
      evidenceStates:[r.route||r.reasonCode],unsupportedDistanceKm:calculated?0:distance,
      construct:s.metricDescription,constructId:`EVIDENCE_${s.metricId}`,
      referenceId:`EVIDENCE_${s.referenceSignature}`,referenceSpeedMps:s.reference.speedMps,
      sourceIds:[s.sourceFile],sourceSha256:s.sourceSha256,sourceLocation:s.sourceLocation,
      routeTrace:[{route:r.route,anchorIds:r.anchorIds||[],speedMps:speed,reasonCode:r.reasonCode,
        sourceSha256:r.sourceSha256,rawValue:r.rawValue,unit:r.unit,modelVersion:r.modelVersion}],
      axisEstimates:[],optionalApplied:[],coverageProportion:calculated?1:0,
      supportedDistanceKm:calculated?distance:0,projectCompositeFlag:false,fallback:[],
      rawValue:r.rawValue,unit:r.unit,metricId:s.metricId,seriesId:s.seriesId,
      referenceSignature:s.referenceSignature,speedContext:'RECORD_AVERAGE_UNVERIFIED',
      literatureOnly:true,notPersonalMeasurement:true};
  });
  const result={state:'OK',courseState:'LITERATURE_SPEED_REFERENCE_ONLY',combinedConditionState:'RUNNING_CONDITIONS_NOT_QUANTIFIED',
    model_version:V4_MODEL_VERSION,outputSemanticVersion:V4_OUTPUT_SEMANTIC_VERSION,
    exposure:{state:'OK',speedMps:speed,distanceKm:distance,durationMinutes:duration},
    regions:rows,axisEstimates:{},rawEngineState:'OK'};
  const comparison_signatures=Object.fromEntries(rows.map(row=>[row.regionId,{
    regionId:row.regionId,primaryRegionId:row.primaryRegionId,
    modelVersion:V4_MODEL_VERSION,outputSemanticVersion:V4_OUTPUT_SEMANTIC_VERSION,
    constructId:row.constructId,referenceId:row.referenceId,directDeltaAllowed:true}]));
  return {ok:true,resultRecord:{...common,state:'RUN',engine_input_snapshot:{distanceKm:distance,durationMinutes:duration,
    runningFormat:record.runningFormat,referenceOnly:true},result,
    body_map_payload:{version:'running-evidence-v4-bodymap',regions:rows.map(r=>({regionId:r.regionId,primaryRegionId:r.primaryRegionId,regionName:r.regionName,value:r.value,calculationState:r.calculationState}))},comparison_signatures}};
}
