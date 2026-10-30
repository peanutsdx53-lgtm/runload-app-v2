/** Read-only inspection of archived scientific model snapshots from the pre-v2 research app.
 * Inspects metadata only. No storage object, save method, conversion or scientific interpretation.
 * Data is never migrated or silently recomputed under a newer model.
 */
const FORMAT='runner-load-app-new-backup-v2';
const RESULTS_KEY='runner-load-app-new-v1-model-results-regional-v2';
const KNOWN=new Set(['runload-primary-regional-reference100-v3.0','runload-primary-regional-reference100-v3.1']);
const fail=reason=>({ok:false,reason,conversionAllowed:false});
export function inspectHistoricModelBackup(text){
 if(typeof text!=='string'||text.length>80_000_000)return fail('旧研究資料の内容を安全に読み取れません');
 try{
  const outer=JSON.parse(text),snap=outer?.snapshot?.formatVersion?outer.snapshot:outer;
  if(snap?.formatVersion!==FORMAT||!snap.data||typeof snap.data!=='object'||Array.isArray(snap.data))
   return fail('旧研究バックアップの形式を確認できません');
  const rows=snap.data[RESULTS_KEY];
  if(!Array.isArray(rows)||rows.length>2000)return fail('旧科学結果の配列を確認できません');
  const ids=new Set(),versions=new Set();
  for(const row of rows){
   if(!row||typeof row!=='object'||typeof row.id!=='string'||!row.id||
     typeof row.model_version!=='string'||!KNOWN.has(row.model_version)||
     typeof row.output_semantic_version!=='string'||!row.output_semantic_version||
     ids.has(row.id))return fail('不明・重複・不正な旧モデル結果があるため自動利用を保留します');
   ids.add(row.id);versions.add(row.model_version);
  }
  return {ok:true,readOnly:true,conversionAllowed:false,recordCount:rows.length,
   modelVersions:[...versions].sort(),assessmentTimes:'NOT_VERIFIED',reason:'旧数値と評価時刻を新モデルに推測変換しません'};
 }catch{return fail('JSONを解析できません。元ファイルは変更しません');}
}
