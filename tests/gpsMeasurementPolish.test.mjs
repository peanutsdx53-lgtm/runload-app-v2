import test from 'node:test';
import assert from 'node:assert/strict';
import {createGpsSession} from '../ui/gpsMeasurementCore.js';
import {measurementPage} from '../ui/measurementExperience.js';
import {estimateGpsEnergy,gpsEnergyDisplay} from '../ui/gpsEnergyDisplay.js';
import {estimateRunningEnergy,RUN_ENERGY_MODEL_ID} from '../ui/gpsMeasurementEnergy.js';
import {prepareGpsV2Run} from '../ui/gpsReplayIndexedDbStore.js';

function gpsHarness(){
 let now=1700000000000,callback,watch=0;
 const gps=createGpsSession({now:()=>now,geo:{watchPosition:ok=>{callback=ok;return ++watch},clearWatch:()=>{}}});
 const fix=(lat)=>callback({timestamp:now,coords:{latitude:lat,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}});
 return {gps,fix,tick:ms=>now+=ms};
}
test('legacy MET energy model is unchanged and cannot invent missing mass',()=>{
 const legacy=estimateRunningEnergy({bodyMassKg:70,distanceKm:3,durationMs:20*60000});
 const actual=estimateGpsEnergy({activity:'RUNNING',bodyMassKg:70,distanceM:3000,elapsedMs:20*60000});
 assert.deepEqual(actual,legacy);
 assert.equal(legacy.modelId,RUN_ENERGY_MODEL_ID);
 assert.equal(legacy.estimatedKcal,220.5);
 assert.equal(estimateGpsEnergy({activity:'WALK',bodyMassKg:70,distanceM:3000,elapsedMs:20*60000}).ok,false);
 assert.equal(estimateGpsEnergy({activity:'MIXED',bodyMassKg:70,distanceM:3000,elapsedMs:20*60000}).ok,false);
 assert.equal(estimateGpsEnergy({activity:'RUNNING',bodyMassKg:null,distanceM:3000,elapsedMs:20*60000}).ok,false);
 assert.equal(gpsEnergyDisplay({activity:'RUNNING',bodyMassKg:null,distanceM:3000,elapsedMs:20*60000}).text,'—');
});
test('no motion: finish explains unavailable recording and permits exiting safely',()=>{
 const h=gpsHarness();h.gps.start();h.fix(37.5);h.tick(3000);h.gps.finish();
 assert.equal(h.gps.state.phase,'finished');
 assert.match(h.gps.state.notice,/10m未満/);
 const html=measurementPage(h.gps.getSnapshot());
 assert.match(html,/この測定は保存できません/);
 assert.doesNotMatch(html,/data-gps-action="save"/);
 assert.match(html,/data-gps-action="discard"/);
 assert.equal(h.gps.discard(),true);
});
test('map flags are truthful accepted GPS points and finished notes are accessible',()=>{
 const h=gpsHarness(),g=h.gps;
 assert.equal(g.setBodyMassKg(70),true);assert.equal(g.start(),true);
 assert.equal(g.setBodyMassKg(80),false,'measurement mass frozen after starting');
 assert.equal(g.addFlag(),false,'no location before first accepted GPS fix');
 assert.match(g.state.notice,/GPS測位/);
 h.fix(37.5);h.tick(5000);h.fix(37.5002);
 assert.equal(g.addFlag(),true);assert.equal(g.addFlag(),true);
 assert.equal(g.state.flags.length,2);assert.equal(g.state.flags[0].km,g.state.distanceM/1000);
 assert.match(measurementPage(g.getSnapshot(),g.elapsed()),/フラッグ \(2\)/);
 assert.doesNotMatch(measurementPage(g.getSnapshot(),g.elapsed()),/軌跡プレビュー/);
 h.tick(2000);g.finish();
 const markup=measurementPage(g.getSnapshot(),g.elapsed());
 assert.match(markup,/フラッグのメモ/);
 assert.match(markup,/data-gps-flag-note/);
 assert.match(markup,/textarea/);
 assert.equal(g.setFlagNote(g.state.flags[0].id,'上り坂'),true);
 assert.equal(g.state.flags[0].note,'上り坂');
 const output=prepareGpsV2Run(g.getSnapshot(),{saveDetails:true,date:'2026-10-27'});
 assert.equal(output.ok,true,output.reason);
 assert.equal(output.detail.flags[0].note,'上り坂');
});
test('GPS summary preserves the MET model provenance without storing extra GPS route if opt out',()=>{
 const h=gpsHarness(),g=h.gps;g.setBodyMassKg(70);g.start();
 h.fix(37.5);h.tick(5000);h.fix(37.5002);h.tick(2000);g.finish();
 const x=prepareGpsV2Run(g.getSnapshot(),{saveDetails:false,date:'2026-10-27'});
 assert.equal(x.ok,true,x.reason);assert.equal(x.detail,null);
 assert.ok('energyEstimate' in x.summary);
 assert.ok(x.summary.energyEstimate===null||x.summary.energyEstimate.modelId===RUN_ENERGY_MODEL_ID);
});
