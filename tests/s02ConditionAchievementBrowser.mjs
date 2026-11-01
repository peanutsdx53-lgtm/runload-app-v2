import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('invalid path');
  const f=path===root?resolve(root,'index.html'):path;res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(4331,'127.0.0.1',ok));
const name=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','s02-condition-achievements');await mkdir(out,{recursive:true});
const findings=[];
const path='http://127.0.0.1:4331/#/home';
async function inspect(page,width,state){
 const measure=await page.evaluate(()=>{
  const ids=['condition','topics'],r=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
  return {document:document.documentElement.scrollWidth,viewport:innerWidth,
   cards:ids.map(id=>{const e=document.querySelector('[data-home-dashboard-id="'+id+'"] .hx-card');return {id,rect:r(e),children:[...e.querySelectorAll('.hx-condition-stats>div,.hx-condition-empty,.hx-ach-main,.hx-awards,.hx-award-item,.hx-award-copy,.hx-ach-source,.hx-title-button')].map(node=>({cls:node.className,rect:r(node),scroll:node.scrollWidth,client:node.clientWidth}))}})}
 });
 assert.ok(measure.document<=measure.viewport+2,name+' '+width+' '+state+' horizontal document overflow '+JSON.stringify(measure));
 for(const card of measure.cards){
  for(const child of card.children){
   assert.ok(child.rect.left>=card.rect.left-2&&child.rect.right<=card.rect.right+2,name+' '+width+' '+state+' '+child.cls+' card-edge overflow '+JSON.stringify(measure));
  }
 }
 const ach=page.locator('[data-home-dashboard-id="topics"]');
 assert.equal(await ach.locator('.hx-award-item').count(),4,'all four achievements named');
 for(const title of ['初回の走行','30分以上','累計50 km','累計100 km'])assert.match(await ach.innerText(),new RegExp(title));
 const cond=page.locator('[data-home-dashboard-id="condition"]');
 assert.ok(await cond.locator('.hx-title-button').evaluate(el=>el.getBoundingClientRect().height>=43.5));
 assert.ok(await ach.locator('.hx-title-button').evaluate(el=>el.getBoundingClientRect().height>=43.5));
 findings.push({engine:name,width,state,measure});
}
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',locale:'ja-JP'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(path,{waitUntil:'networkidle'});await page.locator('[data-home-dashboard-id="topics"]').waitFor();
  await inspect(page,width,'empty');
  assert.match(await page.locator('[data-home-dashboard-id="condition"]').innerText(),/直近7日の記録はまだありません/);
  assert.equal(await page.locator('.hx-award-item.won').count(),0);
  await page.screenshot({path:resolve(out,name+'-'+width+'-empty.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-condition-open]').click();
  await page.locator('.hx-dialog').waitFor();await page.screenshot({path:resolve(out,name+'-'+width+'-condition-dialog.png'),animations:'disabled'});
  await page.locator('.hx-dialog [data-home-close]').first().click();
  await page.locator('[data-achievement-open]').click();
  await page.locator('.hx-ach-dialog').waitFor();await page.screenshot({path:resolve(out,name+'-'+width+'-achievement-dialog.png'),animations:'disabled'});
  await page.locator('.hx-ach-dialog [data-home-close]').first().click();
  const data=await page.evaluate(async()=>{
    const [m,c,h]=await Promise.all([import('./ui/manualRunStore.js'),import('./ui/manualRunCanonical.js'),import('./ui/homeExperience.js')]);
    const date=h.todayLocal();localStorage.setItem(h.CONDITION_KEY,JSON.stringify([{date,sleepMinutes:420,feeling:'良い',memo:'本人が記録'}]));
    const ready=await c.refresh();if(!ready.ok)throw Error(ready.reason);
    const saved=await c.mutate(s=>m.saveManualRun(s,{date,distance:'5',hours:'',minutes:'35',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',memo:''}));
    if(!saved.ok)throw Error(saved.reason);return {id:saved.record.id,date};
  });
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-home-dashboard-id="topics"]').waitFor();
  await inspect(page,width,'populated');
  assert.equal(await page.locator('.hx-award-item.won').count(),2);
  assert.equal(await page.locator('.hx-award-item.locked').count(),2);
  assert.equal(await page.locator('.hx-condition-empty').count(),0,'recorded day renders actual bar');
  assert.equal(await page.locator('.hx-bars .hx-bar:not(.hx-missing)').count(),1,'only actual recorded day');
  assert.match(await page.locator('[data-home-dashboard-id="topics"]').innerText(),/5.0/);
  await page.screenshot({path:resolve(out,name+'-'+width+'-populated.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[],name+' '+width+' browser JS errors');
  await ctx.close();
 }
 await writeFile(resolve(out,name+'-report.json'),JSON.stringify(findings,null,2));
 console.log('PASS S02 condition and achievements '+name+' '+findings.length+' states');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
