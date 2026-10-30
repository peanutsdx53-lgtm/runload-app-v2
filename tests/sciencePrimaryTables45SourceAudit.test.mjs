import test from 'node:test';
import assert from 'node:assert/strict';
import {RUNNING_REGION_BY_ID} from '../core/runningEvidence/runningEvidenceRegistry.js';

// Independent *published-table transcription*, frozen without reading generated
// runtime outputs. Uncertainty in Gazendam R02/R03/R04/R07 is excluded.
// Source A (Fukuchi 2017 PeerJ Table 4, 2.5,3.5,4.5m/s):
// https://pmc.ncbi.nlm.nih.gov/articles/PMC5426356/
// Source B (Van Hooren 2024 Table 2, 2.78,3,3.33,4,5m/s):
// https://onlinelibrary.wiley.com/doi/pdfdirect/10.1111/sms.14570
// Source C (Li 2020 Table 1, 5..12 km/h; rearfoot-striking males):
// https://revistapielarieincaltaminte.ro/revistapielarieincaltaminteresurse/en/fisiere/full/vol20-nr2/article7_vol20_issue2.pdf
const published = Object.freeze({
 R01:{source:'Fukuchi',unit:'J/kg',metric:'FUKUCHI_HIP_POSITIVE_WORK_JKG',speeds:[2.5,3.5,4.5],raw:[0.80,1.49,2.43]},
 R08:{source:'Fukuchi',unit:'J/kg',metric:'FUKUCHI_ANKLE_POSITIVE_WORK_JKG',speeds:[2.5,3.5,4.5],raw:[0.64,0.78,0.95]},
 R05:{source:'Van Hooren',unit:'MPa·s/km',metric:'VAN_PFJ_ORDINARY_CUM_STRESS',speeds:[2.78,3,3.33,4,5],raw:[787,742,697,628,552]},
 R06:{source:'Van Hooren',unit:'MPa·s/km',metric:'VAN_TIBIA_ORDINARY_CUM_STRESS',speeds:[2.78,3,3.33,4,5],raw:[12424,11624,10551,9362,7802]},
 R09:{source:'Van Hooren',unit:'%·s/km',metric:'VAN_ACHILLES_ORDINARY_CUM_STRAIN',speeds:[2.78,3,3.33,4,5],raw:[439,413,374,325,266]},
 R10:{source:'Li',unit:'N',metric:'LI_HEEL_MAX_FORCE',kmh:[5,6,7,8,9,10,11,12],raw:[269.53,314.41,296.76,322.95,341.35,352.39,383.08,391.47]},
 R11:{source:'Li',unit:'N',metric:'LI_MEDIAL_MIDFOOT_MAX_FORCE',kmh:[5,6,7,8,9,10,11,12],raw:[131.13,137.39,144.22,151.69,157.79,159.84,164.88,167.72]},
 R12:{source:'Li',unit:'N',metric:'LI_CENTRAL_METATARSAL_MAX_FORCE',kmh:[5,6,7,8,9,10,11,12],raw:[220.36,229.83,253.16,267.06,274.90,285.48,292.88,301.95]}
});
const normalizedSpeeds=p=>p.kmh?p.kmh.map(k=>k/3.6):p.speeds;

test('stage4: independent primary tables match all 45 anchors in eight non-Gazendam source-specific regions',()=>{
 let checked=0;
 for(const [regionId,p] of Object.entries(published)){
  const reg=RUNNING_REGION_BY_ID[regionId];
  assert.ok(reg,regionId);
  assert.equal(reg.routePolicy,'A1_B',regionId);
  assert.equal(reg.metricId,p.metric,regionId+' must not substitute a related but distinct construct');
  assert.equal(reg.unit,p.unit,regionId+' published physical unit');
  assert.equal(reg.anchors.length,p.raw.length,regionId);
  normalizedSpeeds(p).forEach((speed,i)=>{
   assert.ok(Math.abs(reg.anchors[i].speedMps-speed)<1e-11,regionId+' speed #'+i);
   assert.equal(reg.anchors[i].raw,p.raw[i],regionId+' source table raw #'+i);
   checked++;
  });
  assert.ok(reg.sourceSha256?.length===64,regionId+' source hash label exists but has not been independently PDF-byte verified');
 }
 assert.equal(Object.keys(published).length,8);
 assert.equal(checked,45);
});

test('stage4 counterexamples: prevent metric and unit substitution across published source columns',()=>{
 assert.equal(published.R05.raw[0],787,'ordinary cumulative stress impulse, not weighted impulse 11.5');
 assert.notEqual(published.R05.raw[0],11.5);
 assert.equal(published.R06.raw[0],12424,'tibia ordinary cumulative stress, not weighted 120');
 assert.notEqual(published.R06.raw[0],120);
 assert.equal(published.R09.raw[0],439,'Achilles ordinary strain, not weighted 6.91');
 assert.notEqual(published.R09.raw[0],6.91);
 assert.equal(published.R10.raw[1],314.41);
 assert.ok(published.R10.raw[1]>published.R10.raw[2], 'do not invent a monotonic heel-force sequence');
 assert.equal(published.R11.unit,'N');
 assert.equal(published.R12.unit,'N');
 assert.notEqual(published.R11.metric,published.R12.metric);
});

test('stage4 boundaries: keep Gazendam four unresolved source routes out of this original-table acceptance',()=>{
 const tested=new Set(Object.keys(published));
 assert.equal(tested.size,8);
 for(const id of ['R02','R03','R04','R07']){
  assert.equal(tested.has(id),false,'separate Gazendam formula/table discrepancy is still BLOCKED');
  assert.equal(RUNNING_REGION_BY_ID[id].routePolicy,'A2');
 }
});
