/** GPS user journey: only real (mock-received) GPS points are measured;
 * ROF-J responses stay separate and survive saving + page reload.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
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
const out=resolve(root,'audit-output','gps-mobile');await mkdir(out,{recursive:true});
const phoneUA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
try{
 for(const width of [320,390,1440]){
  const phone=width<800;
  const opts={viewport:{width,height:900},reducedMotion:'reduce',locale:'ja-JP'};
  if(phone){opts.userAgent=phoneUA;opts.isMobile=true;opts.hasTouch=true;}
  const ctx=await browser.newContext(opts);
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
  const shot=async tag=>{await page.screenshot({path:resolve(out,engine+'-'+width+'-'+tag+'.png'),fullPage:true,animations:'disabled',timeout:15000});};
  const safe=async tag=>{
    const metrics=await page.evaluate(()=>{
      const step=[...document.querySelectorAll('.gps-live-steps span')].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,left:r.left,right:r.right,bottom:r.bottom}});
      return {w:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,step};
    });
    assert.ok(metrics.scroll<=metrics.w+2&&metrics.body<=metrics.w+2,tag+' document overflow '+JSON.stringify(metrics));
    if(metrics.step.length===3)assert.ok(metrics.step.every(x=>Math.abs(x.top-metrics.step[0].top)<=2),tag+' 3 steps on one row');
  };
  await page.goto(host+'record-start',{waitUntil:'networkidle'});
  await shot('method-selection');
  if(!phone){
    assert.equal(await page.locator('a.rv-method-gps[href="#/measurement"]').count(),0,'PC cannot select GPS');
    assert.match(await page.locator('.rv-method-gps.is-unavailable').innerText(),/スマートフォン専用/);
    await page.goto(host+'measurement',{waitUntil:'networkidle'});
    assert.match(await page.locator('.gps-platform-unavailable').innerText(),/スマートフォン専用/);
    assert.equal(await page.locator('[data-gps-action="start"]').count(),0,'PC direct URL does not start');
    await shot('desktop-blocked');
    assert.deepEqual(errors,[],'PC errors');
    await ctx.close();continue;
  }
  assert.equal(await page.locator('a.rv-method-gps[href="#/measurement"]').count(),1);
  await page.locator('a.rv-method-gps').click();
  await page.locator('[data-phase="ready"]').waitFor();
  assert.equal(await page.locator('.gps-live-steps span').count(),3);
  assert.equal(await page.locator('.gps-live-steps .is-current').count(),1);
  await safe('ready');await shot('01-ready');
  assert.equal(await page.locator('[data-gps-rof="before"]').count(),0,'no inline fatigue selector');
  await page.locator('[data-gps-rof-entry="before"]').click();
  await page.locator('[data-rof-v4-root]').waitFor();
  assert.equal(await page.locator('[data-rof-v4-phase]').count(),1,'before phase only');
  assert.equal(await page.locator('.rv4-anchor').count(),5);
  await shot('01-rof-before');
  await page.locator('[data-rof-v4-range]').evaluate(el=>{
    el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
  });
  assert.equal((await page.locator('[data-rof-v4-number]').innerText()).trim(),'0');
  await page.locator('.rv4-done').click();
  await page.locator('[data-phase="ready"]').waitFor();
  assert.match(await page.locator('[data-gps-rof-entry="before"]').innerText(),/0 \/ 10/);
  await page.locator('[data-gps-action="start"]').click();
  await page.locator('[data-gps-consent-confirm]').waitFor();
  await shot('01-consent');
  await page.locator('[data-gps-consent-confirm]').click();
  await page.locator('[data-phase="running"]').waitFor();
  await safe('running');await shot('02-measuring');
  const t=Date.now();
  await page.evaluate(ts=>window.__sampleGps(37.5,ts),t);
  await page.evaluate(ts=>window.__sampleGps(37.50025,ts),t+5000);
  await page.waitForTimeout(1250);
  await page.locator('[data-gps-action="finish"]').click();
  await page.locator('[data-gps-review]').waitFor();
  assert.ok(page.url().includes('#/gps-review'),'finished GPS review');
  assert.match(await page.locator('.gps-review-rof-before').innerText(),/0 \/ 10/);
  assert.match(await page.locator('.gps-review-provenance').innerText(),/0は回答済み、未回答は未回答のまま保存/);
  assert.match(await page.locator('.gps-review-storage-note').innerText(),/位置情報を含むコース詳細は/);
  const rofTerm=await page.locator('[data-gps-rof-entry="after"] .gps-rof-term').evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,fragments:el.getClientRects().length}));
  assert.equal(rofTerm.whiteSpace,'nowrap','ROF-J name cannot split at a hyphen in narrow layout');
  assert.equal(rofTerm.fragments,1,'ROF-J scientific term must remain a single visual fragment');
  await safe('review');await shot('03-review-empty-after');
  await page.locator('[data-gps-rof-entry="after"]').click();
  await page.locator('[data-rof-v4-root]').waitFor();
  assert.equal(await page.locator('[data-rof-v4-phase]').count(),1,'after phase only');
  await shot('03-rof-after');
  await page.locator('[data-rof-v4-range]').evaluate(el=>{el.value='7';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal((await page.locator('[data-rof-v4-number]').innerText()).trim(),'7');
  await page.locator('.rv4-done').click();
  await page.locator('[data-gps-review]').waitFor();
  assert.match(await page.locator('[data-gps-rof-entry="after"]').innerText(),/7 \/ 10/);
  await page.locator('[data-gps-note]').fill('測定後に本人が記録した気づき');
  assert.equal(await page.locator('[data-gps-save-route]').isChecked(),false);
  await safe('populated review');await shot('03-review-filled');
  await page.locator('[data-gps-action="save"]').click();
  await page.locator('#runload-result-v4').waitFor();
  const id=new URLSearchParams(page.url().split('?')[1]).get('gps');
  const stored=await page.evaluate(async()=>{const g=await import('/ui/gpsReplayIndexedDbStore.js');return g.readGpsV2Summaries();});
  assert.equal(stored.ok,true,stored.reason);
  const saved=stored.records.find(r=>r.id===id);assert.ok(saved,'saved GPS ID exists');
  assert.equal(saved.experience.source,'USER_REPORTED');
  assert.equal(saved.experience.rofBefore,0);assert.equal(saved.experience.rofAfter,7);
  assert.equal(saved.experience.memo,'測定後に本人が記録した気づき');
  assert.ok(saved.experience.beforeCapturedAt&&saved.experience.afterCapturedAt);
  assert.equal(saved.detailSaved,false,'route storage opt-in remains OFF');
  await page.reload({waitUntil:'networkidle'});
  const result=page.locator('#runload-result-v4');
  if(!(await result.locator('[data-pane="fatigue"]').isVisible()))await result.locator('[data-tab="fatigue"]').click();
  await result.locator('[data-pane="fatigue"]').waitFor({state:'visible'});
  const fatigue=await result.locator('[data-pane="fatigue"]').innerText();
  assert.match(fatigue,/運動前/);assert.match(fatigue,/運動後/);
  assert.match(fatigue,/(^|\D)0(\D|$)/);assert.match(fatigue,/(^|\D)7(\D|$)/);
  assert.deepEqual(errors,[],'no browser errors');
  await ctx.close();
 }
 console.log('PASS mobile GPS preflight -> ROF -> measurement -> after ROF -> result, desktop blocked '+engine);
}finally{await browser.close();await new Promise(done=>server.close(done));}
