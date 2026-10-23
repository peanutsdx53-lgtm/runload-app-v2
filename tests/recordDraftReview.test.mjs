import test from "node:test";
import assert from "node:assert/strict";
import {checkRecordDraft,legacyRecordDraftFields} from "../ui/recordDraftReview.js";
test("retains legacy-record fields as independent optional inputs",()=>{
 for(const key of ["steps","stepsProvenance","runningFormat","runWalkRunningDistanceKm","runWalkRunningDurationMinutes","courseName","gradeMode","surfaceMode","primarySurface","upPercent","downPercent","upGradePercent","downGradePercent","temperatureC","environmentNote","bodyObservation","shoeName"])
  assert.ok(legacyRecordDraftFields.includes(key),key);
 assert.equal(new Set(legacyRecordDraftFields).size,legacyRecordDraftFields.length);
});
test("missing fields do not become zero or an invented observation",()=>{
 const v=checkRecordDraft({});
 assert.deepEqual(v.errors,[]);
 assert.deepEqual(v.warnings,[]);
 assert.equal(v.ready,true);
});
test("steps provenance is independent and cannot be inferred",()=>{
 const v=checkRecordDraft({steps:"6375",stepsProvenance:"UNKNOWN"});
 assert.match(v.warnings.join(" "),/取得方法/);
 assert.equal(v.errors.length,0);
 assert.equal(checkRecordDraft({steps:"6375",stepsProvenance:"DEVICE_MEASURED"}).warnings.length,0);
 assert.match(checkRecordDraft({steps:"6375.5",stepsProvenance:"ESTIMATED"}).errors.join(" "),/整数/);
});
test("mixed run/walk requires actual running-only duration and distance",()=>{
 const x=checkRecordDraft({runningFormat:"RUN_WALK",distance:"7",minutes:"55"});
 assert.ok(x.errors.some(e=>e.includes("走った距離")));
 assert.ok(x.errors.some(e=>e.includes("走った時間")));
 assert.equal(checkRecordDraft({runningFormat:"RUN_WALK",runWalkRunningDistanceKm:"4.2",runWalkRunningDurationMinutes:"29"}).errors.length,0);
});
test("slope, sections, surface percentages obey their own contracts",()=>{
 assert.ok(checkRecordDraft({gradeMode:"SUMMARY",upPercent:"65",downPercent:"40"}).errors.some(e=>e.includes("100%以下")));
 assert.deepEqual(checkRecordDraft({gradeMode:"SUMMARY",upPercent:"15",downPercent:"15"}).errors,[]);
 assert.ok(checkRecordDraft({gradeMode:"SECTIONS",sectionShare0:"40",sectionShare1:"50"}).errors.some(e=>e.includes("100%")));
 assert.equal(checkRecordDraft({gradeMode:"SECTIONS",sectionShare0:"40",sectionShare1:"60"}).errors.length,0);
 assert.ok(checkRecordDraft({surfaceMode:"MIXED",surfacepaved:"50",surfacetrail:"25"}).errors.some(e=>e.includes("路面")));
 assert.equal(checkRecordDraft({surfaceMode:"MIXED",surfacepaved:"50",surfacetrail:"50"}).errors.length,0);
});
test("rest does not apply scientific run-only validation",()=>{
 assert.equal(checkRecordDraft({gradeMode:"SUMMARY",upPercent:"999",distance:"10001"},false).errors.length,0);
});
