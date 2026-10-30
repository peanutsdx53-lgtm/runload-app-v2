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
 const readRuns=()=>page.evaluate(async()=>JSON.parse((await (await import('/ui/manualRunCanonical.js')).readCanonical()).raw||'null'));
 async function saveRun(date,distance,minutes,memo,gait='RUNNING'){
  await page.goto(host+'#/record',{waitUntil:'networkidle'});
  await page.locator('[data-draft="date"]').fill(date);
  await page.locator('[data-draft="distance"]').fill(String(distance));
  await page.locator('[data-draft="minutes"]').fill(String(minutes));
  await page.locator('[data-manual-gait="'+gait+'"]').click();
  await page.locator('a[href="#/record-reflection"]').first().click();
  await page.locator('[data-draft="memo"]').fill(memo);
  await page.locator('[data-apply]').click();
  await page.locator('[data-demo-save]').click();
  await page.locator('[data-record-review]').waitFor();
  await page.locator('[data-manual-run-save]').click();
  await page.waitForFunction(()=>location.hash.startsWith('#/result?record='));
  const state=await readRuns();
  assert.ok(state&&state.version===2);
  const last=state.records.at(-1);
  assert.equal(last.date,date);
  assert.equal(last.distanceKm,distance);
  assert.equal(last.memo,memo);
  assert.equal(last.draft.activityGait,gait);
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
 const regionPanel=page.locator('.rv4-region-compare');
 await regionPanel.waitFor();
 assert.match(await regionPanel.innerText(),/選択した部位の文献参考値/);
 const labels=await page.locator('.rv4-compare-provenance').innerText();
 assert.ok(labels.includes(firstId)&&labels.includes(secondId),'two saved IDs remain independently visible');
 assert.match(labels,/比較相手/);assert.match(labels,/選択中/);
 assert.match(await regionPanel.innerText(),/現在の同一モデルでそれぞれ再計算/);
 assert.match(await regionPanel.innerText(),/ポイント|この部位は比較できません/,
  'same-region scientific result or explicit rejection must be visible');
 assert.equal(await page.locator('.rv4-mobile-tabs [data-tab]').count(),3,'preserve three result tabs');
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
 // Save an unlinked note and verify it does not become the second run's note.
 await page.goto(host+'#/exploration-tree?category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 await page.locator('[data-ex-action="note"]').first().click();
 await page.locator('#ex-note').fill('記録IDなしの任意メモ');
 await page.locator('[data-ex-action="save-note"]').click();
 await page.waitForFunction(()=>{
  const notes=JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]');
  return notes.length===2;
 });
 const notesBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')));
 assert.equal(notesBefore.length,2);
 assert.equal(notesBefore.filter(n=>n.recordId===firstId).length,1);
 assert.equal(notesBefore.filter(n=>!Object.hasOwn(n,'recordId')).length,1);
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(secondId)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 assert.equal(await page.locator('.ex-note-preview').count(),0,'unlinked and old notes must not move to another run');
 // Simulate deletion inside the existing V1 format. Do not alter schema.
 await page.evaluate(async id=>{
   const {MANUAL_DB,MANUAL_STORE,MANUAL_ENTRY}=await import('/ui/manualRunCanonical.js');
   const db=await new Promise((resolve,reject)=>{const req=indexedDB.open(MANUAL_DB);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
   await new Promise((resolve,reject)=>{
    const tx=db.transaction(MANUAL_STORE,'readwrite'),store=tx.objectStore(MANUAL_STORE),req=store.get(MANUAL_ENTRY);
    req.onsuccess=()=>{const d=JSON.parse(req.result);d.records=d.records.filter(r=>r.id!==id);d.revision++;store.put(JSON.stringify(d),MANUAL_ENTRY)};
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
   });db.close();
  },firstId);
 await page.goto(host+'#/result?record='+encodeURIComponent(firstId),{waitUntil:'networkidle'});
 assert.match(await page.locator('[role="status"]').last().innerText(),/指定された保存済み走行記録が見つかりません/);
 assert.equal(await page.locator('.rv4-distance').count(),0,'no other run substituted for deleted ID');
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(firstId)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 assert.match(await page.locator('.ex-notice').first().innerText(),/指定された走行記録が見つかりません/);
 await page.locator('[data-ex-action="memories"]').click();
 assert.match(await page.locator('[data-ex-overlay]').innerText(),/次回は距離と平均ペース/);
 assert.match(await page.locator('[data-ex-overlay]').innerText(),/元の走行記録が見つからないためリンクを表示しません/);
 assert.equal(await page.locator('.ex-saved a[href="#/result?record='+firstId+'"]').count(),0);
 assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1'))),notesBefore,'notes preserved');
 await page.locator('[data-ex-action="close"]').click();
 await page.locator('[data-ex-action="note"]').first().click();
 await page.locator('#ex-note').fill('削除済みIDには関連づけない');
 await page.locator('[data-ex-action="save-note"]').click();
 await page.waitForFunction(()=>[...document.querySelectorAll('.ex-notice')]
  .some(el=>el.textContent.includes('指定された保存済み走行が見つからない')));
 assert.match(await page.locator('.ex-notice').last().innerText(),/指定された保存済み走行が見つからない/);
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')))).length,2);
 // Two new records deliberately share a date, distance, duration and an empty note.
 // The comparison must identify each saved run by ID, never by date alone.
 const sameDayA=await saveRun('2026-10-25',4,28,'');
 const sameDayB=await saveRun('2026-10-25',4,28,'');
 assert.notEqual(sameDayA,sameDayB,'same-day records are not deduplicated');
 let state=await readRuns();
 assert.equal(state.records.filter(r=>r.date==='2026-10-25').length,2);
 assert.equal(state.records.find(r=>r.id===sameDayA).memo,'','note remains truly optional');
 assert.equal(state.records.find(r=>r.id===sameDayB).memo,'');
 await page.goto(host+'#/result?record='+encodeURIComponent(sameDayB)+'&compare='+encodeURIComponent(sameDayA)+'&view=compare',{waitUntil:'networkidle'});
 await page.locator('.rv4-compare-provenance').waitFor();
 const sources=await page.locator('.rv4-compare-provenance').innerText();
 assert.ok(sources.includes(sameDayA)&&sources.includes(sameDayB),'same-day comparison keeps both IDs visible');
 assert.match(sources,/比較相手/);assert.match(sources,/選択中/);
 const selector=page.locator('[data-compare-select]');
 assert.ok(await selector.locator('option[value="'+sameDayA+'"]').count());
 assert.match(await selector.locator('option[value="'+sameDayA+'"]').innerText(),/ランニング.*ID末尾/);
 assert.equal((await page.locator('.rv4-comparison-table').innerText()).includes('距離'),true);
 const zeroDistance=await page.locator('.rv4-comparison-table tbody tr').filter({hasText:'距離'}).first().innerText();
 assert.match(zeroDistance,/0(\\.00)?/,'same-day zero change is a descriptive value, not missing');
 await page.reload({waitUntil:'networkidle'});
 assert.ok(await page.locator('.rv4-compare-provenance').innerText().then(x=>x.includes(sameDayA)&&x.includes(sameDayB)));
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(sameDayB)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 assert.equal(await page.locator('.ex-note-preview').count(),0,'no-note run never inherits older free/linked notes');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')))).length,2,
  'comparing and revisiting do not require creating an exploration note');
 // Real UI cross-gait counterexample: WALK vs RUNNING is never presented
 // as a quantitative comparison, including the literature region.
 const walkId=await saveRun('2026-10-25',2,24,'','WALK');
 await page.goto(host+'#/result?record='+encodeURIComponent(walkId)+'&compare='+encodeURIComponent(sameDayA)+'&view=compare',{waitUntil:'networkidle'});
 assert.match(await page.locator('[data-compare-select] option[value="'+sameDayA+'"]').innerText(),/ランニング.*活動種別が異なる/);
 assert.equal(await page.locator('.rv4-comparison-table').count(),0,'cross gait factual comparisons must fail closed');
 assert.match(await page.locator('.rv4-comparison-empty').innerText(),/活動種別が不明または異なります/);
 assert.match(await page.locator('.rv4-region-compare').innerText(),/活動種別が異なる記録の参考値は比較できません/);
 assert.equal(await page.locator('.rv4-mobile-tabs [data-tab]').count(),3,'three approved result tabs remain');
 state=await readRuns();
 assert.equal(state.records.filter(r=>r.date==='2026-10-25').length,3);
 assert.equal(new Set(state.records.map(r=>r.id)).size,state.records.length);
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')))).length,2);
 // Stage 8: a genuine saved-result UI correction appends history without changing the ID.
 await page.goto(host+'#/result?record='+encodeURIComponent(sameDayB),{waitUntil:'networkidle'});
 await page.locator('[data-tab="fatigue"]').click();
 await page.locator('.rv4-rof-audit summary').first().click();
 await page.locator('[data-rof-correct-phase]').selectOption('before');
 await page.locator('[data-rof-correct-score]').fill('0');
 await page.locator('[data-rof-correct-basis]').selectOption('AT_ENTRY');
 await page.locator('[data-rof-correct-reason]').fill('本人の回答');
 await page.locator('[data-rof-correct-save]').click();
 await page.waitForFunction(id=>{
  const d=JSON.parse((await (await import('/ui/manualRunCanonical.js')).readCanonical()).raw||'null');
  const r=d?.records.find(x=>x.id===id);
  return r?.rofCorrections?.length===1&&r.rofBefore===0;
 },sameDayB);
 let revised=(await readRuns()).records.find(x=>x.id===sameDayB);
 assert.equal(revised.rofEvidence.before.score,null);
 assert.equal(revised.rofCorrections[0].old.score,null);
 assert.equal(revised.rofCorrections[0].next.score,0);
 assert.equal(revised.rofCorrections[0].next.timeBasis,'AT_ENTRY');
 assert.equal(revised.rofCorrections[0].next.assessedAt,revised.rofCorrections[0].next.capturedAt);
 await page.reload({waitUntil:'networkidle'});
 await page.locator('[data-tab="fatigue"]').click();
 await page.locator('.rv4-rof-audit summary').first().click();
 assert.match(await page.locator('.rv4-rof-audit').innerText(),/訂正履歴 1件/);
 await page.locator('[data-rof-correct-phase]').selectOption('before');
 await page.locator('[data-rof-correct-score]').fill('');
 await page.locator('[data-rof-correct-basis]').selectOption('UNKNOWN');
 await page.locator('[data-rof-correct-save]').click();
 await page.waitForFunction(id=>{
  const d=JSON.parse((await (await import('/ui/manualRunCanonical.js')).readCanonical()).raw||'null');
  return d?.records.find(x=>x.id===id)?.rofCorrections?.length===2;
 },sameDayB);
 revised=(await readRuns()).records.find(x=>x.id===sameDayB);
 assert.equal(revised.rofBefore,null);
 assert.equal(revised.rofCorrections[1].from,0);
 assert.equal(revised.rofCorrections[1].to,null);
 assert.equal(revised.draft.rofBefore,null);
 assert.equal(revised.id,sameDayB);
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')))).length,2);
 console.log('PASS stage 8: saved UI correction, 0 and null, immutable provenance and reload');
 // Stage 8: real dedicated input, recorded input time and optional declared exercise window.
 await page.goto(host+'#/record',{waitUntil:'networkidle'});
 await page.locator('[data-draft="date"]').fill('2026-10-26');
 await page.locator('[data-draft="distance"]').fill('5');
 await page.locator('[data-draft="minutes"]').fill('30');
 await page.locator('[data-manual-gait="RUNNING"]').click();
 await page.goto(host+'#/record-rof',{waitUntil:'networkidle'});
 await page.locator('[data-rof-run-start]').fill('2026-10-26T09:00');
 await page.locator('[data-rof-run-start]').dispatchEvent('change');
 await page.locator('[data-rof-run-end]').fill('2026-10-26T09:30');
 await page.locator('[data-rof-run-end]').dispatchEvent('change');
 await page.locator('[data-rof-v4-timing]').selectOption('AT_ENTRY');
 await page.locator('[data-rof-v4-range]').evaluate(el=>{
  el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('[data-rof-v4-phase="after"]').click();
 await page.locator('[data-rof-v4-timing]').selectOption('RECALLED');
 await page.locator('[data-rof-v4-declared]').fill('2026-10-26T09:35');
 await page.locator('[data-rof-v4-declared]').dispatchEvent('change');
 await page.locator('[data-rof-v4-range]').evaluate(el=>{
  el.value='4';el.dispatchEvent(new Event('input',{bubbles:true}));
 });
 await page.locator('.rv4-done').click();
 await page.locator('[data-demo-save]').click();
 await page.locator('[data-manual-run-save]').click();
 await page.waitForFunction(()=>location.hash.startsWith('#/result?record='));
 const timingRun=(await readRuns()).records.at(-1);
 assert.equal(timingRun.rofBefore,0);
 assert.equal(timingRun.rofAfter,4);
 assert.equal(timingRun.rofEvidence.before.timeBasis,'AT_ENTRY');
 assert.equal(timingRun.rofEvidence.before.assessedAt,timingRun.rofEvidence.before.capturedAt);
 assert.equal(timingRun.rofEvidence.after.timeBasis,'RECALLED');
 assert.ok(Date.parse(timingRun.rofEvidence.after.assessedAt)<Date.parse(timingRun.rofEvidence.after.capturedAt));
 assert.equal(timingRun.exerciseTiming.source,'USER_DECLARED');
 assert.equal(timingRun.exerciseTiming.endedAt!==null,true);
 assert.equal(timingRun.exerciseTiming.startedAt!==null,true);
 assert.ok(Date.parse(timingRun.exerciseTiming.endedAt)>Date.parse(timingRun.exerciseTiming.startedAt));
 assert.equal(timingRun.rofCorrections.length,0);
 await page.reload({waitUntil:'networkidle'});
 assert.equal((await readRuns()).records.at(-1).id,timingRun.id,'timestamps survive real browser reload');
 console.log('PASS stage 8: dedicated ROF-J entry, now vs recalled provenance and optional exercise times');

 // Stage 10: user explicitly chooses the first run's own question,
 // writes a new answer and attaches only that new note to the second run.
 const runBytesBefore=await page.evaluate(async()=>(await (await import('/ui/manualRunCanonical.js')).readCanonical()).raw);
 await page.goto(host+'#/exploration-tree?record='+encodeURIComponent(sameDayA)+'&category=01&topic='+encodeURIComponent('距離・時間・ペース'),{waitUntil:'networkidle'});
 await page.locator('[data-ex-action="note"]').first().click();
 const sourceQuestion='同じ日の2回目に、ペースをどう感じたか確かめる';
 await page.locator('#ex-note').fill(sourceQuestion);
 await page.locator('[data-ex-action="save-note"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').length===3);
 const prior=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1'))[0]);
 assert.equal(prior.recordId,sameDayA);
 await page.goto(host+'#/result?record='+encodeURIComponent(sameDayB)+'&compare='+encodeURIComponent(sameDayA)+'&view=compare',{waitUntil:'networkidle'});
 await page.locator('[data-run-question-source]').waitFor();
 assert.match(await page.locator('.rv4-question-continuation').innerText(),/本人が選んで保存/);
 const emptySelection=await page.locator('[data-run-question-source]').inputValue();
 assert.equal(emptySelection,'','previous question cannot be preselected');
 assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')))).length,3);
 await page.locator('[data-run-question-source]').selectOption(prior.id);
 await page.locator('[data-run-question-text]').fill('今回の走行ではペースの違いを感じた。原因は未確認。');
 await page.locator('[data-run-question-save]').click();
 await page.waitForFunction(id=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1')||'[]').some(n=>n.recordId===id&&n.continuedFromNoteId),sameDayB);
 const continued=await page.evaluate(()=>JSON.parse(localStorage.getItem('runload-v2-exploration-notes-v1'))[0]);
 assert.equal(continued.recordId,sameDayB,'continuation belongs only to selected target');
 assert.equal(continued.continuedFromNoteId,prior.id,'origin note ID explicitly preserved');
 assert.equal(continued.topicId,prior.topicId,'topic meaning remains traceable');
 assert.equal(continued.text,'今回の走行ではペースの違いを感じた。原因は未確認。');
 assert.equal(await page.evaluate(async()=>(await (await import('/ui/manualRunCanonical.js')).readCanonical()).raw),runBytesBefore,'inquiry never modifies run facts');
 await page.waitForFunction(id=>location.hash.includes('exploration-tree')&&location.hash.includes(encodeURIComponent(id)),sameDayB);
 await page.reload({waitUntil:'networkidle'});
 await page.locator('.ex-note-preview').waitFor();
 assert.match(await page.locator('.ex-note-preview').innerText(),/今回の走行ではペースの違い/);
 await page.locator('[data-ex-action="memories"]').click();
 assert.match(await page.locator('[data-ex-overlay]').innerText(),/元の問いから本人が明示的に続けたメモ/);
 assert.ok((await page.locator('[data-ex-overlay]').innerText()).includes(sourceQuestion));
 await page.locator('[data-ex-action="close"]').click();
 await page.goto(host+'#/result?record='+encodeURIComponent(sameDayB)+'&compare='+encodeURIComponent(walkId)+'&view=compare',{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-run-question-source]').count(),0,'cross-gait comparison cannot offer linked continuation');
 await page.goto(host+'#/result?record='+encodeURIComponent(sameDayB)+'&compare=invalid-id&view=compare',{waitUntil:'networkidle'});
 assert.equal(await page.locator('[data-run-question-source]').count(),0,'invalid comparison cannot offer a link');
 // Positive scientific case must use *two actually saved* in-domain runs,
 // never a synthetic fixture or a reference table without a selected saved ID.
 const eligibleA=await saveRun('2026-10-27',5.4,30,'');
 const eligibleB=await saveRun('2026-10-28',6,30,'');
 await page.goto(host+'#/result?record='+encodeURIComponent(eligibleB)+'&compare='+encodeURIComponent(eligibleA)+'&view=compare',{waitUntil:'networkidle'});
 const eligiblePanel=page.locator('.rv4-region-compare');
 await eligiblePanel.waitFor();
 const eligibleText=await eligiblePanel.innerText();
 assert.match(eligibleText,/選択した部位の文献参考値/);
 assert.match(eligibleText,/比較相手|選択中/);
 assert.match(eligibleText,/差 [+-]?[0-9]/,'two genuinely saved eligible runs must show a same-region descriptive reference difference');
 assert.doesNotMatch(eligibleText,/この部位は比較できません/);
 const actualRuns=await readRuns();
 assert.ok(actualRuns.records.some(r=>r.id===eligibleA)&&actualRuns.records.some(r=>r.id===eligibleB));
 assert.equal(actualRuns.records.find(r=>r.id===eligibleA).distanceKm,5.4);
 assert.equal(actualRuns.records.find(r=>r.id===eligibleB).distanceKm,6);
 await page.reload({waitUntil:'networkidle'});
 assert.match(await eligiblePanel.innerText(),/差 [+-]?[0-9]/,'same-method scientific comparison survives reload');
 const outside=await saveRun('2026-10-29',0.5,30,'','RUNNING');
 await page.goto(host+'#/result?record='+encodeURIComponent(outside)+'&compare='+encodeURIComponent(eligibleA)+'&view=compare',{waitUntil:'networkidle'});
 assert.match(await page.locator('.rv4-region-compare').innerText(),/この部位は比較できません/,'ineligible speed must not invent a comparative reference');
 console.log('PASS stage 10: two real in-domain saved references and speed-out-of-range rejection');

 console.log('PASS stage 10: explicit question ID, two saved run IDs, no automatic transfer and browser reload');

 console.log('PASS stage 10: same-day IDs, no-note continuity, cross-gait rejection and preserved three tabs');
}finally{await browser.close();await new Promise(done=>server.close(done));}
