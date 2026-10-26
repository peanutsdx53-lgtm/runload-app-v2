import test from 'node:test';
import assert from 'node:assert/strict';
import {newSimulationUi,computeSteady,computeRunWalk,reachTime,computeComparison,renderSimulation,renderSimulationResults,courseDescription} from '../ui/simulationExperience.js';
test('a steady scenario is distance from an explicitly assumed pace',()=>{
 assert.equal(computeSteady(30,7).distanceKm,30/7);
 assert.equal(computeSteady(30,0),null);
 assert.equal(computeSteady(0,7),null);
 assert.equal(reachTime(5,'steady',7,12,5,2),35);
});
test('run-walk intervals prorate incomplete cycles exactly, without silent averaging',()=>{
 const a=computeRunWalk(30,7,12,5,2);
 assert.ok(Math.abs(a.distanceKm-(22/7+8/12))<1e-9);
 assert.equal(a.runMinutes,22);assert.equal(a.walkMinutes,8);
 assert.ok(Math.abs(reachTime(5,'mixed',7,12,5,2)-39.1666666667)<.000001);
});
test('source without course never claims a remaining distance',()=>{
 const ui={...newSimulationUi(),source:'none',distance:'5'};
 const r=computeComparison(ui);
 assert.equal(r.ok,true);assert.equal(r.goal,null);
 assert.match(renderSimulationResults(ui),/距離目標なし/);
 assert.doesNotMatch(renderSimulationResults(ui),/残り \d/);
});
test('explicit manual target computes remaining distance and no unmeasured bodily burden',()=>{
 const ui={...newSimulationUi(),distance:'5'};
 const r=computeComparison(ui);assert.equal(r.ok,true);
 assert.ok(r.a.distanceKm<r.goal);
 assert.ok(r.b.distanceKm<r.goal);
 const html=renderSimulationResults(ui);assert.match(html,/残り/);assert.match(html,/身体負荷を予測しません/);
});
test('missing, negative or out-of-range assumptions fail closed',()=>{
 for(const [key,val] of [['budget',''],['runPace','0'],['walkPace','999'],['runMin',''],['walkMin','-1'],['distance',''],['distance','0'],['budget','Infinity']]){
  const ui={...newSimulationUi(),[key]:val};
  assert.equal(computeComparison(ui).ok,false,`${key}=${val}`);
 }
});
test('saved presets are described but neither their distances nor routes are inferred',()=>{
 const preset={id:'id',data:{courseName:'川沿い',gradeMode:'FLAT',surfaceMode:'SINGLE',primarySurface:'paved'}};
 const html=renderSimulation(newSimulationUi(),{presets:{ok:true,records:[preset]},manualRuns:{ok:true,records:[]}});
 assert.match(html,/川沿い/);
 assert.match(html,/距離を入力/);
 assert.match(html,/地図上の到達地点/);
 assert.doesNotMatch(html,/実際のGPS/);
 const desc=courseDescription(preset);assert.match(desc.slope,/平坦/);
});
test('untrusted course names are escaped and storage errors are surfaced without fake records',()=>{
 const preset={id:'1',data:{courseName:'<script>bad</script>',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN'}};
 const html=renderSimulation(newSimulationUi(),{presets:{ok:true,records:[preset]},manualRuns:{ok:false,reason:'読み取れません',records:[]}});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/読み取れません/);
});
