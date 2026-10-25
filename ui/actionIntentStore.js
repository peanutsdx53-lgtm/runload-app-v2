/** Opt-in only. Distinct from legacy exploration notes and record/condition stores. */
export const ACTION_INTENT_KEY='runload-v2-action-intents-v1';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
export function validateIntent(x){return !!x&&typeof x==='object'&&!Array.isArray(x)&&x.version===1&&typeof x.id==='string'&&/^[a-zA-Z0-9-]{8,85}$/.test(x.id)&&x.task==='compare-next-life-record'&&x.consent===true&&validDate(x.baseline?.date)&&['self-reported','time-in-bed'].includes(x.baseline.method)&&Number.isInteger(x.baseline.minutes)&&x.baseline.minutes>0&&x.baseline.minutes<1440&&['active','reviewed','paused'].includes(x.status)&&typeof x.createdAt==='string'&&!Number.isNaN(Date.parse(x.createdAt))&&typeof x.userText==='string'&&x.userText.length<=140;}
export function loadIntent(storage){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')return {ok:false,reason:'保存領域を利用できません',intent:null};
 try{const raw=storage.getItem(ACTION_INTENT_KEY);if(raw===null)return {ok:true,intent:null};const intent=JSON.parse(raw);return validateIntent(intent)?{ok:true,intent}:{ok:false,intent:null,reason:'確認事項の保存データが不正です。元のデータを変更しません'};}catch{return {ok:false,intent:null,reason:'確認事項を安全に読み取れません。元のデータを変更しません'};}
}
export function updateIntent(storage,update){
 const old=loadIntent(storage);if(!old.ok)return {ok:false,reason:old.reason};
 if(update!==null&&!validateIntent(update))return {ok:false,reason:'確認事項が不正です'};
 try{
  const previous=storage.getItem(ACTION_INTENT_KEY);
  const next=update===null?null:JSON.stringify(update);
  if(storage.getItem(ACTION_INTENT_KEY)!==previous)return {ok:false,reason:'ほかの画面で内容が変更されています'};
  if(next===null)storage.removeItem(ACTION_INTENT_KEY);else storage.setItem(ACTION_INTENT_KEY,next);
  if(storage.getItem(ACTION_INTENT_KEY)!==next)return {ok:false,reason:'保存を確認できませんでした'};
  return {ok:true,intent:update};
 }catch{return {ok:false,reason:'書き込めませんでした。以前の保存内容は変更していません'};}
}
export function createLifeIntent(storage,baseline,now=new Date().toISOString()){
 if(!baseline||!validDate(baseline.date)||!['self-reported','time-in-bed'].includes(baseline.source))return {ok:false,reason:'比較の基準となる生活記録がありません'};
 const id=`life-${now.replace(/[^0-9]/g,'')}-${Math.random().toString(36).slice(2,10)}`;
 return updateIntent(storage,{id,version:1,task:'compare-next-life-record',consent:true,createdAt:now,baseline:{date:baseline.date,method:baseline.source,minutes:baseline.minutes},status:'active',userText:'次の生活記録と見比べる'});
}
