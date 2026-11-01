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
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');
  const f=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');
  res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(4328,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const output=resolve(root,'audit-output','s02-home-guide');
await mkdir(output,{recursive:true});
const host='http://127.0.0.1:4328/#/';
const reports=[];
try{
 for(const width of [320,390,768,1440]){
  const height=width===1440?900:844;
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',locale:'ja-JP'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host+'home',{waitUntil:'networkidle'});
  await page.locator('.home-v3').waitFor();
  const toggle=page.locator('[data-home-guide-toggle]'),guide=page.locator('#home-screen-guide');
  assert.equal(await toggle.count(),1);
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  assert.equal(await guide.isHidden(),true);
  assert.equal(await page.locator('[data-home-preview]').count(),0);
  // Header is one visual group: same height/type scale, no clipping even at 320px.
  const headerMetrics=await page.evaluate(()=>{
   const h=document.querySelector('.home-v3 .home-head'),help=h.querySelector('[data-home-guide-toggle]'),edit=h.querySelector('[data-home-edit]'),actions=h.querySelector('.home-heading-actions');
   const box=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,font:parseFloat(getComputedStyle(e).fontSize)}};
   return {viewport:innerWidth,document:document.documentElement.scrollWidth,header:box(h),actions:box(actions),help:box(help),edit:box(edit)};
  });
  assert.ok(headerMetrics.help.height>=43.5&&headerMetrics.edit.height>=43.5,'both 44px touch targets '+JSON.stringify(headerMetrics));
  assert.ok(Math.abs(headerMetrics.help.height-headerMetrics.edit.height)<=1,'header button heights align '+JSON.stringify(headerMetrics));
  assert.ok(Math.abs(headerMetrics.help.font-headerMetrics.edit.font)<0.5,'header button text sizes align '+JSON.stringify(headerMetrics));
  assert.ok(headerMetrics.help.right<=headerMetrics.edit.left+1,'header controls do not overlap '+JSON.stringify(headerMetrics));
  assert.ok(headerMetrics.actions.right<=headerMetrics.viewport+1&&headerMetrics.header.left>=-1,'header contained in viewport '+JSON.stringify(headerMetrics));
  assert.ok(headerMetrics.document<=headerMetrics.viewport+2,'document not horizontally overflowing '+JSON.stringify(headerMetrics));
  await page.locator('[data-home-edit]').click();
  const editHeader=await page.evaluate(()=>{const h=document.querySelector('.home-v3 .home-head'),e=h.querySelector('[data-home-edit]'),help=h.querySelector('[data-home-guide-toggle]');return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,editRight:e.getBoundingClientRect().right,helpRight:help.getBoundingClientRect().right,editLeft:e.getBoundingClientRect().left};});
  assert.ok(editHeader.scroll<=editHeader.viewport+2&&editHeader.editRight<=editHeader.viewport+1,'editing state stays inside viewport '+JSON.stringify(editHeader));
  assert.ok(editHeader.helpRight<=editHeader.editLeft+1,'editing state controls do not overlap '+JSON.stringify(editHeader));
  await page.screenshot({path:resolve(output,engine+'-'+width+'-editing.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-home-edit]').click();
  const before=await page.evaluate(()=>localStorage.getItem('runload-v2-home-dashboard-layout-v1'));
  await page.screenshot({path:resolve(output,engine+'-'+width+'-closed.png'),fullPage:true,animations:'disabled'});
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await guide.waitFor({state:'visible'});
  assert.equal(await guide.locator('li').count(),3);
  assert.equal(await page.locator('#home-screen-guide-title').evaluate(e=>document.activeElement===e),true);
  const m=await page.evaluate(()=>{
   const g=document.querySelector('#home-screen-guide'),gr=g.getBoundingClientRect();
   const li=[...g.querySelectorAll('li')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
   const parts=[g.querySelector('.hx-guide-bar'),g.querySelector('.hx-guide-close'),...g.querySelectorAll('li'),g.querySelector('.hx-guide-note')];
   const escaped=parts.filter(e=>{const r=e.getBoundingClientRect();return r.left<gr.left-2||r.right>gr.right+2}).map(e=>e.className||e.tagName);
   return {viewport:innerWidth,document:document.documentElement.scrollWidth,li,escaped};
  });
  assert.ok(m.document<=m.viewport+2,'horizontal overflow '+JSON.stringify(m));
  assert.deepEqual(m.escaped,[],'guide contained '+JSON.stringify(m));
  if(width>800)assert.ok(m.li[0].right<=m.li[1].left+2&&m.li[1].right<=m.li[2].left+2,'PC horizontal order');
  else assert.ok(m.li[0].bottom<=m.li[1].top+2&&m.li[1].bottom<=m.li[2].top+2,'mobile vertical order');
  await page.screenshot({path:resolve(output,engine+'-'+width+'-open.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-home-guide-close]').click();
  assert.equal(await guide.isHidden(),true);
  assert.equal(await toggle.evaluate(e=>document.activeElement===e),true,'focus restore');
  assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-home-dashboard-layout-v1')),before,'user widget layout unchanged');
  await toggle.press('Enter');
  assert.equal(await guide.isVisible(),true);
  await page.evaluate(()=>{location.hash='#/record-start'});
  await page.locator('.home-v3').waitFor({state:'detached'});
  await page.evaluate(()=>{location.hash='#/home'});
  await page.locator('.home-v3').waitFor();
  assert.equal(await page.locator('#home-screen-guide').isHidden(),true,'no automatic reopening');
  assert.deepEqual(errors,[],'browser errors');
  reports.push({engine,width,pass:true,metrics:m});
  await ctx.close();
 }
 await writeFile(resolve(output,engine+'-acceptance.json'),JSON.stringify(reports,null,2));
 console.log('PASS S02 '+engine+': '+reports.length+' viewports');
}finally{await browser.close();server.close();}
