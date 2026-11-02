import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const uri=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+uri);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside root');
  const target=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',mime[extname(target)]||'application/octet-stream');
  res.end(await readFile(target));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(4333,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const output=resolve(root,'audit-output','s03s04-record');await mkdir(output,{recursive:true});
const rootUrl='http://127.0.0.1:4333/#/';
const report=[];
const geometry=async(page,width,state)=>{
 const x=await page.evaluate(()=>{
   const r=n=>{const q=n.getBoundingClientRect();return {left:q.left,right:q.right,top:q.top,bottom:q.bottom,height:q.height}};
   const primary=document.querySelector('.rv-manual .rv-primary');
   const h=primary?.querySelector('.rv-section-title'),tag=h?.querySelector('small');
   const optional=document.querySelector('.rv-secondary .rv-section-title small');
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,
     primary:primary?r(primary):null,header:h?r(h):null,required:tag?r(tag):null,optional:optional?r(optional):null,
     columns:[...document.querySelectorAll('.rv-manual-grid>.rv-panel')].map(r)};
 });
 assert.ok(x.scroll<=x.viewport+2&&x.body<=x.viewport+2,`${engine} ${width} ${state} no document horizontal overflow ${JSON.stringify(x)}`);
 if(x.primary) {
  assert.ok(x.required.left>=x.header.left-1&&x.required.right<=x.header.right+1,'Required badge inside Basic header');
  assert.ok(x.required.right<=x.primary.right-1,'Required badge inside Basic card');
  assert.ok(x.optional.right<=x.viewport+1,'Optional badge inside viewport');
  if(width<=800)assert.ok(x.columns[0].bottom<=x.columns[1].top+2,'mobile stacks two cards');
  else assert.ok(Math.abs(x.columns[0].top-x.columns[1].top)<2,'desktop aligns two cards');
 }
 report.push({engine,width,state,...x});
};
try{
 for(const width of [320,390,768,1440]){
  const smartphone=width<=800;
  const userAgent=smartphone?(engine==='webkit'?
   'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':
   'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'):undefined;
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},locale:'ja-JP',reducedMotion:'reduce',...(userAgent?{userAgent}:{})});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(rootUrl+'record-start',{waitUntil:'networkidle'});
  const selection=page.locator('.rv-method');await selection.waitFor();
  assert.equal(await selection.locator('.rv-method-card').count(),2,'GPS or manual choice only');
  assert.equal(await selection.locator('a[href="#/measurement"]').count(),smartphone?1:0,'GPS link is smartphone-only, never inferred from viewport alone');
  assert.equal(await selection.locator('.rv-method-gps.is-unavailable').count(),smartphone?0:1,'desktop shows disabled GPS guidance');
  if(smartphone)assert.match(await selection.locator('.rv-method-gps small').innerText(),/スマホの位置情報を使用/);
  assert.equal(await selection.locator('a[href="#/record"]').count(),1);
  await geometry(page,width,'S03-selection');
  await page.screenshot({path:resolve(output,`${engine}-${width}-S03-selection.png`),fullPage:true,animations:'disabled'});
  await page.locator('a.rv-method-manual').click();
  await page.locator('.rv-manual').waitFor();
  const title=page.locator('.rv-primary .rv-section-title');
  assert.match(await title.innerText(),/基本情報.*必須/s);
  assert.match(await page.locator('.rv-secondary .rv-section-title').innerText(),/追加情報.*任意/s);
  assert.equal(await page.locator('.rv-required-overview').count(),0,'old notice removed');
  assert.equal(await page.locator('.rv-required-progress').isHidden(),true,'untouched fields do not repeat required labels');
  assert.doesNotMatch(await page.locator('.rv-primary').innerText(),/走行の保存には/);
  assert.equal(await page.locator('[data-required-field="distance"]').count(),1);
  assert.equal(await page.locator('[data-required-field="time"]').count(),1);
  assert.equal(await page.locator('[data-required-field="activity"]').count(),1);
  assert.equal(await page.locator('.rv-required-mark,.rv-gait-hint,.rv-gait-entry-title small').count(),0,'no duplicate small guidance beneath activity label');
  assert.equal(await page.locator('.rv-bottom-actions .rv-muted').innerText(),'次の画面で確認してから保存します。');
  assert.equal(await page.locator('.rv-secondary a.rv-link').count(),5);
  const summaries=await page.locator('.rv-secondary .rv-link-content small').evaluateAll(nodes=>nodes.map(el=>({
    text:el.textContent,visibleWidth:el.clientWidth,actualWidth:el.scrollWidth
  })));
  assert.ok(summaries.every(x=>x.actualWidth<=x.visibleWidth+2),'default optional summaries are never cut off: '+JSON.stringify(summaries));
  assert.equal(summaries[0].text,'未入力','unset course is stated briefly without duplicating the heading');
  assert.equal(summaries[1].text,'前：未入力・後：未入力','both optional ROF answers remain distinguishable');
  await geometry(page,width,'S04-empty-run');
  await page.screenshot({path:resolve(output,`${engine}-${width}-S04-run-empty.png`),fullPage:true,animations:'disabled'});
  await page.locator('[data-draft="distance"]').fill('5');
  assert.match(await page.locator('.rv-required-progress').innerText(),/要入力：時間・活動種目/);
  assert.equal(await page.locator('[data-required-field="distance"] input').getAttribute('aria-invalid'),'false');
  await geometry(page,width,'S04-partial-run');
  await page.screenshot({path:resolve(output,`${engine}-${width}-S04-run-partial.png`),fullPage:true,animations:'disabled'});
  await page.locator('[data-draft="minutes"]').fill('30');
  assert.match(await page.locator('.rv-required-progress').innerText(),/要入力：活動種目/);
  await page.locator('[data-manual-gait="RUNNING"]').click();
  assert.equal(await page.locator('.rv-required-progress').isHidden(),true,'complete fields do not repeat a success label');
  assert.equal(await page.locator('[data-draft="distance"]').inputValue(),'5');
  assert.equal(await page.locator('[data-draft="minutes"]').inputValue(),'30');
  assert.equal(await page.locator('[data-manual-gait="RUNNING"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.rv-required-overview').count(),0);
  await geometry(page,width,'S04-filled-run');
  await page.screenshot({path:resolve(output,`${engine}-${width}-S04-run-filled.png`),fullPage:true,animations:'disabled'});
  // Full-page stitched images show fixed navigation at its viewport position.
  // Record the real viewport with the action scrolled into view separately.
  if(width<=800){
    const button=page.locator('.rv-bottom-actions .rv-main-button');
    const originalScroll=await page.evaluate(()=>window.scrollY);
    await button.scrollIntoViewIfNeeded();
    const visible=await page.evaluate(()=>{
      const action=document.querySelector('.rv-bottom-actions .rv-main-button').getBoundingClientRect();
      const nav=document.querySelector('.mobile-nav')?.getBoundingClientRect();
      return {actionTop:action.top,actionBottom:action.bottom,navTop:nav?.top??null,viewport:innerHeight};
    });
    assert.ok(visible.actionTop>=0&&visible.actionBottom<=visible.viewport+2,'confirm button is in viewport '+JSON.stringify(visible));
    assert.ok(visible.navTop===null||visible.actionBottom<=visible.navTop+2,'fixed nav does not cover confirm button '+JSON.stringify(visible));
    await page.screenshot({path:resolve(output,`${engine}-${width}-S04-confirm-viewport.png`),fullPage:false,animations:'disabled'});
    // Restore before testing the next real navigation. Chromium's smooth-scroll
    // repositioning can otherwise keep the subsequent link moving under Playwright.
    await page.evaluate(y=>window.scrollTo({top:y,behavior:'instant'}),originalScroll);
    await page.waitForFunction(y=>Math.abs(window.scrollY-y)<=2,originalScroll);
  }
  // The duplicate S05 activity selector is gone. Preserve S04 activity and run/walk pattern on round-trip.
  await page.locator('a.rv-link[href="#/record-compare"]').click();
  const compare=page.locator('[data-g4-page]');await compare.waitFor();
  assert.equal(await compare.locator('[data-g4-gait]').count(),0);
  assert.equal(await compare.getByText('活動種別（12部位の文献参考値に使用）').count(),0);
  assert.equal(await compare.locator('[data-g4-format]').count(),3);
  assert.equal(await compare.locator('[data-g4-source]').count(),3);
  await page.screenshot({path:resolve(output,`${engine}-${width}-S05-steps-pattern.png`),fullPage:true,animations:'disabled'});
  await compare.locator('[data-g4-format="RUN_WALK"]').click();
  await compare.locator('[data-draft="runWalkRunningDistanceKm"]').fill('2');
  await compare.locator('[data-draft="runWalkRunningDurationMinutes"]').fill('12');
  assert.equal(await compare.locator('[data-g4-runwalk]').isVisible(),true);
  assert.equal(await compare.locator('[data-g4-apply]').isEnabled(),true);
  await page.screenshot({path:resolve(output,`${engine}-${width}-S05-runwalk.png`),fullPage:true,animations:'disabled'});
  await compare.locator('[data-g4-apply]').click();
  await page.locator('.rv-manual').waitFor();
  assert.equal(await page.locator('[data-manual-gait="RUNNING"]').getAttribute('aria-pressed'),'true','Basic activityGait not overwritten');
  assert.equal(await page.locator('[data-draft="distance"]').inputValue(),'5');
  assert.equal(await page.locator('[data-draft="minutes"]').inputValue(),'30');
  await page.locator('a.rv-link[href="#/record-compare"]').click();
  await page.locator('[data-g4-page]').waitFor();
  assert.equal(await page.locator('[data-g4-format="RUN_WALK"]').getAttribute('aria-pressed'),'true','run pattern persists');
  assert.equal(await page.locator('[data-draft="runWalkRunningDistanceKm"]').inputValue(),'2');
  await page.locator('[data-g4-apply]').click();
  await page.locator('.rv-manual').waitFor();
  await page.locator('[data-record-type="rest"]').click();
  assert.equal(await page.locator('.rv-required-progress').count(),0,'rest has no run-only error summary');
  assert.equal(await page.locator('.rv-required-heading').count(),1,'Basic information label remains for date');
  assert.equal(await page.locator('.rv-secondary a.rv-link').count(),2,'rest has two relevant optional links');
  await geometry(page,width,'S04-rest');
  await page.screenshot({path:resolve(output,`${engine}-${width}-S04-rest.png`),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[],'browser runtime errors '+width);
  await context.close();
 }
 await writeFile(resolve(output,`${engine}-metrics.json`),JSON.stringify(report,null,2));
 console.log(`PASS S03 and S04 ${engine} ${report.length} layouts`);
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
