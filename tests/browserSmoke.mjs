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
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}: {})});
try{
 await mkdir(resolve(root,"screenshots"),{recursive:true});
 const host="http://127.0.0.1:4173/";
 for(const mode of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844},{name:"narrow",width:320,height:740},{name:"wide-phone",width:430,height:932}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,reducedMotion:"reduce"});
  page.on("pageerror",error=>{throw new Error(mode.name+" page error: "+error.message)});
  await page.goto(host+"#/home",{waitUntil:"networkidle"});
  await page.locator("h1").waitFor();
  assert.match(await page.locator("h1").innerText(),/ホーム/);
  if(mode.name!=="desktop"){
    const button=await page.locator(".home-heading-actions>a.btn").boundingBox();
    assert.ok(button&&button.width>=58&&button.height<=46,mode.name+" record button must remain horizontal: "+JSON.stringify(button));
  }
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-viewport.png"),fullPage:false});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  // v2 phase-one My Dashboard: edit, reorder, hide, resize, cancel and persist.
  assert.equal(await page.locator("[data-home-dashboard-id]").count(),6,"six dashboard modules exist");
  await page.evaluate(()=>localStorage.setItem("running-record-mobile-home-layout-v1","legacy-original-must-stay"));
  await page.locator("[data-home-edit]").click();
  assert.equal(await page.locator("[data-widget-action=toggle]").count(),6,"editing controls on six modules");
  assert.equal(await page.locator("[data-home-drag-handle]").count(),6,"all widgets have accessible drag handles");
  // Simulate a genuine pointer-stream after a 350ms long hold. The root uses
  // elementFromPoint, so coordinates pass through browser layout and CSS.
  await page.evaluate(()=>{
    const h=document.querySelector('[data-home-dashboard-id="condition"] [data-home-drag-handle]');
    const rect=h.getBoundingClientRect();
    const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    h.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:73,isPrimary:true,button:0,clientX:x,clientY:y}));
  });
  await page.waitForTimeout(385);
  // Move the scroller while the long-press gesture is armed, as the real edge
  // auto-scroll does when the user drags a tall card towards the bottom.
  await page.evaluate(()=>{
    const box=document.querySelector('[data-home-dashboard-id="latest"]').getBoundingClientRect();
    const desiredBottom=innerHeight-115;
    if(box.bottom>desiredBottom)window.scrollBy(0,box.bottom-desiredBottom);
  });
  const dragProbe=await page.evaluate(()=>{
    const target=document.querySelector('[data-home-dashboard-id="latest"]');
    const t=target.getBoundingClientRect();
    const x=t.left+t.width/2,y=t.top+t.height*.77;
    window.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:73,isPrimary:true,button:0,clientX:x,clientY:y}));
    const dropTarget=document.querySelector(".dashboard-widget--drop-after");
    const selected=dropTarget?.dataset.homeDashboardId||null;
    window.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:73,isPrimary:true,button:0,clientX:x,clientY:y}));
    return {selected,x,y,viewport:innerHeight};
  });
  assert.equal(dragProbe.selected,"latest",mode.name+" drag drop should show an after-target marker: "+JSON.stringify(dragProbe));
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"latest","long press drag must reorder in draft");
  assert.equal(await page.evaluate(()=>localStorage.getItem("runload-v2-home-dashboard-layout-v1")),null,"drag must not silently write preferences");
  await page.locator("[data-home-cancel]").click();
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"condition","cancel must restore drag edits");
  await page.locator("[data-home-edit]").click();
  // A stray early swipe before the long-press threshold must leave the order unchanged.
  await page.evaluate(()=>{
    const h=document.querySelector('[data-home-dashboard-id="condition"] [data-home-drag-handle]');
    const rect=h.getBoundingClientRect(),x=rect.x+rect.width/2,y=rect.y+rect.height/2;
    h.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:74,isPrimary:true,button:0,clientX:x,clientY:y}));
    window.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:74,isPrimary:true,button:0,clientX:x+20,clientY:y+25}));
    window.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:74,isPrimary:true,button:0,clientX:x+20,clientY:y+25}));
  });
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"condition","early swipe must not reorder");
  if(mode.name!=="desktop"){
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.evaluate(()=>{
      const h=document.querySelector('[data-home-dashboard-id="condition"] [data-home-drag-handle]');
      const r=h.getBoundingClientRect();
      h.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"touch",pointerId:75,button:0,isPrimary:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2}));
    });
    await page.waitForTimeout(370);
    await page.evaluate(()=>{
      window.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,cancelable:true,pointerType:"touch",pointerId:75,button:0,isPrimary:true,clientX:140,clientY:innerHeight-78}));
    });
    await page.waitForTimeout(150);
    const scrolled=await page.evaluate(()=>window.scrollY);
    assert.ok(scrolled>0,mode.name+" long drag near bottom should auto-scroll, got "+scrolled);
    await page.evaluate(()=>window.dispatchEvent(new PointerEvent("pointercancel",{bubbles:true,pointerType:"touch",pointerId:75,isPrimary:true})));
    assert.equal(await page.locator(".dashboard-drag-ghost").count(),0,"cancel must remove drag ghost");
    assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"condition","cancel must preserve draft order");
  }


  if(mode.name!=="desktop"){
    await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-editing-viewport.png"),fullPage:false});
    await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
    await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-editing.png"),fullPage:true});
    await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  }

  await page.locator("[data-widget-id=condition][data-widget-action=size]").click();
  await page.locator("[data-widget-id=condition][data-widget-action=down]").click();
  await page.locator("[data-widget-id=topics][data-widget-action=toggle]").click();
  assert.ok(await page.locator("[data-home-dashboard-id=topics]").isVisible(),"hidden module must remain editable");
  await page.locator("[data-home-cancel]").click();
  assert.equal(await page.locator("[data-home-dashboard-id=condition]").getAttribute("class")?.then(s=>s.includes("dashboard-widget--wide")),false,"cancel restores default size");
  assert.equal(await page.locator("[data-home-dashboard-id=topics]").getAttribute("class")?.then(s=>s.includes("dashboard-widget--hidden")),false,"cancel restores visibility");
  await page.locator("[data-home-edit]").click();
  await page.locator("[data-widget-id=condition][data-widget-action=down]").click();
  await page.locator("[data-widget-id=condition][data-widget-action=size]").click();
  await page.locator("[data-widget-id=topics][data-widget-action=toggle]").click();
  await page.locator("[data-home-save]").click();
  const saved=await page.evaluate(()=>({
    pref:JSON.parse(localStorage.getItem("runload-v2-home-dashboard-layout-v1")),
    legacy:localStorage.getItem("running-record-mobile-home-layout-v1")
  }));
  assert.equal(saved.pref.order[0],"latest");
  assert.equal(saved.pref.sizes.condition,"full");
  assert.ok(!saved.pref.visible.includes("topics"));
  assert.equal(saved.legacy,"legacy-original-must-stay","must never overwrite authoritative app prefs");
  await page.reload({waitUntil:"networkidle"});
  assert.equal(await page.locator("[data-home-dashboard-id]").count(),5,"hide persisted after reload");
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"latest","reorder persisted");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-customized.png"),fullPage:true});
  await page.locator("[data-home-edit]").click();
  await page.locator("[data-home-reset]").click();
  await page.locator("[data-home-save]").click();
  assert.equal(await page.locator("[data-home-dashboard-id]").count(),6,"reset restores widgets");
  // Keep the rest of this test based on a normal home composition.
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
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result-viewport.png"),fullPage:false});
  if(mode.name!=="desktop"){
    // The real fixed bottom nav appears naturally in the viewport capture.
    // For a full-document review, place it after the document so it cannot mask sections.
    await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
  }
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result.png"),fullPage:true});
  if(mode.name!=="desktop"){
    await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  }
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
  if(mode.name!=="desktop"){
    const fit=await page.locator(".explore-topic-detail .topic-index").evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).whiteSpace==="nowrap"&&el.scrollWidth<=el.clientWidth+1));
    assert.ok(fit,mode.name+" exploration topic numbers must not wrap");
  }
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-tree-viewport.png"),fullPage:false});
  if(mode.name!=="desktop"){
    await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
    await page.locator(".mobile-explore-sheet").evaluate(el=>{el.style.position="static";el.style.inset="auto";el.style.transform="none"});
  }
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-tree.png"),fullPage:true});
  if(mode.name!=="desktop"){
    await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
    await page.locator(".mobile-explore-sheet").evaluate(el=>{el.style.position="";el.style.inset="";el.style.transform=""});
  }
  await page.locator("[data-install-app]").first().click();
  assert.ok(await page.locator(".install-dialog").isVisible());
  await page.locator(".install-dialog [data-install-dismiss]").click();
  assert.equal(await page.locator(".install-dialog").count(),0);
  await page.goto(host+"#/record",{waitUntil:"networkidle"});
  assert.equal(await page.locator("[data-activity-type]").count(),4,"four record activity categories");
  assert.equal(await page.locator("[data-feeling]").count(),5,"five visual mood options");
  await page.locator("[data-activity-type=walk]").click();
  assert.equal(await page.locator("[data-activity-type=walk]").getAttribute("aria-pressed"),"true");
  await page.locator("[data-draft=distance]").fill("7.25");
  await page.locator("[data-draft=minutes]").fill("45");
  await page.locator("[data-draft=memo]").fill("自分のペースで走った");
  await page.locator("[data-feeling=regular]").click();
  assert.equal(await page.locator("[data-feeling=regular]").getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator("[data-draft=distance]").inputValue(),"7.25","distance retained across mood rerender");
  assert.equal(await page.locator("[data-draft=memo]").inputValue(),"自分のペースで走った","notes retained across mood rerender");
  await page.locator("[data-record-type=rest]").click();
  assert.equal(await page.locator("[data-draft=distance]").count(),0);
  await page.locator("[data-record-type=run]").click();
  assert.equal(await page.locator("[data-draft=distance]").inputValue(),"7.25","inputs retained across record types");
  await page.locator("[data-demo-save]").click();
  assert.ok(await page.locator(".record-preview-dialog").isVisible(),"review dialog is opened, not a fictitious saved result");
  assert.match(await page.locator(".record-preview-dialog").innerText(),/まだ正式な記録保存を行いません/);
  await page.locator(".record-preview-dialog [data-close-preview]").click();
  assert.equal(await page.locator(".record-preview-dialog").count(),0);
  if(mode.name!=="desktop"){
    const bounds=await page.evaluate(()=>{
      const el=selector=>{const r=document.querySelector(selector)?.getBoundingClientRect();if(!r)throw Error("missing "+selector);return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}};
      const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
      return {distance:el(".record-distance"),duration:el(".record-duration"),moodLabels:[...document.querySelectorAll(".feeling-choice small")].map(x=>x.getBoundingClientRect().height),bodyWidth:document.documentElement.scrollWidth,viewport:innerWidth};
    });
    assert.ok(bounds.bodyWidth-bounds.viewport<=3,mode.name+" record overflows horizontally");
    assert.ok(bounds.moodLabels.every(h=>h>=10),mode.name+" mood labels unreadable");
  }
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
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+"-viewport.png"),fullPage:false});
   if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+".png"),fullPage:true});
   if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
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
