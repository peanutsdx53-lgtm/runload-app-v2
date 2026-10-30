import test from 'node:test';
import assert from 'node:assert/strict';
import {isRunId,findLinkableRun,resolveOptionalNoteRunLink,noteIsForRun,visibleTopicNotes,noteRunBackLink} from '../ui/noteRunLink.js';
const id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const run=n=>({id:id(n),date:'2026-10-'+String(n).padStart(2,'0'),source:'manual',type:'run',schema:1,distanceKm:5,durationSeconds:1800});
const saved={ok:true,records:[run(1),run(2)]};
test('only an explicitly selected valid saved run ID links a note',()=>{
 assert.deepEqual(resolveOptionalNoteRunLink(id(1),saved),{ok:true,recordId:id(1),recordDate:'2026-10-01'});
 assert.deepEqual(resolveOptionalNoteRunLink(null,saved),{ok:true,recordId:null});
 assert.deepEqual(resolveOptionalNoteRunLink('',saved),{ok:true,recordId:null});
});
test('invalid ID, duplicate, failed read and non-run records fail closed',()=>{
 for(const key of ['run-v1-fake','not-a-run',id(3)])assert.equal(resolveOptionalNoteRunLink(key,saved).ok,false);
 assert.equal(resolveOptionalNoteRunLink(id(1),{ok:false,records:[run(1)]}).ok,false);
 assert.equal(resolveOptionalNoteRunLink(id(1),{ok:true,records:[run(1),run(1)]}).ok,false);
 assert.equal(resolveOptionalNoteRunLink(id(1),{ok:true,records:[{...run(1),source:'gps'}]}).ok,false);
 assert.equal(resolveOptionalNoteRunLink(id(1),{ok:true,records:[{...run(1),distanceKm:0}]}).ok,false);
});
test('selected-run notes do not borrow another run or legacy free notes',()=>{
 const notes=[{topicId:'PACE',text:'one',recordId:id(1)},{topicId:'PACE',text:'two',recordId:id(2)},
  {topicId:'PACE',text:'legacy'},{topicId:'OTHER',text:'other',recordId:id(1)}];
 assert.deepEqual(visibleTopicNotes(notes,'PACE',id(1)).map(x=>x.text),['one']);
 assert.deepEqual(visibleTopicNotes(notes,'PACE').map(x=>x.text),['one','two','legacy']);
 assert.equal(noteIsForRun(notes[2],id(1)),false);
});
test('deleted linked run does not create an invented backlink',()=>{
 assert.deepEqual(noteRunBackLink({recordId:id(1)},saved),{recordId:id(1),date:'2026-10-01'});
 assert.equal(noteRunBackLink({recordId:id(1)},{ok:true,records:[run(2)]}),null);
 assert.equal(noteRunBackLink({recordId:id(1)},{ok:false,records:[]}),null);
 assert.equal(noteRunBackLink({topicId:'PACE',text:'legacy'},saved),null);
 assert.equal(isRunId('some id'),false);
});

test('orphan notes and legacy unlinked notes cannot inherit a different run',()=>{
 const old={topicId:'PACE',text:'legacy note'};
 const orphan={topicId:'PACE',text:'linked to missing record',recordId:id(1)};
 const remaining={ok:true,records:[run(2)]};
 assert.equal(noteRunBackLink(old,remaining),null);
 assert.equal(noteRunBackLink(orphan,remaining),null);
 assert.deepEqual(visibleTopicNotes([old,orphan],'PACE',id(2)),[]);
 assert.deepEqual(visibleTopicNotes([old,orphan],'PACE').map(x=>x.text),[old.text,orphan.text]);
 assert.equal(resolveOptionalNoteRunLink(id(1),remaining).ok,false);
});
