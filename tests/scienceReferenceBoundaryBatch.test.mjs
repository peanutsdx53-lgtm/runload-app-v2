import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRunningRegion,strictCommonSpeedRange} from '../core/runningEvidence/runningEvidenceEngine.js';
import {RUNNING_REGION_SERIES} from '../core/runningEvidence/runningEvidenceRegistry.js';
// Regression expectations from the separately stored 2026-10-29 Stage 4 Eq(4)
// sensitivity ledger (20 cases). NOT independent resolution of the printed
// table-vs-equation discrepancy. Differences below 1e-5 are rounding effects.
const expected={
 R02:[83.33333333333334,100,116.66666666666667,133.33333333333334,150],
 R03:[95.6265380135012,100,104.37346198649878,108.74692397299756,113.12038595949635],
 R04:[88.38078995676234,100,111.61921004323767,123.23842008647532,134.85763012971302],
 R07:[94.45072428270008,100,105.54927571729993,111.09855143459986,116.64782715189978]
};
test('12 canonical region routes, 20 unchanged Eq(4) sensitivity anchors',()=>{
 assert.equal(RUNNING_REGION_SERIES.length,12);
 assert.equal(new Set(RUNNING_REGION_SERIES.map(r=>r.regionId)).size,12);
 let checked=0;
 for(const [regionId,values] of Object.entries(expected)){
  [2.5,3,3.5,4,4.5].forEach((speed,i)=>{
   const output=evaluateRunningRegion(regionId,speed,{activity:'RUNNING_PRIMARY'});
   assert.equal(output.route,'A2_PUBLISHED_EQUATION');
   assert.ok(Math.abs(output.reference100-values[i])<1e-5,
    regionId+' '+speed+': '+output.reference100+' != '+values[i]);
   assert.equal(output.state,'CONTEXT_LIMITED');
   checked++;
  });
 }
 assert.equal(checked,20);
});
test('published speed bounds and mixed/unsupported routes fail closed',()=>{
 assert.equal(evaluateRunningRegion('R02',4.501).reference100,null);
 assert.equal(evaluateRunningRegion('R02',3,{walkingMixed:true}).reference100,null);
 assert.equal(evaluateRunningRegion('R02',3,{extensionId:'not-approved'}).reference100,null);
 assert.equal(evaluateRunningRegion('R13',3).reference100,null);
 const common=strictCommonSpeedRange();
 assert.ok(common.minMps>=2.5&&common.maxMps<=4.5);
 assert.ok(common.minMps<=common.maxMps);
});
test('reference values never become a personal measurement or cross-region risk score',()=>{
 const r=evaluateRunningRegion('R02',3,{activity:'RUNNING_PRIMARY'});
 assert.equal(r.estimated,true);
 assert.match(r.note,/not a personal physiological measurement or injury risk/);
 assert.ok(r.referenceSignature);
});
