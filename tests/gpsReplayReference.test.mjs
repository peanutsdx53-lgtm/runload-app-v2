import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveReplaySpeeds,checkReplayPoints,evaluateGpsReplayReference,buildGpsReplayFrames} from '../ui/gpsReplayReference.js';
import {calculateRunningReference} from '../core/activity/running.js';
import {calculateJoggingReference} from '../core/activity/jogging.js';
import {calculateWalkingReference} from '../core/activity/walking.js';

const p=(t,km,breakBefore=false)=>({t,km,breakBefore});
test('isolated speed frames preserve source fixes and exact segment speed',()=>{
 const points=[p(1000,0,true),p(6000,.0125),p(11000,.0275)];
 const samples=deriveReplaySpeeds(points);
 assert.deepEqual(samples.map(x=>x.state),['INITIAL_FIX','SPEED_AVAILABLE','SPEED_AVAILABLE']);
 assert.ok(Math.abs(samples[1].speedMps-2.5)<1e-12);
 assert.ok(Math.abs(samples[2].speedMps-3)<1e-12);
 assert.deepEqual(points,[p(1000,0,true),p(6000,.0125),p(11000,.0275)]);
});
test('a flag on a new GPS segment prevents measuring speed across the boundary',()=>{
 const samples=deriveReplaySpeeds([p(1000,0,true),p(6000,.01),p(11000,.12,true),p(16000,.1325)]);
 assert.equal(samples[2].state,'GPS_GAP');assert.equal(samples[2].speedMps,null);
 assert.ok(Math.abs(samples[3].speedMps-2.5)<1e-12);
});
test('an implicit 30s gap is excluded even without an explicit break marker',()=>{
 const samples=deriveReplaySpeeds([p(1000,0,true),p(32001,.1)]);
 assert.equal(samples[1].state,'GPS_GAP');assert.equal(samples[1].speedMps,null);
});
test('zero speed is not treated as body load zero',()=>{
 const frames=buildGpsReplayFrames({activity:'RUNNING',points:[p(1000,0,true),p(6000,0)]});
 assert.equal(frames.ok,true);
 assert.equal(frames.frames[1].speedMps,0);
 assert.equal(frames.frames[1].reference.state,'SPEED_NOT_AVAILABLE');
 assert.equal(frames.frames[1].reference.rows.length,0);
});
test('mixed and invalid inputs fail closed rather than merging gaits',()=>{
 assert.equal(buildGpsReplayFrames({activity:'MIXED',points:[p(1000,0,true),p(6000,.1)]}).ok,false);
 assert.equal(evaluateGpsReplayReference({activity:'MIXED',speedMps:2.5}).state,'MIXED_NOT_SUPPORTED');
 assert.equal(evaluateGpsReplayReference({activity:'WALK',speedMps:NaN}).state,'SPEED_NOT_AVAILABLE');
 assert.equal(checkReplayPoints([p(5000,0),p(4000,.1)]).reason,'OUT_OF_ORDER');
 assert.equal(checkReplayPoints([p(1000,0),p(5000,-1)]).reason,'INVALID_POINT');
 assert.equal(checkReplayPoints([p(1000,0),p(5000,.1,'false')]).reason,'INVALID_POINT');
});
test('RUNNING replay output directly matches authoritative v4 running adapter',()=>{
 const speed=2.5;
 const actual=evaluateGpsReplayReference({activity:'RUNNING',speedMps:speed});
 const expected=calculateRunningReference({distanceKm:speed*60/1000,durationMinutes:1});
 assert.equal(actual.modelVersion,expected.modelVersion);
 assert.deepEqual(actual.rows,expected.rows);
 assert.equal(actual.state,'REFERENCE_ONLY');
 assert.equal(actual.rows.length,12);
});
test('JOGGING replay output matches untouched jog engine without extrapolation',()=>{
 const speed=2.25,actual=evaluateGpsReplayReference({activity:'JOGGING',speedMps:speed});
 const expected=calculateJoggingReference({speedMps:speed});
 assert.deepEqual(actual.rows,expected.rows);
 assert.equal(actual.modelVersion,expected.modelVersion);
 assert.equal(actual.rows.length,12);
});
test('WALK replay output matches untouched walk engine without extrapolation',()=>{
 const speed=1.5,actual=evaluateGpsReplayReference({activity:'WALK',speedMps:speed});
 const expected=calculateWalkingReference({speedMps:speed});
 assert.deepEqual(actual.rows,expected.rows);
 assert.equal(actual.modelVersion,expected.modelVersion);
 assert.equal(actual.rows.length,12);
});
test('out of speed range must not fabricate calculated 12-region values',()=>{
 const actual=evaluateGpsReplayReference({activity:'WALK',speedMps:14});
 assert.equal(actual.rows.length,12);
 assert.equal(actual.count,0);
 assert.equal(actual.state,'NO_AUTHORIZED_SPEED_REFERENCE');
});
test('GPS frames align references with timestamps and have no temporal averaging',()=>{
 const series=[p(1000,0,true),p(6000,.0125),p(11000,.0275)];
 const result=buildGpsReplayFrames({activity:'RUNNING',points:series});
 assert.equal(result.ok,true);assert.equal(result.frames.length,3);
 assert.deepEqual(result.frames.map(x=>x.t),[1000,6000,11000]);
 assert.equal(result.frames[0].reference.rows.length,0);
 assert.notDeepEqual(result.frames[1].reference.rows.map(x=>x.value),result.frames[2].reference.rows.map(x=>x.value));
});
