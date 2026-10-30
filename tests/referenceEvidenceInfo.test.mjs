import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RUNNING_REGION_SERIES} from '../core/runningEvidence/runningEvidenceRegistry.js';
import {engineReferenceBodyId} from '../ui/bodyReferencePresentation.js';
import {describeRegionEvidence} from '../ui/referenceEvidenceInfo.js';
import {makeUi,render} from '../ui/explorationExperience.js';

test('all 12 running regions expose their own metric, original source, source scope and reference',()=>{
 assert.equal(RUNNING_REGION_SERIES.length,12);
 for(const series of RUNNING_REGION_SERIES){
  const bodyId=engineReferenceBodyId(series.regionId);
  const row={regionId:series.regionId,calculationState:'CALCULATED',evidence:{metricId:series.metricId,sourceSha256:series.sourceSha256}};
  const info=describeRegionEvidence({row,bodyId,activity:'RUNNING'});
  assert.equal(info.kind,'running',series.regionId);
  assert.equal(info.metric,series.metricDescription,series.regionId);
  assert.ok(info.citation.length>3,series.regionId);
  assert.ok(info.sourceLocation.includes('Table'),series.regionId);
  assert.ok(info.domain.includes('km/h'),series.regionId);
  assert.ok(info.reference.includes('基準速度'),series.regionId);
  assert.match(info.note,/本人の身体負荷/);
  assert.match(info.note,/異なる部位/);
 }
});
test('source mismatch does not silently claim the currently frozen paper',()=>{
 const series=RUNNING_REGION_SERIES[0],bodyId=engineReferenceBodyId(series.regionId);
 const row={regionId:series.regionId,calculationState:'CALCULATED',evidence:{metricId:series.metricId,sourceSha256:'different'}};
 assert.equal(describeRegionEvidence({row,bodyId,activity:'RUNNING'}).kind,'unavailable');
});
test('not-calculable running regions disclose literature scope without inventing values',()=>{
 const series=RUNNING_REGION_SERIES[8],bodyId=engineReferenceBodyId(series.regionId);
 const info=describeRegionEvidence({row:{regionId:series.regionId,calculationState:'NOT_CALCULABLE',evidence:{reasonCode:'OUTSIDE_SOURCE_RANGE'}},bodyId,activity:'RUNNING'});
 assert.equal(info.kind,'running');
 assert.match(info.status,/未算出/);
 assert.equal(info.domain,'10.008～18 km/h');
});
test('walking/jogging never inherit the running source and GPS never guesses it',()=>{
 const bodyId=engineReferenceBodyId('R01');
 const base={regionId:'R01',calculationState:'CALCULATED',evidence:{constructId:'WALK_HIP_WORK_JIN',sourceId:'JIN_2018_UO',sourceDomain:{minMps:.8,maxMps:2},referenceSpeedMps:1.5}};
 const walk=describeRegionEvidence({row:base,bodyId,activity:'WALK'});
 assert.equal(walk.kind,'walk-jog');
 assert.match(walk.citation,/JIN_2018_UO/);
 assert.doesNotMatch(walk.citation,/Fukuchi/);
 const gps=describeRegionEvidence({row:base,bodyId,activity:'RUNNING',source:'gps'});
 assert.equal(gps.kind,'unavailable');
 assert.equal(describeRegionEvidence({row:base,bodyId,activity:'UNKNOWN'}).kind,'unavailable');
});
test('body evidence panel is additive; it does not alter calculators or storage',()=>{
 const body=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.match(body,/data-region-evidence/);
 assert.match(body,/この部位の研究根拠と条件/);
 assert.match(body,/evidencePanel\(\)/);
 assert.doesNotMatch(body,/localStorage\.setItem\(/);
});
test('both fatigue lessons cite the open Japanese ROF-J validation with its scope',()=>{
 const storage={getItem:()=>null,setItem:()=>{}};
 const categories=[{id:'01',name:'走りの記録',topics:['自分が感じた疲れ']},{id:'04',name:'疲労と回復',topics:['疲れの感じ方']}];
 for(const [category,topic] of [['01','自分が感じた疲れ'],['04','疲れの感じ方']]){
  const ui=makeUi(storage);ui.selected=category;ui.topic=topic;ui.modal='learn-help';
  const html=render(ui,{categories,draft:{},conditions:{entries:[],canSave:true},manualRuns:{ok:true,records:[]}});
  assert.match(html,/10\.1186\/s40798-026-01108-8/);
  assert.match(html,/ROF-J/);
  assert.match(html,/大学生/);
  assert.match(html,/研究の対象・使える範囲/);
 }
});

// Source-scope audit: Li 2020 is not a generalizable all-beginners foot load measurement.
test('Li heel, medial midfoot and central metatarsal disclose published DOI and sampled population; other regions do not inherit it',()=>{
 for(const id of ['R10','R11','R12']){
  const series=RUNNING_REGION_SERIES.find(x=>x.regionId===id);
  const bodyId=engineReferenceBodyId(id);
  const row={regionId:id,calculationState:'CALCULATED',evidence:{metricId:series.metricId,sourceSha256:series.sourceSha256}};
  const info=describeRegionEvidence({row,bodyId,activity:'RUNNING'});
  assert.equal(info.kind,'running');
  assert.equal(info.url,'https://doi.org/10.24264/lfj.20.2.7');
  assert.match(info.note,/踵接地.*男性39人/);
  assert.match(info.note,/ほかの足接地様式・性別・個人/);
  assert.match(info.note,/身体負荷・傷害危険度の実測値ではなく/);
  const partial=describeRegionEvidence({row:{regionId:id,calculationState:'NOT_CALCULABLE',evidence:{reasonCode:'OUTSIDE_SOURCE_RANGE'}},bodyId,activity:'RUNNING'});
  assert.match(partial.note,/踵接地.*男性39人/,'ineligible speeds must not hide source limits');
 }
 const hip=RUNNING_REGION_SERIES.find(x=>x.regionId==='R01');
 const info=describeRegionEvidence({row:{regionId:'R01',calculationState:'CALCULATED',evidence:{metricId:hip.metricId,sourceSha256:hip.sourceSha256}},bodyId:engineReferenceBodyId('R01'),activity:'RUNNING'});
 assert.doesNotMatch(info.note,/男性39人/);
 const misleading=describeRegionEvidence({row:{regionId:'R10',calculationState:'CALCULATED',evidence:{metricId:'LI_CENTRAL_METATARSAL_MAX_FORCE',sourceSha256:RUNNING_REGION_SERIES.find(x=>x.regionId==='R10').sourceSha256}},bodyId:engineReferenceBodyId('R10'),activity:'RUNNING'});
 assert.equal(misleading.kind,'unavailable','source metric mismatch must fail closed');
});
