import test from 'node:test';
import assert from 'node:assert/strict';
import {
 prepareGpsV2Run,prepareGpsExperience,validGpsExperience,validGpsV2Summary,validGpsV2Detail,
 inspectGpsV2Backup,readGpsV2Summaries,saveGpsV2Run,
 GPS_V2_DB,GPS_V2_BACKUP_FORMAT
} from '../ui/gpsReplayIndexedDbStore.js';

const initial=1700000000000;
const point=(i,km)=>({
 lat:37.501+i*.00005,lon:139.91,ele:null,altitudeAccuracy:null,
 altitudeQuality:'missing',km,t:initial+i*5000,breakBefore:i===0,activity:'RUNNING'
});
function session(){
 const track=[point(0,0),point(1,.0125),point(2,.025)];
 return {phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
   accepted:3,rejected:0,track,trackSimplified:false,
   replayTrack:track.map(p=>({t:p.t,km:p.km,breakBefore:p.breakBefore})),
   replayTrackAvailable:true,flags:[{
      id:'flag-000001',t:track[1].t,km:track[1].km,
      lat:track[1].lat,lon:track[1].lon,note:'坂道'
   }]
 };
}
test('opt-out writes only summary and does not persist location/speed/flags',()=>{
 const x=prepareGpsV2Run(session(),{saveDetails:false,date:'2026-10-27'});
 assert.equal(x.ok,true,x.reason);assert.equal(x.detail,null);
 assert.equal(x.summary.detailSaved,false);assert.equal(validGpsV2Summary(x.summary),true);
 assert.doesNotMatch(JSON.stringify(x.summary),/37\.50|139\.91|坂道|speedPoints/);
 assert.equal(x.summary.finalReference.regions.length,12);
});
test('opt-in creates separately validated summary and detail with source-speed checkpoints',()=>{
 const s=session(),x=prepareGpsV2Run(s,{saveDetails:true,date:'2026-10-27'});
 assert.equal(x.ok,true,x.reason);assert.equal(validGpsV2Summary(x.summary),true);
 assert.equal(validGpsV2Detail(x.detail),true);
 assert.equal(x.detail.speedPoints.length,3);assert.equal(x.detail.flags.length,1);
 assert.equal(x.detail.route.at(-1).km,.025);
 assert.equal(s.flags[0].note,'坂道');
 assert.deepEqual(x.detail.speedPoints.map(y=>y.t),s.replayTrack.map(y=>y.t));
});
test('partial or missing speed series refuses opt-in instead of silent downgrade',()=>{
 let s=session();s.replayTrackAvailable=false;
 assert.equal(prepareGpsV2Run(s,{saveDetails:true}).ok,false);
 s=session();s.replayTrack=s.replayTrack.slice(0,2);
 assert.equal(prepareGpsV2Run(s,{saveDetails:true}).ok,false);
 s=session();s.replayTrack[1].breakBefore='false';
 assert.equal(prepareGpsV2Run(s,{saveDetails:true}).ok,false);
});
test('mixed runs can store summary but cannot produce mixed 12 region calculations',()=>{
 const s=session();s.activity='MIXED';
 const x=prepareGpsV2Run(s,{saveDetails:false});
 assert.equal(x.ok,true,x.reason);
 assert.equal(x.summary.finalReference.state,'MIXED_NOT_SUPPORTED');
 assert.equal(x.summary.finalReference.regions.every(v=>v.value===null),true);
});
test('v2 backup identifies bad detail, duplicates and wrong metadata',()=>{
 const x=prepareGpsV2Run(session(),{saveDetails:true});
 const data={format:GPS_V2_BACKUP_FORMAT,version:2,summaries:[x.summary],details:[x.detail]};
 assert.equal(inspectGpsV2Backup(JSON.stringify(data)).ok,true);
 assert.equal(inspectGpsV2Backup(JSON.stringify({...data,details:[]})).ok,false);
 assert.equal(inspectGpsV2Backup(JSON.stringify({...data,summaries:[x.summary,x.summary]})).ok,false);
 assert.equal(inspectGpsV2Backup(JSON.stringify({...data,version:1})).ok,false);
});
test('v2 IndexedDB unavailable fails closed without touching old v1 database',async()=>{
 const prev=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 try{
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined});
  const s=await readGpsV2Summaries();
  assert.equal(s.ok,false);
  const r=await saveGpsV2Run(session(),{saveDetails:false});
  assert.equal(r.ok,false);
  assert.notEqual(GPS_V2_DB,'runload-v2-gps-measurements-v1');
 }finally{if(prev)Object.defineProperty(globalThis,'indexedDB',prev);else delete globalThis.indexedDB;}
});

test('GPS ROF responses remain user reports on same GPS identity, 0 differs from missing, old summaries still valid',()=>{
 const at='2026-10-31T11:40:00.000Z';
 const experience={source:'USER_REPORTED',rofBefore:0,rofAfter:null,beforeCapturedAt:at,afterCapturedAt:null,memo:'前は疲れていなかった'};
 const saved=prepareGpsV2Run(session(),{saveDetails:false,experience});
 assert.equal(saved.ok,true,saved.reason);
 assert.deepEqual(saved.summary.experience,experience);
 assert.equal(validGpsV2Summary(saved.summary),true);
 assert.equal(validGpsExperience(saved.summary.experience),true);
 const old=prepareGpsV2Run(session(),{saveDetails:false});
 assert.equal(old.ok,true,old.reason);
 assert.equal('experience' in old.summary,false,'older records remain readable without invented self-report');
 assert.equal(validGpsV2Summary(old.summary),true);
 const notAnswered=prepareGpsV2Run(session(),{saveDetails:false,experience:{source:'USER_REPORTED',rofBefore:null,rofAfter:null,beforeCapturedAt:null,afterCapturedAt:null,memo:''}});
 assert.equal(notAnswered.ok,true);
 assert.equal(notAnswered.summary.experience.rofBefore,null);
 assert.equal(notAnswered.summary.experience.rofAfter,null);
 for(const invalid of [{...experience,rofBefore:11},{...experience,rofAfter:2.5},{...experience,memo:'x'.repeat(501)},{...experience,beforeCapturedAt:'invalid'},{...experience,rofBefore:null}])
  assert.equal(prepareGpsV2Run(session(),{experience:invalid}).ok,false,JSON.stringify(invalid));
});
