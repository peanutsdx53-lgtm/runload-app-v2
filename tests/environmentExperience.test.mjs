import test from 'node:test';
import assert from 'node:assert/strict';
import {newEnvironmentUi,environmentDraftKeys,toggleWeather,toggleFlag,environmentSummary,environmentPage,temperatureError} from '../ui/environmentExperience.js';
test('temperature validates input without turning missing into zero',()=>{
 assert.equal(temperatureError(''),'');assert.equal(temperatureError('0'),'');assert.equal(temperatureError('-50'),'');assert.equal(temperatureError('60'),'');
 assert.match(temperatureError('61'),/気温/);assert.match(temperatureError('Infinity'),/気温/);
 assert.deepEqual(environmentDraftKeys,['temperatureC','environmentNote']);
});
test('environment subjective selections are transient and reversible',()=>{
 const ui=newEnvironmentUi();assert.equal(toggleWeather(ui,'SUN'),true);assert.equal(ui.weather,'SUN');toggleWeather(ui,'SUN');assert.equal(ui.weather,null);
 assert.equal(toggleWeather(ui,'NONSENSE'),false);toggleFlag(ui,'WIND');toggleFlag(ui,'HUMID');assert.deepEqual(ui.flags,['WIND','HUMID']);toggleFlag(ui,'WIND');assert.deepEqual(ui.flags,['HUMID']);
 assert.match(environmentSummary({temperatureC:'0'},ui),/0℃/);assert.match(environmentSummary({temperatureC:''},ui),/未入力/);
});
test('page never silently serializes weather or claims automatic measurements',()=>{
 const html=environmentPage({temperatureC:'0',environmentNote:'強風 <test>'},{weather:'RAIN',flags:['WIND'],notice:''});
 assert.match(html,/data-draft="temperatureC"/);assert.match(html,/data-draft="environmentNote"/);assert.match(html,/天候・風・湿度の選択はこの画面だけの一時表示/);assert.match(html,/移動や再読み込みで消えます/);
 assert.doesNotMatch(html,/data-draft="weather"/);assert.match(html,/強風 &lt;test&gt;/);
});
test('transient weather choices are stated as non-persistent at the choice and confirmation exit',()=>{
 const html=environmentPage({},newEnvironmentUi());
 assert.match(html,/天候・風・湿度の選択はこの画面だけの一時表示/);
 assert.match(html,/気温と環境メモは記録の確認画面に引き継がれます/);
 assert.doesNotMatch(html,/data-draft="weather"|data-draft="flags"/);
});
