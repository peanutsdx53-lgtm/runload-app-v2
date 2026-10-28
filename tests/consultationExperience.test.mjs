import test from 'node:test';
import assert from 'node:assert/strict';
import {consultationSources, periodRecords,trendSvg,renderConsultation} from '../ui/consultationExperience.js';
const saved=(id,date,distanceKm,extra={})=>({id,date,distanceKm,source:'manual',durationSeconds:1800,createdAt:date+'T12:00:00Z',...extra});
test('read-only reporting uses only validated saved records and does not mutate inputs',()=>{
 const records=[saved('real','2026-10-25',5),saved('bad','2026-10-24',NaN)];
 const manual={ok:true,records};const gps={ok:true,records:[]};const conditions={canSave:true,entries:[]};
 const before=JSON.stringify(records[0]);
 const result=consultationSources({manual,gps,conditions});
 assert.deepEqual(result.records.map(r=>r.id),['real']);
 assert.equal(JSON.stringify(records[0]),before);
 assert.deepEqual(result.errors,[]);
});
test('corrupted storage is never interpreted as valid records',()=>{
 const r=consultationSources({manual:{ok:false,reason:'corrupt'},gps:{ok:true,records:[]},conditions:{canSave:false,reason:'corrupt'}});
 assert.deepEqual(r.records,[]);
 assert.equal(r.errors.length,2);
});
test('period selects recorded days only and keeps missing days absent',()=>{
 const r=[saved('a','2026-10-21',2),saved('b','2026-10-27',5),saved('c','2026-10-17',7)];
 const selected=periodRecords(r,7,new Date('2026-10-27T12:00:00'));
 assert.deepEqual(selected.map(x=>x.id),['b','a']);
});
test('distance trend carries a km vertical axis and never manufactures unrecorded zeros',()=>{
 assert.match(trendSvg([]),/保存済みの運動記録はありません/);
 const svg=trendSvg([saved('a','2026-10-25',2.8),saved('b','2026-10-27',5.2)]);
 assert.match(svg,/距離（km）/);
 assert.match(svg,/2\.8/);
 assert.match(svg,/5\.2/);
 assert.doesNotMatch(svg,/表示例|架空/);
});
test('approved report retains diagrams, explanations, control and print output',()=>{
 const html=renderConsultation();
 for(const label of ['人体図・12部位','算出値・回答値の見方','相談・共有','印刷 / PDF','期間中の推移'])assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/2026年10月20日|デザイン候補|実装時は/);
 assert.match(html,/data-mode-button="period"/);
});
