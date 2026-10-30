import test from 'node:test';
import assert from 'node:assert/strict';
import {compareBodyReferenceRows as compare} from '../ui/regionReferenceComparison.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const run=(n,gait='RUNNING')=>({id:id(n),source:'manual',type:'run',schema:1,distanceKm:5,durationSeconds:1800,draft:{activityGait:gait}});
const running=(v,opts={})=>({activity:'RUNNING',source:'runload-app/runningEvidence/v4.0',
 modelVersion:'science-v1',semanticVersion:'reference-v1',rows:[{regionId:'R01',calculationState:'CALCULATED',
 value:v,evidence:{regionId:'R01',activity:'RUNNING_PRIMARY',modelVersion:'science-v1',
 semanticVersion:'reference-v1',metricId:'HIP',seriesId:'SER',referenceSignature:'REF',
 sourceSha256:'SHA',unit:'J/kg',...opts}}]});
const jogging=v=>({activity:'JOGGING',source:'walk-jog',modelVersion:'walk-v1',semanticVersion:'walk-ref-v1',
 rows:[{regionId:'R05',value:v,calculationState:'CALCULATED',evidence:{regionId:'R05',gaitId:'JOGGING',
 constructId:'PFJ',sourceId:'SOURCE',interpolationRule:'LINEAR',referenceSpeedMps:2.2,
 sourceDomain:{minMps:2.1,maxMps:2.5}}}]});
test('matching region, metric, source and reference yield descriptive points only',()=>{
 const r=compare(run(2),run(1),running(109.4),running(103.2),'R01');
 assert.equal(r.status,'ready');assert.equal(r.currentValue,109.4);
 assert.equal(r.previousValue,103.2);assert.equal(r.difference,6.2);
 assert.match(r.note,/身体負荷/);assert.match(r.note,/ポイント/);
});
test('different science signature, construct and units are never subtracted',()=>{
 for(const change of [{metricId:'ALT'},{seriesId:'DIFFERENT'},{referenceSignature:'ANOTHER'},
  {sourceSha256:'OTHER'},{unit:'N'}])
  assert.equal(compare(run(2),run(1),running(110),running(105,change),'R01').status,'different-method');
 const changed=running(105);changed.source='different-engine';
 assert.equal(compare(run(2),run(1),running(110),changed,'R01').status,'different-method');
});
test('missing scientific provenance and incompatible versions reject',()=>{
 const corrupt=running(105);delete corrupt.rows[0].evidence.sourceSha256;
 assert.equal(compare(run(2),run(1),running(110),corrupt,'R01').status,'unverified');
 const old=running(105);old.modelVersion='science-v2';old.rows[0].evidence.modelVersion='science-v2';
 assert.equal(compare(run(2),run(1),running(110),old,'R01').status,'different-method');
});
test('missing, calculated-out-of-range, other-body, and fake records reject',()=>{
 assert.equal(compare(run(2),run(1),running(110),running(null),'R01').status,'not-calculable');
 assert.equal(compare(run(2),run(1),running(110),running(105),'R02').status,'not-calculable');
 assert.equal(compare(run(2),run(1),running(110),running(105),'R13').status,'invalid-region');
 assert.equal(compare(run(1),run(1),running(110),running(105),'R01').status,'same-record');
 assert.equal(compare({id:'fake',source:'manual',type:'run',schema:1},run(1),running(110),running(105),'R01').status,'unavailable');
 assert.equal(compare(run(2),run(1),null,running(105),'R01').status,'unavailable');
});
test('cross gait and unknown activity never compare, same jogging construct does',()=>{
 assert.equal(compare(run(2),run(1,'WALK'),running(110),running(105),'R01').status,'incompatible');
 const other=run(1);other.draft.activityGait='UNKNOWN';
 assert.equal(compare(run(2),other,running(110),running(105),'R01').status,'incompatible');
 assert.equal(compare(run(2,'JOGGING'),run(1,'JOGGING'),jogging(102),jogging(101),'R05').status,'ready');
 const changed=jogging(101);changed.rows[0].evidence.sourceDomain.maxMps=2.7;
 assert.equal(compare(run(2,'JOGGING'),run(1,'JOGGING'),jogging(102),changed,'R05').status,'different-method');
});
test('reference values can decline but never become a risk classification',()=>{
 const r=compare(run(2),run(1),running(97.1),running(98),'R01');
 assert.equal(r.status,'ready');assert.equal(r.difference,-0.9);assert.doesNotMatch(r.note,/安全になった|危険になった/);
});

test('cross version, construct or source cannot produce a fake positive reference difference',()=>{
 const current=run(2),prior=run(1);
 const currentRef=running(120);
 const altered=[
  {...running(110),modelVersion:'unreviewed-v2'},
  {...running(110),semanticVersion:'different-reference'},
  {...running(110),rows:[{...running(110).rows[0],evidence:{...running(110).rows[0].evidence,metricId:'DIFFERENT'}}]},
  {...running(110),rows:[{...running(110).rows[0],evidence:{...running(110).rows[0].evidence,sourceSha256:'different-hash'}}]}
 ];
 for(const other of altered){
  const result=compare(current,prior,currentRef,other,'R01');
  assert.notEqual(result.status,'ready');
  assert.equal(result.difference,undefined,'rejected data must never expose numeric point differences');
  assert.match(result.reason,/方法|出所/);
 }
 const outOfRange=running(110);
 outOfRange.rows[0].calculationState='NOT_CALCULABLE';
 outOfRange.rows[0].value=null;
 const missing=compare(current,prior,currentRef,outOfRange,'R01');
 assert.equal(missing.status,'not-calculable');
 assert.equal(missing.difference,undefined);
});
