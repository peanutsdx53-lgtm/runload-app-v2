import test from 'node:test';
import assert from 'node:assert/strict';
import {withManualRunWriteLock,MANUAL_RUN_WRITE_LOCK} from '../ui/manualRunLock.js';
import {saveManualRun,readManualRuns} from '../ui/manualRunStore.js';
const draft=date=>({date,distance:'5',hours:'',minutes:'32',seconds:'',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'CONTINUOUS_RUN',memo:date});
function locks(){
 let queue=Promise.resolve(), calls=[];
 return {calls,request(name,options,operation){
  calls.push({name,mode:options.mode});
  const next=queue.then(()=>operation({name}));
  queue=next.catch(()=>{});
  return next;
 }};
}
const storage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('two concurrent cooperating tabs append without overwriting either record',async()=>{
 const gate=locks(),s=storage();
 const [a,b]=await Promise.all([
  withManualRunWriteLock(()=>saveManualRun(s,draft('2026-10-21')),{locks:gate}),
  withManualRunWriteLock(()=>saveManualRun(s,draft('2026-10-22')),{locks:gate})]);
 assert.equal(a.ok,true,a.reason);assert.equal(b.ok,true,b.reason);
 const got=readManualRuns(s);
 assert.equal(got.ok,true);assert.equal(got.revision,2);
 assert.deepEqual(got.records.map(x=>x.date),['2026-10-21','2026-10-22']);
 assert.deepEqual(gate.calls,[{name:MANUAL_RUN_WRITE_LOCK,mode:'exclusive'},{name:MANUAL_RUN_WRITE_LOCK,mode:'exclusive'}]);
});
test('unsupported locks fail closed without invoking writer',async()=>{
 let written=false;
 const result=await withManualRunWriteLock(()=>{written=true;return {ok:true}},{locks:null});
 assert.equal(result.ok,false);assert.equal(written,false);
 assert.match(result.reason,/保存を停止/);
});
test('rejected or failed lock does not falsely report saved',async()=>{
 let invoked=false;
 const rejected=await withManualRunWriteLock(()=>{invoked=true;return {ok:true}},{locks:{request:async()=>{throw Error('deny')}}});
 assert.equal(rejected.ok,false);assert.equal(invoked,false);
 const failed=await withManualRunWriteLock(()=>{throw Error('quota')},{locks:locks()});
 assert.equal(failed.ok,false);
});
test('exclusive lock waits through asynchronous restore before another writer',async()=>{
 const gate=locks(),events=[];
 let release;const held=new Promise(r=>{release=r;});
 const restore=withManualRunWriteLock(async()=>{events.push('restore-start');await held;events.push('restore-end');return {ok:true}},{locks:gate});
 const write=withManualRunWriteLock(()=>{events.push('save');return {ok:true}},{locks:gate});
 await Promise.resolve();await Promise.resolve();
 assert.deepEqual(events,['restore-start']);
 release();
 assert.equal((await restore).ok,true);assert.equal((await write).ok,true);
 assert.deepEqual(events,['restore-start','restore-end','save']);
});
