import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFirstUse} from '../ui/firstUseExperience.js';
const state=(step)=>({step,termsAccepted:true,privacyConfirmed:true,documentOpen:'',replay:false,stepError:'',nickname:'',purpose:'',heightCm:'',weightKg:''});
test('B F01: first-use guide explains all four research operations with optional reflection and limits',()=>{
 const guide=renderFirstUse(state(2));
 for(const part of ['手入力で記録する','結果を確認する','過去と比較する','任意で気づきを書く','同じ意味・方法','文献参考値の意味と限界','毎回すべての操作を行う必要はありません']){
  assert.ok(guide.includes(part),part);
 }
 assert.equal((guide.match(/class="fu-number-card"/g)||[]).length,4);
 assert.match(guide,/data-onboard-skip-guide/);
 assert.doesNotMatch(guide,/本人の理解が向上|傷害の予防が証明/);
 const legal=renderFirstUse(state(1));
 assert.match(legal,/data-onboard-next/);
 const setting=renderFirstUse(state(7));
 assert.match(setting,/設定せずに始める/);
});
