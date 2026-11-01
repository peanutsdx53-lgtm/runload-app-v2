import test from "node:test";
import assert from "node:assert/strict";
import {SURFACES,courseReadiness,courseSummary,derivedFlat,initialCourseUi,surfaceShareState,manualPage,coursePage} from "../ui/recordExperience.js";
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
 assert.match(html,/この画面を閉じて、記録の入力画面に戻ります/);
 assert.match(html,/保存すると、次回の入力で呼び出せます/);
 assert.equal((html.match(/data-course-save /g)||[]).length,1);
 assert.equal((html.match(/data-rv-apply/g)||[]).length,1);
});

test('manual basic page gives user an explicit choice of three independently modeled activities',()=>{
 const d=draft(),state={recordType:'run',recordDraft:d,recordCourseUi:initialCourseUi(d)};
 const html=manualPage(state);
 assert.match(html,/data-manual-gait="RUNNING"/);
 assert.match(html,/data-manual-gait="JOGGING"/);
 assert.match(html,/data-manual-gait="WALK"/);
 assert.doesNotMatch(html,/活動種目が未選択のため保存できません/);
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

test('S04 basic information displays a compact Required label where Added information shows Optional',()=>{
 const d=draft(),state={recordType:'run',recordDraft:d,recordCourseUi:initialCourseUi(d)};
 const html=manualPage(state);
 assert.match(html,/<h2 class="rv-section-title">基本情報 <small class="rv-required-heading">必須<\/small><\/h2>/);
 assert.match(html,/<h2 class="rv-section-title">追加情報 <small>任意<\/small><\/h2>/);
 assert.doesNotMatch(html,/走行の保存には/);
 assert.doesNotMatch(html,/※ 必須|rv-required-overview/);
 assert.equal((html.match(/rv-required-heading/g)||[]).length,1);
 assert.equal((html.match(/rv-required-mark/g)||[]).length,0,'individual required badges removed at user request');
 assert.doesNotMatch(html,/rv-gait-hint|活動種目が未選択のため保存できません|単一活動として数値化しません/,'long activity explanation removed');
 assert.match(html,/aria-required="true"/,'actual required input validation retained');
 assert.match(html,/未入力・要確認：距離・時間・活動種目/,'contextual validation is preserved');
 const complete={...d,distance:'5',minutes:'30',activityGait:'RUNNING'};
 const ready=manualPage({...state,recordDraft:complete});
 assert.match(ready,/必須3項目が入力済みです/);
 assert.doesNotMatch(ready,/走行の保存には|rv-required-overview/);
 const rest=manualPage({...state,recordType:'rest'});
 assert.match(rest,/<h2 class="rv-section-title">基本情報 <small class="rv-required-heading">必須<\/small>/);
 assert.doesNotMatch(rest,/rv-required-progress|必須3項目が入力済みです/,'rest has a date, not three run-only requirements');
});

test('S04 shows required status only at Basic heading in all activity states',()=>{
 const d=draft(),state={recordType:'run',recordDraft:d,recordCourseUi:initialCourseUi(d)};
 for(const activityGait of ['UNKNOWN','RUNNING','JOGGING','WALK']){
  const html=manualPage({...state,recordDraft:{...d,activityGait}});
  assert.equal((html.match(/rv-required-heading/g)||[]).length,1);
  assert.equal((html.match(/rv-required-mark/g)||[]).length,0);
  assert.doesNotMatch(html,/rv-gait-hint/);
  assert.equal((html.match(/data-manual-gait=/g)||[]).length,3);
 }
});

test('S07: options at step 03 are independent actions, not sequential 1 then 2',()=>{
 const d=draft(),ui=initialCourseUi(d);
 const h=coursePage({recordDraft:d,recordCourseUi:ui},ui,{ok:true,records:[]});
 assert.doesNotMatch(h,/使わない場合は次へ進めます|この名前は保存コースの識別用です/);
 assert.doesNotMatch(h,/rv-commit-label"><b>[12]<\/b>/);
 assert.match(h,/使い方を選ぶ/);
 assert.match(h,/今回の記録に使う/);
 assert.match(h,/保存コースとして残す/);
 assert.equal((h.match(/data-rv-apply/g)||[]).length,1);
 assert.equal((h.match(/data-course-save /g)||[]).length,1);
 assert.doesNotMatch(h,/rv-inline-preset-tools/,'unsaved course has no update/copy actions');
});
test('S07: selected course has immediately accessible edit and copy actions in step 01',()=>{
 const d={...draft(),courseName:'川沿い走行'},selectedId='course-v1-11111111-1111-4111-8111-111111111111';
 const ui={...initialCourseUi(d),selectedPresetId:selectedId};
 const saved={ok:true,records:[{id:selectedId,data:{...d,courseName:'川沿い走行'}}]};
 const h=coursePage({recordDraft:d,recordCourseUi:ui},ui,saved);
 const first=h.indexOf('rv-course-setup'),quick=h.indexOf('rv-inline-preset-tools');
 const second=h.indexOf('rv-course-conditions');
 assert.ok(first<quick&&quick<second,'edit/copy controls are in step 01, not below step 03');
 assert.match(h,/選択中の保存コース/);
 assert.match(h,/保存コースを更新/);
 assert.match(h,/別名で保存/);
 assert.equal((h.match(/data-rv-apply/g)||[]).length,1);
 assert.ok(h.includes('data-course-save-new'));
 assert.equal(d.courseName,'川沿い走行','rendering did not mutate draft');
});

test('S08: selected preset removes the second save operation in 03, keeping apply',()=>{
 const d={...draft(),courseName:'テスト'},id='course-v1-11111111-1111-4111-8111-111111111111';
 const ui={...initialCourseUi(d),selectedPresetId:id};
 const h=coursePage({recordDraft:d,recordCourseUi:ui},ui,{ok:true,records:[{id,data:d}]});
 assert.equal((h.match(/data-course-save(?:[ >])/g)||[]).length,1);
 assert.equal((h.match(/data-course-save-new/g)||[]).length,1);
 assert.doesNotMatch(h,/rv-commit-group--save/);
 assert.match(h,/rv-summary-actions--single/);
 assert.equal((h.match(/data-rv-apply/g)||[]).length,1);
});
test('S08: unsaved case still has a single save action at 03',()=>{
 const d=draft(),ui=initialCourseUi(d);
 const h=coursePage({recordDraft:d,recordCourseUi:ui},ui,{ok:true,records:[]});
 assert.equal((h.match(/data-course-save /g)||[]).length,1);
 assert.match(h,/rv-commit-group--save/);
 assert.doesNotMatch(h,/rv-inline-preset-tools/);
});
test('S08: delete confirmation retains both cancel and confirm as separate controls',()=>{
 const d={...draft(),courseName:'テスト'},id='course-v1-11111111-1111-4111-8111-111111111111';
 const ui={...initialCourseUi(d),selectedPresetId:id,pendingDelete:id};
 const h=coursePage({recordDraft:d,recordCourseUi:ui},ui,{ok:true,records:[{id,data:d}]});
 assert.equal((h.match(/data-course-confirm-delete/g)||[]).length,1);
 assert.equal((h.match(/data-course-cancel-delete/g)||[]).length,1);
});
test('S08: mixed surface shares use slope-like focus and no implicit remainder category',()=>{
 const d={...draft(),surfaceMode:'MIXED',surfacepaved:'60',surfacetrack:'40'};
 const ui=initialCourseUi(d);
 assert.deepEqual(ui.surfaceSelected,['paved','track']);
 assert.equal(ui.surfaceFocus,'paved');
 assert.equal(surfaceShareState(d,ui).max,60);
 assert.equal(surfaceShareState(d,ui).valid,true);
 ui.surfaceFocus='track';assert.equal(surfaceShareState(d,ui).max,40);
 d.surfacetrack='';assert.equal(surfaceShareState(d,ui).valid,false);
 assert.equal(surfaceShareState(d,ui).total,60);
 assert.match(courseReadiness(d,ui).join(' '),/合計100%/);
 const h=coursePage({recordDraft:d,recordCourseUi:ui},ui);
 assert.match(h,/data-rv-surface-step="-1"/);
 assert.match(h,/data-rv-surface-step="1"/);
 assert.match(h,/data-rv-surface-mix|class="rv-surface-mix"/);
});
