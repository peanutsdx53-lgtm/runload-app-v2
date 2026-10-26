import test from 'node:test';
import assert from 'node:assert/strict';
import {haversineKm,projectToRoute,renderGpxVisual,readGpxFile,GPX_MAX_BYTES} from '../ui/gpxImport.js';
const feature={name:'test',kind:'trk',segments:[[{lat:35,lon:138,ele:90,km:0},{lat:35.01,lon:138.01,ele:110,km:1.4}], [{lat:35.02,lon:138.02,ele:null,km:1.4},{lat:35.03,lon:138.03,ele:102,km:2.8}]],distanceKm:2.8,points:4,elevationPoints:3,elevationStatus:'partial',gapCount:1};
test('GPX haversine km is finite, symmetric and zero on same point',()=>{
 const a={lat:35,lon:138},b={lat:35.01,lon:138.01};
 assert.ok(haversineKm(a,b)>1&&haversineKm(a,b)<2);
 assert.equal(haversineKm(a,b),haversineKm(b,a));
 assert.equal(haversineKm(a,a),0);
});
test('route position uses geometric distance but clamps at the endpoint',()=>{
 const a=projectToRoute(feature,0.7),end=projectToRoute(feature,99);
 assert.ok(a.lat>35&&a.lat<35.01);
 assert.equal(a.ele,100);
 assert.equal(end.lat,35.03);assert.equal(end.beyond,true);
 assert.equal(projectToRoute(null,2),null);
});
test('SVG never invents altitude across gaps and escaping rejects route names as HTML',()=>{
 const html=renderGpxVisual({...feature,name:'<img src=x onerror=alert(1)>'},1,2,'b');
 assert.match(html,/欠損区間は描画しません/);
 assert.match(html,/途切れた区間 1件/);
 assert.match(html,/仮の進行位置A・B/);
 assert.doesNotMatch(html,/onerror=/);
});
test('client file reader rejects oversize or wrong suffix before accessing data',async()=>{
 await assert.rejects(readGpxFile({name:'x.gpx',size:GPX_MAX_BYTES+1}),/5MB/);
 await assert.rejects(readGpxFile({name:'x.txt',size:100,text:async()=>'<gpx/>'}),/\.gpx/);
});

test('v34 2.5D view uses only known elevation runs and marks both scenarios',()=>{
 const html=renderGpxVisual(feature,.5,2,'a');
 assert.match(html,/sm-route-grid-v34/);
 assert.match(html,/sm-route-progress-v34/);
 assert.match(html,/sm-terrain-fill-v34/);
 assert.match(html,/高 110m/);
 assert.match(html,/低 90m/);
 assert.match(html,/欠損区間は描画しません/);
 const noElev=renderGpxVisual({...feature,elevationPoints:0,elevationStatus:'none'},.5,2,'a');
 assert.doesNotMatch(noElev,/sm-gpx-elevation/);
 assert.match(noElev,/標高データがない/);
});
