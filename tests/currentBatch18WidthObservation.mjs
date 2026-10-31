/** Independent Current batch-18 browser-width observation. Not a formal C-09 acceptance by itself. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const out=resolve(root,'audit-output');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{try{
 const n=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 const f=resolve(root,'.'+n);if(!(f===root||f.startsWith(root+sep)))throw Error('Traversal');
 const file=f===root?resolve(root,'index.html'):f;
 const bytes=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(bytes);
}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(done=>server.listen(4398,'127.0.0.1',done));
const screens=[
['S01','home',false],['S02','home',false],['S03','record-start',false],
['S04','record',false],['S05','record-course',false],['S06','record-rof',false],
['S07','record-more',false],['S08','record-review',false],
['S09','result',true],['S10','history',true],['S11','exploration-tree',false],
['S12','exploration-tree?category=01&topic='+encodeURIComponent('距離・時間・ペース'),false],
['S13','exploration-tree?category=01&topic='+encodeURIComponent('距離・時間・ペース'),true],
['S14','history?life=1',true],['S15','consultation',false],['S16','settings',false],
['S17','measurement',false],['S18','simulation',true],['S19','result',true],['S20','settings',false]];
const widths=[['small_320',320,720],['small_375',375,812],['phone_390',390,844],['wide_phone_430',430,932],['desktop_1440',1440,900]];
let entries=[],errors=[];
for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
 let browser=null;
 try{
 browser=await browserType.launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 page.addInitScript(()=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'}));});
 let js=[];
 page.on('pageerror',e=>js.push(String(e)));
 const base='http://127.0.0.1:4398/#/';
 const observe=async(id,kind,width,height,path,needData)=>{
  const t0=Date.now(),start=js.length;
  await page.setViewportSize({width,height});
  let loadErr='';
  try{
   await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:14000});
   await page.locator('main.main-content').waitFor({timeout:6000});
   await page.waitForTimeout(100);
  }catch(e){loadErr=String(e).slice(0,260);}
  let metrics={};
  try{metrics=await page.evaluate(()=>({
   scrollWidth:document.documentElement.scrollWidth,
   clientWidth:document.documentElement.clientWidth,
   innerWidth:window.innerWidth,
   scrollHeight:document.documentElement.scrollHeight,
   h1:[...document.querySelectorAll('h1')].map(x=>x.textContent?.trim()).filter(Boolean).slice(0,3),
   controls:[...document.querySelectorAll('a[href],button,input,textarea,select,[tabindex]')].filter(x=>{const r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>0&&r.height>0&&s.visibility!=='hidden'}).length,
   links:[...document.querySelectorAll('a[href]')].length,
   tabCount:document.querySelectorAll('.rv4-mobile-tabs [data-tab]').length
  }));}catch(e){loadErr+=(String(e).slice(0,180));}
  let focus='';
  if(kind==='keyboard_focus'){try{
   await page.keyboard.press('Tab');await page.keyboard.press('Tab');
   focus=await page.evaluate(()=>{const e=document.activeElement;return e?.getAttribute('aria-label')||e?.textContent?.trim().slice(0,60)||e?.tagName||'NONE';});
  }catch(e){focus='ERROR:'+String(e).slice(0,80);}}
  const rec={engine,case_id:id,kind,screen_id:id.split('-')[0],width,height,route:path,requires_record:needData,
   loading_error:loadErr,js_errors:js.slice(start),...metrics,keyboard_focus:focus,elapsed_ms:Date.now()-t0};
  rec.width_overflow=metrics.scrollWidth>metrics.innerWidth+2;
  if((rec.width_overflow||loadErr||rec.js_errors.length)&&entries.filter(x=>x.engine===engine&&(x.width_overflow||x.loading_error)).length<8)
   {try{await page.screenshot({path:resolve(out,engine+'-'+id.replace(/[^a-zA-Z0-9_-]/g,'_')+'.png'),fullPage:true,timeout:7000});}catch{}}
  entries.push(rec);
 };
 for(const [screen,path,needData] of screens){
  for(const [suffix,w,h] of widths)await observe(screen+'-'+suffix,'viewport',w,h,path,needData);
  await observe(screen+'-keyboard','keyboard_focus',390,844,path,needData);
  // 200% CSS zoom approximates effective CSS layout width; NOT native browser zoom certification.
  try{await page.evaluate(()=>document.documentElement.style.zoom='2');}catch{}
  await observe(screen+'-zoom_200','zoom_and_reflow',390,844,path,needData);
  try{await page.evaluate(()=>document.documentElement.style.zoom='');}catch{}
 }
 await context.close();
 }catch(e){errors.push({engine,error:String(e),stack:String(e?.stack).slice(0,500)});}
 finally{if(browser)await browser.close();}
}
server.close();
const summary={source_sha:'22ca778531eae25464c67d01099f74be5dd63920',
 expected_total:280,observed:entries.length,by_engine:Object.fromEntries(['chromium','webkit'].map(e=>[e,entries.filter(x=>x.engine===e).length])),
 overflow_count:entries.filter(x=>x.width_overflow).length,
 error_count:entries.filter(x=>x.loading_error||x.js_errors.length).length,
 limitations:['Navigation/viewports and keyboard focus are preliminary observations, not full 20-screen state contract verification','S09/S13/S14/S18/S19 require saved test records for meaningful content; this batch observes initial state only','200% test is CSS zoom approximation, not native browser 200% text-only zoom','S19 and S20 are cross-cutting features, not independent screen URLs'],errors};
await writeFile(resolve(out,'140-case-browser-observation.json'),JSON.stringify({summary,entries},null,2));
console.log('AUDIT_SUMMARY',JSON.stringify(summary));
