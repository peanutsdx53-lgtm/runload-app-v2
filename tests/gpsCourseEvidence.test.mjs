import test from 'node:test';
import assert from 'node:assert/strict';
import {gpsCourseEvidence} from '../ui/gpsCourseEvidence.js';
import {newSimulationUi,renderSimulationResults} from '../ui/simulationExperience.js';
const pts={kind:'gps',distanceKm:.2,segments:[
 [{lat:37.5,lon:139.9,ele:100,km:0},{lat:37.5008,lon:139.9,ele:110,km:.1}],
 [{lat:37.501,lon:139.9,ele:null,km:.1},{lat:37.502,lon:139.9,ele:130,km:.2}]
],simplified:true,elevationPoints:3,elevationStatus:'partial',gapCount:1};
test('GPS A/B projection reports sampling and withheld elevation on missing altitude or exceeded course',()=>{
 const s=gpsCourseEvidence(pts,.05,.15);
 assert.equal(s.sampledPoints,4);assert.equal(s.altitudeCoveragePct,75);
 assert.equal(s.gapCount,1);assert.equal(s.simplified,true);
 assert.equal(s.a.elevationM,105);assert.equal(s.a.elevationMethod,'interpolated');
 assert.equal(s.b.elevationM,null);assert.equal(s.b.elevationMethod,'unavailable');
 const exceed=gpsCourseEvidence(pts,.25,.1);
 assert.equal(exceed.a.beyond,true);assert.equal(exceed.a.elevationM,null);
 assert.equal(exceed.b.elevationMethod,'sample');
});
test('GPS elevation evidence is not shown for manually assumed or invalid routes',()=>{
 assert.equal(gpsCourseEvidence({...pts,kind:'gpx'},.05,.15),null);
 assert.equal(gpsCourseEvidence({kind:'gps',segments:[],distanceKm:1},.05,.15),null);
 const ui=newSimulationUi();ui.source='gps';ui.gpsFeature=pts;ui.distance='.2';
 ui.budget='1';ui.runPace='20';ui.walkPace='40';ui.runMin='1';ui.walkMin='1';
 const html=renderSimulationResults(ui);
 assert.match(html,/data-sm-gps-evidence/);assert.match(html,/GPS保存コースの確認情報/);
 assert.match(html,/A｜一定ペース/);assert.match(html,/B｜走る＋歩く/);
 assert.match(html,/保存位置点間の補間/);
 assert.match(html,/12部位の負荷の計算には使いません/);
 const manual={...ui,source:'manual'};
 assert.doesNotMatch(renderSimulationResults(manual),/data-sm-gps-evidence/);
});
