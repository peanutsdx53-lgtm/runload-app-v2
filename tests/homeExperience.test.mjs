import test from "node:test";
import assert from "node:assert/strict";
import {CONDITION_KEY,validEntry,readConditions,saveCondition,conditionCard,achievementCard,todayLocal,calculatedTimeInBed,conditionEntryFromForm,conditionPanel,latestCard} from "../ui/homeExperience.js";
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

test("bedtime and wake time compute date rollover without inventing sleep",()=>{
 assert.deepEqual(calculatedTimeInBed("23:30","07:00","auto"),{minutes:450,bedDayOffset:1});
 assert.deepEqual(calculatedTimeInBed("00:30","07:00","auto"),{minutes:390,bedDayOffset:0});
 assert.deepEqual(calculatedTimeInBed("22:00","06:30","previous"),{minutes:510,bedDayOffset:1});
 assert.equal(calculatedTimeInBed("23:30","07:00","same"),null,"invalid same-day order");
 assert.equal(calculatedTimeInBed("22:00","22:00","auto"),null,"zero elapsed time invalid");
 assert.equal(calculatedTimeInBed("06:00","06:00","previous"),null,"24 hours requires confirmation rather than silent acceptance");
 assert.equal(calculatedTimeInBed("25:00","07:00","auto"),null);
});
test("clock and self-report provenance are explicit and validated",()=>{
 const fields={date:todayLocal(),feeling:"良い",memo:"朝",sleepMode:"clock",bedTime:"23:30",wakeTime:"07:00",bedDayRule:"auto"};
 const computed=conditionEntryFromForm(fields);
 assert.equal(computed.ok,true);
 assert.deepEqual({source:computed.entry.sleepSource,minutes:computed.entry.sleepMinutes,offset:computed.entry.bedDayOffset},
  {source:"clock",minutes:450,offset:1});
 assert.equal(validEntry(computed.entry),true);
 assert.equal(conditionEntryFromForm({...fields,bedDayRule:"same"}).ok,false);
 assert.equal(conditionEntryFromForm({...fields,wakeTime:""}).ok,false);
 const duration=conditionEntryFromForm({...fields,sleepMode:"duration",duration:"7:30"});
 assert.equal(duration.ok,true);
 assert.equal(duration.entry.sleepSource,"duration");
 assert.equal(duration.entry.sleepMinutes,450);
 assert.equal("bedTime" in duration.entry,false,"duration-only must not invent bedtime");
 assert.equal(conditionEntryFromForm({...fields,sleepMode:"duration",duration:"24:00"}).ok,false);
 assert.equal(conditionEntryFromForm({...fields,sleepMode:"duration",duration:"not-a-time"}).ok,false);
 assert.equal(validEntry({...computed.entry,sleepMinutes:400}),false,"tampered computed total fails validation");
 const twoFields=conditionEntryFromForm({...fields,sleepMode:"duration",durationHours:"7",durationMinutes:"30"});
 assert.equal(twoFields.ok,true);
 assert.equal(twoFields.entry.sleepMinutes,450);
 for(const [h,m] of [["","30"],["7",""],["24","0"],["7","60"],["7","-1"],["-1","15"],["7.5","0"]]){
  assert.equal(conditionEntryFromForm({...fields,sleepMode:"duration",durationHours:h,durationMinutes:m}).ok,false,h+":"+m);
 }
});
test("legacy entries persist alongside new v2 entries and edit without forced conversion",()=>{
 const legacy={date:"2026-10-22",sleepMinutes:400,feeling:"ふつう",memo:"旧記録"};
 const s=store({[CONDITION_KEY]:JSON.stringify([legacy])});
 const clock=conditionEntryFromForm({date:"2026-10-23",feeling:"良い",memo:"",sleepMode:"clock",bedTime:"23:20",wakeTime:"06:00",bedDayRule:"auto"});
 assert.equal(clock.ok,true);
 assert.equal(saveCondition(s,clock.entry).ok,true);
 const out=readConditions(s);
 assert.equal(out.canSave,true);
 assert.deepEqual(out.entries[0],legacy,"old structure preserved byte-for-byte as object");
 assert.equal(out.entries[1].sleepSource,"clock");
 const historicalPanel=conditionPanel(s,false,"2026-10-22");
 assert.match(historicalPanel,/data-sleep-mode="duration"/);
 assert.match(historicalPanel,/name="durationHours"[^>]*value="6"/);
 assert.match(historicalPanel,/name="durationMinutes"[^>]*value="40"/);
 assert.doesNotMatch(historicalPanel,/name="bedTime" value="23:20"/);
 const newPanel=conditionPanel(s,false,"2026-10-23");
 assert.match(newPanel,/data-sleep-mode="clock"/);
 assert.match(newPanel,/name="wakeTime" value="06:00"/);
});

// Minutes-only home display must agree with the editor; persistence and pace stay unchanged.
test("latest saved manual run displays minutes without appended seconds",()=>{
 const record={id:"run-v1-11111111-1111-4111-8111-111111111111",source:"manual",type:"run",distanceKm:5,durationSeconds:2100};
 const card=latestCard(false,record);
 assert.match(card,/35分/);
 assert.doesNotMatch(card,/35分00秒|35分0秒/);
 assert.match(card,/7:00/);
 assert.match(card,/5\\.00/);
 const fractional=latestCard(false,{...record,durationSeconds:1950});
 assert.match(fractional,/32\\.5分/);
 assert.doesNotMatch(fractional,/30秒/);
 assert.match(fractional,/6:30/);
});
