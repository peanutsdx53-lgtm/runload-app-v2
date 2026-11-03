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

test('unexpected V1 IndexedDB closure invalidates stale connection and permits fresh reload (025)',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
 const opened=[];
 try{
  Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:{
   open(){
    const db={transaction(){throw Error('test-only unusable connection')},close(){}};
    opened.push(db);
    const request={result:db};
    queueMicrotask(()=>request.onsuccess?.());
    return request;
   }
  }});
  const first=await initializeGpsStore();assert.equal(first.ok,false);
  assert.equal(opened.length,1);
  assert.equal(typeof opened[0].onclose,'function');
  opened[0].onclose();
  assert.equal(readGpsRuns().ok,false,'an abruptly closed connection invalidates cached data');
  const second=await initializeGpsStore();
  assert.equal(second.ok,false,'mock transaction still refuses to read data');
  assert.equal(opened.length,2,'a new IDB connection was attempted after abnormal closure');
  opened[1].onclose();
 }finally{
  if(previous)Object.defineProperty(globalThis,'indexedDB',previous);else delete globalThis.indexedDB;
 }
});
