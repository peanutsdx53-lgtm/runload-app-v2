/**
 * P0 U-001 direct replay of the 65 fixed source-reference points in Current:
 * Science_Reproduction/01_科学65点_独立原著値と現行登録比較.csv
 * This is a frozen *source-snapshot parity* test, not an independent
 * re-transcription from four copyrighted PDFs in this GitHub runner.
 * Source coefficients: Gazendam & Hof (2007) Table 3 / Eq(2,4),
 * gravity 9.81, reported leg length 0.99 m.
 * Other anchors: Fukuchi 2017 Table 4; Van Hooren 2024 Table 2;
 * Li 2020 Table 1. Values are source-column-specific, not a unified
 * estimated personal tissue load, injury risk or medical index.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRunningRegion} from '../core/runningEvidence/runningEvidenceEngine.js';
import {RUNNING_REGION_BY_ID} from '../core/runningEvidence/runningEvidenceRegistry.js';
const table=Object.freeze({
 R01:{u:'J/kg',s:[2.5,3.5,4.5],v:[0.8,1.49,2.43],ref:0.8},
 R05:{u:'MPa·s/km',s:[2.78,3,3.33,4,5],v:[787,742,697,628,552],ref:787},
 R06:{u:'MPa·s/km',s:[2.78,3,3.33,4,5],v:[12424,11624,10551,9362,7802],ref:12424},
 R08:{u:'J/kg',s:[2.5,3.5,4.5],v:[0.64,0.78,0.95],ref:0.64},
 R09:{u:'%·s/km',s:[2.78,3,3.33,4,5],v:[439,413,374,325,266],ref:439},
 R10:{u:'N',s:[5,6,7,8,9,10,11,12].map(x=>x/3.6),v:[269.53,314.41,296.76,322.95,341.35,352.39,383.08,391.47],ref:322.95},
 R11:{u:'N',s:[5,6,7,8,9,10,11,12].map(x=>x/3.6),v:[131.13,137.39,144.22,151.69,157.79,159.84,164.88,167.72],ref:151.69},
 R12:{u:'N',s:[5,6,7,8,9,10,11,12].map(x=>x/3.6),v:[220.36,229.83,253.16,267.06,274.90,285.48,292.88,301.95],ref:267.06}
});
const formula=Object.freeze({
 R02:{coef:[0,0.093,0],ref:0.0895266022499757},
 R03:{coef:[0.46,0.17,0],ref:0.6236507783064072},
 R04:{coef:[0.23,0.55,0],ref:0.7594584004030821},
 R07:{coef:[0.54,0.28,0],ref:0.8095424583870237}
});
const relative=(actual,expected,label)=>assert.ok(
 Number.isFinite(actual)&&Math.abs(actual-expected)<=1e-7*Math.max(1,Math.abs(expected)),
 label+' actual '+actual+' expected '+expected);
const evaluate=(id,speed)=>evaluateRunningRegion(id,speed,{
 activity:'RUNNING_PRIMARY',speedContext:'FIXED_LITERATURE_SPEED',protocolMatched:true
});
test('P0 Current 65: source-snapshot table anchors and Gazendam formula outputs match the engine at all 65 fixed speeds',()=>{
 let n=0;
 for(const [id,p] of Object.entries(table)){
  const series=RUNNING_REGION_BY_ID[id];
  assert.equal(series.unit,p.u,id+' physical unit remains source-specific');
  for(let i=0;i<p.s.length;i++){
   const x=evaluate(id,p.s[i]),label=id+' source anchor '+i;
   assert.equal(x.state,'CALCULATED',label);
   assert.equal(x.route,'A1_PUBLISHED_TABLE',label);
   relative(x.rawValue,p.v[i],label+' raw');
   relative(x.reference100,100*p.v[i]/p.ref,label+' within-series reference100');
   assert.equal(x.estimated,true,label+' still estimated reference');
   n++;
  }
 }
 const speeds=[2.5,3,3.5,4,4.5],g=9.81,l=0.99;
 for(const [id,p] of Object.entries(formula)){
  const [d0,d1,d2]=p.coef;
  for(const speed of speeds){
   const q=speed/Math.sqrt(g*l),raw=d0+d1*q+d2*q*q;
   const x=evaluate(id,speed),label=id+' published equation at '+speed;
   assert.equal(x.state,'CALCULATED',label);
   assert.equal(x.route,'A2_PUBLISHED_EQUATION',label);
   relative(x.rawValue,raw,label+' equation raw');
   relative(x.reference100,100*raw/p.ref,label+' normalized reference100');
   assert.equal(x.estimated,true,label+' still estimated reference');
   n++;
  }
 }
 assert.equal(Object.keys(table).length,8);
 assert.equal(Object.keys(formula).length,4);
 assert.equal(n,65,'exactly 45 independent table points plus 20 equation points');
});
test('P0 scientific representation counterexamples: no cross-construct pseudo comparison or unsupported personal measurement',()=>{
 const a=evaluate('R05',3),b=evaluate('R06',3),c=evaluate('R10',2.5);
 assert.notEqual(a.metricId,b.metricId);
 assert.notEqual(a.referenceSignature,b.referenceSignature);
 assert.notEqual(a.unit,c.unit);
 for(const r of [a,b,c]){
  assert.equal(r.estimated,true);
  assert.match(r.note,/not a personal physiological measurement or injury risk/);
 }
});
