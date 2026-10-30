import test from "node:test";
import assert from "node:assert/strict";
import {ROF_J_ANCHORS,isValidRofJ,guidanceForRofJ,referenceImageUrl,ROF_J_RIGHTS} from "../ui/rofJScale.js";
test("ROF-J selection is integer-only 0 through 10; diagram midpoints are not new values",()=>{
 assert.deepEqual(ROF_J_ANCHORS.map(a=>a.position),[0,2.5,5,7.5,10]);
 for(let v=0;v<=10;v++)assert.ok(isValidRofJ(v));
 for(const v of [-1,11,2.5,7.5,NaN,null,undefined,Infinity])assert.equal(isValidRofJ(v),false);
});
test("original author-confirmed Japanese descriptors remain intact",()=>{
 assert.equal(ROF_J_ANCHORS[0].descriptor,"まったく疲れていない");
 assert.equal(ROF_J_ANCHORS[2].descriptor,"中程度に疲れている");
 assert.equal(ROF_J_ANCHORS[4].descriptor,"完全な疲労困憊（何も残っていない状態）");
 assert.match(guidanceForRofJ(2),/少し疲れている/);
 assert.match(guidanceForRofJ(8),/とても疲れている/);
 assert.match(guidanceForRofJ(0),/まったく疲れていない/);
 assert.equal(guidanceForRofJ(null),"数値を選択してください");
});
test("the v2 project serves authorized original ROF figures locally, preserving their attribution",()=>{
 const urls=ROF_J_ANCHORS.map(referenceImageUrl);
 assert.equal(new Set(urls).size,5);
 for(const url of urls)assert.match(url,/^\.\/assets\/rof\/rof-visual-(lowest|low|moderate|high|highest)\.png$/);
 assert.match(ROF_J_RIGHTS.imagesLicense,/by\/4\.0/);
 assert.match(ROF_J_RIGHTS.scaleLicense,/by-nc-nd\/4\.0/);
});

// Protect the previously reviewed corrected 5-anchor placement.
// The publicly published supplementary spreadsheet's position rows are not
// interchangeable with the corrected display; the private permission
// correspondence is retained outside this public repository.
test("all five ROF-J descriptors and labels stay aligned with the corrected display",()=>{
 const expected=[
  [0,"0","まったく疲れていない","lowest"],
  [2.5,"2と3の間","少し疲れている","low"],
  [5,"5","中程度に疲れている","moderate"],
  [7.5,"7と8の間","とても疲れている","high"],
  [10,"10","完全な疲労困憊（何も残っていない状態）","highest"]
 ];
 assert.deepEqual(
  ROF_J_ANCHORS.map(a=>[a.position,a.positionLabel,a.descriptor,a.file]),
  expected
 );
 assert.equal(ROF_J_ANCHORS.length,5);
 for(const a of ROF_J_ANCHORS){
  assert.equal(isValidRofJ(a.position),Number.isInteger(a.position),
   "guide-only midpoints must not become user-selectable values");
 }
});
