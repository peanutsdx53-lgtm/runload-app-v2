import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {calculateActivityReference} from '../core/activity/activityReference.js';
import {calculateEvidenceRunningForProduct,V4_MODEL_VERSION} from '../core/runningEvidence/runningEvidenceProductBridge.js';
import {evaluateMobileWalkJogAllRegions,MOBILE_WALK_JOG_MODEL_VERSION} from '../core/internal/mobileWalkJogSpeedModel.js';
import {saveManualRun,readManualRuns,findManualRun} from '../ui/manualRunStore.js';
import {gaitPage,gaitValidation} from '../ui/gaitExperience.js';
const sourceShas={
 'core/runningEvidence/runningEvidenceRegistry.js':'796b97b711b58df0e7958c95e53d906f833814cc',
 'core/runningEvidence/runningEvidenceEngine.js':'23f9237da5f041939288f490fc3e04e2e89357cd',
 'core/runningEvidence/runningEvidenceProductBridge.js':'18c0ee4204c74da3c0ccc108f04c16a57c32eff1',
 'core/internal/mobileWalkJogSpeedModel.js':'107d60abfd8535531d3d896f7539666c3840ea34'
};
test('all 4 authoritative scientific files are git-blob byte-identical to pinned runload-app main',()=>{
 for(const [path,expected] of Object.entries(sourceShas)){
  const bytes=readFileSync(new URL('../'+path,import.meta.url));
  const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(actual,expected,path);
 }
});
const rawRecord=(activityGait,speedMps,runningFormat='CONTINUOUS_RUN')=>{
 const durationSeconds=1800,distanceKm=speedMps*durationSeconds/1000;
 return {source:'manual',type:'run',schema:1,id:'run-v1-00000000-0000-4000-8000-000000000001',
  distanceKm,durationSeconds,draft:{activityGait,runningFormat}};
};
test('RUNNING: every region number, route and eligibility equals the v4 original product engine',()=>{
 const speed=2.5,record=rawRecord('RUNNING',speed);
 const calculated=calculateActivityReference(record);
 const original=calculateEvidenceRunningForProduct({distanceKm:record.distanceKm,durationMinutes:30,runningFormat:'RUN'});
 assert.equal(calculated.modelVersion,V4_MODEL_VERSION);assert.equal(calculated.activity,'RUNNING');assert.equal(calculated.rows.length,12);
 for(const row of calculated.rows){
  const expected=original.regions[row.regionId].scientificReference;
  assert.equal(row.value,expected.reference100,row.regionId);
  assert.equal(row.reasonCode,expected.reasonCode,row.regionId);
  assert.equal(row.route,expected.route,row.regionId);
  assert.equal(row.sourceSha256,expected.sourceSha256,row.regionId);
 }
 assert.ok(calculated.count>0);
});
test('JOGGING/WALK: full 12 region index/state and provenance match the v1.3 original without provisional extrapolation',()=>{
 for(const [kind,gait,speed] of [['JOGGING','JOGGING',2.25],['WALK','WALK',1.5]]){
  const result=calculateActivityReference(rawRecord(kind,speed));
  const original=evaluateMobileWalkJogAllRegions({gaitId:gait,speedMps:speed,allowProvisional:false});
  assert.equal(result.modelVersion,MOBILE_WALK_JOG_MODEL_VERSION);
  assert.equal(result.activity,kind);assert.equal(result.rows.length,12);
  assert.ok(result.count>0,kind);
  result.rows.forEach((row,i)=>{
   assert.equal(row.regionId,original[i].regionId);
   assert.equal(row.value,original[i].index,row.regionId);
   assert.equal(row.route,original[i].evidenceTier,row.regionId);
   assert.equal(row.calculationState,original[i].index===null?'NOT_CALCULABLE':'CALCULATED');
  });
 }
});
test('unselected gait, running-walking mixes and unsupported speeds never fabricate 12 values',()=>{
 assert.equal(calculateActivityReference(rawRecord(undefined,2.5)).reason,'GAIT_NOT_SELECTED');
 const mixed=calculateActivityReference(rawRecord('RUNNING',2.5,'RUN_WALK'));
 assert.equal(mixed.state,'NOT_CALCULABLE');assert.equal(mixed.reason,'MIXED_GAIT_NOT_QUANTIFIED');assert.equal(mixed.count,0);
 const walkOut=calculateActivityReference(rawRecord('WALK',5));
 assert.equal(walkOut.count,0);assert.equal(walkOut.state,'NO_AUTHORIZED_SPEED_REFERENCE');
 assert.equal(calculateActivityReference({source:'gps',type:'run',schema:1}).reason,'NOT_SAVED_MANUAL_RUN');
});
test('manual input -> validated saved record -> reload -> original model -> 12 reference output for every explicit gait',()=>{
 const makeStorage=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
 for(const [gait,dist,minutes] of [['RUNNING','4.5','30'],['JOGGING','4.05','30'],['WALK','2.7','30']]){
  const storage=makeStorage();
  const draft={date:'2026-10-27',distance:dist,minutes,hours:'',seconds:'',rofBefore:3,rofAfter:4,steps:'',
   stepsProvenance:'UNKNOWN',activityGait:gait,runningFormat:'CONTINUOUS_RUN',memo:'science verification',courseName:'',shoeName:''};
  assert.equal(gaitValidation(draft).valid,true);
  const saved=saveManualRun(storage,draft);
  assert.equal(saved.ok,true,saved.reason);
  const read=readManualRuns(storage);
  assert.equal(read.ok,true);assert.equal(read.records.length,1);
  const result=calculateActivityReference(findManualRun(storage,saved.record.id).record);
  assert.equal(result.state,'REFERENCE_ONLY',gait);
  assert.equal(result.activity,gait);assert.equal(result.rows.length,12);
  assert.ok(result.count>0);
  assert.equal(result.calculationInput.recordId,saved.record.id);
  assert.equal(result.calculationInput.durationSeconds,1800);
 }
});
test('gait chooser exposes separate explicit choices and mixed context without inventing a result',()=>{
 const html=gaitPage({activityGait:'JOGGING',runningFormat:'UNKNOWN',distance:'4',minutes:'30'});
 for(const gait of ['RUNNING','JOGGING','WALK'])assert.match(html,new RegExp('data-g4-gait="'+gait+'"'));
 assert.match(html,/未選択の場合は部位別値を算出しません/);
 assert.equal(gaitValidation({activityGait:'FAKE'}).valid,false);
});
