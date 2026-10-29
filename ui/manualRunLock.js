/** Cross-tab serialization for current RunLoad manual-run writes.
 * All participating v2 tabs must use this lock. No claim about older tabs,
 * external storage editors, quota failures or power-loss durability.
 */
export const MANUAL_RUN_WRITE_LOCK='runload-v2-manual-run-write-v1';
export async function withManualRunWriteLock(operation,{locks=globalThis.navigator?.locks}={}){
 if(typeof operation!=='function')return {ok:false,reason:'保存処理を確認できません'};
 if(!locks||typeof locks.request!=='function')
  return {ok:false,reason:'このブラウザでは複数画面間の安全な保存制御が利用できません。記録を失わないため保存を停止しました'};
 try{
  return await locks.request(MANUAL_RUN_WRITE_LOCK,{mode:'exclusive'},async lock=>{
   if(!lock)return {ok:false,reason:'保存領域の排他制御を確保できません'};
   return await operation();
  });
 }catch{return {ok:false,reason:'保存領域の排他制御または保存処理に失敗しました。記録を確認してください'};}
}
