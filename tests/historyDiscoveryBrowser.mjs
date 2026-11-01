/** UX-013: actual SPA and IndexedDB search/month discovery acceptance.
 * Uses isolated browser profiles and self-entered test records, never production user data.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+name);
 if(path!==root&&!path.startsWith(root+sep))throw Error('path');
 const f=path===root?resolve(root,'index.html'):path;
 res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
}catch{res.statusCode=404;res.end('not found');}});
await new Promise(ok=>server.listen(4316,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const out=resolve(root,'audit-output','history-discovery-'+engine);
await mkdir(out,{recursive:true});
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const host='http://127.0.0.1:4316/#/',results=[];
async function capture(page,width,label){
 const metrics=await page.evaluate(()=>{
 const root=document.querySelector('#runload-history-v2')?.shadowRoot;
 const controls=[...(root?.querySelectorAll('.hx-scope button')||[])];
 const bounds=[...(root?.querySelectorAll('.hx-scope,.list-panel,.timeline,.selected-footer')||[])].map(el=>{
  const r=el.getBoundingClientRect();return {className:el.className,left:r.left,right:r.right};
 });
 return {viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,
  scopeTouchHeights:controls.map(el=>el.getBoundingClientRect().height),bounds};
});
 assert.ok(metrics.document<=width+3&&metrics.body<=width+3,'no horizontal overflow '+label+': '+JSON.stringify(metrics));
 if(!label.includes('selected-result')){
  assert.ok(metrics.scopeTouchHeights.length===2&&metrics.scopeTouchHeights.every(h=>h>=43.5),'44px scope targets '+JSON.stringify(metrics.scopeTouchHeights));
  assert.ok(metrics.bounds.every(b=>b.left>=-3&&b.right<=width+3),'history panels inside viewport '+label+': '+JSON.stringify(metrics.bounds));
 }
 const filename=engine+'-'+width+'-'+label+'.png';
 await page.screenshot({path:resolve(out,filename),fullPage:true,animations:'disabled'});
 results.push({width,label,filename,...metrics});
}
try{
 for(const width of [320,390,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},locale:'ja-JP',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const old=new Date();old.setDate(15);old.setMonth(old.getMonth()-2);
  const date=old.getFullYear()+'-'+String(old.getMonth()+1).padStart(2,'0')+'-15';
  const month=date.slice(0,7);
  const thisMonth=new Date().getFullYear()+'-'+String(new Date().getMonth()+1).padStart(2,'0');
  assert.notEqual(month,thisMonth);
  await page.goto(host+'history',{waitUntil:'networkidle'});
  const rootSel=page.locator('#runload-history-v2');
  await rootSel.waitFor();
  await rootSel.locator('.empty[data-history-unconnected="false"]').waitFor({state:'visible',timeout:12000});
  assert.match(await rootSel.locator('.empty').innerText(),/保存した記録はまだありません/);
  assert.equal(await rootSel.locator('[data-select-id]').count(),0,'never synthesize history');
  await capture(page,width,'01-no-saved-records');
  await page.goto(host+'record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="date"]').fill(date);
  await page.locator('[data-draft="distance"]').fill('4.5');
  await page.locator('[data-draft="minutes"]').fill('32');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.locator('a[href="#/record-reflection"]').first().click();
  await page.locator('[data-draft="memo"]').fill('月をまたぐ検索用の本人メモ');
  await page.locator('[data-apply]').click();
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  await page.locator('[data-manual-run-save]').click();
  await page.waitForFunction(()=>location.hash.startsWith('#/result?record='),null,{timeout:12000});
  const runId=await page.evaluate(async()=>{
   const {readCanonical}=await import('/ui/manualRunCanonical.js');
   const result=await readCanonical();return result.read.records.at(-1)?.id||null;
  });
  assert.ok(runId?.startsWith('run-v1-'));
  await page.goto(host+'history',{waitUntil:'networkidle'});
  await rootSel.waitFor();
  await rootSel.locator('.empty[data-history-unconnected="false"]').waitFor({state:'visible',timeout:12000});
  assert.match(await rootSel.locator('.empty').innerText(),/この月の記録はありません/);
  assert.match(await rootSel.locator('.empty').innerText(),/別の月に保存済み/);
  await capture(page,width,'02-other-month-exists');
  await rootSel.locator('[data-history-scope="all"]').first().click();
  await rootSel.locator('[data-select-id="'+runId+'"]').waitFor({state:'visible'});
  assert.match(await rootSel.locator('.hx-entry-month').innerText(),new RegExp(String(old.getFullYear())+'年'));
  await capture(page,width,'03-all-months');
  const input=rootSel.locator('#hx-search');
  await input.fill('月をまたぐ検索用');
  assert.equal(await input.evaluate(el=>el===el.getRootNode().activeElement),true,'search input should retain keyboard focus');
  assert.equal(await rootSel.locator('[data-select-id]').count(),1);
  await capture(page,width,'04-search-match');
  await input.fill('存在しない文字列');
  assert.equal(await rootSel.locator('[data-select-id]').count(),0);
  assert.match(await rootSel.locator('.empty').innerText(),/全期間で一致する記録はありません/);
  await capture(page,width,'05-search-no-match');
  await input.fill('');
  await rootSel.locator('[data-select-id="'+runId+'"]').click();
  assert.equal(await rootSel.locator('[data-open-record]').isEnabled(),true);
  await capture(page,width,'06-selected-run');
  await rootSel.locator('[data-open-record]').click();
  await page.waitForFunction((id)=>location.hash.includes(encodeURIComponent(id)),runId);
  await page.locator('#runload-result-v4').waitFor({state:'visible'});
  await capture(page,width,'07-selected-result');
  await page.goto(host+'history',{waitUntil:'networkidle'});
  await rootSel.locator('[data-history-scope="month"]').click();
  await rootSel.locator('[data-jump-month="'+month+'"]').click();
  assert.match(await rootSel.locator('.month-nav').innerText(),new RegExp(String(old.getFullYear())+'年'));
  assert.equal(await rootSel.locator('[data-select-id="'+runId+'"]').count(),1);
  assert.equal(await rootSel.locator('[data-history-scope="month"]').getAttribute('aria-pressed'),'true');
  await capture(page,width,'08-jump-to-record-month');
  await page.reload({waitUntil:'networkidle'});
  await rootSel.waitFor();
  await rootSel.locator('.hx-scope [data-history-scope="all"]').click();
  assert.equal(await rootSel.locator('[data-select-id="'+runId+'"]').count(),1,'reload retains IndexedDB record');
  await capture(page,width,'09-reload-all-months');
  assert.deepEqual(errors,[],'no script errors');
  await ctx.close();
  // An independent profile with only a rest day must not synthesize a run or result.
  const restCtx=await browser.newContext({viewport:{width,height:width===1440?900:844},locale:'ja-JP',reducedMotion:'reduce'});
  await restCtx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const restPage=await restCtx.newPage(),restErrors=[];
  restPage.on('pageerror',e=>restErrors.push(e.message));
  await restPage.goto(host+'record',{waitUntil:'networkidle'});
  await restPage.locator('[data-record-type="rest"]').click();
  await restPage.locator('[data-draft="date"]').fill(date);
  await restPage.locator('[data-demo-save]').click();
  await restPage.locator('[data-record-review]').waitFor();
  assert.match(await restPage.locator('[data-record-review]').innerText(),/走行の結果画面は表示しません/);
  await restPage.locator('[data-rest-day-save]').click();
  const restHistory=restPage.locator('#runload-history-v2');await restHistory.waitFor();
  await restHistory.locator('.hx-scope [data-history-scope="all"]').click();
  await restHistory.locator('[data-record-kind="rest"]').click();
  const restItem=restHistory.locator('[data-select-id^="rest-v1-"]');
  assert.equal(await restItem.count(),1,'rest-only profile has one rest record');
  assert.equal(await restHistory.locator('[data-open-record]').count(),0);
  await capture(restPage,width,'10-rest-only');
  await restItem.click();
  const restNotice=restHistory.locator('.selected-footer .pill');
  await restNotice.waitFor({state:'visible'});
  assert.match(await restNotice.innerText(),/休養日：走行結果・参考値なし/);
  assert.equal(await restHistory.locator('[data-open-record]').count(),0,'rest selection must not open running result');
  await capture(restPage,width,'11-rest-selected');
  await restPage.reload({waitUntil:'networkidle'});
  await restHistory.waitFor();
  await restHistory.locator('.hx-scope [data-history-scope="all"]').click();
  assert.equal(await restHistory.locator('[data-select-id^="rest-v1-"]').count(),1,'rest survives reload without adding a run');
  const savedRuns=await restPage.evaluate(async()=>{const {readCanonical}=await import('/ui/manualRunCanonical.js');return (await readCanonical()).read.records.length;});
  assert.equal(savedRuns,0,'rest-only profile must have zero manual runs');
  await capture(restPage,width,'12-rest-reloaded');
  assert.deepEqual(restErrors,[],'rest-only profile page errors');
  await restCtx.close();
 }
 console.log('PASS '+engine+' history search, month jump, saved run and reload at 320/390/1440');
}finally{
 await writeFile(resolve(out,engine+'-metrics.json'),JSON.stringify(results,null,2));
 await browser.close();await new Promise(done=>server.close(done));
}
