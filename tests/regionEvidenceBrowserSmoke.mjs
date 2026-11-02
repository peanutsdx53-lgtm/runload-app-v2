/** Narrow-scope browser audit of Step 5 source explanations.
 * Fixtures are passed through the actual result UI's authorized saved-record interface.
 * They are not persisted, are not participant observations, and do not alter science.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:4197');
  const path=resolve(root,'.'+decodeURIComponent(url.pathname));
  if(path!==root&&!path.startsWith(root+sep))throw Error('traversal');
  const file=path===root?resolve(root,'index.html'):path;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4197,'127.0.0.1',done));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const host='http://127.0.0.1:4197/';
async function mount(page,{speed=3,activity='RUNNING',mixed=false}={}){
 // This is a complete, internally consistent TEST record, supplied to the same
 // mountResult() contract used by the application's saved/manual route.
 const distanceKm=Number((speed*1.8).toFixed(6)); // 30 minutes
 return page.evaluate(async({distanceKm,activity,mixed})=>{
  const {mountResult}=await import('/ui/resultExperience.js?v=20261029-region-evidence-v1');
  const id='run-v1-11111111-1111-4111-8111-111111111111';
  const draft={date:'2026-10-25',distance:String(distanceKm),minutes:'30',activityGait:activity,
   runningFormat:mixed?'RUN_WALK':'CONTINUOUS_RUN',rofBefore:0,rofAfter:4,
   shoeName:'QA',memo:'検証用の記録',courseName:'QA'};
  const record={schema:2,source:'manual',type:'run',id,date:'2026-10-25',
   distanceKm,durationSeconds:1800,rofBefore:0,rofAfter:4,draft};
  const host=document.querySelector('#runload-result-v4');
  if(!host)throw Error('Result host is absent');
  const baseline=await import('/core/activity/activityReference.js');
  const before=baseline.calculateActivityReference(record);
  mountResult(host,draft,{saved:true,recordId:id,record,compareRecords:{ok:true,records:[record]}});
  const after=baseline.calculateActivityReference(record);
  return {unchanged:JSON.stringify(before)===JSON.stringify(after),
    count:before.count,values:before.rows.map(x=>x.value)};
 },{distanceKm,activity,mixed});
}
const fit=async(page,label)=>{
 const g=await page.evaluate(()=>{
  const target=document.querySelector('#runload-result-v4');
  return {viewport:innerWidth,outer:document.documentElement.scrollWidth,
   inner:target.shadowRoot.querySelector('.rv4-app').scrollWidth,
   box:target.shadowRoot.querySelector('.rv4-app').getBoundingClientRect().width};
 });
 assert.ok(g.outer<=g.viewport+3,label+' page overflow '+JSON.stringify(g));
 assert.ok(g.inner<=g.box+4,label+' shadow overflow '+JSON.stringify(g));
};
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?920:850},reducedMotion:'reduce',deviceScaleFactor:1});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  const prefix='region-source-'+(engine===webkit?'webkit':'chromium')+'-'+width;
  await page.goto(host+'#/result',{waitUntil:'domcontentloaded'});
  const result=page.locator('#runload-result-v4');
  await result.waitFor();
  const initial=await mount(page,{speed:3});
  assert.equal(initial.count,12,'3m/s running reference count');
  assert.equal(initial.unchanged,true,'presentation must not change calculations');
  assert.equal(await result.locator('.rv4-tone-legend').count(),0,'duplicated color legend removed');
  assert.equal(await result.locator('.rv4-disclaimer').count(),0,'risk explanation remains under details, not repeated');
  assert.equal(await result.locator('.rv4-reading .rv4-score-caption').count(),0,'calculated value has no repeated paragraph');
  const visual=await result.evaluate(el=>{
   const shadow=el.shadowRoot,box=q=>shadow.querySelector(q)?.getBoundingClientRect();
   const summary=box('.rv4-export-menu>summary'),arrow=box('.rv4-export-chevron');
   const figure=box('.rv4-body-figure'),reading=box('.rv4-reading'),picker=box('.rv4-region-selection .rv4-picker');
   return {exportHeight:summary?.height,arrowOffset:Math.abs((summary?.top+summary?.height/2)-(arrow?.top+arrow?.height/2)),
    pickerTop:picker?.top,figureBottom:figure?.bottom,readingBottom:reading?.bottom,
    gradient:getComputedStyle(shadow.querySelector('.rv4-scale')).backgroundImage,
    alignItems:getComputedStyle(shadow.querySelector('.rv4-body-content')).alignItems,
    methodOpen:shadow.querySelector('.rv4-method-disclosure')?.open};
  });
  assert.ok(visual.exportHeight<=44&&visual.arrowOffset<9,'compact export button has aligned chevron '+JSON.stringify(visual));
  assert.ok(visual.pickerTop>=Math.max(visual.figureBottom,visual.readingBottom)-2,'region picker follows both figure and reading '+JSON.stringify(visual));
  assert.equal(visual.methodOpen,false,'expanded scientific limitations remain optional');
  if(width<=800)assert.equal(visual.alignItems,'center','mobile reading card is not stretched to figure height');
  const blue=visual.gradient.indexOf('rgb(71, 118, 166)'),green=visual.gradient.indexOf('rgb(102, 196, 181)'),red=visual.gradient.indexOf('rgb(202, 125, 139)');
  assert.ok(blue>=0&&green>blue&&red>green,'single blue-green-red scale direction '+visual.gradient);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-compact-body.png'),fullPage:true,animations:'disabled'});
  await result.locator('.rv4-method-disclosure summary').click();
  assert.match(await result.locator('.rv4-method-disclosure').innerText(),/危険度や部位間の順位ではありません/);
  await result.locator('.rv4-method-disclosure summary').click();
  const panel=result.locator('.rv4-region-evidence');
  assert.equal(await panel.count(),1,'single detail disclosure');
  assert.equal(await panel.getAttribute('data-region-evidence'),'BA-DISP-014','hip selected');
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/Fukuchi/);
  assert.match(await panel.innerText(),/9～16\.2 km\/h/);
  assert.match(await panel.innerText(),/本人の身体負荷・傷害危険度/);
  assert.match(await panel.locator('a').getAttribute('href'),/^https:\/\/doi\.org\//);
  const sourceSwitch=await page.evaluate(()=>{
   const p=document.querySelector('#runload-result-v4').shadowRoot;
   const summaries=p.querySelectorAll('.rv4-region-evidence');
   return {count:summaries.length,title:summaries[0].querySelector('summary')?.innerText};
  });
  assert.equal(sourceSwitch.count,1,'details stay in actual result shadow root');
  await fit(page,prefix+' running');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-hip.png'),fullPage:false});
  await result.locator('[data-view="back"]').click();
  // GAZENDAM on the actual anatomical result screen: do not silently claim
  // the published normalized-speed table has been reconciled.
  await result.locator('.rv4-body-svg [data-region="BA-DISP-015"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await panel.getAttribute('data-region-evidence'),'BA-DISP-015');
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/Gazendam/);
  assert.match(await panel.innerText(),/Table 2の掲載値に一部不一致/);
  await result.locator('.rv4-body-svg [data-region="BA-DISP-025"]').focus();
  await page.keyboard.press('Enter');
  assert.equal(await panel.getAttribute('data-region-evidence'),'BA-DISP-025','Achilles selected');
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/Van Hooren/);
  await result.locator('[data-view="sole"]').click();
  await result.locator('.rv4-body-svg [data-region="BA-DISP-027"]').focus();
  await page.keyboard.press('Enter');
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/Li ほか（2020）/);
  assert.match(await panel.innerText(),/5～12 km\/h/);
  assert.match(await panel.innerText(),/踵接地.*男性39人/,'Li sample restriction stays visible in result UI');
  assert.match(await panel.locator('a').getAttribute('href'),/doi\.org\/10\.24264\/lfj\.20\.2\.7/);
  await fit(page,prefix+' switching');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-foot.png'),fullPage:false});

  const low=await mount(page,{speed:1.6666666666666667});
  assert.equal(low.count,3,'6km/h has only three supported running regions');
  assert.match(await result.locator('.rv4-notice').innerText(),/3\/12/);
  assert.match(await result.locator('.rv4-hero').innerText(),/記録/);
  assert.ok(await result.locator('.rv4-fatigue').count(),'fatigue remains available');
  assert.ok(await result.locator('.rv4-history').count(),'comparison tab remains available');
  assert.equal(await result.locator('.rv4-scale').count(),1,'selected supported region keeps its color scale');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-partial-three-of-twelve.png'),fullPage:true,animations:'disabled'});
  const high=await mount(page,{speed:20/3.6});
  assert.equal(high.count,0,'20km/h must not extrapolate');
  assert.equal(await result.locator('.rv4-scale').count(),0,'no colored numerical scale for unsupported speed');
  assert.match(await result.locator('.rv4-score-caption').innerText(),/算出できません/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-no-reference-outside-speed.png'),fullPage:true,animations:'disabled'});
  assert.match(await result.locator('.rv4-notice').innerText(),/参考値なし/);
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/未算出/);
  assert.match(await result.locator('.rv4-hero').innerText(),/記録/);
  await fit(page,prefix+' out-of-domain');

  const walk=await mount(page,{speed:1.5,activity:'WALK'});
  assert.ok(walk.count>=0,'walking remains routable');
  await panel.locator('summary').click();
  assert.match(await panel.innerText(),/原著ID|出典情報を確認できません/);
  assert.doesNotMatch(await panel.innerText(),/Fukuchi ほか/);
  const jog=await mount(page,{speed:2.3,activity:'JOGGING'});
  assert.ok(jog.count>=0,'jogging remains routable');
  await panel.locator('summary').click();
  assert.doesNotMatch(await panel.innerText(),/Fukuchi ほか/);
  const mixed=await mount(page,{speed:3,activity:'RUNNING',mixed:true});
  assert.equal(mixed.count,0,'run/walk is not reduced to one running reference');
  assert.equal(await result.locator('.rv4-scale').count(),0,'mixed activity cannot render a fabricated scientific scale');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-mixed-run-walk.png'),fullPage:true,animations:'disabled'});
  assert.match(await result.locator('.rv4-notice').innerText(),/参考値なし/);
  await fit(page,prefix+' activities');
  const unknown=await mount(page,{speed:3,activity:'UNKNOWN'});
  assert.equal(unknown.count,0,'missing activity is never guessed from pace');
  assert.equal(await result.locator('.rv4-scale').count(),0,'unselected activity has no numerical reference scale');
  assert.equal(await result.locator('.rv4-activity-missing').count(),1,'activity correction is offered only when required');
  assert.match(await result.locator('.rv4-notice').innerText(),/活動種別未設定/);
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-missing-activity.png'),fullPage:true,animations:'disabled'});
  await page.evaluate(async()=>{
   const {mountResult}=await import('/ui/resultExperience.js');
   mountResult(document.querySelector('#runload-result-v4'),{},{});
  });
  assert.match(await result.locator('.rv4-notice').innerText(),/記録なし/);
  assert.equal(await result.locator('.rv4-scale').count(),0,'empty result must not show color scale');
  await page.screenshot({path:resolve(root,'screenshots',prefix+'-empty.png'),fullPage:true,animations:'disabled'});
  await fit(page,prefix+' all state cases');

  if(engine===chromium&&width===390){
   await page.evaluate(async()=>{
    await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
    await navigator.serviceWorker.ready;
   });
   await page.waitForTimeout(300);
   await context.setOffline(true);
   await page.reload({waitUntil:'domcontentloaded'});
   await result.waitFor();
   const offline=await mount(page,{speed:3});
   assert.equal(offline.count,12,'reference explanations work with offline JS');
   await panel.locator('summary').click();
   assert.match(await panel.innerText(),/Fukuchi/);
   await fit(page,prefix+' offline');
   await page.screenshot({path:resolve(root,'screenshots',prefix+'-offline.png'),fullPage:false});
  }
  assert.deepEqual(errors,[],prefix+' page errors');
  await context.close();
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
console.log('Step 6 source disclosure browser audit PASSED');
