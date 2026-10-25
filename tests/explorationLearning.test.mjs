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
test('sleep correctly distinguishes methods and displays only comparable dates',()=>{
 const records={canSave:true,entries:[
 {date:'2026-10-23',sleepMinutes:450,sleepSource:'duration',feeling:'良い',memo:''},
 {date:'2026-10-24',sleepMinutes:470,sleepSource:'duration',feeling:'ふつう',memo:''}
 ]};
 const u=makeUi(memory());u.selected='05';u.topic='睡眠';let html=render(u,ctx({},records));
 assert.match(html,/時間の差：\+20分/);assert.match(html,/起床時の調子|良い/);
 assert.match(html,/2026-10-24/);assert.match(html,/睡眠が調子や走りの原因とは判断できません/);
 const changed={...records,entries:[records.entries[0],{...records.entries[1],sleepSource:'clock',bedTime:'23:00',wakeTime:'06:50',bedDayRule:'previous',bedDayOffset:1}]};
 html=render(u,ctx({},changed));assert.match(html,/申告した睡眠時間と就寝〜起床の経過時間は同じ測定量として比較しません/);
 assert.equal(readLifeEntries({canSave:false,entries:records.entries}).status,'unavailable');
});
test('unsupported topics do not inherit unrelated experiment tools',()=>{
 const u=makeUi(memory());u.selected='06';u.topic='ウォームアップ';const html=render(u,ctx());
 assert.match(html,/学習コンテンツは準備中/);assert.doesNotMatch(html,/data-ex-slope="up"/);
 assert.equal(Object.keys(LEARNING_TOPICS).length,3);
});
test('next check can be explicitly saved and recovered by stable topic key, without changing run or life records',()=>{
 const storage=memory(),u=makeUi(storage);u.selected='03';u.topic='上り坂・下り坂';
 const saved=saveNote(u,'次は上りと下りで感じ方を確かめたい');assert.equal(saved.ok,true);
 const after=makeUi(storage);assert.equal(after.notes[0].topicId,'slope-running');
 after.selected='03';after.topic='上り坂・下り坂';const out=render(after,ctx());
 assert.match(out,/以前に残したこと：次は上りと下りで感じ方を確かめたい/);
 assert.deepEqual([...storage.map.keys()],['runload-v2-exploration-notes-v1']);
});
