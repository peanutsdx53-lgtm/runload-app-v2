/** Separate, explicitly user-reported rest days. Never fabricate running metrics.
 * This is not the manual-running IndexedDB canonical collection or GPS data.
 */
export const REST_DAY_KEY='runload-v2-rest-days-v1';
const LIMIT=500;
const isoDate=x=>{
 if(typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
 const [y,m,d]=x.split('-').map(Number),v=new Date(Date.UTC(y,m-1,d));
 return v.getUTCFullYear()===y&&v.getUTCMonth()===m-1&&v.getUTCDate()===d;
};
const text=(x,max)=>typeof x==='string'&&x.length<=max;
const entryOk=x=>x&&typeof x==='object'&&!Array.isArray(x)&&
 Object.keys(x).sort().join(',')==='bodyObservation,createdAt,date,environmentNote,id,memo,shoeName,source,type'&&
 x.id==='rest-v1-'+x.date&&isoDate(x.date)&&x.type==='rest'&&x.source==='manual'&&
 typeof x.createdAt==='string'&&Number.isFinite(Date.parse(x.createdAt))&&
 text(x.memo,500)&&text(x.bodyObservation,500)&&text(x.environmentNote,500)&&text(x.shoeName,100);
export function readRestDays(storage){
 try{
  if(!storage||typeof storage.getItem!=='function')throw Error('storage');
  const raw=storage.getItem(REST_DAY_KEY);
  if(raw===null)return {ok:true,records:[],raw:null};
  const parsed=JSON.parse(raw);
  if(!parsed||parsed.revision!==1||Object.keys(parsed).sort().join(',')!=='records,revision'||
   !Array.isArray(parsed.records)||parsed.records.length>LIMIT||
   !parsed.records.every(entryOk))throw Error('invalid');
  const dates=new Set(parsed.records.map(r=>r.date));
  if(dates.size!==parsed.records.length)throw Error('duplicate');
  return {ok:true,records:parsed.records,raw};
 }catch{return {ok:false,reason:'休養日の保存情報を安全に読み取れません。元のデータを変更しません',records:[]}}
}
export function saveRestDay(storage,draft,at=new Date().toISOString()){
 if(!isoDate(draft?.date))return {ok:false,reason:'休養日の日付を確認してください'};
 if(!Number.isFinite(Date.parse(at)))return {ok:false,reason:'保存時刻が不正です'};
 const fields={memo:draft.memo??'',bodyObservation:draft.bodyObservation??'',
  environmentNote:draft.environmentNote??'',shoeName:draft.shoeName??''};
 if(!text(fields.memo,500)||!text(fields.bodyObservation,500)||
  !text(fields.environmentNote,500)||!text(fields.shoeName,100))
  return {ok:false,reason:'休養日のメモは500文字以内、使用品は100文字以内にしてください'};
 const before=readRestDays(storage);if(!before.ok)return before;
 if(before.records.length>=LIMIT)return {ok:false,reason:'保存件数の上限に達しました。過去の休養日を自動削除しません'};
 if(before.records.some(e=>e.date===draft.date))
  return {ok:false,reason:'この日付の休養日は既に保存済みです。記録の上書きは行いません'};
 const record={id:'rest-v1-'+draft.date,type:'rest',source:'manual',date:draft.date,createdAt:at,...fields};
 const raw=JSON.stringify({revision:1,records:[...before.records,record].sort((a,b)=>a.date.localeCompare(b.date))});
 try{
  if(storage.getItem(REST_DAY_KEY)!==before.raw)return {ok:false,reason:'別の画面で休養記録が変更されています。再読込してください'};
  storage.setItem(REST_DAY_KEY,raw);
  if(storage.getItem(REST_DAY_KEY)!==raw)return {ok:false,reason:'休養日の保存を確認できませんでした'};
  return {ok:true,record};
 }catch{return {ok:false,reason:'休養日を保存できませんでした。元の情報を確認してください'}}
}
