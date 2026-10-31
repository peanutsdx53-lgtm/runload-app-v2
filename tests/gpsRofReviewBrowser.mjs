/** GPS user journey: only real (mock-received) GPS points are measured;
 * ROF-J responses stay separate and survive saving + page reload.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+name);
 if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');
 const file=path===root?resolve(root,'index.html'):path;
 res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file))
 }catch{res.statusCode=404;res.end('missing')}});
await new Promise(ok=>server.listen(4226,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 for(const width of [390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
   const watches=new Map();
   Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
    watchPosition:ok=>{const id=watches.size+1;watches.set(id,ok);return id;},
    clearWatch:id=>watches.delete(id)
   }});
   window.__sampleGps=(lat,t)=>{for(const fn of watches.values())fn({
    timestamp:t,coords:{latitude:lat,longitude:139.9,accuracy:8,altitude:null,altitudeAccuracy:null}
   });};
  });
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const host='http://127.0.0.1:4226/#/';
  await page.goto(host+'measurement',{waitUntil:'networkidle'});
  await page.locator('[data-gps-rof="before"]').selectOption('0');
  await page.locator('[data-gps-action="start"]').click();
  await page.locator('[data-gps-consent-confirm]').click();
  await page.locator('[data-phase="running"]').waitFor();
  const t=Date.now();
  await page.evaluate(ts=>window.__sampleGps(37.5,ts),t);
  await page.evaluate(ts=>window.__sampleGps(37.50025,ts),t+5000);
  await page.waitForTimeout(1250);
  await page.locator('[data-gps-action="finish"]').click();
  await page.locator('[data-gps-review]').waitFor();
  assert.ok(page.url().includes('#/gps-review'),'finishing opens a populated record review, not results');
  assert.match(await page.locator('.gps-review-rof-before').innerText(),/0 \/ 10/);
  const before=await page.locator('.gps-review-facts').innerText();
  assert.match(before,/GPS移動距離|GPSで取得/);
  await page.locator('[data-gps-rof="after"]').selectOption('7');
  await page.locator('[data-gps-note]').fill('測定後に本人が記録した気づき');
  assert.equal(await page.locator('[data-gps-save-route]').isChecked(),false);
  await page.locator('[data-gps-action="save"]').click();
  await page.locator('#runload-result-v4').waitFor();
  assert.ok(page.url().includes('#/result?gps='));
  const id=new URLSearchParams(page.url().split('?')[1]).get('gps');
  const store=await page.evaluate(async()=>{
   const g=await import('/ui/gpsReplayIndexedDbStore.js');
   return await g.readGpsV2Summaries();
  });
  assert.equal(store.ok,true,store.reason);
  const saved=store.records.find(r=>r.id===id);
  assert.ok(saved);
  assert.equal(saved.experience.source,'USER_REPORTED');
  assert.equal(saved.experience.rofBefore,0);
  assert.equal(saved.experience.rofAfter,7);
  assert.equal(saved.experience.memo,'測定後に本人が記録した気づき');
  assert.ok(saved.experience.beforeCapturedAt&&saved.experience.afterCapturedAt);
  assert.equal(saved.detailSaved,false);
  await page.reload({waitUntil:'networkidle'});
  const result=page.locator('#runload-result-v4');
  if(!(await result.locator('[data-pane="fatigue"]').isVisible()))
    await result.locator('[data-tab="fatigue"]').click();
  await result.locator('[data-pane="fatigue"]').waitFor({state:'visible'});
  const fatigue=await result.locator('[data-pane="fatigue"]').innerText();
  assert.match(fatigue,/運動前/);assert.match(fatigue,/運動後/);
  assert.match(fatigue,/(^|\D)0(\D|$)/);assert.match(fatigue,/(^|\D)7(\D|$)/);
  assert.deepEqual(errors,[],'no browser errors');
  await ctx.close();
 }
 console.log('PASS GPS pre-input -> measurement -> populated review -> GPS-ID linked after-input -> result '+engine);
}finally{await browser.close();await new Promise(done=>server.close(done));}
