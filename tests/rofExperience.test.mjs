import test from 'node:test';
import assert from 'node:assert/strict';
import {createRofUiState,rofPage,nearestAnchorIndex,setRofScore,setRofPhase,adjustRofScore,clearRofScore,focusRofAnchor,setRofTiming,recordRofInput} from '../ui/rofExperience.js';
const fresh=()=>({rofBefore:null,rofAfter:null});
test('approved 11 integer inputs and five non-numeric representative anchors',()=>{
 assert.deepEqual(Array.from({length:11},(_,i)=>nearestAnchorIndex(i)),[0,1,1,1,2,2,2,3,3,4,4]);
 const d=fresh(),ui=createRofUiState(),html=rofPage(d,ui);
 assert.equal((html.match(/data-rof-v4-tick="\d+"/g)||[]).length,11);
 assert.equal((html.match(/data-rof-v4-anchor="\d+"/g)||[]).length,5);
 assert.match(html,/2と3の間/);assert.match(html,/7と8の間/);
 assert.match(html,/rof-visual-lowest.png/);
});
test('before and after selections stay independent and missing is not zero',()=>{
 const d=fresh(),ui=createRofUiState();assert.equal(setRofScore(ui,d,2.5),false);
 assert.equal(setRofScore(ui,d,-1),false);assert.equal(setRofScore(ui,d,11),false);
 assert.equal(setRofScore(ui,d,0),true);assert.equal(d.rofBefore,0);
 assert.equal(setRofPhase(ui,'after',d),true);assert.equal(d.rofAfter,null);
 assert.equal(setRofScore(ui,d,8),true);assert.equal(d.rofAfter,8);
 assert.equal(setRofPhase(ui,'before',d),true);assert.equal(d.rofBefore,0);
 clearRofScore(ui,d);assert.equal(d.rofBefore,null);assert.equal(d.rofAfter,8);
});
test('reading anchor does not change the selected integer',()=>{
 const d=fresh(),ui=createRofUiState();setRofScore(ui,d,4);
 assert.equal(focusRofAnchor(ui,0),true);assert.equal(d.rofBefore,4);
 assert.equal(ui.readingAnchor,true);assert.equal(ui.focusedAnchor,0);
 assert.equal(focusRofAnchor(ui,5),false);
 adjustRofScore(ui,d,1);assert.equal(d.rofBefore,5);assert.equal(ui.readingAnchor,false);
 adjustRofScore(ui,d,-1);assert.equal(d.rofBefore,4);
});
test('missing, blank and boolean inputs cannot become actual ROF-J zero',()=>{
 const d=fresh(),ui=createRofUiState();
 for(const invalid of [null,undefined,'','  ',false,true,[],{},'0.0','2.5']){
  assert.equal(setRofScore(ui,d,invalid),false,'must reject '+String(invalid));
  assert.equal(d.rofBefore,null,'invalid input must preserve missing');
 }
 assert.equal(setRofScore(ui,d,'0'),true);
 assert.equal(d.rofBefore,0,'true scale zero remains valid');
 assert.equal(setRofScore(ui,d,null),false);
 assert.equal(d.rofBefore,0,'invalid reset must not erase actual zero');
 clearRofScore(ui,d);
 assert.equal(d.rofBefore,null,'only explicit clear changes zero to missing');
});

test('stage 8 explicit contemporary and retrospective ROF-J entries have separate captured and declared times',()=>{
 const d={rofBefore:null,rofAfter:null},ui=createRofUiState();
 assert.equal(setRofTiming(d,'before','AT_ENTRY'),true);
 assert.equal(recordRofInput(d,'before',0,'2026-10-30T01:00:00.000Z'),true);
 assert.equal(d.rofBefore,0);
 assert.deepEqual(d.rofEntryEvidence.before,{capturedAt:'2026-10-30T01:00:00.000Z',
  assessedAt:'2026-10-30T01:00:00.000Z',timeBasis:'AT_ENTRY'});
 setRofPhase(ui,'after',d);
 assert.equal(setRofTiming(d,'after','RECALLED','2026-10-29T16:00'),true);
 assert.equal(recordRofInput(d,'after',8,'2026-10-30T02:00:00.000Z'),true);
 assert.equal(d.rofEntryEvidence.after.capturedAt,'2026-10-30T02:00:00.000Z');
 assert.equal(d.rofEntryEvidence.after.timeBasis,'RECALLED');
 assert.notEqual(d.rofEntryEvidence.after.assessedAt,d.rofEntryEvidence.after.capturedAt);
 assert.equal(setRofTiming(d,'after','RECALLED','invalid'),false);
 assert.equal(recordRofInput(d,'after',null,'2026-10-30T03:00:00.000Z'),true);
 assert.equal(d.rofAfter,null);
});

test('S06: optional metadata collapses by default while phase switching remains available',()=>{
 const d={rofBefore:0,rofAfter:null};
 const ui=createRofUiState();
 const html=rofPage(d,ui);
 assert.match(html,/<details class="rv4-optional-meta" >/);
 assert.doesNotMatch(html,/data-rof-v4-next-phase/);
 assert.match(html,/data-rof-v4-phase="before"/);
 assert.match(html,/data-rof-v4-phase="after"/);
 assert.match(html,/value="0"/);
 ui.metaOpen=true;setRofPhase(ui,'after',d);
 const next=rofPage(d,ui);
 assert.match(next,/<details class="rv4-optional-meta" open>/);
 assert.doesNotMatch(next,/data-rof-v4-next-phase/);
 assert.match(next,/まだ選択されていません/);
});

test('S06 native condition-style time inputs use date+time separately, no overflowing datetime-local',()=>{const v=rofPage({rofBefore:null,rofAfter:null,exerciseTimingDraft:{startedLocal:'2026-10-30T10:20',endedLocal:''}},createRofUiState());assert.match(v,/data-rof-run-start-date/);assert.match(v,/data-rof-run-end-date/);assert.match(v,/type="time" data-rof-run-start/);assert.match(v,/value="10:20"/);assert.doesNotMatch(v,/type="datetime-local" data-rof-run-start/);assert.doesNotMatch(v,/data-rof-v4-next-phase/);});
