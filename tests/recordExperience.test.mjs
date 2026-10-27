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
test("course layout presents approved three-step flow without changing the save/record contract",()=>{
 const d=draft(),ui=initialCourseUi(d);
 const html=coursePage({recordDraft:d,recordCourseUi:ui},ui,{ok:true,records:[]},true);
 assert.match(html,/rv-course-flow/);
 assert.equal((html.match(/rv-course-step"/g)||[]).length,3);
 assert.match(html,/rv-condition-pair/);
 assert.match(html,/rv-commit-group--apply/);
 assert.match(html,/rv-commit-group--save/);
 assert.match(html,/この条件を記録に使う/);
 assert.match(html,/保存コースは更新されません/);
 assert.match(html,/次回の走行で再利用できます/);
 assert.equal((html.match(/data-course-save /g)||[]).length,1);
 assert.equal((html.match(/data-rv-apply/g)||[]).length,1);
});

test('manual basic page gives user an explicit choice of three independently modeled activities',()=>{
 const d=draft(),state={recordType:'run',recordDraft:d,recordCourseUi:initialCourseUi(d)};
 const html=manualPage(state);
 assert.match(html,/data-manual-gait="RUNNING"/);
 assert.match(html,/data-manual-gait="JOGGING"/);
 assert.match(html,/data-manual-gait="WALK"/);
 assert.match(html,/活動種目が未選択のため保存できません/);
 assert.match(html,/距離・時間・活動種目/);
 assert.match(html,/data-required-field="distance" data-required-ok="false"/);
 assert.match(html,/data-required-field="time" data-required-ok="false"/);
 assert.match(html,/data-required-field="activity" data-required-ok="false"/);
 assert.equal((html.match(/data-manual-gait=/g)||[]).length,3);
 d.activityGait='JOGGING';
 assert.match(manualPage(state),/data-manual-gait="JOGGING" aria-pressed="true"/);
});

test('required statuses work in both mobile and desktop templates without automatic activity guessing',()=>{
 const d={...draft(),date:'2026-10-27',distance:'5',minutes:'30',activityGait:'UNKNOWN'};
 const state={recordType:'run',recordDraft:d,recordCourseUi:initialCourseUi(d)};
 const html=manualPage(state);
 assert.match(html,/未入力・要確認：活動種目/);
 assert.match(html,/aria-required="true"/);
 d.activityGait='RUNNING';
 const complete=manualPage(state);
 assert.match(complete,/必須3項目が入力済みです/);
 assert.match(complete,/data-required-field="activity" data-required-ok="true"/);
 assert.doesNotMatch(complete,/未入力・要確認/);
});
