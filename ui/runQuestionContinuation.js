/** Explicit next-run inquiry, never an automatic note transfer or a science interpretation. */
import {EXPLORATION_NOTE_KEY,makeUi} from './explorationExperience.js';
import {findLinkableRun} from './noteRunLink.js';
import {compareSavedRuns} from './runReflection.js';
const fail=reason=>({ok:false,reason});
const pair=(runs,fromId,toId)=>{
 const from=findLinkableRun(runs,fromId),to=findLinkableRun(runs,toId);
 if(!from||!to||from.id===to.id||from.date>to.date)return null;
 if(from.date===to.date&&!(Date.parse(from.createdAt)<Date.parse(to.createdAt)))return null;
 if(compareSavedRuns(to,from).status!=='ready')return null;
 return {from,to};
};
export function candidateQuestions(notes,runs,fromId,toId){
 if(!Array.isArray(notes)||!pair(runs,fromId,toId))return [];
 return notes.filter(n=>n&&n.recordId===fromId&&typeof n.id==='string'&&n.id.length>0&&
  typeof n.text==='string'&&n.text.trim()&&n.text.length<=500&&
  typeof n.category==='string'&&n.category.length>0);
}
export function saveRunQuestionContinuation(storage,runs,{fromRunId,toRunId,sourceNoteId,text}={}){
 if(!pair(runs,fromRunId,toRunId))return fail('保存された2走行の順序・活動種別が適格でないため、問いを引き継ぎません');
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')return fail('メモの保存領域を使用できません');
 if(typeof text!=='string'||!text.trim()||text.trim().length>500)return fail('今回の気づきを1〜500文字で入力してください');
 if(typeof sourceNoteId!=='string'||!sourceNoteId)return fail('引き継ぐ元の問いを選んでください');
 const ui=makeUi(storage);
 if(!ui.canSave)return fail(ui.notice||'保存済みメモを読み取れません');
 const source=candidateQuestions(ui.notes,runs,fromRunId,toRunId).find(n=>n.id===sourceNoteId);
 if(!source)return fail('元の問いを確認できません。別の記録に関連づけません');
 if(ui.notes.some(n=>n.recordId===toRunId&&n.continuedFromNoteId===source.id))
  return fail('この問いは今回の走行ですでに振り返っています');
 if(ui.notes.length>=50)return fail('保存上限です。既存メモを自動削除しません');
 const createdAt=new Date().toISOString();
 const entry={id:createdAt+'-'+Math.random().toString(36).slice(2,12),
  category:source.category,...(source.topicId?{topicId:source.topicId}:{}),
  recordId:toRunId,continuedFromNoteId:source.id,text:text.trim(),createdAt};
 const oldRaw=ui.notes.length?JSON.stringify(ui.notes):null;
 const expected=JSON.stringify([entry,...ui.notes]);
 try{
  if(storage.getItem(EXPLORATION_NOTE_KEY)!==oldRaw)return fail('別の画面でメモが変更されました。再読込してください');
  storage.setItem(EXPLORATION_NOTE_KEY,expected);
  if(storage.getItem(EXPLORATION_NOTE_KEY)!==expected)return fail('保存後の照合に失敗しました。再読込して確認してください');
  return {ok:true,note:entry,fromRunId,toRunId};
 }catch{return fail('保存できませんでした。元のメモは変更しません');}
}
