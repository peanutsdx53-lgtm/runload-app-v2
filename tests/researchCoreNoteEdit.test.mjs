import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUi,render,saveNote,editNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),map:m}};
const context={categories:[{id:'03',name:'コース',topics:['上り坂・下り坂']}],draft:{},conditions:{entries:[]}};
test('F15: explicit correction preserves old text, identity, linked run, and serial revisions',()=>{
 const s=storage(),u=makeUi(s),runId=id(1);
 u.selected='03';u.topic='上り坂・下り坂';
 const manualRuns={ok:true,records:[{id:runId,source:'manual',type:'run',schema:2,distanceKm:5,durationSeconds:1800}]};
 assert.equal(saveNote(u,'最初の問い',{focusRunId:runId,manualRuns}).ok,true);
 const before=u.notes[0];
 const first=editNote(u,before.id,'修正した問い');
 assert.equal(first.ok,true,first.reason);
 assert.equal(first.note.id,before.id);
 assert.equal(first.note.recordId,runId);
 assert.equal(first.note.topicId,before.topicId);
 assert.equal(first.note.revisions[0].text,'最初の問い');
 assert.equal(editNote(u,before.id,'もう一度修正').ok,true);
 const persisted=makeUi(s).notes[0];
 assert.equal(persisted.revisions.length,2);
 assert.equal(persisted.revisions[1].text,'修正した問い');
 assert.equal(persisted.text,'もう一度修正');
 u.modal='memories';let view=render(u,context);
 assert.match(view,/data-ex-edit=/);assert.match(view,/もう一度修正/);
 u.modal='edit-note';u.editingNoteId=before.id;view=render(u,context);
 assert.match(view,/ex-note-edit/);assert.match(view,/最初の問い/);
});
test('F15: invalid, concurrent and rejected writes never alter old content',()=>{
 const s=storage(),u=makeUi(s);u.selected='03';u.topic='上り坂・下り坂';
 assert.equal(saveNote(u,'original').ok,true);const noteId=u.notes[0].id;
 const bytes=s.getItem(EXPLORATION_NOTE_KEY);
 for(const [ref,txt] of [['not-exist','new'],[noteId,'original'],[noteId,''],[noteId,'x'.repeat(501)]]){
  assert.equal(editNote(u,ref,txt).ok,false);assert.equal(s.getItem(EXPLORATION_NOTE_KEY),bytes);
 }
 s.setItem(EXPLORATION_NOTE_KEY,'other tab');
 assert.equal(editNote(u,noteId,'new').ok,false);assert.equal(s.getItem(EXPLORATION_NOTE_KEY),'other tab');
 assert.equal(u.canSave,false);
 const safe=storage(),another=makeUi(safe);another.selected='03';another.topic='上り坂・下り坂';
 assert.equal(saveNote(another,'keep').ok,true);const original=safe.getItem(EXPLORATION_NOTE_KEY);
 safe.setItem=()=>{throw Error('quota')};
 assert.equal(editNote(another,another.notes[0].id,'new').ok,false);
 assert.equal(safe.getItem(EXPLORATION_NOTE_KEY),original);
});
