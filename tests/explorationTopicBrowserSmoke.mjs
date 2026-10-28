/** Browser-level editorial-stage smoke: screenshots, saved context, offline guide and note, 320/390/1440. */
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');const file=path===root?resolve(root,'index.html'):path;res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));}
 catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4196,'127.0.0.1',done));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true});
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:850},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const prefix=`exploration-theme-${engine===webkit?'webkit':'chromium'}-${width}`;
  await page.goto('http://127.0.0.1:4196/#/exploration-tree?category=06&topic='+encodeURIComponent('ウォームアップ'),{waitUntil:'domcontentloaded'});
  await page.locator('.ex-observation-guide').waitFor();
  const guide=await page.locator('.ex-observation-guide').innerText();
  assert.match(guide,/観察ガイド/);assert.match(guide,/専門解説は出典審査前/);
  assert.match(guide,/この情報からは言えないこと/);assert.match(guide,/次に確かめたいこと/);
  const dimensions=await page.evaluate(()=>({body:document.body.scrollWidth,html:document.documentElement.scrollWidth,inner:innerWidth,panels:[...document.querySelectorAll('.ex-guide-grid section')].map(el=>({w:el.getBoundingClientRect().width,scroll:el.scrollWidth}))}));
  assert.ok(dimensions.body<=width+2&&dimensions.html<=width+2,'page has no horizontal overflow: '+JSON.stringify(dimensions));
  for(const cell of dimensions.panels)assert.ok(cell.scroll<=cell.w+2&&cell.w>140,'card content fits: '+JSON.stringify(cell));
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-observation-guide.png'),fullPage:true});
  await page.locator('.ex-learning [data-ex-action="learn-help"]').click();
  await page.locator('.ex-dialog').waitFor();
  assert.match(await page.locator('.ex-dialog').innerText(),/科学的な解説としての出典審査はまだ完了していません/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-source-status.png'),fullPage:true});
  await page.locator('.ex-dialog [data-ex-action="close"]').click();
  if(width===390){
   for(const entry of [
    {category:'02',topic:'12部位の参考値の見方',expected:'測定量・適用条件は部位ごとに異なります'},
    {category:'01',topic:'自分が感じた疲れ',expected:'本人が回答した疲労感の読み方'},
    {category:'02',topic:'足・膝・股関節',expected:'習慣的に走る28人'},
    {category:'03',topic:'上り坂・下り坂',expected:'成人19人'},
    {category:'01',topic:'過去の走りとの比較',expected:'質的に調べました'},
    {category:'01',topic:'気付きと次の確認',expected:'中断・再開'},
    {category:'07',topic:'自分に合う記録の使い方',expected:'中断・再開'},
    {category:'05',topic:'睡眠',expected:'専門家コンセンサス'}
   ]){
    await page.goto('http://127.0.0.1:4196/#/exploration-tree?category='+entry.category+'&topic='+encodeURIComponent(entry.topic),{waitUntil:'domcontentloaded'});
    await page.locator('.ex-learning [data-ex-action="learn-help"]').click();
    await page.locator('.ex-dialog').waitFor();
    const help=await page.locator('.ex-dialog').innerText();
    assert.ok(help.includes(entry.expected),entry.topic+' accurate provenance');
    if(entry.topic==='上り坂・下り坂')assert.match(help,/傾斜角0・±5・±10度/);
    if(!['12部位の参考値の見方','自分が感じた疲れ'].includes(entry.topic))assert.match(help,/研究の対象・使える範囲/);
    assert.doesNotMatch(help,/このテーマは距離と経過時間による算術上の定義を説明します/);
    await page.screenshot({path:resolve(root,'screenshots',prefix+'-source-'+entry.category+'.png'),fullPage:true});
   }
   await page.goto('http://127.0.0.1:4196/#/exploration-tree?category=06&topic='+encodeURIComponent('ウォームアップ'),{waitUntil:'domcontentloaded'});
   await page.locator('.ex-observation-guide').waitFor();
  }
  await page.locator('.ex-learning [data-ex-action="note"]').click();
  await page.locator('#ex-note').fill('次は走る前の気持ちを記録する');
  await page.locator('.ex-dialog [data-ex-action="save-note"]').click();
  const record=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')));
  assert.equal(record.length,1);assert.equal(record[0].topicId,'practice-warmup');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.ex-note-preview').waitFor();
  assert.match(await page.locator('.ex-note-preview').innerText(),/次は走る前の気持ちを記録する/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-saved-guide.png'),fullPage:true});
  if(engine===chromium&&width===390){
   // HTTP loopback QA registers the worker explicitly (the live app uses HTTPS).
   await page.evaluate(async()=>{
    await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    await navigator.serviceWorker.ready;
   });
   await page.waitForTimeout(200);
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('.ex-observation-guide').waitFor();
   assert.match(await page.locator('.ex-observation-guide').innerText(),/観察ガイド/);
   assert.match(await page.locator('.ex-note-preview').innerText(),/次は走る前の気持ちを記録する/);
   await page.screenshot({path:resolve(root,'screenshots',prefix+'-offline-guide.png'),fullPage:true});
  }
  assert.deepEqual(errors,[],prefix+' browser errors');
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
console.log('Exploration editorial browser smoke PASSED');
