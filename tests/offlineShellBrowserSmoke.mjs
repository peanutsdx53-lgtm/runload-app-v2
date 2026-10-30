/** Offline scope: initial visit without a cache fails; installed shell retains recorded data.
 * localhost is trusted but pwa.js registers SW only on HTTPS, so this test
 * registers the exact published sw.js explicitly after an online first visit.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));
  if(!(path===root||path.startsWith(root+sep)))throw Error('outside');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(4179,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const host='http://127.0.0.1:4179/';
try{
 const virgin=await browser.newContext({serviceWorkers:'allow'});
 await virgin.setOffline(true);
 const first=await virgin.newPage();
 let booted=false;
 try{await first.goto(host+'#/record',{timeout:6000,waitUntil:'domcontentloaded'});booted=await first.locator('[data-draft="date"]').count()>0;}catch{}
 assert.equal(booted,false,'new offline user cannot open uncached app');
 await virgin.close();
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'allow'});
 const page=await context.newPage();page.setDefaultTimeout(18000);
 await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 await page.goto(host+'#/record',{waitUntil:'networkidle'});
 await page.locator('[data-draft="date"]').waitFor();
 const installed=await page.evaluate(async()=>{
  const r=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
  await navigator.serviceWorker.ready;
  return !!r.active;
 });
 assert.equal(installed,true);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:40000});
 const cached=await page.evaluate(async()=>{
  const keys=await caches.keys(),key=keys.find(k=>k.startsWith('runload-ui-next-shell-'));
  if(!key)return false;
  const cache=await caches.open(key),base=location.origin+'/';
  return !!(await cache.match(base+'index.html'))&&!!(await cache.match(base+'app.js'))&&
   !!(await cache.match(base+'ui/manualRunStore.js?v=20261030-rof-evidence-v2'));
 });
 assert.equal(cached,true,'shell and saved-run V2 scripts are cached');
 await context.setOffline(true);
 await page.goto(host+'#/record',{waitUntil:'load',timeout:17000});
 await page.locator('[data-draft="date"]').fill('2026-10-30');
 await page.locator('[data-draft="distance"]').fill('4');
 await page.locator('[data-draft="minutes"]').fill('24');
 await page.locator('[data-manual-gait="RUNNING"]').click();
 await page.locator('a[href="#/record-reflection"]').first().click();
 await page.locator('[data-draft="memo"]').fill('オフラインの走行メモ');
 await page.locator('[data-apply]').click();
 await page.locator('[data-demo-save]').click();
 await page.locator('[data-manual-run-save]').click();
 await page.waitForFunction(()=>location.hash.startsWith('#/result?record='),null,{timeout:18000});
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v2')));
 assert.equal(state.version,2);assert.equal(state.records.length,1);
 assert.equal(state.records[0].memo,'オフラインの走行メモ');
 await page.reload({waitUntil:'load',timeout:18000});
 await page.locator('.rv4-distance strong').waitFor();
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v2')))).records[0].id,state.records[0].id);
 assert.equal(await page.evaluate(()=>navigator.onLine),false);
 const uncached=await page.evaluate(async()=>{
  try{await fetch('https://example.com/runload-network-probe',{cache:'no-store'});return false;}catch{return true;}
 });
 assert.equal(uncached,true,'uncached external URL cannot work offline');
 console.log('PASS stage9: cold-start offline unavailable; installed cache, local save and reload survive network cut');
 await context.close();
}finally{await browser.close();await new Promise(done=>server.close(done));}
