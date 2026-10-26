import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {RESULT_STYLES} from './resultInlineStyles.js';
import {REGIONS} from './bodyContextExperience.js';
const clean=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=v=>v===null||v===undefined||String(v).trim()===''?null:Number.isFinite(Number(v))?Number(v):null;
const positive=v=>{const n=number(v);return n!==null&&n>0?n:null};
const format=(n,d=0)=>n===null||!Number.isFinite(n)?'—':n.toLocaleString('ja-JP',{minimumFractionDigits:d,maximumFractionDigits:d});
const icon=(name)=>({body:'◈',run:'↗',time:'◷',pace:'◉',fatigue:'♡',radar:'⬡',memo:'▤',save:'⇩',location:'⌁'})[name]||'◈';
export const OFFICIAL_NAMES=Object.freeze(REGIONS.map(r=>Object.freeze([r.id,r.name])));
export function mountResult(host,draft={},options={}){
 const fromSaved=options.saved===true&&typeof options.recordId==="string"&&options.recordId.length>0;
 const root=host.shadowRoot||host.attachShadow({mode:'open'});
 let chosen='BA-DISP-019',view='front',tab='body',picker=false;
 const distance=positive(draft.distance),h=number(draft.hours),m=number(draft.minutes),s=number(draft.seconds);
 const duration=h===null&&m===null&&s===null?null:(h??0)*60+(m??0)+(s??0)/60;
 const seconds=distance!==null&&duration>0?Math.round(duration*60/distance):null;
 const pace=seconds===null?'—':Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 const validRof=x=>{const n=number(x);return n!==null&&Number.isInteger(n)&&n>=0&&n<=10?n:null};
 const before=validRof(draft.rofBefore),after=validRof(draft.rofAfter);
 const hasInput=[distance,duration>0?duration:null,before,after,positive(draft.steps),draft.bodyObservation,draft.shoeName,draft.memo].some(x=>x!==null&&x!==undefined&&x!=='');
 const titleDate=hasInput?clean(draft.date||''):'記録未取得';
 const data=OFFICIAL_NAMES.map(([id,name])=>({id,name,value:null}));
 const current=()=>data.find(x=>x.id===chosen)||data[0];
 const selectedView=()=>BODY_REGION_VIEWS.find(x=>x.key===view)||BODY_REGION_VIEWS[0];
 const svgMap=()=>{const v=selectedView();return '<svg class="rv4-body-svg" viewBox="70 10 160 430" role="group" aria-label="'+v.title+'の身体図"><defs><linearGradient id="rv4skin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#22687e"/><stop offset="1" stop-color="#09283a"/></linearGradient></defs><g class="rv4-silhouette" fill="url(#rv4skin)">'+v.silhouette+'</g>'+v.paths.map(([id,path])=>{const name=data.find(r=>r.id===id)?.name||id;return '<path d="'+path+'" class="rv4-region '+(id===chosen?'selected':'')+'" data-region="'+id+'" tabindex="0" role="button" aria-label="'+clean(name)+'を表示" aria-pressed="'+(id===chosen)+'"><title>'+clean(name)+'</title></path>'}).join('')+'</svg>'};
 const chart=()=>{const labels=['距離','平均速度','走行時間','上り割合','歩数','運動後疲労感'];const p=(i,r)=>{const a=i*2*Math.PI/6-Math.PI/2;return (153+Math.cos(a)*r*83).toFixed(1)+','+(128+Math.sin(a)*r*83).toFixed(1)};return '<svg viewBox="0 0 306 267" class="rv4-radar" role="img" aria-label="比較する記録はありませんの六軸チャート">'+[.25,.5,.75,1].map(k=>'<polygon points="'+labels.map((_,i)=>p(i,k)).join(' ')+'" />').join('')+labels.map((l,i)=>'<line x1="153" y1="128" x2="'+p(i,1).split(',')[0]+'" y2="'+p(i,1).split(',')[1]+'"/><text x="'+p(i,1.27).split(',')[0]+'" y="'+p(i,1.27).split(',')[1]+'" text-anchor="middle">'+l+'</text>').join('')+'<text x="153" y="127" class="rv4-chart-empty" text-anchor="middle">比較する記録はありません</text><text x="153" y="144" class="rv4-chart-sub" text-anchor="middle">今後の記録を振り返れます</text></svg>'};
 const nav=()=>'<div class="rv4-mobile-tabs" role="group" aria-label="結果の表示切替">'+[['body','身体'],['fatigue','疲労感'],['radar','過去と比較']].map(([k,label])=>'<button type="button" data-tab="'+k+'" aria-pressed="'+(tab===k)+'" class="'+(tab===k?'active':'')+'">'+label+'</button>').join('')+'</div>';
 const body=()=>{const r=current();const v=selectedView();return '<section class="rv4-card rv4-body" data-pane="body"><div class="rv4-card-heading"><span class="rv4-icon">'+icon('body')+'</span><div><h2>速度と身体の反応</h2><p>部位別の参考値</p></div><span class="rv4-mini">未取得</span></div><div class="rv4-tone-legend"><span><i class="rv4-low"></i>基準より低い</span><span><i class="rv4-mid"></i>基準付近</span><span><i class="rv4-high"></i>基準より高い</span></div><div class="rv4-view-tabs">'+BODY_REGION_VIEWS.map(item=>'<button type="button" data-view="'+item.key+'" aria-pressed="'+(view===item.key)+'" class="'+(view===item.key?'active':'')+'">'+item.title+'</button>').join('')+'</div><div class="rv4-body-content"><div class="rv4-body-figure"><span class="rv4-orbit"></span>'+svgMap()+'<small>部位をタップして確認</small></div><div class="rv4-reading"><small>選択中の部位</small><h3>'+clean(r.name)+'</h3><div class="rv4-big-score">—</div><div class="rv4-score-caption">参考値はまだありません</div><div class="rv4-scale"><span class="rv4-scale-ref"></span></div><div class="rv4-scale-labels"><span>60</span><span>100</span><span>140</span></div><button type="button" class="rv4-picker" data-picker-toggle aria-expanded="'+picker+'">部位名から選ぶ <span>⌄</span></button></div></div>'+(picker?'<div class="rv4-choices">'+v.paths.map(([id])=>{const n=data.find(x=>x.id===id);return '<button type="button" data-region="'+id+'" class="'+(id===chosen?'active':'')+'">'+clean(n?.name||id)+'</button>'}).join('')+'</div>':'')+'<p class="rv4-disclaimer">参考値は各部位自身の基準100との関係を示します。色は増減の方向であり、危険度や部位間の順位ではありません。計算結果がある場合に色分けします。</p></section>'};
 const fatigue=()=>'<section class="rv4-card rv4-fatigue" data-pane="fatigue"><div class="rv4-card-heading"><span class="rv4-icon warm">'+icon('fatigue')+'</span><div><h2>疲労感の変化</h2><p>運動前と運動後（0〜10）</p></div></div><div class="rv4-fatigue-numbers"><div><small>運動前</small><strong>'+ (before??'—')+'</strong></div><span class="rv4-arrow">→</span><div><small>運動後</small><strong>'+(after??'—')+'</strong></div><div class="rv4-change"><small>変化</small><strong>'+(before!==null&&after!==null?(after-before>0?'+':'')+(after-before):'—')+'</strong></div></div><div class="rv4-tracks"><span style="width:'+(before===null?0:before*10)+'%"></span><span style="width:'+(after===null?0:after*10)+'%"></span></div><p class="rv4-caption">本人が回答した疲労感です。未回答は「—」で表示します。</p></section>';
 const radar=()=>'<section class="rv4-card rv4-history" data-pane="radar"><div class="rv4-card-heading"><span class="rv4-icon">'+icon('radar')+'</span><div><h2>過去と比較</h2><p>走行の特徴を見比べる</p></div></div>'+chart()+'<p class="rv4-caption">ほかの走行と比較する機能は準備中です。記録のない項目を推測して表示することはありません。</p></section>';
 const extras=()=>'<details class="rv4-details"><summary><span class="rv4-icon">'+icon('memo')+'</span><span><strong>その日の記録</strong><small>使用品・コース・メモ</small></span><b>⌄</b></summary><div class="rv4-extra-grid"><div><small>シューズ</small><strong>'+clean(draft.shoeName||'—')+'</strong></div><div><small>歩数</small><strong>'+(positive(draft.steps)!==null?format(positive(draft.steps))+' 歩':'—')+'</strong></div><div><small>上り割合</small><strong>'+(number(draft.upPercent)!==null?format(number(draft.upPercent))+'%':'—')+'</strong></div></div><div class="rv4-note"><small>メモ</small><p>'+clean(draft.memo||'記録がありません')+'</p></div></details>';
 const summary=()=>!hasInput?'走行記録がありません。':distance!==null&&duration>0?'距離と時間から平均ペースを確認できます。':'入力した内容を確認できます。';
 const hero=()=>'<section class="rv4-hero"><div class="rv4-hero-glow"></div><div class="rv4-hero-left"><small class="rv4-date">'+titleDate+'　<span>走行</span></small><div class="rv4-measures"><div class="rv4-distance"><small>距離</small><strong>'+format(distance,2)+'</strong><span>km</span></div><div class="rv4-secondary"><div><small>時間</small><strong>'+(duration>0?format(duration,0)+' 分':'—')+'</strong></div><div><small>平均ペース</small><strong>'+pace+' <em>/km</em></strong></div></div></div></div><div class="rv4-hero-report"><span>今回の走り</span><h2>'+summary()+'</h2><div class="rv4-today-chips"><span>運動前 <b>'+(before??'—')+'</b></span><span>運動後 <b>'+(after??'—')+'</b></span></div><small>'+(fromSaved?'この端末に保存した手入力記録':'保存前の入力内容')+'</small></div></section>';
 function draw(){
  root.querySelector('.rv4-app').innerHTML='<div class="rv4-frame"><header class="rv4-header"><div><h1>結果</h1></div><div class="rv4-actions"><button type="button" data-download '+(!(distance!==null&&duration>0)?'disabled':'')+'>画像で保存 ↓</button><button type="button" data-print>印刷</button></div></header><p class="rv4-notice">'+(fromSaved?'この端末に保存した手入力の走行記録です。身体の部位別の参考値は、まだ表示できません。':hasInput?'まだ保存していない入力内容です。身体の部位別の参考値は表示できません。':'保存された走行記録はまだありません。')+'</p>'+hero()+nav()+'<div class="rv4-grid" data-tab-state="'+tab+'">'+body()+'<div class="rv4-side">'+fatigue()+radar()+'</div></div>'+extras()+'</div>';
  root.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;const v=selectedView();if(!v.paths.some(x=>x[0]===chosen))chosen=v.paths[0][0];picker=false;draw()}));
  root.querySelectorAll('[data-region]').forEach(b=>{const select=()=>{chosen=b.dataset.region;draw()};b.addEventListener('click',select);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}})});
  // Accept taps on the SVG itself when a thin/nonconvex region is hit but the
  // browser targets the SVG container instead of its path.
  root.querySelector('.rv4-body-svg')?.addEventListener('click',e=>{
    if(e.target.closest?.('[data-region]'))return;
    const svg=e.currentTarget,point=svg.createSVGPoint();
    point.x=e.clientX;point.y=e.clientY;
    const transform=svg.getScreenCTM();
    if(!transform)return;
    const local=point.matrixTransform(transform.inverse());
    const parts=[...svg.querySelectorAll('.rv4-region')];
    let hit=parts.find(path=>path.isPointInFill(local));
    if(!hit){
      const distance=path=>{
        const b=path.getBBox();
        const dx=Math.max(b.x-local.x,0,local.x-(b.x+b.width));
        const dy=Math.max(b.y-local.y,0,local.y-(b.y+b.height));
        return Math.hypot(dx,dy);
      };
      const ranked=parts.map(path=>({path,d:distance(path)})).sort((a,b)=>a.d-b.d);
      if(ranked[0]?.d<=12)hit=ranked[0].path;
    }
    if(hit){chosen=hit.dataset.region;draw()}
  });
  // Invisible accessible tap targets supplement narrow multi-contour official paths;
  // no official region geometry or scientific data is modified.
  const liveSvg=root.querySelector('.rv4-body-svg');
  liveSvg?.querySelectorAll('.rv4-region').forEach(path=>{
    const b=path.getBBox();
    let best=null;
    const svgPoint=liveSvg.createSVGPoint();
    for(let yi=1;yi<=15;yi++)for(let xi=1;xi<=15;xi++){
      svgPoint.x=b.x+b.width*xi/16;svgPoint.y=b.y+b.height*yi/16;
      if(!path.isPointInFill(svgPoint))continue;
      const score=Math.hypot(svgPoint.x-(b.x+b.width/2),svgPoint.y-(b.y+b.height/2));
      if(!best||score<best.score)best={x:svgPoint.x,y:svgPoint.y,score};
    }
    if(!best)return;
    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
    dot.setAttribute('cx',String(best.x));dot.setAttribute('cy',String(best.y));
    dot.setAttribute('r','9');dot.setAttribute('fill','transparent');
    dot.setAttribute('stroke','none');dot.setAttribute('pointer-events','all');
    dot.setAttribute('data-tap-region',path.dataset.region);
    dot.setAttribute('aria-hidden','true');
    dot.style.cursor='pointer';
    dot.addEventListener('click',e=>{e.stopPropagation();chosen=path.dataset.region;draw()});
    liveSvg.append(dot);
  });
  root.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;draw()}));
  root.querySelector('[data-picker-toggle]')?.addEventListener('click',()=>{picker=!picker;draw()});
  root.querySelector('[data-print]')?.addEventListener('click',()=>window.print());
  root.querySelector('[data-download]')?.addEventListener('click',saveCard);
 }
 function saveCard(){
  if(distance===null||!(duration>0))return;
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=630;const c=canvas.getContext('2d');
  const fill=c.createLinearGradient(0,0,1200,630);fill.addColorStop(0,'#0e4158');fill.addColorStop(1,'#061622');c.fillStyle=fill;c.fillRect(0,0,1200,630);
  c.strokeStyle='#35d4da';c.lineWidth=3;c.strokeRect(38,38,1124,554);
  const t=(str,x,y,size,color='#effdff')=>{c.font='700 '+size+'px system-ui,sans-serif';c.fillStyle=color;c.fillText(str,x,y)};
  t('走行結果',70,100,28);t(clean(draft.date||''),70,148,20,'#9ecbd7');
  t('距離',70,205,22,'#9ecbd7');t(format(distance,2)+' km',65,333,100);
  t('時間  '+format(duration,0)+' 分',70,414,28);t('平均ペース  '+pace+' /km',70,465,28);
  t(fromSaved?'端末に保存した手入力記録':'まだ保存していない記録',70,553,20,'#9ecbd7');
  t('身体の部位別の参考値はまだありません',685,258,20,'#abd6de');
  t('疲労感  '+(before??'—')+' → '+(after??'—'),685,320,29,'#f6d7b4');
  /* No internal branding in the saved image. */
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='走行結果.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)},'image/png');
 }
 if(!root.querySelector('.rv4-app'))root.innerHTML='<style data-result-inline-styles>'+RESULT_STYLES+'</style><div class="rv4-app"></div>';
 draw();
}