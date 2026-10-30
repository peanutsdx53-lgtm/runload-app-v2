import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".webmanifest":"application/manifest+json",".svg":"image/svg+xml",".png":"image/png"};
async function checkSavedResultPng(page,result,mode,label,required,forbidden){
 await page.evaluate(()=>{
  const proto=CanvasRenderingContext2D.prototype;
  window.__runloadImageAuditText=[];
  if(proto.__runloadOldFillText)return;
  proto.__runloadOldFillText=proto.fillText;
  proto.fillText=function(value,...args){
   if(Array.isArray(window.__runloadImageAuditText))window.__runloadImageAuditText.push(String(value));
   return proto.__runloadOldFillText.call(this,value,...args);
  };
 });
 await page.evaluate(()=>{window.__runloadImageAuditText=[];});
 const [file]=await Promise.all([page.waitForEvent('download'),result.locator('[data-download]').click()]);
 assert.equal(file.suggestedFilename(),'走行結果.png');
 const path=resolve(root,'screenshots',mode.name+'-result-image-'+label+'.png');
 await file.saveAs(path);
 const bytes=await readFile(path);
 assert.ok(bytes.length>12000&&bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'real PNG bytes');
 const drawn=await page.evaluate(()=>window.__runloadImageAuditText);
 for(const word of required)assert.ok(drawn.some(t=>t.includes(word)),label+' missing '+word+' '+JSON.stringify(drawn));
 for(const word of forbidden)assert.ok(!drawn.some(t=>t.includes(word)),label+' incorrectly includes '+word);
 console.log('PASS',mode.name,label,'result PNG provenance');
}

// Inspect card descendants and text fragments; document scrollWidth misses clipped text.
async function assertPaceColumnLayout(ex,mode,state){
 const report=await ex.locator('[data-ex-learning="distance-time-pace"]').evaluate(article=>{
  const card=article.getBoundingClientRect(),focus=article.closest('.ex-focus').getBoundingClientRect();
  const clipped=[],overlaps=[];
  const targets=[article,...article.querySelectorAll('h3,.ex-learning-lead,.ex-tool,.ex-tool h4,.ex-tool-result,.ex-tool-result > *, .ex-learning-link,.ex-note-invite,.ex-note-invite > *')];
  for(const el of targets){
   const r=el.getBoundingClientRect();
   if(r.left<card.left-1.5||r.right>card.right+1.5||el.scrollWidth>el.clientWidth+2)
    clipped.push({item:el.className||el.tagName,right:Math.round(r.right),limit:Math.round(card.right),scroll:el.scrollWidth,client:el.clientWidth});
  }
  for(const el of article.querySelectorAll('h3,.ex-learning-lead,.ex-tool-result > *, .ex-learning-link, .ex-note-invite p, .ex-note-invite strong')){
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){
    if(!node.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const r of range.getClientRects())if(r.width>0&&(r.left<card.left-1.5||r.right>card.right+1.5))
     clipped.push({text:node.textContent.slice(0,20),right:Math.round(r.right),limit:Math.round(card.right)});
   }
  }
  const flow=[...article.children].filter(el=>getComputedStyle(el).display!=='none');
  for(let i=1;i<flow.length;i++)if(flow[i].getBoundingClientRect().top+1<flow[i-1].getBoundingClientRect().bottom)
   overlaps.push({first:flow[i-1].className,second:flow[i].className});
  return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,cardRight:card.right,focusRight:focus.right,
   clipped,overlaps,headingBreak:getComputedStyle(article.querySelector('h3')).wordBreak,
   paragraphBreak:getComputedStyle(article.querySelector('.ex-learning-lead')).overflowWrap};
 });
 assert.ok(report.scrollWidth<=report.viewport+3,mode.name+' '+state+' viewport overflow '+JSON.stringify(report));
 assert.ok(report.cardRight<=report.focusRight-8,mode.name+' '+state+' article escapes panel '+JSON.stringify(report));
 assert.deepEqual(report.clipped,[],mode.name+' '+state+' clipped article '+JSON.stringify(report));
 assert.deepEqual(report.overlaps,[],mode.name+' '+state+' overlapping card sections '+JSON.stringify(report));
 assert.equal(report.headingBreak,'normal');
 assert.equal(report.paragraphBreak,'anywhere');
 console.log('PASS',mode.name,state,'pace card text and geometry');
}
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
 // Dedicated intermediate width QA without doubling the comprehensive suite.
 const tablet=await browser.newPage({viewport:{width:1024,height:768},reducedMotion:'reduce'});
 await tablet.addInitScript(()=>{localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja',formalTermsAccepted:false}))});
 for(const route of ['home','record','history','settings']){
   await tablet.goto(host+'#/'+route,{waitUntil:'networkidle'});
   const overflow=await tablet.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(overflow<=3,'tablet '+route+' overflows viewport: '+overflow);
   if(route==='history'||route==='settings')assert.equal(await tablet.locator('.topbar').isVisible(),false,'tablet '+route+' top header');
   await tablet.screenshot({path:resolve(root,'screenshots','tablet-'+route+'-viewport.png'),fullPage:false});
 }
 await tablet.close();
 for(const mode of [{name:"desktop",width:1440,height:900},{name:"mobile",width:390,height:844},{name:"narrow",width:320,height:740},{name:"wide-phone",width:430,height:932}]){
  if(mode.name==="mobile"){
    const intro=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
    await intro.goto(host+"#/home",{waitUntil:"networkidle"});
    assert.equal(await intro.locator(".onboard-dialog").count(),1,"first-run guide must appear");
    assert.match(await intro.locator("#onboard-title").innerText(),/表示言語/);
    assert.ok(await intro.locator(".fu-unavailable").isDisabled(),"English remains unavailable");
    assert.doesNotMatch(await intro.locator(".onboard-dialog").innerText(),/RUNLOAD|RunLoad|WELCOME|試作版|現在のv2/,"no provisional naming");
    await intro.screenshot({path:resolve(root,"screenshots","mobile-onboarding-language.png"),fullPage:false});
    await intro.locator("[data-onboard-next]").click();
    assert.match(await intro.locator("#onboard-title").innerText(),/利用規約とプライバシー/);
    assert.equal(await intro.locator("[data-onboard-next]").isDisabled(),true);
    await intro.locator('[data-onboard-document="terms"]').click();
    assert.match(await intro.locator(".fu-doc-dialog").innerText(),/運営者の責任/);
    await intro.locator(".fu-doc-dialog [data-legal-dismiss]").first().click();
    await intro.locator('[data-onboard-document="privacy"]').click();
    assert.match(await intro.locator(".fu-doc-dialog").innerText(),/OpenStreetMap/);
    await intro.locator(".fu-doc-dialog [data-legal-dismiss]").first().click();
    await intro.screenshot({path:resolve(root,"screenshots","mobile-onboarding-privacy.png"),fullPage:false});
    await intro.locator("[data-onboard-terms]").check();
    await intro.locator("[data-onboard-privacy]").check();
    await intro.locator("[data-onboard-next]").click();
    for(let i=0;i<5;i++)await intro.locator("[data-onboard-next]").click();
    assert.match(await intro.locator("#onboard-title").innerText(),/プロフィール/);
    await intro.locator("[data-onboard-nickname]").fill("検証用");
    await intro.locator("[data-onboard-purpose]").selectOption("learn");
    await intro.locator("[data-onboard-height]").fill("171.2");
    await intro.locator("[data-onboard-weight]").fill("67.4");
    await intro.locator("[data-onboard-next]").click();
    const pref=await intro.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-introduction-preview-v1")));
    assert.equal(pref.completed,true);
    const consent=await intro.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-legal-consent-v1")));
    assert.equal(consent.termsVersion,"2026-10-28");
    assert.equal(consent.privacyConfirmed,true);
    assert.equal(await intro.locator(".onboard-dialog").count(),0);
    const profile=await intro.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-user-profile-v1")));
    assert.equal(profile.heightCm,171.2);assert.equal(profile.weightKg,67.4);
    await intro.reload({waitUntil:"networkidle"});
    assert.equal(await intro.locator(".onboard-dialog").count(),0);
    await intro.goto(host+"#/settings",{waitUntil:"networkidle"});
    await intro.locator("[data-settings-v2]").waitFor();
    const profilePanel=intro.locator(".s2-item").filter({hasText:"プロフィール"}).first();
    await profilePanel.locator("summary").click();
    assert.equal(await profilePanel.locator('input[name="heightCm"]').inputValue(),"171.2");
    await profilePanel.locator('input[name="weightKg"]').fill("66.8");
    await profilePanel.locator('[data-settings-profile-form] button[type="submit"]').click();
    assert.equal(await intro.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-user-profile-v1")).weightKg),66.8);
    const textPanel=intro.locator(".s2-item").filter({hasText:"文字サイズ"}).first();
    await textPanel.locator("summary").click();await textPanel.locator('[data-settings-text="large"]').click();
    assert.equal(await intro.evaluate(()=>document.documentElement.classList.contains("rl-text-large")),true);
    const tutorialPanel=intro.locator(".s2-item").filter({hasText:"初回ガイド"}).first();
    await tutorialPanel.locator("summary").click();
    await tutorialPanel.locator("[data-onboard-open]").click();
    assert.equal(await intro.locator(".onboard-dialog").count(),1,"tutorial can be reopened in Settings");
    await intro.close();
  }
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:1,reducedMotion:"reduce"});
  await page.addInitScript(()=>{localStorage.setItem("runload-v2-introduction-preview-v1",JSON.stringify({completed:true,language:"ja",formalTermsAccepted:false}))});
  // Test-only GPS provider. No actual physical location or permission request.
  await page.addInitScript(()=>{
    let nextWatch=0,ids=new Map();
    window.__gpsWatchCount=0;
    Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
      watchPosition(success,error){
        window.__gpsWatchCount++;
        const id=++nextWatch,offset=(id-1)*.0006,t=Date.now()-20000;
        const timer1=setTimeout(()=>{if(ids.has(id))success({timestamp:t,coords:{latitude:37.501+offset+(window.__gpsMockLatOffset||0),longitude:139.93,accuracy:8,altitude:300,altitudeAccuracy:10}})},45);
        const timer2=setTimeout(()=>{if(ids.has(id))success({timestamp:t+5000,coords:{latitude:37.50126+offset+(window.__gpsMockLatOffset||0),longitude:139.93,accuracy:8,altitude:302,altitudeAccuracy:10}})},140);
        ids.set(id,[timer1,timer2]);return id;
      },clearWatch(id){for(const handle of ids.get(id)||[])clearTimeout(handle);ids.delete(id);}
    }});
  });
  // Stable tile fixture proves real browser image decoding without hammering the public OSM service.
  const tileHeaders=[];
  let failTiles=false;
  await page.route('https://tile.openstreetmap.org/**',route=>{
    tileHeaders.push(route.request().headers());
    if(failTiles)return route.abort('failed');
    return route.fulfill({status:200,contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAFElEQVR4nGMs3HiMAQaYGJAAbg4AX/8B8LrZM0YAAAAASUVORK5CYII=','base64')});
  });
  page.on("pageerror",error=>{throw new Error(mode.name+" page error: "+error.message)});
  await page.goto(host+"#/home",{waitUntil:"networkidle"});
  await page.locator("h1").waitFor();
  assert.match(await page.locator("h1").innerText(),/ホーム/);
  const homeHeadingTop=await page.locator(".home-head h1").evaluate(el=>el.getBoundingClientRect().top);
  assert.equal(await page.locator("[data-home-dashboard-id]").count(),4,"four core widgets by default");
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"latest");
  if(mode.name==="desktop"){
    const layout=await page.evaluate(()=>{
      const rect=id=>document.querySelector('[data-home-dashboard-id="'+id+'"]').getBoundingClientRect();
      const latest=rect("latest"),condition=rect("condition"),achievement=rect("topics");
      return {latestWidth:latest.width,conditionWidth:condition.width,achievementWidth:achievement.width,
        conditionY:condition.top,achievementY:achievement.top,conditionX:condition.left,achievementX:achievement.left};
    });
    assert.ok(layout.latestWidth>800,"desktop hero must use available content width: "+JSON.stringify(layout));
    assert.ok(Math.abs(layout.conditionY-layout.achievementY)<4,"condition and achievements must be side by side: "+JSON.stringify(layout));
    assert.ok(layout.achievementX>layout.conditionX+layout.conditionWidth-4,"desktop cards are in separate columns: "+JSON.stringify(layout));
  }
  assert.equal(await page.locator(".hx-condition").count(),1);
  assert.equal(await page.locator(".hx-achievement").count(),1);
  assert.match(await page.locator('.hx-achievement').innerText(),/記録を保存すると実績を確認できます/);
  assert.equal(await page.locator(".hx-shortcuts a").count(),3,"shortcuts only point to supplementary functions");
  assert.equal(await page.locator(".home-welcome").count(),0,"no decorative greeting");
  assert.equal(await page.locator(".hx-latest").innerText().then(t=>t.includes("走行記録はまだありません")),true,"never invent recent-run data");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-empty.png"),fullPage:true});
  await page.locator("[data-home-preview]").click();
  assert.match(await page.locator(".hx-preview-banner").innerText(),/説明用の数字/);
  assert.match(await page.locator(".hx-achievement").innerText(),/42.0/);
  assert.match(await page.locator(".hx-condition").innerText(),/5 \/ 7日|5\/7日/);
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-populated-sample.png"),fullPage:true});
  await page.locator("[data-achievement-open]").click();
  assert.ok(await page.locator(".hx-ach-dialog").isVisible(),"achievement detail remains accessible");
  const achievementType=await page.evaluate(()=>({
    text:parseFloat(getComputedStyle(document.querySelector('.hx-ach-dialog p')).fontSize),
    tile:parseFloat(getComputedStyle(document.querySelector('.hx-ach-grid span')).fontSize),
    scroll:document.documentElement.scrollWidth-innerWidth
  }));
  assert.ok(achievementType.text>=14 && achievementType.tile>=14,"achievement detail text legible: "+JSON.stringify(achievementType));
  assert.ok(achievementType.scroll<=1,"no horizontal overflow in achievements");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-achievement-detail-v2.png"),fullPage:false});
  await page.locator("[data-home-close]").first().click();
  await page.locator("[data-condition-open]").click();
  assert.equal(await page.locator(".hx-dialog").count(),1);
  const modalGeometry=await page.evaluate(()=>{
    const dlg=document.querySelector('.hx-dialog'),date=dlg.querySelector('input[type=date]');
    const dr=dlg.getBoundingClientRect(),ir=date.getBoundingClientRect();
    const clockInputs=[...dlg.querySelectorAll('input[type=time]')];
    const bg=getComputedStyle(clockInputs[0]).backgroundColor;
    const timeOverflow=clockInputs.map(el=>({
      overflow:Math.round(el.getBoundingClientRect().right-el.closest('.hx-time-card').getBoundingClientRect().right),
      font:parseFloat(getComputedStyle(el).fontSize)
    }));
    return {dateRight:ir.right,dialogRight:dr.right,dialogScroll:dlg.scrollWidth-dlg.clientWidth,
      bodyLocked:document.body.classList.contains('runload-dialog-open'), background:bg,timeOverflow};
  });
  assert.ok(modalGeometry.dateRight<=modalGeometry.dialogRight-4,"date stays inside modal: "+JSON.stringify(modalGeometry));
  assert.ok(modalGeometry.dialogScroll<=1,"modal has no horizontal scrolling: "+JSON.stringify(modalGeometry));
  assert.ok(modalGeometry.bodyLocked,"background scrolling locked while dialog visible");
  assert.ok(modalGeometry.timeOverflow.every(x=>x.font>=16&&x.overflow<=1)&&!modalGeometry.background.includes("255, 255, 255"),"time fields are readable and contained: "+JSON.stringify(modalGeometry));
  const conditionDateVisual=await page.evaluate(()=>{
    const box=document.querySelector(".hx-dialog .rl-date-control");
    const panel=document.querySelector(".hx-dialog");
    const input=box.querySelector("input[type=date]");
    return {text:box.querySelector("[data-date-display]").textContent,
      width:box.getBoundingClientRect().width,overflow:box.getBoundingClientRect().right-panel.getBoundingClientRect().right,
      transparent:getComputedStyle(input).opacity};
  });
  assert.match(conditionDateVisual.text,/^[0-9]{4}\/[0-9]{2}\/[0-9]{2}$/);
  assert.ok(conditionDateVisual.overflow<=0 && conditionDateVisual.width<=235 && conditionDateVisual.transparent==="0","date native picker remains usable");
  assert.equal(await page.locator('[data-sleep-mode="clock"]').getAttribute("aria-pressed"),"true","clock is default on empty journal");
  assert.match(await page.locator('[data-sleep-result]').innerText(),/—/,"no fake sleep history");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-sleep-clock-empty-v2.png"),fullPage:false});
  await page.locator('[name="bedTime"]').fill("23:20");
  await page.locator('[name="wakeTime"]').fill("06:00");
  assert.equal(await page.locator('[data-time-display="bedTime"]').textContent(),"23:20","clock readout always uses 24-hour time");
  assert.equal(await page.locator('[data-time-display="wakeTime"]').textContent(),"06:00");
  const pickerPresentation=await page.evaluate(()=>{
    const input=document.querySelector('[name="bedTime"]');
    const visible=document.querySelector('[data-time-display="bedTime"]');
    return {nativeOpacity:getComputedStyle(input).opacity,labelVisible:getComputedStyle(visible).display!=="none",font:parseFloat(getComputedStyle(input).fontSize)};
  });
  if(mode.width<=430)assert.deepEqual({opacity:pickerPresentation.nativeOpacity,label:pickerPresentation.labelVisible},{opacity:"0",label:true},"touch-width display keeps the same 24-hour readout and tap target");
  else assert.ok(pickerPresentation.nativeOpacity==="1"&&!pickerPresentation.labelVisible&&pickerPresentation.font>=16,"desktop time field visibly supports keyboard entry");
  assert.match(await page.locator('[data-sleep-result]').innerText(),/6時間40分/);
  assert.match(await page.locator('[data-sleep-result-note]').innerText(),/前日に就寝/);
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-sleep-clock-filled-v2.png"),fullPage:false});
  await page.locator("[data-home-close]").first().click();
  assert.equal(await page.evaluate(()=>document.body.classList.contains("runload-dialog-open")),false,"background unlocks");
  await page.locator("[data-home-preview]").click();
  await page.locator("[data-condition-open]").click();
  await page.locator('[name="bedTime"]').fill("23:20");
  await page.locator('[name="wakeTime"]').fill("06:00");
  await page.locator(".hx-day-details summary").click();
  await page.locator('[name="bedDayRule"][value="same"]').check();
  assert.match(await page.locator('[data-sleep-result-note]').innerText(),/確認/,"same-day invalid if wake earlier");
  await page.locator("[data-condition-form] button[type=submit]").click();
  assert.match(await page.locator("[data-sleep-error]").innerText(),/確認/,"invalid clock is not stored");
  assert.equal(await page.locator('[name="bedTime"]').inputValue(),"23:20","validation preserves unfinished form");
  await page.locator('[name="bedDayRule"][value="auto"]').check();
  await page.locator('select[name="feeling"]').selectOption("ふつう");
  await page.locator("[data-condition-form] button[type=submit]").click();
  assert.match(await page.locator(".hx-condition").innerText(),/6時間40分/);
  assert.match(await page.locator(".hx-condition").innerText(),/起床 06:00/);
  const savedCondition=await page.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-life-condition-v1")));
  assert.equal(savedCondition.length,1);
  assert.deepEqual({minutes:savedCondition[0].sleepMinutes,source:savedCondition[0].sleepSource,offset:savedCondition[0].bedDayOffset},
    {minutes:400,source:"clock",offset:1});
  await page.reload({waitUntil:"networkidle"});
  assert.match(await page.locator(".hx-condition").innerText(),/6時間40分/,"sleep entry persists");
  await page.locator("[data-condition-open]").click();
  assert.equal(await page.locator('[name="bedTime"]').inputValue(),"23:20");
  assert.equal(await page.locator('[name="wakeTime"]').inputValue(),"06:00");
  await page.locator('[data-sleep-mode="duration"]').click();
  assert.equal(await page.locator('[name="durationHours"]').isVisible(),true);
  await page.locator('[name="durationHours"]').fill("7");
  await page.locator('[data-duration-minute="30"]').click();
  assert.equal(await page.locator('[name="durationMinutes"]').inputValue(),"30","minute chip sets numeric field");
  assert.match(await page.locator('[data-sleep-result]').innerText(),/7時間30分/);
  assert.equal(await page.locator('[data-duration-minute="30"]').getAttribute("aria-pressed"),"true");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-sleep-duration-v2.png"),fullPage:false});
  await page.locator("[data-condition-form] button[type=submit]").click();
  const savedDuration=await page.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-life-condition-v1")));
  assert.equal(savedDuration.length,1);
  assert.equal(savedDuration[0].sleepSource,"duration");
  assert.equal(savedDuration[0].sleepMinutes,450);
  assert.equal("bedTime" in savedDuration[0],false,"duration does not invent a bedtime");
  await page.locator("[data-condition-open]").click();
  assert.equal(await page.locator('[data-sleep-mode="duration"]').getAttribute("aria-pressed"),"true");
  assert.equal(await page.locator('[name="durationHours"]').inputValue(),"7");
  assert.equal(await page.locator('[name="durationMinutes"]').inputValue(),"30");
  await page.locator("[data-home-close]").first().click();
  await page.evaluate(()=>localStorage.setItem("running-record-mobile-home-layout-v1","legacy-original-must-stay"));
  await page.locator("[data-home-edit]").click();
  assert.equal(await page.locator("[data-home-drag-handle]").count(),6,"drag handles preserved");
  assert.equal(await page.locator("[data-home-drag-handle]").first().evaluate(el=>getComputedStyle(el).touchAction),"none","long-press drag handle does not trigger native scrolling");
  await page.locator("[data-widget-id=condition][data-widget-action=size]").click();
  await page.locator("[data-home-cancel]").click();
  assert.ok((await page.locator("[data-home-dashboard-id=condition]").getAttribute("class")).includes("dashboard-widget--half"));
  await page.locator("[data-home-edit]").click();
  await page.locator("[data-widget-id=latest][data-widget-action=down]").click();
  await page.locator("[data-widget-id=condition][data-widget-action=size]").click();
  await page.locator("[data-widget-id=topics][data-widget-action=toggle]").click();
  assert.ok(await page.locator("[data-home-dashboard-id=topics]").isVisible(),"hidden widgets remain editable");
  await page.locator("[data-home-save]").click();
  const saved=await page.evaluate(()=>({
    pref:JSON.parse(localStorage.getItem("runload-v2-home-dashboard-layout-v1")),
    legacy:localStorage.getItem("running-record-mobile-home-layout-v1")
  }));
  assert.equal(saved.pref.order[0],"condition");
  assert.equal(saved.pref.sizes.condition,"full");
  assert.ok(!saved.pref.visible.includes("topics"));
  assert.equal(saved.legacy,"legacy-original-must-stay");
  await page.reload({waitUntil:"networkidle"});
  assert.equal(await page.locator("[data-home-dashboard-id]").count(),3);
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"condition");
  await page.locator("[data-home-edit]").click();
  await page.locator("[data-home-reset]").click();
  await page.locator("[data-home-save]").click();
  assert.equal(await page.locator("[data-home-dashboard-id]").count(),4,"reset restores default core modules");
  assert.equal(await page.locator("[data-home-dashboard-id]").first().getAttribute("data-home-dashboard-id"),"latest");

  if(mode.name!=="desktop"){
    await page.locator(".mobile-nav a[href='#/record-start']").click();
    await page.locator(".rv-method h1").waitFor();
    assert.equal(await page.locator(".rv-method-card").count(),2,"GPS/manual mobile chooser");
    await page.locator(".rv-method-gps").click();
    await page.locator("[data-measurement-v2]").waitFor();
    assert.ok(await page.locator('[data-gps-action="start"]').isEnabled(),"GPS requires a user action before activation");
  }
  await page.goto(host+"#/result",{waitUntil:"networkidle"});
  const report=page.locator('#runload-result-v4');
  await report.locator('.rv4-region').first().waitFor({timeout:15000});
  assert.equal(await report.locator('.rv4-region').count(),5,"front view has five official region targets");
  assert.match(await report.locator('.rv4-card-heading').first().innerText(),/速度に対応する文献参考値/);
  assert.match(await report.locator('.rv4-notice').innerText(),/保存された走行記録はまだありません/);
  assert.match(await report.locator('.rv4-big-score').innerText(),/—/,"no synthetic scientific score");
  assert.equal(await report.locator('[data-download]').isDisabled(),true,"no fabricated run card");
  await report.locator('[data-view="sole"]').click();
  assert.equal(await report.locator('.rv4-region').count(),3);
  // Each region has an invisible true-interior SVG tap target, allowing
  // pointer verification without Playwright picking empty bbox-centre pixels.
  await report.locator('[data-tap-region="BA-DISP-028"]').click();
  assert.equal(await report.locator('.rv4-reading h3').innerText(),'足底中部・内側縦足弓');
  await report.locator('[data-view="front"]').click();
  await report.locator('[data-tap-region="BA-DISP-019"]').click();
  assert.equal(await report.locator('.rv4-reading h3').innerText(),'膝蓋大腿関節部');
  if(mode.name!=="desktop"){
    await report.locator('[data-tab="fatigue"]').click();
    assert.ok(await report.locator('.rv4-fatigue').isVisible());
    await report.locator('[data-tab="radar"]').click();
    assert.ok(await report.locator('.rv4-history').isVisible());
    await report.locator('[data-tab="body"]').click();
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth),0);
  // Result must match the headerless dark chrome and never expose the old ⇩ toolbar or white strip.
  const resultChrome=await page.evaluate(()=>{
    const css=el=>getComputedStyle(el);
    const result=document.querySelector('#runload-result-v4'),shell=result?.closest('.app-shell');
    const top=shell?.querySelector('.topbar'),main=shell?.querySelector('.main-content'),nav=shell?.querySelector('.mobile-nav');
    const rgb=css(document.body).backgroundColor;
    return {toolbarHidden:css(top).display==='none',noExtraTop:result.getBoundingClientRect().top,
      shellBg:css(shell).backgroundColor,bodyBg:rgb,mainBg:css(main).backgroundImage,mainSolid:css(main).backgroundColor,
      navBg:css(nav).backgroundColor,overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert.ok(resultChrome.toolbarHidden,mode.name+' result should not contain the old ⇩ toolbar');
  assert.equal(resultChrome.mainBg,'none',mode.name+' result main must not have light gradient');
  assert.ok(resultChrome.bodyBg!=='rgb(255, 255, 255)'&&resultChrome.shellBg!=='rgb(255, 255, 255)',mode.name+' result backgrounds remain navy');
  assert.ok(resultChrome.noExtraTop<=35,mode.name+' result must start below no phantom header: '+JSON.stringify(resultChrome));
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result-viewport-v20.png"),fullPage:false});
  if(mode.name!=="desktop"){
    await page.evaluate(()=>window.scrollTo(0,document.scrollingElement.scrollHeight));
    const bottom=await page.evaluate(()=>{
      const rect=document.querySelector('.mobile-nav').getBoundingClientRect();
      const rectMain=document.querySelector('#runload-result-v4').getBoundingClientRect();
      return {navTop:rect.top,scroll:document.scrollingElement.scrollTop,resultBottom:rectMain.bottom,
      bodyBg:getComputedStyle(document.body).backgroundColor,
      mainBg:getComputedStyle(document.querySelector('.main-content')).backgroundImage};
    });
    assert.ok(bottom.navTop>0&&bottom.mainBg==='none',mode.name+' result bottom remains navy behind fixed tab bar '+JSON.stringify(bottom));
    await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result-bottom-v20.png"),fullPage:false});
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result-viewport.png"),fullPage:false});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  await page.goto(host+"#/exploration-tree",{waitUntil:"networkidle"});
  const ex=page.locator('[data-experience-v3]');
  await ex.waitFor();
  assert.equal(await ex.locator('.ex-node').count(),7,'exploration offers seven areas');
   assert.equal(await ex.locator('.ex-core').count(),1,'constellation has a central discovery orbit');
   assert.equal(await ex.locator('svg.ex-art').count(),1,'constellation links are visually present');
   const orbitCoords=await ex.locator('.ex-node').evaluateAll(nodes=>nodes.map(n=>{
     const a=n.getBoundingClientRect(),b=n.closest('.ex-map').getBoundingClientRect();
     return {x:Math.round((a.left+a.width/2-b.left)/b.width*100),y:Math.round((a.top+a.height/2-b.top)/b.height*100)};
   }));
   assert.ok(orbitCoords.some(x=>x.x<25)&&orbitCoords.some(x=>x.x>70)&&orbitCoords.some(x=>x.y>75),
    'seven nodes form a constellation, not two-column cards: '+JSON.stringify(orbitCoords));
   assert.equal(await ex.locator('[data-ex-tab="catalog"]').count(),1,'single catalog navigation');
   assert.equal(await ex.locator('[data-ex-action="catalog"]').count(),0,'no duplicate catalog button');
   assert.equal(await ex.locator('[data-ex-action="memories"]').count(),1,'only one reflection entry point in header');
   assert.equal(await ex.locator('.ex-memories').count(),0,'avoid duplicate reflection panel');
   assert.equal(await ex.locator('.ex-citation').count(),0,'research references do not dominate beginner reading');
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-constellation-v23.png'),fullPage:false});
  const fromDraft=await ex.locator('.ex-node.is-related').count();
  if(fromDraft)assert.ok((await ex.locator('.ex-focus-intro').innerText()).length>0,'linked field retains a short status');
  // A clean visit without an in-memory unsaved draft must have zero highlighted
  // domains and show the user-controlled visual example instead.
  await page.reload({waitUntil:'networkidle'});
  await ex.waitFor();
  assert.equal(await ex.locator('.ex-node.is-related').count(),1,'saved daily condition highlights only its own area');
  assert.match(await ex.locator('[data-ex-category="05"]').getAttribute('aria-label'),/生活コンディション記録に関連/);
  // The home test has saved one real lifestyle entry. Clearing only that
  // test-created entry isolates the genuine record-free first-run state.
  await page.evaluate(()=>localStorage.removeItem('runload-v2-life-condition-v1'));
  await page.reload({waitUntil:'networkidle'});
  await ex.waitFor();
  assert.equal(await ex.locator('.ex-node.is-related').count(),0,'no fabricated saved activity highlights');
  assert.match(await ex.innerText(),/記録がなくても自由に選べます/);
  assert.equal(await ex.locator('.ex-topic').count(),4,'selected area exposes actual topics');
  await ex.locator('[data-ex-category="01"]').click();
  assert.equal(await ex.locator('[data-ex-learning="distance-time-pace"]').count(),1);
  assert.match(await ex.locator('.ex-tool-result').innerText(),/保存済みの走行はまだありません/);
  await assertPaceColumnLayout(ex,mode,'empty');
  await ex.locator('[data-ex-learning="distance-time-pace"]').screenshot({path:resolve(root,'screenshots',mode.name+'-pace-card-empty-v28.png')});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-pace-empty-v27.png'),fullPage:false});
    const topicRail=ex.locator('.ex-topic-set');
    const beforeRail=await topicRail.evaluate(el=>({scrollWidth:el.scrollWidth,width:el.clientWidth,layout:getComputedStyle(el).display}));
    assert.equal(beforeRail.layout,'flex','topic navigator is a compact horizontal rail');
    assert.ok(beforeRail.scrollWidth>beforeRail.width+10,'extra topics scroll horizontally instead of expanding vertically');
    await ex.locator('[data-ex-category="02"]').click();
    const longTopic=ex.locator('[data-ex-topic="足・膝・股関節"]');
    const topicText=await longTopic.locator('strong').evaluate(el=>({whiteSpace:getComputedStyle(el).whiteSpace,scroll:el.scrollHeight,height:el.getBoundingClientRect().height}));
    assert.equal(topicText.whiteSpace,'nowrap','股関節 is not split across lines');
    assert.ok(topicText.scroll<topicText.height+3,'topic text is not multi-line');
    await ex.locator('[data-ex-topic="12部位の参考値の見方"]').click();
    const activeVisibility=await ex.locator('.ex-topic.is-picked').evaluate(el=>{
      const p=el.closest('.ex-topic-set').getBoundingClientRect(),r=el.getBoundingClientRect();
      return {left:r.left-p.left,right:p.right-r.right,width:r.width};
    });
    assert.ok(activeVisibility.left>=-3&&activeVisibility.right>=-3,'last topic is visible: '+JSON.stringify(activeVisibility));
    await ex.locator('[data-ex-topic="足・膝・股関節"]').click();
    await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-topic-rail-v24.png'),fullPage:false});
  await ex.locator('[data-ex-action=sample]').click();
  assert.equal(await ex.locator('.ex-node.is-related').count(),2,'two clearly labelled preview signals');
  const visualGlow=await ex.locator('.ex-node.is-related .ex-node-orb').first().evaluate(el=>getComputedStyle(el).boxShadow);
  assert.ok(visualGlow!=='none'&&visualGlow.includes('px'),'related star must visibly glow: '+visualGlow);
  assert.equal(await ex.locator('.ex-constellation-link.is-related').count(),2,'connected lines share the same grounded relevance');
  assert.match(await ex.locator('.ex-focus-intro').innerText(),/説明用の例/);
  await ex.locator('[data-ex-category="03"]').click();
  assert.match(await ex.locator('.ex-focus h2').innerText(),/コースと環境/);
  assert.equal(await ex.locator('[data-ex-learning="slope-running"]').count(),1);
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-learning-v22.png'),fullPage:false});
  assert.match(await ex.locator('.ex-learning').innerText(),/上り坂と下り坂/);
  await ex.locator('[data-ex-slope="down"]').click();
  assert.match(await ex.locator('.ex-tool-result').innerText(),/勢いを受け止める/);
  await ex.locator('[data-ex-action="learn-help"]').click();
  assert.match(await ex.locator('.ex-dialog').innerText(),/参考資料/);
  await ex.locator('[data-ex-action="close"]').click();
  const writeAction=ex.locator('.ex-note-invite');
  assert.equal(await ex.locator('.ex-memories').count(),0,'single reflection history access');
  await writeAction.locator('button').evaluate(el=>{
    el.scrollIntoView({block:'end',behavior:'instant'});
    const nav=document.querySelector('.mobile-nav');
    if(nav&&getComputedStyle(nav).position==='fixed'){
      const overlap=el.getBoundingClientRect().bottom-nav.getBoundingClientRect().top+18;
      if(overlap>0)window.scrollBy({top:overlap,behavior:'instant'});
    }
  });
  const footerStyle=await writeAction.evaluate(el=>{
    const b=el.querySelector('button').getBoundingClientRect(),r=el.getBoundingClientRect();
    return {buttonWithin:b.left>=r.left-1&&b.right<=r.right+1,
      fontSize:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize)};
  });
  assert.ok(footerStyle.buttonWithin,'write action stays within the reading card: '+JSON.stringify(footerStyle));
  assert.ok(footerStyle.fontSize>=12,'readable text in reflection footer');
  const actionVis=await writeAction.locator('button').evaluate(el=>{
    const box=el.getBoundingClientRect(),nav=document.querySelector('.mobile-nav'),n=nav?.getBoundingClientRect();
    const overlay=nav&&getComputedStyle(nav).position==='fixed';
    return {bottom:box.bottom,navTop:overlay?n.top:innerHeight,top:box.top,overlay};
  });
  assert.ok(actionVis.top>=0&&actionVis.bottom<=actionVis.navTop-(actionVis.overlay?8:0)+0.5,mode.name+' write action should remain fully above the navigation: '+JSON.stringify(actionVis));
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-writing-footer-v24.png'),fullPage:false});
  await ex.locator('[data-ex-action="note"]').click();
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-note-dialog-v24.png'),fullPage:false});
   assert.match(await ex.locator('.ex-dialog').innerText(),/画面上部の「ふり返り」で読み返せます/);
   await ex.locator('#ex-note').focus();
   const noteFont=await ex.locator('#ex-note').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
   assert.ok(mode.width>800||noteFont>=16,mode.name+' note textarea has iOS safe font size: '+noteFont);
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-focus-note-v25.png'),fullPage:false});
   await ex.locator('[data-ex-next="0"]').click();
  assert.equal(await ex.locator('#ex-note').inputValue(),'次は上りと下りで感じ方を確かめたい');
  await ex.locator('[data-ex-action="save-note"]').click();
  await ex.locator('.ex-memory-count').waitFor();
  assert.equal(await ex.locator('.ex-memory-count').count(),1,'saved note creates a visible memory marker');
   assert.match(await ex.locator('.ex-header-memo').innerText(),/ふり返り/);
  assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')))).length,1);
  await ex.locator('[data-ex-action="memories"]').first().click();
  assert.match(await ex.locator('.ex-dialog').innerText(),/次は上りと下りで感じ方を確かめたい/);
  await ex.locator('[data-ex-delete]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===0);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')).length),0);
  await ex.locator('[data-ex-action="close"]').click();
  await ex.locator('[data-ex-tab="catalog"]').click();
  assert.equal(await ex.locator('.ex-catalog-items button').count(),28,'all initial topics visible');
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-catalog-v22.png'),fullPage:false});
   assert.equal(await ex.locator('.ex-catalog-group').count(),7,'the catalog groups topics by familiar questions');
  const editableFonts=await page.evaluate(()=>{
    const out=[];
    const visit=root=>{
      root.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach(el=>{
        const type=(el.getAttribute('type')||'text').toLowerCase();
        if(['hidden','checkbox','radio','range','button','submit','reset','file','color'].includes(type)||!el.getClientRects().length)return;
        out.push({name:el.id||el.getAttribute('name')||el.tagName,font:parseFloat(getComputedStyle(el).fontSize)});
      });
      root.querySelectorAll('*').forEach(el=>{if(el.shadowRoot)visit(el.shadowRoot)});
    };visit(document);return out;
  });
  if(mode.width<=800)assert.ok(editableFonts.every(c=>c.font>=16),mode.name+' focusable fields under 16px: '+JSON.stringify(editableFonts.filter(c=>c.font<16)));
  await ex.locator('[data-ex-search]').focus();
  const searchFont=await ex.locator('[data-ex-search]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(mode.width>800||searchFont>=16,mode.name+' search input has iOS safe font size: '+searchFont);
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-focus-search-v25.png'),fullPage:false});
  await ex.locator('[data-ex-search]').fill('上り坂');
  assert.equal(await ex.locator('.ex-catalog-items button').count(),1,'theme search finds matching topic');
  await ex.locator('.ex-catalog-items button').first().click();
  assert.match(await ex.locator('.ex-topic.is-picked').innerText(),/上り坂・下り坂/);
  const dims=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,nav:document.querySelector('.mobile-nav')?.getBoundingClientRect().top,bottom:document.querySelector('.ex-page')?.getBoundingClientRect().bottom}));
  assert.ok(dims.overflow<=3,mode.name+' exploration horizontal overflow '+JSON.stringify(dims));
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.width='100%'});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-exploration-v23.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.width='' });
  console.log('PASS',mode.name,'exploration beginner: categories / topics / opt-in notes / grouped catalog');
  // Consultation also hides the legacy install arrow; other standard routes keep the install entry.
  await page.goto(host+"#/consultation",{waitUntil:"networkidle"});
  assert.equal(await page.locator("[data-install-app]").first().isVisible(),false,"consultation does not show the install arrow");
  await page.goto(host+"#/body-part-detail",{waitUntil:"networkidle"});
  assert.ok(await page.locator("[data-install-app]").first().isVisible(),"install trigger remains available outside consultation");
  await page.locator("[data-install-app]").first().click();
  assert.ok(await page.locator(".install-dialog").isVisible());
  await page.locator(".install-dialog [data-install-dismiss]").click();
  assert.equal(await page.locator(".install-dialog").count(),0);
  // Both Home and Record use one course editor and one opt-in preset collection.
  await page.goto(host+"#/course",{waitUntil:"networkidle"});
  assert.equal(await page.locator('.rv-course').count(),1);
  assert.equal(await page.locator('.rv-course-flow > .rv-panel').count(),3,'approved top-to-bottom course steps');
  assert.equal(await page.locator('.rv-condition-pair > .rv-panel').count(),2,'same card contains slope and surface');
  assert.equal(await page.locator('.rv-summary-actions > .rv-commit-group').count(),2,'separate apply and reusable-save choices');
  const verifyCourseLayout=async(label)=>{
    const r=await page.locator('.rv-course').evaluate(el=>{
      const rects=sel=>[...el.querySelectorAll(sel)].map(node=>node.getBoundingClientRect()).map(r=>({top:r.top,bottom:r.bottom,left:r.left,right:r.right}));
      const cards=rects('.rv-course-flow > .rv-panel');
      const conditions=rects('.rv-condition-pair > .rv-panel');
      const commits=rects('.rv-summary-actions > .rv-commit-group');
      const textOverflow=[];
      for(const node of el.querySelectorAll('.rv-block-heading small,.rv-flow-rail small,.rv-commit-help,.rv-summary-line strong')){
        const box=node.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(node);
        for(const line of range.getClientRects())if(line.width>0&&(line.left<box.left-2||line.right>box.right+2))textOverflow.push(node.textContent.slice(0,20));
      }
      return {screen:innerWidth,documentWidth:document.documentElement.scrollWidth,cards,conditions,commits,textOverflow};
    });
    assert.equal(r.cards.length,3,label+' step count');
    assert.ok(r.cards[0].bottom+2<r.cards[1].top&&r.cards[1].bottom+2<r.cards[2].top,label+' vertical flow '+JSON.stringify(r));
    if(mode.width>800){
      assert.ok(Math.abs(r.conditions[0].top-r.conditions[1].top)<4,label+' desktop side-by-side conditions '+JSON.stringify(r));
      assert.ok(Math.abs(r.commits[0].top-r.commits[1].top)<4,label+' desktop side-by-side decisions '+JSON.stringify(r));
    }else{
      assert.ok(r.conditions[0].bottom<r.conditions[1].top,label+' phone stacked conditions '+JSON.stringify(r));
      assert.ok(r.commits[0].bottom<r.commits[1].top,label+' phone stacked decisions '+JSON.stringify(r));
    }
    assert.ok(r.documentWidth<=r.screen+3,label+' no viewport overflow '+JSON.stringify(r));
    assert.deepEqual(r.textOverflow,[],label+' uncut help text '+JSON.stringify(r));
  };
  await verifyCourseLayout('empty');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-course-v31c-empty.png'),fullPage:true});

  await page.locator('[data-draft="courseName"]').fill('検証用保存コース');
  await page.locator('[data-rv-grade="FLAT"]').click();
  await page.locator('[data-rv-surface-mode="SINGLE"]').click();
  await page.locator('[data-rv-surface="paved"]').click();
  await page.locator('[data-course-save]').click();
  assert.equal(await page.locator('[data-course-row]').count(),1,'saved course appears in library');
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-course-row]').count(),1,'saved course survives reload');
  await page.locator('[data-course-use]').click();
  assert.equal(await page.locator('[data-draft="courseName"]').inputValue(),'検証用保存コース');
  const geometry=await page.locator('.rv-course').evaluate(el=>({viewport:innerWidth,doc:document.documentElement.scrollWidth,edges:[...el.querySelectorAll('.rv-course-grid > .rv-panel,.rv-preset-item')].map(card=>{const a=card.getBoundingClientRect(),b=el.getBoundingClientRect();return a.left>=b.left-2&&a.right<=b.right+2})}));
  assert.ok(geometry.doc<=geometry.viewport+3&&geometry.edges.every(Boolean),mode.name+' course cards fit '+JSON.stringify(geometry));
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.width='100%'});
  await verifyCourseLayout('saved');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-course-v31c-saved.png'),fullPage:true});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-course-saved-v30.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.width=''});
  // What-if uses the existing saved course without modifying its source or manufacturing GPS coordinates.
  await page.goto(host+"#/simulation",{waitUntil:"networkidle"});
  assert.equal(await page.locator('[data-sim-page]').count(),1,'simulation replaces disconnected placeholder');
  assert.equal(await page.locator('.sm-panel').count(),4,'top-to-bottom what-if workflow');
  assert.equal(await page.locator('[data-sm-source]').count(),4,'manual, GPX, GPS history and no-course are available');
  assert.equal(await page.locator('.sm-source-option').count(),4,'v35 source selector is compact');
  assert.equal(await page.locator('.sm-scenario').count(),2,'v34 scenario cards preserve two alternatives');
  assert.equal(await page.locator('[data-sm-summary-b]').count(),1,'cycle summary is visible');
  assert.equal(await page.locator('[data-install-app]').isVisible(),false,'unused top-right install arrow is hidden on this screen');
  const fieldsAligned=await page.evaluate(()=>{const a=document.querySelector('[data-sm-field="presetId"]')?.getBoundingClientRect();const b=document.querySelector('[data-sm-field="distance"]')?.getBoundingClientRect();return !!a&&!!b&&Math.abs(a.y-b.y)<2&&Math.abs(a.height-b.height)<1;});
  assert.ok(fieldsAligned,'manual select and distance input align despite the km suffix');

  await page.locator('[data-sm-field="presetId"]').selectOption({label:'検証用保存コース'});
  assert.match(await page.locator('.sm-source-meta').innerText(),/平坦/,'selected course condition is visible');
  await page.locator('[data-sm-field="distance"]').fill('5');
  assert.match(await page.locator('[data-sm-results]').innerText(),/残り/,'scenario computes remaining target distance');
  await page.locator('[data-sm-field="budget"]').fill('35');
  assert.match(await page.locator('.sm-result.a .sm-distance').innerText(),/5\.00/);
  const simGeometry=await page.locator('[data-sim-page]').evaluate(el=>({width:innerWidth,scroll:document.documentElement.scrollWidth,steps:[...el.querySelectorAll('.sm-panel')].map(n=>{const r=n.getBoundingClientRect();return [r.top,r.bottom,r.left,r.right]})}));
  assert.ok(simGeometry.scroll<=simGeometry.width+3,mode.name+' simulation horizontal overflow '+JSON.stringify(simGeometry));
  assert.ok(simGeometry.steps.every((a,j)=>j===0||a[0]>simGeometry.steps[j-1][1]),'simulation steps flow vertically');
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.width='100%'});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-simulation-v34-with-course.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.width=''});
  // GPX imports are local, ephemeral, and must produce route + elevation graphics only for actual file data.
  await page.locator('[data-sm-source="gpx"]').click();
  assert.equal(await page.locator('[data-sm-gpx-file]').count(),1,'GPX can be imported alongside manual courses');
  const gpx=`<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="RunLoad-QA" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>小川コース</name><trkseg>
  <trkpt lat="35.000" lon="138.000"><ele>100</ele></trkpt><trkpt lat="35.005" lon="138.003"><ele>125</ele></trkpt><trkpt lat="35.010" lon="138.006"><ele>115</ele></trkpt>
  </trkseg><trkseg><trkpt lat="35.015" lon="138.009"><ele>90</ele></trkpt><trkpt lat="35.020" lon="138.012"><ele>95</ele></trkpt></trkseg></trk></gpx>`;
  await page.locator('[data-sm-gpx-file]').setInputFiles({name:'qa-sample.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from(gpx)});
  assert.match(await page.locator('.sm-gpx-loaded').innerText(),/小川コース/);
  assert.equal(await page.locator('.sm-gpx-shape').count(),1,'GPX coordinate preview is present');
  assert.equal(await page.locator('.sm-gpx-elevation').count(),1,'GPX elevation is rendered from file data');
  assert.equal(await page.locator('.sm-gpx-elevation path[fill="url(#sm-terrain-fill-v34)"]').count(),2,'2.5D terrain fill respects GPX segment gaps');
  assert.equal(await page.locator('.sm-gpx-shape path[stroke="url(#sm-route-progress-v34)"]').count(),1,'selected scenario route has a distinct progress line');

  assert.match(await page.locator('.sm-gpx-visual').last().innerText(),/途切れた区間 1件/);
  await page.locator('[data-sm-focus="b"]').click();
  assert.match(await page.locator('.sm-gpx-result-caption').innerText(),/B｜走る＋歩く/);
  assert.equal(await page.locator('[data-sm-focus="b"]').getAttribute('aria-pressed'),'true');
  // Failed imports retain the previous valid route, so a mistaken file does not destroy the preview.
  await page.locator('[data-sm-gpx-file]').setInputFiles({name:'not-gpx.gpx',mimeType:'application/gpx+xml',buffer:Buffer.from('<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><gpx/>')});
  assert.match(await page.locator('.sm-error').first().innerText(),/外部定義/);
  assert.equal(await page.locator('.sm-gpx-shape').count(),1,'import failure preserves current route');
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.width='100%'});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-simulation-v34-gpx.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.width=''});
  const gpxOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(gpxOverflow<=3,mode.name+' GPX preview has no viewport overflow: '+gpxOverflow);
  await page.locator('[data-sm-source="manual"]').click();
  assert.equal(await page.locator('[data-sm-field="distance"]').inputValue(),'5','manual target preserved across GPX import');
  await page.locator('[data-sm-source="gpx"]').click();
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.sm-gpx-shape').count(),0,'GPX route is ephemeral; not silently persisted');
  await page.locator('[data-sm-source="gpx"]').click();
  assert.match(await page.locator('.sm-gpx-await').innerText(),/まだ読み込まれていません/);
  await page.locator('[data-sm-source="manual"]').click();
  await page.locator('[data-sm-source="none"]').click();
  assert.match(await page.locator('[data-sm-results]').innerText(),/距離目標なし/);
  assert.ok(!await page.locator('[data-sm-field="distance"]').count(),'no-course never invents a target');
  await page.locator('[data-sm-source="manual"]').click();
  assert.ok(await page.locator('[data-sm-field="distance"]').count());
  await page.goto(host+"#/course",{waitUntil:"networkidle"});
  assert.equal(await page.locator('[data-course-row]').count(),1,'scenario never deletes or edits course');
  console.log('PASS',mode.name,'what-if simulation: saved course, target, time, no-course, responsive geometry');
  await page.locator('[data-course-delete]').click();
  assert.equal(await page.locator('[data-course-confirm-delete]').count(),1);
  await page.locator('[data-course-cancel-delete]').click();
  assert.equal(await page.locator('[data-course-row]').count(),1);
  await page.locator('[data-course-delete]').click();
  await page.locator('[data-course-confirm-delete]').click();
  assert.equal(await page.locator('[data-course-row]').count(),0);
  const savedData=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-course-presets-v1')));
  assert.equal(savedData.records.length,0,'course delete leaves empty collection');
  console.log('PASS',mode.name,'shared course editor: save / reload / reuse / delete');
  await page.goto(host+"#/record",{waitUntil:"networkidle"});
  assert.equal(await page.locator(".rv-manual").count(),1,"PC and mobile share manual screen");
  assert.equal(await page.locator("[data-record-type]").count(),2);
  assert.equal(await page.locator("[data-activity-type]").count(),0);
  assert.equal(await page.locator(".rv-unit-input").count(),2,"distance and total minutes side by side");
  const recordFonts=await page.locator('.record-v3 input:not([type=hidden]):not([type=range]):not([type=checkbox]), .record-v3 select, .record-v3 textarea').evaluateAll(els=>els.filter(el=>el.getClientRects().length).map(el=>({
    field:el.getAttribute('data-draft')||el.getAttribute('type')||el.tagName,
    size:parseFloat(getComputedStyle(el).fontSize)
  })));
  if(mode.width<=800)assert.ok(recordFonts.every(x=>x.size>=16),mode.name+' editable record fields must be >=16px '+JSON.stringify(recordFonts.filter(x=>x.size<16)));

  assert.equal(await page.locator('[data-draft="hours"]').count(),0,"hours are not separate input");
  assert.equal(await page.locator('[data-draft="seconds"]').count(),0,"seconds are not separate input");
  assert.equal(await page.locator(".rv-link").count(),5,"five distinct optional entry cards");
  const compactDate=await page.evaluate(()=>{
    const input=document.querySelector('.rv-date input'), label=document.querySelector('.rv-date>span');
    const field=document.querySelector('.rv-date');
    const rect=input.getBoundingClientRect(),lab=label.getBoundingClientRect();
    return {font:parseFloat(getComputedStyle(field.querySelector(".rl-date-value")).fontSize), width:field.getBoundingClientRect().width,
      inputWidth:rect.width, aligned:Math.abs(rect.top-lab.top)<25, sideBySide:rect.left>=lab.right,
      overscroll:document.documentElement.scrollWidth-innerWidth};
  });
  assert.ok(compactDate.font>=16 && compactDate.width<=291 && compactDate.width>200 && compactDate.sideBySide,"compact legible date row: "+JSON.stringify(compactDate));
  assert.ok(compactDate.overscroll<=1,"record screen must not scroll sideways: "+JSON.stringify(compactDate));
  const visualDate=await page.evaluate(()=>{
    const visual=document.querySelector(".rv-date .rl-date-control"),input=visual.querySelector("input");
    return {width:visual.getBoundingClientRect().width,overflow:visual.getBoundingClientRect().right-visual.closest(".rv-panel").getBoundingClientRect().right,
      nativeOpacity:getComputedStyle(input).opacity,text:visual.querySelector("[data-date-display]").textContent};
  });
  assert.ok(visualDate.overflow<=0 && visualDate.width<=234 && visualDate.nativeOpacity==="0",
    "record date visual fits iOS panel and retains native input: "+JSON.stringify(visualDate));

  await page.locator('[data-draft="date"]').fill("2026-10-24");
  assert.equal(await page.locator(".rv-date [data-date-display]").innerText(),"2026/10/24","custom date mirrors native value");
  await page.locator('[data-draft="distance"]').fill("7.25");
  await page.locator('[data-draft="minutes"]').fill("45.5");
  // Full-page QA image only: move fixed bottom navigation into normal flow
  // so it does not overlap the form halfway down the screenshot.
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-record-manual-v2.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  await page.locator('a[href="#/record-course"]').click();
  await page.locator(".rv-course").waitFor();
  await page.locator('[data-draft="courseName"]').fill("川沿い往復");
  await page.locator('[data-rv-grade="SUMMARY"]').click();
  assert.equal(await page.locator(".rv-slope-tile").count(),3,"up/down/flat in same row");
  assert.ok(await page.locator('[data-rv-slope-number]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16),"course numeric adjustment uses legible input font");
  assert.equal(await page.locator('[data-rv-slope-tile="flat"] b').innerText(),"—","missing percent is not zero");
  await page.locator('[data-rv-slope-number]').fill("55");
  await page.locator('[data-rv-slope-tile="down"]').click();
  await page.locator('[data-rv-slope-number]').fill("50");
  assert.equal(await page.locator('[data-rv-slope-number]').inputValue(),"45","slope edit clamps to available proportion");
  await page.locator('[data-rv-slope-number]').fill("");
  await page.locator('[data-rv-apply]').click();
  assert.match(await page.locator('.rv-error').innerText(),/100%以下/,'reject invalid slope percentages');
  await page.locator('[data-rv-slope-number]').fill("25");
  assert.equal(await page.locator('[data-rv-slope-tile="flat"] b').innerText(),"20%");
  await page.locator('[data-rv-surface-mode="MIXED"]').click();
  assert.equal(await page.locator('.rv-surface-tile').count(),8,"all surface categories retained");
  await page.locator('[data-rv-surface="paved"]').click();
  await page.locator('[data-rv-surface="trail"]').click();
  await page.locator('[data-rv-surface-value="paved"]').fill("70");
  await page.locator('[data-rv-surface-value="trail"]').fill("20");
  await page.locator('[data-rv-apply]').click();
  assert.match(await page.locator('.rv-error').innerText(),/路面の割合/,'reject underfilled surface split');
  await page.locator('[data-rv-surface-value="trail"]').fill("30");
  // Full-page QA image only: move fixed bottom navigation into normal flow
  // so it does not overlap the form halfway down the screenshot.
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-record-course-v2.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  if(mode.name!=="desktop"){
    const widths=await page.locator(".rv-slope-tile").evaluateAll(tiles=>tiles.map(x=>({y:x.getBoundingClientRect().y,ok:x.scrollWidth<=x.clientWidth+1})));
    assert.ok(widths.every(v=>v.ok),"slope tile text must fit without horizontal overflow");
    assert.ok(widths.every(v=>Math.abs(v.y-widths[0].y)<2),"slope tiles must share a row");
  }
  await page.locator('[data-rv-apply]').click();
  await page.locator('.rv-manual').waitFor();
  assert.equal(await page.locator('[data-draft="distance"]').inputValue(),"7.25","distance retained after course");
  assert.equal(await page.locator('[data-draft="minutes"]').inputValue(),"45.5","minutes retained after course");
  await page.locator('a[href="#/record-rof"]').click();
  await page.locator('[data-rof-v4-root]').waitFor();
  assert.equal(await page.locator('.rv4-anchor').count(),5,"preserve original five anchors");
  assert.equal(await page.locator('[data-rof-v4-tick]').count(),11,"0 to 10 integer values shown in a straight line");
  assert.match(await page.locator(".rv4-description").innerText(),/2と3の間/);
  await page.waitForFunction(()=>[...document.querySelectorAll('.rv4-picture img')].length===5 &&
    [...document.querySelectorAll('.rv4-picture img')].every(img=>img.complete&&img.naturalWidth>0),{timeout:12000});
  const illustrationGeometry=await page.locator('.rv4-picture').evaluateAll(nodes=>nodes.map(el=>{
    const img=el.querySelector('img'),r=el.getBoundingClientRect();
    return {width:r.width,height:r.height,fit:getComputedStyle(img).objectFit,natural:img.naturalWidth>0,visible:r.left>=0&&r.right<=innerWidth};
  }));
  assert.ok(illustrationGeometry.every(v=>v.natural&&v.fit==="contain"&&v.visible&&v.height>=55),
    "all original images fully contained on screen: "+JSON.stringify(illustrationGeometry));
  const anchorGeometry=await page.locator('.rv4-anchor').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().top));
  assert.ok(anchorGeometry.every(y=>Math.abs(y-anchorGeometry[0])<2),"five anchors share one horizontal row");
  const anchorPositions=await page.evaluate(()=>{
    const middle=el=>{const r=el.getBoundingClientRect();return r.left+r.width/2};
    const anchors=[...document.querySelectorAll('.rv4-anchor')].map(middle);
    const ticks=[...document.querySelectorAll('[data-rof-v4-tick]')].map(middle);
    return anchors.map((x,i)=>({representative:x,expected:i%2===0?ticks[i*2.5]:((ticks[Math.floor(i*2.5)]+ticks[Math.ceil(i*2.5)])/2),delta:Math.abs(x-(i%2===0?ticks[i*2.5]:((ticks[Math.floor(i*2.5)]+ticks[Math.ceil(i*2.5)])/2)))}));
  });
  assert.ok(anchorPositions.every(p=>p.delta<=5),"anchor centers align with 0/2.5/5/7.5/10 ticks: "+JSON.stringify(anchorPositions));
  const tickGeometry=await page.locator('[data-rof-v4-tick]').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().top));
  assert.ok(tickGeometry.every(y=>Math.abs(y-tickGeometry[0])<2),"integer ticks share one straight row");
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"—","unanswered ROF is missing, not zero");
  await page.locator('[data-rof-v4-range]').evaluate(el=>{el.value="2";el.dispatchEvent(new Event("input",{bubbles:true}))});
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"2");
  assert.match(await page.locator('[data-rof-v4-anchor-meaning]').innerText(),/少し疲れている/);
  await page.locator('[data-rof-v4-anchor="0"]').click();
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"2","explaining an illustration must not change the rating");
  await page.locator('[data-rof-v4-phase="after"]').click();
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"—","before/after remain distinct");
  await page.locator('[data-rof-v4-range]').evaluate(el=>{el.value="8";el.dispatchEvent(new Event("input",{bubbles:true}))});
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"8");
  assert.match(await page.locator('[data-rof-v4-anchor-meaning]').innerText(),/とても疲れている/);
  await page.locator('[data-rof-v4-phase="before"]').click();
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"2");
  // For printable full-page screenshots only, put the fixed bottom navigation
  // after the content, rather than over the middle of the full-page capture.
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{
    el.style.position="static";el.style.width="100%";el.style.bottom="auto";
  });
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-rof-v4-before.png"),fullPage:true});
  await page.locator('[data-rof-v4-phase="after"]').click();
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-rof-v4-after.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{
    el.style.position="";el.style.width="";el.style.bottom="";
  });
  const overflowRof=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflowRof<=3,"ROF v4 mobile/PC must not scroll horizontally");
  await page.locator('[data-rof-v4-clear]').click();
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"—");
  await page.locator('[data-rof-v4-phase="before"]').click();
  assert.equal(await page.locator('[data-rof-v4-number]').innerText(),"2","clearing after does not clear before");
  await page.locator('[data-rof-v4-phase="after"]').click();
  await page.locator('[data-rof-v4-range]').evaluate(el=>{el.value="8";el.dispatchEvent(new Event("input",{bubbles:true}))});
  await page.goto(host+"#/record-compare",{waitUntil:"networkidle"});
  await page.locator("[data-g4-page]").waitFor();
  assert.equal(await page.locator(".g4-panel").count(),2,"two-panel gait redesign");
  await page.locator('[data-draft="steps"]').fill("6120");
  await page.locator('[data-g4-source="DEVICE_MEASURED"]').click();
  assert.equal(await page.locator('[data-g4-source="DEVICE_MEASURED"]').getAttribute("aria-pressed"),"true");
  await page.locator('[data-g4-format="RUN_WALK"]').click();
  assert.equal(await page.locator('[data-g4-runwalk]').isVisible(),true);
  await page.locator('[data-draft="runWalkRunningDistanceKm"]').fill("5.2");
  await page.locator('[data-draft="runWalkRunningDurationMinutes"]').fill("32");
  assert.equal(await page.locator('[data-g4-issue]').isVisible(),false,"valid mixed run input");
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{
    el.style.position="static";el.style.width="100%";el.style.bottom="auto";
  });
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-gait-v4-mixed.png"),fullPage:true});
  await page.locator('[data-draft="runWalkRunningDistanceKm"]').fill("999");
  assert.equal(await page.locator('[data-g4-apply]').isDisabled(),true,"running distance cannot exceed overall distance");
  await page.locator('[data-draft="runWalkRunningDistanceKm"]').fill("5.2");
  await page.locator('[data-g4-format="CONTINUOUS_RUN"]').click();
  assert.equal(await page.locator('[data-g4-runwalk]').isVisible(),false);
  await page.locator('[data-g4-format="RUN_WALK"]').click();
  assert.equal(await page.locator('[data-draft="runWalkRunningDistanceKm"]').inputValue(),"5.2","run/walk fields preserved");
  const gaitOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(gaitOverflow<=3,"gait v4 width "+mode.width+" overflow "+gaitOverflow);
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-gait-v4-restored.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{
    el.style.position="";el.style.width="";el.style.bottom="";
  });
  await page.goto(host+"#/record-environment",{waitUntil:"networkidle"});
  await page.locator("[data-e4-page]").waitFor();
  await page.locator('[data-draft="temperatureC"]').fill("21.5");
  await page.locator('[data-e4-weather="RAIN"]').click();
  assert.equal(await page.locator('[data-e4-weather="RAIN"]').getAttribute("aria-pressed"),"true");
  await page.locator('[data-e4-flag="WIND"]').click();
  assert.match(await page.locator('[data-e4-summary]').innerText(),/雨/);
  assert.match(await page.locator('[data-e4-summary]').innerText(),/風が強い/);
  await page.locator('[data-draft="temperatureC"]').fill("61");
  assert.equal(await page.locator('[data-e4-done]').getAttribute("aria-disabled"),"true");
  await page.locator('[data-draft="temperatureC"]').fill("0");
  assert.equal(await page.locator('[data-e4-done]').getAttribute("aria-disabled"),"false");
  assert.match(await page.locator('[data-e4-summary]').innerText(),/0℃/);
  const envOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(envOverflow<=3,"environment has no horizontal overflow at "+mode.width);
  await page.locator('[data-draft="temperatureC"]').blur();
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{
    el.style.position="static";el.style.width="100%";el.style.bottom="auto";
  });
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-environment-v4.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{
    el.style.position="";el.style.width="";el.style.bottom="";
  });
  await page.goto(host+"#/record-reflection",{waitUntil:"networkidle"});
  assert.equal(await page.locator(".cx-page").count(),1,"reflection remains an independent routed screen");
  assert.equal(await page.locator('[data-region-focus]').count(),5,"five official front-map targets");
  await page.locator('[data-region-focus="BA-DISP-019"]').evaluate(el=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  assert.equal(await page.locator('.cx-context strong').innerText(),'膝蓋大腿関節部');
  await page.locator('[data-confirm-id="BA-DISP-019"]').click();
  assert.equal(await page.locator('.cx-selected-chip').count(),1);
  await page.locator('[data-map-view="back"]').click();
  assert.equal(await page.locator('[data-region-focus]').count(),4,"four official back-map targets");
  await page.locator('[data-picker-toggle]').click();
  assert.equal(await page.locator('[data-picker-id]').count(),4);
  await page.locator('[data-picker-id="BA-DISP-023"]').click();
  assert.equal(await page.locator('.cx-selected-chip').count(),2);
  await page.locator('[data-map-view="sole"]').click();
  assert.equal(await page.locator('[data-region-focus]').count(),3,"three sole-map targets");
  await page.locator('[data-map-view="front"]').click();
  await page.locator('[data-draft="shoeName"]').fill("検証用シューズ");
  await page.locator('[data-draft="memo"]').fill("自分のペースで走った");
  await page.locator('[data-draft="bodyObservation"]').fill("膝の前が気になった");
  assert.equal(await page.locator('[data-counter="shoeName"]').innerText(),'7/120');
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.width='100%';el.style.bottom='auto'});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-body-v8-integrated.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.width='';el.style.bottom=''});
  await page.locator('[data-apply]').click();
  await page.locator('.rv-manual').waitFor();
  await page.goto(host+"#/record-reflection",{waitUntil:"networkidle"});
  assert.equal(await page.locator('[data-draft="shoeName"]').inputValue(),'検証用シューズ');
  assert.equal(await page.locator('.cx-selected-chip').count(),2);
  await page.goto(host+"#/record",{waitUntil:"networkidle"});
  assert.equal(await page.locator('[data-draft="minutes"]').inputValue(),"45.5");
  await page.locator('[data-record-type="rest"]').click();
  assert.equal(await page.locator('[data-draft="distance"]').count(),0);
  await page.locator('[data-record-type="run"]').click();
  assert.equal(await page.locator('[data-draft="distance"]').inputValue(),"7.25");
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.match(await page.locator('[data-record-review]').innerText(),/手入力した走行を端末内に保存/);
  assert.match(await page.locator('[data-record-review]').innerText(),/川沿い往復/);
  assert.match(await page.locator('.rr-metrics').innerText(),/7.25/);
  assert.match(await page.locator('.rr-metrics').innerText(),/45:30/);
  assert.equal(await page.locator('.rr-alert.is-warning').count(),1,
   'record review must warn when required activity has not been selected');
  assert.match(await page.locator('.rr-alert.is-warning').innerText(),/活動種目を選択してください/);
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-record-review-v5.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.bottom=''});
  await page.locator('a[href="#/record-reflection"]').first().click();
  await page.locator('[data-cx-page]').waitFor({timeout:10000});
  await page.locator('[data-apply]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.match(await page.locator('[data-record-review]').innerText(),/検証用シューズ/);
  await page.goto(host+"#/record-course",{waitUntil:"networkidle"});
  await page.locator('[data-rv-grade="SECTIONS"]').click();
  for(let i=0;i<5;i++)await page.locator('[data-rv-add]').click();
  assert.equal(await page.locator('.rv-section-row').count(),5,"five sections maximum");
  assert.ok(await page.locator('[data-rv-add]').isDisabled());
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-record-sections-v2.png"),fullPage:true});
  const layout=await page.evaluate(()=>({bodyWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert.ok(layout.bodyWidth-layout.viewport<=3,"record UI horizontal overflow");
  // Navigate through the actual UI, rather than navigating the whole document.
  await page.locator(mode.name==="desktop"?'.side-nav a[href="#/history"]':'.mobile-nav a[href="#/history"]').click();
  const historyRoot=page.locator('#runload-history-v2');
  assert.equal(await page.locator('.topbar').isVisible(),false,'history must not keep the empty top header');
  const historyHeadingTop=await historyRoot.locator('.topline h1').evaluate(el=>el.getBoundingClientRect().top);
  assert.ok(Math.abs(historyHeadingTop-homeHeadingTop)<=6,'history title matches home: '+JSON.stringify({homeHeadingTop,historyHeadingTop}));
  const historySurfaceTheme=await historyRoot.locator('.calendar-panel').evaluate(el=>({bg:getComputedStyle(el).backgroundImage,ring:getComputedStyle(el,'::after').content}));
  assert.match(historySurfaceTheme.bg,/radial-gradient/,'history cards receive luminous gradient');
  assert.notEqual(historySurfaceTheme.ring,'none','history cards retain decorative arc');
  await historyRoot.locator('.calendar-panel').waitFor();
  const historyInstantStyle=await historyRoot.evaluate(host=>{
    const root=host.shadowRoot,stage=root?.querySelector('.stage');
    return {inline:!!root?.querySelector('style[data-history-inline-styles]'),external:root?.querySelectorAll('link[rel="stylesheet"]').length,paint:stage?getComputedStyle(stage).backgroundImage:'none'};
  });
  assert.ok(historyInstantStyle.inline && historyInstantStyle.external===0 && historyInstantStyle.paint!=='none',
    'History applies theme synchronously without waiting for CSS fetch: '+JSON.stringify(historyInstantStyle));
  const safeTheme=await page.evaluate(()=>({theme:document.querySelector('meta[name="theme-color"]')?.content,ios:document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.content}));
  assert.deepEqual(safeTheme,{theme:'#061725',ios:'black-translucent'},'iOS app status bar uses dark canvas');
  // At maximum scroll the final History panel must sit fully above the fixed
  // navigation bar; checking a full-page screenshot alone misses this overlap.
  if(mode.name!=="desktop") {
    await page.evaluate(()=>window.scrollTo({top:document.scrollingElement.scrollHeight,behavior:'instant'}));
    const historyBottom=await page.evaluate(()=>{
      const lastCard=document.querySelector('#runload-history-v2')?.shadowRoot?.querySelector('.list-panel');
      const nav=document.querySelector('.mobile-nav');
      const main=document.querySelector('.main-content');
      return {
        cardBottom:lastCard?.getBoundingClientRect().bottom,
        navTop:nav?.getBoundingClientRect().top,
        mainPaddingBottom:getComputedStyle(main).paddingBottom,
        overflow:document.documentElement.scrollWidth-innerWidth
      };
    });
    assert.ok(historyBottom.cardBottom<=historyBottom.navTop-12,
      'history final card must clear fixed nav: '+JSON.stringify({mode:mode.name,...historyBottom}));
    assert.ok(historyBottom.overflow<=3,'history bottom horizontal overflow');
    await page.screenshot({path:resolve(root,'screenshots',mode.name+'-history-bottom-fixed-nav.png'),fullPage:false});
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  }

  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-history-v2-initial.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.bottom=''});
  const totalDays=await historyRoot.locator('[data-day]').count();
  assert.ok(totalDays>=28&&totalDays<=31,"calendar shows actual number of days");
  assert.equal(await historyRoot.locator('.day-grid button.has-record').count(),0,"no invented saved dates");
  assert.equal(await historyRoot.locator('.entry').count(),0,"no invented saved-record links");
  assert.match(await historyRoot.locator('[data-history-unconnected]').innerText(),/この条件の記録はありません/);
  await historyRoot.locator('[data-day="12"]').click();
  assert.match(await historyRoot.locator('.results-counter').innerText(),/12日の記録/);
  await historyRoot.locator('[data-clear-day]').click();
  assert.equal(await historyRoot.locator('.entry').count(),0);
  await historyRoot.locator('[data-record-kind="run"]').click();
  assert.equal(await historyRoot.locator('.entry').count(),0);
  const focusInput=historyRoot.locator('#hx-search');
  const historyInputSize=await focusInput.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
  assert.ok(mode.width>800||historyInputSize>=16,mode.name+' history shadow input must prevent iOS auto-zoom: '+historyInputSize);
  await focusInput.focus();
  const beforeFocus=await focusInput.evaluate(el=>{el.__runloadFocusCheck=true;return {scrollY:scrollY,scale:visualViewport?.scale??1};});
  await focusInput.fill('コース');
  const retained=await historyRoot.evaluate(host=>{
    const input=host.shadowRoot.querySelector('#hx-search');
    return {focus:host.shadowRoot.activeElement===input,value:input.value,same:input.__runloadFocusCheck===true,scale:visualViewport?.scale??1};
  });
  assert.ok(retained.focus&&retained.same&&retained.value==='コース',mode.name+' filtering retains the same keyboard field '+JSON.stringify(retained));
  assert.equal(retained.scale,beforeFocus.scale,'focus does not modify Chromium visual viewport zoom');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-history-focused-input-v26.png'),fullPage:false});
  await historyRoot.locator('#hx-search').fill('未保存入力と異なる検索文字');
  assert.equal(await historyRoot.locator('.entry').count(),0);
  await historyRoot.locator('[data-month="-1"]').click();
  assert.equal(await historyRoot.locator('.entry').count(),0);
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-history-v2-approved.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.bottom=''});
  // Condition journey v15: a browsable graph, real-day notes, opt-in follow-up and inline home review.
  const localDay=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const dateA=localDay(-3),dateB=localDay(-2),dateC=localDay(-1);
  const lifeSeed=[
   {date:dateA,sleepMinutes:360,sleepSource:'duration',feeling:'ふつう',memo:'いつもどおり'},
   {date:dateB,sleepMinutes:450,sleepSource:'duration',feeling:'良い',memo:'朝は調子が良い'}
  ];
  await page.evaluate(entries=>localStorage.setItem('runload-v2-life-condition-v1',JSON.stringify(entries)),lifeSeed);
  assert.equal(await page.locator('[data-condition-journey]').count(),0,'running history must not contain condition tracking');
  await page.goto(host+'#/home',{waitUntil:'networkidle'});
  const homeNavStyle=await page.evaluate(()=>{
    const nav=document.querySelector('.mobile-nav'),item=nav?.querySelector('.mobile-link:not(.is-active)'),active=nav?.querySelector('.mobile-link.is-active');
    const side=document.querySelector('.sidebar'),selected=side?.querySelector('.side-link.is-active');
    return {mobileBg:getComputedStyle(nav).backgroundColor,mobileBorder:getComputedStyle(nav).borderTopColor,
      itemColor:getComputedStyle(item).color,selectedColor:getComputedStyle(active).color,
      selectedBg:getComputedStyle(active).backgroundColor,
      sidebarBg:getComputedStyle(side).backgroundImage,sidebarSelected:getComputedStyle(selected).backgroundColor};
  });
  const touchPolicy=await page.evaluate(()=>({
    html:getComputedStyle(document.documentElement).touchAction,
    body:getComputedStyle(document.body).touchAction,
    card:getComputedStyle(document.querySelector('.hx-condition-explore')).touchAction,
    viewport:document.querySelector('meta[name="viewport"]')?.content||''
  }));
  assert.equal(touchPolicy.html,'manipulation','double-tap zoom disabled globally');
  assert.equal(touchPolicy.body,'manipulation');
  assert.equal(touchPolicy.card,'manipulation');
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i.test(touchPolicy.viewport),'pinch zoom must remain allowed');
  const conditionLink=page.locator('.hx-condition .hx-condition-explore');
  assert.equal(await conditionLink.count(),1,'condition detail lives inside the home condition card');
  await conditionLink.click();
  assert.ok(page.url().includes('#/condition'));
  // Route markup may appear one frame before its lazy CSS is applied.
  // Wait for real computed-theme parity rather than comparing during a flash.
  await page.locator('[data-condition-journey]').waitFor();
  if(mode.name==='mobile')await page.waitForFunction(expected=>{
    const nav=document.querySelector('.mobile-nav'),active=nav?.querySelector('.mobile-link.is-active');
    return nav&&active&&getComputedStyle(nav).backgroundColor===expected.mobileBg&&
      getComputedStyle(active).color===expected.selectedColor;
  },homeNavStyle,{timeout:7000});
  const conditionNavStyle=await page.evaluate(()=>{
    const nav=document.querySelector('.mobile-nav'),item=nav?.querySelector('.mobile-link:not(.is-active)'),active=nav?.querySelector('.mobile-link.is-active');
    const side=document.querySelector('.sidebar'),selected=side?.querySelector('.side-link.is-active');
    return {mobileBg:getComputedStyle(nav).backgroundColor,mobileBorder:getComputedStyle(nav).borderTopColor,
      itemColor:getComputedStyle(item).color,selectedColor:getComputedStyle(active).color,
      selectedBg:getComputedStyle(active).backgroundColor,
      sidebarBg:getComputedStyle(side).backgroundImage,sidebarSelected:getComputedStyle(selected).backgroundColor};
  });
  if(mode.name==='mobile')assert.deepEqual(conditionNavStyle,homeNavStyle,
    'visible smartphone navigation must retain the approved Home theme');
  else assert.deepEqual(
    {sidebarBg:conditionNavStyle.sidebarBg,sidebarSelected:conditionNavStyle.sidebarSelected},
    {sidebarBg:homeNavStyle.sidebarBg,sidebarSelected:homeNavStyle.sidebarSelected},
    'desktop Home/condition visible sidebar must match; hidden mobile nav is irrelevant');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-condition-nav-parity-v17.png'),fullPage:false});
  assert.equal(await page.locator('#runload-history-v2').count(),0,'condition detail must not mount the running history');
  assert.equal(await page.locator('.cj-back').count(),1,'return home is available');
  const journey=page.locator('[data-condition-journey]');await journey.waitFor();
  assert.match(await journey.locator('h2').first().innerText(),/睡眠と、その日の調子/);
  for(const selector of ['.cj-chart-viewport','.cj-controls','.cj-detail']){
    const box=await journey.locator(selector).boundingBox();
    assert.ok(box&&box.x>=-1&&box.x+box.width<=mode.width+1,mode.name+' '+selector+' must fit viewport');
  }
  const detailOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(detailOverflow<=3,mode.name+' condition detail overflow: '+detailOverflow);
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-condition-detail-viewport-v16.png'),fullPage:false});
  assert.equal(await journey.locator('[data-cj-day]:not([disabled])').count(),2);
  await journey.locator('[data-cj-day="'+dateA+'"]').click();
  assert.match(await journey.locator('.cj-day-memo').innerText(),/いつもどおり/);
  await journey.locator('[data-cj-range="90"]').click();
  assert.equal(await journey.locator('[data-cj-day]').count(),90);
  await journey.locator('[data-cj-method]').selectOption('self-reported');
  await journey.locator('[data-cj-day="'+dateB+'"]').click();
  await journey.locator('[data-cj-note]').fill('朝は調子が良かった');
  await journey.locator('[data-cj-save-insight]').click();
  assert.match(await journey.locator('.cj-saved').innerText(),/朝は調子が良かった/);
  await journey.locator('[data-cj-create-intent]').click();
  assert.match(await journey.locator('[role="status"]').last().innerText(),/ホームに保存しました/);
  assert.equal(await page.locator('#runload-history-v2').count(),0,'condition detail uses its own screen');
  await page.goto(host+'#/home',{waitUntil:'networkidle'});
  const followup=page.locator('.cj-home-panel');
  assert.match(await followup.innerText(),/次の記録を待っています/);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await followup.innerText(),/次の記録を待っています/);
  await page.evaluate(date=>{
   const key='runload-v2-life-condition-v1',rows=JSON.parse(localStorage.getItem(key));
   rows.push({date,sleepMinutes:420,sleepSource:'duration',feeling:'疲れ気味',memo:'少し眠い'});
   localStorage.setItem(key,JSON.stringify(rows));
  },dateC);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await followup.innerText(),/新しい記録と見比べられます/);
  assert.match(await followup.innerText(),/30分の差/);
  assert.equal(await followup.locator('[data-interpret-mark-reviewed]').count(),0,'no mechanical review badge');
  await followup.locator('[data-cj-note]').fill('時間だけでは分からない');
  await followup.locator('[data-cj-save-insight]').click();
  assert.match(await page.locator('.cj-home-panel .cj-saved').innerText(),/時間だけでは分からない/);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-condition-insights-v1')).entries.length),2);
  await page.locator('[data-interpret-delete]').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-action-intents-v1')),null);
  await page.goto(host+'#/history',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-condition-journey]').count(),0);
  assert.equal(await page.locator('[data-interpret-toggle]').count(),0);
  assert.equal(await page.locator('#runload-history-v2').count(),1);
  await page.goto(host+'#/condition',{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-condition-journey]').count(),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-exploration-notes-v1')!==null),true,'old exploration notes kept');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-v15-condition-journey.png'),fullPage:false});
  await page.goto(host+"#/result",{waitUntil:"networkidle"});
  const historicalReport=page.locator("#runload-result-v4");
  assert.match(await historicalReport.locator(".rv4-notice").innerText(),/保存された走行記録はまだありません/);
  assert.equal((await historicalReport.locator(".rv4-distance strong").innerText()).trim(),"—","unsaved input must not leak into result");
    for(const route of ["record","history","settings","measurement","course","simulation","consultation","body-part-detail"]){
   await page.goto(host+"#/"+route,{waitUntil:"networkidle"});
   await page.locator("h1").waitFor();
   if(mode.width<=800){
     const fields=await page.evaluate(()=>{
       const out=[];
       const scan=root=>{
         root.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach(el=>{
           const kind=(el.getAttribute('type')||'text').toLowerCase();
           if(['hidden','checkbox','radio','range','file','color','button','submit','reset'].includes(kind)||!el.getClientRects().length)return;
           out.push({field:el.id||el.name||el.tagName,size:parseFloat(getComputedStyle(el).fontSize)});
         });
         root.querySelectorAll('*').forEach(el=>{if(el.shadowRoot)scan(el.shadowRoot)});
       };scan(document);return out;
     });
     assert.ok(fields.every(x=>x.size>=16),mode.name+' '+route+' has an auto-zoom-prone field: '+JSON.stringify(fields.filter(x=>x.size<16)));
   }
   if(route==="settings"){
     assert.equal(await page.locator('.topbar').isVisible(),false,'settings must not keep the empty top header');
     const settingsHeadingTop=await page.locator('.s2-heading h1').evaluate(el=>el.getBoundingClientRect().top);
     assert.ok(Math.abs(settingsHeadingTop-homeHeadingTop)<=6,'settings title matches home: '+JSON.stringify({homeHeadingTop,settingsHeadingTop}));
     const panelTheme=await page.locator('.s2-panel').first().evaluate(el=>({bg:getComputedStyle(el).backgroundImage,ring:getComputedStyle(el,'::after').content}));
     assert.match(panelTheme.bg,/radial-gradient/,'settings cards receive luminous gradient');
     assert.notEqual(panelTheme.ring,'none','settings cards retain decorative arc');
     const layout=await page.evaluate(()=>({content:document.querySelector(".s2-page")?.getBoundingClientRect().width,viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth}));
     assert.ok(layout.overflow<=1,"settings layout has no horizontal overflow: "+JSON.stringify(layout));
     if(mode.name==="desktop")assert.ok(layout.content>=950,"PC settings should use full available width: "+JSON.stringify(layout));
   }
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+"-viewport.png"),fullPage:false});
   if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+".png"),fullPage:true});
   if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
   const visibleArea=route==="history"?page.locator("#runload-history-v2").locator(".stage"):page.locator("main");
   assert.ok((await visibleArea.innerText()).length>60,route);
   const textContent=await visibleArea.innerText();
   assert.ok(!/デモ専用|UI 試作版|仮データ|画面確認用|RUNLOAD|RunLoad|EXPLORE \/|マイダッシュボード|測定エンジン|科学計算|未接続|正式保存前/.test(textContent),route+" user-facing internal text found");
   const routeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(routeOverflow<=3,mode.name+" "+route+" horizontal overflow: "+routeOverflow);
  }
  await page.goto(host+"#/measurement",{waitUntil:"networkidle"});
  assert.equal(await page.locator('[data-gps-live-page]').count(),1);
  assert.equal(await page.locator('[data-gps-distance]').innerText(),'0.00','no prefilled GPS values');
  assert.equal(await page.locator('[data-gps-action="start"]').isEnabled(),true);
  assert.equal(await page.locator("[data-gps-map]").count(),1,"GPS measurement includes street-map viewport");
  assert.equal(await page.locator("[data-gps-map] img").count(),0,"no tile requests before GPS receipt");
  assert.equal(await page.locator('[data-gps-keep-awake]').isChecked(),false,'wake lock choice defaults to off');
  if(mode.name==='desktop'){
    await page.evaluate(()=>{
      window.__gpsWakeRequests=0;window.__gpsWakeReleases=0;
      Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{
        request:async mode=>{
          if(mode!=='screen')throw Error('unexpected wake lock mode');
          window.__gpsWakeRequests++;
          return {addEventListener(){},release:async()=>{window.__gpsWakeReleases++}};
        }
      }});
    });
    assert.equal(await page.evaluate(()=>window.__gpsWakeRequests),0,'no wake lock without user opt-in');
    await page.locator('[data-gps-keep-awake]').check();
  }
  await page.locator('[data-gps-activity]').selectOption('MIXED');
  assert.match(await page.locator('[data-gps-activity-description]').innerText(),/区間を自分で切り替え/);
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-gps-v35-ready.png'),fullPage:true});
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),0,'no GPS watcher without explicit consent');
  await page.locator('[data-gps-action="start"]').click();
  assert.equal(await page.locator('[data-gps-consent-overlay]').count(),1,'consent dialog is mandatory');
  assert.equal(await page.locator('[data-gps-consent-interruption]').count(),0,'no duplicate pause notice overlay');
  const consentNotice=page.locator('#gps-consent-interruption');
  assert.equal(await consentNotice.count(),1,'existing consent modal contains pause/resume notice');
  assert.match(await consentNotice.innerText(),/活動時間のタイマーとGPS測位は自動で一時停止/);
  assert.match(await consentNotice.innerText(),/画面に戻っても自動では再開しません/);
  assert.match(await consentNotice.innerText(),/「測定を再開」から位置情報の使用を確認/);
  assert.match(await consentNotice.innerText(),/停止中の時間・距離は加算されません/);
  assert.match(await page.locator('.gps-consent-dialog').getAttribute('aria-describedby'),/gps-consent-interruption/);
  assert.ok(await consentNotice.isVisible(),'warning visible before GPS permission and watcher start');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-gps-prestart-notice.png'),fullPage:false});
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),0,'dialog open does not start watcher');
  await page.locator('[data-gps-consent-cancel]').click();
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),0,'denying GPS consent never starts watcher');
  await page.locator('[data-gps-action="start"]').click();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-gps-consent-overlay]').count(),0,'Escape cancels permission dialog');
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),0,'Escape does not start GPS');
  await page.locator('[data-gps-action="start"]').click();
  await page.locator('[data-gps-consent-confirm]').click();
  await page.waitForFunction(()=>Number(document.querySelector('[data-gps-distance]')?.textContent||0)>=.01,null,{timeout:8000});
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),1,'explicit consent starts watcher once');
  if(mode.name==='desktop')await page.waitForFunction(()=>window.__gpsWakeRequests===1,null,{timeout:8000});
  assert.ok(await page.locator("[data-gps-map] img").count()>0,"accepted GPS position requests map tiles");
  assert.match(await page.locator("[data-gps-map] img").first().getAttribute("src"),/^https:\/\/tile\.openstreetmap\.org\/16\//);
  await page.waitForFunction(()=>document.querySelector('[data-gps-map]')?.dataset.tileStatus==='loaded',{timeout:8000});
  assert.ok(await page.locator('[data-gps-map] img').first().evaluate(img=>img.naturalWidth>0),'a real map tile image decodes');
  assert.equal(await page.locator('[data-gps-map] img').first().getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');
  assert.ok(tileHeaders.some(h=>h.referer?.includes('127.0.0.1:4173')),'OSM tile requests preserve Referer');
  assert.equal(await page.locator('[data-gps-live-page]').getAttribute('data-phase'),'running');
  // A stored flag must immediately appear on the map, with a numbered marker.
  await page.locator('[data-gps-action="flag"]').click();
  await page.locator('[data-gps-map-flag="1"]').waitFor();
  assert.match(await page.locator('[data-gps-map-flags]').innerText(),/1件/);
  assert.equal(await page.locator('[data-gps-route]').count(),0,'no duplicated route preview during measurement');
  if(mode.name!=="desktop")assert.equal(await page.locator('.mobile-nav').isVisible(),false,'active GPS measurement hides main navigation');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-gps-v35-running.png'),fullPage:true});
  await page.locator('[data-gps-segment]').selectOption('WALK');
  await page.locator('[data-gps-action="pause"]').click();
  assert.equal(await page.locator('[data-gps-live-page]').getAttribute('data-phase'),'paused');
  if(mode.name==='desktop')await page.waitForFunction(()=>window.__gpsWakeReleases===1,null,{timeout:8000});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-gps-v35-paused.png'),fullPage:true});
  const watchesBeforeResume=await page.evaluate(()=>window.__gpsWatchCount);
  await page.locator('[data-gps-action="resume"]').click();
  assert.equal(await page.locator('[data-gps-consent-overlay]').count(),1,'resuming GPS requests fresh consent');
  assert.equal(await page.locator('#gps-consent-interruption').count(),1,'restart also explains lock and resume behavior');
  assert.match(await page.locator('#gps-consent-title').innerText(),/位置情報の取得を再開/);
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),watchesBeforeResume);
  await page.locator('[data-gps-consent-confirm]').click();
  assert.equal(await page.evaluate(()=>window.__gpsWatchCount),watchesBeforeResume+1);
  if(mode.name==='desktop')await page.waitForFunction(()=>window.__gpsWakeRequests===2,null,{timeout:8000});
  await page.waitForTimeout(1200);
  await page.evaluate(()=>{
    const original=Object.getOwnPropertyDescriptor(document,'hidden');
    Object.defineProperty(document,'hidden',{configurable:true,value:true});
    document.dispatchEvent(new Event('visibilitychange'));
    if(original)Object.defineProperty(document,'hidden',original);
    else delete document.hidden;
  });
  assert.equal(await page.locator('[data-gps-live-page]').getAttribute('data-phase'),'paused','page hide pauses GPS');
  assert.match(await page.locator('[data-gps-notice]').innerText(),/非表示・ロック/);
  if(mode.name==='desktop')await page.waitForFunction(()=>window.__gpsWakeReleases===2,null,{timeout:8000});
  await page.locator('[data-gps-action="resume"]').click();
  assert.equal(await page.locator('[data-gps-consent-overlay]').count(),1,'restarting after hidden page requires consent');
  await page.locator('[data-gps-consent-confirm]').click();
  if(mode.name==='desktop')await page.waitForFunction(()=>window.__gpsWakeRequests===3,null,{timeout:8000});
  await page.waitForTimeout(300);
  await page.locator('[data-gps-action="finish"]').click();
  if(mode.name==='desktop')await page.waitForFunction(()=>window.__gpsWakeReleases===3,null,{timeout:8000});
  assert.equal(await page.locator('[data-gps-live-page]').getAttribute('data-phase'),'finished');
  assert.equal(await page.locator('[data-gps-save-route]').isChecked(),false,'precise position track must be opt-in');
  assert.equal(await page.locator('.gps-flag-note-card').count(),1);
  await page.locator('[data-gps-flag-note]').fill('折り返し地点');
  await page.locator('[data-gps-flag-note]').dispatchEvent('change');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-gps-v35-finished.png'),fullPage:true});
  await page.locator('[data-gps-save-route]').check();
  await page.locator('[data-gps-action="save"]').click();
  await page.locator('#runload-result-v4 .rv4-hero').waitFor();
  assert.match(await page.locator('#runload-result-v4 .rv4-header').innerText(),/結果/);
  assert.equal(await page.locator('#runload-result-v4 .rv4-mobile-tabs button').count(),3);
  // MIXED GPS has no single-activity replay reference and must never offer a gate.
  assert.equal(await page.locator('#runload-result-v4 [data-gps-dynamic-gate]').count(),0,
    'mixed activity cannot enter dynamic reference');
  await page.goto(host+'#/history',{waitUntil:'networkidle'});
  const v2History=page.locator('.gps-v2-history .gps-history-item').first();
  await v2History.waitFor();
  assert.match(await v2History.innerText(),/コース保存あり/);
  const savedV2=await page.evaluate(async()=>new Promise((resolve,reject)=>{
    const op=indexedDB.open('runload-v2-gps-dynamic-v2');
    op.onerror=()=>reject(op.error);
    op.onsuccess=()=>{
      const db=op.result,tx=db.transaction(['summaries','details'],'readonly');
      const summaries=tx.objectStore('summaries').getAll(),details=tx.objectStore('details').getAll();
      tx.oncomplete=()=>{db.close();resolve({summaries:summaries.result,details:details.result})};
      tx.onerror=()=>reject(tx.error);
    };
  }));
  assert.equal(savedV2.summaries.length,1);
  assert.equal(savedV2.details.length,1);
  assert.ok(savedV2.details[0].route.length>=2);
  assert.ok(savedV2.details[0].speedPoints.length>=2);
  assert.equal(savedV2.details[0].flags[0].note,'折り返し地点');
  assert.equal(await page.evaluate(()=>localStorage.getItem('runload-v2-gps-runs-v1')),null,
    'GPS coordinates are not in localStorage');
  await page.reload({waitUntil:'networkidle'});
  await page.locator('.gps-v2-history .gps-history-item').first().waitFor();
  assert.match(await page.locator('.gps-v2-history .gps-history-item').first().innerText(),
    /コース保存あり/,'IndexedDB v2 record survives reload');
  await page.locator('[data-gps-v2-use]').first().click();
  await page.locator('[data-sm-source="gps"]').waitFor();
  assert.equal(await page.locator('[data-sm-source="gps"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.sm-gpx-shape').count(),1,'saved v2 GPS route reuses original what-if view');
  assert.match(await page.locator('[data-sm-gps-evidence]').innerText(),
    /GPS保存コースの確認情報/,'GPS course remains separate from scientific load');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-gps-v35-reused-in-simulation.png'),fullPage:true});
  if(mode.name==='mobile'){
    // Force every requested map image to fail. The measurement/track must stay operational.
    failTiles=true;
    await page.goto(host+'#/measurement',{waitUntil:'networkidle'});
    // Shift fixture to a different tile grid: previously decoded images may be memory-cached.
    await page.evaluate(()=>{window.__gpsMockLatOffset=2.5});
    await page.locator('[data-gps-action="start"]').click();
    await page.locator('[data-gps-consent-confirm]').click();
    await page.waitForFunction(()=>document.querySelector('[data-gps-map]')?.dataset.tileStatus==='unavailable',null,{timeout:8000});
    assert.match(await page.locator('[data-gps-map-network-status]').innerText(),/道路地図を取得できません/);
    await page.waitForFunction(()=>Number(document.querySelector('[data-gps-distance]')?.textContent||0)>=.01,null,{timeout:8000});
    assert.ok(await page.locator('[data-gps-map-overlay] .gps-map-track-line path').count()>0,'offline map still draws recorded track');
    assert.equal(await page.locator('[data-gps-route]').count(),0,'redundant route preview is removed');
    await page.locator('[data-gps-action="finish"]').click();
    await page.locator('[data-gps-action="discard"]').click();
    failTiles=false;
    // Finish with zero movement: never leave the user stuck on a disabled save path.
    await page.goto(host+'#/measurement',{waitUntil:'networkidle'});
    await page.locator('[data-gps-action="start"]').click();
    await page.locator('[data-gps-consent-confirm]').click();
    await page.locator('[data-gps-action="finish"]').click();
    assert.match(await page.locator('.gps-finish-unavailable').innerText(),/保存できません/);
    assert.equal(await page.locator('[data-gps-action="save"]').count(),0);
    await page.locator('[data-gps-action="discard"]').click();
    assert.match(new URL(page.url()).hash,/record-start/);
  }
  if(mode.name==='desktop'){
    await page.goto(host+'#/history',{waitUntil:'networkidle'});
    await page.evaluate(async()=>{
      const old=await import('/ui/gpsIndexedDbStore.js');
      await old.initializeGpsStore(); // fresh module URL is separate from app's query-versioned import
      const t=1700000000000;
      const point=(i,km)=>({lat:37.50+i*.0001,lon:139.90,
        ele:null,altitudeAccuracy:null,altitudeQuality:'missing',km,
        t:t+5000*i,breakBefore:i===0,activity:'RUNNING'});
      const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
        accepted:3,rejected:0,track:[point(0,0),point(1,.0125),point(2,.025)],
        trackSimplified:false};
      const saved=await old.saveGpsRun(session,{saveRoute:true,date:'2026-10-27'});
      if(!saved.ok)throw Error('legacy GPS fixture save: '+saved.reason);
    });
    await page.reload({waitUntil:'networkidle'});
    assert.match(await page.locator('.gps-history-capacity').innerText(),/このサイト全体/);
    await page.locator('[data-gps-capacity-check]').click();
    await page.waitForFunction(()=>{const s=document.querySelector('[data-gps-capacity-status]')?.textContent||'';return s.includes('使用率')||s.includes('取得できません')||s.includes('対応していません')},null,{timeout:8000});
    await page.locator('[data-gps-persist-request]').click();
    await page.locator('.gps-history-capacity-notice').waitFor();
    assert.match(await page.locator('.gps-history-capacity-notice').innerText(),/ブラウザー|要求できません|永続化/);
    const downloadedPromise=page.waitForEvent('download');
    await page.locator('[data-gps-backup-export]').click();
    const downloaded=await downloadedPromise;
    assert.ok(downloaded.suggestedFilename().startsWith('runload-gps-backup-')&&downloaded.suggestedFilename().endsWith('.json'));
    const gpsBackupJson=await readFile(await downloaded.path(),'utf8');
    const exported=JSON.parse(gpsBackupJson);
    assert.equal(exported.format,'runload-gps-backup');
    assert.equal(exported.records.length,1);
    assert.ok(exported.records[0].track.length>=2,'opted-in GPS route must be in explicit backup');
    await page.locator('[data-gps-delete]').first().click();
    await page.locator('[data-gps-confirm-delete]').first().click();
    await page.waitForFunction(()=>document.querySelectorAll('.gps-history-section > .gps-history-item').length===0,null,{timeout:8000});
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('.gps-history-section > .gps-history-item').count(),0,'IndexedDB deletion persists after reload');
    await page.locator('[data-gps-backup-file]').setInputFiles({name:'bad-gps.json',mimeType:'application/json',buffer:Buffer.from('{"version":99}')});
    assert.match(await page.locator('.gps-history-backup-notice').innerText(),/形式|不正/);
    assert.equal(await page.locator('.gps-history-section > .gps-history-item').count(),0,'invalid import never modifies GPS records');
    await page.locator('[data-gps-backup-file]').setInputFiles({name:'runload-gps.json',mimeType:'application/json',buffer:Buffer.from(gpsBackupJson)});
    assert.match(await page.locator('.gps-history-backup-confirm').innerText(),/GPS記録 1件/);
    await page.locator('[data-gps-backup-confirm]').click();
    await page.locator('.gps-history-section > .gps-history-item').first().waitFor();
    assert.match(await page.locator('.gps-history-section > .gps-history-item').first().innerText(),/軌跡保存あり/);
    await page.reload({waitUntil:'networkidle'});
    assert.equal(await page.locator('.gps-history-section > .gps-history-item').count(),1,'restored GPS route survives reload');
    const conflict=structuredClone(exported);
    conflict.records[0].activity='WALK';
    await page.locator('[data-gps-backup-file]').setInputFiles({name:'conflict-gps.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(conflict))});
    await page.locator('[data-gps-backup-confirm]').click();
    await page.waitForFunction(()=>document.querySelector('.gps-history-backup-notice')?.textContent?.includes('同じID'),null,{timeout:8000});
    assert.match(await page.locator('.gps-history-backup-notice').innerText(),/同じID/);
    assert.equal(await page.locator('.gps-history-section > .gps-history-item').count(),1,'conflicting import cannot overwrite a saved GPS record');
  }
  const gpsOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(gpsOverflow<=3,"GPS screen no horizontal overflow at "+mode.width+": "+gpsOverflow);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,mode.name+" horizontal overflow: "+overflow);
  // Saved manual run E2E: real storage and explicit ID, no simulated GPS input.
  await page.reload({waitUntil:'networkidle'});
  await page.goto(host+"#/record",{waitUntil:'networkidle'});
  assert.match(await page.locator('.rv-required-progress').innerText(),/距離・時間・活動種目/);
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.equal(await page.locator('[data-manual-run-save]').isDisabled(),true);
  const missingAll=await page.locator('.rr-alert').innerText();
  for(const item of ['距離','時間','活動種目'])assert.match(missingAll,new RegExp(item));
  await page.goto(host+"#/record",{waitUntil:'networkidle'});
  await page.locator('[data-draft="distance"]').fill('5.00');
  await page.locator('[data-draft="minutes"]').fill('30');
  assert.equal(await page.locator('[data-manual-gait]').count(),3,'activity choices appear in the manual basic form');
  await page.locator('[data-demo-save]').click();
  const review=page.locator('[data-record-review]');await review.waitFor();
  assert.ok(await review.locator('[data-manual-run-save]').isDisabled(),
    'a manual run is not savable without an activity category');
  assert.equal(await review.locator('[data-review-gait]').count(),3,
   'missing activity is disclosed as an explicitly required field');
  assert.match(await review.locator('.rr-alert').innerText(),/活動種目を選択してください/);
  assert.match(await review.locator('.rr-save-required-warning').innerText(),/入力が完了すると保存/);
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-required-warning-v19.png'),fullPage:false});
  await review.locator('[data-review-gait="RUNNING"]').click();
  assert.ok(await review.locator('[data-manual-run-save]').isEnabled(),
    'selecting an activity makes a valid manual record eligible to save');
  await page.waitForFunction(()=>{
    const b=document.querySelector('[data-manual-run-save]');
    return !!b&&b.isConnected&&!b.disabled&&getComputedStyle(b).backgroundImage.includes('gradient');
  },null,{timeout:12000}); // re-renders can detach the button between Playwright operations
  const saveAppearance=await page.evaluate(()=>{
    const button=document.querySelector('[data-manual-run-save]');
    return {background:getComputedStyle(button).backgroundImage,
      color:getComputedStyle(button).color,cursor:getComputedStyle(button).cursor};
  });
  assert.match(saveAppearance.background,/linear-gradient/,mode.name+' save button should look enabled');
  assert.equal(saveAppearance.cursor,'pointer');
  assert.notEqual(saveAppearance.color,'rgb(169, 199, 209)','save button text must have high contrast');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-review-save-v18.png'),fullPage:false});
  await review.locator('[data-manual-run-save]').click();
  await page.waitForURL(/#\/result\?record=run-v1-/);
  const savedResult=page.locator('#runload-result-v4');
  assert.match(await savedResult.locator('.rv4-notice').innerText(),/端末に保存した手入力/);
  assert.equal(await savedResult.locator('style[data-result-inline-styles]').count(),1,'result shadow styles are available immediately');
  const savedTheme=await savedResult.locator('.rv4-app').evaluate(el=>getComputedStyle(el).backgroundImage);
  assert.match(savedTheme,/radial-gradient/,'saved result has approved dark palette without flash');
  assert.equal((await savedResult.locator('.rv4-distance strong').innerText()).trim(),'5.00');
  assert.equal(await savedResult.locator('[data-body-reference-label]').count(),0,
   'continuous reference map opens clean without covering body segments');
  assert.ok(await savedResult.locator('[data-label-toggle]').isVisible());
  // Relief overlays are purely decorative and never replace palette data paths.
  const anatomyBaseCount=await savedResult.locator('.rv4-region').count();
  assert.equal(await savedResult.locator('.body-reference-relief').count(),anatomyBaseCount);
  assert.equal(await savedResult.locator('.body-reference-satin').count(),anatomyBaseCount);
  assert.equal(await savedResult.locator('.body-reference-relief[aria-hidden="true"][pointer-events="none"]').count(),anatomyBaseCount);
  const scientificFill=await savedResult.locator('.rv4-region').first().evaluate(el=>el.style.fill);
  assert.ok(scientificFill.startsWith('rgb(')||scientificFill.startsWith('#'),
   'reference scientific fill remains in base SVG geometry');

  // Approval preview: record the actual side-by-side anatomy/card arrangement
  // independently for 320, 390, 430 and desktop widths before merging to main.
  const bodyGeometry=await savedResult.locator('.rv4-body').evaluate(card=>{
    const bounds=selector=>card.querySelector(selector).getBoundingClientRect();
    const figure=bounds('.rv4-body-figure'),reading=bounds('.rv4-reading');
    const content=bounds('.rv4-body-content'),pane=bounds('.rv4-reading');
    return {figureRight:figure.right,readingLeft:reading.left,
      figureWidth:figure.width,readingWidth:reading.width,
      contentRight:content.right,cardRight:card.getBoundingClientRect().right,
      cardOverflow:card.scrollWidth-card.clientWidth,
      readingOverflow:card.querySelector('.rv4-reading').scrollWidth-card.querySelector('.rv4-reading').clientWidth,
      pageOverflow:document.documentElement.scrollWidth-window.innerWidth};
  });
  assert.ok(bodyGeometry.figureRight<=bodyGeometry.readingLeft+2,
    mode.name+' anatomy must stay LEFT of selected region card '+JSON.stringify(bodyGeometry));
  assert.ok(bodyGeometry.figureWidth>65&&bodyGeometry.readingWidth>105,
    mode.name+' two usable columns '+JSON.stringify(bodyGeometry));
  assert.ok(bodyGeometry.readingOverflow<=3&&bodyGeometry.cardOverflow<=4&&bodyGeometry.pageOverflow<=4,
    mode.name+' anatomy details do not clip '+JSON.stringify(bodyGeometry));
  if(mode.name!=='desktop')await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility='hidden'});
  await savedResult.locator('.rv4-body').screenshot({
    path:resolve(root,'screenshots',mode.name+'-body-left-right-preview.png'),animations:'disabled'});
  await savedResult.locator('[data-view="back"]').click();
  assert.equal(await savedResult.locator('.rv4-body-svg clipPath#rv4-silhouette-clip path').count(),1);
  assert.equal(await savedResult.locator('.rv4-body-svg g[clip-path="url(#rv4-silhouette-clip)"] .rv4-region').count(),4);
  await savedResult.locator('.rv4-body').screenshot({
    path:resolve(root,'screenshots',mode.name+'-back-silhouette-corrected.png'),animations:'disabled'});
  await savedResult.locator('[data-view="sole"]').click();
  await savedResult.locator('.rv4-body').screenshot({
    path:resolve(root,'screenshots',mode.name+'-sole-dimensional-preview.png'),animations:'disabled'});
  await savedResult.locator('[data-view="front"]').click();
  if(mode.name!=='desktop')await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility=''});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-continuous-palette-clean.png'),fullPage:false});
  await savedResult.locator('[data-label-toggle]').click();
  assert.ok(await savedResult.locator('[data-body-reference-label]').count()>0,
   'user can optionally show verified scientific numbers on the anatomy');
  // Simulate a record written by an older app version, which could save UNKNOWN.
  // Existing records must stay readable and offer an explicit repair path.
  const legacyBefore=await page.evaluate(()=>{
   const key='runload-v2-manual-runs-v1';
   const history=JSON.parse(localStorage.getItem(key));
   const record=history.records[0],original={id:record.id,distance:record.distanceKm,time:record.durationSeconds};
   record.draft.activityGait='UNKNOWN';
   history.revision+=1;localStorage.setItem(key,JSON.stringify(history));
   return original;
  });
  await page.reload({waitUntil:'networkidle'});
  assert.match(await savedResult.locator('.rv4-notice').innerText(),/活動種別が未選択/,'legacy/unspecified runs have no inferred activity');
  assert.equal((await savedResult.locator('.rv4-big-score').innerText()).trim(),'—','no fabricated score without explicit activity');
  assert.equal(await savedResult.locator('[data-body-reference-label]').count(),0,
   'unknown manual activity never creates fabricated reference values');
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-result-v18.png'),fullPage:false});
  await checkSavedResultPng(page,savedResult,mode,'unclassified',['文献参考値：算出対象外','活動種別が未選択','本人の身体負荷の実測値ではありません'],['/12 部位算出','身体の部位別の参考値はまだありません']);
  assert.equal(await savedResult.locator('[data-result-gait]').count(),3,
   'existing saved unknown activity offers in-place repair');
  await savedResult.locator('[data-result-gait="RUNNING"]').click();
  // Gait repair is now saved under the cross-tab lock; wait for its
  // confirmed UI re-render rather than inspecting the stale result panel.
  await savedResult.locator('[data-result-gait]').first().waitFor({state:'detached'});
  await savedResult.locator('.rv4-mini').waitFor();
  assert.match(await savedResult.locator('.rv4-mini').innerText(),/[1-9][0-2]?\/12 算出/);
  assert.equal(await savedResult.locator('[data-result-gait]').count(),0,
   'activity selection disappears after successful verified persistence');
  assert.notEqual((await savedResult.locator('.rv4-big-score').innerText()).trim(),'—');
  assert.equal(await savedResult.locator('[data-body-reference-label]').count(),0,
   'reloaded result defaults to clear colors and a separate value panel');
  await savedResult.locator('[data-label-toggle]').click();
  assert.ok(await savedResult.locator('[data-body-reference-label]').count()>0);
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-result-gait-repaired.png'),fullPage:false});
  await checkSavedResultPng(page,savedResult,mode,'eligible',['文献参考値：','/12 部位算出','各部位自身の文献基準を100','ROF-Jは本人が回答した疲労感'],['算出対象外','身体の部位別の参考値はまだありません']);
  const classification=await page.evaluate(()=>{
   const content=JSON.parse(localStorage.getItem('runload-v2-manual-runs-v1'));
   return {revision:content.revision,count:content.records.length,
     gait:content.records[0].draft.activityGait,distance:content.records[0].distanceKm,
     duration:content.records[0].durationSeconds,id:content.records[0].id};
  });
  assert.equal(classification.count,1,'retrofitting activity never creates a new record');
  assert.equal(classification.gait,'RUNNING');
  assert.equal(classification.distance,legacyBefore.distance);
  assert.equal(classification.duration,legacyBefore.time);
  assert.equal(classification.id,legacyBefore.id,'old record ID is unchanged after classification');
  const recordIds=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v1')).records.map(r=>r.id));
  assert.equal(recordIds.length,1);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('#runload-result-v4 .rv4-notice').innerText(),/端末に保存した手入力/);
  assert.equal(await page.locator('#runload-result-v4 [data-result-gait]').count(),0);
  assert.equal(await page.locator('#runload-result-v4 [data-body-reference-label]').count(),0,
   'body stays uncluttered by default after reload');
  assert.notEqual((await page.locator('#runload-result-v4 .rv4-big-score').innerText()).trim(),'—',
   'saved activity correction and a readable side-panel scientific value persist');
  await page.goto(host+'#/home',{waitUntil:'networkidle'});
  assert.match(await page.locator('.hx-latest').innerText(),/5.00/);
  const savedHomeTime=await page.locator('.hx-latest .hx-latest-fig>div:nth-child(2) strong').innerText();
  assert.equal(savedHomeTime.trim(),'30分','home must show editor minutes, never padded seconds');
  assert.doesNotMatch(savedHomeTime,/秒/);
  const latestFit=await page.locator('.hx-latest').evaluate(card=>({card:card.getBoundingClientRect().right,values:[...card.querySelectorAll('.hx-latest-fig strong')].map(el=>el.getBoundingClientRect().right)}));
  assert.ok(latestFit.values.every(x=>x<=latestFit.card+2),mode.name+' latest run card text clips: '+JSON.stringify(latestFit));
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-home-latest-v18.png'),fullPage:false});
  const actualAchievements=page.locator('.hx-achievement');
  assert.match(await actualAchievements.innerText(),/保存済み手入力走行から確認/);
  assert.match(await actualAchievements.innerText(),/2 \/ 4 項目/);
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.width='100%';});
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-achievement-saved-v29.png'),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.width='';});
  await page.locator('[data-achievement-open]').click();
  assert.match(await page.locator('.hx-ach-dialog').innerText(),/30分以上の走行記録を保存（達成）/);
  await page.locator('.hx-ach-dialog').screenshot({path:resolve(root,'screenshots',mode.name+'-achievement-dialog-v29.png')});
  await page.locator('.hx-ach-dialog [data-home-close]').click();
   await page.reload({waitUntil:'networkidle'}); // fresh editor state: prove saved-run provenance, not residual unsaved draft
   await page.goto(host+'#/exploration-tree',{waitUntil:'networkidle'});
   const savedExplore=page.locator('[data-experience-v3]');
   await savedExplore.waitFor();
   assert.equal(await savedExplore.locator('.ex-node[data-ex-category="01"][data-ex-source="saved-run"].is-related').count(),1,
      'valid saved run lights running-record constellation even after reload');
   assert.match(await savedExplore.locator('[data-ex-category="01"]').getAttribute('aria-label'),/保存した走行距離と時間に関連/);
   assert.equal(await savedExplore.locator('.ex-node[data-ex-category="03"].is-related').count(),0,'distance alone does not imply hills');
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-saved-run-glow-v23.png'),fullPage:false});
   await savedExplore.locator('[data-ex-category="01"]').click();
   assert.equal(await savedExplore.locator('[data-ex-learning="distance-time-pace"]').count(),1);
   const paceLesson=await savedExplore.locator('.ex-tool-result').innerText();
   assert.match(paceLesson,/5.00 km/);
   assert.match(paceLesson,/30分00秒/);
   assert.match(paceLesson,/6:00 分\/km/);
   assert.match(paceLesson,/10.0 km\/h/);
   await assertPaceColumnLayout(savedExplore,mode,'saved');
   await savedExplore.locator('[data-ex-learning="distance-time-pace"]').screenshot({path:resolve(root,'screenshots',mode.name+'-pace-card-saved-v28.png')});
   await page.screenshot({path:resolve(root,'screenshots',mode.name+'-explore-pace-saved-v27.png'),fullPage:false});
   await page.goto(host+'#/home',{waitUntil:'networkidle'});
  await page.locator('.hx-latest a[href^="#/result?record="]').click();
  assert.match(await page.locator('#runload-result-v4 .rv4-notice').innerText(),/端末に保存した手入力/);
  await page.goto(host+'#/result',{waitUntil:'networkidle'});
  assert.match(await page.locator('#runload-result-v4 .rv4-notice').innerText(),/端末に保存した手入力/,'result navigation defaults to latest saved run');
  await page.goto(host+'#/result?record=missing-record',{waitUntil:'networkidle'});
  assert.match(await page.locator('#runload-result-v4 [role="status"]').innerText(),/指定された保存済み走行記録が見つかりません/,'invalid explicit ID is explicitly rejected');
  assert.equal(await page.locator('#runload-result-v4 .rv4-notice').count(),0,'invalid ID cannot alias a valid result');
  assert.equal(await page.locator('#runload-result-v4 a[href="#/history"]').count(),1,'missing record offers history navigation');
  await page.goto(host+'#/history',{waitUntil:'networkidle'});
  const savedHistory=page.locator('#runload-history-v2');
  assert.equal(await savedHistory.locator('.entry').count(),1);
  await savedHistory.locator('.entry').first().click();
  if(mode.name!=="desktop"){
   const selectedPlacement=await page.evaluate(()=>{
    const footer=document.querySelector('#runload-history-v2')?.shadowRoot?.querySelector('.selected-footer');
    const nav=document.querySelector('.mobile-nav');
    return {footerBottom:footer?.getBoundingClientRect().bottom,navTop:nav?.getBoundingClientRect().top};
   });
   assert.ok(selectedPlacement.footerBottom<=selectedPlacement.navTop-8,
    mode.name+' saved history result action must clear navigation: '+JSON.stringify(selectedPlacement));
  }
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-history-v18.png'),fullPage:false});
  await savedHistory.locator('[data-open-record]').click();
  await page.locator('#runload-result-v4 style[data-result-inline-styles]').waitFor({state:'attached',timeout:12000}); // hashchange navigation completes asynchronously
  await page.waitForFunction(()=>{
    const host=document.querySelector('#runload-result-v4');
    const root=host?.shadowRoot,el=root?.querySelector('.rv4-app');
    return !!el&&el.isConnected&&!!root.querySelector('style[data-result-inline-styles]')&&getComputedStyle(el).backgroundImage.includes('radial-gradient');
  },null,{timeout:12000});
  assert.ok(decodeURIComponent(page.url()).includes('record='+recordIds[0]));
  await page.screenshot({path:resolve(root,'screenshots',mode.name+'-manual-result-from-history-v18.png'),fullPage:false});
  // Cross-screen visual audit: screen width, ordinary navigation and residual top chrome.
  const audited=['home','record','record-review','history','exploration-tree','condition','settings','result'];
  for(const route of audited){
    await page.goto(host+'#/'+route,{waitUntil:'networkidle'});
    const audit=await page.evaluate(()=>{
      const main=document.querySelector('.main-content'),nav=document.querySelector('.mobile-nav'),shell=document.querySelector('.app-shell');
      return {overflow:document.documentElement.scrollWidth-innerWidth,
       main:!!main,nav:!!nav,shell:!!shell,
       header:getComputedStyle(document.querySelector('.topbar')).display,
       background:getComputedStyle(main).backgroundImage,
       scrollWidth:document.documentElement.scrollWidth,
       width:innerWidth};
    });
    assert.ok(audit.main&&audit.nav&&audit.shell,mode.name+' '+route+' essential shell exists');
    assert.ok(audit.overflow<=3,mode.name+' '+route+' horizontal overflow: '+JSON.stringify(audit));
    if(['home','history','result','condition','record-review'].includes(route)){
      assert.equal(audit.header,'none',mode.name+' '+route+' should not show legacy top toolbar');
    }
    if(['result','home','history','condition'].includes(route)){
      assert.ok(!audit.background.includes('rgb(255, 255, 255)'),mode.name+' '+route+' white surface detected');
    }
    if(['mobile','desktop'].includes(mode.name)){
      await page.screenshot({path:resolve(root,'screenshots',mode.name+'-cross-audit-'+route+'-v20.png'),fullPage:false});
    }
  }
  // Cross-activity scientific E2E: real manual UI -> persistent record -> exact
  // original reference engine -> saved result page -> reload (no synthetic data).
  for(const example of [
    {activity:'RUNNING',distance:'4.50',minutes:'30'},
    {activity:'JOGGING',distance:'4.05',minutes:'30'},
    {activity:'WALK',distance:'2.70',minutes:'30'}
  ]){
    await page.reload({waitUntil:'networkidle'});
    await page.goto(host+'#/record',{waitUntil:'networkidle'});
    await page.locator('[data-draft="distance"]').fill(example.distance);
    await page.locator('[data-draft="minutes"]').fill(example.minutes);
    await page.goto(host+'#/record-compare',{waitUntil:'networkidle'});
    await page.locator('[data-g4-gait="'+example.activity+'"]').click();
    assert.equal(await page.locator('[data-g4-gait="'+example.activity+'"]').getAttribute('aria-pressed'),'true');
    await page.goto(host+'#/record',{waitUntil:'networkidle'});
    await page.locator('[data-demo-save]').click();
    await page.locator('[data-record-review] [data-manual-run-save]').click();
    const output=page.locator('#runload-result-v4');
    await output.locator('.rv4-mini').waitFor();
    const notice=await output.locator('.rv4-notice').innerText();
    assert.match(notice,/文献条件/,example.activity+' must render a source-bounded reference result');
    assert.match(await output.locator('.rv4-mini').innerText(),/[1-9][0-2]?\/12 算出/,example.activity+' has at least one real output');
    await output.locator('[data-picker-toggle]').click();
    await output.locator('.rv4-choices button[data-region="BA-DISP-014"]').click();
    assert.notEqual((await output.locator('.rv4-big-score').innerText()).trim(),'—',example.activity+' selected hip region is computed');
    const hipValue=(await output.locator('.rv4-big-score').innerText()).trim();
    const marker=output.locator('.rv4-scale-current');
    assert.equal(await marker.count(),1,'selected scientific value has a position on the scale');
    assert.equal(await output.locator('.rv4-picker').innerText().then(s=>s.includes('部位を選ぶ')),true);
    assert.equal(await output.locator('[data-body-reference-label]').count(),0,
      'default anatomy must be readable without numeric badges obscuring legs');
    await output.locator('[data-label-toggle]').click();
    const hipBadge=output.locator('[data-body-reference-label="BA-DISP-014"]');
    assert.equal(await hipBadge.count(),1,example.activity+' real hip value appears directly on figure');
    assert.equal(await hipBadge.getAttribute('data-body-reference-value'),hipValue,
      example.activity+' anatomical badge equals the unchanged engine-selected value');
    assert.equal(await output.locator('.rv4-body-svg [data-region="BA-DISP-014"]').getAttribute('data-reference-state'),
      'available','computed body segment must have a science-derived fill');
    const badges=output.locator('[data-body-reference-label]');
    assert.ok(await badges.count()>0,example.activity+' body contains at least one visible number');
    await output.locator('[data-view="back"]').click();
    assert.equal(await output.locator('[data-region]').count(),4,example.activity+' back body intact');
    await output.locator('[data-view="sole"]').click();
    assert.equal(await output.locator('[data-region]').count(),3,example.activity+' sole body intact');
    const actualId=new URLSearchParams(page.url().split('?')[1]||'').get('record');
    assert.ok(actualId?.startsWith('run-v1-'));
    await page.reload({waitUntil:'networkidle'});
    assert.match(await page.locator('#runload-result-v4 .rv4-notice').innerText(),/文献条件/,'calculation survives saved-ID reload');
    assert.match(await page.locator('#runload-result-v4 .rv4-mini').innerText(),/\/12 算出/);
  }
  await page.close();
  console.log("PASS",mode.name,"manual save / reload / result / home / history / three science engines");

 }
}finally{await browser.close();server.close()}