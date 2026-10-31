import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('invalid path');
  const f=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('missing');}
});
await new Promise(ok=>server.listen(4327,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const dest=resolve(root,'audit-output','rof-date-layout');
await mkdir(dest,{recursive:true});
const result=[];
try{
 for(const width of [320,390,430,1440]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const host='http://127.0.0.1:4327/#/';
  await page.goto(host+'record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="date"]').fill('2026-10-29');
  await page.goto(host+'record-rof',{waitUntil:'networkidle'});
  const panel=page.locator('.rv4-page');await panel.waitFor({state:'visible'});
  const opt=panel.locator('.rv4-optional-meta');
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-collapsed.png'),animations:'disabled'});
  await opt.locator('summary').click();
  assert.equal(await opt.getAttribute('open'),'');
  assert.match(await panel.locator('.rv4-inherited-date').innerText(),/2026\/10\/29/);
  assert.equal(await opt.locator('input[type=date]').count(),0,'no duplicate running date input');
  assert.equal(await opt.locator('input[type=time]').count(),2,'only two voluntary clock inputs');
  const geometry=await page.evaluate(()=>{
   const root=document.querySelector('.rv4-optional-meta');
   const panel=document.querySelector('.rv4-run-times');
   const info=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
   const boxes=[...document.querySelectorAll('.rv4-run-time-card,.rv4-native-time,.rv4-end-day')];
   return {viewport:innerWidth,document:document.documentElement.scrollWidth,option:info(root),panel:info(panel),
     boxes:boxes.map(el=>({selector:el.className,rect:info(el)}))};
  });
  assert.ok(geometry.document<=geometry.viewport+3,'document overflows '+JSON.stringify(geometry));
  for(const {selector,rect} of geometry.boxes){
   assert.ok(rect.left>=geometry.panel.left+1&&rect.right<=geometry.panel.right-1,
    engine+' '+width+' '+selector+' crosses parent panel boundary '+JSON.stringify(geometry));
   assert.ok(rect.top>=geometry.panel.top-1&&rect.bottom<=geometry.panel.bottom+1,selector+' vertical boundary');
  }
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-expanded.png'),animations:'disabled'});
  await panel.locator('[data-rof-run-start]').fill('23:55');
  await panel.locator('[data-rof-run-end]').fill('00:15');
  await panel.locator('[data-rof-end-day-rule][value="next"]').check();
  const updated=await panel.locator('.rv4-inherited-date').innerText();
  assert.match(updated,/2026\/10\/29/);
  await page.goto(host+'record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="date"]').fill('2026-10-30');
  await page.goto(host+'record-rof',{waitUntil:'networkidle'});
  await panel.locator('.rv4-optional-meta summary').click();
  assert.match(await panel.locator('.rv4-inherited-date').innerText(),/2026\/10\/30/);
  assert.equal(await panel.locator('[data-rof-run-start]').inputValue(),'23:55');
  assert.equal(await panel.locator('[data-rof-run-end]').inputValue(),'00:15');
  assert.deepEqual(errors,[],'JS runtime errors');
  result.push({engine,width,layout:geometry,ok:true});
  await context.close();
 }
 await writeFile(resolve(dest,engine+'-layout-report.json'),JSON.stringify(result,null,2));
 console.log('ROF date inheritance and frame-contained inputs PASS '+engine+' 4 viewport sizes');
}finally{await browser.close();await new Promise(done=>server.close(done));}
