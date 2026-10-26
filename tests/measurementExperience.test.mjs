import test from 'node:test';
import assert from 'node:assert/strict';
import {createMeasurementViewState,stepMeasurementPreview,measurementPage} from '../ui/measurementExperience.js';
test('real GPS is not started by mock transitions',()=>{
 const ui=createMeasurementViewState();
 assert.match(measurementPage(ui),/disabled aria-disabled="true"/);
 assert.match(measurementPage(ui),/GPSの測定は準備中/);
 assert.equal(stepMeasurementPreview(ui,'show-running'),false);
 assert.equal(ui.phase,'ready');
});
test('preview lifecycle never saves metrics or unlocks real start',()=>{
 const ui=createMeasurementViewState();
 assert.equal(stepMeasurementPreview(ui,'preview'),true);
 assert.equal(stepMeasurementPreview(ui,'show-running'),true);
 assert.match(measurementPage(ui),/サンプル値/);
 assert.equal(stepMeasurementPreview(ui,'end'),true);
 assert.match(measurementPage(ui),/role="dialog"/);
 assert.equal(stepMeasurementPreview(ui,'cancel-end'),true);
 assert.equal(ui.phase,'running');
 assert.equal(stepMeasurementPreview(ui,'show-paused'),true);
 assert.equal(ui.phase,'paused');
 assert.equal(stepMeasurementPreview(ui,'end'),true);
 assert.equal(stepMeasurementPreview(ui,'confirm-end'),true);
 assert.equal(ui.preview,false);
 assert.equal(ui.phase,'ready');
 assert.match(measurementPage(ui),/GPSの測定は準備中/);
});
test('cannot end from readiness or issue unexpected commands',()=>{
 const ui=createMeasurementViewState();
 stepMeasurementPreview(ui,'preview');
 assert.equal(stepMeasurementPreview(ui,'end'),false);
 assert.equal(stepMeasurementPreview(ui,'resume-gps'),false);
 assert.equal(ui.phase,'ready');
});