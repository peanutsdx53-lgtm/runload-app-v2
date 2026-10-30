/** Stage 9: IndexedDB is the only authoritative source of manual-run V2 records.
 * No implicit import/migration from pre-release localStorage or research versions.
 * localStorage-backed UI reads are replaced with an in-memory read-only snapshot.
 * Every save performs a validated read-modify-write inside one IDB transaction.
 */
import {MANUAL_RUN_KEY,readManualRuns} from './manualRunStore.js';
export const MANUAL_DB='runload-v2-manual-authoritative-v1',MANUAL_STORE='envelopes',MANUAL_ENTRY='current';
const error='手入力記録の正本を安全に読み取れません。元のデータを変更しません';
let opening=null,raw=null,ready=false,notice=error;
const requested=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('IDB request'))});
const settled=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('IDB failed'));tx.onabort=()=>reject(tx.error||Error('IDB aborted'))});
function open(){
 if(typeof globalThis.indexedDB?.open!=='function')return Promise.reject(Error('IndexedDB unavailable'));
 if(opening)return opening;
 const p=new Promise((resolve,reject)=>{
  let done=false,request;const timer=setTimeout(()=>fail(Error('IndexedDB timeout')),8000);
  function fail(e){if(done)return;done=true;clearTimeout(timer);reject(e)}
  try{request=indexedDB.open(MANUAL_DB,1)}catch(e){fail(e);return}
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(MANUAL_STORE))request.result.createObjectStore(MANUAL_STORE)};
  request.onerror=()=>fail(request.error||Error('IDB open'));
  request.onblocked=()=>fail(Error('IDB blocked'));
  request.onsuccess=()=>{const db=request.result;if(done){db.close();return}done=true;clearTimeout(timer);
   db.onversionchange=()=>{db.close();opening=null;ready=false;notice='正本の形式が変更されました。再読込してください'};
   resolve(db)};
 });
 const guarded=p.catch(e=>{if(opening===guarded)opening=null;throw e});opening=guarded;return guarded;
}
const single=v=>({getItem:k=>k===MANUAL_RUN_KEY?v:null,setItem(){},removeItem(){}});
const valid=v=>v===null||(typeof v==='string'&&readManualRuns(single(v)).ok);
const failure=reason=>({ok:false,reason:reason||error});
/* Best-effort stronger durability hint. Browsers may ignore it or fall back to
 * default; even strict does not warrant survival of every OS or device failure.
 */
const writeTransaction=db=>{
 try{return db.transaction(MANUAL_STORE,'readwrite',{durability:'strict'})}
 catch{return db.transaction(MANUAL_STORE,'readwrite')}
};
const usable=base=>base&&typeof base.getItem==='function'&&typeof base.setItem==='function'&&typeof base.removeItem==='function';
const unsupported='端末の保存領域を利用できません。他の保存情報も含めて確認できないため処理を停止しました';
export const viewStorage=base=>({
 getItem(key){if(key!==MANUAL_RUN_KEY){if(!usable(base))throw Error(unsupported);return base.getItem(key)}if(!ready)throw Error(notice);return raw},
 setItem(key,value){if(key===MANUAL_RUN_KEY)throw Error('IndexedDB正本は書込APIのみ');return base.setItem(key,value)},
 removeItem(key){if(key===MANUAL_RUN_KEY)throw Error('IndexedDB正本は書込APIのみ');return base.removeItem(key)}
});
export async function readCanonical(){
 try{const db=await open(),tx=db.transaction(MANUAL_STORE,'readonly'),done=settled(tx);
  const r=await requested(tx.objectStore(MANUAL_STORE).get(MANUAL_ENTRY));await done;
  const value=r===undefined?null:r;if(!valid(value))throw Error('corrupt canonical record');
  return {ok:true,raw:value,read:readManualRuns(single(value))};
 }catch{return failure(error)}
}
export async function refresh(){const r=await readCanonical();if(r.ok){raw=r.raw;ready=true;notice=''}else{ready=false;notice=r.reason}return r}
export const initialize=refresh;
/** One synchronous legacy-domain mutation per IDB readwrite transaction.
 * No awaits between validation and put except IDB request callbacks.
 */
export async function mutate(operation){
 if(typeof operation!=='function')return failure('保存操作を確認できません');
 if(!ready)return failure(notice);
 try{const db=await open(),tx=writeTransaction(db),done=settled(tx),store=tx.objectStore(MANUAL_STORE);
  const saved=await requested(store.get(MANUAL_ENTRY)),old=saved===undefined?null:saved;
  if(!valid(old)){tx.abort();await done.catch(()=>{});return failure(error)}
  let next=old;
  const adapter={getItem:k=>k===MANUAL_RUN_KEY?next:null,
   setItem(k,v){if(k!==MANUAL_RUN_KEY)throw Error('key not allowed');next=String(v)},
   removeItem(k){if(k!==MANUAL_RUN_KEY)throw Error('key not allowed');next=null}};
  let result;
  try{result=operation(adapter)}catch{tx.abort();await done.catch(()=>{});return failure('保存操作に失敗しました')}
  if(result?.then||!result?.ok||!valid(next)){
   tx.abort();await done.catch(()=>{});
   return result?.then?failure('原子的な保存処理に非同期操作は指定できません'):
    result?.ok?failure('正本に保存できない形式です'):result||failure(error);
  }
  if(next!==old){if(next===null)store.delete(MANUAL_ENTRY);else store.put(next,MANUAL_ENTRY)}
  await done;raw=next;ready=true;notice='';return result;
 }catch{return failure('IndexedDBへの保存を確認できません。既存記録を確認してください')}
}
/** For export, IDB snapshot is refreshed then rechecked after other stores. */
export async function snapshotTask(base,operation){
 if(!usable(base))return failure(unsupported);
 const first=await refresh();if(!first.ok)return first;
 let result;try{result=await operation(viewStorage(base))}catch{return failure('バックアップを実行できません')}
 const final=await readCanonical();
 if(!final.ok||first.raw!==final.raw)return failure('バックアップ中に正本が変更されました。中止して再試行してください');
 return result;
}
/** Restore/remove: stage manual key in memory, never in localStorage. Commit it
 * once the existing multi-store routine ends, unless it rolled back fully.
 * GPS may remain partially committed if its IndexedDB operation failed.
 */
export async function portableMutation(base,operation){
 if(!usable(base))return failure(unsupported);
 const previous=await refresh();if(!previous.ok)return previous;
 const initial=previous.raw;let staged=initial;
 const proxy={
  getItem:k=>k===MANUAL_RUN_KEY?staged:base?.getItem(k)??null,
  setItem(k,v){if(k===MANUAL_RUN_KEY){staged=String(v);return}return base.setItem(k,v)},
  removeItem(k){if(k===MANUAL_RUN_KEY){staged=null;return}return base.removeItem(k)}
 };
 let result;try{result=await operation(proxy)}catch{return {ok:false,partial:true,reason:'復元・削除の途中で例外が発生しました。複数の保存先を照合してください'}}
 if(staged===initial){
  const verified=await refresh();
  if(!verified.ok||verified.raw!==initial)return {ok:false,partial:true,reason:'処理中に正本が変更された可能性があります。再読込して照合してください'};
  return result;
 }
 if(!result?.ok&&!result?.partial)return result;
 if(!valid(staged))return {ok:false,partial:true,reason:'保存正本の形式を確認できません'};
 try{const db=await open(),tx=writeTransaction(db),done=settled(tx),store=tx.objectStore(MANUAL_STORE);
  const current=await requested(store.get(MANUAL_ENTRY));
  if((current===undefined?null:current)!==initial){tx.abort();await done.catch(()=>{});return {ok:false,partial:true,reason:'復元中に別の正本更新がありました。各記録とバックアップを照合してください'}}
  if(staged===null)store.delete(MANUAL_ENTRY);else store.put(staged,MANUAL_ENTRY);
  await done;raw=staged;ready=true;notice='';return result;
 }catch{return {ok:false,partial:true,reason:'正本への復元・削除が完了していません。他の保存先を確認してください'}}
}
