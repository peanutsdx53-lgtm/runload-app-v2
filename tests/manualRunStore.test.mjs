import test from 'node:test';
import assert from 'node:assert/strict';
import {readManualRuns,saveManualRun,findManualRun,toHistoryRows,MANUAL_RUN_KEY} from '../ui/manualRunStore.js';
import {normalizeRecords} from '../ui/historyExperience.js';
import {reviewView} from '../ui/recordReviewExperience.js';
const store=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const draft=()=>({date:'2026-10-25',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:3,rofAfter:6,steps:'',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN',memo:'朝のランニング',courseName:'川沿い',shoeName:'靴'});
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
 assert.match(reviewView(input,{source:'gps',recordType:'run'}),/data-manual-run-save disabled/);
 assert.match(reviewView(input,{source:'manual',recordType:'rest'}),/data-manual-run-save disabled/);
});
