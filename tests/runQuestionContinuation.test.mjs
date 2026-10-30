import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateQuestions,saveRunQuestionContinuation} from '../ui/runQuestionContinuation.js';
import {makeUi,saveNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
import {visibleTopicNotes,noteRunBackLink} from '../ui/noteRunLink.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const run=(n,date,gait='RUNNING')=>({id:id(n),date,createdAt:'2026-10-2'+n+'T08:00:00.000Z',
 schema:2,source:'manual',type:'run',distanceKm:n+3,durationSeconds:1800,
 rofBefore:0,rofAfter:null,draft:{activityGait:gait}});
const store=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,
 setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),map:m};};
function setup(){
 const storage=store(),runs={ok:true,records:[run(1,'2026-10-21'),run(2,'2026-10-22')]};
 const ui=makeUi(storage);ui.selected='01';ui.topic='距離・時間・ペース';
 const note=saveNote(ui,'次回は同じ場所で感じたペースを確認する',{focusRunId:id(1),manualRuns:runs});
 assert.equal(note.ok,true,note.reason);
 return {storage,runs,source:ui.notes[0]};
}
test('stage10: explicit source question creates a second note preserving IDs and unchanged original',()=>{
 const {storage,runs,source}=setup();
 const old=storage.getItem(EXPLORATION_NOTE_KEY);
 assert.deepEqual(candidateQuestions([source],runs,id(1),id(2)).map(x=>x.id),[source.id]);
 const created=saveRunQuestionContinuation(storage,runs,{fromRunId:id(1),toRunId:id(2),sourceNoteId:source.id,text:'今回も確認した。違いの原因は未判定'});
 assert.equal(created.ok,true,created.reason);
 assert.equal(created.note.recordId,id(2));
 assert.equal(created.note.continuedFromNoteId,source.id);
 assert.equal(created.note.topicId,source.topicId);
 assert.equal(created.note.text,'今回も確認した。違いの原因は未判定');
 const notes=makeUi(storage).notes;
 assert.equal(notes.length,2);
 assert.deepEqual(notes[1],source,'source note remains byte-for-byte logically unmodified');
 assert.deepEqual(visibleTopicNotes(notes,source.topicId,id(1)).map(x=>x.id),[source.id]);
 assert.deepEqual(visibleTopicNotes(notes,source.topicId,id(2)).map(x=>x.id),[created.note.id]);
 assert.deepEqual(noteRunBackLink(notes[0],runs),{recordId:id(2),date:'2026-10-22'});
 assert.equal(saveRunQuestionContinuation(storage,runs,{fromRunId:id(1),toRunId:id(2),sourceNoteId:source.id,text:'duplicate'}).ok,false);
 assert.notEqual(storage.getItem(EXPLORATION_NOTE_KEY),old);
});
test('stage10: unrelated, future, missing, cross gait, nonconsensual, corrupted and quota cases fail closed',()=>{
 const {storage,runs,source}=setup(),baseline=storage.getItem(EXPLORATION_NOTE_KEY);
 const use=(override={})=>saveRunQuestionContinuation(storage,runs,{fromRunId:id(1),toRunId:id(2),sourceNoteId:source.id,text:'今回の観察',...override});
 for(const o of [{sourceNoteId:''},{sourceNoteId:'nonexistent'},{text:''},{text:'x'.repeat(501)},
  {fromRunId:id(2),toRunId:id(1)},{toRunId:id(1)},{toRunId:id(9)}]){
  assert.equal(use(o).ok,false,JSON.stringify(o));
  assert.equal(storage.getItem(EXPLORATION_NOTE_KEY),baseline);
 }
 const wrong={ok:true,records:[run(1,'2026-10-21'),run(2,'2026-10-22','WALK')]};
 assert.equal(candidateQuestions([source],wrong,id(1),id(2)).length,0);
 assert.equal(saveRunQuestionContinuation(storage,wrong,{fromRunId:id(1),toRunId:id(2),sourceNoteId:source.id,text:'no'}).ok,false);
 assert.equal(storage.getItem(EXPLORATION_NOTE_KEY),baseline);
 storage.setItem(EXPLORATION_NOTE_KEY,'{corrupt');
 assert.equal(use().ok,false);assert.equal(storage.getItem(EXPLORATION_NOTE_KEY),'{corrupt');
 const safe=store();safe.setItem(EXPLORATION_NOTE_KEY,baseline);
 safe.setItem=()=>{throw Error('quota')};
 const quota=saveRunQuestionContinuation(safe,runs,{fromRunId:id(1),toRunId:id(2),sourceNoteId:source.id,text:'cannot save'});
 assert.equal(quota.ok,false);assert.equal(safe.getItem(EXPLORATION_NOTE_KEY),baseline);
});
test('stage10: unlinked and deleted historical source cannot be falsely reassigned',()=>{
 const {storage,runs,source}=setup();
 const u=makeUi(storage);u.notes=[...u.notes,{id:'unlinked',category:'01',text:'unlinked',createdAt:new Date().toISOString()}];
 storage.setItem(EXPLORATION_NOTE_KEY,JSON.stringify(u.notes));
 assert.deepEqual(candidateQuestions(makeUi(storage).notes,runs,id(1),id(2)).map(x=>x.id),[source.id]);
 const after={ok:true,records:[run(2,'2026-10-22')]};
 assert.deepEqual(candidateQuestions(makeUi(storage).notes,after,id(1),id(2)),[]);
 assert.equal(saveRunQuestionContinuation(storage,after,{fromRunId:id(1),toRunId:id(2),sourceNoteId:source.id,text:'invalid'}).ok,false);
});
