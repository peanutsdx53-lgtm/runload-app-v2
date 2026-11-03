import test from 'node:test';
import assert from 'node:assert/strict';
import {haversineKm,projectToRoute,renderGpxVisual,readGpxFile,parseGpxText,GPX_MAX_BYTES} from '../ui/gpxImport.js';
import {newSimulationUi,renderSimulation} from '../ui/simulationExperience.js';
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
test('SVG never invents altitude across saved GPX gaps',()=>{
 const html=renderGpxVisual(feature,1,2,'b');
 assert.match(html,/欠損区間は描画しません/);
 assert.match(html,/途切れた区間 1件/);
 assert.match(html,/仮の進行位置A・B/);
});
test('actual simulation UI HTML-escapes GPX filenames and names (024)',()=>{
 const malicious='<img src=x onerror=alert(1)>';
 const ui=newSimulationUi();
 ui.source='gpx';ui.gpxRoutes=[{...feature,name:malicious},{...feature,name:'別コース'}];
 ui.gpxIndex=0;ui.gpxName=malicious+'.gpx';ui.distance='2.8';
 const html=renderSimulation(ui,{presets:{ok:true,records:[]},manualRuns:{ok:true,records:[]},gpsRuns:{ok:true,records:[]}});
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/,'text content uses escaped route name');
 assert.doesNotMatch(html,/<img\s+src=x\s+onerror=/i,'name cannot become an executable element');
 assert.match(html,/<option value="0" selected>&lt;img/,'actual route option escapes the name');
 assert.match(html,/sm-gpx-loaded/);
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
 assert.match(noElev,/標高情報がありません/);
});

test('date-line GPX interpolation and route shape use the short longitude arc (022)',()=>{
 const dateline={name:'Boundary',kind:'trk',segments:[[
  {lat:0,lon:179.9,ele:null,km:0},
  {lat:.04,lon:-179.9,ele:null,km:22},
  {lat:.08,lon:-179.8,ele:null,km:33}
 ]],distanceKm:33,points:3,elevationPoints:0,elevationStatus:'none',gapCount:0};
 const halfway=projectToRoute(dateline,11);
 assert.ok(Math.abs(Math.abs(halfway.lon)-180)<.01,'midpoint remains at the date line: '+halfway.lon);
 const reverse={...dateline,segments:[dateline.segments[0].map(p=>({...p,lon:-p.lon}))]};
 assert.ok(Math.abs(Math.abs(projectToRoute(reverse,11).lon)-180)<.01);
 const html=renderGpxVisual(dateline,11,25,'b');
 const route=html.match(/<path d="(M[^"]+)" fill="none" stroke="#030e1b"/);
 assert.ok(route,'actual GPX route path is present');
 const points=[...route[1].matchAll(/[ML](-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert.equal(points.length,3);
 const verticalExtent=Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
 assert.ok(verticalExtent>50,'date-line route is not flattened by a 360-degree fake span');
 assert.match(html,/仮の進行位置A・B/);
});
test('GPX XML invalid DTD and missing XML names reject before invoking the parser (024)',()=>{
 let parsed=false;
 class NotUsedParser{parseFromString(){parsed=true;throw Error('unexpected parse');}}
 assert.throws(()=>parseGpxText('<!DOCTYPE gpx><gpx/>',NotUsedParser),/外部定義/);
 assert.equal(parsed,false);
 assert.throws(()=>parseGpxText('',NotUsedParser),/空です/);
});
