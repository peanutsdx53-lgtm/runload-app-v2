import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),path=resolve(root,'.'+name);
  if(path!==root&&!path.startsWith(root+sep))throw Error('invalid path');
  const f=path===root?resolve(root,'index.html'):path;res.setHeader('Content-Type',mime[extname(f)]||'application/octet-stream');res.end(await readFile(f));
 }catch{res.statusCode=404;res.end('not found');}
});
await new Promise(ok=>server.listen(4331,'127.0.0.1',ok));
const name=process.env.RUNLOAD_BROWSER_ENGINE==='webkit'?'webkit':'chromium';
const browser=await (name==='webkit'?webkit:chromium).launch({headless:true});
const out=resolve(root,'audit-output','s02-condition-achievements');await mkdir(out,{recursive:true});
const findings=[];
const path='http://127.0.0.1:4331/#/home';
async function inspect(page,width,state){
 const measure=await page.evaluate(()=>{
  const ids=['condition','topics'],r=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height}};
  return {document:document.documentElement.scrollWidth,viewport:innerWidth,
   cards:ids.map(id=>{const e=document.querySelector('[data-home-dashboard-id="'+id+'"] .hx-card');return {id,rect:r(e),children:[...e.querySelectorAll('.hx-condition-stats>div,.hx-condition-empty,.hx-ach-main,.hx-awards,.hx-award-item,.hx-award-copy,.hx-ach-source,.hx-title-button')].map(node=>({cls:node.className,rect:r(node),scroll:node.scrollWidth,client:node.clientWidth}))}})}
 });
 assert.ok(measure.document<=measure.viewport+2,name+' '+width+' '+state+' horizontal document overflow '+JSON.stringify(measure));
 for(const card of measure.cards){
  for(const child of card.children){
   assert.ok(child.rect.left>=card.rect.left-2&&child.rect.right<=card.rect.right+2,name+' '+width+' '+state+' '+child.cls+' card-edge overflow '+JSON.stringify(measure));
  }
 }
 const ach=page.locator('[data-home-dashboard-id="topics"]');
 assert.equal(await ach.locator('.hx-award-item').count(),4,'all four achievements named');
 for(const title of ['初回の走行','30分以上','累計50 km','累計100 km'])assert.match(await ach.innerText(),new RegExp(title));
 const cond=page.locator('[data-home-dashboard-id="condition"]');
 assert.ok(await cond.locator('.hx-title-button').evaluate(el=>el.getBoundingClientRect().height>=43.5));
 assert.ok(await ach.locator('.hx-title-button').evaluate(el=>el.getBoundingClientRect().height>=43.5));
 findings.push({engine:name,width,state,measure});
}
try{
 for(const width of [320,390,768,1440]){
  const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},reducedMotion:'reduce',locale:'ja-JP'});
  await ctx.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(path,{waitUntil:'networkidle'});await page.locator('[data-home-dashboard-id="topics"]').waitFor();
  await inspect(page,width,'empty');
  assert.match(await page.locator('[data-home-dashboard-id="condition"]').innerText(),/直近7日の記録はまだありません/);
  assert.equal(await page.locator('.hx-award-item.won').count(),0);
  await page.screenshot({path:resolve(out,name+'-'+width+'-empty.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-condition-open]').click();
  const dialog=page.locator('.hx-condition-dialog');
  await dialog.waitFor();
  assert.equal(await dialog.count(),1,'condition-only themed dialog');
  const dateTone=await dialog.evaluate(el=>{
    const panel=el.querySelector('.rl-date-control'),svg=el.querySelector('.rl-date-icon'),date=el.querySelector('[name="date"]');
    const css=getComputedStyle(panel),icon=getComputedStyle(svg),dialogCss=getComputedStyle(el);
    return {bg:css.backgroundColor,border:css.borderTopColor,icon:icon.color,type:date?.type,display:el.querySelector('.rl-date-value')?.textContent,dialogBorder:dialogCss.borderTopColor};
  });
  assert.equal(dateTone.bg,'rgb(32, 36, 64)','Condition date uses indigo, not global teal');
  assert.equal(dateTone.border,'rgb(169, 155, 224)','Condition date uses lavender border');
  assert.equal(dateTone.icon,'rgb(210, 193, 255)','Condition date calendar uses lavender');
  assert.equal(dateTone.dialogBorder,'rgb(164, 146, 213)');
  assert.equal(dateTone.type,'date','native date picker retained');
  assert.match(dateTone.display,/\d{4}\/\d{2}\/\d{2}/);
  assert.equal(await dialog.locator('.hx-dialog-head [data-home-close]').evaluate(el=>document.activeElement===el),true,'condition dialog receives focus');
  await page.keyboard.press('Shift+Tab');
  assert.equal(await dialog.locator('.hx-save').evaluate(el=>document.activeElement===el),true,'condition dialog Shift+Tab wraps to last enabled action');
  await page.keyboard.press('Tab');
  assert.equal(await dialog.locator('.hx-dialog-head [data-home-close]').evaluate(el=>document.activeElement===el),true,'condition dialog Tab wraps to close');
  const keyboardFocus=await dialog.locator('.hx-dialog-head [data-home-close]').evaluate(el=>({focused:document.activeElement===el,color:getComputedStyle(el).outlineColor,style:getComputedStyle(el).outlineStyle}));
  assert.equal(keyboardFocus.focused,true,'Tab focus remains on Condition close button');
  assert.notEqual(keyboardFocus.style,'none','visible focus outline remains on WebKit and Chromium');
  assert.equal(keyboardFocus.color,'rgb(225, 201, 255)','focused Condition close button uses lavender, not teal');
  await page.screenshot({path:resolve(out,name+'-'+width+'-condition-dialog.png'),animations:'disabled'});
  const modalGeometry=await dialog.evaluate(el=>{
   const d=el.getBoundingClientRect(),f=el.querySelector('[data-condition-form]'),button=f.querySelector('.hx-save'),save=button.getBoundingClientRect();
   return {viewport:innerWidth,dialog:{left:d.left,right:d.right,top:d.top,bottom:d.bottom,height:d.height},scrollHeight:el.scrollHeight,clientHeight:el.clientHeight,scrollTop:el.scrollTop,save:{left:save.left,right:save.right,top:save.top,bottom:save.bottom}};
  });
  assert.ok(modalGeometry.dialog.left>=-1&&modalGeometry.dialog.right<=width+1,'dialog fits viewport '+JSON.stringify(modalGeometry));
  assert.ok(modalGeometry.scrollHeight>=modalGeometry.clientHeight,'dialog scrollable whenever longer');
  assert.ok(modalGeometry.save.left>=modalGeometry.dialog.left-1&&modalGeometry.save.right<=modalGeometry.dialog.right+1,'Save within dialog width');
  // Trigger a real voluntary, duration-only input and check the save action.
  await dialog.locator('[data-sleep-mode="duration"]').click();
  assert.equal(await dialog.locator('[name="sleepMode"]').inputValue(),'duration');
  await dialog.locator('[name="durationHours"]').fill('7');
  await dialog.locator('[name="durationMinutes"]').fill('30');
  const save=dialog.locator('.hx-save');
  await save.scrollIntoViewIfNeeded();
  await page.screenshot({path:resolve(out,name+'-'+width+'-condition-save-visible.png'),animations:'disabled'});
  const reached=await dialog.evaluate(el=>{const r=el.getBoundingClientRect(),b=el.querySelector('.hx-save').getBoundingClientRect();return {saveTop:b.top,saveBottom:b.bottom,dialogTop:r.top,dialogBottom:r.bottom,scrollTop:el.scrollTop,scrollHeight:el.scrollHeight};});
  assert.ok(reached.saveTop>=reached.dialogTop-2&&reached.saveBottom<=reached.dialogBottom+2,'save can be reached by scrolling '+JSON.stringify(reached));
  await save.click();
  assert.equal(await dialog.count(),1,'without a stated condition answer, form remains open');
  assert.match(await dialog.locator('[data-sleep-error]').innerText(),/起床時の調子/);
  await dialog.locator('[name="feeling"]').selectOption({label:'良い'});
  await save.click();
  await dialog.waitFor({state:'detached'});
  assert.equal(await page.locator('[data-condition-open]').evaluate(el=>document.activeElement===el),true,'condition Save returns keyboard focus to the invoking card');
  const savedCondition=await page.evaluate(async()=>{
   const h=await import('./ui/homeExperience.js');const current=h.readConditions(localStorage);return current.entries.find(x=>x.date===h.todayLocal());
  });
  assert.equal(savedCondition?.sleepSource,'duration','self-reported duration remains separate from clock-derived bedtime');
  assert.equal(savedCondition?.sleepMinutes,450);
  assert.equal(savedCondition?.feeling,'良い');
  await page.locator('[data-achievement-open]').click();
  const achDialog=page.locator('.hx-ach-dialog');
  await achDialog.waitFor();
  const achTone=await achDialog.evaluate(el=>({border:getComputedStyle(el).borderTopColor,background:getComputedStyle(el).backgroundImage,closeBg:getComputedStyle(el.querySelector('.hx-dialog-head button')).backgroundColor}));
  assert.equal(achTone.border,'rgb(199, 148, 91)','achievement detail border should be gold');
  assert.equal(achTone.closeBg,'rgb(91, 67, 53)','achievement detail close action should be warm brown');
  assert.match(achTone.background,/rgb\(59, 45, 39\)/,'achievement detail uses dark orange/brown background');
  assert.equal(await achDialog.locator('.hx-dialog-head [data-home-close]').evaluate(el=>document.activeElement===el),true,'achievement dialog receives keyboard focus');
  assert.equal(await achDialog.locator('.hx-ach-milestone').count(),4,'four visible and explicitly named milestones');
  const geometry=await achDialog.evaluate(el=>{
    const modal=el.getBoundingClientRect(),entries=[...el.querySelectorAll('.hx-ach-summary>div,.hx-ach-milestone,.hx-ach-milestone-label,.hx-ach-milestone-status,.hx-ach-limit')];
    return {width:innerWidth,modal:{left:modal.left,right:modal.right},scroll:document.documentElement.scrollWidth,
      entries:entries.map(e=>{const r=e.getBoundingClientRect(),p=e.parentElement.getBoundingClientRect();return {className:e.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom,parentLeft:p.left,parentRight:p.right,visible:e.getClientRects().length>0}})};
  });
  assert.ok(geometry.scroll<=geometry.width+2,'detail does not overflow viewport '+JSON.stringify(geometry));
  for(const box of geometry.entries){
    assert.ok(box.left>=geometry.modal.left-1&&box.right<=geometry.modal.right+1,'achievement content within modal '+JSON.stringify(box));
    assert.ok(box.left>=box.parentLeft-2&&box.right<=box.parentRight+2,'achievement content within parent '+JSON.stringify(box));
  }
  await page.screenshot({path:resolve(out,name+'-'+width+'-achievement-dialog.png'),animations:'disabled'});
  await page.keyboard.press('Tab');
  assert.equal(await achDialog.locator('.hx-dialog-head [data-home-close]').evaluate(el=>document.activeElement===el),true,'achievement Tab stays in single-control modal');
  await page.keyboard.press('Escape');
  await achDialog.waitFor({state:'detached'});
  assert.equal(await page.locator('[data-achievement-open]').evaluate(el=>document.activeElement===el),true,'achievement Escape restores focus');
  const data=await page.evaluate(async()=>{
    const [m,c,h]=await Promise.all([import('./ui/manualRunStore.js'),import('./ui/manualRunCanonical.js'),import('./ui/homeExperience.js')]);
    const date=h.todayLocal();localStorage.setItem(h.CONDITION_KEY,JSON.stringify([{date,sleepMinutes:420,feeling:'良い',memo:'本人が記録'}]));
    const ready=await c.refresh();if(!ready.ok)throw Error(ready.reason);
    const saved=await c.mutate(s=>m.saveManualRun(s,{date,distance:'5',hours:'',minutes:'35',seconds:'',activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',stepsProvenance:'UNKNOWN',memo:''}));
    if(!saved.ok)throw Error(saved.reason);return {id:saved.record.id,date};
  });
  await page.reload({waitUntil:'networkidle'});await page.locator('[data-home-dashboard-id="topics"]').waitFor();
  await inspect(page,width,'populated');
  assert.equal(await page.locator('.hx-award-item.won').count(),2);
  assert.equal(await page.locator('.hx-award-item.locked').count(),2);
  assert.equal(await page.locator('.hx-condition-empty').count(),0,'recorded day renders actual bar');
  assert.equal(await page.locator('.hx-bars .hx-bar:not(.hx-missing)').count(),1,'only actual recorded day');
  assert.match(await page.locator('[data-home-dashboard-id="topics"]').innerText(),/5.0/);
  await page.screenshot({path:resolve(out,name+'-'+width+'-populated.png'),fullPage:true,animations:'disabled'});
  if(width<=390){
    // Browser text-resizing stress case, not a substitute for OS-level accessibility text sizing.
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    await page.locator('[data-achievement-open]').click();
    const enlarged=page.locator('.hx-ach-dialog');
    await enlarged.waitFor();
    const bounds=await enlarged.evaluate(el=>{
      const parent=el.getBoundingClientRect();
      return {outer:{left:parent.left,right:parent.right},clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,
        parts:[...el.querySelectorAll('.hx-ach-milestone,.hx-ach-milestone-label,.hx-ach-milestone-status,.hx-ach-summary>div')].map(n=>{
          const r=n.getBoundingClientRect(),p=n.parentElement.getBoundingClientRect();return {name:n.className,left:r.left,right:r.right,parentLeft:p.left,parentRight:p.right};
        })};
    });
    assert.ok(bounds.scrollWidth<=bounds.clientWidth+2,'enlarged detail content not horizontally clipped '+JSON.stringify(bounds));
    for(const b of bounds.parts)assert.ok(b.left>=b.parentLeft-2&&b.right<=b.parentRight+2,'enlarged milestone remains in parent '+JSON.stringify(b));
    await page.screenshot({path:resolve(out,name+'-'+width+'-achievement-text-200pct.png'),animations:'disabled'});
    await page.keyboard.press('Escape');
    await enlarged.waitFor({state:'detached'});
    await page.evaluate(()=>document.documentElement.style.removeProperty('font-size'));
  }
  assert.deepEqual(errors,[],name+' '+width+' browser JS errors');
  await ctx.close();
 }
 await writeFile(resolve(out,name+'-report.json'),JSON.stringify(findings,null,2));
 console.log('PASS S02 condition and achievements '+name+' '+findings.length+' states');
}finally{await browser.close();await new Promise(ok=>server.close(ok));}
