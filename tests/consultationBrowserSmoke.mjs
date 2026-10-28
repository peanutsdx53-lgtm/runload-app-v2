import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=resolve(root,'.'+path);
  if(target!==root&&!target.startsWith(root+sep))throw Error('not allowed');
  const actual=target===root?resolve(root,'index.html'):target;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4181,'127.0.0.1',done));
const useWebKit=process.env.RUNLOAD_BROWSER==='webkit';
const browser=await (useWebKit?webkit:chromium).launch({headless:true,...(!useWebKit&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  await page.goto('http://127.0.0.1:4181/#/consultation',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#runload-consultation').count(),1,`${name}: route`);
  assert.equal(await page.locator('.cp-body-view').count(),3,`${name}: three official diagrams`);
  assert.match(await page.locator('#cp-target option').first().innerText(),/保存された運動記録がありません/);
  const saved=await page.evaluate(async()=>{
   const m=await import('./ui/manualRunStore.js');
   return m.saveManualRun(localStorage,{date:'2026-10-27',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:3,rofAfter:6,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',courseName:'川沿い',shoeName:'シューズ',memo:'記録'});
  });
  assert.equal(saved.ok,true,`${name}: fixture save ${saved.reason||''}`);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('[data-metric2-val]').first().innerText(),/5\.00 km/);
  await page.locator('#cp-purpose').fill('指導者に伝えたいこと');
  assert.equal(await page.locator('[data-report-purpose]').innerText(),'指導者に伝えたいこと');
  await page.locator('[data-mode-button="period"]').click();
  assert.match(await page.locator('.cp-trend-holder').last().locator('svg').getAttribute('aria-label'),/距離km/);
  assert.equal(await page.locator('.cp-body-view').count(),3);
  if(name==='mobile')await page.locator('[data-switch="preview"]').click();
  if(!useWebKit){const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});assert.ok(pdf.length>10000,`${name}: PDF file size`);}

  // One focused print-integrity probe only; existing layout/record tests are reused.
  if(!useWebKit&&name==='desktop'){
   const out=resolve(root,'screenshots');await mkdir(out,{recursive:true});
   const longValue=key=>(key+'：'+'日本語の相談文・共有範囲の確認。'.repeat(100)).slice(0,1180)+'【'+key+'完了】';
   for(const mode of ['single','period']){
    await page.locator('[data-mode-button="'+mode+'"]').click();
    for(const key of ['purpose','observation','question'])await page.locator('#cp-'+key).fill(longValue(key));
    const longText=await page.locator('[data-report-question]').innerText();
    assert.ok(longText.length>1000,'stress test must contain a long report narrative');
    assert.match(longText,/【question完了】/,'long message reaches the report before printing');
    await page.locator('input[data-share="body"]').uncheck();
    await page.emulateMedia({media:'print'});
    const visibility=await page.evaluate(()=>({
     hiddenSections:[...document.querySelectorAll('[data-output-section="body"]')].every(e=>getComputedStyle(e).display==='none'),
     visibleSheets:[...document.querySelectorAll('.cp-paper-scale')].filter(e=>getComputedStyle(e).display!=='none').length,
     paperHeights:[...document.querySelectorAll('.cp-paper-scale')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect().height),
     pageHeight:297/25.4*96
    }));
    assert.equal(visibility.hiddenSections,true,'body reference opt-out removes print output');
    assert.ok(visibility.visibleSheets>=2&&visibility.visibleSheets<=4,'selected report sheets only');
    const file=resolve(out,'consultation-print-'+mode+'-long-optout.pdf');
    const longPdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
    assert.ok(longPdf.length>11000,'long report PDF emitted');
    await writeFile(file,longPdf);
    await page.emulateMedia({media:'screen'});
    await page.locator('input[data-share="body"]').check();
    console.log('PRINT QA',mode,JSON.stringify(visibility),'pdf bytes',longPdf.length);
   }
  }
  assert.equal(errs.length,0,`${name}: browser exceptions: ${errs.join('; ')}`);
  console.log('PASS',useWebKit?'webkit':'chromium',name,'consultation / report / print');
  await page.close();
 }
}finally{await browser.close();server.close();}
