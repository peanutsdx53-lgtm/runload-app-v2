import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeGpsStore,readGpsRuns,saveGpsRun,removeGpsRun,GPS_DB_NAME} from '../ui/gpsIndexedDbStore.js';
test('GPS IndexedDB unavailable is fail-closed, not a localStorage fallback',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 try{
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:undefined});
  const r=await initializeGpsStore();assert.equal(r.ok,false);assert.equal(readGpsRuns().ok,false);
  assert.equal((await saveGpsRun({phase:'ready'})).ok,false);
  assert.equal((await removeGpsRun('missing')).ok,false);
  assert.match(GPS_DB_NAME,/gps/);
 }finally{
  if(previous)Object.defineProperty(globalThis,'indexedDB',previous);else delete globalThis.indexedDB;
 }
});
