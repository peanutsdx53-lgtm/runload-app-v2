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
  if(mode.name==="mobile"){
    const intro=await browser.newPage({viewport:{width:390,height:844},reducedMotion:"reduce"});
    await intro.goto(host+"#/home",{waitUntil:"networkidle"});
    assert.equal(await intro.locator(".onboard-dialog").count(),1,"first run tutorial should appear");
    assert.match(await intro.locator("#onboard-title").innerText(),/ようこそ/);
    await intro.screenshot({path:resolve(root,"screenshots","mobile-onboarding-welcome.png"),fullPage:false});
    await intro.locator("[data-onboard-next]").click();
    assert.equal(await intro.locator("input[name=onboard-language]:checked").inputValue(),"ja");
    assert.ok(await intro.locator("input[value=en]").isDisabled(),"English is not misleadingly claimed available");
    await intro.locator("[data-onboard-next]").click();
    assert.match(await intro.locator(".onboard-legal").innerText(),/同意の取得・記録ではありません|同意済みの扱いになりません/);
    await intro.screenshot({path:resolve(root,"screenshots","mobile-onboarding-privacy.png"),fullPage:false});
    await intro.locator("[data-onboard-next]").click();
    await intro.locator("[data-onboard-nickname]").fill("検証用");
    await intro.locator("[data-onboard-purpose]").selectOption("learn");
    await intro.locator("[data-onboard-height]").fill("171.2");
    await intro.locator("[data-onboard-weight]").fill("67.4");
    await intro.locator("[data-onboard-next]").click();
    assert.match(await intro.locator("#onboard-title").innerText(),/始め方/);
    await intro.locator("[data-onboard-next]").click();
    const pref=await intro.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-introduction-preview-v1")));
    assert.deepEqual({completed:pref.completed,nickname:pref.nickname,purpose:pref.purpose,formalTermsAccepted:pref.formalTermsAccepted},{completed:true,nickname:"検証用",purpose:"learn",formalTermsAccepted:false});
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
  page.on("pageerror",error=>{throw new Error(mode.name+" page error: "+error.message)});
  await page.goto(host+"#/home",{waitUntil:"networkidle"});
  await page.locator("h1").waitFor();
  assert.match(await page.locator("h1").innerText(),/ホーム/);
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
  assert.equal(await page.locator(".hx-shortcuts a").count(),3,"shortcuts only point to supplementary functions");
  assert.equal(await page.locator(".home-welcome").count(),0,"no decorative greeting");
  assert.equal(await page.locator(".hx-latest").innerText().then(t=>t.includes("走行記録はまだありません")),true,"never invent recent-run data");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-home-empty.png"),fullPage:true});
  await page.locator("[data-home-preview]").click();
  assert.match(await page.locator(".hx-preview-banner").innerText(),/サンプルデータ/);
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
    assert.ok(await page.locator(".gps-v2-button[disabled]").isDisabled(),"real GPS cannot be started");
  }
  await page.goto(host+"#/result",{waitUntil:"networkidle"});
  const report=page.locator('#runload-result-v4');
  await report.locator('.rv4-region').first().waitFor({timeout:15000});
  assert.equal(await report.locator('.rv4-region').count(),5,"front view has five official region targets");
  assert.match(await report.locator('.rv4-card-heading').first().innerText(),/速度と身体の反応/);
  assert.match(await report.locator('.rv4-notice').innerText(),/正式保存/);
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
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result-viewport.png"),fullPage:false});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-result.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
  await page.goto(host+"#/exploration-tree",{waitUntil:"networkidle"});
  await page.locator(".exploration-stage").waitFor();
  assert.equal(await page.locator(".tree-desktop .tree-hub").count(),7,"desktop tree has 7 domains");
  assert.equal(await page.locator(".tree-desktop .tree-leaf").count(),28,"desktop tree has 28 topic leaves");
  assert.equal(await page.locator(".tree-mobile .tree-bubble").count(),7,"mobile tree has 7 selectable domains");
  assert.equal(await page.locator(".tree-decoration").count(),0,"ornamental tree leaves are deferred");
  const beforeZoom=await page.locator(".tree-pan-viewport").evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,height:el.scrollHeight,viewHeight:el.clientHeight}));
  assert.ok(beforeZoom.scroll>beforeZoom.client&&beforeZoom.height>beforeZoom.viewHeight,mode.name+" both directions must be scrollable");
  await page.locator("[data-tree-zoom=in]").click();
  assert.match(await page.locator("[data-tree-zoom-value]").innerText(),/120%/);
  const afterZoom=await page.locator(".tree-pan-viewport").evaluate(el=>el.scrollWidth);
  assert.ok(afterZoom>beforeZoom.scroll,mode.name+" zoom increases map width");
  await page.locator("[data-tree-zoom=reset]").click();
  const fitted=await page.locator(".tree-pan-viewport").evaluate(el=>({width:el.scrollWidth,clientWidth:el.clientWidth,height:el.scrollHeight,clientHeight:el.clientHeight}));
  const fittedLabel=await page.locator("[data-tree-zoom-value]").innerText();
  assert.ok(fitted.width<=fitted.clientWidth+3&&fitted.height<=fitted.clientHeight+3,mode.name+" fit-to-map must show complete diagram "+JSON.stringify({fitted,fittedLabel}));
  assert.ok(Number.parseInt(fittedLabel)>=40&&Number.parseInt(fittedLabel)<=100,mode.name+" fit magnification should stay valid");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-tree-fit.png"),fullPage:false});

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
  assert.equal(await page.locator(".rv-manual").count(),1,"PC and mobile share manual screen");
  assert.equal(await page.locator("[data-record-type]").count(),2);
  assert.equal(await page.locator("[data-activity-type]").count(),0);
  assert.equal(await page.locator(".rv-unit-input").count(),2,"distance and total minutes side by side");
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
  assert.match(await page.locator('[data-record-review]').innerText(),/正式な保存機能は未接続/);
  assert.match(await page.locator('[data-record-review]').innerText(),/川沿い往復/);
  assert.match(await page.locator('.rr-metrics').innerText(),/7.25/);
  assert.match(await page.locator('.rr-metrics').innerText(),/45:30/);
  assert.equal(await page.locator('.rr-alert.is-warning').count(),0);
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
  await page.goto(host+"#/history",{waitUntil:"networkidle"});
  const historyRoot=page.locator('#runload-history-v2');
  await historyRoot.locator('.calendar-panel').waitFor();
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-history-v2-initial.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.bottom=''});
  const totalDays=await historyRoot.locator('[data-day]').count();
  assert.ok(totalDays>=28&&totalDays<=31,"calendar shows actual number of days");
  assert.equal(await historyRoot.locator('.day-grid button.has-record').count(),0,"no invented saved dates");
  assert.equal(await historyRoot.locator('.entry').count(),0,"no invented saved-record links");
  assert.match(await historyRoot.locator('[data-history-unconnected]').innerText(),/保存済みの履歴はまだ接続されていません/);
  await historyRoot.locator('[data-day="12"]').click();
  assert.match(await historyRoot.locator('.results-counter').innerText(),/12日の記録/);
  await historyRoot.locator('[data-clear-day]').click();
  assert.equal(await historyRoot.locator('.entry').count(),0);
  await historyRoot.locator('[data-record-kind="run"]').click();
  assert.equal(await historyRoot.locator('.entry').count(),0);
  await historyRoot.locator('#hx-search').fill('未保存入力と異なる検索文字');
  assert.equal(await historyRoot.locator('.entry').count(),0);
  await historyRoot.locator('[data-month="-1"]').click();
  assert.equal(await historyRoot.locator('.entry').count(),0);
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-history-v2-approved.png"),fullPage:true});
  if(mode.name!=="desktop")await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.bottom=''});
  await page.goto(host+"#/result",{waitUntil:"networkidle"});
  const historicalReport=page.locator("#runload-result-v4");
  assert.match(await historicalReport.locator(".rv4-notice").innerText(),/表示できる保存記録はまだありません/);
  assert.equal((await historicalReport.locator(".rv4-distance strong").innerText()).trim(),"—","unsaved input must not leak into result");
    for(const route of ["record","history","settings","measurement","course","simulation","consultation","body-part-detail"]){
   await page.goto(host+"#/"+route,{waitUntil:"networkidle"});
   await page.locator("h1").waitFor();
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+"-viewport.png"),fullPage:false});
   if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="static";el.style.width="100%"});
   await page.screenshot({path:resolve(root,"screenshots",mode.name+"-"+route+".png"),fullPage:true});
   if(mode.name!=="desktop")await page.locator(".mobile-nav").evaluate(el=>{el.style.position="";el.style.width=""});
   const visibleArea=route==="history"?page.locator("#runload-history-v2").locator(".stage"):page.locator("main");
   assert.ok((await visibleArea.innerText()).length>60,route);
   const textContent=await visibleArea.innerText();
   assert.ok(!/デモ専用|UI 試作版|仮データ|画面確認用/.test(textContent),route+" developer-only text found");
   const routeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(routeOverflow<=3,mode.name+" "+route+" horizontal overflow: "+routeOverflow);
  }
  await page.goto(host+"#/measurement",{waitUntil:"networkidle"});
  assert.equal(await page.locator('[data-measurement-v2]').getAttribute('data-preview'),"false");
  assert.match(await page.locator(".gps-v2-banner").innerText(),/GPS測定機能は現在利用できません/);
  assert.ok(await page.locator(".gps-v2-button[disabled]").isDisabled(),"readiness start remains blocked");
  if(mode.name!=="desktop"){
    const navBg=await page.locator(".mobile-nav").evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.ok(!navBg.includes("255, 255, 255"),"GPS readiness navigation keeps dark visual tone: "+navBg);
  }
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-gps-v2-ready.png"),fullPage:false});
  await page.locator('[data-gps-preview="preview"]').click();
  await page.locator('[data-gps-preview="show-running"]').click();
  assert.match(await page.locator(".gps-v2-banner").innerText(),/サンプル値/,"all active metrics explicitly samples");
  assert.equal(await page.locator('.gps-v2-clock>strong').innerText(),"00:32:16");
  assert.equal(await page.evaluate(()=>Math.round(window.scrollY)),0,"demo enters from top instead of clipped scrolled position");
  if(mode.name!=="desktop")assert.equal(await page.locator(".mobile-nav").isVisible(),false,"active measurement preview hides distracting navigation");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-gps-v2-running-demo.png"),fullPage:false});
  await page.locator('[data-gps-preview="show-paused"]').first().click();
  assert.match(await page.locator(".gps-v2-signal").innerText(),/一時停止/);
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-gps-v2-paused-demo.png"),fullPage:false});
  await page.locator('[data-gps-preview="end"]').click();
  assert.equal(await page.locator(".gps-v2-confirm").count(),1,"ending requires explicit confirmation");
  await page.screenshot({path:resolve(root,"screenshots",mode.name+"-gps-v2-confirm-demo.png"),fullPage:false});
  await page.locator('[data-gps-preview="cancel-end"]').click();
  assert.equal(await page.locator(".gps-v2-confirm").count(),0,"return from end confirmation");
  await page.locator('[data-gps-preview="end"]').click();
  await page.locator('[data-gps-preview="confirm-end"]').click();
  await page.locator('[data-record-review]').waitFor();
  assert.equal(await page.locator('[data-record-review]').getAttribute('data-review-source'),'gps');
  assert.equal(await page.locator('.rr-metrics strong').first().innerText(),'—','GPS preview values are not real measurements');
  assert.match(await page.locator('.rr-alert').innerText(),/未取得/);
  const gpsOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(gpsOverflow<=3,"GPS screen no horizontal overflow at "+mode.width+": "+gpsOverflow);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,mode.name+" horizontal overflow: "+overflow);
  await page.close();
  console.log("PASS",mode.name,"home / 12-regions / body maps / tree / install dialog / overflow");
 }
}finally{await browser.close();server.close()}