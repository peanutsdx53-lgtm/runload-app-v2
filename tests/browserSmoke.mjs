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
  await page.locator(".region-tile").first().waitFor();
  assert.equal(await page.locator(".region-tile").count(),12);
  assert.equal(await page.locator(".body-view").count(),3);
  await page.locator(".region-tile").filter({hasText:"太ももの前"}).click();
  assert.match(await page.locator("#selected-detail .selected-name").innerText(),/太ももの前/);
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
