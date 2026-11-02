import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderConsultation} from '../ui/consultationExperience.js';
import {renderDataDelete,makeDataUi} from '../ui/dataManagementUi.js';
import {measurementPage} from '../ui/measurementExperience.js';

test('S15 share mode and mobile preview buttons expose actual checked state',()=>{
 const html=renderConsultation();
 assert.match(html,/aria-pressed="true" data-mode-button="single"/);
 assert.match(html,/aria-pressed="false" data-mode-button="period"/);
 assert.match(html,/aria-pressed="true" data-switch="edit"/);
 assert.match(html,/data-switch="preview" aria-pressed="false"/);
 const js=readFileSync(new URL('../ui/consultationExperience.js',import.meta.url),'utf8');
 assert.match(js,/setAttribute\('aria-pressed',String\(x===b\)\)/);
 assert.match(html,/GPS詳細軌跡・個人プロフィール/);
});

test('S16 deletion requires acknowledgement plus exact word and explains why',()=>{
 const ui=makeDataUi();
 let html=renderDataDelete(ui);
 assert.match(html,/id="dm-delete-rule"/);
 assert.match(html,/aria-describedby="dm-delete-rule" disabled/);
 ui.deleteAgreed=true;html=renderDataDelete(ui);
 assert.match(html,/aria-describedby="dm-delete-rule" disabled/);
 ui.deleteAgreed=false;ui.deleteWord='削除';html=renderDataDelete(ui);
 assert.match(html,/aria-describedby="dm-delete-rule" disabled/);
 ui.deleteAgreed=true;html=renderDataDelete(ui);
 assert.doesNotMatch(html,/aria-describedby="dm-delete-rule" disabled/);
 assert.match(html,/削除後は元に戻せません/);
});

const state=phase=>({phase,distanceM:0,accepted:0,activity:'RUNNING',goalMode:'free',goalValue:'',flags:[],keepScreenAwake:false,lastPosition:null,positionError:'',notice:'',saveRoute:false});
test('S17 GPS phases expose exactly one current three-step status, not a fake measurement',()=>{
 for(const [phase,number] of [['ready','01'],['running','02'],['paused','02'],['finished','03']]){
  const html=measurementPage(state(phase),0,{});
  assert.equal((html.match(/aria-current="step"/g)||[]).length,1,phase);
  const matches=[...html.matchAll(/<span class="[^"]*" (?:aria-current="step")?><b>(0[1-3])<\/b> (?:準備|測定|保存)<\/span>/g)];
  assert.equal(matches.length,3,phase);
  assert.match(html,new RegExp('aria-current="step"><b>'+number+'</b>'),phase);
 }
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/gpsPlatform\.currentGpsSmartphone\(\)/);
 assert.match(app,/GPS測定はスマートフォン専用です/);
});
