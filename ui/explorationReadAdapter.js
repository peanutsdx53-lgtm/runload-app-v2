/**
 * RunLoad exploratory READ CONTRACT candidate V8, intentionally decoupled from app stores.
 * No writes, no sample fallback, no scientific estimate, no synthetic join across calendars.
 * Inputs must be supplied by the calling authority after provenance checks.
 */
const filled=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
const pct=v=>filled(v)&&/^\d+(?:\.\d+)?$/.test(String(v).trim())&&Number(v)>=0&&Number(v)<=100?Number(v):null;
const validISO=v=>{
 if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
 const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;
};
const res=(status,details={})=>Object.freeze({status,...details});
export function readCourseDraft(draft){
 if(!draft||typeof draft!=="object")return res('absent',{reason:'コース入力なし'});
 if(draft.gradeMode==='FLAT')return res('complete',{source:'unsaved-draft',mode:'flat',shares:{up:0,down:0,flat:100},reason:'入力で「ほぼ平坦」を選択。厳密な平坦度測定ではありません'});
 if(draft.gradeMode==='SUMMARY'){
  const up=pct(draft.upPercent),down=pct(draft.downPercent);
  if(up===null||down===null)return res('incomplete',{reason:'割合に未入力または範囲外の項目があります'});
  if(up+down>100)return res('invalid',{reason:'上り・下りの割合の合計が100％を超えています'});
  const flat=Math.round((100-up-down)*100)/100;
  return res('complete',{source:'unsaved-draft',mode:'summary',shares:{up,down,flat},reason:'同じ全コースの割合として入力された上り・下り。残りは入力仕様上の平坦として整理'});
 }
 if(draft.gradeMode==='SECTIONS'){
  const sections=[];
  for(let i=0;i<5;i++){
   const text=draft['sectionShare'+i];if(!filled(text))continue;
   const share=pct(text),direction=draft['sectionDirection'+i];
   if(share===null||!['UPHILL','DOWNHILL','FLAT'].includes(direction))return res('invalid',{reason:'区間の割合・方向が不正です'});
   sections.push({share,direction});
  }
  if(!sections.length)return res('incomplete',{reason:'区間が未入力です'});
  const sum=sections.reduce((n,x)=>n+x.share,0);
  if(Math.abs(sum-100)>0.001)return res('incomplete',{reason:'区間の合計が100％ではありません'});
  const sumOf=direction=>Math.round(sections.reduce((n,x)=>n+(x.direction===direction?x.share:0),0)*100)/100;
  return res('complete',{source:'unsaved-draft',mode:'sections',shares:{up:sumOf('UPHILL'),down:sumOf('DOWNHILL'),flat:sumOf('FLAT')},reason:'入力された最大5区間の比率を集計。GPS標高断面ではありません'});
 }
 return res('absent',{reason:'坂道について確定できる入力がありません'});
}
export function readLifeEntries(conditionResult){
 if(!conditionResult||conditionResult.canSave!==true||!Array.isArray(conditionResult.entries))return res('unavailable',{reason:conditionResult?.reason||'正式な生活記録を安全に読み取れません'});
 const records=[];const seen=new Set();
 for(const entry of conditionResult.entries){
  if(!entry||!validISO(entry.date)||seen.has(entry.date)||!Number.isInteger(entry.sleepMinutes)||entry.sleepMinutes<0||entry.sleepMinutes>1440)return res('invalid',{reason:'日付または睡眠データに矛盾があります'});
  seen.add(entry.date);
  const source=entry.sleepSource==='clock'?'time-in-bed':entry.sleepSource==='duration'?'self-reported':'legacy-unknown';
  const m=source==='legacy-unknown'&&entry.sleepMinutes===0?null:entry.sleepMinutes;
  if(source!=='legacy-unknown'&&(m===null||m<=0||m>=1440))return res('invalid',{reason:'睡眠・就床時間が不正です'});
  records.push(Object.freeze({date:entry.date,minutes:m,source,feeling:typeof entry.feeling==='string'?entry.feeling:'',runStatus:'not-connected'}));
 }
 return res('complete',{source:'saved-life-records',records:records.sort((a,b)=>a.date.localeCompare(b.date)),reason:'端末内に保存した生活記録のみ。走行との連結は未実装'});
}
export function compareLifeDays(data,a,b){
 if(data?.status!=='complete')return res('unavailable',{reason:'比較できる生活記録がありません'});
 const first=data.records.find(x=>x.date===a),second=data.records.find(x=>x.date===b);
 if(!first||!second)return res('incomplete',{reason:'両方の日付の記録がありません'});
 if(first.source!==second.source)return res('incompatible',{reason:'申告した睡眠時間と就寝〜起床の経過時間は同じ測定量として比較しません'});
 if(first.source==='legacy-unknown'||first.minutes===null||second.minutes===null)return res('incompatible',{reason:'測定方法または値が確認できないため比較しません'});
 return res('complete',{minutesDelta:second.minutes-first.minutes,source:first.source,reason:'同一方法で記録された時間の記述的な差。原因を示しません'});
}
export function describeBodyReference(result,regionId){
 if(!/^R(?:0[1-9]|1[0-2])$/.test(String(regionId)))return res('invalid',{reason:'承認済みの12部位IDではありません'});
 if(!result||result.status!=='eligible'||result.regionId!==regionId||!['A1','A2','B'].includes(result.path)||!filled(result.sourceId)||!filled(result.metric)||!filled(result.unit)||!Number.isFinite(result.value)||!Number.isFinite(result.speedKmh)||!filled(result.version))return res('unavailable',{reason:'適格な正式結果・原典・計算版が揃っていないため数値を表示しません'});
 // The adapter never computes the result. It only describes the authorized upstream result.
 return res('complete',{source:'published-model-reference',regionId,value:result.value,unit:result.unit,speedKmh:result.speedKmh,sourceId:result.sourceId,path:result.path,version:result.version,metric:result.metric,reason:'原典からの参考応答であり本人の身体の実測値ではありません'});
}
/**
 * A read-only handoff for a future same-origin integration.
 * Do not infer saved run history from editor draft. Do not infer running from life entries.
 * A theme is related only when an eligible source item exists. All labels here are descriptive,
 * not diagnoses, health-risk rankings, or causes.
 */
export function createExplorationContext({draft=null,conditions=null}={}){
 const course=readCourseDraft(draft),life=readLifeEntries(conditions);
 const highlights=[];
 if(course.status==='complete'&&(course.shares.up>0||course.shares.down>0))
  highlights.push(Object.freeze({themeId:'上り坂・下り坂',source:'unsaved-draft',why:'入力途中の坂道情報があるため'}));
 if(life.status==='complete'&&life.records.some(v=>v.minutes!==null))
  highlights.push(Object.freeze({themeId:'睡眠',source:'saved-life-records',why:'保存済みの生活記録に睡眠の入力があるため'}));
 const result={course,life,highlights:Object.freeze(highlights)};
 return Object.freeze(result);
}
