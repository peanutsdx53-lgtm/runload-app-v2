import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),p=resolve(root,'.'+name);
 if(p!==root&&!p.startsWith(root+sep))throw Error('traversal');
 const path=p===root?resolve(root,'index.html'):p;
 res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));
}catch{res.statusCode=404;res.end('not found');}});
await new Promise(ok=>server.listen(4373,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','review-density');await mkdir(out,{recursive:true});
const base='http://127.0.0.1:4373/#/',report=[];
async function take(page,width,label){
 const state=await page.evaluate(()=>{
  const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
  const statuses=document.querySelector('.rr-required-status');
  const metrics=document.querySelector('.rr-metrics');
  return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
    status:rect(statuses),metrics:rect(metrics),badges:document.querySelectorAll('[data-required-status]').length,
    reviewIcons:document.querySelectorAll('.rr-row-icon svg').length,
    optionalIcons:document.querySelectorAll('.rv-link-icon svg').length,
    saveDisabled:document.querySelector('.rr-save')?.disabled,
    successCard:document.body.textContent.includes('入力内容を確認しました')};
 });
 assert.ok(state.documentWidth<=state.viewport+2&&state.bodyWidth<=state.viewport+2,'horizontal overflow: '+JSON.stringify(state));
 if(state.status&&state.metrics)assert.ok(state.metrics.top-state.status.bottom>=16,'status-to-distance spacing too short '+JSON.stringify(state));
 report.push({engine,width,state:label,...state});
 await page.screenshot({path:resolve(out,engine+'-'+width+'-'+label+'.png'),fullPage:true,animations:'disabled',timeout:15000});
}
try{
 for(const width of [320,390,430,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},locale:'ja-JP',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),exceptions=[];page.on('pageerror',e=>exceptions.push(e.message));
  await page.goto(base+'record',{waitUntil:'networkidle'});
  await page.locator('.rv-manual').waitFor({timeout:14000});
  assert.equal(await page.locator('.rv-link-icon svg').count(),5,'manual optional icons use SVG');
  const manualIcons=await page.locator('.rv-link-icon svg').evaluateAll(els=>els.map(e=>e.outerHTML));
  await take(page,width,'MANUAL-empty-icons');
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.equal(await page.locator('[data-required-status]').count(),3);
  assert.match(await page.locator('.rr-alert').innerText(),/保存前に入力が必要な項目があります/);
  assert.equal(await page.locator('.rr-save').isDisabled(),true,'incomplete record cannot save');
  assert.equal(await page.locator('.rr-save').getAttribute('aria-describedby'),'rr-review-validation');
  assert.equal(await page.locator('#rr-review-validation').count(),1,'single warning with complete reasons');
  assert.equal(await page.locator('.rr-save-required-warning').count(),0,'do not repeat footer warning');
  const statusChips=await page.locator('[data-required-status]').evaluateAll(els=>els.map(e=>({
    childTags:[...e.children].map(c=>c.tagName),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,
    label:e.getAttribute('aria-label'),height:e.getBoundingClientRect().height
  })));
  assert.ok(statusChips.every(c=>c.clientWidth+2>=c.scrollWidth&&c.childTags.join(',')==='B,EM'&&c.height>=48),'labels remain legible without forced wrapping '+JSON.stringify(statusChips));
  await take(page,width,'REVIEW-required-incomplete');
  await page.locator('.rr-back').click();
  await page.locator('.rv-manual').waitFor();
  await page.locator('[data-draft="distance"]').fill('6');
  await page.locator('[data-draft="minutes"]').fill('42');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  assert.equal(await page.locator('.rv-link-icon svg').count(),5);
  await take(page,width,'MANUAL-populated-icons');
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.equal(await page.locator('[data-required-status]').count(),3);
  assert.equal(await page.locator('.rr-alert').count(),0,'successful record has no repeated informational alert');
  assert.equal(await page.locator('.rr-row-icon svg').count(),5,'review icons have SVG');
  assert.equal(await page.locator('.rr-save').isEnabled(),true);
  assert.equal(await page.getByText('入力内容を確認しました').count(),0);
  const icons=await page.locator('.rr-row-icon svg').evaluateAll(els=>els.map(e=>e.outerHTML));
  assert.deepEqual(icons,manualIcons,'manual and review use the exact same icons');
  assert.equal(await page.locator('[data-required-ok="true"]').count(),3);
  assert.equal(await page.locator('#rr-review-validation,.rr-save-required-warning').count(),0,'valid review has no redundant warnings');
  assert.equal(await page.locator('[data-required-status] b').count(),3);
  assert.equal(await page.locator('[data-required-status] em').count(),3);
  await take(page,width,'REVIEW-valid-six-km');
  assert.deepEqual(exceptions,[],'browser errors '+width);
  await ctx.close();
 }
 await writeFile(resolve(out,engine+'-report.json'),JSON.stringify(report,null,2));
 console.log('S09 PASS '+engine+' '+report.length+' captures');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
