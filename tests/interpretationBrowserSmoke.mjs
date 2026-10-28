/** Research interpretation: browser-level record -> result -> comparison -> knowledge -> record -> optional note -> offline.
 * Synthetic test records exist only in an isolated ephemeral browser profile.
 */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const path=resolve(root,'.'+name);if(path!==root&&!path.startsWith(root+sep))throw Error('path');const file=path===root?resolve(root,'index.html'):path;res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
 catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4194,'127.0.0.1',done));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const base='http://127.0.0.1:4194/';
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 for(const mode of [{name:'320',width:320,height:740},{name:'390',width:390,height:844},{name:'1440',width:1440,height:900}]){
  const context=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  await page.locator('.app-shell').waitFor({timeout:20000});
  const saved=await page.evaluate(async()=>{
   const m=await import('./ui/manualRunStore.js');
   const draft={date:'2026-10-18',distance:'5',hours:'',minutes:'33',seconds:'',rofBefore:0,rofAfter:6,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:'最初の日はゆっくり走った',courseName:'川沿い',shoeName:'練習用'};
   const a=m.saveManualRun(localStorage,draft);
   const b=m.saveManualRun(localStorage,{...draft,date:'2026-10-25',distance:'5.5',minutes:'32',rofBefore:2,rofAfter:5,memo:'今回の気づきを整理した'});
   const c=m.saveManualRun(localStorage,{...draft,date:'2026-10-26',distance:'4',minutes:'44',activityGait:'WALK',rofBefore:0,rofAfter:null,memo:'異なる活動種別'});
   if(!a.ok||!b.ok||!c.ok)throw Error(JSON.stringify({a,b,c}));
   return {earlier:a.record.id,current:b.record.id,otherGait:c.record.id};
  });
  const prefix=`interpretation-${engine===chromium?'chromium':'webkit'}-${mode.name}`;
  await page.goto(base+'#/result?record='+encodeURIComponent(saved.current),{waitUntil:'domcontentloaded'});
  await page.locator('.rv4-body .rv4-reading').waitFor();
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-result-body.png'),fullPage:true});
  const resultText=await page.locator('.rv4-app').innerText();
  assert.match(resultText,/本人の身体を測定した数値ではありません/);
  assert.match(resultText,/記録を理解する順番/);
  if(mode.width<=800)await page.locator('[data-tab="radar"]').click();
  const compareView=page.locator(mode.width<=375?'.rv4-compare-cards':'.rv4-comparison-table');
  await compareView.waitFor();
  const comparison=await compareView.innerText();
  assert.match(comparison,/2026-10-18/);assert.match(comparison,/2026-10-25/);assert.match(comparison,/未回答|運動前に感じた疲れ/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-result-compare.png'),fullPage:true});
  await page.locator('[data-compare-select]').selectOption(saved.otherGait);
  await page.locator('.rv4-comparison-empty').waitFor();
  assert.match(await page.locator('.rv4-comparison-empty').innerText(),/活動種別/);
  assert.equal(await page.locator('.rv4-comparison-table').count(),0,'incompatible gait hides comparison');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-incompatible.png'),fullPage:true});
  await page.locator('[data-compare-select]').selectOption(saved.earlier);
  await compareView.waitFor();
  await page.locator('.rv4-comparison-actions .rv4-learn-link').click();
  await page.locator('.ex-record-return').waitFor();
  assert.match(await page.locator('.ex-record-return').innerText(),/2026-10-25/);
  assert.match(await page.locator('.ex-learning').innerText(),/違いを見つけて/);
  assert.ok(page.url().includes(encodeURIComponent(saved.current)),'focused run ID survives route');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-exploration-linked.png'),fullPage:true});
  await page.locator('[data-ex-action="note"]').click();
  await page.locator('#ex-note').fill('次の走行でも前後の疲れを見比べたい');
  await page.locator('[data-ex-action="save-note"]').click();
  const note=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')));
  assert.equal(note.length,1);assert.equal(note[0].text,'次の走行でも前後の疲れを見比べたい');
  await page.locator('.ex-record-return a').click();
  assert.ok(page.url().includes('record='+encodeURIComponent(saved.current)),'return to exact run');
  await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
  assert.match(await page.locator('.hx-discovery-note').innerText(),/次の走行でも/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-home-reflection.png'),fullPage:true});
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.width+2,'no horizontal overflow '+JSON.stringify(size));
  // Offline begins after install; no external URLs or GPS are exercised here.
  if(engine===chromium&&mode.name==='390'){
   await page.evaluate(()=>navigator.serviceWorker.ready);
   await page.waitForTimeout(250);
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('.app-shell').waitFor({timeout:10000});
   await page.goto(base+'#/exploration-tree',{waitUntil:'domcontentloaded'});
   await page.locator('.ex-page').waitFor();
   assert.match(await page.locator('.ex-header-memo').innerText(),/1/);
   await page.goto(base+'#/result?record='+encodeURIComponent(saved.current),{waitUntil:'domcontentloaded'});
   await page.locator('.rv4-reading-route').waitFor();
   await page.screenshot({path:resolve(root,'screenshots',prefix+'-offline-result.png'),fullPage:true});
   // The agreed offline scope covers internal screens and their source modules;
   // GPS measurement and external research URLs are intentionally excluded.
   for(const route of ['#/record-start','#/record','#/history','#/condition','#/settings','#/consultation','#/simulation','#/course','#/exploration-tree']){
    await page.goto(base+route,{waitUntil:'domcontentloaded'});
    await page.locator('.app-shell').waitFor();
    assert.ok((await page.locator('.main-frame').innerText()).trim().length>25,'offline route has content: '+route);
   }
   await page.goto(base+'#/home',{waitUntil:'domcontentloaded'});
   assert.match(await page.locator('.hx-discovery-note').innerText(),/次の走行でも/);
  }
  assert.deepEqual(errors,[],`browser errors ${mode.name}`);
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
console.log('Research interpretation browser smoke PASSED');
