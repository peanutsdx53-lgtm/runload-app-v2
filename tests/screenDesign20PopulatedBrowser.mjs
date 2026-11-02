/** Twenty Current screen design contracts, visibly grounded in real UI states.
 * This complements, not replaces, the 280-width observational matrix:
 * S19 (image output) & S20 (accessibility/offline) are cross-cutting states,
 * not fictitious independent standalone routes.
 */
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
  const url=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+url);
  if(path!==root&&!path.startsWith(root+sep))throw Error('outside root');
  const actual=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');
  res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(ok=>server.listen(4218,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const host='http://127.0.0.1:4218/#/';
const reports=[];
await mkdir(resolve(root,'audit-output'),{recursive:true});
try{
 for(const width of [320,390,1440]){
  const height=width===1440?900:850;
  const smartphone=width<801;
  const userAgent=smartphone?(engine==='webkit'?
   'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1':
   'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'):undefined;
  // S01 is a real first-visit consent and four-operation guide, not /home.
  const first=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',...(userAgent?{userAgent}:{})});
  const fresh=await first.newPage();
  const errs=[];fresh.on('pageerror',e=>errs.push(e.message));
  await fresh.goto(host+'home',{waitUntil:'networkidle'});
  await fresh.locator('.fu-shell').waitFor();
  assert.equal(await fresh.locator('.fu-shell').count(),1,'S01 real onboarding modal');
  assert.match(await fresh.locator('#onboard-title').innerText(),/表示言語/);
  assert.equal(await fresh.locator('[data-onboard-next]').count(),1);
  const firstSize=await fresh.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(firstSize.document<=firstSize.viewport+3&&firstSize.body<=firstSize.viewport+3,'S01 initial consent overflow '+JSON.stringify(firstSize));
  await fresh.screenshot({path:resolve(root,'audit-output',engine+'-S01-'+width+'.png'),animations:'disabled',fullPage:true});
  await fresh.screenshot({path:resolve(root,'audit-output',engine+'-S01-'+width+'-viewport.png'),animations:'disabled',fullPage:false});
  reports.push({screen:'S01',width,engine,state:'first-visit',ok:true,measurement:firstSize});
  await first.close();
  const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true,...(userAgent?{userAgent}:{})});
  await ctx.addInitScript(()=>{
   localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));
   const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
   localStorage.setItem('runload-v2-life-condition-v1',JSON.stringify([
    {date:day(-2),sleepMinutes:420,sleepSource:'duration',feeling:'良い',memo:'前日の生活記録'},
    {date:day(-1),sleepMinutes:400,sleepSource:'duration',feeling:'ふつう',memo:'本人による記録'}
   ]));
  });
  const page=await ctx.newPage();
  const jsErrors=[];page.on('pageerror',e=>jsErrors.push(e.message));
  await page.goto(host+'home',{waitUntil:'networkidle'});
  const run=await page.evaluate(async()=>{
   const [canonical,manual]=await Promise.all([import('./ui/manualRunCanonical.js'),import('./ui/manualRunStore.js')]);
   const init=await canonical.refresh();if(!init.ok)throw Error(init.reason);
   const saved=await canonical.mutate(s=>manual.saveManualRun(s,{
    date:'2026-10-28',distance:'6',hours:'',minutes:'36',seconds:'',activityGait:'RUNNING',
    runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',
    courseName:'',shoeName:'',memo:''
   }));
   if(!saved.ok)throw Error(saved.reason);
   return saved.record.id;
  });
  // The record was saved through canonical IndexedDB after the SPA already
  // mounted Home. Reload explicitly; navigating to the same hash is a no-op
  // in some browsers and must not be mistaken for failed persistence.
  await page.reload({waitUntil:'networkidle'});
  // Each case first asserts actual state/content and then viewport consistency.
  const verify=async(screen,route,selector,assertContent=async()=>{})=>{
   if(route)await page.goto(host+route,{waitUntil:'networkidle'});
   const target=page.locator(selector).first();
   await target.waitFor({timeout:12000});
   await assertContent(target);
   const measure=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
   assert.ok(measure.document<=measure.viewport+3,screen+' '+width+' document overflow '+JSON.stringify(measure));
   assert.deepEqual(jsErrors,[],screen+' '+width+' page script failures');
   reports.push({screen,engine,width,route,state:'realized',ok:true,measurement:measure});
   await page.screenshot({path:resolve(root,'audit-output',engine+'-'+screen+'-'+width+'.png'),animations:'disabled',fullPage:true});
   await page.screenshot({path:resolve(root,'audit-output',engine+'-'+screen+'-'+width+'-viewport.png'),animations:'disabled',fullPage:false});
  };
  await verify('S02','home','.home-v3',async()=>{assert.match(await page.locator('.hx-latest').innerText(),/6.00/);});
  await verify('S03','record-start','main',async t=>{assert.match(await t.innerText(),/手入力/);});
  await verify('S04','record','[data-draft="distance"]',async t=>{assert.equal(await t.count(),1);});
  await verify('S05','record-course','main',async t=>{assert.match(await t.innerText(),/コース|路面|坂/);});
  await verify('S06','record-rof','main',async t=>{assert.match(await t.innerText(),/ROF-J|疲労感/);});
  await verify('S07','record-more','main',async t=>{assert.match(await t.innerText(),/追加情報|身体|メモ|環境/);});
  await page.goto(host+'record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="distance"]').fill('5');
  await page.locator('[data-draft="minutes"]').fill('30');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.locator('[data-demo-save]').click();
  await verify('S08',null,'[data-record-review]',async t=>{
   assert.match(await t.innerText(),/記録内容の確認/);
   assert.equal(await t.locator('[data-manual-run-save]').count(),1);
  });
  await verify('S09','result?record='+encodeURIComponent(run),'#runload-result-v4',async t=>{
   assert.equal(await t.locator('[data-view="front"]').count(),1);
   assert.equal(await t.locator('[data-view="back"]').count(),1);
   assert.equal(await t.locator('[data-view="sole"]').count(),1);
   assert.equal(await t.locator('[data-tab]').count(),3,'S09 body / fatigue / historic comparison retained');
   assert.match(await t.locator('.rv4-notice').innerText(),/参考値|文献|算出/);
  });
  await page.goto(host+'history',{waitUntil:'networkidle'});
  await page.locator('#runload-history-v2 .stage').waitFor();
  await page.locator('#runload-history-v2 .hx-scope [data-history-scope="all"]').click();
  await page.locator('[data-select-id="'+run+'"]').click();
  await verify('S10',null,'#runload-history-v2',async t=>{
   assert.equal(await t.locator('.stage').count(),1);
   assert.equal(await t.locator('.selected-footer .hx-record-id').count(),1,'selected saved run must be visible, not empty current month');
   assert.equal(await t.locator('[data-open-record]').isEnabled(),true,'selected running record has a results route');
  });
  await verify('S11','exploration-tree','[data-experience-v3]',async t=>{
   assert.match(await t.innerText(),/探究/);
   assert.equal(await t.locator('.ex-node').count(),7,'seven exploration categories retained');
  });
  const guide='exploration-tree?category=06&topic='+encodeURIComponent('ウォームアップ');
  await verify('S12',guide,'.ex-observation-guide',async t=>{
   assert.match(await t.innerText(),/観察ガイド/);
  });
  await page.locator('.ex-learning [data-ex-action="note"]').click();
  await verify('S13',null,'.ex-dialog',async t=>{
   assert.equal(await t.getAttribute('aria-modal'),'true');
   assert.equal(await t.locator('#ex-note').count(),1);
  });
  await page.keyboard.press('Escape');
  await verify('S14','condition','#condition-journey',async t=>{
   assert.match(await t.innerText(),/生活記録|睡眠|コンディション/);
   assert.equal(await t.locator('[data-cj-day]:not([disabled])').count(),2,'screen must show two actually stored recent life entries');
   await t.locator('[data-cj-day]:not([disabled])').first().click();
   assert.match(await t.locator('.cj-day-memo').innerText(),/本人による記録|前日の生活記録/);
  });
  await verify('S15','consultation','#runload-consultation',async t=>{
   assert.equal(await t.locator('#cp-target').count(),1);
   assert.match(await t.innerText(),/相談|共有/);
  });
  await verify('S16','settings','[data-settings-v2]',async t=>{
   assert.match(await t.innerText(),/データとプライバシー/);
  });
  await verify('S17','measurement',smartphone?'[data-measurement-v2]':'.gps-platform-unavailable',async t=>{
   assert.match(await t.innerText(),smartphone?/GPS|測定/:/GPS測定はスマートフォン専用/);
   if(!smartphone)assert.equal(await page.locator('[data-gps-action="start"]').count(),0,'PC must not offer GPS start');
  });
  await verify('S18','simulation','.sm-page',async t=>{
   assert.match(await t.innerText(),/仮定|シミュレーション/);
  });
  await verify('S19','result?record='+encodeURIComponent(run),'#runload-result-v4',async t=>{
   const button=t.locator('[data-download]');
   assert.equal(await button.count(),1);
   assert.equal(await button.isEnabled(),true);
   assert.match(await t.locator('.rv4-notice').innerText(),/参考値|文献|算出/);
  });
  // S19 is not a decorative export button: create a real PNG from a persisted record.
  const result=page.locator('#runload-result-v4');
  await result.locator('.rv4-export-menu summary').click();
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:10000}),result.locator('[data-download]').click()]);
  assert.equal(download.suggestedFilename(),'走行結果.png');
  const pngPath=resolve(root,'audit-output',engine+'-S19-'+width+'-export.png');
  await download.saveAs(pngPath);
  const png=await readFile(pngPath);
  assert.ok(png.length>12000&&png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'S19 real PNG required');
  assert.equal(png.readUInt32BE(16),1200,'PNG width');
  assert.equal(png.readUInt32BE(20),630,'PNG height');
  reports[reports.length-1].export={file:engine+'-S19-'+width+'-export.png',size:png.length,width:1200,height:630};
  await verify('S20','settings','[data-settings-v2]',async t=>{
   assert.match(await t.innerText(),/文字サイズ/);
   assert.match(await t.innerText(),/インストール/);
  });
  assert.equal(reports.filter(r=>r.width===width).length,20);
  await ctx.close();
 }
 const byScreen=Object.fromEntries([...new Set(reports.map(r=>r.screen))].map(s=>[s,reports.filter(r=>r.screen===s).length]));
 assert.equal(Object.keys(byScreen).length,20);
 assert.ok(Object.values(byScreen).every(n=>n===3));
 await writeFile(resolve(root,'audit-output','current-20-populated-'+engine+'.json'),JSON.stringify({scope:'20_screen_state_coverage_not_full_acceptance',sha:process.env.GITHUB_SHA||'',byScreen,reports},null,2));
 console.log('PASS',engine,'20 Current design screen states x 3 widths, 60 observed cases');
}finally{await browser.close();await new Promise(done=>server.close(done));}
