/* Browser origin storage estimates are not GPS-specific; never promise durability. */
const MiB=1048576;
const good=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function summarizeGpsOriginStorage(estimate,persisted=null){
 const u=estimate?.usage,q=estimate?.quota;
 const known=good(u)&&good(q)&&q>0,remaining=known?Math.max(0,q-u):null;
 return {ok:true,usageMiB:good(u)?+(u/MiB).toFixed(1):null,quotaMiB:good(q)&&q>0?+(q/MiB).toFixed(1):null,
  freeMiB:known?+(remaining/MiB).toFixed(1):null,percent:known?Math.round(100*Math.min(1,u/q)):null,
  warning:known&&(u/q>=.8||remaining<10*MiB),
  persistent:persisted===true?true:persisted===false?false:null};
}
export function sharedGithubPagesOrigin(url){
 try{const u=new URL(url);return /\\.github\\.io$/i.test(u.hostname)&&u.pathname.split('/').filter(Boolean).length>0;}
 catch{return false;}
}
export async function readGpsOriginStorage(storage=globalThis.navigator?.storage){
 if(typeof storage?.estimate!=='function')return {ok:false,reason:'このブラウザーは保存容量の照会に対応していません'};
 try{const estimate=await storage.estimate();let persisted=null;
  if(typeof storage.persisted==='function')try{persisted=await storage.persisted();}catch{}
  return summarizeGpsOriginStorage(estimate,persisted);
 }catch{return {ok:false,reason:'保存容量を確認できませんでした。記録は変更していません'};}
}
export async function requestGpsStoragePersistence(storage=globalThis.navigator?.storage){
 if(typeof storage?.persist!=='function')return {ok:false,reason:'このブラウザーは保存領域の永続化要求に対応していません'};
 try{const granted=(await storage.persist())===true;
  return {ok:true,granted,message:granted?'ブラウザーが保存領域の永続化を許可しました。手動削除や端末故障からは保護されません。':'ブラウザーは永続化を許可しませんでした。GPSバックアップを保管してください。'};
 }catch{return {ok:false,reason:'保存領域の永続化を要求できませんでした'};}
}
