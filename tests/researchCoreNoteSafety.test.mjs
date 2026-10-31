import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUi,saveNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
import {renderObservationGuide} from '../ui/explorationTopicView.js';
import {EXPLORATION_DRAFT_GUIDES} from '../ui/explorationTopicGuides.js';
const key=Object.keys(EXPLORATION_DRAFT_GUIDES).find(k=>k.startsWith('02|'));
const [cat,topic]=key.split('|'),id=n=>'run-v1-00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const note=(label,recordId)=>({id:label,category:cat,topicId:EXPLORATION_DRAFT_GUIDES[key].id,text:label+'の経験',createdAt:'2026-10-20T01:00:00Z',...(recordId?{recordId}:{})});
const view=(notes,focusRunId=null,focusRun=null)=>renderObservationGuide({notes},{focusRunId,focusRun},{id:cat,name:'身体'},topic,'観察したこと');
const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))}};
test('P0 observed notes: run A, run B, unlinked general and missing runs do not cross',()=>{
 const notes=[note('A',id(1)),note('B',id(2)),note('unlinked')];
 const a=view(notes,id(1),{id:id(1)});assert.match(a,/Aの経験/);assert.doesNotMatch(a,/Bの経験|unlinkedの経験/);
 const b=view(notes,id(2),{id:id(2)});assert.match(b,/Bの経験/);assert.doesNotMatch(b,/Aの経験|unlinkedの経験/);
 const general=view(notes);assert.match(general,/unlinkedの経験/);assert.doesNotMatch(general,/Aの経験|Bの経験/);
 const deleted=view(notes,id(1),null);assert.doesNotMatch(deleted,/Aの経験|Bの経験|unlinkedの経験/);
});
test('P0 full capacity never silently deletes earliest stored reflection',()=>{
 const s=storage(),u=makeUi(s);u.selected=cat;u.topic=topic;
 for(let i=0;i<49;i++)assert.equal(saveNote(u,'note '+i).ok,true);
 assert.equal(saveNote(u,'note 49').ok,true);
 const bytes=s.getItem(EXPLORATION_NOTE_KEY);
 const denied=saveNote(u,'note 50');
 assert.equal(denied.ok,false);assert.match(denied.reason,/自動削除しません/);
 assert.equal(s.getItem(EXPLORATION_NOTE_KEY),bytes);
 assert.equal(u.notes.length,50);assert.equal(makeUi(s).notes.at(-1).text,'note 0');
});
