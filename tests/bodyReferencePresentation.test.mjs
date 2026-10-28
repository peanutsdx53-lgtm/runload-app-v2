import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {BODY_REFERENCE_IDS,bodyReferenceEngineId,engineReferenceBodyId,
 bodyReferenceColor,bodyReferenceScale,BODY_REFERENCE_COLOR_STOPS,BODY_REFERENCE_GRADIENT,bodyReferenceRow,renderBodyReferenceLabels,bodyReferenceSilhouetteClipDef} from '../ui/bodyReferencePresentation.js';
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

test('continuous reference palette remains navy-compatible and is identical across manual and GPS',()=>{
 assert.equal(BODY_REFERENCE_COLOR_STOPS.length,7);
 assert.deepEqual(BODY_REFERENCE_COLOR_STOPS.map(x=>x.value),[60,80,92,100,108,120,140]);
 assert.equal(bodyReferenceColor({calculationState:'CALCULATED',value:100}).fill,'rgb(102,196,181)');
 assert.equal(bodyReferenceColor({calculationState:'CALCULATED',value:60}).fill,'#4776A6');
 assert.equal(bodyReferenceColor({calculationState:'CALCULATED',value:140}).fill,'#CA7D8B');
 for(const sample of [60,70,80,91,92,94,98,99,100,101,107,108,119,120,131,139,140]){
  const row={calculationState:'CALCULATED',value:sample};
  const tint=bodyReferenceColor(row);
  assert.equal(tint.state,'available');
  assert.ok(tint.fill.startsWith('rgb(')||/^#[0-9A-F]{6}$/.test(tint.fill),'valid palette output');
  const scale=bodyReferenceScale(sample);
  assert.ok(scale.position>=0&&scale.position<=100);
  assert.equal(scale.clipped,null);
 }
 assert.notEqual(bodyReferenceColor({calculationState:'CALCULATED',value:98}).fill,
   bodyReferenceColor({calculationState:'CALCULATED',value:99}).fill,
   'nearby reference values should be continuously distinct, not quantized bands');
 const outsideLow=bodyReferenceScale(42),outsideHigh=bodyReferenceScale(175);
 assert.equal(outsideLow.position,0);assert.equal(outsideLow.clipped,'low');
 assert.equal(outsideHigh.position,100);assert.equal(outsideHigh.clipped,'high');
 assert.equal(bodyReferenceColor({calculationState:'CALCULATED',value:42}).fill,'#4776A6');
 assert.equal(bodyReferenceColor({calculationState:'CALCULATED',value:175}).fill,'#CA7D8B');
 assert.equal(bodyReferenceScale(NaN),null);
 assert.equal(bodyReferenceColor({calculationState:'NOT_CALCULABLE',value:130}).state,'missing');
 assert.equal(bodyReferenceColor({calculationState:'CALCULATED',value:null}).state,'missing');
 assert.match(BODY_REFERENCE_GRADIENT,/linear-gradient/);
});
test('continuous palette has stable minimum separation from navy background',()=>{
 const luminance=hex=>{
  const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
  const lin=rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*lin[0]+.7152*lin[1]+.0722*lin[2];
 };
 const navy=luminance('#092D42');
 for(const stop of BODY_REFERENCE_COLOR_STOPS){
  const color=luminance(stop.hex);
  assert.ok((color+.05)/(navy+.05)>=3.0,
   'region fill should not disappear into RunLoad navy: '+stop.hex);
 }
});

test('anatomical reference fill shares the original body silhouette as a SVG clip',()=>{
 for(const view of BODY_REGION_VIEWS){
  const def=bodyReferenceSilhouetteClipDef(view,'test-'+view.key);
  const boundary=view.silhouette.match(/^<path d="([^"]+)"/)?.[1];
  assert.ok(boundary,'original silhouette path for '+view.key);
  assert.ok(def.includes('<path d="'+boundary+'"/>'));
  assert.ok(def.includes('clipPathUnits="userSpaceOnUse"'));
  assert.ok(def.includes('id="test-'+view.key+'-silhouette-clip"'));
 }
 assert.equal(bodyReferenceSilhouetteClipDef(null,'test'),'');
});

test('posterior thigh calf and Achilles fills follow the same x=152 bilateral axis',()=>{
 const posterior=BODY_REGION_VIEWS.find(view=>view.key==='back');
 for(const id of ['BA-DISP-018','BA-DISP-023','BA-DISP-025']){
  const geometry=posterior.paths.find(([region])=>region===id)?.[1];
  assert.ok(geometry,'anatomical display region '+id);
  const halves=geometry.split(/(?=M)/).filter(Boolean);
  assert.equal(halves.length,2,id+' has a left and right part');
  const coords=halves.map(path=>
   [...path.matchAll(/-?\d+(?:\.\d+)?/g)].map(entry=>Number(entry[0])));
  assert.equal(coords[0].length,coords[1].length,id+' matching cubic contour');
  for(let i=0;i<coords[0].length;i+=2){
   assert.ok(Math.abs(coords[0][i]+coords[1][i]-304)<.001,
    id+' mirrored x around anatomical midline 152 at point '+i/2);
   assert.equal(coords[0][i+1],coords[1][i+1],
    id+' matched vertical contour at point '+i/2);
  }
 }
});
