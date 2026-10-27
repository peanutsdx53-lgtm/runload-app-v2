/* RunLoad GPS dynamic result: approved parallel body/route layout.
 * Reproduces only available literature speed references (never measured tissue loads).
 * Does not change the manual/static result screen or scientific source files.
 */
import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {deriveReplaySpeeds,evaluateGpsReplayReference} from './gpsReplayReference.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
const names={
 'BA-DISP-014':'股関節部','BA-DISP-015':'殿部','BA-DISP-016':'大腿前面',
 'BA-DISP-018':'大腿後面','BA-DISP-019':'膝蓋大腿関節部','BA-DISP-021':'脛骨部',
 'BA-DISP-023':'下腿後面','BA-DISP-024':'足関節部','BA-DISP-025':'アキレス腱部',
 'BA-DISP-027':'後足部','BA-DISP-028':'足底中部・内側縦足弓','BA-DISP-029':'前足部'
};
const types={RUNNING:'ランニング',JOGGING:'ジョギング',WALK:'ウォーキング'};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const time=ms=>{
 const s=Math.max(0,Math.floor(ms/1000));
 return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
};
const palette=(row)=>{
 if(!row||row.calculationState!=='CALCULATED'||!Number.isFinite(row.value))return {fill:'#52636b',state:'missing'};
 const offset=row.value-100;
 // Continuously vary the intensity from reference 100. Each region is independent.
 // Colors indicate literature-reference deviation, never clinical risk or tissue force.
 const ratio=Math.min(1,Math.abs(offset)/35);
 const base=[45,104,120],target=offset<0?[105,167,227]:[239,157,103];
 const rgb=base.map((v,i)=>Math.round(v+(target[i]-v)*ratio));
 return {fill:'rgb('+rgb.join(',')+')',state:'available'};
};
const svgLine=points=>points.length<2?'':points.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
function routeGeometry(track){
 if(!Array.isArray(track)||track.length<2)return {paths:[],coords:()=>[0,0]};
 const lo=Math.min(...track.map(p=>p.lon)),hi=Math.max(...track.map(p=>p.lon));
 const mn=Math.min(...track.map(p=>p.lat)),mx=Math.max(...track.map(p=>p.lat));
 const dx=Math.max((hi-lo),.00001),dy=Math.max((mx-mn),.00001);
 const convert=p=>[24+352*(p.lon-lo)/dx,20+275*(mx-p.lat)/dy];
 const paths=[];let chunk=[];
 for(const p of track){
  if(p.breakBefore&&chunk.length){if(chunk.length>1)paths.push(svgLine(chunk));chunk=[];}
  chunk.push(convert(p));
 }if(chunk.length>1)paths.push(svgLine(chunk));
 return {paths,coords:convert};
}
export function renderGpsResultSummary(summary){
 if(!summary||summary.schema!==2)return '<div class="gd-empty">GPS記録を確認できません。</div>';
 const flag=summary.detailSaved&&types[summary.activity];
 const avg=summary.distanceKm*3600/summary.activeSeconds;
 const count=summary.finalReference?.regions?.filter(x=>Number.isFinite(x.value)).length||0;
 return '<section class="gd-root gd-summary"><header class="gd-head"><div class="gd-heading"><a class="gd-back" href="#/history" aria-label="履歴へ戻る" style="display:grid;place-items:center;text-decoration:none;color:inherit">‹</a><div><div class="gd-eyebrow">GPS / 保存済み結果</div><h1>走行結果</h1><p class="gd-head-sub">'+esc(summary.date)+'　'+esc(types[summary.activity]||'混合運動')+'</p></div></div></header>'
 +'<div class="gd-summary-metrics"><div><small>距離</small><strong>'+summary.distanceKm.toFixed(2)+' <small>km</small></strong></div>'
 +'<div><small>活動時間</small><strong>'+time(summary.activeSeconds*1000)+'</strong></div>'
 +'<div><small>平均速度</small><strong>'+avg.toFixed(1)+' <small>km/h</small></strong></div></div>'
 +'<p class="gd-note">この結果における12部位の数値は記録の平均速度に対応する文献参考値です（算出 '+count+'/12 部位）。個人の身体負荷の測定値ではありません。</p>'
 +'<section class="gd-summary-regions"><h2>12部位の文献参考値</h2><div class="gd-summary-rows">'+summary.finalReference.regions.map((r,i)=>'<div><small>'+esc(Object.values(names)[i]||r.regionId)+'</small><strong>'+(Number.isFinite(r.value)?r.value.toFixed(1):'—')+'</strong></div>').join('')+'</div></section>'
 +(flag?'<p style="margin-top:19px"><a class="gd-enter" href="#/dynamic-result?record='+encodeURIComponent(summary.id)+'">動的結果を見る ›</a></p>':'<p class="gd-note">動的結果は、保存時にコース・再生用データを選択した単一活動の記録で利用できます。</p>')
 +'</section>';
}
export function mountGpsDynamicResult(host,summary,detail){
 if(!host)return {ok:false,reason:'NO_HOST'};
 if(!summary?.detailSaved||!detail||detail.id!==summary.id
   ||!types[summary.activity]){host.innerHTML='<p class="gd-empty">この記録では動的結果を利用できません。</p>';return {ok:false,reason:'NOT_AVAILABLE'};}
 let speed;
 try{speed=deriveReplaySpeeds(detail.speedPoints);}catch{
  host.innerHTML='<p class="gd-empty">速度時系列の整合性を確認できません。</p>';return {ok:false,reason:'INVALID_SERIES'};
 }
 if(speed.length<2)return {ok:false,reason:'TOO_FEW_SAMPLES'};
 const origin=speed[0].t;
 const elapsed=f=>f.activeMs===null||f.activeMs===undefined?f.t-origin:f.activeMs;
 const duration=elapsed(speed.at(-1));
 let index=0,view='front',selected='BA-DISP-014',playing=false,timer=null;
 const geom=routeGeometry(detail.route);
 const labels=detail.flags||[];
 const nearest=t=>{
  let lo=0,hi=speed.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(speed[mid].t<t)lo=mid+1;else hi=mid;}
  return lo>0&&Math.abs(speed[lo-1].t-t)<Math.abs(speed[lo].t-t)?lo-1:lo;
 };
 const getFrame=()=>speed[index];
 const refAt=()=>getFrame().speedMps===null?null:evaluateGpsReplayReference({activity:summary.activity,speedMps:getFrame().speedMps});
 const bodySvg=ref=>{
  const v=BODY_REGION_VIEWS.find(x=>x.key===view)||BODY_REGION_VIEWS[0];
  const paths=v.paths.map(([id,d])=>{
   const row=ref?.rows.find(r=>r.regionId==='R'+String(Object.keys(names).indexOf(id)+1).padStart(2,'0'));
   const tint=palette(row);
   return '<path tabindex="0" role="button" aria-label="'+esc(names[id])+'" data-body-region="'+id+'" class="gd-body-path'+(selected===id?' selected':'')+'" data-state="'+tint.state+'" style="fill:'+tint.fill+'" d="'+d+'"><title>'+esc(names[id])+'</title></path>';
  }).join('');
  return '<svg class="gd-body" viewBox="70 10 160 430" role="group" aria-label="'+v.title+'の部位別文献参考値">'
    +'<g class="gd-body-silhouette">'+v.silhouette+'</g>'+paths+'</svg>';
 };
 const courseSvg=()=>{
  const frame=getFrame(),target=detail.route.reduce((best,p)=>Math.abs(p.t-frame.t)<Math.abs(best.t-frame.t)?p:best,detail.route[0]);
  const [cx,cy]=geom.coords(target);
  const marks=labels.map((f,i)=>{
   const [x,y]=geom.coords(f);
   return '<g data-jump-flag="'+i+'" role="button" tabindex="0" aria-label="フラッグ '+(i+1)+'" class="gd-map-flag" transform="translate('+x+' '+y+')">'
    +'<circle cx="5" cy="-6" r="22" fill="transparent" pointer-events="all"/><path class="gd-flag-icon" d="M0 7 V-17 L17 -11 L0 -4 Z"/><circle cx="0" cy="7" r="3.5" fill="#ffd397"/></g>';
  }).join('');
  return '<svg viewBox="0 0 400 320" role="group" aria-label="記録されたGPSコースと現在位置" class="gd-map-svg">'
    +'<path class="gd-map-grid" d="M0 80H400 M0 160H400 M0 240H400 M80 0V320 M160 0V320 M240 0V320 M320 0V320"/>'
    +geom.paths.map(path=>'<path d="'+path+'" class="gd-route"/>').join('')
    +marks+'<circle class="gd-runner" cx="'+cx.toFixed(2)+'" cy="'+cy.toFixed(2)+'" r="6"/></svg>';
 };
 const speedSvg=()=>{
  const n=speed.length;
  // All points determine the global visible speed scale; only drawn vertices are sampled.
  const valid=speed.map(s=>s.speedMps).filter(x=>x!==null&&Number.isFinite(x)&&x>=0);
  const top=valid.reduce((max,v)=>Math.max(max,v),1)*3.6;
  const maxVertices=180,step=Math.max(1,Math.ceil(n/maxVertices));
  let pts=[];
  for(let k=0;k<n;k+=step){const s=speed[k];if(s.speedMps!==null)pts.push([5+(k/(n-1))*690,61-53*(s.speedMps*3.6/top)]);}
  const ix=5+(index/(n-1))*690;
  return '<svg class="gd-speed-svg" viewBox="0 0 700 70" role="img" aria-label="GPS速度変化"><path d="M5 61H695" stroke="#418093" stroke-width="1"/>'
    +'<path d="'+svgLine(pts)+'" stroke="#46d9dc" stroke-width="2.5" fill="none" stroke-linejoin="round"/>'
    +'<path d="M'+ix.toFixed(2)+' 3 V63" stroke="#ffc47e" stroke-width="2" stroke-dasharray="3 3"/></svg>';
 };
 function render(){
  const frame=getFrame(),ref=refAt();
  const v=ref?.rows.find(r=>r.regionId==='R'+String(Object.keys(names).indexOf(selected)+1).padStart(2,'0'));
  const text=v?.calculationState==='CALCULATED'&&Number.isFinite(v.value)?v.value.toFixed(1):'—';
  const speedText=Number.isFinite(frame.speedMps)?(frame.speedMps*3.6).toFixed(1):'—';
  const note=labels.find(f=>Math.abs(f.t-frame.t)<=1500);
  host.innerHTML='<section class="gd-root" aria-label="GPS動的結果">'
   +'<header class="gd-head"><div class="gd-heading"><a href="#/result?gps='+encodeURIComponent(summary.id)+'" class="gd-back" style="display:grid;place-items:center;color:inherit;text-decoration:none" aria-label="通常結果に戻る">‹</a><div><div class="gd-eyebrow">DYNAMIC RESULT / GPS</div><h1>動的結果</h1><p class="gd-head-sub">'+esc(summary.date)+'　'+esc(types[summary.activity])+'</p></div></div><div class="gd-tag">文献参考値の変化</div></header>'
   +'<div class="gd-metrics"><div class="gd-metric"><span>経過時間</span><strong>'+time(elapsed(frame))+'</strong></div><div class="gd-metric"><span>走行距離</span><strong>'+frame.km.toFixed(2)+' <em>km</em></strong></div><div class="gd-metric"><span>GPS速度</span><strong>'+speedText+' <em>km/h</em></strong></div></div>'
   +'<div class="gd-main"><section class="gd-panel"><header class="gd-panel-head"><strong>12部位の変化</strong><div class="gd-tabs">'
   +BODY_REGION_VIEWS.map(v=>'<button data-view="'+v.key+'" aria-pressed="'+(v.key===view)+'">'+v.title+'</button>').join('')+'</div></header>'
   +'<div class="gd-stage">'+bodySvg(ref)+'</div><div class="gd-panel-foot"><span>'+esc(names[selected])+'</span><span class="gd-value">'+text+'</span></div></section>'
   +'<section class="gd-panel"><header class="gd-panel-head"><strong>コース軌跡</strong><small>⚑ '+labels.length+' 地点</small></header>'
   +'<div class="gd-stage">'+courseSvg()+'</div><div class="gd-panel-foot"><span>現在地点</span><span>'+frame.km.toFixed(2)+' km</span></div></section></div>'
   +'<section class="gd-speed-block"><div class="gd-speed-head"><strong>速度の変化</strong><small>シークバー・コース・人体図が連動</small></div>'
   +speedSvg()+'<div class="gd-controls"><button data-play class="gd-play">'+(playing?'一時停止':'▶ 再生')+'</button>'
   +'<input class="gd-scrub" data-seek type="range" min="0" max="'+(speed.length-1)+'" value="'+index+'" aria-label="再生位置"/>'
   +'<span class="gd-duration">'+time(elapsed(frame))+' / '+time(duration)+'</span></div>'
   +(note?'<div class="gd-flag-note">⚑ '+esc(note.note||'フラッグ地点')+'</div>':'')
   +'<p class="gd-note">人体図は速度条件に対応する文献参考値です。個人の身体負荷や損傷リスクの実測値ではありません。灰色は計算不能です。GPS欠損中の参考値は補完しません。</p></section></section>';
  host.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;selected=(BODY_REGION_VIEWS.find(v=>v.key===view)?.paths[0]||['BA-DISP-014'])[0];render();}));
  host.querySelectorAll('[data-body-region]').forEach(b=>{
   const select=()=>{selected=b.dataset.bodyRegion;render();};
   b.addEventListener('click',select);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});
  });
  host.querySelectorAll('[data-jump-flag]').forEach(b=>{
   const jump=()=>{index=nearest(labels[Number(b.dataset.jumpFlag)].t);render();};
   b.addEventListener('click',jump);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump();}});
  });
  host.querySelector('[data-seek]')?.addEventListener('input',e=>{index=Number(e.target.value);render();});
  host.querySelector('[data-play]')?.addEventListener('click',()=>{
   playing=!playing;
   if(playing){
    timer=setInterval(()=>{
     if(index>=speed.length-1){playing=false;clearInterval(timer);timer=null;render();return;}
     // Advance by timestamp (~1 simulated second for every real second).
     const nextTime=getFrame().t+250;
     index=Math.max(index+1,nearest(nextTime));
     render();
    },250);
   }else{clearInterval(timer);timer=null;}
   render();
  });
 }
 render();
 return {ok:true,dispose:()=>{if(timer!==null)clearInterval(timer);timer=null;playing=false;}};
}
