import test from 'node:test';
import assert from 'node:assert/strict';
import {routeGeometry} from '../ui/gpsDynamicResult.js';

test('V2 dynamic route, position marker and flags use nearest date-line world copy (033)',()=>{
 for(const direction of [1,-1]){
  const longitudes=direction===1?[179.9,-179.9,-179.8]:[-179.9,179.9,179.8];
  const route=longitudes.map((lon,i)=>({lat:i*.04,lon,km:i*.01,t:1000+i*1000,breakBefore:i===0}));
  const geometry=routeGeometry(route);
  assert.equal(geometry.paths.length,1);
  const coords=route.map(p=>geometry.coords(p));
  const x=coords.map(p=>p[0]),y=coords.map(p=>p[1]);
  assert.ok(direction===1?x[0]<x[1]&&x[1]<x[2]:x[0]>x[1]&&x[1]>x[2],
    'route must follow the short longitudinal arc: '+JSON.stringify(x));
  assert.ok(y.every(v=>v>=19&&v<=296));
  const flag={lat:route[1].lat,lon:route[1].lon};
  assert.ok(Math.abs(geometry.coords(flag)[0]-coords[1][0])<1e-7,'flag shares the selected route point');
  assert.match(geometry.paths[0],/^M/);
  assert.equal((geometry.paths[0].match(/L/g)||[]).length,2);
 }
});
test('GPS route separation is preserved after longitude unwrapping (033)',()=>{
 const route=[
  {lat:0,lon:179.9},
  {lat:.04,lon:-179.9},
  {lat:.06,lon:-179.85,breakBefore:true},
  {lat:.08,lon:-179.8}
 ];
 const geom=routeGeometry(route);
 assert.equal(geom.paths.length,2,'a gap is never bridged');
 for(const path of geom.paths)assert.equal((path.match(/L/g)||[]).length,1);
 const mainland=routeGeometry([{lat:37.5,lon:139.9},{lat:37.51,lon:139.91}]);
 assert.equal(mainland.paths.length,1);
 assert.ok(mainland.coords({lat:37.5,lon:139.9})[0]<mainland.coords({lat:37.51,lon:139.91})[0]);
});
