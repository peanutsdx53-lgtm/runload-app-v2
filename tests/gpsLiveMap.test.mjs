import test from 'node:test';
import assert from 'node:assert/strict';
import {worldPoint,visibleTiles} from '../ui/gpsLiveMap.js';
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
