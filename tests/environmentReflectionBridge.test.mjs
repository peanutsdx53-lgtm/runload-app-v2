import test from 'node:test';
import assert from 'node:assert/strict';
import {newEnvironmentUi,toggleWeather,toggleFlag,applyEnvironmentSelections,environmentPage} from '../ui/environmentExperience.js';
test('F02: optional subjective weather is explicitly copied to the existing draft memo, not inferred as measurements',()=>{
 const d={temperatureC:'0',environmentNote:'本人の観察'},ui=newEnvironmentUi();
 toggleWeather(ui,'SUN');toggleFlag(ui,'WIND');
 assert.match(environmentPage(d,ui),/data-e4-commit/);
 assert.equal(d.environmentNote,'本人の観察','mere selection cannot silently overwrite the text');
 const x=applyEnvironmentSelections(d,ui);
 assert.equal(x.ok,true);
 assert.match(d.environmentNote,/本人の観察\n【本人申告の環境選択】天候：晴れ、風が強い/);
 const prior=d.environmentNote;
 assert.equal(applyEnvironmentSelections(d,ui).ok,false);
 assert.equal(d.environmentNote,prior,'repeated explicit confirmation does not duplicate context');
});
test('F02: missing choices and 500-char full memo never silently truncate or erase personal text',()=>{
 const d={environmentNote:'a'.repeat(494)},ui=newEnvironmentUi();
 assert.equal(applyEnvironmentSelections(d,ui).ok,false);
 toggleWeather(ui,'RAIN');toggleFlag(ui,'HUMID');
 const raw=d.environmentNote;
 const x=applyEnvironmentSelections(d,ui);
 assert.equal(x.ok,false);
 assert.match(x.reason,/500文字/);
 assert.equal(d.environmentNote,raw);
});

test('S07 UX-008: pending is not saved and applied state is derived from the actual memo',()=>{
 const draft={temperatureC:'0',environmentNote:'本人の記録'},ui=newEnvironmentUi();
 const initial=environmentPage(draft,ui);
 assert.match(initial,/data-state="none"/);
 assert.match(initial,/data-e4-commit disabled/);
 toggleWeather(ui,'RAIN');
 toggleFlag(ui,'WIND');
 const pending=environmentPage(draft,ui);
 assert.match(pending,/data-state="pending"/);
 assert.match(pending,/まだ環境メモに反映されていません/);
 assert.doesNotMatch(pending,/data-e4-commit disabled/);
 assert.equal(draft.environmentNote,'本人の記録','selecting never writes observations');
 assert.equal(applyEnvironmentSelections(draft,ui).ok,true);
 const committed=environmentPage(draft,ui);
 assert.match(committed,/data-state="applied"/);
 assert.match(committed,/data-e4-commit disabled/);
 assert.match(draft.environmentNote,/【本人申告の環境選択】天候：雨、風が強い/);
 toggleWeather(ui,'SUN');
 assert.match(environmentPage(draft,ui),/data-state="pending"/,'changed choices require a new explicit transfer');
});
