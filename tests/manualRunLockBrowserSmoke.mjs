/** Browser acceptance: two cooperating tabs save concurrently using the Web Lock.
 * Run with a local Playwright installation: node tests/manualRunLockBrowserSmoke.mjs
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
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
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 const context=await browser.newContext();
 const a=await context.newPage(),b=await context.newPage();
 await Promise.all([a.goto('http://127.0.0.1:4176/'),b.goto('http://127.0.0.1:4176/')]);
 const save=(page,date,holdMs,cooperate=true)=>page.evaluate(async({date,holdMs,cooperate})=>{
  const [{saveManualRun},{withManualRunWriteLock},canonical]=await Promise.all([
   import('/ui/manualRunStore.js'),import('/ui/manualRunLock.js'),import('/ui/manualRunCanonical.js')]);
  const draft={date,distance:'5',hours:'',minutes:'32',seconds:'',rofBefore:0,rofAfter:null,
   steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'CONTINUOUS_RUN',memo:date};
  const task=async()=>{await new Promise(r=>setTimeout(r,holdMs));return canonical.mutate(s=>saveManualRun(s,draft))};
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
 console.log('PASS stage 9: native IDB transaction serializes unlocked new tabs; stale localStorage writes cannot alter 4 acknowledged records');
}finally{await browser.close();await new Promise(done=>server.close(done));}
