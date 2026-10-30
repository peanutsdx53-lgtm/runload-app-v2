import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {chromium,webkit} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const target=resolve(root,'.'+path);
  if(target!==root&&!target.startsWith(root+sep))throw Error('not allowed');
  const actual=target===root?resolve(root,'index.html'):target;
  res.setHeader('Content-Type',mime[extname(actual)]||'application/octet-stream');res.end(await readFile(actual));
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4181,'127.0.0.1',done));
const useWebKit=process.env.RUNLOAD_BROWSER==='webkit';
const browser=await (useWebKit?webkit:chromium).launch({headless:true,...(!useWebKit&&process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  const errs=[];page.on('pageerror',e=>errs.push(String(e)));
  await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
  await page.goto('http://127.0.0.1:4181/#/consultation',{waitUntil:'networkidle'});
  assert.equal(await page.locator('#runload-consultation').count(),1,`${name}: route`);
  // WCAG 2.2 keyboard focus visibility (2.4.7) and browser text legibility.
  const chooser=page.locator('#cp-target');
  await chooser.focus();
  const ring=await chooser.evaluate(el=>({width:parseFloat(getComputedStyle(el).outlineWidth),style:getComputedStyle(el).outlineStyle}));
  assert.ok(ring.width>=3&&ring.style!=='none',name+' selection keyboard focus ring '+JSON.stringify(ring));
  if(width<=800){
   const editFontSizes=await page.locator('.cp-select,.cp-field').evaluateAll(els=>els.map(x=>parseFloat(getComputedStyle(x).fontSize)));
   assert.ok(editFontSizes.every(v=>v>=16),name+' all editable fields use >=16px for handheld readability');
  }
  assert.match(await page.locator('.cp-sensitive').innerText(),/このレポートに追加する項目がありません/);
  assert.match(await page.locator('.cp-privacy').innerText(),/このレポートにはGPS詳細軌跡・個人プロフィール/);
  assert.equal(await page.locator('[data-share="profile"]').count(),0,'do not promise nonexistent profile opt-in');
  assert.equal(await page.locator('.cp-body-view').count(),3,`${name}: three official diagrams`);
  assert.match(await page.locator('#cp-target option').first().innerText(),/保存された運動記録がありません/);
  const saved=await page.evaluate(async()=>{
   const m=await import('./ui/manualRunStore.js');
   return (await (await import('./ui/manualRunCanonical.js')).mutate(s=>m.saveManualRun(s,{date:'2026-10-27',distance:'5',hours:'',minutes:'30',seconds:'',rofBefore:0,rofAfter:6,rofEntryEvidence:{before:{capturedAt:'2026-10-27T10:00:00.000Z',assessedAt:'2026-10-27T10:00:00.000Z',timeBasis:'AT_ENTRY'},after:{capturedAt:'2026-10-27T11:00:00.000Z',assessedAt:'2026-10-27T10:45:00.000Z',timeBasis:'RECALLED'}},steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',courseName:'川沿い',shoeName:'シューズ',memo:'記録'})));
  });
  assert.equal(saved.ok,true,`${name}: fixture save ${saved.reason||''}`);
  assert.equal(saved.record.rofBefore,0,`${name}: real zero remains a valid ROF-J response`);
  assert.equal(saved.record.rofEvidence.after.timeBasis,'RECALLED',`${name}: V2 self-reported assessment provenance persisted`);
  await page.reload({waitUntil:'networkidle'});
  assert.match(await page.locator('[data-metric2-val]').first().innerText(),/5\.00 km/);
  assert.match(await page.locator('[data-source-note="rof"]').innerText(),/選択した1記録.*記録ID：run-v1-/);
  const rofText=await page.locator('[data-source-note="rof"]').innerText();
  assert.match(rofText,/入力操作時刻・本人申告の評価日時が保存されていても/);
  assert.match(rofText,/同一走行内の時間的な前後差は判定しません/);
  assert.doesNotMatch(rofText,/個別の評価時刻がないため/);
  assert.equal(await page.locator('.cp-bubble').first().innerText(),'0');
  assert.match(await page.locator('.cp-explain-card').filter({hasText:'運動前・運動後の回答（ROF-J）'}).innerText(),/時間的な変化量は判定しません/);
  assert.match(await page.locator('[data-output-section="body"] .cp-info-note').innerText(),/選択した1記録.*記録ID：run-v1-/);
  await page.locator('#cp-purpose').fill('指導者に伝えたいこと');
  await page.locator('#cp-observation').fill('個人的な気づきの非公開試験');
  await page.locator('#cp-question').fill('指導者に質問する内容の非公開試験');
  assert.equal(await page.locator('[data-report-purpose]').innerText(),'指導者に伝えたいこと');
  await page.locator('input[data-share="notes"]').uncheck();
  assert.equal(await page.locator('[data-report-purpose]').isVisible(),false,'sharing opt-out must hide purpose');
  assert.equal(await page.locator('[data-report-observation]').isVisible(),false,'sharing opt-out hides observation');
  assert.equal(await page.locator('[data-report-question]').isVisible(),false,'sharing opt-out hides question');
  if(!useWebKit){
   await page.emulateMedia({media:'print'});
   const excluded=await page.locator('[data-output-section="notes"]').evaluateAll(els=>els.every(el=>getComputedStyle(el).display==='none'));
   assert.equal(excluded,true,'print/PDF layout must not include excluded personal narration');
   await page.emulateMedia({media:'screen'});
  }
  await page.locator('input[data-share="notes"]').check();
  // The mobile edit tab hides the entire preview even when sharing is enabled.
  // Check the actual user-visible preview tab, then return to editing.
  if(name==='mobile')await page.locator('[data-switch="preview"]').click();
  assert.equal(await page.locator('[data-report-purpose]').isVisible(),true,'re-enabled purpose is visible in active preview');
  assert.equal(await page.locator('[data-report-observation]').isVisible(),true,'re-enabled observation is visible in active preview');
  assert.equal(await page.locator('[data-report-question]').isVisible(),true,'re-enabled question is visible in active preview');
  if(name==='mobile')await page.locator('[data-switch="edit"]').click();
  await page.locator('[data-mode-button="period"]').click();
  assert.match(await page.locator('[data-source-note="rof"]').innerText(),/期間内の1記録（期間全体の平均・合計ではありません）/);
  assert.match(await page.locator('[data-source-note="rof"]').innerText(),/時間的な前後差は判定しません/);
  assert.match(await page.locator('[data-source-note="course"]').innerText(),/期間内の1記録.*記録ID：run-v1-/);
  assert.match(await page.locator('[data-output-section="body"] .cp-info-note').innerText(),/期間内の1記録.*記録ID：run-v1-/);
  assert.match(await page.locator('.cp-trend-holder').last().locator('svg').getAttribute('aria-label'),/距離km/);
  assert.equal(await page.locator('.cp-body-view').count(),3);
  if(name==='mobile')await page.locator('[data-switch="preview"]').click();
  if(!useWebKit){const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});assert.ok(pdf.length>10000,`${name}: PDF file size`);}

  // One focused print-integrity probe only; existing layout/record tests are reused.
  if(!useWebKit&&name==='desktop'){
   const out=resolve(root,'screenshots');await mkdir(out,{recursive:true});
   const longValue=key=>(key+'：'+'日本語の相談文・共有範囲の確認。'.repeat(100)).slice(0,1180)+'【'+key+'完了】';
   for(const mode of ['single','period']){
    await page.locator('[data-mode-button="'+mode+'"]').click();
    for(const key of ['purpose','observation','question'])await page.locator('#cp-'+key).fill(longValue(key));
    const longText=await page.locator('[data-report-question]').innerText();
    assert.ok(longText.length>1000,'stress test must contain a long report narrative');
    assert.match(longText,/【question完了】/,'long message reaches the report before printing');
    await page.locator('input[data-share="body"]').uncheck();
    const preview=await page.evaluate(()=>[...document.querySelectorAll('.cp-paper-scale')].filter(el=>getComputedStyle(el).display!=='none').map(el=>({
     contentOverflow:el.querySelector('.cp-paper').scrollHeight-el.querySelector('.cp-paper').clientHeight,
     wrapperHeight:el.getBoundingClientRect().height,
     textHeight:el.querySelector('.cp-paper').getBoundingClientRect().height,
     scale:Number.parseFloat(getComputedStyle(document.querySelector('#runload-consultation')).getPropertyValue('--paper-scale'))||0
    })));
    assert.ok(preview.every(x=>x.contentOverflow<=3),'screen preview does not clip long user text: '+JSON.stringify(preview));
    await page.screenshot({path:resolve(out,'consultation-print-'+mode+'-long-screen-preview.png'),fullPage:true});
    await page.emulateMedia({media:'print'});
    const visibility=await page.evaluate(()=>({
     hiddenSections:[...document.querySelectorAll('[data-output-section="body"]')].every(e=>getComputedStyle(e).display==='none'),
     visibleSheets:[...document.querySelectorAll('.cp-paper-scale')].filter(e=>getComputedStyle(e).display!=='none').length,
     paperHeights:[...document.querySelectorAll('.cp-paper-scale')].filter(e=>getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect().height),
     pageHeight:297/25.4*96
    }));
    assert.equal(visibility.hiddenSections,true,'body reference opt-out removes print output');
    assert.equal(await page.locator('.cp-footer .number').first().evaluate(el=>getComputedStyle(el).display),'none','printed footer does not lie about physical PDF page count');
    assert.ok(visibility.visibleSheets>=2&&visibility.visibleSheets<=4,'selected report sheets only');
    const file=resolve(out,'consultation-print-'+mode+'-long-optout.pdf');
    const longPdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
    assert.ok(longPdf.length>11000,'long report PDF emitted');
    await writeFile(file,longPdf);
    // Read the PHYSICAL PDF rather than inferring page integrity from the DOM.
    // poppler-utils is a standard runner dependency; fail explicitly if absent.
    const pdfInfo=spawnSync('pdfinfo',['-'],{input:longPdf,encoding:'utf8'});
    assert.equal(pdfInfo.status,0,'pdfinfo must parse the emitted A4 PDF: '+String(pdfInfo.error?.message||pdfInfo.stderr||''));
    const pages=Number(/^Pages:\s*(\d+)/m.exec(pdfInfo.stdout)?.[1]);
    assert.ok(Number.isInteger(pages)&&pages>=visibility.visibleSheets&&pages<=15,
      'actual PDF page count must cover the chosen sheets and stay bounded: '+pages);
    const pageSize=/^Page size:\s*([0-9.]+)\s*x\s*([0-9.]+)\s*pts\s*\(A4\)/m.exec(pdfInfo.stdout);
    assert.ok(pageSize,'PDF output must be a physical A4 page');
    // Skia's mm-to-pt conversion can round 210mm to 594.96pt rather than 595.28pt.
    const [physicalWidthPt,physicalHeightPt]=pageSize.slice(1,3).map(Number);
    assert.ok(Math.abs(physicalWidthPt-595.276)<0.6&&Math.abs(physicalHeightPt-841.890)<0.6,
      'actual page box must match 210x297mm within printer rounding tolerance');
    const pdfText=spawnSync('pdftotext',['-layout','-','-'],{input:longPdf,encoding:'utf8'});
    assert.equal(pdfText.status,0,'pdftotext must extract the printed report: '+String(pdfText.error?.message||pdfText.stderr||''));
    for(const marker of ['purpose','observation','question']){
      assert.ok(pdfText.stdout.includes(marker+'完了'),
        'print pages must retain the trailing sentinel of the '+marker+' user note');
    }
    assert.match(pdfText.stdout,/期間内の|選択した1記録|活動記録/,'actual report content survives PDF generation');
    console.log('PDF CONTENT QA',mode,'physical A4 pages',pages,'all three long-note suffixes retained');
    await page.emulateMedia({media:'screen'});
    await page.locator('input[data-share="body"]').check();
    console.log('PRINT QA',mode,JSON.stringify(visibility),'pdf bytes',longPdf.length);
   }
  }
  assert.equal(errs.length,0,`${name}: browser exceptions: ${errs.join('; ')}`);
  console.log('PASS',useWebKit?'webkit':'chromium',name,'consultation / report / print');
  await page.close();
 }
}finally{await browser.close();server.close();}
