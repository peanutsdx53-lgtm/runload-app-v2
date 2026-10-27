import test from 'node:test';
import assert from 'node:assert/strict';
import {gaitKeys,gaitValidation,gaitPage} from '../ui/gaitExperience.js';
test('gait maps to six explicit record-draft fields including selected activity',()=>{
 assert.deepEqual(gaitKeys,['steps','stepsProvenance','activityGait','runningFormat','runWalkRunningDistanceKm','runWalkRunningDurationMinutes']);
 const html=gaitPage({steps:'0',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN',distance:'',minutes:''});
 assert.match(html,/data-draft="steps"/);
 assert.match(html,/value="0"/);
 assert.match(html,/data-g4-runwalk hidden/);
 assert.match(html,/距離未入力/);
 assert.doesNotMatch(html,/>0\.00 km</);
});
test('empty zero and unknown are not conflated',()=>{
 assert.equal(gaitValidation({steps:'',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN'}).steps,null);
 assert.equal(gaitValidation({steps:'0',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN'}).steps,0);
 assert.ok(gaitValidation({steps:'12',stepsProvenance:'UNKNOWN'}).warnings.length>0);
 assert.equal(gaitValidation({steps:'1.2'}).valid,false);
});
test('mixed run enforces positive values and total bounds',()=>{
 const base={distance:'5.2',minutes:'32.5',runningFormat:'RUN_WALK',runWalkRunningDistanceKm:'4',runWalkRunningDurationMinutes:'25'};
 assert.equal(gaitValidation(base).valid,true);
 assert.equal(gaitValidation({...base,runWalkRunningDistanceKm:'6'}).valid,false);
 assert.equal(gaitValidation({...base,runWalkRunningDurationMinutes:'33'}).valid,false);
 assert.equal(gaitValidation({...base,runWalkRunningDistanceKm:''}).valid,false);
 assert.equal(gaitValidation({...base,runningFormat:'CONTINUOUS_RUN',runWalkRunningDistanceKm:''}).valid,true);
 assert.equal(gaitValidation({...base,distance:'',minutes:''}).valid,true);
});
test('escapes entered value and does not add data storage API',()=>{
 const html=gaitPage({steps:'" autofocus onfocus=alert(1)',runningFormat:'RUN_WALK'});
 assert.match(html,/&quot; autofocus/);
 assert.doesNotMatch(html,/value="" autofocus/);
 assert.doesNotMatch(html,/localStorage|saveRecord\(/);
});