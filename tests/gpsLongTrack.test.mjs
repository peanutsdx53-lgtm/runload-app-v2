import test from 'node:test';
import assert from 'node:assert/strict';
import {GPS_LIMITS,compactGpsTrack,createGpsSession} from '../ui/gpsMeasurementCore.js';
import {prepareGpsRun,isValidGpsRecord,gpsRecordToFeature} from '../ui/gpsMeasurementStore.js';

test('bounded GPS compaction preserves endpoints, discontinuities and informative turns',()=>{
 const track=Array.from({length:101},(_,i)=>({
  lat:37.5+i*.000023,lon:139.9+(i===50?.003:0),t:1000000+i*1000,
  ele:100+(i===50?65:0),altitudeAccuracy:8,altitudeQuality:'usable',
  accuracyM:5,km:i*.0026,breakBefore:i===20||i===75,
  activity:i>=75?'WALK':'RUNNING'
 }));
 const before=JSON.stringify(track);
 const compact=compactGpsTrack(track,21);
 assert.ok(compact.length<=21);
 assert.equal(compact[0].t,track[0].t);
 assert.equal(compact.at(-1).t,track.at(-1).t);
 assert.equal(compact.at(-1).km,track.at(-1).km);
 assert.ok(compact.some(p=>p.t===track[50].t),'salient corner and elevation peak is retained');
 for(let i=1;i<compact.length;i++){
  const from=(compact[i-1].t-1000000)/1000,to=(compact[i].t-1000000)/1000;
  const skippedBoundary=track.slice(from+1,to+1).some((p,j)=>p.breakBefore||p.activity!==track[from+j].activity);
  if(skippedBoundary)assert.equal(compact[i].breakBefore,true,'a missing gap must not create a false bridge');
 }
 assert.equal(JSON.stringify(track),before,'compaction is pure');
});

test('4 hours of 1 Hz GPS fixes keep the actual route finish, measured distance and gap boundaries',()=>{
 let time=1700000000000,success=null,watch=0;
 const geo={watchPosition:cb=>{success=cb;return ++watch},clearWatch:()=>{}};
 const run=createGpsSession({geo,now:()=>time});
 assert.equal(run.setActivity('MIXED'),true);
 assert.equal(run.start(),true);
 const total=14401,startTime=time;
 for(let i=0;i<total;i++){
  if(i===5000){assert.equal(run.pause(),true);time+=7000;assert.equal(run.resume(),true);}
  if(i===8000)assert.equal(run.setSegment('WALK'),true);
  if(i===10500)assert.equal(run.setSegment('JOGGING'),true);
  if(i===11500)time+=35000; // Simulates suspended GPS rather than inventing traveled distance.
  const coords={latitude:37.5+i*.000023,longitude:139.9+.00006*Math.sin(i/45),
    accuracy:7,altitude:150+5*Math.sin(i/75),altitudeAccuracy:8};
  success({timestamp:time,coords});time+=1000;
  assert.ok(run.state.track.length<=GPS_LIMITS.maxTrack,'every accepted fix keeps bounded memory');
 }
 assert.equal(run.finish(),true);
 const snap=run.getSnapshot();
 assert.equal(snap.accepted,total);
 assert.equal(snap.rejected,0);
 assert.ok(snap.elapsedMs>=4*3600*1000,'the full run is timed');
 assert.equal(snap.trackSimplified,true);
 assert.ok(snap.track.length>500&&snap.track.length<=GPS_LIMITS.maxTrack);
 assert.equal(snap.track[0].t,startTime);
 assert.equal(snap.track.at(-1).t,time-1000);
 assert.ok(Math.abs(snap.track.at(-1).km-snap.distanceM/1000)<1e-7,'saved endpoint matches full measured distance');
 assert.ok(snap.distanceM>30000&&snap.distanceM<50000);
 const breakPoints=snap.track.filter(p=>p.breakBefore);
 assert.ok(breakPoints.length>=3,'pause, activity changes and stale GPS gap survive thinning');
 assert.ok(snap.track.some(p=>p.activity==='WALK'));
 assert.ok(snap.track.some(p=>p.activity==='JOGGING'));
 assert.ok(snap.track.every((p,i)=>!i||(p.t>snap.track[i-1].t&&p.km>=snap.track[i-1].km)));
 const saved=prepareGpsRun(snap,{saveRoute:true,date:'2026-10-27'});
 assert.equal(saved.ok,true,saved.reason);
 assert.equal(isValidGpsRecord(saved.record),true);
 assert.equal(saved.record.trackSimplified,true);
 assert.equal(saved.record.accepted,total);
 assert.ok(Math.abs(saved.record.track.at(-1).km-saved.record.distanceKm)<.00011);
 const feature=gpsRecordToFeature(saved.record);
 assert.equal(feature.simplified,true);
 assert.ok(Math.abs(feature.distanceKm-snap.distanceM/1000)<1e-7);
 const altered={...saved.record,track:saved.record.track.slice(0,-1)};
 assert.equal(isValidGpsRecord(altered),false,'old truncated-tail GPS data cannot claim the whole measured route');
 const noRoute=prepareGpsRun(snap,{saveRoute:false,date:'2026-10-27'});
 assert.equal(noRoute.ok,true);
 assert.equal(noRoute.record.track.length,0);
 assert.equal(noRoute.record.trackSimplified,false,'opt-out retains no geometry or simplification metadata');
});

test('stale GPS data after resume are rejected instead of appended to a newer route',()=>{
 let cb,time=1700000000000;
 const run=createGpsSession({geo:{watchPosition:f=>{cb=f;return 1},clearWatch:()=>{}},now:()=>time});
 run.start();
 const fix=t=>({timestamp:t,coords:{latitude:37.5,longitude:139.9,accuracy:5,altitude:null,altitudeAccuracy:null}});
 cb(fix(time));time+=1000;
 run.pause();run.resume();
 cb(fix(time-2000));
 assert.equal(run.state.rejected,1);
 assert.equal(run.state.track.length,1);
 cb(fix(time));
 assert.equal(run.state.track.length,2);
 assert.equal(run.state.track[1].breakBefore,true);
});
