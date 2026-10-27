/* RunLoad GPS dynamic result: approved parallel body/route layout.
 * Reproduces only available literature speed references (never measured tissue loads).
 * Does not change the manual/static result screen or scientific source files.
 */
import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {deriveReplaySpeeds,evaluateGpsReplayReference,gpsBodyRegionId} from './gpsReplayReference.js';
import {bodyReferenceRow,bodyReferenceColor,BODY_REFERENCE_GRADIENT,renderBodyReferenceLabels,referenceReliefDefs,referenceReliefOverlays,bodyReferenceSilhouetteClipDef} from './bodyReferencePresentation.js';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[c]));
export const GPS_REPLAY_BODY_NAMES={
 'BA-DISP-014':'股関節部','BA-DISP-015':'殿部','BA-DISP-016':'大腿前面',
 'BA-DISP-018':'大腿後面','BA-DISP-019':'膝蓋大腿関節部','BA-DISP-021':'脛骨部',
 'BA-DISP-023':'下腿後面','BA-DISP-024':'足関節部','BA-DISP-025':'アキレス腱部',
 'BA-DISP-027':'後足部','BA-DISP-028':'足底中部・内側縦足弓','BA-DISP-029':'前足部'
};
const names=GPS_REPLAY_BODY_NAMES;
const types={RUNNING:'ランニング',JOGGING:'ジョギング',WALK:'ウォーキング'};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const time=ms=>{
 const s=Math.max(0,Math.floor(ms/1000));
 return String(Math.floor(s/3600)).padStart(2,'0')+':'+String(Math.floor(s/60)%60).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
};
export const palette=bodyReferenceColor;
export const gpsReplayRowForBody=bodyReferenceRow;
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
 +'<div><small>平均速度</small><strong>'+avg.toFixed(1)+' <small>km/h</small></strong></div>'
 +(summary.energyEstimate?.ok?'<div><small>推定消費カロリー</small><strong>'+summary.energyEstimate.estimatedKcal.toFixed(1)+' <small>kcal</small></strong></div>':'')+'</div>'
 +'<p class="gd-note">この結果における12部位の数値は記録の平均速度に対応する文献参考値です（算出 '+count+'/12 部位）。個人の身体負荷の測定値ではありません。</p>'
 +'<section class="gd-summary-regions"><h2>12部位の文献参考値</h2><div class="gd-summary-rows">'+summary.finalReference.regions.map((r,i)=>'<div><small>'+esc(names[gpsBodyRegionId(r.regionId)]||r.regionId)+'</small><strong>'+(Number.isFinite(r.value)?r.value.toFixed(1):'—')+'</strong></div>').join('')+'</div></section>'
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
 let index=0,view='front',selected='BA-DISP-014',playing=false,timer=null,playElapsed=0,showBodyNumbers=false;
 const geom=routeGeometry(detail.route);
 const labels=detail.flags||[];
 const nearest=t=>{
  let lo=0,hi=speed.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(speed[mid].t<t)lo=mid+1;else hi=mid;}
  return lo>0&&Math.abs(speed[lo-1].t-t)<Math.abs(speed[lo].t-t)?lo-1:lo;
 };
 const getFrame=()=>speed[index];
 const atElapsed=ms=>{
  // Select the latest observed fix, never a future location.
  let low=0,high=speed.length-1;
  while(low<high){const mid=Math.ceil((low+high)/2);if(elapsed(speed[mid])<=ms)low=mid;else high=mid-1;}
  return low;
 };
 const refAt=()=>getFrame().speedMps===null?null:evaluateGpsReplayReference({activity:summary.activity,speedMps:getFrame().speedMps});
 // The first raw GPS fix has no speed. Open at the earliest scientifically
 // calculable sample, but never fabricate or interpolate unavailable samples.
 const firstCalculable=speed.findIndex(p=>p.speedMps!==null&&
   evaluateGpsReplayReference({activity:summary.activity,speedMps:p.speedMps}).count>0);
 if(firstCalculable>0)index=firstCalculable;
 const bodySvg=ref=>{
  const v=BODY_REGION_VIEWS.find(x=>x.key===view)||BODY_REGION_VIEWS[0];
  const paths=v.paths.map(([id,d])=>{
   const row=gpsReplayRowForBody(ref?.rows,id);
   const tint=palette(row);
   return '<g class="gd-reference-stack"><path tabindex="0" role="button" aria-label="'+esc(names[id])+'" data-body-region="'+id+'" class="gd-body-path'+(selected===id?' selected':'')+'" data-state="'+tint.state+'" style="fill:'+tint.fill+'" d="'+d+'"><title>'+esc(names[id])+'</title></path>'+referenceReliefOverlays(d,'gd',tint.state)+'</g>';
  }).join('');
  return '<svg class="gd-body" viewBox="70 10 160 430" role="group" aria-label="'+v.title+'の部位別文献参考値">'
    +'<defs>'+referenceReliefDefs('gd')+bodyReferenceSilhouetteClipDef(v,'gd')+'</defs><g class="gd-body-silhouette">'+v.silhouette+'</g>'+'<g clip-path="url(#gd-silhouette-clip)">'+paths+'</g>'+(showBodyNumbers?renderBodyReferenceLabels(v,ref?.rows||[]):'')+'</svg>';
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
  const top=speed.reduce((max,p)=>p.speedMps===null?max:Math.max(max,p.speedMps),1)*3.6;
  const stride=Math.max(1,Math.ceil(n/180)),paths=[];
  let line=[];
  for(let i=0;i<n;i++){
   const p=speed[i];
   if(p.speedMps===null){
    if(line.length>1)paths.push(svgLine(line));
    line=[];continue;
   }
   const atEnd=i===n-1||speed[i+1]?.speedMps===null;
   if(i%stride===0||line.length===0||atEnd)line.push([5+(i/(n-1))*690,61-53*(p.speedMps*3.6/top)]);
   if(atEnd){if(line.length>1)paths.push(svgLine(line));line=[];}
  }
  const ix=5+(index/(n-1))*690;
  return '<svg class="gd-speed-svg" viewBox="0 0 700 70" role="img" aria-label="GPS速度変化"><path d="M5 61H695" stroke="#418093" stroke-width="1"/>'
   +paths.map(path=>'<path d="'+path+'" stroke="#46d9dc" stroke-width="2.5" fill="none" stroke-linejoin="round"/>').join('')
   +'<path d="M'+ix.toFixed(2)+' 3 V63" stroke="#ffc47e" stroke-width="2" stroke-dasharray="3 3"/></svg>';
 };
 function render(){
  const frame=getFrame(),ref=refAt();
  const v=gpsReplayRowForBody(ref?.rows,selected);
  const text=v?.calculationState==='CALCULATED'&&Number.isFinite(v.value)?v.value.toFixed(1):'—';
  const diff=text==='—'?'':'基準との差 '+(v.value>=100?'+':'')+(v.value-100).toFixed(1);
  const speedText=Number.isFinite(frame.speedMps)?(frame.speedMps*3.6).toFixed(1):'—';
  const note=labels.find(f=>Math.abs(f.t-frame.t)<=1500);
  host.innerHTML='<section class="gd-root" aria-label="GPS動的結果">'
   +'<header class="gd-head"><div class="gd-heading"><a href="#/result?gps='+encodeURIComponent(summary.id)+'" class="gd-back" style="display:grid;place-items:center;color:inherit;text-decoration:none" aria-label="通常結果に戻る">‹</a><div><div class="gd-eyebrow">DYNAMIC RESULT / GPS</div><h1>動的結果</h1><p class="gd-head-sub">'+esc(summary.date)+'　'+esc(types[summary.activity])+'</p></div></div><div class="gd-tag">文献参考値の変化</div></header>'
   +'<div class="gd-metrics"><div class="gd-metric"><span>経過時間</span><strong>'+time(elapsed(frame))+'</strong></div><div class="gd-metric"><span>走行距離</span><strong>'+frame.km.toFixed(2)+' <em>km</em></strong></div><div class="gd-metric"><span>GPS速度</span><strong>'+speedText+' <em>km/h</em></strong></div></div>'
   +'<div class="gd-main"><section class="gd-panel"><header class="gd-panel-head"><strong>12部位の変化</strong><div class="gd-tabs">'
   +BODY_REGION_VIEWS.map(v=>'<button data-view="'+v.key+'" aria-pressed="'+(v.key===view)+'">'+v.title+'</button>').join('')+'</div></header>'
   +'<div class="gd-stage">'+bodySvg(ref)+'</div><div class="gd-panel-foot"><span>'+esc(names[selected])+'</span><span class="gd-value">'+text+'</span></div>'
   +'<div class="gd-body-extra"><span class="gd-body-diff">'+diff+'</span><button type="button" data-body-label-toggle aria-pressed="'+showBodyNumbers+'">'+(showBodyNumbers?'図の数値を隠す':'図に数値を表示')+'</button></div></section>'
   +'<section class="gd-panel"><header class="gd-panel-head"><strong>コース軌跡</strong><small>⚑ '+labels.length+' 地点</small></header>'
   +'<div class="gd-stage">'+courseSvg()+'</div><div class="gd-panel-foot"><span>現在地点</span><span>'+frame.km.toFixed(2)+' km</span></div></section></div>'
   +'<div class="gd-palette-legend" aria-label="部位内基準100を中心とした連続した色の変化"><span>100より低い</span><div class="gd-palette-track" style="background:'+BODY_REFERENCE_GRADIENT+'"><i></i></div><span>100より高い</span></div>'
   +'<section class="gd-speed-block"><div class="gd-speed-head"><strong>速度の変化</strong><small>シークバー・コース・人体図が連動</small></div>'
   +speedSvg()+'<div class="gd-controls"><button data-play class="gd-play">'+(playing?'一時停止':'▶ 再生')+'</button>'
   +'<input class="gd-scrub" data-seek type="range" min="0" max="'+(speed.length-1)+'" value="'+index+'" aria-label="再生位置"/>'
   +'<span class="gd-duration">'+time(elapsed(frame))+' / '+time(duration)+'</span></div>'
   +(note?'<div class="gd-flag-note">⚑ '+esc(note.note||'フラッグ地点')+'</div>':'')
   +'<p class="gd-note">人体図は速度条件に対応する文献参考値です。個人の身体負荷や損傷リスクの実測値ではありません。灰色は計算不能です。GPS欠損中の参考値は補完しません。</p></section></section>';
  host.querySelector('[data-body-label-toggle]')?.addEventListener('click',()=>{showBodyNumbers=!showBodyNumbers;render();});
  host.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;selected=(BODY_REGION_VIEWS.find(v=>v.key===view)?.paths[0]||['BA-DISP-014'])[0];render();}));
  host.querySelectorAll('[data-body-region]').forEach(b=>{
   const select=()=>{selected=b.dataset.bodyRegion;render();};
   b.addEventListener('click',select);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}});
  });
  host.querySelectorAll('[data-jump-flag]').forEach(b=>{
   const jump=()=>{index=nearest(labels[Number(b.dataset.jumpFlag)].t);playElapsed=elapsed(getFrame());render();};
   b.addEventListener('click',jump);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();jump();}});
  });
  host.querySelector('[data-seek]')?.addEventListener('input',e=>{index=Number(e.target.value);playElapsed=elapsed(getFrame());render();});
  host.querySelector('[data-play]')?.addEventListener('click',()=>{
   playing=!playing;
   if(playing){
    playElapsed=elapsed(getFrame());
    timer=setInterval(()=>{
     playElapsed=Math.min(duration,playElapsed+250);
     const nextIndex=playElapsed>=duration?speed.length-1:atElapsed(playElapsed);
     const changed=nextIndex!==index;
     index=nextIndex;
     if(playElapsed>=duration){playing=false;clearInterval(timer);timer=null;}
     if(changed||!playing)render();
    },250);
   }else{clearInterval(timer);timer=null;}
   render();
  });
 }
 render();
 return {ok:true,dispose:()=>{if(timer!==null)clearInterval(timer);timer=null;playing=false;}};
}
