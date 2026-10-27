import test from 'node:test';
import assert from 'node:assert/strict';
import {createGpsBackupText,inspectGpsBackup,GPS_BACKUP_FORMAT} from '../ui/gpsIndexedDbStore.js';
import {isValidGpsRecord} from '../ui/gpsMeasurementStore.js';
const point=(lat,km,t)=>({lat,lon:139.9,km,t,ele:100+km*10,altitudeAccuracy:8,altitudeQuality:'usable',breakBefore:km===0,activity:'RUNNING'});
const example=()=>({
 id:'gps-v1-abcdefgh',date:'2026-10-27',createdAt:'2026-10-27T00:00:00.000Z',
 activity:'RUNNING',distanceKm:.025,activeSeconds:15,accepted:2,rejected:0,
 track:[point(37.5,0,1700000000000),point(37.5002,.025,1700000015000)],trackSimplified:false
});
test('explicit GPS backup includes all accepted route points without sending them elsewhere',()=>{
 const original=example();assert.equal(isValidGpsRecord(original),true);
 const out=createGpsBackupText([original]);assert.equal(out.ok,true,out.reason);
 const raw=JSON.parse(out.text);
 assert.equal(raw.format,GPS_BACKUP_FORMAT);
 assert.equal(raw.records.length,1);assert.equal(raw.records[0].track.length,2);
 const parsed=inspectGpsBackup(out.text);
 assert.equal(parsed.ok,true,parsed.reason);assert.deepEqual(parsed.records,[original]);
 assert.equal(parsed.routeCount,1);
});
test('GPS backup parser fails closed for invalid versions, corruption and duplicate IDs',()=>{
 const original=example(),v=createGpsBackupText([original]);
 assert.equal(v.ok,true);
 const corrupt=JSON.parse(v.text);corrupt.records[0].track.at(-1).km=0.001;
 assert.equal(inspectGpsBackup(JSON.stringify(corrupt)).ok,false,'truncated route cannot be restored');
 const duplicate=JSON.parse(v.text);duplicate.records.push(structuredClone(original));
 assert.equal(inspectGpsBackup(JSON.stringify(duplicate)).ok,false);
 const future=JSON.parse(v.text);future.version=2;
 assert.equal(inspectGpsBackup(JSON.stringify(future)).ok,false);
 assert.equal(inspectGpsBackup('{invalid').ok,false);
 assert.equal(inspectGpsBackup('[]').ok,false);
 assert.equal(createGpsBackupText([original,original]).ok,false);
});
test('backup creation refuses malformed records instead of silently omitting them',()=>{
 const broken=example();broken.track[1].ele=NaN;
 assert.equal(createGpsBackupText([broken]).ok,false);
});
