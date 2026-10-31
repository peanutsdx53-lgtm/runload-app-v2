import test from 'node:test';
import assert from 'node:assert/strict';
import {trendCard} from '../ui/homeExperience.js';
const run=(n,date,kilometers,source='manual',type='run')=>({
 id:'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0'),
 date,createdAt:'2026-10-2'+n+'T08:00:00Z',
 source,type,distanceKm:kilometers,durationSeconds:1800
});
test('C F18: optional trend shows only saved manual running data, including same-day distinct records',()=>{
 const data={ok:true,records:[run(1,'2026-10-21',4),run(2,'2026-10-21',6),run(3,'2026-10-23',5),run(4,'2026-10-24',300,'gps'),run(5,'2026-10-25',7,'manual','walk')]};
 const html=trendCard(false,data);
 assert.equal((html.match(/class="hx-run-trend-point"/g)||[]).length,3,'two saved same-day runs remain independent');
 for(const x of ['4.00 km','6.00 km','5.00 km','2026-10-21','2026-10-23','保存済み手入力走行','未記録日は0kmにせず'])assert.match(html,new RegExp(x.replace('.','\\.')));
 assert.doesNotMatch(html,/300.00 km|7.00 km|2026-10-24|2026-10-25/);
 assert.equal(html.indexOf('4.00 km')<html.indexOf('5.00 km'),true);
});
test('C F18: empty storage and failed storage must never be confused',()=>{
 assert.match(trendCard(false,{ok:true,records:[]}),/まだありません/);
 const broken=trendCard(false,{ok:false,records:[run(1,'2026-10-21',5)],reason:'破損'});
 assert.match(broken,/確認できません/);
 assert.match(broken,/破損/);
 assert.doesNotMatch(broken,/5.00 km|まだありません/);
});
test('C F18: preview never incorporates private stored data; invalid and unsaved source records fail closed',()=>{
 const rows=[run(1,'2026-10-21',42),run(2,'2026-10-22',Number.NaN),run(3,'2026-10-23',8,'manual','walk')];
 const demo=trendCard(true,{ok:true,records:rows});
 assert.match(demo,/表示例/);
 assert.doesNotMatch(demo,/42.00 km/);
 const real=trendCard(false,{ok:true,records:rows});
 assert.match(real,/42.00 km/);
 assert.doesNotMatch(real,/NaN|8.00 km/);
 assert.doesNotMatch(real,/正式な走行記録と接続すると/);
});
