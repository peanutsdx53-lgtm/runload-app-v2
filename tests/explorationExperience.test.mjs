import test from 'node:test';
import assert from 'node:assert/strict';
import {makeUi,signals,render,saveNote,deleteNote,EXPLORATION_NOTE_KEY} from '../ui/explorationExperience.js';
const categories=[
 {id:'01',name:'走りの記録',topics:['距離・時間・ペース']},
 {id:'02',name:'身体のしくみ',topics:['体の動き']},
 {id:'03',name:'コースと環境',topics:['上り坂・下り坂']},
 {id:'04',name:'疲れと回復',topics:['疲れの感じ方']},
 {id:'05',name:'暮らしと気持ち',topics:['睡眠']},
 {id:'06',name:'走る前後の工夫',topics:['ウォームアップ']},
 {id:'07',name:'目的と楽しみ方',topics:['楽しみ方']}
];
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),map:m}};
test('exploration has no invented saved activity or sample relevance by default',()=>{
 const u=makeUi(memory()),r=render(u,{categories,draft:{date:'2026-10-25'},conditions:{entries:[]}});
 assert.match(r,/記録がなくても/);assert.match(r,/data-ex-action="sample"/);assert.equal((r.match(/is-related/g)||[]).length,0);
 assert.doesNotMatch(r,/10月22日|8\.20 km/);
});
test('relevance is linked to explicitly provided draft fields and does not treat zero as missing',()=>{
 assert.deepEqual([...signals({date:'2026-10-25',gradeMode:'SUMMARY',upPercent:'0',downPercent:'0',rofBefore:0,rofAfter:null},{}).linked.keys()],['04']);
 assert.deepEqual([...signals({gradeMode:'SUMMARY',upPercent:'20',downPercent:'0'},{}).linked.keys()],['03']);
 assert.deepEqual([...signals({distance:'5',gradeMode:'SUMMARY',upPercent:'18',downPercent:'0',rofBefore:4,bodyObservation:'痛みについてのメモ'},{}).linked.keys()],['01','03','04','02']);
 const cond={canSave:true,entries:[{date:'2026-10-24',sleepMinutes:410,sleepSource:'duration',feeling:'ふつう'}]};
 assert.equal(signals({},cond).linked.get('05'),'2026-10-24 の生活コンディション記録に関連');
 assert.equal(signals({distance:''},{entries:[]}).linked.size,0);
});
test('sample preview is opt-in and clearly labeled',()=>{
 const ui=makeUi(memory());ui.sample=true;
 const r=render(ui,{categories,draft:{},conditions:{entries:[]}});
 assert.match(r,/表示例で見る/);assert.match(r,/表示例：上り坂/);assert.match(r,/表示例を終了/);
 assert.equal((r.match(/ex-node is-related/g)||[]).length,2);
});
test('theme catalog expansion is data-driven without fixed 28-topic cap',()=>{
 const ui=makeUi(memory());ui.tab='catalog';const extended=categories.map(c=>({...c,topics:[...c.topics]}));
 extended[2].topics.push('コース選び','地形と路面');const r=render(ui,{categories:extended,draft:{},conditions:{entries:[]}});
 assert.match(r,/7分野・9テーマ/);assert.match(r,/コース選び/);
});
test('notes are opt-in, persisted only to isolated key, deletion works',()=>{
 const storage=memory(),ui=makeUi(storage);ui.selected='03';
 const saved=saveNote(ui,'次回は上り坂を確認する');assert.equal(saved.ok,true);assert.equal(ui.notes.length,1);
 assert.deepEqual([...storage.map.keys()],[EXPLORATION_NOTE_KEY]);
 const loaded=makeUi(storage);assert.equal(loaded.notes[0].text,'次回は上り坂を確認する');
 assert.equal(deleteNote(loaded,loaded.notes[0].id),true);assert.equal(loaded.notes.length,0);
});
test('corrupted notes are not overwritten and concurrency is protected',()=>{
 const storage=memory();storage.setItem(EXPLORATION_NOTE_KEY,'broken');const ui=makeUi(storage);
 assert.equal(ui.canSave,false);assert.equal(saveNote(ui,'text').ok,false);assert.equal(storage.getItem(EXPLORATION_NOTE_KEY),'broken');
 const s=memory(),a=makeUi(s),b=makeUi(s);assert.equal(saveNote(a,'first').ok,true);assert.equal(saveNote(b,'second').ok,false);assert.equal(a.notes.length,1);
 const another=memory(),u=makeUi(another);assert.equal(saveNote(u,'first').ok,true);another.map.delete(EXPLORATION_NOTE_KEY);assert.equal(saveNote(u,'second').ok,false);assert.equal(another.getItem(EXPLORATION_NOTE_KEY),null);
});
test('user note contents are escaped, including markup and HTML attributes',()=>{
 const ui=makeUi(memory());saveNote(ui,'<img src=x onerror=alert(1)>');ui.modal='memories';const r=render(ui,{categories,draft:{},conditions:{entries:[]}});
 assert.doesNotMatch(r,/<img src=x/);assert.match(r,/&lt;img src=x/);
});
