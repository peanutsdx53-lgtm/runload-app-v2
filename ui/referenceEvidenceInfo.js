/* Research provenance for the result UI only. Does not calculate or alter reference values.
 * Every field is selected from the actual activity's approved evidence route. */
import {RUNNING_REGION_BY_ID} from '../core/runningEvidence/runningEvidenceRegistry.js';
import {bodyReferenceEngineId} from './bodyReferencePresentation.js';

const RUNNING_CITATIONS=Object.freeze({
 'Fukuchi_2017_PeerJ_e3298.pdf':Object.freeze({label:'Fukuchi ほか（2017）',url:'https://doi.org/10.7717/peerj.3298'}),
 'Gazendam_Hof_2007_GaitPosture_EMG_Speed.pdf':Object.freeze({label:'Gazendam・Hof（2007）',url:'https://doi.org/10.1016/j.gaitpost.2006.06.013'}),
 'per_step_cumulative_load_running_injury_locations_speed_gradient_cadence.pdf':Object.freeze({label:'Van Hooren ほか（2024）',url:'https://doi.org/10.1111/sms.14570'}),
 'Li_2020_Load_Transference_Running_Speed_Plantar_Pressure.pdf':Object.freeze({label:'Li ほか（2020）',url:null})
});
const kmh=mps=>typeof mps==='number'&&Number.isFinite(mps)?String(Number((mps*3.6).toFixed(3))):null;
const incomplete=message=>Object.freeze({kind:'unavailable',message});
export function describeRegionEvidence({row,bodyId,activity,source='saved-manual'}={}){
 if(source!=='saved-manual')return incomplete('GPSなど、別の計算経路の出典詳細はこの説明では表示しません。記録や参考値の表示は引き続き利用できます。');
 if(!row||row.regionId!==bodyId)return incomplete('選択した部位の科学的な出典情報を確認できません。');
 if(activity==='RUNNING'){
  const id=bodyReferenceEngineId(bodyId),series=RUNNING_REGION_BY_ID[id];
  if(!series)return incomplete('この部位に対応する採用原著がありません。');
  if(row.evidence?.metricId&&row.evidence.metricId!==series.metricId)return incomplete('保存された計算結果と現行の原著定義が異なるため、出典の表示を保留します。');
  if(row.evidence?.sourceSha256&&row.evidence.sourceSha256!==series.sourceSha256)return incomplete('保存された結果の原著と現行の原著が一致しないため、出典の表示を保留します。');
  const citation=RUNNING_CITATIONS[series.sourceFile]||{label:'採用原著（研究台帳参照）',url:null};
  const lo=kmh(series.approvedSpeedMps[0]),hi=kmh(series.approvedSpeedMps[1]),ref=kmh(series.reference.speedMps);
  return Object.freeze({kind:'running',metric:series.metricDescription,unit:series.unit,
   citation:citation.label,url:citation.url,sourceLocation:series.sourceLocation,
   domain:lo+'～'+hi+' km/h',reference:'基準速度 '+ref+' km/h を100とする部位内の比',
   status:row.calculationState==='CALCULATED'?'算出対象':'この記録の条件では未算出',
   note:'原著の観測またはモデル由来の文献参考値です。本人の身体負荷・傷害危険度の実測値ではなく、異なる部位の数値の大小比較はできません。路面・勾配などを個別補正していません。'});
 }
 if(activity==='JOGGING'||activity==='WALK'){
  const evidence=row.evidence;
  if(!evidence||typeof evidence.sourceId!=='string'||typeof evidence.constructId!=='string')
   return incomplete('この活動種別のモデルについて、部位別の出典情報を確認できません。');
  const lo=kmh(evidence.sourceDomain?.minMps),hi=kmh(evidence.sourceDomain?.maxMps),ref=kmh(evidence.referenceSpeedMps);
  return Object.freeze({kind:'walk-jog',metric:'活動種別ごとに採用した研究上の指標（識別子：'+evidence.constructId+'）',
   unit:'部位内の基準100に対する比',citation:'モデル内の原著ID：'+evidence.sourceId,url:null,
   sourceLocation:'活動別モデル '+activity,domain:lo&&hi?lo+'～'+hi+' km/h':'採用条件の詳細は研究台帳参照',
   reference:ref?'基準速度 '+ref+' km/h を100とする活動別の指標':'活動別の参照速度は研究台帳参照',
   status:row.calculationState==='CALCULATED'?'算出対象':'この記録の条件では未算出',
   note:'ランニングの12部位と同じ原著・同じ測定量であるとは限りません。本人の身体測定値や安全性の判定には使用できません。'});
 }
 return incomplete('活動種別が未設定または対象外のため、部位別の原著情報を特定できません。');
}
