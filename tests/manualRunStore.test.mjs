import test from 'node:test';
import assert from 'node:assert/strict';
import {readManualRuns,saveManualRun,findManualRun,classifySavedManualRun,toHistoryRows,MANUAL_RUN_KEY} from '../ui/manualRunStore.js';
import {normalizeRecords} from '../ui/historyExperience.js';
import {calculateActivityReference} from '../core/activity/activityReference.js';
import {reviewView} from '../ui/recordReviewExperience.js';
const store=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const draft=()=>({date:'2026-10-25',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:3,rofAfter:6,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'朝のランニング',courseName:'川沿い',shoeName:'靴'});
test('valid manual run saves stable explicit ID and survives reload',()=>{
 const s=store(),r=saveManualRun(s,draft());assert.equal(r.ok,true,r.reason);
 const read=readManualRuns(s);
 assert.equal(read.ok,true);assert.equal(read.records.length,1);
 assert.equal(read.records[0].distanceKm,5);assert.equal(read.records[0].durationSeconds,1800);
 assert.equal(findManualRun(s,r.record.id).record.id,r.record.id);
 assert.equal(normalizeRecords(toHistoryRows(read))[0].id,r.record.id);
});
test('reject unsaved GPS preview and rest via explicit provenance gate',()=>{
 const s=store();
 assert.equal(saveManualRun(s,draft(),{source:'gps'}).ok,false);
 assert.equal(saveManualRun(s,draft(),{type:'rest'}).ok,false);
 assert.equal(readManualRuns(s).records.length,0);
});
test('reject invalid real dates, missing time, invalid pace and invalid ROF',()=>{
 for(const change of [{date:'2026-02-30'},{distance:'0'},{distance:'NaN'},{minutes:''},{minutes:'-3'},{rofAfter:22}]){
  const s=store(),bad=saveManualRun(s,{...draft(),...change});assert.equal(bad.ok,false,JSON.stringify(change));
  assert.equal(s.getItem(MANUAL_RUN_KEY),null);
 }
});
test('save refuses contradictory running-only portions of mixed exercise',()=>{
 const b={...draft(),activityGait:'RUNNING',runningFormat:'RUN_WALK',runWalkRunningDistanceKm:'3',runWalkRunningDurationMinutes:'20'};
 const good=store();assert.equal(saveManualRun(good,b).ok,true);
 for(const x of [{runWalkRunningDistanceKm:'5'},{runWalkRunningDistanceKm:'6'},{runWalkRunningDurationMinutes:'30'},{runWalkRunningDurationMinutes:'32'}]){
  const s=store();assert.equal(saveManualRun(s,{...b,...x}).ok,false,JSON.stringify(x));
  assert.equal(s.getItem(MANUAL_RUN_KEY),null);
 }
});
test('a corrupted source is never erased or treated as empty',()=>{
 const s=store();s.setItem(MANUAL_RUN_KEY,'{corrupt');
 assert.equal(readManualRuns(s).ok,false);
 assert.equal(saveManualRun(s,draft()).ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),'{corrupt');
});
test('quota denial leaves draft and unrelated stores intact',()=>{
 const s=store();s.setItem('runload-v2-life-condition-v1','unchanged');
 s.setItem=()=>{throw Error('quota')};
 assert.equal(saveManualRun(s,draft()).ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),null);
 assert.equal(s.getItem('runload-v2-life-condition-v1'),'unchanged');
});
test('new save leaves existing saved condition, insight and exploration stores byte-identical',()=>{
 const s=store();
 for(const key of ['runload-v2-life-condition-v1','runload-v2-condition-insights-v1','runload-v2-exploration-notes-v1'])s.setItem(key,'do-not-touch');
 assert.equal(saveManualRun(s,draft()).ok,true);
 for(const key of ['runload-v2-life-condition-v1','runload-v2-condition-insights-v1','runload-v2-exploration-notes-v1'])assert.equal(s.getItem(key),'do-not-touch');
});
test('record confirmation saves only eligible manual runs',()=>{
 const input=draft();
 assert.match(reviewView(input,{source:'manual',recordType:'run'}),/data-manual-run-save(?! disabled)/);
 assert.match(reviewView(input,{source:'gps',recordType:'run'}),/data-manual-run-save[^>]* disabled/);
 assert.match(reviewView(input,{source:'manual',recordType:'rest'}),/data-manual-run-save[^>]* disabled/);
});

test('new manual save requires three inputs independently and does not alter storage on failure',()=>{
 for(const change of [
  {distance:''},{distance:'0'},{distance:'NaN'},{distance:'   '},
  {minutes:'',hours:'',seconds:''},{minutes:'0',hours:'',seconds:''},
  {activityGait:''},{activityGait:'UNKNOWN'},{activityGait:'RUN_WALK'},{activityGait:'INVALID'}
 ]){
  const s=store(),bad=saveManualRun(s,{...draft(),...change});
  assert.equal(bad.ok,false,'must reject '+JSON.stringify(change));
  assert.equal(s.getItem(MANUAL_RUN_KEY),null);
  assert.match(bad.reason,/距離|時間|活動種目/);
 }
 const s=store(),r=saveManualRun(s,draft());
 assert.equal(r.ok,true,r.reason);
 assert.equal(readManualRuns(s).records.length,1);
});
test('old unspecified saved manual record can be classified only by an explicit valid user choice',()=>{
 const storage=store(),created=saveManualRun(storage,draft());
 assert.equal(created.ok,true,created.reason);
 const history=readManualRuns(storage);
 const legacy=history.records[0];
 storage.setItem(MANUAL_RUN_KEY,JSON.stringify({version:1,revision:history.revision+1,
  records:[{...legacy,draft:{...legacy.draft,activityGait:''}}]}));
 const before=readManualRuns(storage),id=created.record.id;
 assert.equal(before.records[0].draft.activityGait,'');
 const beforeRaw=structuredClone(before.records[0]);
 assert.equal(classifySavedManualRun(storage,id,'UNKNOWN').ok,false);
 assert.equal(classifySavedManualRun(storage,id,'RUN_WALK').ok,false);
 assert.equal(readManualRuns(storage).revision,before.revision);
 const changed=classifySavedManualRun(storage,id,'RUNNING');
 assert.equal(changed.ok,true,changed.reason);
 assert.equal(changed.record.id,id);
 const after=readManualRuns(storage);
 assert.equal(after.revision,before.revision+1);
 assert.equal(after.records.length,1,'activity correction cannot duplicate user runs');
 assert.deepEqual({...after.records[0],draft:{...after.records[0].draft,activityGait:''}},beforeRaw,
   'date, distance, time, fatigue, notes and original ID are preserved');
 assert.equal(after.records[0].draft.activityGait,'RUNNING');
 assert.equal(classifySavedManualRun(storage,id,'JOGGING').ok,false,'existing explicit classification must not be silently overwritten');
 assert.ok(calculateActivityReference(after.records[0]).count>0,'original engine can calculate after user classification');
});
test('saved manual gait classification fails closed for corrupted storage, unknown IDs and quota failure',()=>{
 const s=store(),r=saveManualRun(s,draft());assert.equal(r.ok,true);
 assert.equal(classifySavedManualRun(s,'run-v1-00000000-0000-4000-8000-000000000001','WALK').ok,false);
 const before=s.getItem(MANUAL_RUN_KEY);s.setItem=()=>{throw Error('quota')};
 assert.equal(classifySavedManualRun(s,r.record.id,'WALK').ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),before);
 const c=store();c.setItem(MANUAL_RUN_KEY,'{broken');
 assert.equal(classifySavedManualRun(c,r.record.id,'WALK').ok,false);
 assert.equal(c.getItem(MANUAL_RUN_KEY),'{broken');
});

test('ROF-J true zero, missing fatigue and retrospective date survive storage and history untouched',()=>{
 const s=store(),first=saveManualRun(s,{...draft(),date:'2026-10-01',rofBefore:0,rofAfter:null});
 assert.equal(first.ok,true,first.reason);
 const second=saveManualRun(s,{...draft(),date:'2026-10-02',rofBefore:null,rofAfter:0});
 assert.equal(second.ok,true,second.reason);
 const read=readManualRuns(s);
 assert.equal(read.ok,true);
 assert.equal(read.records.length,2);
 assert.deepEqual(read.records.map(r=>[r.rofBefore,r.rofAfter]),[[0,null],[null,0]]);
 assert.deepEqual(toHistoryRows(read).map(r=>[r.rofBefore,r.rofAfter]),[[0,null],[null,0]]);
 assert.equal(findManualRun(s,first.record.id).record.rofBefore,0);
 assert.equal(findManualRun(s,first.record.id).record.rofAfter,null);
 assert.equal(findManualRun(s,second.record.id).record.rofBefore,null);
 assert.equal(findManualRun(s,second.record.id).record.rofAfter,0);
 assert.deepEqual(read.records.map(r=>r.date),['2026-10-01','2026-10-02']);
 assert.ok(read.records.every(r=>r.createdAt && Number.isFinite(Date.parse(r.createdAt))));
 const orig=s.getItem(MANUAL_RUN_KEY);
 const invalid=saveManualRun(s,{...draft(),rofBefore:2.5});
 assert.equal(invalid.ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),orig,'failed ROF-J validation preserves existing runs');
});

test('stage 7 does not silently truncate a shoe or course name on manual save',()=>{
 const storage=store();
 const exact='靴'.repeat(100);
 const good=saveManualRun(storage,{...draft(),shoeName:exact});
 assert.equal(good.ok,true,good.reason);
 assert.equal(good.record.shoeName,exact);
 assert.equal(readManualRuns(storage).records[0].shoeName,exact);
 for(const change of [{shoeName:'靴'.repeat(101)},{courseName:'道'.repeat(101)}]){
  const before=storage.getItem(MANUAL_RUN_KEY);
  const failed=saveManualRun(storage,{...draft(),...change});
  assert.equal(failed.ok,false,JSON.stringify(change));
  assert.match(failed.reason,/100文字/);
  assert.equal(storage.getItem(MANUAL_RUN_KEY),before,'invalid long name cannot mutate existing runs');
 }
});
test('stage 7 shoe-name UI caps match the non-truncating saved-record contract',async()=>{
 const {readFileSync}=await import('node:fs');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const body=readFileSync(new URL('../ui/bodyContextExperience.js',import.meta.url),'utf8');
 assert.match(app,/data-draft="shoeName" maxlength="100"/);
 assert.match(body,/\['shoeName','使用したシューズ','shoe',100,/);
});

test('history projection preserves saved activity without mutating saved schema or guessing legacy gait',()=>{
 const run={id:'run-v1-00000000-0000-0000-0000-000000000111',type:'run',date:'2026-10-25',durationSeconds:1200,distanceKm:2,draft:{activityGait:'WALK'}};
 const unknown={...run,id:'run-v1-00000000-0000-0000-0000-000000000112',draft:{activityGait:''}};
 const before=JSON.stringify([run,unknown]);
 const rows=toHistoryRows({ok:true,records:[run,unknown]});
 assert.deepEqual(rows.map(r=>r.activityGait),['WALK','']);
 assert.deepEqual(normalizeRecords(rows).map(r=>r.activityGait),['WALK','UNKNOWN']);
 assert.equal(JSON.stringify([run,unknown]),before);
 assert.deepEqual(toHistoryRows({ok:false,records:[run]}),[]);
});
