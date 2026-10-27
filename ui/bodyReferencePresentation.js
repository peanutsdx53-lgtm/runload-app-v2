/* Presentation adapter shared by saved manual results and GPS replay.
 * Numerical models and 12 region IDs remain authoritative in core/.
 * Never create synthetic readings for unsupported speeds or missing GPS samples.
 */
export const BODY_REFERENCE_IDS=Object.freeze([
 'BA-DISP-014','BA-DISP-015','BA-DISP-016','BA-DISP-018',
 'BA-DISP-019','BA-DISP-021','BA-DISP-023','BA-DISP-024',
 'BA-DISP-025','BA-DISP-027','BA-DISP-028','BA-DISP-029'
]);
export const bodyReferenceEngineId=id=>{
 const index=BODY_REFERENCE_IDS.indexOf(id);
 return index<0?null:'R'+String(index+1).padStart(2,'0');
};
export const engineReferenceBodyId=engineId=>{
 const match=/^R(0[1-9]|1[0-2])$/.exec(engineId||'');
 return match?BODY_REFERENCE_IDS[Number(match[1])-1]:null;
};
export const bodyReferenceRow=(rows,bodyId)=>Array.isArray(rows)?
 rows.find(r=>r.regionId===bodyReferenceEngineId(bodyId))||null:null;
export const calculatedReference=(row)=>row?.calculationState==='CALCULATED'&&
 typeof row.value==='number'&&Number.isFinite(row.value);
export const bodyReferenceColor=row=>{
 if(!calculatedReference(row))return {fill:'#52636b',state:'missing'};
 const delta=row.value-100,ratio=Math.min(1,Math.abs(delta)/35);
 const base=[45,104,120],target=delta<0?[105,167,227]:[239,157,103];
 return {fill:'rgb('+base.map((v,i)=>Math.round(v+(target[i]-v)*ratio)).join(',')+')',state:'available'};
};
// A central label describes each bilateral region once; its left/right shapes
// still share the same independent scientific region (not one reading per leg).
const ANCHORS=Object.freeze({
 'BA-DISP-014':[150,216], 'BA-DISP-015':[150,215],
 'BA-DISP-016':[150,263], 'BA-DISP-018':[150,268],
 'BA-DISP-019':[150,311], 'BA-DISP-021':[150,353],
 'BA-DISP-023':[150,345], 'BA-DISP-024':[150,392],
 'BA-DISP-025':[150,397], 'BA-DISP-027':[156,362],
 'BA-DISP-028':[146,267], 'BA-DISP-029':[150,174]
});
/** SVG reference labels are visually prominent and cannot steal body taps.
 * Each rendered value is a real calculated reference number; unavailable
 * regions show no numeric badge, never zero or a manufactured baseline.
 */
export function renderBodyReferenceLabels(view,rows,{prefix='reference'}={}){
 if(!view?.paths||!Array.isArray(rows))return '';
 return view.paths.map(([bodyId])=>{
  const point=ANCHORS[bodyId],row=bodyReferenceRow(rows,bodyId);
  if(!point||!calculatedReference(row))return '';
  const [x,y]=point,label=row.value.toFixed(1);
  const width=Math.max(37,10+label.length*7),height=20;
  const x0=x-width/2,y0=y-height/2;
  return '<g class="body-reference-badge" data-body-reference-label="'+bodyId+
   '" data-body-reference-value="'+label+'" pointer-events="none" aria-hidden="true">'+
   '<rect x="'+x0+'" y="'+y0+'" width="'+width+'" height="'+height+
   '" rx="8" fill="#082b3b" fill-opacity=".94" stroke="#95e8df" stroke-width="1.1"/>'+
   '<text x="'+x+'" y="'+(y+4.2)+'" text-anchor="middle" fill="#f6ffff" '+
   'font-size="12" font-family="system-ui,sans-serif" font-weight="800">'+label+'</text></g>';
 }).join('');
}
