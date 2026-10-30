import test from 'node:test';
import assert from 'node:assert/strict';
import {RUNNING_REGION_BY_ID} from '../core/runningEvidence/runningEvidenceRegistry.js';

// Stage 4 source-reconciliation evidence ONLY; not an approved model change.
// Transcription target: Gazendam & Hof (2007), Gait & Posture 25:604-614,
// Methods 2.3, Eq(2)/(4), printed Table 2, page 606. DOI 10.1016/j.gaitpost.2006.06.013.
// Full source-PDF bytes and author methodology have NOT been independently verified here.
// Printed Table 2: reported speed m/s and printed 2-decimal normalized speed.
const table2=Object.freeze([
 [1.25,0.40],[1.50,0.48],[1.75,0.56],[2.00,0.65],[2.25,0.73],
 [2.50,0.81],[3.00,0.97],[3.50,1.13],[4.00,1.29],[4.50,1.45]
]);
const g=9.81;
const normalized=(speed,legLengthM)=>speed/Math.sqrt(g*legLengthM);
const rounded2=x=>Math.round(x*100)/100;

test('source discrepancy: an effective length of 0.98 m reproduces all ten printed Table 2 normalized speeds, conditionally',()=>{
 assert.deepEqual(table2.map(([speed,printed])=>rounded2(normalized(speed,0.98))===printed),Array(10).fill(true));
 // An observational fit is not an inference about the actual source computation or a typo.
 assert.equal(table2.length,10);
});

test('negative control: printed 0.99 m leg length does not reproduce seven of ten rounded table entries',()=>{
 const disagreements=table2.filter(([speed,printed])=>rounded2(normalized(speed,0.99))!==printed);
 assert.deepEqual(disagreements.map(([speed])=>speed),[2.0,2.25,2.5,3.0,3.5,4.0,4.5]);
});

test('Methods separately prints 2.25 m/s at normalized 0.72, matching 0.99 rather than 0.98 after rounding',()=>{
 assert.equal(rounded2(normalized(2.25,0.99)),0.72);
 assert.equal(rounded2(normalized(2.25,0.98)),0.73);
 // The source itself has potentially different displayed paths. Root cause remains UNKNOWN.
});

test('protected Gazendam A2 routes retain approved research registry assumptions and original coefficient provenance',()=>{
 const routes={R02:['GX',6,0,0.093,0],R03:['VL',2,0.46,0.17,0],
  R04:['ST',4,0.23,0.55,0],R07:['GM',1,0.54,0.28,0]};
 for(const [id,[muscle,ff,D0,D1,D2]] of Object.entries(routes)){
  const row=RUNNING_REGION_BY_ID[id];
  assert.equal(row.routePolicy,'A2');
  assert.equal(row.equation.legLengthM,0.99,id+' current protected assumption');
  assert.equal(row.equation.gravityMps2,9.81);
  assert.equal(row.equation.muscleCode,muscle);
  assert.equal(row.equation.ffComponent,ff);
  assert.deepEqual([row.equation.D0,row.equation.D1,row.equation.D2],[D0,D1,D2]);
  assert.match(row.sourceFile,/Gazendam_Hof_2007/);
 }
});
