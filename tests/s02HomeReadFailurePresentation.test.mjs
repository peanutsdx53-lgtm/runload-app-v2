import test from 'node:test';
import assert from 'node:assert/strict';
import {latestCard} from '../ui/homeExperience.js';
test('S02: zero saved records is distinct from inaccessible or corrupt records',()=>{
 const empty=latestCard(false,null,{ok:true,records:[]});
 assert.match(empty,/走行記録はまだありません/);
 assert.doesNotMatch(empty,/role="alert"/);
 const corrupt=latestCard(false,null,{ok:false,reason:'記録の破損を検出しました',records:[]});
 assert.match(corrupt,/走行記録を確認できません/);
 assert.match(corrupt,/破損を検出しました/);
 assert.match(corrupt,/記録が0件という意味ではありません/);
 assert.match(corrupt,/role="alert"/);
 assert.doesNotMatch(corrupt,/走行記録はまだありません/);
 const missing=latestCard(false,null,{ok:false,reason:'',records:[]});
 assert.match(missing,/保存領域を確認/);
});
test('S02: preview stays explicitly hypothetical and recovered saved ID opens only matching result',()=>{
 const run={id:'run-v1-11111111-1111-4111-8111-111111111111',date:'2026-10-29',source:'manual',type:'run',distanceKm:6,durationSeconds:1800};
 const saved=latestCard(false,run,{ok:true,records:[run]});
 assert.match(saved,/6.00/);
 assert.match(saved,/result\?record=run-v1-11111111-1111-4111-8111-111111111111/);
 assert.doesNotMatch(saved,/まだありません|role="alert"/);
 const fake=latestCard(true,null,{ok:false,reason:'unavailable'});
 assert.match(fake,/表示例/);assert.doesNotMatch(fake,/unavailable|走行記録はまだありません/);
});
