import test from 'node:test';
import assert from 'node:assert/strict';
import {measurementPage,activityDescription} from '../ui/measurementExperience.js';
import {createGpsSession,GPS_ACTIVITY,snapshotPosition,checkGpsPoint,formatGpsClock,gpsPace} from '../ui/gpsMeasurementCore.js';
import {prepareGpsRun,isValidGpsRecord,gpsRecordToFeature} from '../ui/gpsMeasurementStore.js';
const sample=(latitude,longitude,t,accuracy=8)=>({timestamp:t,coords:{latitude,longitude,accuracy,altitude:115,altitudeAccuracy:10}});
function harness(){let time=1000000,callback,error,watch=0,clear=0;const geo={watchPosition:(ok,err)=>{callback=ok;error=err;return ++watch;},clearWatch:()=>{clear++}};
 const gps=createGpsSession({geo,now:()=>time});return {gps,emit:(lat,lon,offset=0,accuracy=8)=>callback(sample(lat,lon,time+offset,accuracy)),error:code=>error({code}),tick:ms=>time+=ms,stats:()=>({watch,clear})};}
function measured(h){assert.equal(h.gps.start(),true);h.emit(37.5,139.9);h.tick(5000);h.emit(37.50025,139.9);h.tick(5000);h.gps.finish();return h.gps.getSnapshot();}
test('GPS starts only after direct command; view never displays fabricated metrics',()=>{const h=harness();const html=measurementPage(h.gps.state,0);assert.match(html,/data-gps-action="start"/);assert.match(html,/data-gps-activity/);assert.match(html,/data-gps-map/);assert.match(html,/©/);assert.match(html,/data-gps-goal-mode/);assert.doesNotMatch(html,/data-gps-save-route/,'track storage choice is shown only after finishing');assert.doesNotMatch(html,/5\.21/);assert.equal(h.stats().watch,0);assert.equal(GPS_ACTIVITY.MIXED,'走る＋歩く');assert.match(activityDescription('WALK'),/12部位/);});
test('GPS position validation rejects accessor failures, poor accuracy, stale timestamp and speed spikes',()=>{assert.equal(snapshotPosition({get coords(){throw Error('permission')}}),null);const p=snapshotPosition(sample(37.5,139.9,1000000));assert.equal(checkGpsPoint(null,p).ok,true);assert.equal(checkGpsPoint(p,snapshotPosition(sample(37.5,139.9001,1005000,200))).ok,false);assert.equal(checkGpsPoint(p,snapshotPosition(sample(37.5,139.9001,999999))).ok,false);assert.equal(checkGpsPoint(p,snapshotPosition(sample(38,139.9,1000001))).ok,false);assert.equal(checkGpsPoint(p,snapshotPosition(sample(37.500001,139.9,1005000))).ok,false);});
test('GPS start, pause, resume, mixed segment create disconnected route, clean watch',()=>{const h=harness();assert.equal(h.gps.setActivity('MIXED'),true);assert.equal(h.gps.start(),true);h.emit(37.5,139.9);h.tick(5000);h.emit(37.50025,139.9);assert.ok(h.gps.state.distanceM>20);assert.equal(h.gps.pause(),true);const d=h.gps.state.distanceM;h.tick(10000);assert.equal(h.gps.resume(),true);h.emit(37.5003,139.9);assert.equal(h.gps.state.distanceM,d,'resuming does not bridge missing GPS segment');h.tick(5000);assert.equal(h.gps.setSegment('WALK'),true);h.emit(37.50035,139.9);h.tick(5000);h.emit(37.50055,139.9);assert.ok(h.gps.state.distanceM>d);assert.equal(h.gps.finish(),true);const snap=h.gps.getSnapshot();assert.equal(snap.phase,'finished');assert.equal(snap.track.some(x=>x.breakBefore),true);assert.equal(snap.track.at(-1).activity,'WALK');assert.equal(h.stats().clear,2);assert.equal(Math.round(snap.elapsedMs/1000),15);assert.ok(gpsPace(snap.distanceM,snap.elapsedMs)!=='—');assert.equal(formatGpsClock(3610000),'01:00:10');});
test('GPS record preparation protects optional route and measured quality',()=>{
 const h=harness(),session=measured(h);
 const no=prepareGpsRun(session,{saveRoute:false,date:'2026-10-26'});
 const yes=prepareGpsRun(session,{saveRoute:true,date:'2026-10-26'});
 assert.equal(no.ok,true);assert.equal(no.record.track.length,0);
 assert.equal(yes.ok,true);assert.ok(yes.record.track.length>=2);
 assert.equal(isValidGpsRecord(yes.record),true);
 const feature=gpsRecordToFeature(yes.record);assert.ok(feature.distanceKm>=.01);assert.ok(feature.elevationPoints>0);
});
test('GPS record cannot be saved from blank, mock or uncompleted state',()=>{const h=harness();assert.equal(prepareGpsRun(h.gps.getSnapshot()).ok,false);h.gps.start();h.emit(37.5,139.9);h.tick(3000);h.gps.finish();assert.equal(prepareGpsRun(h.gps.getSnapshot()).ok,false);});

test('GPS permission revocation stops watcher and pauses until fresh consent',()=>{
 const h=harness();
 assert.equal(h.gps.state.keepScreenAwake,false);
 assert.equal(h.gps.setKeepScreenAwake(true),true);
 assert.equal(h.gps.state.keepScreenAwake,true);
 h.gps.start();
 assert.equal(h.gps.setKeepScreenAwake(false),false);
 h.emit(37.5,139.9);
 h.error(1);
 assert.equal(h.gps.state.phase,'paused');
 assert.equal(h.stats().clear,1);
 assert.match(h.gps.state.positionError,/拒否/);
 assert.equal(h.gps.resume(),true,'controller resumes only if caller reauthorizes via the app UI');
 assert.equal(h.stats().watch,2);
 h.gps.discard();
 assert.equal(h.stats().clear,2);
});
