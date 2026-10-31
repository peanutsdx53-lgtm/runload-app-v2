import test from 'node:test';
import assert from 'node:assert/strict';
import {saveCondition,readConditions,validEntry,CONDITION_KEY} from '../ui/homeExperience.js';
const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),m}};
const entry=date=>({date,sleepMinutes:420,sleepSource:'duration',feeling:'良い',memo:'本人の記録 '+date});
const allDates=()=>{
 const base=Date.parse('2025-01-01T12:00:00Z');
 return Array.from({length:366},(_,i)=>new Date(base+i*86400000).toISOString().slice(0,10));
};
test('B F09: leap and impossible calendar dates never enter saved life context',()=>{
 assert.equal(validEntry(entry('2026-02-30')),false,'calendar overflow must not be normalized as March');
 assert.equal(validEntry(entry('2025-02-29')),false);
 assert.equal(validEntry(entry('2024-02-29')),true);
});
test('B F09: 366 existing days cannot be silently truncated by a new later/earlier date',()=>{
 const s=storage(),dates=allDates(),prior=dates.map(entry);
 s.setItem(CONDITION_KEY,JSON.stringify(prior));
 assert.equal(readConditions(s).entries.length,366);
 const before=s.getItem(CONDITION_KEY);
 for(const date of ['2026-10-31','2024-12-31']){
  const result=saveCondition(s,entry(date));
  assert.equal(result.ok,false);
  assert.match(result.reason,/366日分/);
  assert.equal(s.getItem(CONDITION_KEY),before,'all previous day rows stay byte-identical');
 }
 const overwrite=saveCondition(s,{...entry(dates[100]),memo:'本人が同日記録を訂正'});
 assert.equal(overwrite.ok,true);
 assert.equal(readConditions(s).entries.length,366);
 assert.equal(readConditions(s).entries.find(x=>x.date===dates[100]).memo,'本人が同日記録を訂正');
});
test('B F09: transition 365→366 succeeds, 366→367 rejects; failed storage mutation keeps data',()=>{
 const dates=allDates(),s=storage();
 s.setItem(CONDITION_KEY,JSON.stringify(dates.slice(0,365).map(entry)));
 const added=saveCondition(s,entry(dates[365]));
 assert.equal(added.ok,true);
 assert.equal(readConditions(s).entries.length,366);
 const bytes=s.getItem(CONDITION_KEY);
 assert.equal(saveCondition(s,entry('2027-01-01')).ok,false);
 assert.equal(s.getItem(CONDITION_KEY),bytes);
 const f=storage();f.setItem(CONDITION_KEY,JSON.stringify(dates.slice(0,365).map(entry)));
 const original=f.getItem(CONDITION_KEY);f.setItem=()=>{throw Error('quota')};
 assert.equal(saveCondition(f,entry(dates[365])).ok,false);
 assert.equal(f.getItem(CONDITION_KEY),original);
});
