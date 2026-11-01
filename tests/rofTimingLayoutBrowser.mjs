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
  const explanation=panel.locator('.rv4-rail .rv4-description');
  assert.equal(await explanation.count(),1,'explanation is directly below the illustration row');
  assert.equal(await panel.locator('.rv4-aside .rv4-description,.rv4-help').count(),0,'distant and repeated cards removed');
  assert.equal(await panel.locator('.rv4-rights').count(),1,'author and scale credits retained');
  assert.ok(await page.evaluate(()=>{
    const a=document.querySelector('.rv4-anchor-row').getBoundingClientRect();
    const d=document.querySelector('.rv4-rail .rv4-description').getBoundingClientRect();
    const track=document.querySelector('.rv4-axis').getBoundingClientRect();
    return a.bottom<=d.top+3&&d.bottom<=track.top+3;
  }),'image explanation is between image row and numerical slider');
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-illustration-empty-full.png'),animations:'disabled',fullPage:true});
  const slider=panel.locator('[data-rof-v4-range]');
  await slider.evaluate(el=>{el.value='10';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await panel.locator('[data-rof-v4-number]').innerText(),'10');
  const scorePhrase=await panel.locator('[data-rof-v4-meaning]').evaluate(el=>{
    const a=el.querySelector('.rv4-description-main'),b=el.querySelector('.rv4-description-detail'),r=el.getBoundingClientRect();
    const bounds=n=>{const q=n.getBoundingClientRect();return {left:q.left,right:q.right,top:q.top,bottom:q.bottom}};
    return {outer:bounds(el),main:a?.textContent,detail:b?.textContent,mainBounds:a?bounds(a):null,detailBounds:b?bounds(b):null};
  });
  assert.equal(scorePhrase.main,'完全な疲労困憊');
  assert.equal(scorePhrase.detail,'（何も残っていない状態）');
  for(const b of [scorePhrase.mainBounds,scorePhrase.detailBounds])assert.ok(b.left>=scorePhrase.outer.left-1&&b.right<=scorePhrase.outer.right+1,'selected score description fits without midphrase clipping '+JSON.stringify(scorePhrase));
  assert.match(await explanation.innerText(),/完全な疲労困憊/);
  assert.match(await explanation.innerText(),/何も残っていない状態/);
  const level10=await explanation.evaluate(el=>{
    const main=el.querySelector('.rv4-description-main'),detail=el.querySelector('.rv4-description-detail');
    const parent=el.getBoundingClientRect(),m=main.getBoundingClientRect(),d=detail.getBoundingClientRect();
    return {parent:{left:parent.left,right:parent.right},main:{left:m.left,right:m.right,top:m.top,bottom:m.bottom},detail:{left:d.left,right:d.right,top:d.top,bottom:d.bottom},mainText:main.innerText,detailText:detail.innerText};
  });
  assert.equal(level10.mainText,'完全な疲労困憊');
  assert.equal(level10.detailText,'（何も残っていない状態）');
  for(const part of [level10.main,level10.detail])assert.ok(part.left>=level10.parent.left-1&&part.right<=level10.parent.right+1,'no descriptor clipping '+JSON.stringify(level10));
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-illustration-10-full.png'),animations:'disabled',fullPage:true});
  await panel.locator('[data-rof-v4-anchor="1"]').click();
  assert.equal(await panel.locator('[data-rof-v4-number]').innerText(),'10','explanatory anchor does not change the score');
  assert.match(await explanation.innerText(),/少し疲れている/);
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-illustration-mid-full.png'),animations:'disabled',fullPage:true});
  await panel.locator('[data-rof-v4-phase="after"]').click();
  assert.match(await panel.locator('[data-rof-v4-number]').innerText(),/—/,'after entry remains missing independently');
  await slider.evaluate(el=>{el.value='8';el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await panel.locator('[data-rof-v4-number]').innerText(),'8');
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-before10-after8-full.png'),animations:'disabled',fullPage:true});
  await panel.locator('[data-rof-v4-phase="before"]').click();
  assert.equal(await panel.locator('[data-rof-v4-number]').innerText(),'10','before score survives phase switching');
  const opt=panel.locator('.rv4-optional-meta');
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-collapsed.png'),animations:'disabled'});
  await opt.locator(':scope > summary').click();
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
  await page.screenshot({path:resolve(dest,engine+'-'+width+'-full.png'),animations:'disabled',fullPage:true});
  await panel.locator('[data-rof-run-start]').fill('23:55');
  await panel.locator('[data-rof-run-end]').fill('00:15');
  await panel.locator('.rv4-end-day > summary').click();
  await panel.locator('[data-rof-end-day-rule][value="next"]').check();
  const updated=await panel.locator('.rv4-inherited-date').innerText();
  assert.match(updated,/2026\/10\/29/);
  await page.goto(host+'record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="date"]').fill('2026-10-30');
  await page.goto(host+'record-rof',{waitUntil:'networkidle'});
  if(await panel.locator('.rv4-optional-meta').getAttribute('open')===null)
    await panel.locator('.rv4-optional-meta > summary').click();
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
