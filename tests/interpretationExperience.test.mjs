import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLifePacket,latestEligibleLifeBaseline,evaluateLifeIntent,INTERPRETATION_RULE_VERSION} from '../ui/interpretationRules.js';
import {createLifeIntent,loadIntent,updateIntent,ACTION_INTENT_KEY} from '../ui/actionIntentStore.js';
import {lifeComparisonPanel,actionIntentCard} from '../ui/interpretationView.js';
const entry=(date,minutes=360,source='duration',feeling='ふつう')=>({date,sleepMinutes:minutes,sleepSource:source,feeling,memo:''});
const good={canSave:true,entries:[entry('2026-10-20',360),entry('2026-10-22',450,'duration','良い')]};
const storage=()=>{const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
test('ready packet reports descriptive 90min difference and bounded knowledge',()=>{
 const p=buildLifePacket(good,'2026-10-20','2026-10-22');
 assert.equal(p.status,'ready');assert.equal(p.minutesDelta,90);assert.match(p.observation,/1時間30分/);
 assert.deepEqual(p.evidenceRefs,['saved-condition:2026-10-20','saved-condition:2026-10-22']);
 assert.match(p.uncertainty,/原因.*判断できません/);assert.equal(p.knowledge.sourceId,'walsh2021-bjsm');
 assert.equal(p.ruleVersion,INTERPRETATION_RULE_VERSION);
});
test('different input methods must never be converted to one sleep metric',()=>{
 const p=buildLifePacket({canSave:true,entries:[entry('2026-10-20',360),entry('2026-10-22',450,'clock')]},'2026-10-20','2026-10-22');
 // malformed standalone clock entries rejected by strict read adapter; either way, fail closed
 assert.notEqual(p.status,'ready');
});
test('absence, same date and missing date do not fabricate a comparison',()=>{
 assert.equal(buildLifePacket(good,'2026-10-20','2026-10-20').status,'insufficient');
 assert.equal(buildLifePacket(good,'2026-10-19','2026-10-22').status,'insufficient');
 assert.equal(buildLifePacket(good,'2026-13-01','2026-10-22').status,'insufficient');
 assert.equal(buildLifePacket({entries:[],canSave:false},'2026-10-20','2026-10-22').status,'unavailable');
 assert.equal(buildLifePacket({canSave:true,entries:[]},'','').status,'insufficient');
});
test('last eligible baseline is real saved life data and never an unsaved draft',()=>{
 assert.deepEqual(latestEligibleLifeBaseline(good).date,'2026-10-22');
 assert.equal(latestEligibleLifeBaseline({entries:[],canSave:true}),null);
});
test('intent opt-in stores independent of exploration notes, recovers across reload',()=>{
 const s=storage();s.setItem('runload-v2-exploration-notes-v1','[]');
 assert.equal(loadIntent(s).intent,null);
 const r=createLifeIntent(s,latestEligibleLifeBaseline(good),'2026-10-22T10:00:00.000Z');
 assert.equal(r.ok,true);assert.equal(loadIntent(s).intent.baseline.minutes,450);
 assert.ok(s.map.has(ACTION_INTENT_KEY));assert.equal(s.getItem('runload-v2-exploration-notes-v1'),'[]');
 assert.equal(evaluateLifeIntent(loadIntent(s).intent,good).status,'waiting');
 const after={canSave:true,entries:[...good.entries,entry('2026-10-23',430)]};
 const status=evaluateLifeIntent(loadIntent(s).intent,after);
 assert.equal(status.status,'ready');assert.equal(status.dateB,'2026-10-23');
 assert.equal(status.packet.minutesDelta,-20);
});
test('intent baseline deletion and modification retract readiness',()=>{
 const s=storage();createLifeIntent(s,latestEligibleLifeBaseline(good));
 const intent=loadIntent(s).intent;
 const missing={canSave:true,entries:[entry('2026-10-20',360),entry('2026-10-23',450)]};
 assert.equal(evaluateLifeIntent(intent,missing).status,'unavailable');
 const changed={canSave:true,entries:[entry('2026-10-20',360),entry('2026-10-22',451),entry('2026-10-23',460)]};
 assert.equal(evaluateLifeIntent(intent,changed).status,'unavailable');
});
test('later different-method record is not a matching follow-up',()=>{
 const s=storage();createLifeIntent(s,latestEligibleLifeBaseline(good));
 const withLegacy={canSave:true,entries:[...good.entries,{date:'2026-10-23',sleepMinutes:400,feeling:'ふつう',memo:''}]};
 assert.equal(evaluateLifeIntent(loadIntent(s).intent,withLegacy).status,'waiting');
});
test('corruption and failed write protect existing data and do not report success',()=>{
 const s=storage();s.setItem(ACTION_INTENT_KEY,'{"broken":1}');const raw=s.getItem(ACTION_INTENT_KEY);
 assert.equal(loadIntent(s).ok,false);assert.equal(createLifeIntent(s,latestEligibleLifeBaseline(good)).ok,false);
 assert.equal(s.getItem(ACTION_INTENT_KEY),raw);
 const q=storage();createLifeIntent(q,latestEligibleLifeBaseline(good));const saved=q.getItem(ACTION_INTENT_KEY);
 q.setItem=(k,v)=>{throw Error('quota')};assert.equal(updateIntent(q,null).ok,true,'delete does not need quota');
 const f=storage();f.setItem=(k,v)=>{throw Error('quota')};assert.equal(createLifeIntent(f,latestEligibleLifeBaseline(good)).ok,false);
 const corrupt=storage();corrupt.setItem(ACTION_INTENT_KEY,'INVALID');assert.equal(loadIntent(corrupt).ok,false);
});
test('render escapes potentially unsafe text, shows reasons and knowledge',()=>{
 const malicious={canSave:true,entries:[entry('2026-10-20',360,'duration','<img src=x onerror=alert(1)>'),entry('2026-10-22',450)]};
 const view=lifeComparisonPanel(malicious,{a:'2026-10-20',b:'2026-10-22'});
 assert.match(view,/&lt;img/);assert.doesNotMatch(view,/<img src=x onerror/);
 assert.match(view,/原因やランニングへの影響は判断できません/);
 assert.match(view,/参考研究/);assert.match(view,/次の記録と見比べることを保存/);
 const s=storage();const i=createLifeIntent(s,latestEligibleLifeBaseline(good)).intent;
 assert.match(actionIntentCard(i,good),/記録待ち/);
 assert.equal(actionIntentCard(null,good), '');
});
test('source and optionality remain visible on daypair and action card',()=>{
 const h=lifeComparisonPanel(good,{a:'2026-10-20',b:'2026-10-22'});
 assert.match(h,/本人が記録した調子/); // our text currently uses '記録した調子'
 assert.match(h,/自動で原因を判定したり、通知を送ったりはしません/);
});
