import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gpsReviewPage} from '../ui/measurementExperience.js';
import {newSimulationUi,renderSimulation,renderSimulationResults} from '../ui/simulationExperience.js';
import {resultImageAnnotation} from '../ui/resultExperience.js';

const finished=()=>({phase:'finished',distanceM:35,accepted:2,activity:'RUNNING',goalMode:'free',goalValue:'',flags:[],lastPosition:null,notice:'',saveRoute:false});
test('UIUX06 S18: GPS review distinguishes valid ROF-J zero from absent after response',()=>{
 const html=gpsReviewPage(finished(),60000,{rofBefore:0,rofAfter:null,saveRoute:false,memo:'本人の疑問'});
 assert.match(html,/運動前：0 \/ 10/);
 assert.match(html,/未回答/);
 assert.match(html,/0は回答済み、未回答は未回答のまま保存/);
 assert.match(html,/実際の時間的前後差を判定しません/);
 assert.match(html,/位置情報を含むコース詳細は/);
 assert.match(html,/初期OFF/);
 assert.match(html,/data-gps-note/);
 assert.match(html,/data-gps-action="save"/);
 assert.doesNotMatch(html,/data-gps-save-route checked/);
 const disabled=gpsReviewPage({...finished(),distanceM:2,accepted:1},60000,{});
 assert.match(disabled,/data-gps-action="save"[^>]*disabled/);
});
test('UIUX06 S19: four simulation steps and hypothetical results remain explicit, focus wiring retains source',()=>{
 const s=newSimulationUi(),output=renderSimulation(s,{presets:{ok:true,records:[]},manualRuns:{ok:true,records:[]}});
 assert.equal((output.match(/<span>0[1-4] /g)||[]).length,4);
 assert.match(output,/保存済みの実記録とは異なる、仮の計算結果です/);
 assert.match(renderSimulationResults(s),/身体負荷を予測しません/);
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/source=active\?\.getAttribute\?\.\("data-sm-source"\)/);
 assert.match(app,/field=active\?\.getAttribute\?\.\("data-sm-field"\)/);
 assert.match(app,/current\?\.focus\(\{preventScroll:true\}\)/);
});
test('UIUX06 S20: exported PNG does not falsely assert timestamp absence',()=>{
 const js=readFileSync(new URL('../ui/resultExperience.js',import.meta.url),'utf8');
 assert.match(js,/回答の実際の時間的前後差は判定しません/);
 assert.doesNotMatch(js,/評価時刻未記録：前後差は判定不可/);
 assert.match(js,/部位間の順位・傷害リスクを示しません/);
 assert.match(js,/ROF-Jは本人が回答した疲労感です/);
 assert.equal(resultImageAnnotation({saved:true,reference:{count:9}}).status,'文献参考値：9/12 部位算出');
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8'),sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8'),html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(app,/resultExperience\.js\?v=20261102-uiux-batch06-v1/);
 assert.match(sw,/resultExperience\.js\?v=20261102-uiux-batch06-v1/);
 const appEntry=html.match(/src="(\.\/app\.js\?v=[^"]+)"/)?.[1];
 assert.ok(appEntry,'entrypoint must use a versioned app.js URL');
 assert.ok(sw.includes('"'+appEntry+'"'),'offline assets must match the current app.js entrypoint');
 assert.match(html,/simulationExperience\.css\?v=20261102-uiux-batch06-v2/);
 assert.match(sw,/simulationExperience\.css\?v=20261102-uiux-batch06-v2/);
});
