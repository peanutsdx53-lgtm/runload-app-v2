/** Stage 9 concurrency audit.
 * Counterexample, NOT a PASS criterion: localStorage get/revision/set is not a cross-tab atomic transaction.
 * Deterministic interleaving is injected inside the synchronous storage adapter write.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {saveManualRun,readManualRuns,MANUAL_RUN_KEY} from '../ui/manualRunStore.js';
const draft=(date)=>({date,distance:'5',hours:'',minutes:'32',seconds:'',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'CONTINUOUS_RUN',memo:date});
test('stage 9 BLOCKER: sequentially interleaved competing writes can both report success yet lose one run',()=>{
 const map=new Map();
 let competing=null,invoked=false;
 const storage={
  getItem:k=>map.get(k)??null,
  setItem(k,value){
   if(k===MANUAL_RUN_KEY&&!invoked){
    invoked=true;
    competing=saveManualRun(storage,draft('2026-10-20'));
   }
   map.set(k,value);
  },
  removeItem:k=>map.delete(k)
 };
 const outer=saveManualRun(storage,draft('2026-10-21'));
 assert.equal(invoked,true);
 assert.equal(competing.ok,true,competing.reason);
 assert.equal(outer.ok,true,outer.reason);
 const current=readManualRuns(storage);
 assert.equal(current.ok,true);
 assert.equal(current.records.length,1,'COUNTEREXAMPLE: both writes succeeded but only one run survived');
 assert.notEqual(current.records[0].id,competing.record.id,'an acknowledged competing save was lost');
 assert.equal(current.records[0].id,outer.record.id);
 assert.equal(current.revision,1,'both writes committed against the same base revision');
});
