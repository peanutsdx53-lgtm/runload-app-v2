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
 assert.match(r,/表示例/);assert.match(r,/表示例/);assert.match(r,/表示例を終了/);
 assert.equal((r.match(/ex-node is-related/g)||[]).length,2);
});
test('theme catalog expansion is data-driven without fixed 28-topic cap',()=>{
 const ui=makeUi(memory());ui.tab='catalog';const extended=categories.map(c=>({...c,topics:[...c.topics]}));
 extended[2].topics.push('コース選び','地形と路面');const r=render(ui,{categories:extended,draft:{},conditions:{entries:[]}});
 assert.match(r,/9 テーマ/);assert.match(r,/コース選び/);
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

test('beginner exploration removes duplicate navigation and hides citations under help',()=>{
 const u=makeUi(memory()),base={categories,draft:{},conditions:{entries:[]}};
 const html=render(u,base);
 assert.equal((html.match(/data-ex-tab="catalog"/g)||[]).length,1);
 assert.doesNotMatch(html,/すべてのテーマを見る|data-ex-action="catalog"|ex-selected-topic|これまでの気づき|探究フィールド/);
 assert.match(html,/今日は何が気になる/);
 assert.match(html,/ふり返り/);
 assert.equal((html.match(/data-ex-action="memories"/g)||[]).length,1);
 assert.equal((html.match(/class="ex-node /g)||[]).length,7);
 u.selected='03';u.topic='上り坂・下り坂';const reading=render(u,base);
 assert.match(reading,/上り坂と下り坂、走る動きの違い/);
 assert.match(reading,/data-ex-action="note"/);
 assert.doesNotMatch(reading,/参考研究：Vernillo/);
 u.modal='learn-help';const help=render(u,base);
 assert.match(help,/参考資料/);
 assert.match(help,/Vernillo/);
 assert.match(help,/doi.org/);
});
test('topic catalog groups questions by field and filters without duplicating buttons',()=>{
 const u=makeUi(memory());u.tab='catalog';
 const html=render(u,{categories,draft:{},conditions:{entries:[]}});
 assert.equal((html.match(/class="ex-catalog-group"/g)||[]).length,7);
 assert.equal((html.match(/data-ex-pick-topic=/g)||[]).length,7);
 assert.match(html,/data-ex-search/);
});

test('all 28 topics have a useful beginner prompt or a sourced learning panel',()=>{
 const ui=makeUi(memory()),ctx={categories,draft:{},conditions:{entries:[]}};
 for(const cat of categories){ui.selected=cat.id;for(const topic of cat.topics){ui.topic=topic;const page=render(ui,ctx);assert.match(page,/data-ex-action="note"/);assert.doesNotMatch(page,/このテーマの学習コンテンツは準備中です|学習コンテンツは準備中/);}}
});

test('saved manual run lights only supported categories and identifies its provenance',()=>{
 const run={source:'manual',type:'run',schema:1,date:'2026-10-25',createdAt:'2026-10-25T07:00:00Z',
   distanceKm:5,durationSeconds:1800,rofBefore:0,rofAfter:null,
   draft:{gradeMode:'SUMMARY',upPercent:'20',downPercent:'10',bodyObservation:''}};
 const signalsSaved=signals({}, {entries:[]}, {ok:true,records:[run]});
 assert.deepEqual([...signalsSaved.linked.keys()],['01','03','04']);
 assert.equal(signalsSaved.sources.get('03'),'saved-run');
 assert.match(signalsSaved.linked.get('03'),/2026-10-25 に保存した坂道/);
 assert.equal(signalsSaved.hasSavedRun,true);
 const html=render(makeUi(memory()),{categories,draft:{},conditions:{entries:[]},manualRuns:{ok:true,records:[run]}});
 assert.match(html,/data-ex-source="saved-run"/);
 assert.match(html,/ex-node-signal/);
 assert.equal((html.match(/class="ex-node is-related/g)||[]).length,3);
});
test('bad saved store, GPS and empty noneligible records never create saved-run glow',()=>{
 const cases=[{ok:false,records:[]},{ok:true,records:[{source:'gps',type:'run',schema:1,distanceKm:5,durationSeconds:1800,date:'2026-10-25'}]},
  {ok:true,records:[{source:'manual',type:'run',schema:1,distanceKm:0,durationSeconds:0,date:'2026-10-25'}]}];
 for(const read of cases){
  const found=signals({}, {entries:[]},read);
  assert.equal(found.hasSavedRun,false);
  assert.equal(found.linked.size,0);
 }
 const draftOnly=signals({distance:'5'}, {entries:[]},cases[0]);
 assert.equal(draftOnly.sources.get('01'),'draft');
 assert.equal(draftOnly.hasSavedRun,false);
});
test('discovery orbit and searchable catalog are structurally different',()=>{
 const u=makeUi(memory()),ctx={categories,draft:{distance:'5'},conditions:{entries:[]}};
 const orbit=render(u,ctx);
 assert.match(orbit,/class="ex-map"/);
 assert.match(orbit,/class="ex-core"/);
 assert.match(orbit,/class="ex-art"/);
 assert.match(orbit,/data-ex-source="draft"/);
 u.tab='catalog';
 const lookup=render(u,ctx);
 assert.doesNotMatch(lookup,/class="ex-core"/);
 assert.match(lookup,/class="ex-catalog-grid"/);
 assert.match(lookup,/data-ex-search/);
});

test('topic layout scales and reflection has one way to review',()=>{
 const ui=makeUi(memory());
 const extra=[...categories];
 extra[1]={...extra[1],topics:['足・膝・股関節','姿勢と走る動作','体幹と腕の動き','12部位の参考値の見方','もうひとつのテーマ','さらに追加のテーマ']};
 ui.selected='02';ui.topic='足・膝・股関節';
 const html=render(ui,{categories:extra,draft:{},conditions:{entries:[]}});
 assert.equal((html.match(/data-ex-topic=/g)||[]).length,6);
 assert.match(html,/6 テーマ · 横に動かして選ぶ/);
 assert.match(html,/class="ex-topic-set"/);
 assert.equal((html.match(/data-ex-action="memories"/g)||[]).length,1);
 assert.doesNotMatch(html,/class="ex-memories"/);
 assert.match(html,/書いてみる/);
 assert.doesNotMatch(html,/メモを残す|メモを見る|自分のメモ/);
 ui.modal='note';
 const note=render(ui,{categories:extra,draft:{},conditions:{entries:[]}});
 assert.match(note,/書き残す内容（500文字まで）/);
 assert.match(note,/気づきを書く/);
});
