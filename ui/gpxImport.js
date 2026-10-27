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
 const sourceLabel=feature.kind==='gps'?'GPS':'GPX';
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
  const span=Math.max(1,hi-lo);const chartX=p=>(30+440*p.km/feature.distanceKm).toFixed(1),chartY=p=>(124-(p.ele-lo)/span*79).toFixed(1);
  // Each connected run has its own area: no artificial terrain across segment gaps or missing elevations.
  const runs=[];
  for(const seg of feature.segments){let run=[];for(const p of seg){if(p.ele===null){if(run.length>1)runs.push(run);run=[];}else run.push(p);}if(run.length>1)runs.push(run);}
  const paths=runs.map(run=>{const reduced=sample(run),path=svgPath(reduced,v=>`${chartX(v)} ${chartY(v)}`);return `<path d="M${chartX(reduced[0])} 124 ${path.replace(/^M/,'L')} L${chartX(reduced.at(-1))} 124 Z" fill="url(#sm-terrain-fill-v34)" opacity=".95"/><path d="${path}" fill="none" stroke="#082838" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="url(#sm-terrain-edge-v34)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;}).join('');
  const markSvg=[['a',aKm],['b',bKm]].filter(([,km])=>valid(km,0,1e6)).map(([id,km])=>{const pt=pointAt(feature,clamp(km,0,feature.distanceKm));if(pt.ele===null)return '';const x=chartX(pt),y=chartY(pt),selected=id===focus,color=id==='a'?'#49e6db':'#b4c9ff';return `<g><circle cx="${x}" cy="${y}" r="${selected?12:8}" fill="${color}" opacity=".14"/><circle cx="${x}" cy="${y}" r="${selected?5.5:4.5}" fill="${color}" stroke="#092230" stroke-width="2.5"/><text x="${x}" y="${Math.max(18,Number(y)-14)}" fill="${color}" font-size="12" font-weight="800" text-anchor="middle">${id.toUpperCase()}</text></g>`;}).join('');
  elev=`<svg viewBox="0 0 500 159" role="img" aria-label="${sourceLabel}の標高断面。記録値に基づき欠損区間は描画しません" class="sm-gpx-elevation"><defs><linearGradient id="sm-terrain-fill-v34" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46cabd" stop-opacity=".43"/><stop offset="1" stop-color="#246d80" stop-opacity=".09"/></linearGradient><linearGradient id="sm-terrain-edge-v34" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#79f1df"/><stop offset="1" stop-color="#8bc6ff"/></linearGradient></defs><g stroke="#426d7b" stroke-opacity=".5" stroke-dasharray="3 6"><path d="M30 50H471 M30 86H471 M30 124H471"/></g><g fill="#b8d2db" font-size="11"><text x="30" y="20">高 ${hi.toFixed(0)}m</text><text x="30" y="118">低 ${lo.toFixed(0)}m</text><text x="30" y="149">0km</text><text x="470" y="149" text-anchor="end">${feature.distanceKm.toFixed(2)}km</text></g>${paths}${markSvg}</svg>`;
 }

 const status=feature.elevationStatus==='complete'?`標高あり（${sourceLabel}記録値・端末測位誤差あり）`:feature.elevationStatus==='partial'?'標高が一部欠けています':feature.elevationStatus==='unverified'?'標高の精度を確認できません':'標高情報がありません';
 const active=focus==='b'?bKm:aKm;
 const visibleSegments=feature.segments.map(seg=>{
  const partial=seg.filter(p=>p.km<=active);
  if(active>=seg[0].km && active<seg.at(-1).km)partial.push(pointAt(feature,active));
  return partial.length>1?svgPath(sample(partial),p=>xy(p).join(' ')):'';
 }).filter(Boolean).join(' ');
 const background=`<defs><pattern id="sm-route-grid-v34" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" fill="none" stroke="#5a8792" stroke-opacity=".16" stroke-width=".65"/></pattern><linearGradient id="sm-route-progress-v34" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#64f5e4"/><stop offset="1" stop-color="#7bbffb"/></linearGradient></defs><rect x="0" y="0" width="500" height="220" fill="url(#sm-route-grid-v34)" rx="11"/>`;
 const layered=`<path d="${paths}" fill="none" stroke="#030e1b" stroke-opacity=".65" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 4)"/><path d="${paths}" fill="none" stroke="#285766" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><path d="${paths}" fill="none" stroke="#84c2ca" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity=".78"/>${visibleSegments?`<path d="${visibleSegments}" fill="none" stroke="url(#sm-route-progress-v34)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`:''}`;
 const endpoint=(xy,letter,color)=>`<g><circle cx="${xy[0]}" cy="${xy[1]}" r="9" fill="#0b2e3d" stroke="${color}" stroke-width="2"/><text x="${xy[0]}" y="${Number(xy[1])+3.3}" fill="#fff" font-size="9.5" text-anchor="middle" font-weight="850">${letter}</text></g>`;
 return `<div class="sm-gpx-preview"><div class="sm-gpx-visual"><strong>軌跡プレビュー <span class="sm-gpx-visual-kicker">地図ではありません</span></strong><svg viewBox="0 0 500 220" role="img" aria-label="${sourceLabel}軌跡の形状、スタート・ゴールと仮の進行位置A・B" class="sm-gpx-shape">${background}${layered}${marks}${endpoint(origin,'S','#bceee3')}${endpoint(dest,'G','#ffcf9c')}</svg><small>明るい線：選択中のシナリオの仮の進行区間。A/B：仮の到達地点。道路や通行可否は分かりません。</small></div><div class="sm-gpx-visual"><strong>高低差 <span class="sm-gpx-visual-kicker">${status}</span></strong>${elev||'<div class="sm-gpx-empty">標高が利用できないか精度が不足するため、起伏は表示しません。</div>'}<small>${feature.gapCount?`途切れた区間 ${feature.gapCount}件は結んでいません。`:''} GPS・GPXの標高や位置点には誤差があります。</small></div></div>`;

}
