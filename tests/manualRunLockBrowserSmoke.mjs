/** Browser acceptance: two cooperating tabs save concurrently using the Web Lock.
 * Run with a local Playwright installation: node tests/manualRunLockBrowserSmoke.mjs
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const p=resolve(root,'.'+name.replace(/^\//,'/'));
  if(!(p===root||p.startsWith(root+sep)))throw Error('outside');
  const file=p===root?resolve(root,'index.html'):p;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(4176,'127.0.0.1',done));
const browserType=engineName==='webkit'?webkit:chromium;
const browser=await browserType.launch({headless:true,...(engineName==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 const context=await browser.newContext();
 const a=await context.newPage(),b=await context.newPage();
 await Promise.all([a.goto('http://127.0.0.1:4176/'),b.goto('http://127.0.0.1:4176/')]);
 const save=(page,date,holdMs,cooperate=true)=>page.evaluate(async({date,holdMs,cooperate})=>{
  const [{saveManualRun},{withManualRunWriteLock},canonical]=await Promise.all([
   import('/ui/manualRunStore.js'),import('/ui/manualRunLock.js'),import('/ui/manualRunCanonical.js')]);
  const draft={date,distance:'5',hours:'',minutes:'32',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'CONTINUOUS_RUN',memo:date};
  const task=async()=>{await new Promise(r=>setTimeout(r,holdMs));const fresh=await canonical.refresh();if(!fresh.ok)return fresh;
   return canonical.mutate(s=>saveManualRun(s,draft))};
  return cooperate?withManualRunWriteLock(task):task();
 },{date,holdMs,cooperate});
 const [first,second]=await Promise.all([save(a,'2026-10-20',60),save(b,'2026-10-21',0)]);
 assert.equal(first.ok,true,first.reason);assert.equal(second.ok,true,second.reason);
 const read=page=>page.evaluate(async()=>JSON.parse((await (await import('/ui/manualRunCanonical.js')).readCanonical()).raw));
 let state=await read(a);
 assert.equal(state.version,2);assert.equal(state.revision,2);assert.equal(state.records.length,2);
 assert.deepEqual(new Set(state.records.map(x=>x.date)),new Set(['2026-10-20','2026-10-21']));
 const recordIds=new Set(state.records.map(x=>x.id));
 const untouched=JSON.stringify(state);
 await b.evaluate(()=>localStorage.setItem('runload-v2-manual-runs-v2',JSON.stringify({version:2,revision:0,records:[]})));
 assert.deepEqual(await read(a),state,'old localStorage writer cannot overwrite canonical IDB');
 await a.reload({waitUntil:'networkidle'});
 assert.deepEqual(await read(a),state,'forged legacy key is never imported');
 const [third,fourth]=await Promise.all([save(a,'2026-10-22',40,false),save(b,'2026-10-23',0,false)]);
 assert.equal(third.ok,true,third.reason);assert.equal(fourth.ok,true,fourth.reason);
 state=await read(b);
 assert.equal(state.revision,4);
 assert.equal(state.records.length,4,'noncooperating new-version IDB writes are serialized natively');
 assert.equal(new Set(state.records.map(x=>x.id)).size,4);
 assert.ok(state.records.every(x=>x.source==='manual'));
 assert.ok([...recordIds].every(id=>state.records.some(r=>r.id===id)),'all previously acknowledged IDs remain');
 assert.notEqual(JSON.stringify(state),untouched);
 // A writer which fails after staging may never publish a partial transaction.
 const quota=await a.evaluate(async()=>{
  const canonical=await import('/ui/manualRunCanonical.js'),store=await import('/ui/manualRunStore.js');
  const original=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(value,key){
   if(this.name===canonical.MANUAL_STORE)throw new DOMException('simulated capacity','QuotaExceededError');
   return original.call(this,value,key);
  };
  try{return await canonical.mutate(s=>store.saveManualRun(s,{date:'2026-10-24',distance:'5',
   hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'must not commit'}));}
  finally{IDBObjectStore.prototype.put=original;}
 });
 assert.equal(quota.ok,false,'simulated QuotaExceededError must not acknowledge a record');
 assert.deepEqual(await read(a),state,'quota failure must preserve all existing acknowledged run IDs');
 const aborted=await a.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  return c.mutate(s=>{s.setItem('runload-v2-manual-runs-v2','{"version":0}');return {ok:false,reason:'injected abort'}});
 });
 assert.equal(aborted.ok,false);
 assert.deepEqual(await read(a),state,'aborted IDB write must not publish invalid bytes');
 const invalid=await a.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  return c.mutate(s=>{s.setItem('runload-v2-manual-runs-v2','{"version":0}');return {ok:true}});
 });
 assert.equal(invalid.ok,false,'invalid envelope cannot commit even if writer claims success');
 assert.deepEqual(await read(a),state);
 // A damaged authoritative envelope must not silently be replaced from the
 // stale localStorage key. Fail closed and require explicit recovery.
 const damaged=await a.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  const request=indexedDB.open(c.MANUAL_DB);
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(c.MANUAL_STORE,'readwrite');
   tx.objectStore(c.MANUAL_STORE).put('{"version":"invalid"}',c.MANUAL_ENTRY);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
  });db.close();return c.refresh();
 });
 assert.equal(damaged.ok,false);
 const refused=await a.evaluate(async()=>(await import('/ui/manualRunCanonical.js')).mutate(()=>({ok:true})));
 assert.equal(refused.ok,false,'corrupt records cannot be overwritten by a new save');
 assert.equal(await a.evaluate(()=>localStorage.getItem('runload-v2-manual-runs-v2'))!==null,true,
   'untrusted older localStorage key remains untouched and never used for recovery');
 await a.evaluate(async previous=>{
  const c=await import('/ui/manualRunCanonical.js'),request=indexedDB.open(c.MANUAL_DB);
  const db=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
  await new Promise((resolve,reject)=>{
   const tx=db.transaction(c.MANUAL_STORE,'readwrite');
   tx.objectStore(c.MANUAL_STORE).put(JSON.stringify(previous),c.MANUAL_ENTRY);
   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });db.close();await c.refresh();
 },state);
 assert.deepEqual(await read(a),state,'test-only recovery retains exactly four original IDs');
 const blockedCtx=await browser.newContext();
 await blockedCtx.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{configurable:true,value:undefined})});
 const blocked=await blockedCtx.newPage();
 await blocked.goto('http://127.0.0.1:4176/',{waitUntil:'networkidle'});
 const off=await blocked.evaluate(async()=>{
  const c=await import('/ui/manualRunCanonical.js');
  const fresh=await c.refresh(),save=await c.mutate(()=>({ok:true}));
  return {fresh:fresh.ok,save:save.ok,old:localStorage.getItem('runload-v2-manual-runs-v2')};
 });
 assert.deepEqual(off,{fresh:false,save:false,old:null},'missing IndexedDB is a fail-closed condition');
 await blockedCtx.close();
 console.log('PASS stage 9: aborted and corrupt IDB records fail closed; missing IDB never falls back to localStorage');
 console.log('PASS stage 9: native IDB transaction serializes unlocked new tabs; stale localStorage writes cannot alter 4 acknowledged records');
}finally{await browser.close();await new Promise(done=>server.close(done));}
