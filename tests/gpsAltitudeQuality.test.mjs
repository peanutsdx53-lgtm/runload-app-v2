import test from 'node:test';
import assert from 'node:assert/strict';
import {GPS_LIMITS,snapshotPosition,checkGpsPoint,qualifyGpsAltitude,createGpsSession} from '../ui/gpsMeasurementCore.js';
import {prepareGpsRun,isValidGpsRecord,gpsRecordToFeature} from '../ui/gpsMeasurementStore.js';
const fix=(lat,ms,alt=100,verticalAccuracy=10)=>({timestamp:ms,coords:{latitude:lat,longitude:139.9,accuracy:6,altitude:alt,altitudeAccuracy:verticalAccuracy}});
test('optional altitude getter errors never discard a valid horizontal GPS sample',()=>{
 const value=fix(37.5,1e6);
 Object.defineProperty(value.coords,'altitude',{get(){throw new Error('privacy revocation')}});
 const point=snapshotPosition(value);
 assert.equal(point.lat,37.5);assert.equal(point.ele,null);
});
test('unknown and unreliable altitudes are never represented as verified height',()=>{
 const a=snapshotPosition(fix(37.5,1e6,100,10));
 assert.equal(qualifyGpsAltitude(null,a,{gap:true}).altitudeQuality,'usable');
 const unknown=snapshotPosition(fix(37.5001,1005000,101,null));
 const uncertain=qualifyGpsAltitude(a,unknown,{meters:11});
 assert.equal(uncertain.ele,null);assert.equal(uncertain.altitudeQuality,'unknown-accuracy');
 const low=snapshotPosition(fix(37.5001,1005000,101,GPS_LIMITS.altitudeAccuracyM+1));
 assert.equal(qualifyGpsAltitude(a,low,{meters:11}).altitudeQuality,'low-accuracy');
 const spike=snapshotPosition(fix(37.50025,1005000,300,10));
 assert.equal(qualifyGpsAltitude(a,spike,{meters:28}).altitudeQuality,'spike');
 const good=snapshotPosition(fix(37.50025,1005000,102,10));
 assert.equal(qualifyGpsAltitude(a,good,{meters:28}).ele,102);
});
test('long browser suspension creates an unconnected route segment, never a fictitious distance',()=>{
 const a=snapshotPosition(fix(37.5,1e6));
 const b=snapshotPosition(fix(37.51,1e6+GPS_LIMITS.maxContinuousGapMs+5000));
 const verdict=checkGpsPoint(a,b);
 assert.equal(verdict.ok,true);assert.equal(verdict.gap,true);assert.equal(verdict.meters,0);
});
test('session preserves altitude provenance and saves it without inventing slopes',()=>{
 let handler,ms=1000000;
 const gps=createGpsSession({geo:{watchPosition:ok=>{handler=ok;return 1},clearWatch:()=>{}},now:()=>ms});
 assert.equal(gps.start(),true);
 handler(fix(37.5,ms,100,10)); ms+=5000;
 handler(fix(37.5003,ms,100,null)); ms+=5000;
 handler(fix(37.5006,ms,103,10)); ms+=5000;
 handler(fix(37.5009,ms,300,10)); ms+=5000;
 handler(fix(37.5012,ms,105,10)); ms+=5000;
 gps.finish();
 const s=gps.getSnapshot();
 assert.equal(s.track.length,5);
 assert.deepEqual(s.track.map(p=>p.altitudeQuality),['usable','unknown-accuracy','usable','spike','usable']);
 assert.equal(s.track[1].ele,null);assert.equal(s.track[3].ele,null);
 const saved=prepareGpsRun(s,{saveRoute:true,date:'2026-10-27'});
 assert.equal(saved.ok,true);
 assert.equal(saved.record.track[1].altitudeQuality,'unknown-accuracy');
 const feature=gpsRecordToFeature(saved.record);
 assert.equal(feature.elevationStatus,'partial');assert.equal(feature.elevationPoints,3);
 const corrupt=structuredClone(saved.record);corrupt.track[1].ele=999;
 assert.equal(isValidGpsRecord(corrupt),false,'an unverified altitude cannot contain a measured elevation');
});
test('a route with only unverified altitudes can show a route but not an elevation profile',()=>{
 let handler,ms=1000000;
 const gps=createGpsSession({geo:{watchPosition:ok=>{handler=ok;return 1},clearWatch:()=>{}},now:()=>ms});
 gps.start();handler(fix(37.5,ms,100,null));ms+=5000;handler(fix(37.5003,ms,101,null));ms+=5000;gps.finish();
 const saved=prepareGpsRun(gps.getSnapshot(),{saveRoute:true,date:'2026-10-27'});
 assert.equal(saved.ok,true);assert.equal(gpsRecordToFeature(saved.record).elevationStatus,'unverified');
});
