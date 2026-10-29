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
test("mixed final review requires walking remainder in both distance and total duration",()=>{
 const b={runningFormat:"RUN_WALK",distance:"5",minutes:"30",runWalkRunningDistanceKm:"3",runWalkRunningDurationMinutes:"20"};
 assert.deepEqual(checkRecordDraft(b).errors,[]);
 for(const x of [{runWalkRunningDistanceKm:"5"},{runWalkRunningDistanceKm:"6"},{runWalkRunningDurationMinutes:"30"},{runWalkRunningDurationMinutes:"31"}])assert.ok(checkRecordDraft({...b,...x}).errors.length>0,JSON.stringify(x));
 assert.match(checkRecordDraft({...b,hours:"1",minutes:"5",runWalkRunningDurationMinutes:"65"}).errors.join(" "),/走った時間/);
 assert.deepEqual(checkRecordDraft({...b,hours:"1",minutes:"5",runWalkRunningDurationMinutes:"55"}).errors,[]);
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

test("stage 7 enumerates the complete 54-field manual snapshot without inventing required optional values",()=>{
 assert.equal(legacyRecordDraftFields.length,54);
 const sectionFields=legacyRecordDraftFields.filter(k=>/^section(Share|Direction|Grade|Surface)[0-4]$/.test(k));
 assert.equal(sectionFields.length,20);
 const surfaceFields=legacyRecordDraftFields.filter(k=>/^surface(paved|track|treadmill|soil|trail|naturalGrass|artificialTurf|sand)$/.test(k));
 assert.equal(surfaceFields.length,8);
 assert.ok(legacyRecordDraftFields.includes("rofBefore")&&legacyRecordDraftFields.includes("rofAfter"));
 assert.deepEqual(checkRecordDraft({}),{errors:[],warnings:[],ready:true});
});
test("stage 7 rejects invalid new manual classification codes without imposing them on rest",()=>{
 for(const change of [
  {stepsProvenance:"GUESSING"},{runningFormat:"SPRINT"},{gradeMode:"SYNTHETIC"},
  {surfaceMode:"OTHER"},{primarySurface:"ice"},{sectionDirection0:"STEEP"},
  {sectionSurface2:"interplanetary"}
 ])assert.ok(checkRecordDraft(change).errors.length>0,JSON.stringify(change));
 assert.deepEqual(checkRecordDraft({stepsProvenance:"DEVICE_MEASURED",runningFormat:"CONTINUOUS_RUN",gradeMode:"UNKNOWN",surfaceMode:"UNKNOWN",primarySurface:"",sectionDirection0:"FLAT",sectionSurface0:"UNKNOWN"}).errors,[]);
 assert.equal(checkRecordDraft({sectionDirection0:"STEEP"},false).errors.length,0);
});
test("stage 7 forbids any mixed run-walk regional reference and aligns both input guides",async()=>{
 const {readFileSync}=await import("node:fs");
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 const gait=readFileSync(new URL("../ui/gaitExperience.js",import.meta.url),"utf8");
 assert.match(app,/走歩混在の記録では、単一活動の12部位文献参考値は算出しません/);
 assert.match(gait,/走歩混在では12部位文献参考値を算出せず/);
 assert.doesNotMatch(app,/走った区間だけを対象にします/);
 const {calculateActivityReference}=await import("../core/activity/activityReference.js");
 const result=calculateActivityReference({
  source:"manual",type:"run",schema:1,id:"run-v1-00000000-0000-4000-8000-000000000001",
  distanceKm:5,durationSeconds:1800,draft:{activityGait:"RUNNING",runningFormat:"RUN_WALK"}
 });
 assert.equal(result.state,"NOT_CALCULABLE");
 assert.equal(result.reason,"MIXED_GAIT_NOT_QUANTIFIED");
 assert.equal(result.count,0);
});
