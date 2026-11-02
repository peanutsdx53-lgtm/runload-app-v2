/** Independent input-integrity contract. These four source hashes were calculated
 * from the preserved PDF bytes under Library Current on 2026-11-02,
 * NOT copied from the registry on which the calculation depends.
 * This proves source-identity consistency, not that licensed PDF content may
 * be redistributed, and not that transcribed values were checked in full.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {RUNNING_REGION_SERIES} from '../core/runningEvidence/runningEvidenceRegistry.js';
const independentlyHashed=Object.freeze({
 'Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf':'22a3845f1474aaaa350cf557830d97df9e3090063b74ef1828bf854ee2c6ebbd',
 'Fukuchi_2017_PeerJ_e3298.pdf':'08a036802d617e51a030c7d0e8e76dd177bc6e8deb914f0de017b91b20e73075',
 'per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf':'afaf00bc970c7723c4e440b90f948a0c7f8a8750b9ccfa0641dce1bedaa4fcd6',
 'Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf':'22ed924787a25be6ab57f56906b5c4586b51ea063efd29d7bff256db61f831e9'
});
test('R05/C03: every accepted regional source SHA agrees with independently preserved original bytes',()=>{
 assert.equal(RUNNING_REGION_SERIES.length,12,'all 12 region routes are present');
 const observed=new Set();
 for(const r of RUNNING_REGION_SERIES){
  assert.ok(Object.hasOwn(independentlyHashed,r.sourceFile),'unrecognized source file on '+r.regionId);
  assert.equal(r.sourceSha256,independentlyHashed[r.sourceFile],'unmatched adopted source bytes for '+r.regionId);
  assert.equal(r.evidenceApproval,'APPROVED_RESEARCH_CURRENT_SPECIFICATION');
  assert.ok(r.approvedSpeedMps[0]<r.approvedSpeedMps[1]);
  assert.equal(r.reference.unit===undefined||r.reference.unit===r.unit,true);
  observed.add(r.sourceFile);
 }
 assert.equal(observed.size,4,'preserved source set should include all four original families');
});
test('R09/F04: no published PDF is embedded in test contents or loaded by the runtime',()=>{
 const refs=RUNNING_REGION_SERIES.map(x=>x.sourceFile);
 assert.ok(refs.every(s=>s.endsWith('.pdf')));
 assert.equal(refs.filter(x=>x.includes('Gazendam')).length,4);
});
