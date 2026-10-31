/**
 * P0 U-001: independent Current "17_03_区間外反例24件_期待結果.csv"
 * executable acceptance for the actual runningEvidenceEngine.
 *
 * 12 fixed regions x two just-outside-domain speeds = 24. The boundary
 * ranges are literal Current/source expectations, deliberately NOT read from
 * the runtime registry or calculated from its approvedSpeedMps.
 *
 * The source's actual_app_state was NOT_REEXECUTED_THIS_SESSION: this test
 * tests that previously missing app execution, not source-paper transcription.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRunningRegion,evaluateRunningRecordReference} from '../core/runningEvidence/runningEvidenceEngine.js';

// Current/Science_Reproduction/17_03 (as recorded 2026-10-31).
const outsideCases=Object.freeze([
 ['R01',2.4999,4.5001],['R02',2.4999,4.5001],
 ['R03',2.4999,4.5001],['R04',2.4999,4.5001],
 ['R05',2.7799,5.0001],['R06',2.7799,5.0001],
 ['R07',2.4999,4.5001],['R08',2.4999,4.5001],
 ['R09',2.7799,5.0001],
 ['R10',1.3887888888888889,3.333433333333333],
 ['R11',1.3887888888888889,3.333433333333333],
 ['R12',1.3887888888888889,3.333433333333333]
]);
const inDomainBoundaries=Object.freeze({
 R01:[2.5,4.5], R02:[2.5,4.5], R03:[2.5,4.5], R04:[2.5,4.5],
 R05:[2.78,5], R06:[2.78,5], R07:[2.5,4.5], R08:[2.5,4.5], R09:[2.78,5],
 R10:[5/3.6,12/3.6],R11:[5/3.6,12/3.6],R12:[5/3.6,12/3.6]
});
const fixedOptions={activity:'RUNNING_PRIMARY',speedContext:'FIXED_LITERATURE_SPEED',protocolMatched:true};
const assertRejected=(result,regionId,speed,source)=>{
 assert.equal(result?.regionId,regionId,source+' region id');
 assert.equal(result?.state,'NOT_CALCULABLE',source+' '+regionId+' '+speed);
 assert.equal(result?.reasonCode,'OUTSIDE_SOURCE_RANGE',source+' reason');
 assert.equal(result?.rawValue,null,source+' raw');
 assert.equal(result?.reference100,null,source+' ratio');
 assert.equal(result?.route,null,source+' source route');
 assert.equal(result?.sourceSha256,null,source+' no source assigned for an unsupported result');
};
test('P0 Current 17_03: all 24 out-of-domain reference queries fail closed without extrapolation',()=>{
 let checks=0;
 for(const [regionId,low,high] of outsideCases){
  for(const speed of [low,high]){
   const result=evaluateRunningRegion(regionId,speed,fixedOptions);
   assertRejected(result,regionId,speed,'direct engine');
   checks++;
  }
 }
 assert.equal(outsideCases.length,12);
 assert.equal(checks,24);
});
test('P0 source domain boundaries still calculate: no broad all-output rejection masquerades as protection',()=>{
 let checks=0;
 for(const [regionId,[low,high]] of Object.entries(inDomainBoundaries)){
  for(const speed of [low,high]){
   const result=evaluateRunningRegion(regionId,speed,fixedOptions);
   assert.equal(result.state,'CALCULATED',regionId+' '+speed);
   assert.ok(Number.isFinite(result.rawValue),regionId+' anchored value');
   assert.ok(Number.isFinite(result.reference100),regionId+' anchored ratio');
   assert.ok(result.route==='A1_PUBLISHED_TABLE'||result.route==='A2_PUBLISHED_EQUATION',regionId+' published route');
   checks++;
  }
 }
 assert.equal(checks,24);
});
test('P0 each outside-domain average recorded speed keeps its region NOT_CALCULABLE',()=>{
 let checks=0;
 for(const [regionId,low,high] of outsideCases)for(const speed of [low,high]){
  // Exactly 30 min, convert the literature speed to a plausible saved distance;
  // this verifies the real record-to-reference adapter, not just isolated kernel.
  const run={distanceKm:speed*1.8,durationMinutes:30,activity:'RUNNING_PRIMARY',runningFormat:'UNKNOWN'};
  const calculated=evaluateRunningRecordReference(run);
  assert.equal(calculated.state,'REFERENCE_ONLY');
  assertRejected(calculated.regions[regionId],regionId,speed,'record adapter');
  checks++;
 }
 assert.equal(checks,24);
});
