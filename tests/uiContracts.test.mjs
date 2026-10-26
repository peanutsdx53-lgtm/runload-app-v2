import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync,readdirSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("HTML has installable PWA assets and correct viewport",()=>{
 const html=read("index.html");
 for(const s of ['rel="manifest"','manifest.webmanifest','apple-touch-icon','pwa.js','viewport-fit=cover'])assert.ok(html.includes(s),s);
});
test("manifest stays within GitHub Pages project scope",()=>{
 const m=JSON.parse(read("manifest.webmanifest"));
 assert.equal(m.display,"standalone");assert.equal(m.start_url,"./#/home");assert.equal(m.scope,"./");
 assert.deepEqual(m.icons.filter(i=>i.type==="image/png").map(i=>i.sizes),["192x192","512x512"]);
 for(const icon of m.icons)assert.ok(existsSync(new URL("../"+icon.src,import.meta.url)),icon.src);
});
test("PWA PNG icons have valid signatures and dimensions",()=>{
 for(const n of [192,512]){
 const file=readFileSync(new URL("../icons/icon-"+n+".png",import.meta.url));
 assert.equal(file.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
 assert.equal(file.subarray(12,16).toString("ascii"),"IHDR");
 assert.equal(file.readUInt32BE(16),n);assert.equal(file.readUInt32BE(20),n);
 }
});
test("SW precaches all offline-critical resources",()=>{
 const sw=read("sw.js");
 for(const file of ["index.html","styles.css","app.js","pwa.js","assets/bodyRegionVisuals.js","manifest.webmanifest","icon-192.png","icon-512.png"])
 assert.ok(sw.includes(file),file);
 assert.ok(sw.includes("mode===\"navigate\""),"offline navigation fallback");
});
test("12 official region IDs remain present",()=>{
 const js=read("app.js");
 const ids=[...js.matchAll(/id:"(BA-DISP-\d{3})"/g)].map(m=>m[1]);
 assert.equal(ids.length,12);assert.equal(new Set(ids).size,12);
 assert.ok(read("assets/bodyRegionVisuals.js").includes("BODY_REGION_VIEWS"));
 for(const id of ids)assert.ok(read("assets/bodyRegionVisuals.js").includes(id),id);
});
test("main navigation and prototype restrictions",()=>{
 const js=read("app.js");
 for(const page of ['home','record','result','history','exploration-tree','settings'])assert.ok(js.includes(page));
 assert.ok(js.includes("mobileNav=["));
 assert.ok(!/デモ専用|UI 試作版|配置・動線の試作/.test(js),"do not display developer-only labels in product screens");
 assert.ok(js.includes("resultExperience.mountResult"),"result uses the isolated result Ver4 experience");
 assert.ok(js.includes('data-ex-category'),"exploration choices are interactive");
});
test("install UI offers manual iOS steps",()=>{
 const js=read("pwa.js");
 assert.ok(js.includes("ホーム画面に追加"));
 assert.ok(js.includes("beforeinstallprompt"));
 assert.ok(js.includes("data-install-app"));
 assert.ok(!js.includes('class="install-backdrop" data-install-dismiss'),"overlay should not dismiss all inner clicks");
});

test("only registered locally produced or approved visual assets are shipped",()=>{
 const register=read("assets/ASSET_REGISTER.md");
 const required=["bodyRegionVisuals.js","icon.svg","icon-192.png","icon-512.png","clip-path","外部素材"];
 for(const name of required)assert.ok(register.includes(name),"asset register missing "+name);
 for(const f of ["app.js","styles.css","pwa.js","index.html"]){
   const src=read(f);
   assert.ok(!/<img[^>]+src=["']https?:/i.test(src),"external runtime image in "+f);
   assert.ok(!/url\(\s*["']?https?:/i.test(src),"remote CSS background in "+f);
   assert.ok(!/data:image\/(?:jpeg|webp|png);base64,/i.test(src),"embedded unknown raster in "+f);
 }

 for(const directory of ["assets","icons"]){
   const files=readdirSync(new URL("../"+directory+"/",import.meta.url));
   const allowed=directory==="assets"?["ASSET_REGISTER.md","bodyRegionVisuals.js","rof"]:["icon.svg","icon-192.png","icon-512.png"];
   for(const filename of files)assert.ok(allowed.includes(filename),"unregistered artwork: "+directory+"/"+filename);
 }
});

test("local ROF-J illustrations match the approved five-figure asset register",()=>{
 const path=new URL("../assets/rof/",import.meta.url);
 const allowed=["lowest","low","moderate","high","highest"].map(v=>"rof-visual-"+v+".png");
 assert.deepEqual(readdirSync(path).sort(),allowed.sort());
 const register=read("assets/ASSET_REGISTER.md");
 for(const name of allowed){
  const data=readFileSync(new URL(name,path));
  assert.equal(data.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.ok(data.length>2000,"figure content must not be an empty placeholder");
 }
 assert.match(register,/Micklewright et al/);
});

test("v8 release uses cache-busted body resources and a user-controlled update prompt",()=>{
 const html=read("index.html"),app=read("app.js"),pwa=read("pwa.js"),sw=read("sw.js");
 assert.match(html,/app\.js\?v=20261026-explore-layout-v28/);
 assert.match(html,/bodyContextExperience\.css\?v=20261025-terminology-v1/);
 assert.match(app,/bodyContextExperience\.js\?v=20261026-user-copy-v21/);
 assert.match(pwa,/updateViaCache:\"none\"/);
 assert.match(pwa,/更新する/);
 assert.match(sw,/interpret-v14/);
 assert.match(sw,/cache:\"no-cache\"/);
});

test("settings v2 uses a dark outer shell and full content width",()=>{const css=read("ui/settingsExperience.css"),html=read("index.html");assert.match(css,/\.app-shell:has\(\[data-settings-v2\]\) \.main-frame/);assert.match(css,/\.app-shell:has\(\[data-settings-v2\]\) \.main-content\{max-width:none/);assert.match(html,/settingsExperience\.css\?v=20261025-settings-surface-05/)});

test("global double-tap suppression preserves accessible pinch zoom and approved condition navigation colors",()=>{
 const styles=read("styles.css"),condition=read("ui/conditionJourney.css"),html=read("index.html"),sw=read("sw.js");
 assert.match(styles,/html,body,#app\{touch-action:manipulation\}/);
 assert.match(styles,/a,button,input,select,textarea,summary,label,\[role="button"\],\[tabindex\]\{touch-action:manipulation\}/);
 assert.doesNotMatch(html,/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:[\s"'&,]|$)/i);
 assert.match(styles,/html,body,#app\{touch-action:manipulation\}/); // specialized drag surfaces may legitimately use touch-action:none
 for(const token of ['background:#0c1d2bef','border-top-color:#2e5263','color:#c0cbd5','color:#55dce3','background:transparent']){
  assert.ok(condition.includes(token),"condition uses approved Home navigation: "+token);
 }
 assert.match(html,/styles\.css\?v=20261026-result-chrome-v20/);
 assert.match(html,/conditionJourney\.css\?v=20261026-condition-v17/);
 assert.match(sw,/interpret-v14-condition-v17-touch/);
});
