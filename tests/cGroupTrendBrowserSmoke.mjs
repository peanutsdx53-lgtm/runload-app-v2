/** C F17/F18: the optional trend exists only for confirmed local saved runs.
 * Exercise actual rendered dashboard in Chromium and WebKit, without online user
 * accounts, GPS simulations or any invented day-zero data. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+url);
  if(path!==root&&!path.startsWith(root+sep))throw Error('path');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('missing')}
});
await new Promise(resolve=>server.listen(4199,'127.0.0.1',resolve));
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engineName==='webkit'?webkit:chromium).launch({headless:true});
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion:'reduce'});
  await context.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
   localStorage.setItem('runload-v2-home-dashboard-layout-v1',JSON.stringify({
    version:1,order:['latest','condition','topics','shortcuts','trend','discovery'],
    visible:['latest','trend'],sizes:{latest:'full',condition:'half',topics:'half',shortcuts:'full',trend:'half',discovery:'half'}
   }));
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const host='http://127.0.0.1:4199/';
  await page.goto(host+'#/home',{waitUntil:'domcontentloaded'});
  await page.locator('[data-home-dashboard-id="trend"]').waitFor();
  assert.match(await page.locator('[data-home-dashboard-id="trend"]').innerText(),/まだありません/);
  const ids=await page.evaluate(async()=>{
   const [m,c]=await Promise.all([import('./ui/manualRunStore.js'),import('./ui/manualRunCanonical.js')]);
   const initialized=await c.refresh();if(!initialized.ok)throw Error(initialized.reason);
   const input={date:'2026-10-25',distance:'5',minutes:'30',seconds:'',hours:'',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',memo:''};
   const a=await c.mutate(s=>m.saveManualRun(s,input));
   const b=await c.mutate(s=>m.saveManualRun(s,{...input,distance:'6',date:'2026-10-26'}));
   if(!a.ok||!b.ok)throw Error(JSON.stringify({a,b}));
   return [a.record.id,b.record.id];
  });
  await page.reload({waitUntil:'domcontentloaded'});
  const card=page.locator('[data-home-dashboard-id="trend"]');
  await card.locator('.hx-run-trend-point').first().waitFor();
  assert.equal(await card.locator('.hx-run-trend-point').count(),2);
  const observed=await card.innerText();
  assert.match(observed,/5.00 km/);
  assert.match(observed,/6.00 km/);
  assert.match(observed,/2026-10-25/);
  assert.match(observed,/2026-10-26/);
  assert.match(observed,/未記録日は0kmにせず/);
  assert.doesNotMatch(observed,/正式な走行記録と接続すると/);
  await page.locator('[data-home-preview]').click();
  assert.match(await card.innerText(),/表示例/);
  assert.doesNotMatch(await card.innerText(),/5.00 km|6.00 km/,'preview must hide personal records');
  await page.locator('[data-home-preview]').click();
  assert.equal(await card.locator('.hx-run-trend-point').count(),2);
  const still=await page.evaluate(async()=>{const c=await import('./ui/manualRunCanonical.js');return (await c.readCanonical()).read.records.map(r=>r.id)});
  assert.ok(ids.every(id=>still.includes(id)),'view and preview cannot mutate saved runs');
  assert.deepEqual(errors,[],engineName+' width '+width);
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
console.log('C group optional trend saved-run browser acceptance PASS: '+engineName);
