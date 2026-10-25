import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHistoryUi,normalizeRecords,lookupRecord,filterRecords,renderHistory} from '../ui/historyExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const fixtures=[
 {id:'saved-A',type:'run',date:'2026-10-21',distanceKm:8.42,durationSeconds:2792,courseName:'朝の周回コース',memo:'保存済みの記録A',shoeName:'靴A'},
 {id:'saved-B',type:'run',date:'2026-10-18',distanceKm:4.21,durationSeconds:1390,courseName:'公園周回',memo:'保存済みの記録B',shoeName:'靴B'},
 {id:'saved-C',type:'rest',date:'2026-10-16',memo:'休養日'}
];
test('no synthetic records or saved results in the production history view',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 const html=renderHistory(ui,[],{connected:false});
 assert.match(html,/保存済みの履歴はまだ接続されていません/);
 assert.match(html,/未保存の入力内容/);
 assert.ok(!html.includes('sample-run-'));
 assert.ok(!html.includes('8.42'));
 assert.equal((html.match(/data-select-id=/g)||[]).length,0);
 assert.ok(!html.includes('data-open-record'));
 assert.ok(read('app.js').includes('historyExperience.mountHistory'));
 assert.ok(read('app.js').includes('records:[],connected:false'));
});
test('explicit saved record ID controls display and no fallback from unknown IDs',()=>{
 const ui=createHistoryUi();ui.month='2026-10';
 const saved=normalizeRecords(fixtures);
 assert.equal(saved.length,3);
 assert.equal(lookupRecord(saved,'saved-A')?.distanceKm,8.42);
 assert.equal(lookupRecord(saved,'saved-B')?.distanceKm,4.21);
 assert.equal(lookupRecord(saved,'not-a-record'),null);
 ui.selectedId='saved-A';
 let html=renderHistory(ui,saved,{connected:true,onOpen:id=>id});
 assert.match(html,/保存済みの記録A/);
 assert.match(html,/data-open-record/);
 assert.match(html,/8\.42/);
 ui.selectedId='unknown';
 html=renderHistory(ui,saved,{connected:true,onOpen:id=>id});
 assert.ok(!html.includes('data-open-record'));
 assert.ok(!html.includes('保存済みの記録A'));
});
test('calendar filters and Japanese text search use authorized record collection only',()=>{
 const rows=normalizeRecords(fixtures),ui=createHistoryUi();ui.month='2026-10';
 assert.equal(filterRecords(rows,ui).length,3);
 ui.day=21;assert.deepEqual(filterRecords(rows,ui).map(r=>r.id),['saved-A']);
 ui.day=null;ui.type='rest';assert.deepEqual(filterRecords(rows,ui).map(r=>r.id),['saved-C']);
 ui.type='run';ui.query='公園';assert.deepEqual(filterRecords(rows,ui).map(r=>r.id),['saved-B']);
 ui.month='2026-11';assert.equal(filterRecords(rows,ui).length,0);
});
test('invalid IDs, duplicate IDs, invalid dates and injection are rejected or escaped',()=>{
 const records=normalizeRecords([...fixtures,fixtures[0],{id:'x',type:'run',date:'2026-02-31'}, {id:'y',type:'bogus',date:'2026-10-01'},{id:'z',type:'run',date:'2026-10-01',memo:'<img src=x onerror=alert(1)>'}]);
 assert.equal(records.length,4);
 const ui=createHistoryUi();ui.month='2026-10';ui.selectedId='z';
 const html=renderHistory(ui,records,{connected:true,onOpen() {}});
 assert.ok(!html.includes('<img src=x onerror='));
 assert.ok(html.includes('&lt;img'));
 assert.equal(lookupRecord(records,'absent'),null);
});
