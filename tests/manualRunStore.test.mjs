import test from 'node:test';
import assert from 'node:assert/strict';
import {readManualRuns,saveManualRun,findManualRun,classifySavedManualRun,correctSavedRof,toHistoryRows,MANUAL_RUN_KEY} from '../ui/manualRunStore.js';
import {normalizeRecords} from '../ui/historyExperience.js';
import {calculateActivityReference} from '../core/activity/activityReference.js';
import {reviewView} from '../ui/recordReviewExperience.js';
import {makeUi,saveNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
import {noteRunBackLink,visibleTopicNotes} from '../ui/noteRunLink.js';
import {compareSavedRuns} from '../ui/runReflection.js';
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
 storage.setItem(MANUAL_RUN_KEY,JSON.stringify({version:2,revision:history.revision+1,
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

test('stage 10 partial correction preserves two saved IDs, linked question and original note storage',()=>{
 const storage=store();
 const first=saveManualRun(storage,{...draft(),date:'2026-10-22',rofBefore:0,rofAfter:null});
 const second=saveManualRun(storage,{...draft(),date:'2026-10-23',memo:'second run stays unchanged'});
 assert.equal(first.ok,true,first.reason);assert.equal(second.ok,true,second.reason);
 const initial=readManualRuns(storage);
 assert.equal(initial.ok,true);assert.equal(initial.records.length,2);
 const old=initial.records.find(r=>r.id===first.record.id),another=initial.records.find(r=>r.id===second.record.id);
 // Simulate a valid older saved V1 record with an unknown activity.
 storage.setItem(MANUAL_RUN_KEY,JSON.stringify({version:2,revision:initial.revision+1,
  records:initial.records.map(r=>r.id===first.record.id?{...r,draft:{...r.draft,activityGait:'UNKNOWN'}}:r)}));
 const savedUnknown=readManualRuns(storage);
 assert.equal(savedUnknown.ok,true);
 assert.equal(compareSavedRuns(another,savedUnknown.records.find(r=>r.id===old.id)).status,'incompatible');
 const ui=makeUi(storage);ui.selected='01';ui.topic='距離・時間・ペース';
 const question='次回は同じ区間の距離と感じ方を確認する';
 const created=saveNote(ui,question,{focusRunId:old.id,manualRuns:savedUnknown});
 assert.equal(created.ok,true,created.reason);
 const noteRaw=storage.getItem(EXPLORATION_NOTE_KEY);
 const runIds=savedUnknown.records.map(r=>r.id);
 const corrected=classifySavedManualRun(storage,old.id,'JOGGING');
 assert.equal(corrected.ok,true,corrected.reason);
 const after=readManualRuns(storage);
 assert.equal(after.ok,true);assert.equal(after.revision,savedUnknown.revision+1);
 assert.deepEqual(after.records.map(r=>r.id),runIds,'classification must neither create nor replace run identities');
 assert.deepEqual(after.records.find(r=>r.id===another.id),another,'another run is never edited');
 const newOld=after.records.find(r=>r.id===old.id);
 assert.equal(newOld.rofBefore,0,'true zero survives classification');
 assert.equal(newOld.rofAfter,null,'missing self-report remains missing');
 assert.equal(newOld.date,old.date);
 assert.equal(newOld.memo,old.memo);
 assert.equal(newOld.draft.activityGait,'JOGGING');
 assert.equal(storage.getItem(EXPLORATION_NOTE_KEY),noteRaw,'saved optional note bytes are not silently rewritten');
 const reloaded=makeUi(storage);
 assert.equal(reloaded.canSave,true);
 assert.equal(reloaded.notes.length,1);
 assert.equal(reloaded.notes[0].text,question);
 assert.equal(reloaded.notes[0].recordId,old.id);
 assert.deepEqual(noteRunBackLink(reloaded.notes[0],after),{recordId:old.id,date:old.date});
 assert.deepEqual(visibleTopicNotes(reloaded.notes,reloaded.notes[0].topicId,another.id),[],
  'the second run never inherits the earlier question');
 assert.equal(classifySavedManualRun(storage,old.id,'RUNNING').ok,false,'a second reclassification is not permitted');
 assert.equal(storage.getItem(EXPLORATION_NOTE_KEY),noteRaw);
 assert.equal(compareSavedRuns(another,newOld).status,'incompatible','different gait still blocks descriptive comparison');
});

test('stage 8 V2 preserves real zero, absent score, explicit assessment time and immutable corrections',()=>{
 const s=store(),legacyRaw='{"version":1,"records":[{"id":"historic"}]}';
 s.setItem('runload-v2-manual-runs-v1',legacyRaw);
 const saved=saveManualRun(s,{...draft(),rofBefore:0,rofAfter:null,
   rofEntryEvidence:{before:{capturedAt:'2026-10-30T01:00:00.000Z',assessedAt:'2026-10-30T01:00:00.000Z',timeBasis:'AT_ENTRY'}}});
 assert.equal(saved.ok,true,saved.reason);
 assert.equal(saved.record.schema,2);
 assert.equal(JSON.parse(s.getItem(MANUAL_RUN_KEY)).version,2);
 assert.equal(saved.record.rofEvidence.before.score,0);
 assert.equal(saved.record.rofEvidence.before.capturedAt,'2026-10-30T01:00:00.000Z');
 assert.equal(saved.record.rofEvidence.before.assessedAt,'2026-10-30T01:00:00.000Z');
 assert.equal(saved.record.rofEvidence.after.score,null);
 assert.equal(saved.record.rofEvidence.after.assessedAt,null);
 assert.equal(s.getItem('runload-v2-manual-runs-v1'),legacyRaw);
 const id=saved.record.id;
 const changed=correctSavedRof(s,id,'before',3,{timeBasis:'RECALLED',reason:'訂正',changedAt:'2026-10-30T02:00:00.000Z'});
 assert.equal(changed.ok,true,changed.reason);
 assert.equal(changed.record.rofBefore,3);
 assert.equal(changed.record.rofCorrections.length,1);
 assert.equal(changed.record.rofCorrections[0].from,0);
 assert.equal(changed.record.rofCorrections[0].to,3);
 assert.equal(changed.record.rofCorrections[0].old.score,0);
 assert.equal(changed.record.rofCorrections[0].next.assessedAt,null);
 const cleared=correctSavedRof(s,id,'before',null,{changedAt:'2026-10-30T03:00:00.000Z'});
 assert.equal(cleared.ok,true,cleared.reason);
 assert.equal(cleared.record.rofBefore,null);
 assert.equal(cleared.record.rofCorrections.length,2);
 assert.equal(cleared.record.rofCorrections[1].from,3);
 assert.equal(cleared.record.rofCorrections[1].to,null);
 const final=readManualRuns(s);assert.equal(final.ok,true);assert.equal(final.records[0].id,id);
 assert.equal(final.records[0].draft.rofBefore,null);
 assert.equal(s.getItem('runload-v2-manual-runs-v1'),legacyRaw);
 const bytes=s.getItem(MANUAL_RUN_KEY);
 assert.equal(correctSavedRof(s,id,'before','',{}).ok,false);
 assert.equal(correctSavedRof(s,'run-v1-00000000-0000-4000-8000-000000000099','after',5).ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),bytes);
 const broken=JSON.parse(bytes);broken.records[0].rofCorrections[0].from=5;
 s.setItem(MANUAL_RUN_KEY,JSON.stringify(broken));
 assert.equal(readManualRuns(s).ok,false,'broken correction history is not accepted or silently repaired');
 assert.equal(s.getItem('runload-v2-manual-runs-v1'),legacyRaw);
});
test('stage 8 correction rejection for quota and invalid future-only attribution is non-destructive',()=>{
 const s=store(),saved=saveManualRun(s,{...draft(),rofBefore:0});
 assert.equal(saved.ok,true,saved.reason);
 const before=s.getItem(MANUAL_RUN_KEY);
 assert.equal(correctSavedRof(s,saved.record.id,'after',2,{timeBasis:'AT_ENTRY',assessedAt:'2026-01-01T01:00:00.000Z',
   changedAt:'2026-10-30T02:00:00.000Z'}).ok,true,'at-entry assessment belongs to change time');
 const last=s.getItem(MANUAL_RUN_KEY);
 s.setItem=()=>{throw Error('quota')};
 assert.equal(correctSavedRof(s,saved.record.id,'after',6).ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),last);
 assert.notEqual(last,before);
});
