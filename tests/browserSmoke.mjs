import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".webmanifest":"application/manifest+json",".svg":"image/svg+xml",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);
  const file=resolve(root,"."+name.replace(/^\//,"/")); // normalize within project root
  if(!(file===root||file.startsWith(root+sep)))throw new Error("outside root");
  const real=file===root?resolve(root,"index.html"):file;
  const bytes=await readFile(real);
  res.setHeader("Content-Type",mime[extname(real)]||"application/octet-stream");
  res.end(bytes);
 }catch(e){res.statusCode=404;res.end("Not found")}
});
await new Promise(resolve=>server.listen(4173,"127.0.0.1",resolve));
const browser=await chromium.launch({headless:true});
try{
 await mkdir(resolve(root,"screenshots"),{recursive:true});
 const host="http://127.0.0.1:4173/";
 for(const mode of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844},{name:"narrow",width:320,height:740}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,reducedMotion:"reduce"});
  page.on("pageerror",error=>{throw new Error(mode.name+" page error: "+error.message)});
  await page.goto(host+"#/home",{waitUntil:"networkidle"});
  await page.locator("h1").waitFor();
  assert.match(await page.locator("h1").innerText(),/ホーム/);
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home.png"),fullPage:true});
  await page.goto(host+"#/result",{waitUntil:"networkidle"});
  await page.locator(mode.name==="desktop"?".region-tile":".mobile-region-row").first().waitFor();
  assert.equal(await page.locator(".region-tile").count(),12);
  assert.equal(await page.locator(".body-view").count(),3);
  if(mode.name==="desktop"){
    await page.locator(".region-tile").filter({hasText:"太ももの前"}).click();
  }else{
    assert.equal(await page.locator(".mobile-region-row").count(),5,"mobile result shows a compact five-row preview");
    assert.equal(await page.locator(".mobile-region-row .region-picto").count(),5,"each shown region uses official body-vector artwork");
    const iconsClipped=await page.locator(".mobile-region-row .region-picto").evaluateAll(icons=>icons.every(icon=>getComputedStyle(icon).overflow==="hidden"));
    assert.ok(iconsClipped,"SVG icons must crop artwork inside their row bounds");
    await page.locator("[data-expand-regions]").click();
    assert.equal(await page.locator(".mobile-region-row").count(),12,"all official regions remain accessible");
    await page.locator(".mobile-region-row").filter({hasText:"太ももの前"}).click();
    await page.locator("[data-expand-regions]").click();
    assert.equal(await page.locator(".mobile-region-row").count(),5,"compact list can be collapsed");
  }
  assert.match(await page.locator("#selected-detail .selected-name").innerText(),/太ももの前/);
  if(mode.name==="desktop"){
    await page.locator(".region-tile[data-region='BA-DISP-023']").click();
  }else{
    await page.locator("[data-expand-regions]").click();
    await page.locator(".mobile-region-row[data-region='BA-DISP-023']").click();
    await page.locator("[data-expand-regions]").click();
  }
  assert.match(await page.locator("#selected-detail .selected-name").innerText(),/ふくらはぎ/);
  if(mode.name!=="desktop"){
    const layout=await page.evaluate(()=>{
      const rect=sel=>{const e=document.querySelector(sel);if(!e)throw Error("missing "+sel);const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
      const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
      const heading=rect("#selected-detail .detail-head h2");
      const region=rect("#selected-detail .selected-name");
      const action=rect("#selected-detail>.section-title>a.btn");
      const score=rect("#selected-detail .mobile-big-value");
      const delta=rect("#selected-detail .mobile-baseline-chip");
      const fatigue=rect(".fatigue-panel");
      const arrow=rect(".fatigue-arrow");
      const before=rect(".fatigue-panel .fatigue-cell:first-child strong");
      const after=rect(".fatigue-panel .fatigue-cell:nth-of-type(2) strong");
      const labels=[...document.querySelectorAll(".radar-panel .radar-label")].map(e=>e.getBoundingClientRect().height);
      return {headingVsRegion:overlaps(heading,region),headingVsButton:overlaps(heading,action),regionVsButton:overlaps(region,action),scoreVsDelta:overlaps(score,delta),arrowVsBefore:overlaps(arrow,before),arrowVsAfter:overlaps(arrow,after),radarLabelHeights:labels,bodyWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,fatigueWidth:fatigue.width};
    });
    for(const key of ["headingVsRegion","headingVsButton","regionVsButton","scoreVsDelta","arrowVsBefore","arrowVsAfter"]){
      assert.equal(layout[key],false,mode.name+" overlapping result elements: "+key+" "+JSON.stringify(layout));
    }
    assert.equal(layout.radarLabelHeights.length,6,"all six radar axes must be present");
    assert.ok(layout.radarLabelHeights.every(h=>h>=10),mode.name+" radar labels are too small: "+JSON.stringify(layout.radarLabelHeights));
    assert.ok(layout.bodyWidth-layout.viewportWidth<=3,mode.name+" result horizontal overflow");
    console.log("PASS",mode.name,"non-overlap and legible radar",JSON.stringify(layout));
  }
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result.png"),fullPage:true});
  await page.goto(host+"#/exploration-tree",{waitUntil:"networkidle"});
  await page.locator(".exploration-stage").waitFor();
  assert.equal(await page.locator(".tree-desktop .tree-hub").count(),7,"desktop tree has 7 domains");
  assert.equal(await page.locator(".tree-desktop .tree-leaf").count(),28,"desktop tree has 28 topic leaves");
  assert.equal(await page.locator(".tree-mobile .tree-bubble").count(),7,"mobile tree has 7 selectable domains");
  assert.equal(await page.locator(".tree-decoration").count(),0,"ornamental tree leaves are deferred");
  await page.locator(mode.name==="desktop"?".tree-desktop .tree-hub[data-tree-category='04']":".tree-mobile .tree-hub[data-tree-category='04']").click();
  if(mode.name!=="desktop"){
    assert.ok(await page.locator(".mobile-explore-sheet").isVisible(),"mobile theme bottom sheet");
    await page.locator("[data-sheet-expand]").click();
    assert.ok(await page.locator(".mobile-explore-sheet.is-expanded").isVisible(),"expanded panel");
    await page.locator("[data-sheet-expand]").click();
    assert.ok(await page.locator(".mobile-explore-sheet:not(.is-expanded)").isVisible(),"preview panel");
    await page.locator(".mobile-sheet-title [data-sheet-toggle]").click();
    assert.ok(await page.locator(".mobile-explore-sheet.is-hidden").isVisible(),"close theme bottom sheet");
    await page.locator(".mobile-sheet-title [data-sheet-toggle]").click();
    assert.ok(await page.locator(".mobile-sheet-insight").isVisible(),"reopen theme bottom sheet");
  }
  assert.match(await page.locator(".explore-topic-header").innerText(),/疲れと回復/);
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-tree.png"),fullPage:true});
  await page.locator("[data-install-app]").first().click();
  assert.ok(await page.locator(".install-dialog").isVisible());
  await page.locator(".install-dialog [data-install-dismiss]").click();
  assert.equal(await page.locator(".install-dialog").count(),0);
  await page.goto(host+"#/record",{waitUntil:"networkidle"});
  assert.equal(await page.locator("[data-activity-type]").count(),4,"four record activity categories");
  assert.equal(await page.locator("[data-feeling]").count(),5,"five visual mood options");
  await page.locator("[data-activity-type=walk]").click();
  assert.equal(await page.locator("[data-activity-type=walk]").getAttribute("aria-pressed"),"true");
  await page.locator("[data-feeling=regular]").click();
  assert.equal(await page.locator("[data-feeling=regular]").getAttribute("aria-pressed"),"true");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-record-active.png"),fullPage:true});
  await page.goto(host+"#/history",{waitUntil:"networkidle"});
  assert.equal(await page.locator(".calendar-day").count(),31,"calendar days in October");
  assert.equal(await page.locator(".calendar-day.has-entry").count(),3,"recorded dates are indicated");
  await page.locator('[data-history-day="12"]').click();
  assert.match(await page.locator(".history-records h3").innerText(),/12日/);
  assert.equal(await page.locator(".history-records .timeline-item").count(),1,"date filter narrows records");
  await page.locator("[data-history-clear]").click();
  assert.equal(await page.locator(".history-records .timeline-item").count(),3,"clear restores list");
    for(const route of ["record","history","settings","measurement","course","simulation","consultation","body-part-detail"]){
   await page.goto(host+"#/"+route,{waitUntil:"networkidle"});
   await page.locator("h1").waitFor();
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+".png"),fullPage:true});
   assert.ok((await page.locator("main").innerText()).length>60,route);
   const textContent=await page.locator("main").innerText();
   assert.ok(!/デモ専用|UI 試作版|仮データ|画面確認用/.test(textContent),route+" developer-only text found");
   const routeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(routeOverflow<=3,mode.name+" "+route+" horizontal overflow: "+routeOverflow);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,mode.name+" horizontal overflow: "+overflow);
  await page.close();
  console.log("PASS",mode.name,"home / 12-regions / body maps / tree / install dialog / overflow");
 }
}finally{await browser.close();server.close()}
