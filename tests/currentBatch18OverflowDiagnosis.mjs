import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=resolve(root,'audit-output');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const n=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);const f=resolve(root,'.'+n);if(!(f===root||f.startsWith(root+sep)))throw Error('Traversal');const p=f===root?resolve(root,'index.html'):f;const b=await readFile(p);res.setHeader('Content-Type',{'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml'}[extname(p)]||'application/octet-stream');res.end(b);}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(done=>server.listen(4399,'127.0.0.1',done));
const cases=[['S06','record-rof',320],['S08','record-review',390],['S14','history?life=1',320],['S15','consultation',1440],['S15','consultation',320],['S16','settings',320],['S17','measurement',390],['S18','simulation',320]];
const results=[];
for(const [engine,t] of [['chromium',chromium],['webkit',webkit]]){let b;try{
 b=await t.launch({headless:true,...(engine==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
 const ctx=await b.newContext({viewport:{width:390,height:844}});const page=await ctx.newPage();
 page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 for(const [id,route,width] of cases){
  await page.setViewportSize({width,height:900});
  await page.goto('http://127.0.0.1:4399/#/'+route,{waitUntil:'networkidle',timeout:15000});
  const res=await page.evaluate(()=>({page_scroll:document.documentElement.scrollWidth,inner:window.innerWidth,
   offending:[...document.querySelectorAll('main *')].map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,cls:typeof e.className==='string'?e.className.slice(0,130):'',id:e.id||'',text:e.textContent?.trim().slice(0,80)||'',left:Math.round(r.left),right:Math.round(r.right),width:Math.round(r.width),scrollWidth:e.scrollWidth,overflowX:s.overflowX,display:s.display,whiteSpace:s.whiteSpace};}).filter(x=>x.right>window.innerWidth+3||x.width>window.innerWidth+3).sort((a,b)=>(b.right-b.width*0)-(a.right-a.width*0)).slice(0,18)}));
  results.push({engine,id,route,width,...res});
 }
 await ctx.close();
 }catch(e){results.push({engine,error:String(e)});} finally{if(b)await b.close();}}
server.close();
await writeFile(resolve(out,'overflow-dom-diagnosis.json'),JSON.stringify(results,null,2));
console.log('DIAG',results.length,'cases',results.filter(x=>x.page_scroll>x.inner+2).length,'overflow');
