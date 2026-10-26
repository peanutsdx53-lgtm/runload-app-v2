/** Opt-in reflections; never writes to source condition records or the intent store. */
import {readLifeEntries} from './explorationReadAdapter.js';
export const CONDITION_INSIGHTS_KEY='runload-v2-condition-insights-v1';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const validRecord=r=>r&&typeof r==='object'&&typeof r.id==='string'&&/^[a-z0-9-]{8,90}$/i.test(r.id)&&validDate(r.date)&&typeof r.createdAt==='string'&&!Number.isNaN(Date.parse(r.createdAt))&&typeof r.text==='string'&&r.text.trim().length>0&&r.text.length<=160&&['self-reported','time-in-bed'].includes(r.source)&&Number.isInteger(r.minutes)&&r.minutes>=0&&r.minutes<=1440&&typeof r.feeling==='string'&&r.feeling.length<=40;
export function loadConditionInsights(storage){
 if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')return {ok:false,reason:'保存領域を利用できません',entries:[],revision:0};
 try{
  const raw=storage.getItem(CONDITION_INSIGHTS_KEY);
  if(raw===null)return {ok:true,entries:[],revision:0};
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.entries)||data.entries.length>80||!data.entries.every(validRecord)||new Set(data.entries.map(e=>e.id)).size!==data.entries.length)throw Error('invalid');
  return {ok:true,entries:data.entries,revision:data.revision};
 }catch{return {ok:false,reason:'気づきの保存データを読み取れません。元のデータは変更しません',entries:[],revision:0};}
}
function write(storage,old,entries){
 try{
  const before=storage.getItem(CONDITION_INSIGHTS_KEY);
  const actual=loadConditionInsights(storage);
  if(!actual.ok||actual.revision!==old.revision)return {ok:false,reason:'ほかの画面で記録が変更されています'};
  if(storage.getItem(CONDITION_INSIGHTS_KEY)!==before)return {ok:false,reason:'ほかの画面で記録が変更されています'};
  const next=JSON.stringify({version:1,revision:old.revision+1,entries});
  storage.setItem(CONDITION_INSIGHTS_KEY,next);
  if(storage.getItem(CONDITION_INSIGHTS_KEY)!==next)return {ok:false,reason:'気づきの保存を確認できませんでした'};
  return {ok:true,entries};
 }catch{return {ok:false,reason:'気づきを保存できませんでした。元の記録は変更していません'};}
}
export function addConditionInsight(storage,conditions,date,text,now=new Date().toISOString()){
 const prior=loadConditionInsights(storage);
 if(!prior.ok)return prior;
 const value=typeof text==='string'?text.trim():'';
 if(!value||value.length>160)return {ok:false,reason:'気づきを1〜160文字で入力してください'};
 if(!validDate(date)||Number.isNaN(Date.parse(now)))return {ok:false,reason:'記録日が正しくありません'};
 const life=readLifeEntries(conditions);
 if(life.status!=='complete')return {ok:false,reason:'元の生活記録を読み取れません'};
 const entry=life.records.find(x=>x.date===date&&x.minutes!==null&&['self-reported','time-in-bed'].includes(x.source));
 if(!entry)return {ok:false,reason:'この日付には有効な生活記録がありません'};
 if(prior.entries.length>=80)return {ok:false,reason:'気づきの保存上限に達しました。既存の記録を確認してください'};
 const id='insight-'+now.replace(/[^0-9]/g,'').slice(0,17)+'-'+Math.random().toString(36).slice(2,10);
 const item={id,date,createdAt:now,text:value,source:entry.source,minutes:entry.minutes,feeling:entry.feeling};
 return write(storage,prior,[...prior.entries,item]);
}
export function removeConditionInsight(storage,id){
 const old=loadConditionInsights(storage);
 if(!old.ok)return old;
 if(!old.entries.some(x=>x.id===id))return {ok:false,reason:'削除する気づきが見つかりません'};
 return write(storage,old,old.entries.filter(x=>x.id!==id));
}
export function insightRecordStatus(item,conditions){
 const life=readLifeEntries(conditions);
 if(life.status!=='complete')return 'unavailable';
 const record=life.records.find(x=>x.date===item.date);
 return !record?'missing':record.source!==item.source||record.minutes!==item.minutes||record.feeling!==item.feeling?'changed':'current';
}
