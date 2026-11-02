/** UI/UX batch03 S09–S11: actual Chromium/WebKit at three widths and state contrasts.
 * Real saved records go through the canonical IndexedDB store, not injected HTML.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+url);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(ok=>server.listen(4249,'127.0.0.1',ok));
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const base='http://127.0.0.1:4249/#/';
const out=resolve(root,'audit-output','uiux03-'+engine);
await mkdir(out,{recursive:true});
const report=[];
const shot=async(page,width,state,fullPage=true)=>{
 const filename=engine+'-'+width+'-'+state+'.png';
 await page.screenshot({path:resolve(out,filename),fullPage,animations:'disabled'});
 report.push({width,state,image:filename,sha:process.env.GITHUB_SHA||'local'});
};
const inspect=async(page,width,state)=>{
 const measured=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));
 assert.ok(measured.document<=width+3,state+' overflow '+JSON.stringify(measured));
};
try{
 for(const width of [320,390,1440]){
  const mobile=width<800;
  const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',
    userAgent:mobile?(engine==='webkit'?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'):undefined});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'home',{waitUntil:'networkidle'});
  const firstId=await page.evaluate(async()=>{
   const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const ready=await canonical.refresh();if(!ready.ok)throw Error('canonical unavailable: '+ready.reason);
   const saved=await canonical.mutate(s=>manual.saveManualRun(s,{
    date:'2026-10-28',distance:'6',hours:'',minutes:'36',seconds:'',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
    courseName:'',shoeName:'',memo:'first saved record'
   }));
   if(!saved.ok)throw Error('first save: '+saved.reason);return saved.record.id;
  });
  await page.goto(base+'result?record='+encodeURIComponent(firstId),{waitUntil:'networkidle'});
  const result=page.locator('#runload-result-v4');await result.locator('.rv4-hero').waitFor();
  assert.equal(await result.locator('[data-tab]').count(),3,'three result tabs retained');
  assert.match(await result.locator('.rv4-hero').innerText(),/運動前[\s\S]*0/,'ROF-J zero is real, not missing');
  await inspect(page,width,'S09-one-saved');
  await shot(page,width,'S09-one-saved',true);
  if(mobile){
   for(const tab of ['fatigue','radar','body']){
    await result.locator('[data-tab="'+tab+'"]').click();
    assert.equal(await result.locator('[data-tab="'+tab+'"]').evaluate(el=>el===el.getRootNode().activeElement),true,tab+' focus retained');
    await shot(page,width,'S09-tab-'+tab,false);
   }
  }
  for(const view of ['front','back','sole']){
   await result.locator('[data-view="'+view+'"]').click();
   assert.equal(await result.locator('[data-view="'+view+'"]').getAttribute('aria-pressed'),'true');
   assert.equal(await result.locator('[data-view="'+view+'"]').evaluate(el=>el===el.getRootNode().activeElement),true,view+' focus retained');
   await shot(page,width,'S09-view-'+view,false);
  }
  // A second ACTUAL saved run enables real comparison, not a synthetic chart.
  const otherId=await page.evaluate(async()=>{
   const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
   const saved=await canonical.mutate(s=>manual.saveManualRun(s,{
    date:'2026-10-25',distance:'4',hours:'',minutes:'28',seconds:'',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',rofBefore:3,rofAfter:5,steps:'',stepsProvenance:'UNKNOWN',
    courseName:'',shoeName:'',memo:'second saved record'
   }));
   if(!saved.ok)throw Error('comparison save: '+saved.reason);return saved.record.id;
  });
  await page.goto(base+'result?record='+encodeURIComponent(firstId)+'&compare='+encodeURIComponent(otherId)+'&view=compare',{waitUntil:'networkidle'});
  await result.locator('.rv4-compare-summary').waitFor();
  assert.match(await result.locator('.rv4-compare-summary').innerText(),/2026-10-25/);
  assert.match(await result.locator('.rv4-compare-summary').innerText(),/2026-10-28/);
  assert.equal(await result.locator('.rv4-history [data-compare-select]').count(),1);
  assert.ok(await result.locator('.rv4-region-compare').count()===1||await result.locator('.rv4-comparison-table').count()===1,'comparison state is grounded in saved runs');
  await inspect(page,width,'S09-two-saved');
  await shot(page,width,'S09-two-saved-compare',true);
  await page.goto(base+'result?record='+encodeURIComponent(firstId)+'&compare=nonexistent-explicit-id&view=compare',{waitUntil:'networkidle'});
  await result.locator('.rv4-history').waitFor();
  assert.match(await result.locator('.rv4-comparison-empty').innerText(),/指定された比較相手は保存記録にありません/);
  await shot(page,width,'S09-invalid-comparison',true);
  // History must keep real IDs behind a disclosure and never invent a replacement.
  await page.goto(base+'history',{waitUntil:'networkidle'});
  const history=page.locator('#runload-history-v2');await history.locator('.stage').waitFor();
  await history.locator('.hx-scope [data-history-scope="all"]').click();
  await history.locator('[data-select-id="'+firstId+'"]').click();
  const detail=history.locator('.selected-footer .hx-record-id');
  await detail.waitFor();assert.equal(await detail.evaluate(el=>el.open),false);
  await shot(page,width,'S10-selected-id-collapsed',true);
  await detail.locator('summary').click();
  assert.equal((await detail.locator('code').innerText()).trim(),firstId);
  assert.ok(await history.locator('[data-open-record]').isEnabled());
  await inspect(page,width,'S10-expanded');
  await shot(page,width,'S10-selected-id-expanded',true);
  // Explore both with linked saved context and truly empty profile.
  await page.goto(base+'exploration-tree?record='+encodeURIComponent(firstId),{waitUntil:'networkidle'});
  const explore=page.locator('[data-experience-v3]');await explore.waitFor();
  assert.equal(await explore.locator('.ex-node').count(),7,'all areas remain independently selectable');
  if(mobile){
   const jump=explore.locator('[data-ex-action="jump-topics"]');assert.equal(await jump.isVisible(),true);
   await jump.click();
   assert.equal(await explore.locator('.ex-topic.is-picked').evaluate(el=>el===document.activeElement),true,'selected topic focused');
   assert.match(page.url(),/record=/,'selected saved run retained during jump');
   await shot(page,width,'S11-jump-viewport',false);
  }
  await inspect(page,width,'S11-saved-context');
  await shot(page,width,'S11-saved-context',true);
  assert.deepEqual(errors,[],'no runtime page errors');
  await context.close();
  const empty=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce'});
  await empty.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const emptyPage=await empty.newPage();
  await emptyPage.goto(base+'exploration-tree',{waitUntil:'networkidle'});
  await emptyPage.locator('[data-experience-v3]').waitFor();
  assert.equal(await emptyPage.locator('.ex-node').count(),7);
  assert.equal(await emptyPage.locator('.ex-node.is-related').count(),0,'no synthetic saved provenance');
  await inspect(emptyPage,width,'S11-no-saved-records');
  await shot(emptyPage,width,'S11-no-saved-records',true);
  await emptyPage.goto(base+'result',{waitUntil:'networkidle'});
  await emptyPage.locator('#runload-result-v4 .rv4-empty-card').first().waitFor();
  assert.equal(await emptyPage.locator('#runload-result-v4 .rv4-hero').count(),0);
  await shot(emptyPage,width,'S09-no-record',true);
  await empty.close();
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA,engine,scope:'S09-S11 browser states, not device or usability-effects acceptance',report},null,2));
 console.log('PASS UIUX03 '+engine+' '+report.length+' actual app screenshots');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
