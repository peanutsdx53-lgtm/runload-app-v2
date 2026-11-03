import test from 'node:test';
import assert from 'node:assert/strict';
import {worldPoint,visibleTiles,segmentPaths} from '../ui/gpsLiveMap.js';
test('GPS map uses projected finite points and rejects invalid coordinates',()=>{
 const point=worldPoint(37.501,139.93,16);assert.ok(Number.isFinite(point.x)&&Number.isFinite(point.y));
 assert.equal(worldPoint(NaN,139.93),null);
 assert.equal(worldPoint(37.5,139.93,-1),null);
 const tiles=visibleTiles(point,390,245,16);
 assert.ok(tiles.length>=2&&tiles.length<=48);
 assert.ok(tiles.every(t=>/^https:\/\/tile\.openstreetmap\.org\/16\/\d+\/\d+\.png$/.test(t.url)));
});

import {readFileSync} from 'node:fs';
const mapSource=readFileSync(new URL('../ui/gpsLiveMap.js',import.meta.url),'utf8');
test('OSM web policy keeps Referer and does not disable caching',()=>{
 assert.match(mapSource,/referrerPolicy='strict-origin-when-cross-origin'/);
 assert.doesNotMatch(mapSource,/referrerPolicy='no-referrer'/);
 assert.match(mapSource,/data-gps-map-network-status/);
});

test('GPS map uses centre-relative longitude copies across date line and after GPS gaps (016)',()=>{
 for(const side of [-179.999,179.999]){
  const center=worldPoint(0,side,16),other=-side;
  const track=[
   {lat:0,lon:other,breakBefore:true},
   {lat:0,lon:side},
   {lat:0,lon:other,breakBefore:true},
   {lat:0,lon:side}
  ];
  const paths=segmentPaths(track,center,360,260,16);
  const commands=[...paths.matchAll(/d="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(commands.length,2,'separate track segments remain unconnected');
  for(const path of commands){
   assert.equal((path.match(/L/g)||[]).length,1);
   const values=[...path.matchAll(/[-+]?\d+\.\d+/g)].map(x=>Number(x[0]));
   assert.equal(values.length,4);
   assert.ok(values.every(x=>x>-500&&x<900),'no endpoint jumps millions of pixels off the map: '+path);
  }
 }
 const center=worldPoint(37.5,139.93,16);
 const normal=segmentPaths([{lat:37.5,lon:139.9299},{lat:37.5001,lon:139.9301}],center,360,260,16);
 assert.match(normal,/path d="M/,'normal Japanese map coordinates remain supported');
});
