/** UIUX04 S12/S13/S14 targeted real-browser acceptance. No fabricated saved run.
 * Notes and life-state remain separate; tests verify cancellation before deletion.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const uri=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+uri);
  if(path!==root&&!path.startsWith(root+sep))throw Error('invalid');
  const real=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',types[extname(real)]||'application/octet-stream');res.end(await readFile(real));
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(ok=>server.listen(4260,'127.0.0.1',ok));
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const out=resolve(root,'audit-output','uiux04-'+engine);await mkdir(out,{recursive:true});
const results=[],base='http://127.0.0.1:4260/#/';
async function capture(page,width,state,{full=false}={}){
 const info=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,errors:[]}));
 assert.ok(info.document<=info.viewport+3,state+' horizontal overflow '+JSON.stringify(info));
 const name=engine+'-'+width+'-'+state+'.png';
 await page.screenshot({path:resolve(out,name),fullPage:full,animations:'disabled'});
 results.push({state,width,file:name,...info});
}
const data=()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]');
try{
 for(const width of [320,390,1440]){
  const mobile=width<800;
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',
   userAgent:mobile?(engine==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'):undefined});
  await context.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
   const dateOffset=n=>{const d=new Date();d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
   localStorage.setItem('runload-v2-life-condition-v1',JSON.stringify([
    {date:dateOffset(-2),sleepMinutes:360,sleepSource:'duration',feeling:'ふつう',memo:'昨日より前の本人メモ'},
    {date:dateOffset(-1),sleepMinutes:480,sleepSource:'duration',feeling:'良い',memo:'本人が良いと記録'}
   ]));
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'exploration-tree',{waitUntil:'networkidle'});
  const ex=page.locator('[data-experience-v3]');await ex.waitFor();
  // S12: learn-by-theme selection remains focusable even after the whole card is rebuilt.
  await ex.locator('[data-ex-category="03"]').click();
  const slope=ex.locator('[data-ex-topic="上り坂・下り坂"]');
  await slope.click();
  assert.equal(await slope.evaluate(el=>el===document.activeElement),true,'topic remains focused after rebuild');
  assert.equal(await ex.locator('[data-ex-learning="slope-running"]').count(),1);
  assert.match(await ex.locator('.ex-learning-lead').innerText(),/\S/);
  await capture(page,width,'S12-sourced-lesson',{full:true});
  await ex.locator('[data-ex-category="06"]').click();
  const guide=ex.locator('[data-ex-topic="ウォームアップ"]');await guide.click();
  assert.equal(await guide.evaluate(el=>el===document.activeElement),true,'draft observation guide remains focused');
  const editorial=ex.locator('.ex-observation-guide');await editorial.waitFor();
  assert.match(await editorial.innerText(),/観察|記録|考え/);
  await capture(page,width,'S12-observation-guide',{full:true});
  // S13: save two voluntary notes, confirm explicit target and test no destructive first click.
  await ex.locator('[data-ex-action="note"]').click();
  await ex.locator('#ex-note').fill('次は走る前に何を確かめたいか書く');
  await ex.locator('[data-ex-action="save-note"]').click();
  assert.equal((await page.evaluate(data)).length,1);
  await ex.locator('[data-ex-action="note"]').click();
  await ex.locator('#ex-note').fill('消してもよい確認用の二件目');
  await ex.locator('[data-ex-action="save-note"]').click();
  assert.equal((await page.evaluate(data)).length,2);
  await ex.locator('[data-ex-action="memories"]').click();
  await capture(page,width,'S13-two-saved-notes');
  const firstDelete=ex.locator('[data-ex-delete]').first();
  await firstDelete.click();
  assert.equal(await page.evaluate(data).then(a=>a.length),2,'opening delete confirmation is non-destructive');
  assert.match(await ex.locator('.ex-delete-confirm').innerText(),/消してもよい確認用の二件目/);
  await capture(page,width,'S13-delete-confirm');
  await ex.locator('[data-ex-action="cancel-delete-note"]').click();
  assert.equal(await page.evaluate(data).then(a=>a.length),2,'cancellation preserves both notes');
  await ex.locator('[data-ex-delete]').first().click();
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(data).then(a=>a.length),2,'Escape preserves both notes');
  await ex.locator('[data-ex-delete]').first().click();
  await ex.locator('[data-ex-action="confirm-delete-note"]').click();
  const notes=await page.evaluate(data);
  assert.equal(notes.length,1,'confirmation removes exactly one note');
  assert.equal(notes[0].text,'次は走る前に何を確かめたいか書く','surviving note is unchanged');
  await capture(page,width,'S13-after-exact-delete');
  // The edit action must preserve the stable ID.
  const preservedId=notes[0].id;
  await ex.locator('[data-ex-edit]').first().click();
  await ex.locator('#ex-note-edit').fill('次は走る前後の疲労感を別々に確かめたい');
  await ex.locator('[data-ex-action="save-edited-note"]').click();
  const edited=await page.evaluate(data);
  assert.equal(edited.length,1);assert.equal(edited[0].id,preservedId);
  assert.equal(edited[0].revisions.at(-1).text,'次は走る前に何を確かめたいか書く');
  await capture(page,width,'S13-edited-note');
  // S14: actual saved life data, different day, method and 90-day range with keyboard focus.
  await page.goto(base+'condition',{waitUntil:'networkidle'});
  const panel=page.locator('[data-condition-journey]');await panel.waitFor();
  assert.equal(await panel.locator('[data-cj-day]:not([disabled])').count(),2);
  await capture(page,width,'S14-two-day-records',{full:true});
  const day=panel.locator('[data-cj-day]:not([disabled])').first(),date=await day.getAttribute('data-cj-day');
  await day.click();
  assert.equal(await panel.locator('[data-cj-day="'+date+'"]').evaluate(el=>el===document.activeElement),true,'chart date retains focus after redraw');
  assert.match(await panel.locator('.cj-day-memo').innerText(),/本人メモ/);
  await capture(page,width,'S14-selected-day');
  await panel.locator('[data-cj-range="90"]').click();
  assert.equal(await panel.locator('[data-cj-day]').count(),90);
  assert.equal(await panel.locator('[data-cj-range="90"]').evaluate(el=>el===document.activeElement),true,'chart range retains focus after redraw');
  await capture(page,width,'S14-long-period',{full:true});
  await panel.locator('[data-cj-method]').selectOption('time-in-bed');
  assert.equal(await panel.locator('[data-cj-method]').evaluate(el=>el===document.activeElement),true,'method retains focus');
  assert.equal(await panel.locator('[data-cj-day]:not([disabled])').count(),0,'different source does not silently mix methods');
  await capture(page,width,'S14-other-method-empty',{full:true});
  await panel.locator('[data-cj-method]').selectOption('self-reported');
  assert.equal(await panel.locator('[data-cj-day]:not([disabled])').count(),2);
  await capture(page,width,'S14-self-reported',{full:true});
  assert.deepEqual(errors,[],'no browser page errors');
  await context.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',engine,scope:'S12-S14 browser acceptance, not physical device or research impact',reports:results},null,2));
 console.log('PASS UIUX04 '+engine+' '+results.length+' actual screenshots');
}finally{await browser.close();await new Promise(done=>server.close(done));}
