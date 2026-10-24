import test from "node:test";
import assert from "node:assert/strict";
import {SURFACES,courseReadiness,courseSummary,derivedFlat,initialCourseUi,manualPage,coursePage} from "../ui/recordExperience.js";
const draft=()=>({date:"",distance:"",minutes:"",courseName:"",gradeMode:"UNKNOWN",surfaceMode:"UNKNOWN",upPercent:"",downPercent:"",primarySurface:"",...Object.fromEntries(SURFACES.map(([k])=>["surface"+k,""])),...Object.fromEntries(Array.from({length:5},(_,i)=>[["sectionShare"+i,""],["sectionDirection"+i,"FLAT"],["sectionGrade"+i,""],["sectionSurface"+i,"UNKNOWN"]]).flat())});
test("all eight legacy surface categories remain selectable",()=>{
 assert.deepEqual(SURFACES.map(x=>x[1]),["舗装路","陸上トラック","トレッドミル","締まった土道","不整地トレイル","天然芝","人工芝","砂地"]);
 const d=draft();d.surfaceMode="SINGLE";const ui=initialCourseUi(d);
 assert.equal((coursePage({recordDraft:d},ui).match(/data-rv-surface="/g)||[]).length,8);
});
test("slope proportions distinguish missing from observed zero",()=>{
 const d=draft();d.gradeMode="SUMMARY";
 assert.equal(derivedFlat(d),null);
 assert.equal(courseReadiness(d,initialCourseUi(d)).length>0,true);
 d.upPercent="0";d.downPercent="0";
 assert.equal(derivedFlat(d),100);
 d.upPercent="40";d.downPercent="25";
 assert.equal(derivedFlat(d),35);
 d.downPercent="85";assert.equal(derivedFlat(d),null);
});
test("surface shares require at least two selected nonzero categories summing to 100",()=>{
 const d=draft();d.surfaceMode="MIXED";d.surfacepaved="70";d.surfacetrail="30";
 const ui=initialCourseUi(d);assert.deepEqual(ui.surfaceSelected,["paved","trail"]);
 assert.deepEqual(courseReadiness(d,ui),[]);
 d.surfacetrail="20";assert.match(courseReadiness(d,ui).join(" "),/合計100%/);
});
test("the total duration is minutes only, without invented run values",()=>{
 const d=draft();const state={recordType:"run",recordDraft:d,recordCourseUi:initialCourseUi(d)};
 const html=manualPage(state);
 assert.ok(html.includes('data-draft="minutes"'));
 assert.ok(!html.includes('data-draft="hours"'));
 assert.ok(!html.includes('data-draft="seconds"'));
 assert.ok(!html.includes('data-draft="distance" type="text"'));
 assert.match(courseSummary(d).slope,/未設定/);
 assert.ok(!html.includes('GPSで測定'));
 assert.equal((html.match(/class="rv-link"/g)||[]).length,5);
});
test("course sections never auto-fill empty proportions",()=>{
 const d=draft();d.gradeMode="SECTIONS";
 const ui=initialCourseUi(d);assert.match(courseReadiness(d,ui).join(" "),/区間を追加/);
 ui.sections=2;d.sectionShare0="40";assert.match(courseReadiness(d,ui).join(" "),/合計/);
 d.sectionShare1="60";assert.deepEqual(courseReadiness(d,ui),[]);
});