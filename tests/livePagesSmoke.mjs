import assert from "node:assert/strict";
import {chromium} from "playwright";
import {mkdir} from "node:fs/promises";
const root="https://peanutsdx53-lgtm.github.io/runload-app-v2/";
const tag="20261025-body-v8-r2";
const probes=[["index.html","bodyContextExperience.css?v="+tag],["app.js","bodyContextExperience.js?v="+tag],["ui/bodyContextExperience.js","data-region-focus"]];
let valid=false;
for(let i=1;i<=25;i++){
 try{
  const data=await Promise.all(probes.map(async ([file])=>{
   const r=await fetch(new URL(file+"?check="+tag+"-"+i,root),{cache:"no-store"});
   assert.equal(r.status,200,"HTTP status of "+file);return r.text();
  }));
  valid=probes.every((entry,n)=>data[n].includes(entry[1]));
  if(valid)break;
 }catch(e){console.log("Live check",i,e.message)}
 await new Promise(resolve=>setTimeout(resolve,5000));
}
assert.ok(valid,"GitHub Pages has not served body v8 resources from main");
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 await mkdir("screenshots",{recursive:true});
 for(const mode of [{name:"mobile",width:390,height:844},{name:"desktop",width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:"reduce"});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(root+"?check="+tag+"#/record",{waitUntil:"networkidle",timeout:45000});
  if(await page.locator("[data-onboard-close]").count())await page.locator("[data-onboard-close]").click();
  const entry=page.locator('a[href="#/record-reflection"]');
  assert.ok(await entry.count(),"Manual record must link to body screen");
  await entry.first().click();
  await page.locator(".cx-page").waitFor({timeout:15000});
  assert.equal(await page.locator("[data-region-focus]").count(),5);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.equal(overflow,0,"Responsive overflow");
  await page.locator('[data-region-focus="BA-DISP-019"]').evaluate(el=>el.dispatchEvent(new MouseEvent("click",{bubbles:true})));
  assert.equal(await page.locator(".cx-context strong").innerText(),"膝の前");
  await page.locator('[data-confirm-id="BA-DISP-019"]').click();
  assert.equal(await page.locator(".cx-selected-chip").count(),1);
  if(mode.name==="mobile")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.bottom="auto"});
  await page.screenshot({path:"screenshots/live-body-v8-"+mode.name+".png",fullPage:true});
  assert.deepEqual(errors,[],"Live browser has unexpected script errors");
  await page.close();
 }
}finally{await browser.close()}
console.log("PUBLIC PAGES PASS: body v8 live navigation and interaction on mobile and desktop");
