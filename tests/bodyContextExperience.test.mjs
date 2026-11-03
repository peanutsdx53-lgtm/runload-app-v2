import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REGIONS,VIEWS,DRAFT_KEYS,makeUi,setView,focusRegion,toggleRegion,clearSelected,viewRegionIds,addRegionNamesToNote,transferStatus,checkDefinitions,renderScreen} from '../ui/bodyContextExperience.js';
import {OFFICIAL_NAMES} from '../ui/resultExperience.js';
const appSource=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('12 formal body IDs and names match the active result registry, not old mock rows',()=>{
 assert.equal(REGIONS.length,12);
 assert.equal(checkDefinitions(),true);
 assert.deepEqual(REGIONS.map(({id,name})=>[id,name]),OFFICIAL_NAMES);
 assert.ok(!appSource.includes('const REGIONS='),'obsolete mock region registry was removed');
 assert.ok(appSource.includes('resultExperience.mountResult'),'only approved saved-data result presenter remains');
 assert.ok(!appSource.includes('value:101.7')&&!appSource.includes('value:112.4'));
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

test("body and current result preserve all approved anatomical names",()=>{const expected=[["BA-DISP-014","股関節部"],["BA-DISP-015","殿部"],["BA-DISP-016","大腿前面"],["BA-DISP-018","大腿後面"],["BA-DISP-019","膝蓋大腿関節部"],["BA-DISP-021","脛骨部"],["BA-DISP-023","下腿後面"],["BA-DISP-024","足関節部"],["BA-DISP-025","アキレス腱部"],["BA-DISP-027","後足部"],["BA-DISP-028","足底中部・内側縦足弓"],["BA-DISP-029","前足部"]];assert.deepEqual(REGIONS.map(x=>[x.id,x.name]),expected);assert.deepEqual(OFFICIAL_NAMES,expected);assert.ok(appSource.includes('resultExperience.OFFICIAL_NAMES'));});

test('12 selected body regions are summarized with a reversible show-all control, not dropped',()=>{
 const ui=makeUi();for(const r of REGIONS)toggleRegion(ui,r.id);
 const collapsed=renderScreen({},ui);
 assert.match(collapsed,/ほか 9 部位を表示/);
 assert.equal((collapsed.match(/class="cx-selected-chip"/g)||[]).length,3);
 assert.match(collapsed,/選択中の部位/);
 ui.selectedExpanded=true;
 const expanded=renderScreen({},ui);
 assert.equal((expanded.match(/class="cx-selected-chip"/g)||[]).length,12);
 assert.match(expanded,/折りたたむ/);
 assert.equal(ui.selected.length,12);
 clearSelected(ui);assert.equal(ui.selectedExpanded,false);
});
test('single optional header and aligned shoe-length counter do not change the record contract',()=>{
 const d={shoeName:'シューズ名',bodyObservation:'違和感',memo:'自由記述'};
 const html=renderScreen(d,makeUi());
 assert.match(html,/maxlength="100" data-draft="shoeName"/);
 assert.match(html,/data-counter="shoeName">5\/100/);
 assert.doesNotMatch(html,/必要な項目だけ入力してください|身体で感じたことと、使ったもの/);
 assert.equal((html.match(/cx-optional/g)||[]).length,0);
 assert.deepEqual(DRAFT_KEYS,['bodyObservation','shoeName','memo']);
});


test('S07 transient selection is distinct from user-authored body observation and cannot duplicate a transferred line',()=>{
 const ui=makeUi(),d={bodyObservation:'昨日は少し疲れた',shoeName:'',memo:''};
 toggleRegion(ui,'BA-DISP-019');
 let markup=renderScreen(d,ui);
 assert.match(markup,/部位を選んだだけでは記録に残りません/);
 assert.match(markup,/data-append-name >/);
 assert.equal(d.bodyObservation,'昨日は少し疲れた','selecting a body map region never writes observations');
 assert.equal(addRegionNamesToNote(d,ui),true);
 markup=renderScreen(d,ui);
 assert.match(markup,/部位名は自覚情報の文章に追加されています/);
 assert.match(markup,/data-append-name disabled/);
 toggleRegion(ui,'BA-DISP-023');
 assert.equal(addRegionNamesToNote(d,ui),false,'a changed selection should not silently append another conflicting region line');
 assert.match(ui.notice,/重複を避けるため/);
 assert.equal((d.bodyObservation.match(/気になった部位：/g)||[]).length,1);
});

test('S07 transfer state refreshes when the user edits or removes an existing region line',()=>{
 const ui=makeUi(),d={bodyObservation:'',memo:'',shoeName:''};
 toggleRegion(ui,'BA-DISP-019');
 assert.equal(transferStatus(d,ui).disabled,false);
 assert.equal(addRegionNamesToNote(d,ui),true);
 assert.equal(transferStatus(d,ui).disabled,true);
 toggleRegion(ui,'BA-DISP-023');
 assert.equal(transferStatus(d,ui).disabled,true);
 assert.match(transferStatus(d,ui).message,/以前に追加した部位名/);
 d.bodyObservation='本人が気づいたこと';
 assert.equal(transferStatus(d,ui).disabled,false,'removing the previous line re-enables explicit transfer');
 assert.match(transferStatus(d,ui).message,/選んだだけでは記録に残りません/);
});
