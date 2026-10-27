import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGpsSession} from '../ui/gpsMeasurementCore.js';
import {measurementPage} from '../ui/measurementExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('GPS design guard: consent, screen visibility, stale wake lock and opt-in storage are explicit',()=>{
 const app=read('app.js');
 assert.match(app,/gpsConsentAction='start'/);
 assert.match(app,/gpsConsentAction='resume'/);
 assert.match(app,/\[data-gps-consent-cancel\]/);
 assert.match(app,/document\.addEventListener\('visibilitychange'/);
 assert.match(app,/window\.addEventListener\('pagehide'/);
 assert.match(app,/gpsWakeLockGeneration\+\+/);
 assert.match(app,/gpsWakeLockGeneration!==generation/);
 assert.match(app,/gpsController\.pause\(\)/);
 assert.match(app,/data-gps-save-route/);
 assert.match(app,/saveRoute,/);
});
test('GPS design guard: unsaved run is explicitly described as ephemeral',()=>{
 const gps=createGpsSession({geo:{watchPosition:()=>1,clearWatch:()=>{}},now:()=>1000000});
 assert.match(measurementPage(gps.getSnapshot()),/未保存の計測はアプリ終了・再読み込みで失われます/);
 gps.start();
 assert.match(measurementPage(gps.getSnapshot()),/再読み込みや強制終了では未保存の測定を復元できません/);
});
test('GPS design evidence document separates simulation and real-world certification',()=>{
 const docs=read('docs/GPS_CODE_DESIGN_ASSURANCE_20261027.md');
 for(const stage of ['W-01','W-02','W-03','W-04','W-05','W-06','W-07','W-08'])assert.ok(docs.includes(stage));
 assert.match(docs,/実機保留/);
 assert.match(docs,/画面ロック中の継続GPSを保証しない/);
 assert.match(docs,/12部位/);
});
