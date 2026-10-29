import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateActivityReference} from '../core/activity/activityReference.js';
import {compareBodyReferenceRows} from '../ui/regionReferenceComparison.js';
import {makeUi,saveNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const run=(n,distanceKm=.15,seconds=60,overrides={})=>({id:id(n),source:'manual',type:'run',schema:1,
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
 assert.equal(memory.getItem('runload-v2-manual-runs-v1'),null);
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
