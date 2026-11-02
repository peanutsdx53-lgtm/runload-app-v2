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
 const f=p===root?resolve(root,'index.html'):p;res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
}catch{res.statusCode=404;res.end('not found');}});
await new Promise(ok=>server.listen(4362,'127.0.0.1',ok));
const engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','record-optional-density');await mkdir(out,{recursive:true});
const host='http://127.0.0.1:4362/#/',report=[];
async function take(page,w,id){
 const m=await page.evaluate(()=>{
  const els=[...document.querySelectorAll('.rv-panel,.cx-main-card,.cx-field-card,.cx-transfer,.cx-toolbar,.cx-selected-chip,.rv-section-row,.e4-panel,.g4-panel,.rv4-card')];
  const fields=[...document.querySelectorAll('textarea,input[maxlength]')].map(e=>({name:e.id||e.dataset.draft,limit:e.maxLength,length:e.value.length,scrollHeight:e.scrollHeight,clientHeight:e.clientHeight}));
  return {viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,
   selectedRegions:document.querySelectorAll('.cx-selected-chip').length,
   nodes:els.map(e=>{const r=e.getBoundingClientRect();return {className:String(e.className),left:r.left,right:r.right,width:r.width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}}),
   counters:[...document.querySelectorAll('.cx-counter')].map(e=>e.textContent),fields};
 });
 report.push({engine,width:w,state:id,...m});
 await page.screenshot({path:resolve(out,engine+'-'+w+'-'+id+'.png'),fullPage:true,animations:'disabled',timeout:12000});
 if(m.document>m.viewport+2||m.body>m.viewport+2)console.warn('OVERFLOW '+engine+' '+w+' '+id+': '+m.document);
}
async function enter(page,route,selector,w,id){
 await page.goto(host+route,{waitUntil:'networkidle'});await page.locator(selector).waitFor({timeout:12000});await take(page,w,id+'-empty');
}
try{
 for(const w of [320,390,1440]){
  const ctx=await browser.newContext({viewport:{width:w,height:w===1440?900:844},locale:'ja-JP',reducedMotion:'reduce'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page,'record','.rv-manual',w,'MANUAL');
  await page.locator('[data-draft="distance"]').fill('8.25');
  await page.locator('[data-draft="minutes"]').fill('54');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await enter(page,'record-course','.rv-course',w,'COURSE');
  const flowRail=await page.locator('.rv-course .rv-flow-rail').evaluate(el=>getComputedStyle(el).display);
  assert.equal(flowRail,w<=480?'none':'grid','S05 collapses duplicate tiny steps on phone');
  assert.equal(await page.locator('.rv-course-step .rv-step-index').count(),3,'all card headings keep 01–03 step labels');
  await page.locator('[data-draft="courseName"]').fill('川沿い周回・橋を渡るコース');
  await page.locator('[data-rv-grade="SECTIONS"]').click();
  for(let k=0;k<5;k++){
    await page.locator('[data-rv-add]').click();
    await page.locator('[data-draft="sectionShare'+k+'"]').fill('20');
    await page.locator('[data-draft="sectionGrade'+k+'"]').fill(String(k+1));
  }
  await page.locator('[data-rv-surface-mode="MIXED"]').click();
  const surfaces=await page.locator('[data-rv-surface]').evaluateAll(e=>e.map(x=>x.dataset.rvSurface).slice(0,2));
  for(const id of surfaces)await page.locator('[data-rv-surface="'+id+'"]').click();
  await page.locator('[data-rv-surface-focus="'+surfaces[0]+'"]').click();
  await page.locator('[data-rv-surface-value="'+surfaces[0]+'"]').fill('60');
  await page.locator('[data-rv-surface-focus="'+surfaces[1]+'"]').click();
  await page.locator('[data-rv-surface-value="'+surfaces[1]+'"]').fill('40');
  assert.match(await page.locator('[data-rv-surface-total]').innerText(),/合計 100%/);
  assert.equal(await page.locator('[data-rv-surface-pick-value="'+surfaces[0]+'"]').innerText(),'60%');
  assert.equal(await page.locator('[data-rv-surface-pick-value="'+surfaces[1]+'"]').innerText(),'40%');
  assert.equal(await page.locator('.rv-surface-fine [data-rv-surface-step]').count(),2,'step controls mirror slope');
  await take(page,w,'COURSE-dense');
  assert.equal(await page.locator('.rv-inline-preset-tools').count(),0,'new course has no edit/copy controls');
  await page.locator('.rv-course-summary [data-course-save]').click();
  await page.locator('.rv-inline-preset-tools').waitFor({state:'visible',timeout:6000});
  assert.equal(await page.locator('.rv-course-setup [data-course-save]').count(),1,'existing preset can be edited in first card');
  assert.equal(await page.locator('.rv-course-setup [data-course-save-new]').count(),1,'existing preset can be copied in first card');
  assert.equal(await page.locator('[data-rv-apply]').count(),1,'record application is still a separate action');
  assert.ok(await page.evaluate(()=>{
    const c=document.querySelector('.rv-course-setup').getBoundingClientRect();
    const a=document.querySelector('.rv-inline-preset-tools').getBoundingClientRect();
    const n=document.querySelector('.rv-course-conditions').getBoundingClientRect();
    return a.top>=c.top&&a.bottom<=c.bottom+2&&a.bottom<n.top;
  }),'preset follow-up actions appear in the first card before conditions');
  assert.equal(await page.locator('.rv-course-summary [data-course-save]').count(),0,'saved preset has no duplicate lower save');
  assert.equal(await page.locator('.rv-course-setup [data-course-save]').count(),1,'one upper update');
  await take(page,w,'COURSE-saved-followup');
  await page.locator('.rv-preset-list [data-course-delete]').first().click();
  const confirm=page.locator('.rv-course-confirm');await confirm.waitFor({state:'visible'});
  assert.equal(await confirm.locator('button').count(),2);
  const metrics=await confirm.evaluate(el=>{
    const p=el.getBoundingClientRect();
    return {outer:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},
      buttons:[...el.querySelectorAll('button')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})};
  });
  const [yes,no]=metrics.buttons;
  assert.ok(yes.left>=metrics.outer.left&&no.right<=metrics.outer.right+1,'buttons inside confirmation card');
  assert.ok(Math.abs(yes.top-no.top)<=2,'confirmation buttons are side-by-side');
  assert.ok(yes.right<=no.left+1,'button rectangles do not overlap');
  await take(page,w,'COURSE-delete-confirm');
  await confirm.locator('[data-course-cancel-delete]').click();
  assert.equal(await page.locator('.rv-course-confirm').count(),0,'cancel leaves saved course untouched');
  await enter(page,'record-rof','[data-rof-v4-root]',w,'ROF');
  const range=page.locator('[data-rof-v4-range]');
  await range.evaluate(e=>{e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('[data-rof-v4-phase="after"]').click();
  await range.evaluate(e=>{e.value='8';e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('.rv4-optional-meta > summary').click();
  await page.locator('[data-rof-run-start]').fill('08:45');
  await page.locator('[data-rof-run-end]').fill('09:39');
  await take(page,w,'ROF-populated');
  await enter(page,'record-compare','[data-g4-page]',w,'GAIT');
  await page.locator('[data-draft="steps"]').fill('12457');
  await page.locator('[data-g4-source="ESTIMATED"]').click();
  await page.locator('[data-g4-format="RUN_WALK"]').click();
  await page.locator('[data-draft="runWalkRunningDistanceKm"]').fill('6.12');
  await page.locator('[data-draft="runWalkRunningDurationMinutes"]').fill('38');
  await take(page,w,'GAIT-populated');
  await enter(page,'record-environment','[data-e4-page]',w,'ENV');
  await page.locator('[data-draft="temperatureC"]').fill('18.5');
  await page.locator('[data-draft="environmentNote"]').fill('向かい風の体感があった。'.repeat(26));
  await page.locator('[data-e4-weather="CLOUD"]').click();
  await page.locator('[data-e4-flag="WIND"]').click();
  await page.locator('[data-e4-selection-status][data-state="pending"]').waitFor();
  assert.equal(await page.locator('[data-e4-commit]').isEnabled(),true,'uncommitted environment choice requires explicit action');
  assert.doesNotMatch(await page.locator('[data-draft="environmentNote"]').inputValue(),/【本人申告の環境選択】/,'choosing alone does not write the note');
  await take(page,w,'ENV-selected');
  await page.locator('[data-e4-commit]').click();
  await page.locator('[data-e4-selection-status][data-state="applied"]').waitFor();
  assert.equal(await page.locator('[data-e4-commit]').isEnabled(),false,'same applied choice cannot be copied twice');
  assert.match(await page.locator('[data-draft="environmentNote"]').inputValue(),/【本人申告の環境選択】天候：くもり、風が強い/);
  await take(page,w,'ENV-committed');
  await enter(page,'record-reflection','[data-cx-page]',w,'BODY');
  await page.locator('#cx-bodyObservation').fill('走行後の感覚を本人の言葉で記録。'.repeat(15));
  await page.locator('#cx-shoeName').fill('使用したシューズ名・'.repeat(9).slice(0,100));
  await page.locator('#cx-memo').fill('その日の走行と生活で感じたこと。'.repeat(28).slice(0,490));
  for(const view of ['front','back','sole']){
    await page.locator('[data-map-view="'+view+'"]').click();
    await page.locator('[data-picker-toggle]').click();
    const ids=await page.locator('[data-picker-id]').evaluateAll(xs=>xs.map(x=>x.dataset.pickerId));
    for(const id of ids)await page.locator('[data-picker-id="'+id+'"]').click();
  }
  assert.equal(await page.locator('.cx-selected-chip').count(),3,'initial twelve-region display compact');
  assert.match(await page.locator('[data-selected-expand]').innerText(),/ほか 9 部位を表示/);
  await take(page,w,'BODY-12-regions-compact');
  await page.locator('[data-selected-expand]').click();
  assert.equal(await page.locator('.cx-selected-chip').count(),12,'expand reveals all selections without loss');
  await take(page,w,'BODY-12-regions-expanded');
  await page.locator('[data-selected-expand]').click();
  assert.equal(await page.locator('.cx-selected-chip').count(),3,'collapse does not discard selected regions');
  const shoeBefore=await page.locator('#cx-shoeName').evaluate(el=>({limit:el.maxLength,length:el.value.length}));
  assert.equal((await page.locator('[data-counter="shoeName"]').innerText()),shoeBefore.length+'/100');
  for(const name of ['bodyObservation','memo']){
    const m=await page.locator('#cx-'+name).evaluate(el=>({height:el.getBoundingClientRect().height,scrollHeight:el.scrollHeight}));
    assert.ok(m.height>=170,'long text expands: '+name+' '+JSON.stringify(m));
    assert.ok(m.height<=242,'long text bounded: '+name);
  }
  await take(page,w,'BODY-12-regions-long-fields');
  await page.locator('[data-append-name]').click();
  await take(page,w,'BODY-appended');
  const max=await page.locator('#cx-shoeName').evaluate(e=>e.maxLength);
  const count=await page.locator('[data-counter="shoeName"]').innerText();
  report.push({engine,width:w,state:'shoe-counter-mismatch-check',max,count});
  await page.locator('[data-apply]').click();await page.locator('.rv-manual').waitFor();
  await take(page,w,'MANUAL-populated-summary');
  // Persist the user's original text plus the explicitly transferred choice.
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  const reviewText=await page.locator('[data-record-review]').innerText();
  assert.match(reviewText,/本人申告：天候：くもり、風が強い/,'pre-save summary exposes the explicit self-report');
  assert.match(reviewText,/全文は編集画面で確認/,'long original notes are summarized, not truncated in storage');
  assert.ok(reviewText.length<3400,'review remains reachable even with long optional notes: '+reviewText.length);
  await take(page,w,'REVIEW-environment-saved-draft');
  const button=page.locator('[data-manual-run-save]');
  assert.equal(await button.isEnabled(),true,'complete optional context must not block valid run save');
  await button.click();
  await page.waitForFunction(()=>location.hash.startsWith('#/result?record='),null,{timeout:12000});
  const getSaved=()=>page.evaluate(async()=>{
   const {readCanonical}=await import('/ui/manualRunCanonical.js');
   const result=await readCanonical();
   return result.ok?result.read.records.at(-1):null;
  });
  const saved=await getSaved();
  assert.ok(saved,'saved run exists in IndexedDB');
  assert.match(saved.draft.environmentNote,/向かい風の体感があった/);
  assert.match(saved.draft.environmentNote,/【本人申告の環境選択】天候：くもり、風が強い/);
  assert.equal(saved.draft.temperatureC,'18.5');
  assert.ok(saved.id.startsWith('run-v1-'));
  await take(page,w,'RESULT-environment-saved');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#runload-result-v4').waitFor();
  assert.equal((await getSaved())?.id,saved.id,'reloading retains the same record identity');
  assert.equal((await getSaved())?.draft.environmentNote,saved.draft.environmentNote,'reloading retains the personally asserted context');
  await take(page,w,'RESULT-environment-reloaded');
  assert.deepEqual(errors,[],'JS page errors');
  await ctx.close();
 }
 console.log('AUDIT COMPLETE '+engine+' '+report.length+' states');
}finally{
 await writeFile(resolve(out,engine+'-report.json'),JSON.stringify(report,null,2));
 await browser.close();await new Promise(ok=>server.close(ok));
}
