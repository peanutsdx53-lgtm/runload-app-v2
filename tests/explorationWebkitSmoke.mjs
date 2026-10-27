import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{
 try{
  const relative=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).replace(/^\/+/,'');
  const path=resolve(root,relative||'index.html');
  if(!(path===root||path.startsWith(root+sep)))throw Error('outside root');
  res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');
  res.end(await readFile(path));
 }catch{res.statusCode=404;res.end('Not found')}
});
await new Promise(resolve=>server.listen(4181,'127.0.0.1',resolve));
const base='http://127.0.0.1:4181/';
async function checkArticle(page,caseName,width){
 const q=await page.locator('[data-ex-learning="distance-time-pace"]').evaluate(article=>{
  const outer=article.closest('.ex-focus').getBoundingClientRect();
  const box=article.getBoundingClientRect();
  const issues=[];
  const elements=[article,...article.querySelectorAll('h3,.ex-learning-lead,.ex-tool,.ex-tool-result,.ex-tool-result > *, .ex-learning-link,.ex-note-invite,.ex-note-invite > *')];
  for(const e of elements){const r=e.getBoundingClientRect();if(r.left<box.left-2||r.right>box.right+2||e.scrollWidth>e.clientWidth+2)issues.push({element:e.className||e.tagName,left:r.left,right:r.right,scroll:e.scrollWidth,client:e.clientWidth});}
  for(const el of article.querySelectorAll('h3,.ex-learning-lead,.ex-tool-result > *, .ex-learning-link, .ex-note-invite p,.ex-note-invite strong')){
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let node;
   while(node=walker.nextNode()){
    if(!node.textContent.trim())continue;
    const range=document.createRange();range.selectNodeContents(node);
    for(const r of range.getClientRects())if(r.width>0&&(r.left<box.left-2||r.right>box.right+2))issues.push({text:node.textContent.slice(0,30),left:r.left,right:r.right,limit:box.right});
   }
  }
  const steps=[...article.children].filter(e=>getComputedStyle(e).display!=='none');
  const overlaps=[];
  for(let i=1;i<steps.length;i++)if(steps[i].getBoundingClientRect().top+1<steps[i-1].getBoundingClientRect().bottom)overlaps.push([steps[i-1].className,steps[i].className]);
  return {viewport:innerWidth,docWidth:document.documentElement.scrollWidth,articleRight:box.right,focusRight:outer.right,issues,overlaps};
 });
 assert.ok(q.docWidth<=q.viewport+3,'webkit '+width+' '+caseName+' viewport: '+JSON.stringify(q));
 assert.ok(q.articleRight<=q.focusRight-8,'webkit '+width+' '+caseName+' parent width: '+JSON.stringify(q));
 assert.deepEqual(q.issues,[],'webkit '+width+' '+caseName+' clipped text: '+JSON.stringify(q));
 assert.deepEqual(q.overlaps,[],'webkit '+width+' '+caseName+' overlapped cards: '+JSON.stringify(q));
 console.log('WEBKIT PASS',width,caseName,'text fragments and card edges');
}
let browser;
try{
 await mkdir(resolve(root,'screenshots'),{recursive:true});
 browser=await webkit.launch({headless:true});
 for(const width of [320,375,390,430,768]){
  const page=await browser.newPage({viewport:{width,height:width===768?960:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja',formalTermsAccepted:false})));
  await page.goto(base+'#/exploration-tree',{waitUntil:'networkidle'});
  await page.locator('[data-ex-category="01"]').click();
  assert.match(await page.locator('.ex-tool-result').innerText(),/保存済みの走行はまだありません/);
  await checkArticle(page,'empty',width);
  await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility='hidden'});
  await page.locator('[data-ex-learning="distance-time-pace"]').screenshot({path:resolve(root,'screenshots',`webkit-${width}-pace-empty-v28.png`)});
  await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility=''});
  await page.goto(base+'#/record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="distance"]').fill('5.00');
  await page.locator('[data-draft="minutes"]').fill('35');
  await page.locator('[data-demo-save]').click();
  assert.equal(await page.locator('[data-manual-run-save]').isDisabled(),true,
   'webkit '+width+' missing activity must block saving');
  assert.match(await page.locator('.rr-alert').innerText(),/活動種目を選択してください/);
  await page.locator('[data-review-gait="RUNNING"]').click();
  assert.ok(await page.locator('[data-manual-run-save]').isEnabled(),
   'webkit '+width+' explicit activity choice unlocks save');
  await page.locator('[data-manual-run-save]').click();
  assert.match(page.url(),/#\/result\?record=run-v1-/);
   const referenceBody=page.locator('#runload-result-v4 .rv4-body');
   await referenceBody.waitFor();
   assert.equal(await referenceBody.locator('[data-body-reference-label]').count(),0,'WebKit clean body');
   assert.notEqual((await referenceBody.locator('.rv4-big-score').innerText()).trim(),'—');
   await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility='hidden'});
   await referenceBody.screenshot({path:resolve(root,'screenshots',`webkit-${width}-manual-palette-clean.png`)});
   await referenceBody.locator('[data-view="back"]').click();
   assert.equal(await referenceBody.locator('.rv4-body-svg g[clip-path="url(#rv4-silhouette-clip)"] .rv4-region').count(),4,
     'WebKit balanced posterior geometry uses the authoritative silhouette');
   await referenceBody.screenshot({path:resolve(root,'screenshots',`webkit-${width}-posterior-balanced.png`),animations:'disabled'});
   await referenceBody.locator('[data-view="front"]').click();
   await referenceBody.locator('[data-label-toggle]').click();
   assert.ok(await referenceBody.locator('[data-body-reference-label]').count()>0);
   await referenceBody.screenshot({path:resolve(root,'screenshots',`webkit-${width}-manual-palette-numbers.png`)});
   await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility=''});
  await page.goto(base+'#/exploration-tree',{waitUntil:'networkidle'});
  await page.locator('[data-ex-category="01"]').click();
  const value=await page.locator('.ex-tool-result').innerText();
  assert.match(value,/5.00 km/);
  assert.match(value,/35分00秒/);
  assert.match(value,/7:00 分\/km/);
  assert.match(value,/8.6 km\/h/);
  await checkArticle(page,'saved',width);
  await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility='hidden'});
  await page.locator('[data-ex-learning="distance-time-pace"]').screenshot({path:resolve(root,'screenshots',`webkit-${width}-pace-saved-v28.png`)});
  await page.locator('.mobile-nav').evaluate(el=>{el.style.visibility=''});
  // Check that the real fixed navigation leaves the last action reachable on scroll.
  await page.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
  const footer=await page.evaluate(()=>{
   const button=document.querySelector('.ex-note-invite button').getBoundingClientRect();
   const nav=document.querySelector('.mobile-nav').getBoundingClientRect();
   return {buttonTop:button.top,buttonBottom:button.bottom,navTop:nav.top,viewportHeight:innerHeight};
  });
  assert.ok(footer.buttonTop>=0&&footer.buttonBottom<=footer.navTop-4,
   'webkit '+width+' fixed navigation covers the reflection action: '+JSON.stringify(footer));
  await page.screenshot({path:resolve(root,'screenshots',`webkit-${width}-pace-footer-viewport-v28.png`),fullPage:false});
  if(width===390||width===320){
   await page.locator('.mobile-nav').evaluate(el=>{el.style.position='static';el.style.bottom='auto'});
   await page.screenshot({path:resolve(root,'screenshots',`webkit-${width}-exploration-full-v28.png`),fullPage:true});
   await page.locator('.mobile-nav').evaluate(el=>{el.style.position='';el.style.bottom=''});
  }
  assert.deepEqual(errors,[],'webkit runtime errors '+width);
  await page.close();
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
console.log('WEBKIT EXPLORATION LAYOUT PASS');
