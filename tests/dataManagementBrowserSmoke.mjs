import assert from "node:assert/strict";
import {createServer} from "node:http";
import {mkdir,readFile} from "node:fs/promises";
import {resolve,dirname,extname,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".webmanifest":"application/manifest+json",".svg":"image/svg+xml",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname);
  const file=resolve(root,"."+pathname);
  if(!(file===root||file.startsWith(root+sep)))throw Error("outside root");
  const real=file===root?resolve(root,"index.html"):file;
  res.setHeader("Content-Type",mime[extname(real)]||"application/octet-stream");
  res.end(await readFile(real));
 }catch{res.statusCode=404;res.end("Not found");}
});
await new Promise(ok=>server.listen(4190,"127.0.0.1",ok));
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
const url="http://127.0.0.1:4190/#/settings";
try{
 await mkdir(resolve(root,"screenshots"),{recursive:true});
 for(const mode of [{name:"narrow",width:320,height:740},{name:"mobile",width:390,height:844},{name:"desktop",width:1440,height:900}]){
  const ctx=await browser.newContext({viewport:{width:mode.width,height:mode.height},acceptDownloads:true,reducedMotion:"reduce"});
  const page=await ctx.newPage();const errors=[];page.on("pageerror",x=>errors.push(x.message));
  await page.goto("http://127.0.0.1:4190/");
  await page.evaluate(()=>{
   localStorage.setItem("runload-v2-introduction-preview-v1",JSON.stringify({completed:true,language:"ja"}));
   localStorage.setItem("runload-v2-user-profile-v1",JSON.stringify({nickname:"テスト",purpose:"health",heightCm:172,weightKg:65,ageBand:"18-29"}));
   localStorage.setItem("runload-v2-life-condition-v1",JSON.stringify([{date:"2026-10-10",sleepMinutes:420,feeling:"良い",memo:""}]));
   localStorage.setItem("runload-v2-legal-consent-v1",JSON.stringify({termsAccepted:true,privacyConfirmed:true,acceptedAt:"2026-10-28T00:00:00Z",termsVersion:"2026-10-28",privacyVersion:"2026-10-28"}));
  });
  await page.goto(url,{waitUntil:"domcontentloaded"});await page.locator("[data-settings-v2]").waitFor();
  const backup=page.locator(".s2-item").filter({hasText:"バックアップ・復元"}).first();
  await backup.locator("summary").click();
  await page.screenshot({path:resolve(root,"screenshots","data-management-"+mode.name+"-backup.png"),fullPage:true});
  assert.equal(await backup.locator("[data-dm-include-gps]").isChecked(),false);
  const [download]=await Promise.all([page.waitForEvent("download"),backup.locator("[data-dm-export]").click()]);
  const backupJson=await readFile(await download.path(),"utf8");
  const parsed=JSON.parse(backupJson);
  assert.equal(parsed.format,"running-data-portable-backup");
  assert.equal(parsed.gpsLegacy,null);assert.equal(parsed.gpsCurrent,null);
  assert.equal(parsed.local["runload-v2-legal-consent-v1"],undefined);
  assert.equal(JSON.parse(parsed.local["runload-v2-life-condition-v1"]).length,1);
  assert.equal(JSON.parse(parsed.local["runload-v2-user-profile-v1"]).nickname,"テスト");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+3),true,"No horizontal overflow "+mode.name);
  const deletion=page.locator(".s2-item").filter({hasText:"データの削除"}).first();
  await deletion.locator("summary").click();
  await page.screenshot({path:resolve(root,"screenshots","data-management-"+mode.name+"-delete.png"),fullPage:true});
  assert.equal(await deletion.locator("[data-dm-delete-confirm]").isDisabled(),true);
  await deletion.locator("[data-dm-delete-agree]").check();
  await deletion.locator("[data-dm-delete-word]").fill("削除");
  assert.equal(await deletion.locator("[data-dm-delete-confirm]").isEnabled(),true);
  await deletion.locator("[data-dm-delete-confirm]").click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(()=>localStorage.getItem("runload-v2-life-condition-v1")===null);
  assert.equal(await page.evaluate(()=>localStorage.getItem("runload-v2-legal-consent-v1")),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem("runload-v2-user-profile-v1")),null);
  await page.goto(url,{waitUntil:"domcontentloaded"});
  // Fresh initial use must appear after intentional removal of its local completion state.
  assert.match(await page.locator("#onboard-title").innerText(),/表示言語/);
  await ctx.close();
  const importCtx=await browser.newContext({viewport:{width:mode.width,height:mode.height},acceptDownloads:true,reducedMotion:"reduce"});
  const importPage=await importCtx.newPage();const importErrors=[];importPage.on("pageerror",x=>importErrors.push(x.message));
  await importPage.goto("http://127.0.0.1:4190/");
  await importPage.evaluate(()=>{localStorage.setItem("runload-v2-introduction-preview-v1",JSON.stringify({completed:true,language:"ja"}));});
  await importPage.goto(url,{waitUntil:"domcontentloaded"});await importPage.locator("[data-settings-v2]").waitFor();
  const restoreBlock=importPage.locator(".s2-item").filter({hasText:"バックアップ・復元"}).first();
  await restoreBlock.locator("summary").click();
  await restoreBlock.locator("[data-dm-file]").setInputFiles({name:"運動記録.json",mimeType:"application/json",buffer:Buffer.from(backupJson)});
  await restoreBlock.locator("[data-dm-restore]").waitFor();
  assert.match(await restoreBlock.innerText(),/読み込む内容/);
  await importPage.screenshot({path:resolve(root,"screenshots","data-management-"+mode.name+"-restore.png"),fullPage:true});
  await restoreBlock.locator("[data-dm-restore]").click();
  await importPage.waitForFunction(()=>localStorage.getItem("runload-v2-user-profile-v1")!==null);
  assert.equal(await importPage.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-user-profile-v1")).nickname),"テスト");
  assert.equal(await importPage.evaluate(()=>JSON.parse(localStorage.getItem("runload-v2-life-condition-v1")).length),1);
  assert.equal(await importPage.evaluate(()=>localStorage.getItem("runload-v2-legal-consent-v1")),null,"consent excluded");
  assert.deepEqual(errors,[],mode.name+" source errors");
  assert.deepEqual(importErrors,[],mode.name+" restore errors");
  await importCtx.close();
  console.log("PASS",mode.name,"backup, selection, restore, deliberate deletion, and responsive settings");
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
