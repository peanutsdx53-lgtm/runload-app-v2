/* RunLoad GPS map: optional OpenStreetMap tile backdrop around accepted GPS samples.
 * Never requests a tile before a position is accepted. No map library, external
 * telemetry, or changes to measurement/record storage. Map tile requests reveal
 * the approximate displayed geographic area to tile.openstreetmap.org.
 */
const TILE=256, WEB_MAX=85.05112878, OSM='https://tile.openstreetmap.org';
const isCoordinate=p=>p&&typeof p.lat==='number'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&typeof p.lon==='number'&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function worldPoint(lat,lon,zoom=16){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isInteger(zoom)||zoom<0||zoom>19)return null;
 const a=clamp(lat,-WEB_MAX,WEB_MAX)*Math.PI/180;
 const scale=TILE*(2**zoom);
 return {x:(lon+180)/360*scale,y:(1-Math.log(Math.tan(a)+1/Math.cos(a))/Math.PI)/2*scale};
}
export function visibleTiles(center,width,height,zoom=16){
 const w=clamp(Number(width)||360,160,1600),h=clamp(Number(height)||270,160,800);
 const topX=Math.floor((center.x-w/2)/TILE),endX=Math.floor((center.x+w/2)/TILE);
 const topY=Math.floor((center.y-h/2)/TILE),endY=Math.floor((center.y+h/2)/TILE);
 const side=2**zoom,out=[];
 for(let y=topY;y<=endY;y++)for(let x=topX;x<=endX;x++){
  if(y<0||y>=side||out.length>=48)continue;
  const wrap=((x%side)+side)%side;
  out.push({key:`${zoom}/${wrap}/${y}`,url:`${OSM}/${zoom}/${wrap}/${y}.png`,left:x*TILE-center.x+w/2,top:y*TILE-center.y+h/2});
 }
 return out;
}
function ensureFrame(node){
 if(node.querySelector('[data-gps-map-tiles]'))return;
 node.innerHTML='<div class="gps-map-tiles" data-gps-map-tiles aria-hidden="true"></div><svg class="gps-map-overlay" data-gps-map-overlay aria-hidden="true"></svg><div class="gps-map-location" data-gps-map-location>GPS受信中</div><div class="gps-map-network-status" data-gps-map-network-status role="status" hidden>道路地図を取得できません。GPS計測と軌跡の記録は継続しています。</div>';
}
function updateTileStatus(map){
 const imgs=[...map.querySelectorAll('[data-gps-map-tiles] img')];
 const loaded=imgs.some(img=>img.complete&&img.naturalWidth>0);
 const waiting=imgs.some(img=>!img.complete);
 const failed=imgs.length>0&&!loaded&&!waiting;
 const notice=map.querySelector('[data-gps-map-network-status]');
 if(notice)notice.hidden=!failed;
 map.dataset.tileStatus=failed?'unavailable':loaded?'loaded':'loading';
}
function segmentPaths(track,center,w,h,zoom){
 const chunks=[];let chunk=[];let last=null;
 const total=TILE*(2**zoom);
 for(const p of track||[]){
  if(!isCoordinate(p))continue;
  if(p.breakBefore&&chunk.length){chunks.push(chunk);chunk=[];last=null;}
  const pos=worldPoint(p.lat,p.lon,zoom);
  if(!pos)continue;
  // Unwrap around the date line so adjacent track points do not cross the map.
  if(last!==null)pos.x+=Math.round((last-pos.x)/total)*total;
  last=pos.x;
  const x=pos.x-center.x+w/2,y=pos.y-center.y+h/2;
  chunk.push([x,y]);
 }
 if(chunk.length)chunks.push(chunk);
 return chunks.filter(c=>c.length>1).map(c=>`<path d="${c.map((v,i)=>`${i?'L':'M'}${v[0].toFixed(1)} ${v[1].toFixed(1)}`).join(' ')}"/>`).join('');
}
export function updateGpsLiveMap(root,s){
 const map=root?.querySelector?.('[data-gps-map]');if(!map)return;
 const p=s?.lastPosition;
 if(!isCoordinate(p)||!(p.accuracyM>=0&&p.accuracyM<=50)){
  map.replaceChildren();map.dataset.mapStatus='waiting';map.dataset.tileStatus='waiting';
  const label=document.createElement('span');label.className='gps-map-waiting';label.textContent='GPS測位後に、この場所の地図を表示します。';map.append(label);
  return;
 }
 const zoom=16, width=map.clientWidth||360,height=map.clientHeight||260;
 const center=worldPoint(p.lat,p.lon,zoom);if(!center)return;
 ensureFrame(map);map.dataset.mapStatus='active';
 const deck=map.querySelector('[data-gps-map-tiles]');
 const old=new Map([...deck.children].map(el=>[el.dataset.tileKey,el]));
 for(const tile of visibleTiles(center,width,height,zoom)){
  let img=old.get(tile.key);
  if(!img){
   img=document.createElement('img');img.dataset.tileKey=tile.key;img.alt='';img.decoding='async';img.loading='eager';
   // OSM requires a valid Referer for web clients. Do not disable native HTTP caching.
   img.referrerPolicy='strict-origin-when-cross-origin';
   img.addEventListener('load',()=>updateTileStatus(map));
   img.addEventListener('error',()=>updateTileStatus(map));
   img.src=tile.url;deck.append(img);
  }
  img.style.left=`${tile.left.toFixed(1)}px`;img.style.top=`${tile.top.toFixed(1)}px`;
  old.delete(tile.key);
 }
 for(const unused of old.values())unused.remove();
 updateTileStatus(map);
 const overlay=map.querySelector('[data-gps-map-overlay]');
 overlay.setAttribute('viewBox',`0 0 ${width} ${height}`);
 const path=segmentPaths(s.track||[],center,width,height,zoom);
 overlay.innerHTML=`<g class="gps-map-track-under">${path}</g><g class="gps-map-track-line">${path}</g><circle class="gps-map-marker-halo" cx="${width/2}" cy="${height/2}" r="17"/><circle class="gps-map-marker" cx="${width/2}" cy="${height/2}" r="7"/>`;
 const label=map.querySelector('[data-gps-map-location]');if(label)label.textContent=`現在地付近　誤差 ±${Math.round(p.accuracyM)}m`;
}
