import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const root='https://peanutsdx53-lgtm.github.io/runload-app-v2/';
const tag='20261026-course-layout-v31c';
// Check the deployed snapshot against this exact main build. Old version tags must not remain fixed in a future release.
const probes=['index.html','app.js','ui/explorationExperience.js','ui/historyExperience.js'];
const expected=probes.map(file=>readFileSync(new URL('../'+file,import.meta.url),'utf8'));
let valid=false;
for(let i=1;i<=30;i++){
 try{
  const data=await Promise.all(probes.map(async file=>{
   const r=await fetch(new URL(file+'?check='+tag+'-'+i,root),{cache:'no-store'});
   assert.equal(r.status,200,'HTTP '+file);return r.text();
  }));
  valid=probes.every((_,n)=>data[n]===expected[n]);
  if(valid)break;
 }catch(e){console.log('Live Pages pending',i,e.message)}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
assert.ok(valid,'GitHub Pages has not deployed the matching checked-out main snapshot');
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 await mkdir('screenshots',{recursive:true});
 for(const mode of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(err.message));
  await page.goto(root+'?check='+tag+'#/record',{waitUntil:'networkidle',timeout:45000});
  if(await page.locator('[data-onboard-close]').count())await page.locator('[data-onboard-close]').click();
  await page.locator('[data-draft="distance"]').fill('5.20');
  await page.locator('[data-draft="minutes"]').fill('32.5');
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor({timeout:12000});
  assert.match(await page.locator('.rr-metrics').innerText(),/5\.20/);
  assert.match(await page.locator('.rr-metrics').innerText(),/32:30/);
  assert.match(await page.locator('.rr-metrics').innerText(),/6:15/);
  assert.equal(await page.locator('[data-review-link]').count(),5);
  assert.equal(await page.locator('[data-manual-run-save]').isEnabled(),true,'current public release can save eligible manual run');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
  if(mode.name==='mobile')await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
  await page.screenshot({path:'screenshots/live-review-v5-'+mode.name+'.png',fullPage:true});
  await page.locator('[data-review-link="record-reflection"]').click();
  await page.locator('[data-cx-page]').waitFor();
  await page.locator('[data-draft="shoeName"]').fill('確認用シューズ');
  await page.locator('[data-apply]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.match(await page.locator('[data-record-review]').innerText(),/確認用シューズ/);
  assert.deepEqual(errors,[],'Live browser errors');
  await page.close();
 }
const resultCheck=await browser.newPage({viewport:{width:390,height:844}});
try{
 await resultCheck.goto(root+'?check='+tag+'#/result',{waitUntil:'networkidle'});
 if(await resultCheck.locator('[data-onboard-close]').count())await resultCheck.locator('[data-onboard-close]').click();
 const report=resultCheck.locator('#runload-result-v4');
 await report.locator('.rv4-region').first().waitFor({timeout:15000});
 assert.match(await report.locator('.rv4-card-heading').first().innerText(),/速度と身体の反応/);
 assert.equal(await report.locator('[data-download]').isDisabled(),true);
 await resultCheck.screenshot({path:'screenshots/live-result-v4-mobile.png',fullPage:true});
}finally{await resultCheck.close()}
const explorationCheck=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
try{
 await explorationCheck.goto(root+'?check='+tag+'#/exploration-tree',{waitUntil:'networkidle',timeout:45000});
 if(await explorationCheck.locator('[data-onboard-close]').count())await explorationCheck.locator('[data-onboard-close]').click();
 await explorationCheck.locator('[data-ex-learning="slope-running"]').waitFor({timeout:15000});
 await explorationCheck.locator('[data-ex-slope="down"]').click();
 assert.match(await explorationCheck.locator('.ex-tool-result').innerText(),/勢いを受け止める/);
 await explorationCheck.locator('[data-ex-category="02"]').click();
 await explorationCheck.locator('[data-ex-learning="body-movement"]').waitFor();
 await explorationCheck.locator('[data-ex-category="05"]').click();
 await explorationCheck.locator('[data-ex-learning="sleep-recovery"]').waitFor();
 await explorationCheck.locator('[data-ex-action="learn-help"]').click();
  assert.equal(await explorationCheck.locator('.ex-dialog-source[href^="https://doi.org/"]').count(),1,'current learning help links to its source');
 assert.equal(await explorationCheck.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
 await explorationCheck.screenshot({path:'screenshots/live-exploration-v12-mobile.png',fullPage:true});
}finally{await explorationCheck.close()}
}finally{await browser.close()}
console.log('PUBLIC PAGES PASS: matching main release, record review, results and exploration learning');
