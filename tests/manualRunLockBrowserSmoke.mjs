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
 const save=(page,date,holdMs)=>page.evaluate(async ({date,holdMs})=>{
  const [{saveManualRun}, {withManualRunWriteLock}]=await Promise.all([
   import('/ui/manualRunStore.js'),import('/ui/manualRunLock.js')]);
  const draft={date,distance:'5',hours:'',minutes:'32',seconds:'',
   rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
   activityGait:'RUNNING',runningFormat:'CONTINUOUS_RUN',memo:date};
  return withManualRunWriteLock(async()=>{
   await new Promise(resolve=>setTimeout(resolve,holdMs));
   return saveManualRun(localStorage,draft);
  });
 },{date,holdMs});
 const [first,second]=await Promise.all([save(a,'2026-10-20',60),save(b,'2026-10-21',0)]);
 assert.equal(first.ok,true,first.reason);
 assert.equal(second.ok,true,second.reason);
 const state=await a.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v2')));
 assert.equal(state.version,2);assert.equal(state.revision,2);
 assert.equal(state.records.length,2);
 assert.deepEqual(new Set(state.records.map(x=>x.date)),new Set(['2026-10-20','2026-10-21']));
 assert.equal(new Set(state.records.map(x=>x.id)).size,2);
 await b.reload({waitUntil:'networkidle'});
 const afterReload=await b.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v2')));
 assert.deepEqual(afterReload,state);
 console.log('PASS browser lock: two tabs, two independent acknowledged records, no silent overwrite');
 // Explicit counterexample: a stale tab not using Web Locks overwrites the V2 key.
 const before=await a.evaluate(()=>localStorage.getItem('runload-v2-manual-runs-v2'));
 const stale=JSON.stringify({version:2,revision:1,records:state.records.slice(0,1)});
 await b.evaluate(raw=>localStorage.setItem('runload-v2-manual-runs-v2',raw),stale);
 const lost=await a.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v2')));
 assert.equal(lost.records.length,1);
 assert.equal(lost.records.some(r=>r.id===state.records[1].id),false);
 assert.notEqual(await a.evaluate(()=>localStorage.getItem('runload-v2-manual-runs-v2')),before);
 console.log('BLOCKER stage9: non-cooperating old tab can silently replace an acknowledged run. Not a PASS.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
