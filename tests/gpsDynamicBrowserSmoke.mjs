/* Actual browser/IndexedDB integration contract for approved dynamic GPS result. */
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const engineName=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+decodeURIComponent(path));
  if(!file.startsWith(root+sep)&&file!==root)throw Error('denied');
  const actual=file===root?resolve(root,'index.html'):file;
  const buf=await readFile(actual);
  res.setHeader('content-type',mime[extname(actual)]||'application/octet-stream');res.end(buf);
 }catch{res.writeHead(404);res.end('Not found');}
});
await new Promise(done=>server.listen(4189,'127.0.0.1',done));
const engine=engineName==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true,...(engineName==='chromium'&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 const layoutReports=[];
 const measurePanels=async(page,mode,view)=>page.evaluate(({mode,view})=>{
  const rect=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2)}};
  const intersects=(a,b)=>a&&b&&Math.min(a.right,b.right)-Math.max(a.x,b.x)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>1;
  const panels=[...document.querySelectorAll('.gd-main>.gd-panel')].map((p,index)=>{
   const head=p.querySelector('.gd-panel-head'),title=head?.querySelector('strong'),tabs=head?.querySelector('.gd-tabs'),
    info=head?.querySelector('small'),stage=p.querySelector('.gd-stage'),foot=p.querySelector('.gd-panel-foot');
   const headItems=[title,tabs,info].filter(Boolean);
   return {index,panel:rect(p),header:rect(head),title:rect(title),tabs:rect(tabs),headerMeta:rect(info),
    stage:rect(stage),footer:rect(foot),value:rect(foot?.querySelector('.gd-value')),
    headerOverlap:headItems.some((a,i)=>headItems.slice(i+1).some(b=>intersects(rect(a),rect(b)))),
    headerOverflow:headItems.some(el=>{const a=rect(el),b=rect(head);return a&&b&&(a.x<b.x-1||a.right>b.right+1||a.y<b.y-1||a.bottom>b.bottom+1)}),
    footerOverflow:foot?.scrollWidth-foot?.clientWidth||0,wholeOverflow:p.scrollWidth-p.clientWidth};
  });
  return {mode,view,width:innerWidth,height:innerHeight,documentOverflow:document.documentElement.scrollWidth-innerWidth,
   panelTopDifference:panels.length===2?+(panels[1].panel.y-panels[0].panel.y).toFixed(2):null,
   stageTopDifference:panels.length===2?+(panels[1].stage.y-panels[0].stage.y).toFixed(2):null,panels,hash:location.hash};
 },{mode,view});
 for(const mode of [{name:'mobile',width:390,height:844},{name:'desktop',width:1440,height:900}]){
  const page=await browser.newPage({viewport:{width:mode.width,height:mode.height},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',err=>errors.push(String(err)));
  await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja',formalTermsAccepted:false})));
  await page.goto('http://127.0.0.1:4189/#/history',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
   const id='gps-v2-00000000-0000-4000-8000-000000000001',t=1700000000000;
   const db=await new Promise((resolve,reject)=>{
    const req=indexedDB.open('runload-v2-gps-dynamic-v2',1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('summaries'))db.createObjectStore('summaries',{keyPath:'id'});if(!db.objectStoreNames.contains('details'))db.createObjectStore('details',{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
   });
   const scientific=await import('/ui/gpsReplayReference.js');
   const staticReference=scientific.evaluateGpsReplayReference({activity:'RUNNING',speedMps:2.75});
   const summary={schema:2,id,activity:'RUNNING',date:'2026-10-27',createdAt:new Date(t).toISOString(),
     distanceKm:.0275,activeSeconds:10,accepted:3,rejected:0,detailSaved:true,
     finalReference:{state:staticReference.state,speedMps:2.75,modelVersion:staticReference.modelVersion||null,semanticVersion:staticReference.semanticVersion||null,
      source:staticReference.source||null,regions:staticReference.rows.map(r=>({regionId:r.regionId,value:r.calculationState==='CALCULATED'?r.value:null,calculationState:r.calculationState,reasonCode:r.reasonCode||null}))}};
   const route=[{lat:37.5000,lon:139.9000,km:0,t,breakBefore:true},
     {lat:37.5001,lon:139.9001,km:.0125,t:t+5000,breakBefore:false},
     {lat:37.5003,lon:139.9002,km:.0275,t:t+10000,breakBefore:false}];
   const detail={id,schema:2,route,trackSimplified:false,
      speedPoints:route.map((r,i)=>({t:r.t,km:r.km,breakBefore:r.breakBefore,activeMs:i*5000})),
      flags:[{id:'flag-e2e01',t:t+5000,km:.0125,lat:37.5001,lon:139.9001,note:'折り返し'}]};
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(['summaries','details'],'readwrite');
    tx.objectStore('summaries').add(summary);tx.objectStore('details').add(detail);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });db.close();
  });
  // Exercise the production v2 writer in the actual browser, including opt-out
  // and an all-in-one backup, not just hand-seeded IndexedDB reads.
  const persisted=await page.evaluate(async()=>{
   const storage=await import('/ui/gpsReplayIndexedDbStore.js');
   const base=1700001000000;
   const mk=(i,km)=>({lat:37.51+i*.00003,lon:139.91,
    ele:null,altitudeAccuracy:null,altitudeQuality:'missing',
    t:base+5000*i,km,breakBefore:i===0,activity:'RUNNING'});
   const track=[mk(0,0),mk(1,.0125),mk(2,.025)];
   const session={phase:'finished',activity:'RUNNING',distanceM:25,elapsedMs:10000,
    accepted:3,rejected:0,track,trackSimplified:false,
    replayTrackAvailable:true,replayTrack:track.map((p,i)=>({t:p.t,km:p.km,breakBefore:p.breakBefore,activeMs:5000*i})),
    flags:[]};
   const simple=await storage.saveGpsV2Run(session,{saveDetails:false,date:'2026-10-27'});
   const detailed=await storage.saveGpsV2Run(session,{saveDetails:true,date:'2026-10-27'});
   const simpleDetail=simple.ok?await storage.readGpsV2Detail(simple.summary.id):{ok:false};
   const fullDetail=detailed.ok?await storage.readGpsV2Detail(detailed.summary.id):{ok:false};
   const backup=await storage.exportGpsV2Backup();
   return {simple:simple.ok,detailed:detailed.ok,noDetail:!simpleDetail.ok,
    withDetail:fullDetail.ok,backup:backup.ok,
    backupValidated:backup.ok&&storage.inspectGpsV2Backup(backup.text).ok};
  });
  assert.deepEqual(persisted,{simple:true,detailed:true,noDetail:true,
   withDetail:true,backup:true,backupValidated:true},'IndexedDB v2 save and export: '+JSON.stringify(persisted));
  await page.reload({waitUntil:'networkidle'});
  await page.goto('http://127.0.0.1:4189/#/result?gps=gps-v2-00000000-0000-4000-8000-000000000001',{waitUntil:'networkidle'});
  const sharedResult=page.locator('#runload-result-v4');
  await sharedResult.locator('.rv4-mobile-tabs').waitFor({state:'attached'});
  assert.equal(await sharedResult.locator('[data-tab="body"]').count(),1);
  assert.equal(await sharedResult.locator('[data-tab="fatigue"]').count(),1);
  assert.equal(await sharedResult.locator('[data-tab="radar"]').count(),1);
  assert.equal(await sharedResult.locator('.rv4-gps-gate').count(),1);
  assert.equal(await sharedResult.locator('[data-gps-dynamic-gate]').count(),1);
  assert.match(await sharedResult.locator('.rv4-notice').innerText(),/GPSで保存した記録/);
  assert.match(await sharedResult.locator('.rv4-hero').innerText(),/距離/);
  assert.equal(await sharedResult.locator('.rv4-region').count(),5);
  assert.ok((await sharedResult.locator('.rv4-region[data-reference-state="available"]').count())>0);
  if(mode.name==='mobile')await sharedResult.locator('[data-tab="fatigue"]').click();
  else await sharedResult.locator('[data-tab="fatigue"]').evaluate(el=>el.click());
  assert.match(await sharedResult.locator('.rv4-fatigue-numbers').innerText(),/—/,'GPS missing fatigue remains unreported');
  if(mode.name==='mobile')await sharedResult.locator('[data-tab="radar"]').click();
  else await sharedResult.locator('[data-tab="radar"]').evaluate(el=>el.click());
  assert.match(await sharedResult.locator('.rv4-history').innerText(),/比較する記録はありません/);
  if(mode.name==='mobile')await sharedResult.locator('[data-tab="body"]').click();
  else await sharedResult.locator('[data-tab="body"]').evaluate(el=>el.click());
  await page.screenshot({path:resolve(root,'screenshots','gps-audit-'+engineName+'-'+mode.name+'-01-summary.png'),fullPage:true,animations:'disabled'});
  await page.screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-'+mode.name+'-result-gateway.png'),fullPage:true,animations:'disabled'});
  await sharedResult.locator('.rv4-body').screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-'+mode.name+'-tabbed-body-gate.png'),animations:'disabled'});
  await sharedResult.locator('[data-gps-dynamic-gate]').click();
  await page.locator('.gd-main').waitFor();

  // Regression: the replay background and every foreground card must share
  // the same viewport bounds on iPhone widths (not merely align with each other).
  const assertViewportFit=async(widthLabel)=>{
   const layout=await page.evaluate(()=>{
    const sels=['.main-frame','.main-content','[data-gps-dynamic]','.gd-root','.gd-head','.gd-tag','.gd-metrics','.gd-view-bar','.gd-main','.gd-anatomy-panel','.gd-course-panel','.gd-linked-insight','.gd-speed-block'];
    const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {left:+r.left.toFixed(2),right:+r.right.toFixed(2),width:+r.width.toFixed(2),clientWidth:e.clientWidth,scrollWidth:e.scrollWidth};};
    const bounds=Object.fromEntries(sels.map(sel=>[sel,rect(sel)]));
    return {width:innerWidth,docWidth:document.documentElement.scrollWidth,bounds};
   });
   assert.ok(layout.docWidth<=layout.width+1,widthLabel+' whole-page horizontal overflow '+JSON.stringify(layout));
   for(const [sel,r] of Object.entries(layout.bounds)){
    if(!r)continue;
    assert.ok(r.left>=-1&&r.right<=layout.width+1,
     widthLabel+' '+sel+' does not fit viewport '+JSON.stringify(layout));
   }
   return layout;
  };
  layoutReports.push({viewportFit:await assertViewportFit(mode.name)});
  await page.screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-'+mode.name+'-viewport-fit.png'),fullPage:false,animations:'disabled'});
  if(mode.name==='mobile'){
   for(const width of [320,430]){
    await page.setViewportSize({width,height:844});
    layoutReports.push({viewportFit:await assertViewportFit('mobile-'+width)});
    await page.screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-mobile-'+width+'-viewport-fit.png'),fullPage:false,animations:'disabled'});
   }
   await page.setViewportSize({width:mode.width,height:mode.height});
  }

  assert.equal(await page.locator('.gd-panel').count(),2);
  assert.equal(await page.locator('.gd-body-path').count(),5);
  assert.equal(await page.locator('.gd-body .body-reference-relief').count(),5,
   'GPS anatomy has equal dimensional overlays for each scientific segment');
  assert.equal(await page.locator('.gd-body .body-reference-relief[aria-hidden="true"][pointer-events="none"]').count(),5,
   'anatomical relief cannot intercept taps');

  assert.equal(await page.locator('.gd-scrub').inputValue(),'1',
   'GPS dynamic result opens at first scientifically calculable fix');
  assert.equal(await page.locator('[data-body-reference-label]').count(),0,
   'dynamic anatomy has no overlaid badges in default color mode');
  assert.equal(await page.locator('.gd-palette-track').count(),1);
  layoutReports.push(await measurePanels(page,mode.name,'front-initial'));
  await page.screenshot({path:resolve(root,'screenshots','gps-audit-'+engineName+'-'+mode.name+'-02-front-full.png'),fullPage:true,animations:'disabled'});
  await page.locator('.gd-main').screenshot({path:resolve(root,'screenshots','gps-audit-'+engineName+'-'+mode.name+'-02-front-cards.png'),animations:'disabled'});
  await page.locator('[data-view="back"]').click();
  layoutReports.push(await measurePanels(page,mode.name,'back-same-speed'));
  await page.screenshot({path:resolve(root,'screenshots','gps-audit-'+engineName+'-'+mode.name+'-03-back-full.png'),fullPage:true,animations:'disabled'});
  await page.locator('.gd-main').screenshot({path:resolve(root,'screenshots','gps-audit-'+engineName+'-'+mode.name+'-03-back-cards.png'),animations:'disabled'});
  await page.locator('[data-view="front"]').click();
  await page.screenshot({path:resolve(root,'screenshots',engineName+'-'+mode.name+'-dynamic-palette-clean.png'),fullPage:false});
  await page.locator('[data-body-label-toggle]').click();
  const hipAtOpen=page.locator('[data-body-reference-label="BA-DISP-014"]');
  assert.equal(await hipAtOpen.count(),1,'first calculable frame shows numeric hip badge on the body');
  assert.match(await hipAtOpen.getAttribute('data-body-reference-value'),/^\d+\.\d$/);
  layoutReports.push(await measurePanels(page,mode.name,'front-labels-on'));
  await page.screenshot({path:resolve(root,'screenshots','gps-audit-'+engineName+'-'+mode.name+'-04-numbers-full.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-body-label-toggle]').click();
  assert.equal(await hipAtOpen.count(),0,'user can return to unobstructed body color view');
  assert.equal(await page.locator('.gd-map-flag').count(),1);
  const initial=await page.locator('.gd-metric').nth(2).innerText();
  await page.locator('.gd-scrub').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const scientificBody=await page.locator('.gd-body-path').evaluateAll(paths=>({
   available:paths.filter(p=>p.dataset.state==='available').length,
   filled:paths.filter(p=>p.dataset.state==='available'&&p.style.fill!=='rgb(82, 99, 107)').length
  }));
  assert.ok(scientificBody.available>0,'valid source speed must color at least one body region');
  assert.equal(scientificBody.available,scientificBody.filled,
    'authorized reference must not display as unavailable gray');
  await page.locator('.gd-scrub').evaluate(el=>{el.value='2';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const changed=await page.locator('.gd-metric').nth(2).innerText();
  assert.notEqual(initial,changed,'GPS speed should change with scrubbed frame');
  await page.locator('[data-view="back"]').click();
  assert.equal(await page.locator('.gd-body clipPath#gd-silhouette-clip path').count(),1);
  assert.equal(await page.locator('.gd-body g[clip-path="url(#gd-silhouette-clip)"] .gd-body-path').count(),4);
  await page.screenshot({path:resolve(root,'screenshots',engineName+'-'+mode.name+'-gps-back-silhouette-corrected.png'),fullPage:false});
  assert.equal(await page.locator('.gd-body-path').count(),4);
  const backLabels=await page.locator('[data-body-reference-label]').count();
  assert.ok(backLabels>=0&&backLabels<=4);
  await page.locator('[data-view="sole"]').click();
  assert.equal(await page.locator('.gd-body-path').count(),3);
  await page.locator('[data-jump-flag="0"]').click();
  assert.equal(await page.locator('.gd-scrub').inputValue(),'1');
  assert.match(await page.locator('.gd-flag-insight').innerText(),/折り返し/);
  assert.ok(await page.locator('.gd-map-flag.is-active').count()>0);
  await page.screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-'+mode.name+'-flag-sole.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-view="front"]').click();
  await page.screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-'+mode.name+'-flag-front.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-view="back"]').click();
  await page.screenshot({path:resolve(root,'screenshots','gps-proposal-'+engineName+'-'+mode.name+'-flag-back.png'),fullPage:true,animations:'disabled'});
  assert.equal(await page.locator('.gd-flag-insight .gd-flag-title').count(),1);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert.ok(overflow<=3,mode.name+' GPS dynamic UI overflows '+overflow);
  assert.deepEqual(errors,[],mode.name+' console errors '+errors.join(';'));
  await page.screenshot({path:resolve(root,'screenshots',(engineName==='webkit'?'webkit-gps-dynamic-':'gps-dynamic-')+mode.name+'-integration.png'),fullPage:false});
  console.log('PASS',engineName,mode.name,'v2 IndexedDB -> static gateway -> synced dynamic body/route/speed/flags');
  await page.close();
 }
 await writeFile(resolve(root,'screenshots','gps-audit-'+engineName+'-geometry.json'),JSON.stringify(layoutReports,null,2)+'\n');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
