import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUi,render,saveNote,signals,LEARNING_TOPICS} from '../ui/explorationExperience.js';
import {createExplorationContext,readCourseDraft,readLifeEntries,compareLifeDays} from '../ui/explorationReadAdapter.js';
const categories=[
 {id:'01',name:'走りの記録',topics:['距離・時間・ペース']},
 {id:'02',name:'身体のしくみ',topics:['足・膝・股関節','姿勢と走る動作']},
 {id:'03',name:'コースと環境',topics:['上り坂・下り坂','路面']},
 {id:'04',name:'疲れと回復',topics:['疲れの感じ方']},
 {id:'05',name:'暮らしと気持ち',topics:['睡眠','食事・水分']},
 {id:'06',name:'走る前後の工夫',topics:['ウォームアップ']},
 {id:'07',name:'目的と楽しみ方',topics:['楽しみ方']}
];
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),map}};
const ctx=(draft={},conditions={entries:[],canSave:true})=>({draft,conditions,categories});
test('field highlight and selected slope theme obey same eligibility; no false grade from partial inputs',()=>{
 const input={gradeMode:'SUMMARY',upPercent:'30',downPercent:'20'};
 assert.equal(readCourseDraft(input).status,'complete');
 assert.equal(createExplorationContext({draft:input,conditions:{entries:[],canSave:true}}).highlights[0].themeId,'上り坂・下り坂');
 assert.equal(signals(input,{entries:[],canSave:true}).linked.has('03'),true);
 const ui=makeUi(memory());ui.selected='03';ui.topic='上り坂・下り坂';
 const html=render(ui,ctx(input));assert.match(html,/入力途中の坂道情報があるため/);
 assert.match(html,/上り 30％／下り 20％／平坦 50％/);
 assert.match(html,/GPSによる標高断面ではありません/);
 assert.match(html,/data-ex-slope="up"/);
 assert.doesNotMatch(render(ui,ctx({gradeMode:'SUMMARY',upPercent:'30',downPercent:''})),/ex-node is-related is-selected/);
 assert.equal(signals({gradeMode:'SUMMARY',upPercent:'0',downPercent:'0'},{}).linked.has('03'),false);
});
test('body teaches movements rather than pretending the twelve-region personal measurement is available',()=>{
 const ui=makeUi(memory());ui.selected='02';ui.topic='足・膝・股関節';
 let output=render(ui,ctx());
 assert.match(output,/股関節・膝・足首が連携/);
 assert.match(output,/data-ex-body="ankle"/);
 assert.match(output,/結果画面の参考情報を見る/);
 assert.doesNotMatch(output,/あなたの関節への負荷を算定/);
 ui.bodyChoice='ankle';output=render(ui,ctx());assert.match(output,/地面を押して進むときや/);
});
test('sleep column displays saved entries; comparison helper rejects incompatible methods',()=>{
 const records={canSave:true,entries:[
 {date:'2026-10-23',sleepMinutes:450,sleepSource:'duration',feeling:'良い',memo:''},
 {date:'2026-10-24',sleepMinutes:470,sleepSource:'duration',feeling:'ふつう',memo:''}
 ]};
 const u=makeUi(memory());u.selected='05';u.topic='睡眠';let html=render(u,ctx({},records));
 assert.match(html,/いちばん新しい生活記録/);assert.match(html,/朝の調子：ふつう/);
 const life=readLifeEntries(records);
 assert.equal(compareLifeDays(life,'2026-10-23','2026-10-24').status,'complete');
 assert.equal(compareLifeDays(life,'2026-10-23','2026-10-24').minutesDelta,20);
 assert.match(html,/2026-10-24/);assert.match(html,/睡眠と、走る日の調子/);
 const changed={...records,entries:[records.entries[0],{...records.entries[1],sleepSource:'clock',bedTime:'23:00',wakeTime:'06:50',bedDayRule:'previous',bedDayOffset:1}]};
 html=render(u,ctx({},changed));assert.match(html,/就床から起床までの時間/);
 const incompatible=compareLifeDays(readLifeEntries(changed),'2026-10-23','2026-10-24');
 assert.equal(incompatible.status,'incompatible');
 assert.match(incompatible.reason,/同じ測定量として比較しません/);
 assert.equal(readLifeEntries({canSave:false,entries:records.entries}).status,'unavailable');
});
test('unsupported topics do not inherit unrelated experiment tools',()=>{
 const u=makeUi(memory());u.selected='06';u.topic='ウォームアップ';const html=render(u,ctx());
 assert.match(html,/走り始める前に何をしていますか/);assert.doesNotMatch(html,/data-ex-slope="up"/);
 assert.equal(Object.keys(LEARNING_TOPICS).length,10);
});
test('next check can be explicitly saved and recovered by stable topic key, without changing run or life records',()=>{
 const storage=memory(),u=makeUi(storage);u.selected='03';u.topic='上り坂・下り坂';
 const saved=saveNote(u,'次は上りと下りで感じ方を確かめたい');assert.equal(saved.ok,true);
 const after=makeUi(storage);assert.equal(after.notes[0].topicId,'slope-running');
 after.selected='03';after.topic='上り坂・下り坂';const out=render(after,ctx());
 assert.match(out,/以前に書いたこと/);
 assert.match(out,/次は上りと下りで感じ方を確かめたい/);
 assert.deepEqual([...storage.map.keys()],['runload-v2-exploration-notes-v1']);
});

test('selected-run exploration does not highlight unrelated life records',()=>{
 const run={id:'run-v1-12345678-1234-4123-8123-123456789012',date:'2026-10-25',createdAt:'2026-10-25T05:00:00Z',source:'manual',type:'run',schema:1,distanceKm:5.2,durationSeconds:1950,rofBefore:0,rofAfter:4,draft:{activityGait:'RUNNING'}};
 const conditions={canSave:true,entries:[{date:'2026-10-24',sleepMinutes:450,sleepSource:'duration',feeling:'良い',memo:''}]};
 const focused=signals(null,conditions,{ok:true,records:[run]},run.id);
 assert.equal(focused.linked.has('01'),true);
 assert.equal(focused.linked.has('04'),true);
 assert.equal(focused.linked.has('05'),false,'unrelated life record should not become a property of a selected run');
 assert.equal(signals(null,conditions,{ok:true,records:[run]}).linked.has('05'),true,'general exploration retains independent life links');
});

test('focused distance-and-pace lesson returns to the selected saved run, not a newer entry or the history list',()=>{
 const u=makeUi(memory());u.selected='01';u.topic='距離・時間・ペース';
 const target={id:'run-v1-12345678-1234-4123-8123-123456789012',date:'2026-10-18',createdAt:'2026-10-18T05:00:00Z',source:'manual',type:'run',schema:1,distanceKm:5,durationSeconds:2100};
 const newer={...target,id:'run-v1-99999999-9999-4999-8999-999999999999',date:'2026-10-26',createdAt:'2026-10-26T05:00:00Z',distanceKm:8,durationSeconds:2200};
 const runs={ok:true,records:[newer,target]},base={...ctx(),manualRuns:runs,focusRunId:target.id,focusRun:target};
 const focused=render(u,base);
 assert.match(focused,/選択した保存済み走行（手入力）/);
 assert.match(focused,/2026-10-18/);
 assert.match(focused,/距離：5\.00 km/);
 assert.doesNotMatch(focused,/距離：8\.00 km/);
 assert.ok(focused.includes('href="#/result?record='+target.id+'"'));
 assert.match(focused,/この走行の結果へ戻る/);
 const missing=render(u,{...base,focusRunId:'missing-record-id',focusRun:null});
 assert.match(missing,/指定した走行を確認できません/);
 assert.match(missing,/別の走行の数値で代用せず/);
 assert.doesNotMatch(missing,/距離：8\.00 km/);
 assert.doesNotMatch(missing,/距離：5\.00 km/);
 assert.match(missing,/履歴で記録を選び直す/);
 assert.doesNotMatch(missing,/href="#\/result\?record=/);
 const general=render(u,{...ctx(),manualRuns:runs});
 assert.match(general,/最新の保存済み走行/);
 assert.match(general,/距離：8\.00 km/);
 assert.match(general,/href="#\/history"/);
});

test('distance and pace column reads only confirmed manual runs, never an unsaved editor draft',()=>{
 const u=makeUi(memory());u.selected='01';u.topic='距離・時間・ペース';
 const draft={distance:'99',minutes:'9'};
 const run={id:'run-v1-12345678-1234-4123-8123-123456789012',date:'2026-10-25',createdAt:'2026-10-25T05:00:00Z',source:'manual',type:'run',schema:1,distanceKm:5.2,durationSeconds:1950};
 const initial=render(u,{...ctx(draft),manualRuns:{ok:true,records:[]}});
 assert.match(initial,/保存済みの走行はまだありません/);
 assert.doesNotMatch(initial,/99 km/);
 const page=render(u,{...ctx(draft),manualRuns:{ok:true,records:[run]}});
 assert.match(page,/data-ex-learning="distance-time-pace"/);
 assert.match(page,/2026-10-25/);
 assert.match(page,/距離：5.20 km/);
 assert.match(page,/経過時間：32分30秒/);
 assert.match(page,/6:15 分\/km/);
 assert.match(page,/9.6 km\/h/);
 assert.match(page,/手入力/);
 assert.doesNotMatch(page,/99 km/);
 assert.match(page,/href="#\/history"/);
 const invalid=render(u,{...ctx(draft),manualRuns:{ok:false,records:[run]}});
 assert.match(invalid,/走行記録を読み取れません/);
 assert.doesNotMatch(invalid,/6:15 分\/km/);
 u.sample=true;
 const sample=render(u,{...ctx(draft),manualRuns:{ok:true,records:[run]}});
 assert.match(sample,/表示例を終了すると/);
 assert.doesNotMatch(sample,/6:15 分\/km/);
});
