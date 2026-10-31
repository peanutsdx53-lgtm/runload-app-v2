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
