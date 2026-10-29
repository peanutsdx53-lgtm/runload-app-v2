/** Stage 10: two actual browser-local saves, interpretation, opt-in note, revisit and comparison.
 * This is a local Chromium acceptance path, NOT a human efficacy study.
 */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const path=resolve(root,'.'+name.replace(/^\//,'/'));
  if(!(path===root||path.startsWith(root+sep)))throw Error('outside');
  const real=path===root?resolve(root,'index.html'):path;
  const bytes=await readFile(real);
  res.setHeader('Content-Type',mime[extname(real)]||'application/octet-stream');res.end(bytes);
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(done=>server.listen(4175,'127.0.0.1',done));
const browser=await chromium.launch({headless:true,...(process.env.RUNLOAD_CHROME?{executablePath:process.env.RUNLOAD_CHROME}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 await page.addInitScript(()=>localStorage.setItem('runload-v2-introduction-preview-v1',JSON.stringify({completed:true,language:'ja'})));
 const host='http://127.0.0.1:4175/';
 const readRuns=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-manual-runs-v1')||'null'));
 async function saveRun(date,distance,minutes,memo){
  await page.goto(host+'#/record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="date"]').fill(date);
  await page.locator('[data-draft="distance"]').fill(String(distance));
  await page.locator('[data-draft="minutes"]').fill(String(minutes));
  await page.locator('[data-manual-gait="RUNNING"]').click();
  await page.locator('a[href="#/record-reflection"]').first().click();
  await page.locator('[data-draft="memo"]').fill(memo);
  await page.locator('[data-apply]').click();
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  await page.locator('[data-manual-run-save]').click();
  await page.waitForFunction(()=>location.hash.startsWith('#/result?record='));
  const state=await readRuns();
  assert.ok(state&&state.version===1);
  const last=state.records.at(-1);
  assert.equal(last.date,date);
  assert.equal(last.distanceKm,distance);
  assert.equal(last.memo,memo);
  assert.ok(last.id.startsWith('run-v1-'));
  return last.id;
 }
 const firstId=await saveRun('2026-10-19',4,28,'次回は同じコースでペースと疲れを確認する');
 assert.equal((await readRuns()).records.length,1);
 await page.goto(host+'#/result?record='+encodeURIComponent(firstId),{waitUntil:'networkidle'});
 await page.locator('.rv4-distance strong').waitFor();
 assert.match(await page.locator('.rv4-distance strong').innerText(),/4\.00|4 km/);
 const note='次回は距離と平均ペースの違いを確認する。結果から原因を断定しない。';
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(firstId)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 await page.locator('[data-ex-action="note"]').first().click();
 await page.locator('#ex-note').fill(note);
 await page.locator('[data-ex-action="save-note"]').click();
 await page.waitForFunction(()=>{
  const notes=JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]');
  return notes.length===1&&notes[0].recordId;
 });
 await page.reload({waitUntil:'networkidle'});
 await page.locator('[data-ex-action="memories"]').click();
 assert.match(await page.locator('[data-ex-overlay]').innerText(),/次回は距離と平均ペース/);
 await page.locator('[data-ex-action="close"]').click();
 const secondId=await saveRun('2026-10-21',5,32,'前回の問い：距離とペースを再確認した');
 assert.notEqual(firstId,secondId);
 const runs=await readRuns();
 assert.equal(runs.records.length,2,'two actual saved browser-local records');
 assert.equal(new Set(runs.records.map(r=>r.id)).size,2);
 assert.equal(runs.revision,2);
 assert.deepEqual(runs.records.map(r=>r.memo),['次回は同じコースでペースと疲れを確認する','前回の問い：距離とペースを再確認した']);
 await page.goto(host+'#/result?record='+encodeURIComponent(secondId)+'&compare='+encodeURIComponent(firstId)+'&view=compare',{waitUntil:'networkidle'});
 const table=page.locator('.rv4-comparison-table');
 await table.waitFor();
 assert.match(await table.innerText(),/2026-10-19/);
 assert.match(await table.innerText(),/2026-10-21/);
 assert.match(await table.innerText(),/距離/);
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await readRuns()).records.length,2,'both records survive reload');
 assert.ok(await table.isVisible(),'comparison survives interruption/reload');
 await page.goto(host+'#/result?record='+encodeURIComponent(secondId)+'&compare=not-a-record&view=compare',{waitUntil:'networkidle'});
 assert.equal(await page.locator('.rv4-comparison-table').count(),0,'invalid compare ID never substitutes an arbitrary record');
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(secondId)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 await page.locator('[data-ex-action="memories"]').click();
 assert.match(await page.locator('[data-ex-overlay]').innerText(),/次回は距離と平均ペース/,'prior question can be revisited after second run');
 const noteData=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')));
 assert.equal(noteData.length,1);
 assert.equal(noteData[0].text,note);
 // The note is linked to the specific saved run selected at the time of writing.
 assert.equal(noteData[0].recordId,firstId,'explicit selected run ID must persist');
 assert.notEqual(noteData[0].recordId,secondId,'a later run must not inherit a prior note');
 assert.ok(await page.locator('.ex-saved a[href="#/result?record='+firstId+'"]').count(),
  'the note can return to its original, still-saved run');
 await page.locator('[data-ex-action="close"]').click();
 assert.equal(await page.locator('.ex-note-preview').count(),0,
  'a different selected run must not display the prior run as its own topic note');
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(firstId)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 await page.locator('.ex-note-preview').waitFor();
 assert.match(await page.locator('.ex-note-preview').innerText(),/次回は距離と平均ペース/,
  'the original run can still revisit its own note');
 console.log('PASS stage 10: 2 actual saves, selected IDs, note persistence, comparison, reload and invalid-ID rejection');
}finally{await browser.close();await new Promise(done=>server.close(done));}
