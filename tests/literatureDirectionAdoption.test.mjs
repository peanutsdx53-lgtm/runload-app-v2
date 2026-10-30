import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRunningRegion} from '../core/runningEvidence/runningEvidenceEngine.js';
import {RUNNING_REGION_BY_ID} from '../core/runningEvidence/runningEvidenceRegistry.js';

/* Independent literature expectations, fixed before invoking the engine.
   Published table anchors: Fukuchi (2017) Table 4; Van Hooren (2024)
   Table 2 (ordinary cumulative columns); Li (2020) Table 1. Published
   coefficients: Gazendam & Hof (2007) Table 3 and Eq(4). This checks
   source-direction fidelity, not out-of-sample prediction or tissue loading.
   The Gazendam adoption decision chooses the printed Methods/Table 2 note
   leg length 0.99 m, not the rounded normalized-speed entries. */
const tableSeries={
 R01:{s:[2.5,3.5,4.5],v:[.80,1.49,2.43]},
 R05:{s:[2.78,3,3.33,4,5],v:[787,742,697,628,552]},
 R06:{s:[2.78,3,3.33,4,5],v:[12424,11624,10551,9362,7802]},
 R08:{s:[2.5,3.5,4.5],v:[.64,.78,.95]},
 R09:{s:[2.78,3,3.33,4,5],v:[439,413,374,325,266]},
 R10:{s:[5,6,7,8,9,10,11,12].map(x=>x/3.6),v:[269.53,314.41,296.76,322.95,341.35,352.39,383.08,391.47]},
 R11:{s:[5,6,7,8,9,10,11,12].map(x=>x/3.6),v:[131.13,137.39,144.22,151.69,157.79,159.84,164.88,167.72]},
 R12:{s:[5,6,7,8,9,10,11,12].map(x=>x/3.6),v:[220.36,229.83,253.16,267.06,274.90,285.48,292.88,301.95]}
};
const formulaSeries={
 R02:[0,.093,0],R03:[.46,.17,0],R04:[.23,.55,0],R07:[.54,.28,0]
};
const calc=(id,s)=>evaluateRunningRegion(id,s,{activity:'RUNNING_PRIMARY',speedContext:'FIXED_LITERATURE_SPEED',protocolMatched:true});
const sign=x=>x>1e-9?1:x< -1e-9?-1:0;
const almost=(a,b,id)=>assert.ok(Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(b)),id+': '+a+' vs '+b);

test('all 37 adjacent published-table comparisons preserve independently transcribed directions, including heel reversal',()=>{
 let comparisons=0,down=0;
 for(const [id,{s,v}] of Object.entries(tableSeries)){
  const reg=RUNNING_REGION_BY_ID[id];
  assert.equal(reg.routePolicy,'A1_B');
  for(let k=0;k<s.length-1;k++){
   const a=calc(id,s[k]),b=calc(id,s[k+1]);
   assert.equal(a.state,'CALCULATED');assert.equal(b.state,'CALCULATED');
   assert.equal(a.route,'A1_PUBLISHED_TABLE');assert.equal(b.route,'A1_PUBLISHED_TABLE');
   const d=sign(v[k+1]-v[k]);
   assert.equal(sign(b.reference100-a.reference100),d,id+' original direction '+k);
   almost(a.rawValue,v[k],id+' source point '+k);
   almost(b.rawValue,v[k+1],id+' source point '+(k+1));
   if(d<0)down++;comparisons++;
   const middle=(s[k]+s[k+1])/2,c=calc(id,middle);
   assert.equal(c.route,'B_INTRA_SOURCE_INTERPOLATION');
   almost(c.rawValue,(v[k]+v[k+1])/2,id+' arithmetic mid '+k);
   assert.equal(sign(c.reference100-a.reference100),d,id+' intermediate first half '+k);
   assert.equal(sign(b.reference100-c.reference100),d,id+' intermediate second half '+k);
  }
 }
 assert.equal(Object.keys(tableSeries).length,8);
 assert.equal(comparisons,37);assert.equal(down,13,
  'heel has a local decrease; the three Van Hooren series each decrease four times');
});

test('all 16 adjacent Gazendam Eq(4) comparisons preserve published coefficient direction under adopted 0.99m',()=>{
 const speeds=[2.5,3,3.5,4,4.5],l=.99,g=9.81;let n=0;
 for(const [id,[D0,D1,D2]] of Object.entries(formulaSeries)){
  const reg=RUNNING_REGION_BY_ID[id];
  assert.equal(reg.routePolicy,'A2');assert.equal(reg.equation.legLengthM,l);
  for(let k=0;k<speeds.length-1;k++){
   const expected=s=>{const q=s/Math.sqrt(g*l);return D0+D1*q+D2*q*q};
   const a=calc(id,speeds[k]),b=calc(id,speeds[k+1]);
   assert.equal(a.route,'A2_PUBLISHED_EQUATION');assert.equal(b.route,'A2_PUBLISHED_EQUATION');
   almost(a.rawValue,expected(speeds[k]),id+' formula low');
   almost(b.rawValue,expected(speeds[k+1]),id+' formula high');
   assert.equal(sign(b.reference100-a.reference100),sign(expected(speeds[k+1])-expected(speeds[k])));
   n++;
  }
 }
 assert.equal(Object.keys(formulaSeries).length,4);assert.equal(n,16);
});

test('reference100 is a within-series ratio, and unsupported range never becomes extrapolated prediction',()=>{
 let n=0;
 for(const id of [...Object.keys(tableSeries),...Object.keys(formulaSeries)]){
  const reg=RUNNING_REGION_BY_ID[id],ref=calc(id,reg.reference.speedMps);
  assert.equal(ref.state,'CALCULATED');
  almost(ref.reference100,100,id+' baseline');
  for(const s of [reg.approvedSpeedMps[0]-.02,reg.approvedSpeedMps[1]+.02]){
   const v=calc(id,s);assert.equal(v.state,'NOT_CALCULABLE');assert.equal(v.reasonCode,'OUTSIDE_SOURCE_RANGE');
  }
  n++;
 }
 assert.equal(n,12);
});
