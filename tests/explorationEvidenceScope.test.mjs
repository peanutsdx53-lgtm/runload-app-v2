import test from "node:test";
import assert from "node:assert/strict";
import {makeUi,render} from "../ui/explorationExperience.js";
const categories=[
 {id:"01",name:"走りの記録",topics:["距離・時間・ペース","過去の走りとの比較","気付きと次の確認"]},
 {id:"02",name:"身体のしくみ",topics:["足・膝・股関節"]},
 {id:"03",name:"コースと環境",topics:["上り坂・下り坂"]},
 {id:"05",name:"暮らしと気持ち",topics:["睡眠"]},
 {id:"07",name:"目的と楽しみ方",topics:["自分に合う記録の使い方"]}
];
const storage={getItem:()=>null,setItem:()=>{}};
function show(category,topic,modal="learn-help",draft={}){
 const ui=makeUi(storage);ui.selected=category;ui.topic=topic;ui.modal=modal;
 return render(ui,{categories,draft,conditions:{entries:[],canSave:true},manualRuns:{ok:true,records:[]}});
}
for(const [cat,topic,fragment] of [
 ["02","足・膝・股関節","習慣的に走る28人"],
 ["03","上り坂・下り坂","成人19人"],
 ["01","過去の走りとの比較","質的に調べました"],
 ["01","気付きと次の確認","中断・再開"],
 ["05","睡眠","専門家コンセンサス"],
 ["07","自分に合う記録の使い方","中断・再開"]]){
 test("cited source scope is visible: "+topic,()=>{
  const html=show(cat,topic);
  assert.match(html,/研究の対象・使える範囲/);
  assert.ok(html.includes(fragment));
  assert.match(html,/rel="noopener noreferrer"/);
  assert.doesNotMatch(html,/自己理解の向上を実証しました/);
 });
}
test("course composition is not experimental slope",()=>{
 const html=show("03","上り坂・下り坂","",{gradeMode:"SUMMARY",upPercent:"30",downPercent:"20"});
 assert.match(html,/上り 30％／下り 20％／平坦 50％/);
 assert.match(html,/構成比であり、文献にある傾斜角（度）や路面勾配（％）ではありません/);
});

test('ROF-J learning never calls a self-selected before/after category a verified measurement-time difference',()=>{
 const both=[...categories,{id:"04",name:"疲れと回復",topics:["疲れの感じ方"]}];
 both[0]={...both[0],topics:[...both[0].topics,"自分が感じた疲れ"]};
 for(const [cat,topic] of [["01","自分が感じた疲れ"],["04","疲れの感じ方"]]){
  const ui=makeUi(storage);ui.selected=cat;ui.topic=topic;ui.modal="learn-help";
  const html=render(ui,{categories:both,draft:{},conditions:{entries:[],canSave:true},manualRuns:{ok:true,records:[]}});
  assert.match(html,/ROF-J/);
  assert.match(html,/大学生/);
  assert.doesNotMatch(html,/運動前後の値は本人が記録した時点の違いとして示します/);
  assert.match(html,/回答区分/);
  assert.match(html,/同一走行内の時間的な前後差は判定しません/);
 }
});
