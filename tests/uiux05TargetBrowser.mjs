/** UIUX05 S15–S17: read-only sharing, destructive-action gates, GPS smartphone gating. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{const uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=resolve(root,'.'+uri);
  if(file!==root&&!file.startsWith(root+sep))throw Error('outside');
  const target=file===root?resolve(root,'index.html'):file;
  res.setHeader('Content-Type',types[extname(target)]||'application/octet-stream');res.end(await readFile(target));
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(ok=>server.listen(4270,'127.0.0.1',ok));
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const out=resolve(root,'audit-output','uiux05-'+engine);await mkdir(out,{recursive:true});
const report=[],base='http://127.0.0.1:4270/#/';
async function capture(page,width,stage,full=false){
 const val=await page.evaluate(()=>({viewport:innerWidth,body:document.documentElement.scrollWidth}));
 assert.ok(val.body<=val.viewport+3,stage+' overflow '+JSON.stringify(val));
 const file=engine+'-'+width+'-'+stage+'.png';
 await page.screenshot({path:resolve(out,file),fullPage:full,animations:'disabled'});
 report.push({width,stage,file,sha:process.env.GITHUB_SHA||''});
}
try{
 for(const width of [320,390,1440]){
  const mobile=width<800;
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce',userAgent:mobile?
   (engine==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'):undefined});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // S15: selected mode and screen switches are communicated to assistive technology.
  await page.goto(base+'consultation',{waitUntil:'networkidle'});
  const c=page.locator('#runload-consultation');await c.waitFor();
  assert.equal(await c.locator('[data-mode-button="single"]').getAttribute('aria-pressed'),'true');
  assert.equal(await c.locator('[data-mode-button="period"]').getAttribute('aria-pressed'),'false');
  await c.locator('[data-mode-button="period"]').click();
  assert.equal(await c.locator('[data-mode-button="period"]').getAttribute('aria-pressed'),'true');
  assert.equal(await c.locator('[data-mode-button="single"]').getAttribute('aria-pressed'),'false');
  assert.match(await c.locator('.cp-sensitive').innerText(),/GPS詳細軌跡・個人プロフィール/);
  await capture(page,width,'S15-sharing-scope',false);
  if(mobile){
   await c.locator('[data-switch="preview"]').click();
   assert.equal(await c.locator('[data-switch="preview"]').getAttribute('aria-pressed'),'true');
   assert.equal(await c.locator('[data-switch="edit"]').getAttribute('aria-pressed'),'false');
   await capture(page,width,'S15-preview',false);
   await c.locator('[data-switch="edit"]').click();
   assert.equal(await c.locator('[data-switch="edit"]').getAttribute('aria-pressed'),'true');
  }
  // S16: backup never silently encrypts or shares personal data; destructive gate needs two inputs.
  await page.goto(base+'settings',{waitUntil:'networkidle'});
  const settings=page.locator('[data-settings-v2]');await settings.waitFor();
  const deletion=settings.locator('.s2-item').filter({hasText:'データの削除'});
  await deletion.locator('summary').click();
  const d=deletion.locator('[data-dm-delete]');
  await d.waitFor();
  assert.match(await d.locator('#dm-delete-rule').innerText(),/両方そろうまで削除ボタンは使えません/);
  const button=d.locator('[data-dm-delete-confirm]');
  assert.equal(await button.getAttribute('aria-describedby'),'dm-delete-rule');
  assert.equal(await button.isDisabled(),true,'initial destructive action locked');
  await d.locator('[data-dm-delete-word]').fill('削除');
  assert.equal(await button.isDisabled(),true,'typing alone cannot delete');
  await d.locator('[data-dm-delete-word]').fill('');
  await d.locator('[data-dm-delete-agree]').check();
  assert.equal(await button.isDisabled(),true,'checking alone cannot delete');
  await capture(page,width,'S16-deletion-guard',false);
  await d.locator('[data-dm-delete-word]').fill('削除');
  assert.equal(await button.isEnabled(),true,'both deliberate conditions are required');
  await d.locator('[data-dm-delete-word]').fill('取り消す');
  assert.equal(await button.isDisabled(),true,'changing phrase disarms operation');
  // Never click a destructive action in a visual test.
  const backup=settings.locator('.s2-item').filter({hasText:'バックアップ・復元'});await backup.locator('summary').click();
  assert.match(await backup.locator('.dm-warning').first().innerText(),/暗号化されません/);
  assert.equal(await backup.locator('[data-dm-restore]').count(),0,'restore not offered before validating a file');
  await capture(page,width,'S16-backup-risk',false);
  // S17: desktop route cannot start GPS; smartphone shows one current phase, optional ROF-J.
  await page.goto(base+'record-start',{waitUntil:'networkidle'});
  if(mobile){
   await page.goto(base+'measurement',{waitUntil:'networkidle'});
   const gps=page.locator('[data-measurement-v2]');await gps.waitFor();
   assert.equal(await gps.locator('.gps-live-steps [aria-current="step"]').count(),1);
   assert.match(await gps.locator('.gps-live-steps [aria-current="step"]').innerText(),/01\s*準備/);
   assert.equal(await gps.locator('.gps-live-prep [data-gps-rof-entry="before"]').count(),1);
   assert.equal(await gps.locator('.gps-live-prep [data-gps-action="start"]').count(),1);
   // Do not start geolocation or accept a GPS permission dialog in this test.
   await capture(page,width,'S17-smartphone-preparation',true);
  }else{
   await page.goto(base+'measurement',{waitUntil:'networkidle'});
   assert.equal(await page.locator('[data-measurement-v2]').count(),0);
   assert.match(await page.locator('.gps-platform-unavailable').innerText(),/スマートフォン専用/);
   assert.equal(await page.locator('[data-gps-action="start"]').count(),0);
   await capture(page,width,'S17-desktop-unavailable',false);
  }
  assert.deepEqual(errors,[],'runtime errors');
  await context.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',engine,report,scope:'desktop and emulated smartphone browsers, not actual geolocation or device PASS'},null,2));
 console.log('PASS UIUX05 '+engine+' '+report.length+' visual states');
}finally{await browser.close();await new Promise(done=>server.close(done));}
