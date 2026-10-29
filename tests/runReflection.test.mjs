import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareSavedRuns,comparableRunChoices} from '../ui/runReflection.js';
const id=x=>'run-v1-00000000-0000-4000-8000-'+String(x).padStart(12,'0');
const run=(n,overrides={})=>({source:'manual',type:'run',schema:1,id:id(n),date:'2026-10-2'+n,createdAt:'2026-10-2'+n+'T08:00:00.000Z',distanceKm:5,durationSeconds:1800,rofBefore:0,rofAfter:4,courseName:'川沿い',memo:'自分の感覚を記録',draft:{activityGait:'RUNNING'},...overrides});
test('same-gait saved run comparison shows facts, true zero and provenance safely',()=>{
 const earlier=run(1),later=run(2,{distanceKm:5.5,durationSeconds:1980,rofAfter:null});
 const result=compareSavedRuns(later,earlier);
 assert.equal(result.status,'ready');assert.equal(result.rows.length,5);
 assert.deepEqual(result.rows.find(x=>x.key==='rofBefore'),{key:'rofBefore',label:'運動前に感じた疲れ',first:'0',second:'0',change:0,unit:'点'});
 assert.equal(result.rows.find(x=>x.key==='rofAfter').change,null);
 assert.match(result.uncertainty,/原因/);assert.match(result.uncertainty,/文献参考値/);
 assert.equal(result.rows.find(x=>x.key==='distance').change,.5);
});
test('saved ROF-J comparisons disclose missing individual assessment timestamps',()=>{
 const result=compareSavedRuns(run(2),run(1));
 assert.equal(result.status,'ready');
 assert.match(result.uncertainty,/ROF-Jの個別評価時刻は保存していない/);
 assert.match(result.uncertainty,/時間的に変化した量は判定できません/);
 // Differences between two entered scores remain descriptive, not temporal eligibility.
 assert.equal(result.rows.find(x=>x.key==='rofBefore').change,0);
});

test('unsupported, cross-activity, invented and same records fail closed',()=>{
 assert.equal(compareSavedRuns(run(1),run(1)).status,'same-record');
 assert.equal(compareSavedRuns(run(1),run(2,{draft:{activityGait:'WALK'}})).status,'incompatible');
 assert.equal(compareSavedRuns(run(1),run(2,{draft:{activityGait:'UNKNOWN'}})).status,'incompatible');
 assert.equal(compareSavedRuns(run(1),run(2,{source:'gps'})).status,'unavailable');
 assert.equal(compareSavedRuns(null,run(2)).status,'unavailable');
});
test('choices use only validated saved source and never fall back for store failures',()=>{
 const current=run(1),other=run(2);
 assert.deepEqual(comparableRunChoices({ok:true,records:[other,current,run(3,{source:'gps'})]},current.id).map(x=>x.id),[other.id]);
 assert.deepEqual(comparableRunChoices({ok:false,records:[other]},current.id),[]);
});
test('no imported science calculator or storage write in comparison helper',()=>{
 const code=readFileSync(new URL('../ui/runReflection.js',import.meta.url),'utf8');
 assert.doesNotMatch(code,/calculateActivityReference|setItem|localStorage|IndexedDB/);
});
