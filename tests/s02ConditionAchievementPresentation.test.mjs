import test from 'node:test';
import assert from 'node:assert/strict';
import {conditionCard,achievementCard,todayLocal,CONDITION_KEY} from '../ui/homeExperience.js';
function storage(seed={}){const data=new Map(Object.entries(seed));return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),snapshot:()=>JSON.stringify([...data])};}
test('S02: no-life-record is an honest empty state, not zero-duration data',()=>{
 const s=storage(),before=s.snapshot(),html=conditionCard(s);
 assert.match(html,/直近7日の記録はまだありません/);
 assert.match(html,/未記録日は0時間として扱いません/);
 assert.doesNotMatch(html,/hx-bars"/);
 assert.equal(s.snapshot(),before,'render never writes input data');
});
test('S02: corrupt storage is never misreported as empty',()=>{
 const s=storage({[CONDITION_KEY]:'{bad'}),html=conditionCard(s);
 assert.match(html,/生活記録を確認できません/);
 assert.doesNotMatch(html,/直近7日の記録はまだありません/);
});
test('S02: explicitly recorded sleep shows dated bars and provenance',()=>{
 const s=storage({[CONDITION_KEY]:JSON.stringify([{date:todayLocal(),sleepMinutes:420,feeling:'良い',memo:'本人が記録'}])});
 const html=conditionCard(s);
 assert.match(html,/hx-bars"/);
 assert.match(html,/記録した日のみ表示します/);
 assert.doesNotMatch(html,/直近7日の記録はまだありません/);
});
test('S02: each achievement displays its real threshold and status, no invented success',()=>{
 const empty=achievementCard({ok:true,records:[]});
 for(const title of ['初回の走行','30分以上','累計50 km','累計100 km'])assert.match(empty,new RegExp(title.replace(' ','\\s*')));
 assert.equal((empty.match(/hx-award-item locked/g)||[]).length,4);
 assert.equal((empty.match(/hx-award-item won/g)||[]).length,0);
 assert.match(empty,/手入力走行のみを集計します/);
 const saved=achievementCard({ok:true,records:[{source:'manual',type:'run',id:'run-1',distanceKm:5,durationSeconds:2100}]});
 assert.equal((saved.match(/hx-award-item won/g)||[]).length,2);
 assert.equal((saved.match(/hx-award-item locked/g)||[]).length,2);
 assert.match(saved,/5.0/);
 const error=achievementCard({ok:false,reason:'破損'});
 assert.doesNotMatch(error,/hx-award-item won|hx-award-item locked/);
 assert.match(error,/実績を確認できません/);
});
