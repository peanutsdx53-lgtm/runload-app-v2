/** UIUX 04-06 delayed-stage evidence: selected condition shares, ROF 0/missing,
 * body-selection long note, mandatory fields and valid review at mobile and desktop. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),engine=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=createServer(async(req,res)=>{try{
 const u=decodeURIComponent(new URL(req.url,'http://localhost').pathname),p=resolve(root,'.'+u);
 if(p!==root&&!p.startsWith(root+sep))throw Error('traversal');
 const f=p===root?resolve(root,'index.html'):p;
 res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
}catch{res.statusCode=404;res.end('not found')}});
await new Promise(done=>server.listen(4291,'127.0.0.1',done));
const browser=await(engine==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','uiux02-'+engine);await mkdir(out,{recursive:true});
const reports=[],base='http://127.0.0.1:4291/#/';
try{
for(const width of [320,390,1440]){
 const context=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',userAgent:width<800?'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1':undefined});
 await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const visit=async route=>page.goto(base+route,{waitUntil:'networkidle'});
 const shot=async(state)=>{
  const d=await page.evaluate(()=>({vw:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert.ok(d.scroll<=d.vw+3&&d.body<=d.vw+3,state+' overflow '+JSON.stringify(d));
  const file=engine+'-'+width+'-'+state+'.png';
  await page.screenshot({path:resolve(out,file),fullPage:true,animations:'disabled'});
  reports.push({state,width,file,sha:process.env.GITHUB_SHA||'',...d});
 };
 // S05: a deliberately incomplete two-section course cannot silently count blank as 0%.
 await visit('record-course');
 await page.locator('[data-rv-grade="SECTIONS"]').click();
 await page.locator('[data-rv-add]').click();await page.locator('[data-rv-add]').click();
 assert.equal(await page.locator('.rv-section-row').count(),2);
 assert.match(await page.locator('[data-rv-section-progress]').innerText(),/0 \/ 2/);
 await shot('S05-blank-two-sections');
 await page.locator('[data-draft="sectionShare0"]').fill('40');
 assert.match(await page.locator('[data-rv-section-progress]').innerText(),/1 \/ 2/);
 await page.locator('[data-draft="sectionShare1"]').fill('60');
 assert.match(await page.locator('[data-rv-section-progress]').innerText(),/2 \/ 2.*100%/);
 await shot('S05-valid-40-60');
 // S06: mandatory contrast = an unanswered report is not the valid scale value 0.
 await visit('record-rof');
 const rof=page.locator('[data-rof-v4-root]');await rof.waitFor();
 assert.equal(await rof.locator('.rv4-anchor').count(),5);
 assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'—');
 await shot('S06-unanswered');
 await rof.locator('[data-rof-v4-range]').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}))});
 assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'0');
 await shot('S06-answered-zero');
 await rof.locator('[data-rof-v4-clear]').click();
 assert.equal((await rof.locator('[data-rof-v4-number]').innerText()).trim(),'—');
 await shot('S06-cleared-back-to-missing');
 // S07: selecting a visible named anatomical region is an optional personal observation.
 await visit('record-reflection');
 const body=page.locator('[data-cx-page]');await body.waitFor();
 assert.equal(await body.locator('[data-map-view]').count(),3);
 assert.equal(await body.locator('[data-append-name]').isDisabled(),true);
 await body.locator('[data-picker-toggle]').click();
 const first=body.locator('[data-picker-id]').first(),picked=await first.getAttribute('data-picker-id');
 await first.click();
 assert.equal(await body.locator('[data-picker-id="'+picked+'"]').getAttribute('aria-pressed'),'true');
 assert.equal(await body.locator('[data-append-name]').isEnabled(),true);
 await body.locator('[data-append-name]').click();
 assert.ok((await body.locator('[data-draft="bodyObservation"]').inputValue()).length>0,'explicit button copies selected region name');
 await body.locator('[data-draft="bodyObservation"]').fill('本人の長い観察。'.repeat(30));
 assert.equal(await body.locator('[data-draft="bodyObservation"]').inputValue(),'本人の長い観察。'.repeat(30),'500-character capacity retains the actual long observation');
 await shot('S07-selected-and-long-note');
 await body.locator('[data-map-view="back"]').click();
 assert.equal(await body.locator('[data-map-view="back"]').getAttribute('aria-pressed'),'true');
 await shot('S07-back-view');
 // S08: cannot save until activity, distance and duration are supplied.
 await visit('record-review');
 const review=page.locator('[data-record-review]');await review.waitFor();
 assert.equal(await review.locator('[data-manual-run-save]').isDisabled(),true);
 assert.match(await review.locator('.rr-alert').innerText(),/距離|時間|活動種目/);
 await shot('S08-invalid-cannot-save');
 await visit('record');
 await page.locator('[data-draft="distance"]').fill('5');
 await page.locator('[data-draft="minutes"]').fill('30');
 await page.locator('[data-manual-gait="RUNNING"]').click();
 await page.locator('[data-demo-save]').click();
 await review.waitFor();
 assert.equal(await review.locator('[data-manual-run-save]').isEnabled(),true);
 assert.equal(await review.locator('[data-required-status][data-required-ok="true"]').count(),3);
 assert.match(await review.innerText(),/手入力した走行を端末内に保存/);
 await shot('S08-valid-ready-to-save');
 assert.deepEqual(errors,[],'no script exceptions');
 await context.close();
}
await writeFile(resolve(out,'report.json'),JSON.stringify({sha:process.env.GITHUB_SHA||'',engine,scope:'S05-S08 selected normal and counterexamples; not a real device',states:reports},null,2));
console.log('PASS S05-S08 acceptance '+engine+' '+reports.length+' screenshots');
}finally{await browser.close();await new Promise(done=>server.close(done));}
