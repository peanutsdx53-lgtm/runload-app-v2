/** RunLoad V14: pure, fail-closed descriptive interpretation. Never diagnoses. */
import {readLifeEntries, compareLifeDays} from './explorationReadAdapter.js';
export const INTERPRETATION_RULE_VERSION='14.1';
const LABEL=Object.freeze({'self-reported':'申告した睡眠時間','time-in-bed':'就寝から起床までの経過時間'});
const day=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const d=new Date(v+'T12:00:00Z');return Number.isFinite(d.valueOf())&&d.toISOString().slice(0,10)===v;};
export const minuteText=m=>Number.isInteger(m)&&m>=0?`${Math.floor(m/60)}時間${String(m%60).padStart(2,'0')}分`:'—';
const pack=(status,extras={})=>Object.freeze({ruleId:'sleep-descriptive-comparison',ruleVersion:INTERPRETATION_RULE_VERSION,status,...extras});
export function buildLifePacket(conditions,dateA,dateB){
 const life=readLifeEntries(conditions);
 if(life.status!=='complete')return pack('unavailable',{reason:life.reason||'生活記録を読み取れません',knowledge:KNOWLEDGE,uncertainty:'本人の記録を確認できないため比較しません。'});
 const records=life.records;
 if(!day(dateA)||!day(dateB)||dateA===dateB)return pack('insufficient',{reason:'異なる2日を選んでください',records,knowledge:KNOWLEDGE,uncertainty:'比較は成立していません。'});
 const a=records.find(x=>x.date===dateA),b=records.find(x=>x.date===dateB);
 if(!a||!b)return pack('insufficient',{reason:'選択した日付の記録がありません',records,knowledge:KNOWLEDGE,uncertainty:'存在しない記録を補いません。'});
 const check=compareLifeDays(life,dateA,dateB);
 if(check.status!=='complete')return pack(check.status,{reason:check.reason,records,entries:[a,b],knowledge:KNOWLEDGE,uncertainty:'測定方式が異なるなど、同じ指標として比較できません。'});
 const value=Math.abs(check.minutesDelta);
 return pack('ready',{
  records,entries:[a,b],method:a.source,methodLabel:LABEL[a.source],minutesDelta:check.minutesDelta,
  observation:`${dateA}と${dateB}で、${LABEL[a.source]}に${minuteText(value)}の差があります。`,
  feelings:[a.feeling||'未入力',b.feeling||'未入力'],
  evidenceRefs:[`saved-condition:${dateA}`,`saved-condition:${dateB}`],knowledge:KNOWLEDGE,
  uncertainty:'2日間の差から、調子の違いの原因やランニングへの影響は判断できません。'
 });
}
export const KNOWLEDGE=Object.freeze({topicId:'sleep-recovery',sourceId:'walsh2021-bjsm',citation:'Walsh ほか（2021）',url:'https://doi.org/10.1136/bjsports-2020-102025',summary:'睡眠は運動後の回復や日中の調子に関係します。ただし必要な睡眠には個人差があります。',applicability:'運動選手を対象とする研究を含む一般的知識です。個人の記録から原因を特定するものではありません。'});
/** Only the last explicitly saved condition can be the baseline; it cannot represent a saved run. */
export function latestEligibleLifeBaseline(conditions){
 const r=readLifeEntries(conditions);
 if(r.status!=='complete')return null;
 const eligible=r.records.filter(x=>x.minutes!==null&&['self-reported','time-in-bed'].includes(x.source));
 return eligible.at(-1)||null;
}
export function evaluateLifeIntent(intent,conditions){
 if(!intent||intent.task!=='compare-next-life-record'||!day(intent.baseline?.date)||!['self-reported','time-in-bed'].includes(intent.baseline?.method))return {status:'unavailable',reason:'基準記録が確認できません'};
 const r=readLifeEntries(conditions);
 if(r.status!=='complete')return {status:'unavailable',reason:r.reason||'生活記録を読み取れません'};
 const origin=r.records.find(x=>x.date===intent.baseline.date&&x.source===intent.baseline.method&&x.minutes!==null);
 if(!origin||origin.minutes!==intent.baseline.minutes)return {status:'unavailable',reason:'基準の生活記録が削除または変更されています'};
 const later=r.records.filter(x=>x.date>origin.date&&x.source===origin.source&&x.minutes!==null);
 if(!later.length)return {status:'waiting',reason:'次の同じ入力方法の生活記録を待っています'};
 const last=later.at(-1),p=buildLifePacket(conditions,origin.date,last.date);
 return p.status==='ready'?{status:'ready',reason:'後日の記録と比べられます',dateA:origin.date,dateB:last.date,packet:p}:{status:'waiting',reason:'比較条件を満たす記録がありません'};
}
