import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateRunningRegion} from '../core/runningEvidence/runningEvidenceEngine.js';

// Original-article values/transcriptions were locked in Candidate20 BEFORE inspecting
// the application registry or outputs. This test must never tune its expected values
// against actual engine output.
// Preregistration SHA-256: b43e8c37bbcc11334b34e6251a4a1c8b66f9df516176a7d3d229b525ed718665
const toleranceReference100=0.02; // code arithmetic comparison, NOT scientific accuracy
const published={
 R01:{speeds:[2.5,3.5,4.5],raw:[0.8,1.49,2.43],reference:0.8},
 R05:{speeds:[2.78,3,3.33,4,5],raw:[787,742,697,628,552],reference:787},
 R06:{speeds:[2.78,3,3.33,4,5],raw:[12424,11624,10551,9362,7802],reference:12424},
 R08:{speeds:[2.5,3.5,4.5],raw:[0.64,0.78,0.95],reference:0.64},
 R09:{speeds:[2.78,3,3.33,4,5],raw:[439,413,374,325,266],reference:439},
 R10:{kmh:[5,6,7,8,9,10,11,12],raw:[269.53,314.41,296.76,322.95,341.35,352.39,383.08,391.47],reference:322.95},
 R11:{kmh:[5,6,7,8,9,10,11,12],raw:[131.13,137.39,144.22,151.69,157.79,159.84,164.88,167.72],reference:151.69},
 R12:{kmh:[5,6,7,8,9,10,11,12],raw:[220.36,229.83,253.16,267.06,274.90,285.48,292.88,301.95],reference:267.06}
};
const gazendam={
 R02:{D0:0,D1:0.093,D2:0},
 R03:{D0:0.46,D1:0.17,D2:0},
 R04:{D0:0.23,D1:0.55,D2:0},
 R07:{D0:0.54,D1:0.28,D2:0}
};
function speedSeries(rid){
 const g=published[rid];
 if(g)return {speeds:g.kmh?g.kmh.map(v=>v/3.6):g.speeds,raw:g.raw,reference:g.reference};
 const {D0,D1,D2}=gazendam[rid];
 const f=v=>{const q=v/Math.sqrt(9.81*0.99);return D0+D1*q+D2*q*q;};
 const speeds=[2.5,3,3.5,4,4.5];
 return {speeds,raw:speeds.map(f),reference:f(3)};
}
const ids=['R01','R02','R03','R04','R05','R06','R07','R08','R09','R10','R11','R12'];
test('preregistered source-specific 65 points match actual engine numeric results',()=>{
 let n=0;
 for(const regionId of ids){
  const source=speedSeries(regionId);
  for(let i=0;i<source.speeds.length;i++){
   const speed=source.speeds[i],expected=100*source.raw[i]/source.reference;
   const out=evaluateRunningRegion(regionId,speed,{activity:'RUNNING_PRIMARY',protocolMatched:true});
   assert.equal(out.state,'CALCULATED',regionId+' @'+speed);
   assert.equal(out.regionId,regionId);
   assert.ok(Number.isFinite(out.reference100),regionId+' reference100 must be finite');
   assert.ok(Math.abs(out.reference100-expected)<=toleranceReference100,
    regionId+' speed='+speed+' source='+expected+' actual='+out.reference100);
   assert.match(out.note,/not a personal physiological measurement/);
   n++;
  }
 }
 assert.equal(n,65);
});
test('all original-source domain boundaries reject extrapolation without narrowing run recording',()=>{
 for(const regionId of ids){
  const src=speedSeries(regionId);
  const min=Math.min(...src.speeds),max=Math.max(...src.speeds);
  for(const speed of [min-0.001,max+0.001]){
   const r=evaluateRunningRegion(regionId,speed,{activity:'RUNNING_PRIMARY',protocolMatched:true});
   assert.equal(r.state,'NOT_CALCULABLE',regionId+' '+speed);
   assert.equal(r.reasonCode,'OUTSIDE_SOURCE_RANGE');
   assert.equal(r.reference100,null);
  }
 }
});
test('Li 2020 heel shows source-published nonmonotonicity at 6 to 7 km/h',()=>{
 const six=evaluateRunningRegion('R10',6/3.6,{activity:'RUNNING_PRIMARY',protocolMatched:true});
 const seven=evaluateRunningRegion('R10',7/3.6,{activity:'RUNNING_PRIMARY',protocolMatched:true});
 assert.ok(six.reference100>seven.reference100);
 assert.ok(Math.abs(six.reference100-100*314.41/322.95)<toleranceReference100);
 assert.ok(Math.abs(seven.reference100-100*296.76/322.95)<toleranceReference100);
});
test('unmatched protocol and mixed gait keep scientific reference non-diagnostic',()=>{
 for(const regionId of ids){
  const v=speedSeries(regionId).speeds[0];
  const contextual=evaluateRunningRegion(regionId,v,{activity:'RUNNING_PRIMARY',protocolMatched:false,speedContext:'RECORD_AVERAGE_UNVERIFIED'});
  assert.equal(contextual.state,'CONTEXT_LIMITED');
  const mixed=evaluateRunningRegion(regionId,v,{activity:'RUNNING_PRIMARY',walkingMixed:true});
  assert.equal(mixed.state,'NOT_CALCULABLE');
  assert.equal(mixed.reasonCode,'MIXED_GAIT');
  const unverified=evaluateRunningRegion(regionId,v,{activity:'RUNNING_PRIMARY',requireMatchedProtocol:true,protocolMatched:false});
  assert.equal(unverified.reasonCode,'CONDITION_NOT_VERIFIED');
 }
});
