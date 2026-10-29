/** Same body region, same source and same scientific construct; never a risk comparison. */
export function compareBodyReferenceRows(current,previous,currentRef,previousRef,regionId){
 const bad=(status,reason)=>({status,reason});
 const valid=r=>r?.source==='manual'&&r?.type==='run'&&r?.schema===1&&
  typeof r.id==='string'&&/^run-v1-[0-9a-f-]{36}$/.test(r.id)&&
  Number.isFinite(r.distanceKm)&&r.distanceKm>0&&
  Number.isInteger(r.durationSeconds)&&r.durationSeconds>0;
 if(!valid(current)||!valid(previous)||!currentRef||!previousRef)
  return bad('unavailable','比較には保存済みの2件の走行と参考情報が必要です');
 if(current.id===previous.id)return bad('same-record','異なる2件の記録を選んでください');
 if(!/^R(0[1-9]|1[0-2])$/.test(regionId||''))return bad('invalid-region','正式な12部位を選んでください');
 const gait=current.draft?.activityGait;
 if(!['RUNNING','JOGGING','WALK'].includes(gait)||gait!==previous.draft?.activityGait||
    gait!==currentRef.activity||gait!==previousRef.activity)
  return bad('incompatible','活動種別が異なる記録の参考値は比較できません');
 const a=currentRef.rows?.find(x=>x.regionId===regionId);
 const b=previousRef.rows?.find(x=>x.regionId===regionId);
 const available=r=>r?.calculationState==='CALCULATED'&&typeof r.value==='number'&&Number.isFinite(r.value);
 if(!available(a)||!available(b))return bad('not-calculable','両方の記録でこの部位の参考値を算出できる必要があります');
 const signature=(snapshot,row)=>{
  const e=row.evidence;
  if(!e||e.regionId!==regionId||!snapshot.modelVersion||!snapshot.semanticVersion||!snapshot.source)return null;
  if(gait==='RUNNING'){
   if(e.activity!=='RUNNING_PRIMARY'||e.modelVersion!==snapshot.modelVersion||
      e.semanticVersion!==snapshot.semanticVersion||
      ![e.metricId,e.seriesId,e.referenceSignature,e.sourceSha256,e.unit].every(x=>typeof x==='string'&&x.length))return null;
   return JSON.stringify([snapshot.source,snapshot.modelVersion,snapshot.semanticVersion,e.metricId,e.seriesId,e.referenceSignature,e.sourceSha256,e.unit]);
  }
  if(e.gaitId!==gait||![e.constructId,e.sourceId,e.interpolationRule].every(x=>typeof x==='string'&&x.length)||
     !Number.isFinite(e.referenceSpeedMps)||!Number.isFinite(e.sourceDomain?.minMps)||!Number.isFinite(e.sourceDomain?.maxMps))return null;
  return JSON.stringify([snapshot.source,snapshot.modelVersion,snapshot.semanticVersion,e.constructId,e.sourceId,e.interpolationRule,e.referenceSpeedMps,e.sourceDomain.minMps,e.sourceDomain.maxMps]);
 };
 const sa=signature(currentRef,a),sb=signature(previousRef,b);
 if(!sa||!sb)return bad('unverified','科学的な出所と計算方法を確認できないため比較しません');
 if(sa!==sb)return bad('different-method','科学的指標・モデル・参照基準が異なるため比較しません');
 const display=x=>Math.round(x*10)/10;
 const now=display(a.value),before=display(b.value);
 return {status:'ready',regionId,currentValue:now,previousValue:before,
  difference:display(now-before),note:'同一部位・同一科学的指標の文献参考値の差（ポイント）です。個人の身体負荷・傷害リスク・変化の原因は示しません。'};
}
