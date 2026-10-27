import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {BODY_REFERENCE_IDS,bodyReferenceEngineId,engineReferenceBodyId,
 bodyReferenceColor,bodyReferenceRow,renderBodyReferenceLabels} from '../ui/bodyReferencePresentation.js';
import {GPS_REPLAY_BODY_IDS,gpsEngineRegionId,gpsBodyRegionId,evaluateGpsReplayReference} from '../ui/gpsReplayReference.js';
import {calculateRunningReference} from '../core/activity/running.js';
import {calculateJoggingReference} from '../core/activity/jogging.js';
import {calculateWalkingReference} from '../core/activity/walking.js';

test('exactly 12 approved visual body IDs retain same canonical engine mapping for manual and GPS',()=>{
 const asset=BODY_REGION_VIEWS.flatMap(v=>v.paths.map(([id])=>id));
 assert.equal(asset.length,12);
 assert.equal(new Set(asset).size,12);
 assert.deepEqual([...asset].sort(),[...BODY_REFERENCE_IDS].sort());
 assert.deepEqual(GPS_REPLAY_BODY_IDS,BODY_REFERENCE_IDS);
 for(let i=0;i<12;i++){
  const visual=BODY_REFERENCE_IDS[i],engine='R'+String(i+1).padStart(2,'0');
  assert.equal(bodyReferenceEngineId(visual),engine);
  assert.equal(gpsEngineRegionId(visual),engine);
  assert.equal(engineReferenceBodyId(engine),visual);
  assert.equal(gpsBodyRegionId(engine),visual);
 }
 assert.equal(bodyReferenceEngineId('INVALID'),null);
 assert.equal(engineReferenceBodyId('R13'),null);
});

test('each activity draws ONLY authorized scientific values, matching row references on every body view',()=>{
 const cases=[
  ['RUNNING',2.5,calculateRunningReference({distanceKm:.15,durationMinutes:1})],
  ['JOGGING',2.25,calculateJoggingReference({speedMps:2.25})],
  ['WALK',1.5,calculateWalkingReference({speedMps:1.5})]
 ];
 for(const [activity,speedMps,expected] of cases){
  const gps=evaluateGpsReplayReference({activity,speedMps});
  assert.deepEqual(gps.rows,expected.rows,'GPS must reuse exact activity reference rows');
  assert.equal(gps.rows.length,12);
  let viewedCount=0;
  for(const view of BODY_REGION_VIEWS){
   const markup=renderBodyReferenceLabels(view,gps.rows);
   const match=[...markup.matchAll(/data-body-reference-label="([^"]+)".*?data-body-reference-value="([^"]+)"/g)];
   const valid=view.paths.map(([id])=>bodyReferenceRow(gps.rows,id)).filter(row=>
    row?.calculationState==='CALCULATED'&&Number.isFinite(row.value));
   assert.equal(match.length,valid.length,activity+' '+view.key);
   for(const [id] of view.paths){
    const row=bodyReferenceRow(gps.rows,id),fill=bodyReferenceColor(row);
    if(row?.calculationState==='CALCULATED'&&Number.isFinite(row.value)){
     assert.ok(markup.includes('data-body-reference-label="'+id+'"'));
     assert.ok(markup.includes('data-body-reference-value="'+row.value.toFixed(1)+'"'));
     assert.equal(fill.state,'available');
     viewedCount++;
    }else{
     assert.ok(!markup.includes('data-body-reference-label="'+id+'"'));
     assert.equal(fill.state,'missing');
    }
   }
  }
  assert.equal(viewedCount,gps.count);
  assert.ok(viewedCount>0,activity+' should have at least one reference');
 }
});

test('unsaved and unavailable readings never display fabricated 100, 0 or missing-region numbers',()=>{
 for(const view of BODY_REGION_VIEWS){
  assert.equal(renderBodyReferenceLabels(view,[]),'');
  assert.equal(renderBodyReferenceLabels(view,null),'');
 }
 const view=BODY_REGION_VIEWS[0];
 const first=bodyReferenceEngineId(view.paths[0][0]);
 const readings=[{regionId:first,value:null,calculationState:'NOT_CALCULABLE'},
  {regionId:'R02',value:NaN,calculationState:'CALCULATED'}];
 assert.equal(renderBodyReferenceLabels(view,readings),'');
 assert.equal(bodyReferenceColor(readings[0]).state,'missing');
 assert.equal(bodyReferenceColor({value:0,calculationState:'CALCULATED'}).state,'available');
 assert.equal(bodyReferenceColor({value:100,calculationState:'CALCULATED'}).state,'available');
});
