import test from 'node:test';
import assert from 'node:assert/strict';
import {createRofUiState,rofPage,nearestAnchorIndex,setRofScore,setRofPhase,adjustRofScore,clearRofScore,focusRofAnchor} from '../ui/rofExperience.js';
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