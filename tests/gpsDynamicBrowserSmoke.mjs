/* Actual browser/IndexedDB integration contract for approved dynamic GPS result. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+decodeURIComponent(path));
  if(!file.startsWith(root+sep)&&file!==root)throw Error('denied');
  const buf=await readFile(file===root?resolve(root,'index.html'):file);
  res.setHeader('content-type',mime[extname(file)]||'application/octet-stream');res.end(buf);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(4189,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 for(const mode of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja',formalTermsAccepted:false})));
  await page.goto('http://127.0.0.1:4189/#/history',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   const id='gps-v2-00000000-0000-4000-8000-000000000001',t=1700000000000;
   const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('runload-v2-gps-dynamic-v2',1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('summaries'))db.createObjectStore('summaries',{keyPath:'id'});if(!db.objectStoreNames.contains('details'))db.createObjectStore('details',{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   const summary={schema:2,id,activity:'RUNNING',date:'2026-10-27',createdAt:new Date(t).toISOString(),
     distanceKm:.0275,activeSeconds:10,accepted:3,rejected:0,detailSaved:true,
     finalReference:{state:'REFERENCE_ONLY',speedMps:2.75,modelVersion:'e2e-seed',semanticVersion:'e2e-seed',
      source:'test-seed',regions:Array.from({length:12},(_,i)=>({regionId:'R'+String(i+1).padStart(2,'0'),value:null,calculationState:'NOT_CALCULABLE',reasonCode:'SEED'}))}};
   const route=[{lat:37.5000,lon:139.9000,km:0,t,breakBefore:true},
     {lat:37.5001,lon:139.9001,km:.0125,t:t+5000,breakBefore:false},
     {lat:37.5003,lon:139.9002,km:.0275,t:t+10000,breakBefore:false}];
   const detail={id,schema:2,route,trackSimplified:false,
      speedPoints:route.map((r,i)=>({t:r.t,km:r.km,breakBefore:r.breakBefore,activeMs:i*5000})),
      flags:[{id:'flag-e2e01',t:t+5000,km:.0125,lat:37.5001,lon:139.9001,note:'折り返し'}]};
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(['summaries','details'],'readwrite');
    tx.objectStore('summaries').add(summary);tx.objectStore('details').add(detail);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });db.close();
  });
  // Exercise the production v2 writer in the actual browser, including opt-out
  // and an all-in-one backup, not just hand-seeded IndexedDB reads.
  const persisted=await page.evaluate(async()=>{
   const storage=await import('/ui/gpsReplayIndexedDbStore.js');
   const base=1700001000000;
   const mk=(i,km)=>({lat:37.51+i*.00003,lon:139.91,
    ele:null,altitudeAccuracy:null,altitudeQuality:'missing',
    t:base+5000*i,km,breakBefore:i===0,activity:'RUNNING'});
   const track=[mk(0,0),mk(1,.0125),mk(2,.025)];
   const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
    accepted:3,rejected:0,track,trackSimplified:false,
    replayTrackAvailable:true,replayTrack:track.map((p,i)=>({t:p.t,km:p.km,breakBefore:p.breakBefore,activeMs:5000*i})),
    flags:[]};
   const simple=await storage.saveGpsV2Run(session,{saveDetails:false,date:'2026-10-27'});
   const detailed=await storage.saveGpsV2Run(session,{saveDetails:true,date:'2026-10-27'});
   const simpleDetail=simple.ok?await storage.readGpsV2Detail(simple.summary.id):{ok:false};
   const fullDetail=detailed.ok?await storage.readGpsV2Detail(detailed.summary.id):{ok:false};
   const backup=await storage.exportGpsV2Backup();
   return {simple:simple.ok,detailed:detailed.ok,noDetail:!simpleDetail.ok,
    withDetail:fullDetail.ok,backup:backup.ok,
    backupValidated:backup.ok&&storage.inspectGpsV2Backup(backup.text).ok};
  });
  assert.deepEqual(persisted,{simple:true,detailed:true,noDetail:true,
   withDetail:true,backup:true,backupValidated:true},'IndexedDB v2 save and export: '+JSON.stringify(persisted));
  await page.reload({waitUntil:'networkidle'});
  await page.goto('http://127.0.0.1:4189/#/result?gps=gps-v2-00000000-0000-4000-8000-000000000001',{waitUntil:'networkidle'});
  await page.locator('.gd-enter').waitFor();
  assert.match(await page.locator('.gd-summary').innerText(),/走行結果/);
  await page.locator('.gd-enter').click();
  await page.locator('.gd-main').waitFor();
  assert.equal(await page.locator('.gd-panel').count(),2);
  assert.equal(await page.locator('.gd-body-path').count(),5);
  assert.equal(await page.locator('.gd-map-flag').count(),1);
  const initial=await page.locator('.gd-metric').nth(2).innerText();
  await page.locator('.gd-scrub').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const changed=await page.locator('.gd-metric').nth(2).innerText();
  assert.notEqual(initial,changed,'GPS speed should change with scrubbed frame');
  await page.locator('[data-view="back"]').click();
  assert.equal(await page.locator('.gd-body-path').count(),4);
  await page.locator('[data-view="sole"]').click();
  assert.equal(await page.locator('.gd-body-path').count(),3);
  await page.locator('[data-jump-flag="0"]').click();
  assert.equal(await page.locator('.gd-scrub').inputValue(),'1');
  assert.equal(await page.locator('.gd-flag-note').count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,mode.name+' GPS dynamic UI overflows '+overflow);
  assert.deepEqual(errors,[],mode.name+' console errors '+errors.join(';'));
  await page.screenshot({path:resolve(root,'screenshots','gps-dynamic-'+mode.name+'-integration.png'),fullPage:false});
  console.log('PASS',mode.name,'v2 IndexedDB -> static gateway -> synced dynamic body/route/speed/flags');
  await page.close();
 }
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
