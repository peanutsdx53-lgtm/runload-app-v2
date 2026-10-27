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
/* Seven restrained stops on the existing RunLoad navy surface.
 * Smooth, continuous color shows the magnitude/direction of deviation from
 * EACH body's own reference 100; it is never a risk or clinical ranking.
 * Endpoints are display caps, NOT validity limits of any scientific model.
 */
export const BODY_REFERENCE_COLOR_STOPS=Object.freeze([
 Object.freeze({value:60,hex:'#4776A6'}),
 Object.freeze({value:80,hex:'#4D92B2'}),
 Object.freeze({value:92,hex:'#56ACB7'}),
 Object.freeze({value:100,hex:'#66C4B5'}),
 Object.freeze({value:108,hex:'#9AB9A8'}),
 Object.freeze({value:120,hex:'#BD998E'}),
 Object.freeze({value:140,hex:'#CA7D8B'})
]);
export const BODY_REFERENCE_RANGE=Object.freeze({min:60,max:140});
export const BODY_REFERENCE_GRADIENT='linear-gradient(90deg,'+
 BODY_REFERENCE_COLOR_STOPS.map(x=>(x.hex+' '+((x.value-60)/80*100).toFixed(2)+'%')).join(',')+')';
const hexRgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
export const bodyReferenceScale=value=>{
 if(typeof value!=='number'||!Number.isFinite(value))return null;
 return {position:Math.max(0,Math.min(100,(value-60)/80*100)),
  clipped:value<60?'low':value>140?'high':null};
};
export const bodyReferenceColor=row=>{
 if(!calculatedReference(row))return {fill:'#52636b',state:'missing'};
 const v=row.value,stops=BODY_REFERENCE_COLOR_STOPS;
 if(v<=stops[0].value)return {fill:stops[0].hex,state:'available'};
 if(v>=stops.at(-1).value)return {fill:stops.at(-1).hex,state:'available'};
 const right=stops.findIndex(x=>x.value>=v),a=stops[right-1],b=stops[right];
 const t=(v-a.value)/(b.value-a.value),rgbA=hexRgb(a.hex),rgbB=hexRgb(b.hex);
 return {fill:'rgb('+rgbA.map((c,i)=>Math.round(c+(rgbB[i]-c)*t)).join(',')+')',state:'available'};
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
  const width=Math.max(48,16+label.length*9.4),height=30;
  const x0=x-width/2,y0=y-height/2;
  return '<g class="body-reference-badge" data-body-reference-label="'+bodyId+
   '" data-body-reference-value="'+label+'" pointer-events="none" aria-hidden="true">'+
   '<rect x="'+x0+'" y="'+y0+'" width="'+width+'" height="'+height+
   '" rx="8" fill="#082b3b" fill-opacity=".94" stroke="#95e8df" stroke-width="1.1"/>'+
   '<text x="'+x+'" y="'+(y+6.2)+'" text-anchor="middle" fill="#f6ffff" '+
   'font-size="19" font-family="system-ui,sans-serif" font-weight="800">'+label+'</text></g>';
 }).join('');
}


/* Raised appearance is non-data visual shading. Region fill remains the actual
 * seven-stop scientific reference value. Hidden and unavailable values stay neutral. */
export const referenceReliefDefs=prefix=>`<linearGradient id="${prefix}-relief" x1="0%" y1="6%" x2="100%" y2="72%">
 <stop offset="0%" stop-color="#f1ffff" stop-opacity=".30"/>
 <stop offset="24%" stop-color="#e5ffff" stop-opacity=".16"/>
 <stop offset="45%" stop-color="#ffffff" stop-opacity="0"/>
 <stop offset="67%" stop-color="#021927" stop-opacity=".11"/>
 <stop offset="100%" stop-color="#011724" stop-opacity=".36"/>
 </linearGradient>
 <linearGradient id="${prefix}-satin" x1="0%" y1="0%" x2="100%" y2="0%">
 <stop offset="0%" stop-color="#d9fbfb" stop-opacity=".16"/>
 <stop offset="17%" stop-color="#d9fbfb" stop-opacity=".06"/>
 <stop offset="48%" stop-color="#ffffff" stop-opacity="0"/>
 <stop offset="100%" stop-color="#000e1b" stop-opacity=".17"/>
 </linearGradient>`;
export const referenceReliefOverlays=(path,prefix,state)=>
 `<path d="${path}" class="body-reference-relief${state==='missing'?' is-unavailable':''}" fill="url(#${prefix}-relief)" aria-hidden="true" pointer-events="none"/>`+
 `<path d="${path}" class="body-reference-satin${state==='missing'?' is-unavailable':''}" fill="url(#${prefix}-satin)" aria-hidden="true" pointer-events="none"/>`;
