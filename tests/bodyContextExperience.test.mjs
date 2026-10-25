import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGIONS,VIEWS,DRAFT_KEYS,makeUi,setView,focusRegion,toggleRegion,clearSelected,viewRegionIds,addRegionNamesToNote,checkDefinitions,renderScreen} from '../ui/bodyContextExperience.js';
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('12 original body IDs and labels match app.js unchanged',()=>{
 assert.equal(REGIONS.length,12);
 assert.equal(checkDefinitions(),true);
 for(const {id,name} of REGIONS){
  const match=appSource.match(new RegExp(`\\{id:"${id}",name:"[^"]+",friendly:"([^"]+)"`));
  assert.ok(match,id);assert.equal(match[1],name,id);
 }
});
test('official SVG silhouettes and region paths are directly referenced',()=>{
 assert.deepEqual(VIEWS.map(v=>v.key),['front','back','sole']);
 assert.deepEqual(VIEWS.map(v=>v.paths.length),[5,4,3]);
 assert.ok(VIEWS.every(v=>v.silhouette.includes('<path')));
});
test('focus is separate from subjective selection and preserves state across views',()=>{
 const ui=makeUi();assert.equal(focusRegion(ui,'BA-DISP-019'),true);assert.deepEqual(ui.selected,[]);
 assert.equal(toggleRegion(ui,'BA-DISP-019'),true);assert.equal(setView(ui,'back'),true);
 assert.equal(focusRegion(ui,'BA-DISP-023'),true);toggleRegion(ui,'BA-DISP-023');
 assert.deepEqual(ui.selected,['BA-DISP-019','BA-DISP-023']);assert.equal(focusRegion(ui,'BA-DISP-014'),false);
 toggleRegion(ui,'BA-DISP-019');assert.deepEqual(ui.selected,['BA-DISP-023']);clearSelected(ui);assert.deepEqual(ui.selected,[]);
});
test('never adds scientific values or persistent subjective fields',()=>{
 assert.deepEqual(DRAFT_KEYS,['bodyObservation','shoeName','memo']);
 const d={bodyObservation:'',shoeName:'',memo:''},ui=makeUi();ui.selected=['BA-DISP-019'];
 assert.equal(addRegionNamesToNote(d,ui),true);assert.equal(d.bodyObservation,'気になった部位：膝蓋大腿関節部');
 assert.equal(addRegionNamesToNote(d,ui),false);
 assert.deepEqual(Object.keys(d),DRAFT_KEYS);
});
test('unsafe HTML input is escaped and full screen retains correct labels',()=>{
 const html=renderScreen({bodyObservation:'<img src=x onerror=alert(1)>',shoeName:'"',memo:'<b>'},makeUi());
 assert.ok(!html.includes('<img src=x onerror'));
 assert.ok(html.includes('&lt;img'));
 assert.match(html,/身体・使用品/);
 assert.equal((html.match(/data-region-focus=/g)||[]).length,5);
});

test("body and result keep old-app formal anatomical terminology",()=>{const expected=[["BA-DISP-014","股関節部"],["BA-DISP-015","殿部"],["BA-DISP-016","大腿前面"],["BA-DISP-018","大腿後面"],["BA-DISP-019","膝蓋大腿関節部"],["BA-DISP-021","脛骨部"],["BA-DISP-023","下腿後面"],["BA-DISP-024","足関節部"],["BA-DISP-025","アキレス腱部"],["BA-DISP-027","後足部"],["BA-DISP-028","足底中部・内側縦足弓"],["BA-DISP-029","前足部"]];assert.deepEqual(REGIONS.map(x=>[x.id,x.name]),expected);for(const [id,name] of expected)assert.ok(appSource.includes('id:"'+id+'",name:"'+name+'",friendly:"'+name+'"'),id);});
