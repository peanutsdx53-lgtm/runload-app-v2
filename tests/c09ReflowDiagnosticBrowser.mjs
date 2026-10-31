/**
 * C09 independent layout diagnostic: browser-rendered 200% root font at 390px.
 * A diagnostic run is not a WCAG certification, nor a substitute for physical-device testing.
 * It produces source-attributed overflow data and screenshots without silently declaring PASS.
 */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
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
  await page.goto('http://127.0.0.1:4196/#/'+route,{waitUntil:'networkidle'});
  const present=await page.locator(selector).count();
  await page.evaluate(()=>{document.documentElement.style.fontSize='200%'});
  await page.waitForTimeout(150);
  const layout=await page.evaluate(()=>{
   const width=innerWidth;
   const all=[...document.querySelectorAll('body *')];
   const offenders=all.filter(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.right>width+3&&!e.closest('.mobile-nav')})
    .sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right).slice(0,15)
    .map(e=>{const r=e.getBoundingClientRect();return {tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,120):'',text:(e.innerText||'').trim().slice(0,45),right:Math.round(r.right),width:Math.round(r.width),scroll:e.scrollWidth,client:e.clientWidth}});
   return {innerWidth:width,scrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,offenders};
  });
  const result={engine:engineName,screen,route,present,layout,errors};
  reports.push(result);
  console.log('C09_200_DIAGNOSTIC',JSON.stringify(result));
  if(!present)console.log('::warning::C09 '+engineName+' '+screen+' selector not present: '+selector);
  if(layout.scrollWidth>layout.innerWidth+3)console.log('::warning::C09 '+engineName+' '+screen+' horizontal overflow '+(layout.scrollWidth-layout.innerWidth)+'px');
  await page.screenshot({path:resolve(root,'screenshots','c09-'+engineName+'-'+screen+'-200pct.png'),fullPage:true,animations:'disabled'});
  await page.close();
 }
 await writeFile(resolve(root,'screenshots','c09-'+engineName+'-report.json'),JSON.stringify({scope:'diagnostic_not_acceptance',reports},null,2),'utf8');
}finally{await browser?.close();await new Promise(ok=>server.close(ok))}
