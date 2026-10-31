/**
 * C09 independent layout diagnostic: 200% CSS zoom at 390px, matching Current batch-18.
 * A diagnostic run is not a WCAG certification, nor a substitute for physical-device testing.
 * It produces source-attributed overflow data and screenshots without silently declaring PASS.
 */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browserType=engineName==='webkit'?webkit:chromium;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=resolve(root,'.'+name);
  if(target!==root&&!target.startsWith(root+sep))throw Error('path');
  const actual=target===root?resolve(root,'index.html'):target;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(ok=>server.listen(4196,'127.0.0.1',ok));
let browser;const reports=[];
try{
 browser=await browserType.launch({headless:true,...(engineName==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 const screenRoutes=[
  ['S08','record-review','.rr-page'],
  ['S15','consultation','#runload-consultation'],
  ['S17','measurement','.gps-v2'],
  ['S18','simulation','.sm-page']
 ];
 for(const [screen,route,selector] of screenRoutes){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  if(screen==='S08'){
   // Populate the real review form; the old C09 failure occurred in a populated state.
   await page.goto('http://127.0.0.1:4196/#/record',{waitUntil:'networkidle'});
   await page.locator('[data-draft="distance"]').fill('5.00');
   await page.locator('[data-draft="minutes"]').fill('30');
   await page.locator('[data-demo-save]').click();
   await page.locator('.rr-page').waitFor();
  }else{
   if(screen==='S15'){
    // Real saved record exposes the report's information-heavy states.
    await page.goto('http://127.0.0.1:4196/#/home',{waitUntil:'networkidle'});
    const result=await page.evaluate(async()=>{
     const [canonical,manual]=await Promise.all([import('/ui/manualRunCanonical.js'),import('/ui/manualRunStore.js')]);
     const init=await canonical.refresh();if(!init.ok)return init;
     return canonical.mutate(s=>manual.saveManualRun(s,{date:'2026-10-30',distance:'5',hours:'',minutes:'30',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',courseName:'',shoeName:'',memo:''}));
    });
    if(!result.ok)throw Error('C09 fixture save: '+result.reason);
   }
   await page.goto('http://127.0.0.1:4196/#/'+route,{waitUntil:'networkidle'});
  }
  const present=await page.locator(selector).count();
  await page.evaluate(()=>{document.documentElement.style.zoom='2'});
  await page.waitForTimeout(150);
  const layout=await page.evaluate(()=>{
   const width=innerWidth;
   const all=[...document.querySelectorAll('body *')];
   const offenders=all.filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.right>width+3})
    .sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right).slice(0,15)
    .map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,120):'',text:(e.innerText||'').trim().slice(0,45),right:Math.round(r.right),width:Math.round(r.width),scroll:e.scrollWidth,client:e.clientWidth}});
   const overflowing=all.filter(e=>{const st=getComputedStyle(e);return e.clientWidth>0&&e.scrollWidth>e.clientWidth+3&&st.overflowX!=='auto'&&st.overflowX!=='scroll'}).sort((a,b)=>(b.scrollWidth-b.clientWidth)-(a.scrollWidth-a.clientWidth)).slice(0,12).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,100):'',scroll:e.scrollWidth,client:e.clientWidth,overflow:getComputedStyle(e).overflowX}));
   const inspect=(selector)=>{const e=document.querySelector(selector);if(!e)return null;const cs=getComputedStyle(e);return {selector,client:e.clientWidth,rect:e.getBoundingClientRect().width,container:cs.containerName,containerType:cs.containerType,display:cs.display,grid:cs.gridTemplateColumns,flexDirection:cs.flexDirection,zoom:cs.zoom};};
   const cssTrace=[
    '.rr-page','.rr-date-line','.rr-metrics','.cp-app .main-content','.cp-workspace','.cp-mode-grid',
    '.gps-v35','.gps-live-steps','.gps-live-time strong','.sm-page','.sm-form-grid','.sm-results-grid'
   ].map(inspect).filter(Boolean);
   return {innerWidth:width,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,offenders,overflowing,cssTrace};
  });
  const result={engine:engineName,screen,route,present,layout,errors};
  reports.push(result);
  assert.equal(errors.length,0,engineName+' '+screen+' no uncaught browser errors');
  assert.ok(present>0,engineName+' '+screen+' target screen must exist');
  if(screen==='S18'){
   const sourceOptions=layout.offenders.filter(x=>x.cls?.includes('sm-source-option'));
   assert.equal(sourceOptions.length,0,engineName+' S18: optional source buttons are cropped outside the 200% viewport');
   const sourceLayout=await page.locator('.sm-source-row').evaluate(el=>({
    display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns,
    clipped:el.scrollWidth>el.clientWidth+3,buttons:[...el.querySelectorAll('button')].map(b=>{
     const r=b.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};
    })
   }));
   assert.equal(sourceLayout.display,'grid',engineName+' S18 must show source choices vertically at 200%');
   assert.equal(sourceLayout.clipped,false,engineName+' S18 all source choices remain operable');
   assert.ok(sourceLayout.buttons.every(b=>b.left>=-3&&b.right<=layout.innerWidth+3),
     engineName+' S18 source choices must stay in the visible viewport: '+JSON.stringify(sourceLayout));
  }
  // This first source-matched CSS zoom check is diagnostic until all recorded regressions are resolved.
  console.log('C09_200_DIAGNOSTIC',JSON.stringify(result));
  if(!present)console.log('::warning::C09 '+engineName+' '+screen+' selector not present: '+selector);
  if(layout.scrollWidth>layout.innerWidth+3)console.log('::warning::C09 '+engineName+' '+screen+' horizontal overflow '+(layout.scrollWidth-layout.innerWidth)+'px');
  await page.screenshot({path:resolve(root,'screenshots','c09-'+engineName+'-'+screen+'-200pct.png'),fullPage:true,animations:'disabled'});
  await page.close();
 }
 await writeFile(resolve(root,'screenshots','c09-'+engineName+'-report.json'),JSON.stringify({scope:'diagnostic_not_acceptance',reports},null,2),'utf8');
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
