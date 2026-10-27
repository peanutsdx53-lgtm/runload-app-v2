import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeGpsOriginStorage,readGpsOriginStorage,requestGpsStoragePersistence,sharedGithubPagesOrigin} from '../ui/gpsStorageHealth.js';
test('origin estimates never claim to be GPS-specific storage size',()=>{
 const s=summarizeGpsOriginStorage({usage:90*1048576,quota:100*1048576},false);
 assert.equal(s.percent,90);assert.equal(s.freeMiB,10);assert.equal(s.warning,true);assert.equal(s.persistent,false);
 const no=summarizeGpsOriginStorage({usage:200000},null);assert.equal(no.percent,null);assert.equal(no.warning,false);assert.equal(no.persistent,null);
});
test('unsupported storage and persistence denial fail closed',async()=>{
 assert.equal((await readGpsOriginStorage(null)).ok,false);
 assert.equal((await requestGpsStoragePersistence(null)).ok,false);
 const info=await readGpsOriginStorage({estimate:async()=>({usage:1,quota:100}),persisted:async()=>{throw Error('blocked')}});
 assert.equal(info.ok,true);assert.equal(info.persistent,null);
 const deny=await requestGpsStoragePersistence({persist:async()=>false});assert.equal(deny.granted,false);
 const allow=await requestGpsStoragePersistence({persist:async()=>true});assert.equal(allow.granted,true);
 assert.equal((await requestGpsStoragePersistence({persist:async()=>{throw Error('blocked')}})).ok,false);
});
test('GitHub Pages project URLs share storage origin with sibling project apps',()=>{
 assert.equal(sharedGithubPagesOrigin('https://peanutsdx53-lgtm.github.io/runload-app-v2/#/history'),true);
 assert.equal(sharedGithubPagesOrigin('https://runload.example.com/runload-app-v2/'),false);
 assert.equal(sharedGithubPagesOrigin('bad-url'),false);
});
