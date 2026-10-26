/* RunLoad GPX v33 — ephemeral, browser-only route preview.
 * GPX never enters the scientific engine, saved run records, preset schema, or network.
 * Multiple tracks/routes are kept distinct; track-segment gaps must never be joined.
 */
export const GPX_MAX_BYTES = 5_000_000;
export const GPX_MAX_POINTS = 25_000;
const R = 6371.0088; // WGS84 spherical approximation; kilometres, not an exact surveyed distance.
const valid = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
const direct = (el, name) => [...el.children].filter(child => child.localName === name);
const childText = (el, name) => direct(el, name)[0]?.textContent?.trim() || '';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function haversineKm(a, b) {
 const dLat=(b.lat-a.lat)*Math.PI/180, dLon=(b.lon-a.lon)*Math.PI/180;
 const lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180;
 const x=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
 return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));
}
function parsePoint(el) {
 const latRaw=el.getAttribute('lat'), lonRaw=el.getAttribute('lon');
 if(latRaw===null||lonRaw===null||!latRaw.trim()||!lonRaw.trim())throw Error('位置情報がない点があります');
 const lat=Number(latRaw),lon=Number(lonRaw);
 if(!valid(lat,-90,90)||!valid(lon,-180,180))throw Error('範囲外の緯度・経度があります');
 const eleRaw=childText(el,'ele');
 const ele=eleRaw===''?null:Number(eleRaw);
 if(eleRaw!==''&&!valid(ele,-12000,9000))throw Error('標高の値が正しくありません');
 return {lat,lon,ele,km:0};
}
function makeFeature(el, kind, idx) {
 const groups=kind==='trk'?direct(el,'trkseg').map(seg=>direct(seg,'trkpt')):[direct(el,'rtept')];
 const nonempty=groups.filter(g=>g.length>0);
 if(!nonempty.length)return null;
 const segments=[];let points=0,km=0,elevationPoints=0;
 for(const group of nonempty){
  const seg=[];
  for(const node of group){
   if(++points>GPX_MAX_POINTS)throw Error(`位置点が多すぎます（上限${GPX_MAX_POINTS.toLocaleString('ja-JP')}点）`);
   const point=parsePoint(node);if(point.ele!==null)elevationPoints++;
   if(seg.length)km+=haversineKm(seg.at(-1),point);
   if(km>1000)throw Error('コース距離が1000kmを超えるため読み込めません');
   point.km=km;seg.push(point);
  }
  segments.push(seg);
 }
 if(points<2||km<0.1)throw Error('有効な軌跡が短すぎます（0.1km以上必要です）');
 return {name:childText(el,'name').slice(0,90)||(kind==='trk'?`トラック ${idx}`:`ルート ${idx}`),kind,segments,points,distanceKm:km,
  elevationPoints,elevationStatus:elevationPoints===0?'none':elevationPoints===points?'complete':'partial',
  gapCount:segments.length-1};
}
/** Parse independently chosen GPX features. Uses built-in browser XML parser, no external requests. */
export function parseGpxText(xml, Parser=globalThis.DOMParser) {
 if(typeof xml!=='string'||!xml.trim())throw Error('GPXファイルが空です');
 if(new TextEncoder().encode(xml).length>GPX_MAX_BYTES)throw Error('GPXファイルが5MBを超えています');
 if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw Error('外部定義を含むXMLは読み込めません');
 if(typeof Parser!=='function')throw Error('この端末ではGPXを読み込めません');
 const doc=new Parser().parseFromString(xml,'application/xml');
 if(doc.getElementsByTagName('parsererror').length||doc.documentElement?.localName!=='gpx')throw Error('正しいGPX形式ではありません');
 const root=doc.documentElement;
 const tracks=direct(root,'trk'), routes=direct(root,'rte');
 if(tracks.length+routes.length>24)throw Error('コースが多すぎます（24件以内）');
 const features=[];let totalPoints=0;
 for(const [kind,nodes] of [['trk',tracks],['rte',routes]]){
  nodes.forEach((node,i)=>{const f=makeFeature(node,kind,i+1);if(f){totalPoints+=f.points;if(totalPoints>GPX_MAX_POINTS)throw Error(`GPX全体で${GPX_MAX_POINTS.toLocaleString('ja-JP')}点を超えています`);features.push(f);}});
 }
 if(!features.length)throw Error('トラックまたはルートの位置点がありません');
 return features;
}
export async function readGpxFile(file){
 if(!file)throw Error('GPXファイルを選択してください');
 if(file.size>GPX_MAX_BYTES)throw Error('GPXファイルが5MBを超えています');
 if(!/\.gpx$/i.test(file.name||''))throw Error('拡張子が.gpxのファイルを選択してください');
 return parseGpxText(await file.text());
}
const clamp=(a,b,c)=>Math.max(b,Math.min(c,a));
function pointAt(feature,km){
 const goal=clamp(km,0,feature.distanceKm);
 for(const seg of feature.segments){
  for(let i=0;i<seg.length;i++){
   const point=seg[i],prev=seg[i-1];
   if(point.km>=goal){
    if(!prev||point.km===prev.km)return point;
    const t=clamp((goal-prev.km)/(point.km-prev.km),0,1);
    return {lat:prev.lat+(point.lat-prev.lat)*t,lon:prev.lon+(point.lon-prev.lon)*t,
     ele:prev.ele===null||point.ele===null?null:prev.ele+(point.ele-prev.ele)*t,km:goal};
   }
  }
 }
 return feature.segments.at(-1).at(-1);
}
export function projectToRoute(feature, travelled){
 if(!feature||!valid(travelled,0,1e6))return null;
 return {...pointAt(feature,travelled),beyond:travelled>feature.distanceKm};
}
const sample=(arr,max=650)=>arr.length<=max?arr:arr.filter((_,i)=>i===0||i===arr.length-1||i%Math.ceil(arr.length/max)===0);
function svgPath(points,pointFn){return points.map((p,i)=>`${i?'L':'M'}${pointFn(p)}`).join(' ');}
/** No basemap: a locally generated route-shape schematic. No streets or fabricated terrain. */
export function renderGpxVisual(feature,aKm,bKm,focus='a'){
 if(!feature)return '';
 const pts=feature.segments.flat();
 const bounds={minLat:Math.min(...pts.map(p=>p.lat)),maxLat:Math.max(...pts.map(p=>p.lat)),minLon:Math.min(...pts.map(p=>p.lon)),maxLon:Math.max(...pts.map(p=>p.lon))};
 const cos=Math.max(.05,Math.cos((bounds.minLat+bounds.maxLat)/2*Math.PI/180));
 const spanX=Math.max(.00004,(bounds.maxLon-bounds.minLon)*cos),spanY=Math.max(.00004,bounds.maxLat-bounds.minLat);
 const scale=Math.min(450/spanX,185/spanY);
 const ox=26+(450-spanX*scale)/2,oy=17+(185-spanY*scale)/2;
 const xy=p=>[(ox+(p.lon-bounds.minLon)*cos*scale).toFixed(1),(oy+(bounds.maxLat-p.lat)*scale).toFixed(1)];
 const paths=feature.segments.map(seg=>svgPath(sample(seg),p=>xy(p).join(' '))).join(' ');
 const marks=[['a',aKm],['b',bKm]].filter(([,km])=>valid(km,0,1e6)).map(([id,km])=>{
   const [x,y]=xy(pointAt(feature,km)); const chosen=focus===id;
   return `<g><circle cx="${x}" cy="${y}" r="${chosen?8:6}" fill="${id==='a'?'#40ddd1':'#a4bafd'}" stroke="#071b28" stroke-width="3"/><text x="${x}" y="${Math.max(13,Number(y)-12)}" fill="#fff" font-size="12" font-weight="bold" text-anchor="middle">${id.toUpperCase()}</text></g>`;
 }).join('');
 const origin=xy(feature.segments[0][0]);const dest=xy(pts.at(-1));
 let elev='';
 if(feature.elevationPoints>1){
  const known=pts.filter(p=>p.ele!==null); const lo=Math.min(...known.map(p=>p.ele)),hi=Math.max(...known.map(p=>p.ele));
  const span=Math.max(1,hi-lo);const chartX=p=>(30+440*p.km/feature.distanceKm).toFixed(1),chartY=p=>(122-(p.ele-lo)/span*78).toFixed(1);
  const lines=[];
  for(const seg of feature.segments){let current=[];for(const p of seg){if(p.ele===null){if(current.length>1)lines.push(svgPath(sample(current),v=>`${chartX(v)} ${chartY(v)}`));current=[];}else current.push(p);}if(current.length>1)lines.push(svgPath(sample(current),v=>`${chartX(v)} ${chartY(v)}`));}
  const markKm=focus==='b'?bKm:aKm,mark=pointAt(feature,clamp(markKm,0,feature.distanceKm));
  elev=`<svg viewBox="0 0 500 157" role="img" aria-label="GPXに記録された標高の変化。欠損区間は線をつながず表示" class="sm-gpx-elevation"><path d="M30 122 H472" stroke="#547784" stroke-width="1"/><g fill="#b8d2db" font-size="11"><text x="30" y="23">${hi.toFixed(0)}m</text><text x="30" y="145">0km</text><text x="470" y="145" text-anchor="end">${feature.distanceKm.toFixed(2)}km</text></g>${lines.map(p=>`<path d="${p}" fill="none" stroke="#66dcca" stroke-width="3" stroke-linejoin="round"/>`).join('')}${mark.ele===null?'':`<circle cx="${chartX(mark)}" cy="${chartY(mark)}" r="6" stroke="#071b28" stroke-width="3" fill="${focus==='b'?'#a4bafd':'#40ddd1'}"/>`}</svg>`;
 }
 const status=feature.elevationStatus==='complete'?'標高あり（GPX記録値）':feature.elevationStatus==='partial'?'標高が一部欠けています':'標高情報がありません';
 return `<div class="sm-gpx-preview"><div class="sm-gpx-visual"><strong>軌跡の形状（地図ではありません）</strong><svg viewBox="0 0 500 220" role="img" aria-label="GPXの軌跡と仮の進行位置A・B" class="sm-gpx-shape"><path d="${paths}" fill="none" stroke="#7fe8dc" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${marks}<circle cx="${origin.join('" cy="')}" r="4" fill="#fff"/><circle cx="${dest.join('" cy="')}" r="4" fill="#ffbd85"/></svg><small>緑線：GPXの位置点を結んだ形状　A/B：仮の到達位置。道の通行可否は示しません。</small></div><div class="sm-gpx-visual"><strong>高低差｜${status}</strong>${elev||'<div class="sm-gpx-empty">標高がないため、高低差は表示できません。</div>'}<small>${feature.gapCount?`途切れた区間 ${feature.gapCount}件は結んでいません。`:''} GPS・GPXの標高や軌跡には誤差があります。</small></div></div>`;
}
