/** UIUX06: simulations remain hypothetical; exported PNG never asserts missing assessment times. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mimetypes={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const path=resolve(root,'.'+pathname);
  if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');
  const real=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mimetypes[extname(real)]||'application/octet-stream');res.end(await readFile(real));
 }catch{res.statusCode=404;res.end('missing')}
});
await new Promise(done=>server.listen(4278,'127.0.0.1',done));
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','uiux06-'+engine);await mkdir(out,{recursive:true});
const base='http://127.0.0.1:4278/#/',report=[];
const shot=async(page,width,state)=>{
 const sizes=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
 assert.ok(sizes.document<=sizes.viewport+3&&sizes.body<=sizes.viewport+3,state+' horizontal overflow '+JSON.stringify(sizes));
 const filename=engine+'-'+width+'-'+state+'.png';
 await page.screenshot({path:resolve(out,filename),fullPage:false,animations:'disabled'});
 report.push({width,state,filename,sha:process.env.GITHUB_SHA||'local'});
};
try{
 for(const width of [320,390,1440]){
  const mobile=width<800;
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',
   acceptDownloads:true,userAgent:mobile?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1':undefined});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(base+'simulation',{waitUntil:'networkidle'});
  const sim=page.locator('[data-sim-page]');await sim.waitFor();
  assert.equal(await sim.locator('.sm-steps span').count(),4,'all four approved simulation phases retained');
  assert.match(await sim.locator('.sm-limits').innerText(),/身体負荷を予測しません/);
  assert.match(await sim.locator('.sm-comparison-note').innerText(),/仮定/);
  await shot(page,width,'S19-manual-hypothetical');
  const none=sim.locator('[data-sm-source="none"]');await none.click();
  assert.equal(await sim.locator('[data-sm-source="none"]').getAttribute('aria-pressed'),'true');
  assert.equal(await sim.locator('[data-sm-source="none"]').evaluate(el=>el===document.activeElement),true,'source focus survives full rerender');
  assert.match(await sim.locator('.sm-result').first().innerText(),/距離目標なし/);
  assert.match(await sim.locator('.sm-comparison-note').innerText(),/到達地点・残り距離は表示しません/);
  await shot(page,width,'S19-no-course');
  const manual=sim.locator('[data-sm-source="manual"]');await manual.click();
  assert.equal(await sim.locator('[data-sm-source="manual"]').evaluate(el=>el===document.activeElement),true);
  const budget=sim.locator('[data-sm-field="budget"]');
  await budget.fill('');
  assert.match(await sim.locator('.sm-error').first().innerText(),/時間・ペース・走歩の区間をすべて入力/);
  await shot(page,width,'S19-blank-parameter');
  await budget.fill('35');
  assert.match(await sim.locator('.sm-comparison-note').innerText(),/35分間/);
  await shot(page,width,'S19-recovered-comparison');
  // An actual canonical saved run, not a static HTML mock, drives PNG export and print.
  await page.goto(base+'home',{waitUntil:'networkidle'});
  const id=await page.evaluate(async()=>{
   const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const ready=await canonical.refresh();if(!ready.ok)throw Error(ready.reason);
   const saved=await canonical.mutate(s=>manual.saveManualRun(s,{
    date:'2026-10-30',distance:'6',hours:'',minutes:'36',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',
    rofBefore:0,rofAfter:7,rofEntryEvidence:{before:{capturedAt:'2026-10-30T10:00:00Z',assessedAt:'2026-10-30T09:55:00Z',timeBasis:'RECALLED'},after:{capturedAt:'2026-10-30T11:00:00Z',assessedAt:'2026-10-30T10:55:00Z',timeBasis:'RECALLED'}},
    steps:'',stepsProvenance:'UNKNOWN',courseName:'',shoeName:'',memo:'user-report'
   }));
   if(!saved.ok)throw Error(saved.reason);return saved.record.id;
  });
  await page.goto(base+'result?record='+encodeURIComponent(id),{waitUntil:'networkidle'});
  const result=page.locator('#runload-result-v4');await result.locator('.rv4-hero').waitFor();
  await shot(page,width,'S20-saved-result');
  await page.evaluate(()=>{
   const prototype=CanvasRenderingContext2D.prototype;
   const original=prototype.fillText;
   window.__uiux06DrawnText=[];
   prototype.fillText=function(value,...args){window.__uiux06DrawnText.push(String(value));return original.call(this,value,...args)};
  });
  await result.locator('.rv4-export-menu summary').click();
  const [download]=await Promise.all([page.waitForEvent('download'),result.locator('[data-download]').click()]);
  assert.equal(download.suggestedFilename(),'走行結果.png');
  const path=resolve(out,engine+'-'+width+'-S20-result.png');
  await download.saveAs(path);
  const bytes=await readFile(path);
  assert.ok(bytes.length>12000&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'valid PNG signature');
  const drawn=await page.evaluate(()=>window.__uiux06DrawnText);
  assert.ok(drawn.includes('回答の実際の時間的前後差は判定しません'),JSON.stringify(drawn));
  assert.ok(!drawn.some(x=>x.includes('評価時刻未記録')),'saved timestamps may exist; PNG cannot claim they are missing');
  assert.ok(drawn.some(x=>x.includes('ROF-Jは本人が回答した疲労感')));
  assert.ok(drawn.some(x=>x.includes('本人の身体負荷の実測値ではありません')));
  if(engine==='chromium'){
   await page.emulateMedia({media:'print'});
   assert.equal(await result.locator('.rv4-hero').count(),1,'print retains source-record facts');
   await page.emulateMedia({media:'screen'});
  }
  await shot(page,width,'S20-export-menu');
  assert.deepEqual(errors,[],'no browser runtime errors');
  await context.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',engine,scope:'S19 what-if + S20 actual PNG/print, not physical-device or user-effect proof',report},null,2));
 console.log('PASS UIUX06 '+engine+' '+report.length+' actual browser screenshots');
}finally{await browser.close();await new Promise(done=>server.close(done));}
