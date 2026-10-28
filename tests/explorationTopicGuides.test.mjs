import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPLORATION_DRAFT_GUIDES,validateExplorationCatalog,EXPLORATION_DRAFT_COUNT} from '../ui/explorationTopicGuides.js';
import {makeUi,render,saveNote,LEARNING_TOPICS} from '../ui/explorationExperience.js';
const root=new URL('../app.js',import.meta.url);
const app=readFileSync(root,'utf8');
const categories=[...app.matchAll(/\{id:"(0[1-7])",name:"([^"]+)",color:[^\n]+?topics:\[(.*?)\]\}/g)]
 .map(m=>({id:m[1],name:m[2],topics:[...m[3].matchAll(/"([^"]+)"/g)].map(x=>x[1])}));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)}};
test('all seven categories and 28 topics have distinct editorial status, without pretending 18 observation guides are literature verified',()=>{
 assert.equal(categories.length,7);
 const audit=validateExplorationCatalog(categories,Object.keys(LEARNING_TOPICS));
 assert.deepEqual(audit,{total:28,learned:10,observation:18,missing:[],unknown:[],ok:true});
 assert.equal(EXPLORATION_DRAFT_COUNT,18);
 for(const guide of Object.values(EXPLORATION_DRAFT_GUIDES)){
  assert.equal(guide.status,'design-prompt');
  for(const key of ['id','question','record','limit','next'])assert.ok(guide[key].length>=8,key);
  assert.doesNotMatch(guide.question+guide.record+guide.limit,/必ず回復|確実に予防|本人の負担を測定/);
 }
});
test('all 18 observation guides render self-observation, limitation and explicit source status',()=>{
 const ui=makeUi(memory());const ctx={categories,draft:{},conditions:{entries:[]}};
 for(const category of categories){for(const title of category.topics){
  const key=category.id+'|'+title;
  if(LEARNING_TOPICS[key])continue;
  ui.selected=category.id;ui.topic=title;
  const page=render(ui,ctx);
  for(const label of ['観察ガイド','専門解説は出典審査前','自分の記録とのつながり','この情報からは言えないこと','次に確かめたいこと'])assert.ok(page.includes(label),key+': '+label);
  assert.ok(page.includes('data-ex-action="note"'));
 }}
});
test('observation guide note has stable topic ID and survives reload; focused route returns same run',()=>{
 const storage=memory(),ui=makeUi(storage);
 ui.selected='06';ui.topic='ウォームアップ';
 assert.equal(saveNote(ui,'走る前の気持ちを次に確かめる').ok,true);
 assert.equal(ui.notes[0].topicId,'practice-warmup');
 const after=makeUi(storage);after.selected='06';after.topic='ウォームアップ';
 const run={id:'run-v1-test-1',date:'2026-10-20'};
 const html=render(after,{categories,draft:null,conditions:{entries:[]},focusRunId:run.id,focusRun:run});
 assert.match(html,/以前に書いたこと/);
 assert.match(html,/走る前の気持ちを次に確かめる/);
 assert.match(html,/href="#\/result\?record=run-v1-test-1"/);
});
test('cached assets include new offline editorial guide and UX version for updated copies',()=>{
 const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
 assert.match(sw,/explorationTopicGuides\.js/);
 assert.match(sw,/runload-ui-next-shell-20261028-source-scope-v1/);
});
