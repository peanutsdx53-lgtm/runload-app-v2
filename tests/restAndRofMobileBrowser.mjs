/** S06 S08 S10: real rest-day save and ROF-J compactness in browsers.
 * Never transform rest into running or manufacture missing ROF answers. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const target=resolve(root,'.'+name);if(target!==root&&!target.startsWith(root+sep))throw Error('traversal');const file=target===root?resolve(root,'index.html'):target;res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.statusCode=404;res.end('missing')}});
await new Promise(done=>server.listen(4299,'127.0.0.1',done));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
try{
 for(const width of [320,390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:850},reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const host='http://127.0.0.1:4299/#/';
  await page.goto(host+'record-rof',{waitUntil:'networkidle'});
  const rof=page.locator('[data-rof-v4-root]');await rof.waitFor();
  assert.equal(await rof.locator('.rv4-optional-meta').getAttribute('open'),null,'timing metadata collapsed by default');
  assert.equal(await rof.locator('[data-rof-v4-anchor]').count(),5);
  assert.equal(await rof.locator('[data-rof-v4-tick]').count(),11);
  await rof.locator('[data-rof-v4-range]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await rof.locator('[data-rof-v4-phase="after"]').click();
  assert.match(await rof.locator('[data-rof-v4-phase="before"]').innerText(),/0\/10/);
  assert.match(await rof.locator('[data-rof-v4-phase="after"]').innerText(),/未入力/);
  await rof.locator('[data-rof-v4-range]').evaluate(el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await rof.locator('[data-rof-v4-phase="before"]').click();
  assert.match(await rof.locator('[data-rof-v4-phase="after"]').innerText(),/8\/10/);
  await rof.locator('.rv4-optional-meta > summary').click();
  assert.equal(await rof.locator('.rv4-optional-meta').getAttribute('open'),'');
  assert.equal(await rof.locator('[data-rof-v4-next-phase]').count(),0,'one phase selector at top; no repeated bottom navigation');
  await rof.locator('[data-rof-run-start-date]').fill('2026-10-30');
  await rof.locator('[data-rof-run-start]').fill('09:40');
  await rof.locator('[data-rof-run-end-date]').fill('2026-10-30');
  await rof.locator('[data-rof-run-end]').fill('10:10');
  const inputBounds=await rof.evaluate(el=>{
   const card=el.querySelector('.rv4-run-times').getBoundingClientRect();
   const values=[...el.querySelectorAll('.rv4-run-time-picks input')].map(input=>{
    const r=input.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
   });
   return {left:card.left,right:card.right,values};
  });
  assert.ok(inputBounds.values.every(b=>b.left>=inputBounds.left-3&&b.right<=inputBounds.right+3),
   'native date and time never overflow card at '+width+': '+JSON.stringify(inputBounds));
  await rof.locator('[data-rof-v4-phase="after"]').click();
  assert.equal(await rof.locator('.rv4-optional-meta').getAttribute('open'),'','metadata retains open setting when changing phases');
  assert.equal(await rof.locator('[data-rof-run-start]').inputValue(),'09:40');
  assert.equal(await rof.locator('[data-rof-run-end]').inputValue(),'10:10');
  const measure=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth}));
  assert.ok(measure.doc<=measure.width+3,'ROF phone reflow '+JSON.stringify(measure));
  await page.goto(host+'record',{waitUntil:'networkidle'});
  await page.locator('[data-record-type="rest"]').click();
  await page.locator('[data-draft="date"]').fill('2026-10-29');
  await page.locator('[data-demo-save]').click();
  const review=page.locator('[data-record-review]');await review.waitFor();
  const restSave=review.locator('[data-rest-day-save]');
  assert.equal(await restSave.isEnabled(),true);
  assert.match(await review.innerText(),/走行の結果画面は表示しません/);
  await restSave.click();
  await page.locator('#runload-history-v2').waitFor();
  const history=page.locator('#runload-history-v2');
  await history.locator('[data-select-id="rest-v1-2026-10-29"]').waitFor();
  const record=await page.evaluate(async()=>{
   const r=await import('/ui/restDayStore.js');
   const d=await import('/ui/manualRunCanonical.js');
   return {rest:r.readRestDays(localStorage),run:(await d.readCanonical()).read.records};
  });
  assert.equal(record.rest.ok,true);
  assert.equal(record.rest.records.length,1);
  assert.equal(record.run.length,0);
  assert.equal(record.rest.records[0].date,'2026-10-29');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#runload-history-v2 [data-select-id="rest-v1-2026-10-29"]').waitFor();
  assert.deepEqual(errors,[],'real browser no errors');
  await ctx.close();
 }
 console.log('PASS '+engine+' rest history and optional ROF phases in three viewports');
}finally{await browser.close();await new Promise(done=>server.close(done));}
