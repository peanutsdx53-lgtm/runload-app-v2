import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const candidate=resolve(root,'.'+name);
  if(candidate!==root&&!candidate.startsWith(root+sep))throw Error('outside project');
  const file=candidate===root?resolve(root,'index.html'):candidate;
  res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');
  res.end(await readFile(file));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(done=>server.listen(4333,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
await mkdir(resolve(root,'screenshots'),{recursive:true});
try{
 for(const width of [320,390,768,1440]){
  const context=await browser.newContext({viewport:{width,height:width===1440?900:820},serviceWorkers:'allow',reducedMotion:'reduce'});
  await context.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4333/#/learning',{waitUntil:'networkidle'});
  await page.locator('.lr-root .lr-catalog').waitFor();
  const previousStore=await page.evaluate(()=>({notes:localStorage.getItem('runload-v2-exploration-notes-v1'),manual:localStorage.getItem('runload-v2-manual-runs-v2')}));
  assert.equal(await page.locator('.lr-course').count(),8);
  assert.equal(await page.locator('.lr-coming').count(),7);
  assert.equal(await page.locator('a[href="#/learning?lesson=pace-basics"]').count(),1);
  assert.ok(await page.getByRole('link',{name:'学習',exact:true}).count()>=1,'learning has an independent nav link');
  const dims=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth,nav:[...document.querySelectorAll('.mobile-nav .mobile-link')].map(e=>({top:e.getBoundingClientRect().top,visible:getComputedStyle(e).display!=='none'}))}));
  assert.ok(dims.doc<=dims.w+3,'catalog overflow at '+width+' '+JSON.stringify(dims));
  if(width<=800)assert.ok(dims.nav.every(x=>Math.abs(x.top-dims.nav[0].top)<3),'mobile nav has a single row at '+width);
  await page.locator('a[href="#/learning?lesson=pace-basics"]').click();
  await page.locator('.lr-root #lr-first').waitFor();
  assert.match(await page.locator('.lr-hero h1').innerText(),/平均ペースと区間ペース/);
  assert.equal(await page.locator('[data-lr-calc]').innerText(),'合計 12分 ／ 平均 6:00/km');
  await page.locator('#lr-first').evaluate(input=>{input.value='5';input.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.locator('[data-lr-second]').innerText(),'7分');
  assert.equal(await page.locator('[data-lr-first]').innerText(),'5分');
  assert.equal(await page.locator('[data-lr-calc]').innerText(),'合計 12分 ／ 平均 6:00/km');
  const before=await page.evaluate(()=>location.hash);
  await page.locator('[data-lr-jump="lr-review"]').click();
  assert.equal(await page.evaluate(()=>location.hash),before,'lesson index should not navigate to a nonroute hash');
  await page.locator('[name=q1][value="0"]').check();
  await page.locator('[name=q2][value="1"]').check();
  await page.locator('[name=q3][value="0"]').check();
  await page.locator('[data-lr-quiz] [type=submit]').click();
  assert.match(await page.locator('[data-lr-feedback=q1]').innerText(),/もう一度/);
  assert.match(await page.locator('[data-lr-feedback=q2]').innerText(),/正解/);
  assert.match(await page.locator('[data-lr-feedback=q3]').innerText(),/正解/);
  assert.equal((await page.locator('[data-lr-feedback]:visible').count()),3);
  const dims2=await page.evaluate(()=>({w:innerWidth,doc:document.documentElement.scrollWidth}));
  assert.ok(dims2.doc<=dims2.w+3,'lesson overflow at '+width+' '+JSON.stringify(dims2));
  await page.screenshot({path:resolve(root,'screenshots','learning-'+width+'-lesson.png'),fullPage:false,animations:'disabled'});
  await page.locator('#lr-explore a[href^="#/exploration-tree"]').click();
  await page.locator('[data-ex-learning="distance-time-pace"]').waitFor();
  assert.match(await page.locator('.ex-learning-head').first().innerText(),/知ってみよう/);
  const noMutation=await page.evaluate(()=>({notes:localStorage.getItem('runload-v2-exploration-notes-v1'),manual:localStorage.getItem('runload-v2-manual-runs-v2')}));
  assert.deepEqual(noMutation,previousStore,'learning and discovery must not mutate saved runs or old notes');
  await page.goto('http://127.0.0.1:4333/#/learning?lesson=unknown',{waitUntil:'networkidle'});
  assert.match(await page.locator('#runload-learning').innerText(),/この授業はまだ利用できません/);
  assert.deepEqual(errors,[],'browser errors '+width+' '+JSON.stringify(errors));
  if(width===390){
   await page.goto('http://127.0.0.1:4333/#/learning?lesson=pace-basics',{waitUntil:'networkidle'});
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:25000});
   const cached=await page.evaluate(async()=>{
    const reg=await navigator.serviceWorker.ready;
    const cache=await caches.open('runload-ui-next-shell-20261107-learning-foundation-v1');
    const base=location.origin+'/';
    return {registered:!!reg.active,js:!!(await cache.match(base+'ui/learningExperience.js?v=20261107-first-lesson-v1')),css:!!(await cache.match(base+'ui/learningExperience.css?v=20261107-foundation-v1'))};
   });
   assert.deepEqual(cached,{registered:true,js:true,css:true},'learning assets cached for offline');
   await context.setOffline(true);
   await page.reload({waitUntil:'load',timeout:20000});
   await page.locator('#lr-first').waitFor();
   assert.equal(await page.locator('.lr-review .lr-question').count(),3);
  }
  await context.close();
  console.log('PASS learning candidate at '+width+'px');
 }
}finally{await browser.close();await new Promise(done=>server.close(done));}
