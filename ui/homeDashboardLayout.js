// RunLoad v2 — Home dashboard visual preferences, stage 1.
// This module never reads/writes the authoritative app's original preference keys,
// scientific values, personal records, or GPS information.
export const HOME_DASHBOARD_KEY="runload-v2-home-dashboard-layout-v1";
export const HOME_DASHBOARD_WIDGETS=Object.freeze([
  {id:"latest",title:"最新の走行",defaultSize:"full"},
  {id:"condition",title:"コンディション",defaultSize:"half"},
  {id:"topics",title:"実績",defaultSize:"half"},
  {id:"shortcuts",title:"クイックアクセス",defaultSize:"full"},
  {id:"trend",title:"記録の移り変わり",defaultSize:"half"},
  {id:"discovery",title:"探究の続き",defaultSize:"half"}
]);
const IDS=HOME_DASHBOARD_WIDGETS.map(w=>w.id);
const IS_ID=new Set(IDS);
export function defaultHomeDashboardLayout(){
 return {version:1,order:[...IDS],visible:["latest","condition","topics","shortcuts"],sizes:Object.fromEntries(HOME_DASHBOARD_WIDGETS.map(w=>[w.id,w.defaultSize]))};
}
export function isValidHomeDashboardLayout(v){
 if(!v||typeof v!=="object"||Array.isArray(v)||v.version!==1)return false;
 if(!Array.isArray(v.order)||v.order.length!==IDS.length||new Set(v.order).size!==IDS.length||v.order.some(id=>!IS_ID.has(id)))return false;
 if(!Array.isArray(v.visible)||v.visible.length<1||new Set(v.visible).size!==v.visible.length||v.visible.some(id=>!IS_ID.has(id)))return false;
 if(!v.sizes||typeof v.sizes!=="object"||Array.isArray(v.sizes))return false;
 if(Object.keys(v.sizes).length!==IDS.length||IDS.some(id=>!["half","full"].includes(v.sizes[id])))return false;
 return true;
}
export const copyHomeDashboardLayout=v=>({version:1,order:[...v.order],visible:[...v.visible],sizes:{...v.sizes}});
export function loadHomeDashboardLayout(storage){
 const fallback=defaultHomeDashboardLayout();
 try{
  if(!storage||typeof storage.getItem!=="function"||typeof storage.setItem!=="function")return {layout:fallback,canSave:false,reason:"保存領域にアクセスできません"};
  const raw=storage.getItem(HOME_DASHBOARD_KEY);
  if(raw===null)return {layout:fallback,canSave:true,reason:""};
  const parsed=JSON.parse(raw);
  if(!isValidHomeDashboardLayout(parsed))return {layout:fallback,canSave:false,reason:"以前の表示設定を読み取れません。設定データを保護するため上書きしません"};
  return {layout:copyHomeDashboardLayout(parsed),canSave:true,reason:""};
 }catch{
  return {layout:fallback,canSave:false,reason:"表示設定を読み取れません。元のデータを保護しています"};
 }
}
export function saveHomeDashboardLayout(storage,layout){
 if(!isValidHomeDashboardLayout(layout))return {ok:false,reason:"編集内容の形式が正しくありません"};
 try{
  if(!storage||typeof storage.getItem!=="function"||typeof storage.setItem!=="function")return {ok:false,reason:"保存領域を利用できません"};
  const original=storage.getItem(HOME_DASHBOARD_KEY);
  if(original!==null&&!isValidHomeDashboardLayout(JSON.parse(original)))return {ok:false,reason:"以前の表示設定が破損しています。上書きしません"};
  const next=JSON.stringify(copyHomeDashboardLayout(layout));
  if(storage.getItem(HOME_DASHBOARD_KEY)!==original)return {ok:false,reason:"別の画面で設定が更新されました。再度確認してください"};
  storage.setItem(HOME_DASHBOARD_KEY,next);
  if(storage.getItem(HOME_DASHBOARD_KEY)!==next)return {ok:false,reason:"保存を確認できませんでした"};
  return {ok:true,reason:""};
 }catch{return {ok:false,reason:"保存できませんでした。元の設定は変更しません"}}
}
export function editHomeDashboardLayout(layout,command,id){
 if(!isValidHomeDashboardLayout(layout)||!IS_ID.has(id))return layout;
 const copy=copyHomeDashboardLayout(layout);
 if(command==="up"||command==="down"){
  const index=copy.order.indexOf(id),offset=command==="up"?-1:1,to=index+offset;
  if(to>=0&&to<copy.order.length)[copy.order[index],copy.order[to]]=[copy.order[to],copy.order[index]];
 }else if(command==="toggle"){
  if(copy.visible.includes(id)){if(copy.visible.length>1)copy.visible=copy.visible.filter(x=>x!==id)}
  else copy.visible.push(id);
 }else if(command==="size"){copy.sizes[id]=copy.sizes[id]==="half"?"full":"half"}
 return copy;
}

/** Insert a widget before/after another. No storage writes happen during dragging. */
export function moveHomeDashboardWidget(layout,sourceId,targetId,after=false){
 if(!isValidHomeDashboardLayout(layout)||!IS_ID.has(sourceId)||!IS_ID.has(targetId)||sourceId===targetId)return layout;
 const next=copyHomeDashboardLayout(layout);
 next.order=next.order.filter(id=>id!==sourceId);
 const index=next.order.indexOf(targetId);
 next.order.splice(index+(after?1:0),0,sourceId);
 return next;
}
