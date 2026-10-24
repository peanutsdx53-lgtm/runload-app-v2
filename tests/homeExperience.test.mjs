import test from "node:test";
import assert from "node:assert/strict";
import {CONDITION_KEY,validEntry,readConditions,saveCondition,conditionCard,achievementCard,todayLocal} from "../ui/homeExperience.js";
function store(seed={}) {
 const data=new Map(Object.entries(seed));
 return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),raw:k=>data.get(k)};
}
test("shared lifestyle diary saves only explicit valid input",()=>{
 const s=store(),day=todayLocal();
 assert.equal(readConditions(s).entries.length,0);
 const sample={date:day,sleepMinutes:400,feeling:"ふつう",memo:"眠りが浅い"};
 assert.equal(validEntry(sample),true);
 assert.equal(saveCondition(s,sample).ok,true);
 assert.deepEqual(readConditions(s).entries,[sample]);
 assert.equal(saveCondition(s,{...sample,sleepMinutes:500}).ok,true);
 assert.equal(readConditions(s).entries.length,1,"upsert does not create duplicate dates");
 assert.equal(readConditions(s).entries[0].sleepMinutes,500);
});
test("invalid entries and corrupt bytes are fail-closed",()=>{
 const s=store({[CONDITION_KEY]:"{invalid"});
 const corrupted=s.raw(CONDITION_KEY);
 assert.equal(readConditions(s).canSave,false);
 assert.equal(saveCondition(s,{date:todayLocal(),sleepMinutes:400,feeling:"ふつう",memo:""}).ok,false);
 assert.equal(s.raw(CONDITION_KEY),corrupted);
 assert.equal(validEntry({date:todayLocal(),sleepMinutes:-1,feeling:"ふつう",memo:""}),false);
 assert.equal(validEntry({date:todayLocal(),sleepMinutes:50,feeling:"unknown",memo:""}),false);
});
test("home never claims unearned or medically inferred score",()=>{
 const s=store();
 const empty=conditionCard(s,false);
 assert.match(empty,/未入力/);
 assert.ok(!empty.includes("78\/100"));
 assert.match(achievementCard(false),/未接続/);
 const preview=achievementCard(true);
 assert.match(preview,/表示例/);
 assert.match(preview,/42\.0/);
});
