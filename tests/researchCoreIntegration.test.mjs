import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateActivityReference} from '../core/activity/activityReference.js';
import {compareBodyReferenceRows} from '../ui/regionReferenceComparison.js';
import {makeUi,saveNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
import {saveManualRun,readManualRuns,MANUAL_RUN_KEY} from '../ui/manualRunStore.js';
import {noteRunBackLink,visibleTopicNotes} from '../ui/noteRunLink.js';
import {createLifeIntent,loadIntent,ACTION_INTENT_KEY} from '../ui/actionIntentStore.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const run=(n,distanceKm=.15,seconds=60,overrides={})=>({id:id(n),source:'manual',type:'run',schema:2,
 date:'2026-10-'+String(n).padStart(2,'0'),distanceKm,durationSeconds:seconds,
 draft:{activityGait:'RUNNING',runningFormat:'CONTINUOUS_RUN'},...overrides});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('actual science adapters provide comparable same-region references only',()=>{
 const now=run(2,.21),before=run(1,.15);
 const a=calculateActivityReference(now),b=calculateActivityReference(before);
 assert.equal(a.activity,'RUNNING');assert.equal(b.activity,'RUNNING');
 const cmp=compareBodyReferenceRows(now,before,a,b,'R01');
 assert.equal(cmp.status,'ready');assert.ok(Number.isFinite(cmp.difference));
 assert.match(cmp.note,/身体負荷/);
});
test('model-ineligible mixed gait is never converted into a comparison',()=>{
 const now=run(2,.21),before=run(1,.15,60,{draft:{activityGait:'RUNNING',runningFormat:'RUN_WALK'}});
 const cmp=compareBodyReferenceRows(now,before,calculateActivityReference(now),calculateActivityReference(before),'R01');
 assert.equal(cmp.status,'not-calculable');
});
test('exploration note save persists a validated explicit run reference only',()=>{
 const memory=storage(),before=run(1),other=run(2),saved={ok:true,records:[before,other]};
 const ui=makeUi(memory);ui.selected='01';ui.topic='距離・時間・ペース';
 const r=saveNote(ui,'次回は同じ条件で確認する',{focusRunId:before.id,manualRuns:saved});
 assert.equal(r.ok,true);
 const notes=JSON.parse(memory.getItem(EXPLORATION_NOTE_KEY));
 assert.equal(notes[0].recordId,before.id);
 assert.equal(notes[0].text,'次回は同じ条件で確認する');
 assert.equal(memory.getItem('runload-v2-manual-runs-v2'),null);
 const loaded=makeUi(memory);assert.equal(loaded.canSave,true);
 assert.equal(loaded.notes[0].recordId,before.id);
});
test('invalid explicit ID is rejected without writing a misleading note',()=>{
 const memory=storage(),ui=makeUi(memory);ui.selected='01';ui.topic='距離・時間・ペース';
 const result=saveNote(ui,'確認事項',{focusRunId:id(2),manualRuns:{ok:true,records:[run(1)]}});
 assert.equal(result.ok,false);assert.equal(memory.getItem(EXPLORATION_NOTE_KEY),null);
});
test('ordinary notes are still saved without an inferred record ID',()=>{
 const memory=storage(),ui=makeUi(memory);ui.selected='01';ui.topic='距離・時間・ペース';
 const result=saveNote(ui,'自由なメモ');assert.equal(result.ok,true);
 const notes=JSON.parse(memory.getItem(EXPLORATION_NOTE_KEY));
 assert.equal(Object.hasOwn(notes[0],'recordId'),false);
});

test('stage 10: life follow-up and optional running question remain separate across two actual saves',()=>{
 const memory=storage();
 const life=createLifeIntent(memory,{date:'2026-10-20',source:'self-reported',minutes:420},'2026-10-30T10:00:00.000Z');
 assert.equal(life.ok,true,life.reason);
 const lifeRaw=memory.getItem(ACTION_INTENT_KEY);
 const input=(date,memo='')=>({date,distance:'5',hours:'',minutes:'30',seconds:'',
  rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
  activityGait:'RUNNING',runningFormat:'UNKNOWN',memo,courseName:'',shoeName:''});
 const first=saveManualRun(memory,input('2026-10-21','初回の事実メモ'));
 assert.equal(first.ok,true,first.reason);
 const ui=makeUi(memory);ui.selected='01';ui.topic='距離・時間・ペース';
 const question='次の走行で距離と平均ペースを比較したい';
 assert.equal(saveNote(ui,question,{focusRunId:first.record.id,manualRuns:readManualRuns(memory)}).ok,true);
 const noteRaw=memory.getItem(EXPLORATION_NOTE_KEY);
 const second=saveManualRun(memory,input('2026-10-22'));
 assert.equal(second.ok,true,second.reason);
 assert.notEqual(second.record.id,first.record.id);
 assert.equal(memory.getItem(ACTION_INTENT_KEY),lifeRaw,'saving a run must not mutate life-only follow-up');
 assert.equal(memory.getItem(EXPLORATION_NOTE_KEY),noteRaw,'next run must not rewrite or inherit the earlier question');
 const runs=readManualRuns(memory);
 assert.equal(runs.ok,true);
 assert.equal(runs.records.length,2);
 assert.equal(runs.records.find(x=>x.id===second.record.id).memo,'','new run note remains optional');
 const notes=makeUi(memory).notes;
 assert.equal(notes.length,1);
 assert.equal(notes[0].text,question);
 assert.deepEqual(noteRunBackLink(notes[0],runs),{recordId:first.record.id,date:'2026-10-21'});
 assert.deepEqual(visibleTopicNotes(notes,notes[0].topicId,second.record.id),[]);
 const intent=loadIntent(memory);
 assert.equal(intent.ok,true);
 assert.equal(intent.intent.task,'compare-next-life-record');
 assert.equal(intent.intent.baseline.date,'2026-10-20');
 assert.equal(Object.hasOwn(intent.intent,'recordId'),false,'a life follow-up is not a running-record linkage');
});
test('stage 10: saving a free-running note cannot silently inherit an existing life follow-up',()=>{
 const memory=storage();
 const life=createLifeIntent(memory,{date:'2026-10-20',source:'time-in-bed',minutes:460},'2026-10-30T10:00:00.000Z');
 assert.equal(life.ok,true,life.reason);
 const intentBytes=memory.getItem(ACTION_INTENT_KEY);
 const ui=makeUi(memory);ui.selected='01';ui.topic='距離・時間・ペース';
 assert.equal(saveNote(ui,'自分で考えたいこと').ok,true);
 const raw=JSON.parse(memory.getItem(EXPLORATION_NOTE_KEY));
 assert.equal(raw.length,1);
 assert.equal(Object.hasOwn(raw[0],'recordId'),false,'no implicit record linkage');
 assert.equal(Object.hasOwn(raw[0],'task'),false,'no imported life intent');
 assert.equal(memory.getItem(ACTION_INTENT_KEY),intentBytes);
 assert.equal(memory.getItem(MANUAL_RUN_KEY),null,'a note does not fabricate a saved run');
});
