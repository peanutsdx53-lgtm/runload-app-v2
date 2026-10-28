/* Approved consultation / sharing experience E. No mutations of science, GPS or record stores. */
import {BODY_REGION_VIEWS} from '../assets/bodyRegionVisuals.js';
import {REGIONS} from './bodyContextExperience.js';
import {calculateActivityReference} from '../core/activity/activityReference.js';
import {bodyReferenceColor,bodyReferenceRow,calculatedReference,bodyReferenceSilhouetteClipDef} from './bodyReferencePresentation.js';
const MARKUP = "<div class=\"cp-breadcrumb\">ホーム　/　クイックアクセス　/　相談・共有</div><header class=\"cp-head\"><div><h1>相談・共有</h1><p>アプリに記録した内容を整理して、指導者などに伝えるためのレポートを作成します。</p></div></header>\n<nav aria-label=\"画面切り替え\" class=\"cp-mobile-switch\"><button class=\"active\" data-switch=\"edit\" type=\"button\">編集する</button><button data-switch=\"preview\" type=\"button\">プレビューを見る</button></nav>\n<div class=\"cp-workspace\"><div class=\"cp-edit\">\n<section class=\"cp-panel\"><div class=\"cp-panel-head\"><span class=\"cp-step\">1</span><h2>共有する内容を決める</h2></div><p class=\"cp-description\">対象を選択すると、標準の共有項目を自動選択します。</p><div class=\"cp-mode-grid\"><button class=\"cp-mode-button active\" data-mode-button=\"single\" type=\"button\"><span>◉　1回の運動</span><small>1件の活動を詳しく伝える</small></button><button class=\"cp-mode-button\" data-mode-button=\"period\" type=\"button\"><span>▦　一定期間</span><small>記録や状態の推移を伝える</small></button></div><div style=\"margin-top:15px\"><label class=\"cp-label\" for=\"cp-target\">対象の記録</label><select class=\"cp-select\" id=\"cp-target\"></select></div></section>\n<section class=\"cp-panel\"><div class=\"cp-panel-head\"><span class=\"cp-step\">2</span><h2>共有する情報を選択</h2></div><p class=\"cp-description\">標準項目を選択済みです。必要な項目だけに変更できます。</p><div class=\"cp-item-grid\"><label class=\"cp-check\"><input checked=\"\" data-share=\"summary\" type=\"checkbox\"/>運動記録の概要</label><label class=\"cp-check\"><input checked=\"\" data-share=\"rof\" type=\"checkbox\"/>ROF-J 疲労感</label><label class=\"cp-check\"><input checked=\"\" data-share=\"condition\" type=\"checkbox\"/>コンディション</label><label class=\"cp-check\"><input checked=\"\" data-share=\"body\" type=\"checkbox\"/>人体図・12部位参考値と説明</label><label class=\"cp-check\"><input checked=\"\" data-share=\"course\" type=\"checkbox\"/>走行条件</label><label class=\"cp-check\"><input checked=\"\" data-share=\"notes\" type=\"checkbox\"/>本人の気付き</label><label class=\"cp-check\" data-period-toggle=\"\" hidden=\"\"><input checked=\"\" data-share=\"trend\" type=\"checkbox\"/>期間中の推移</label></div><div class=\"cp-sensitive\"><strong>慎重に扱う情報は初期状態で含めません</strong>GPS詳細軌跡・個人プロフィール・身体の違和感に関する個別メモは、明示的な追加選択が必要です。</div></section>\n<section class=\"cp-panel\"><div class=\"cp-panel-head\"><span class=\"cp-step\">3</span><h2>指導者に伝えたいこと</h2></div><div class=\"cp-text-group\"><label><span class=\"cp-label\">今回共有する目的</span><textarea class=\"cp-field\" id=\"cp-purpose\" maxlength=\"1200\" placeholder=\"何を共有したいかを入力\"></textarea></label><label><span class=\"cp-label\">自分で気になっていること</span><textarea class=\"cp-field\" id=\"cp-observation\" maxlength=\"1200\" placeholder=\"気になっていることを入力\"></textarea></label><label><span class=\"cp-label\">指導者に確認・相談したいこと</span><textarea class=\"cp-field\" id=\"cp-question\" maxlength=\"1200\" placeholder=\"確認したいことを入力\"></textarea></label></div><p class=\"cp-note\">入力内容はレポートのプレビューに反映されます。</p></section>\n</div><section class=\"cp-preview-panel\"><div class=\"cp-preview-top\"><div><h2>印刷・PDFプレビュー</h2><p>A4縦　|　3ページ構成　|　出力前に内容を確認</p></div><div class=\"cp-preview-actions\"><button class=\"cp-button\" id=\"cp-show-full\" type=\"button\">全体を確認</button><button class=\"cp-button primary\" id=\"cp-print\" type=\"button\">印刷 / PDF</button></div></div><div class=\"cp-demo-banner\">端末の保存済み記録からレポートを作成します。共有先への自動送信はしません。</div><div class=\"cp-paper-stack\" id=\"cp-report\"><div class=\"cp-paper-scale\"><article aria-label=\"共有レポート1ページ目\" class=\"cp-paper\"><div class=\"cp-report-head\"><div><div class=\"cp-report-kicker\">ACTIVITY / SHARE REPORT</div><h2>活動記録・相談共有レポート</h2><p class=\"cp-report-sub\">活動記録と相談したい内容</p></div><div class=\"cp-report-mark\"><span class=\"cp-mini-pill\" data-report-mode=\"\">1回の運動</span><div></div><div></div></div></div>\n<section class=\"cp-section\"><div class=\"cp-section-heading\"><b>01</b> 共有・相談の目的</div><div class=\"cp-purpose\" data-report-purpose=\"\">（入力なし）</div></section>\n<section class=\"cp-section\" data-output-section=\"summary\"><div class=\"cp-section-heading\"><b>02</b> <span data-report-overview-label=\"\">運動記録の概要</span></div><div class=\"cp-facts\"><div class=\"cp-fact\"><span class=\"k\" data-metric1-name=\"\">活動種別</span><div class=\"v\" data-metric1-val=\"\">—</div></div><div class=\"cp-fact\"><span class=\"k\" data-metric2-name=\"\">距離</span><div class=\"v\" data-metric2-val=\"\">—</div></div><div class=\"cp-fact\"><span class=\"k\" data-metric3-name=\"\">運動時間</span><div class=\"v\" data-metric3-val=\"\">—</div></div><div class=\"cp-fact\"><span class=\"k\" data-metric4-name=\"\">平均ペース</span><div class=\"v\" data-metric4-val=\"\">—</div></div></div><p class=\"cp-summary-strip\" data-activity-source=\"\">取得方法：手入力</p></section>\n<section class=\"cp-section\" data-output-section=\"rof-condition\"><div class=\"cp-section-heading\"><b>03</b> 疲労感とコンディション</div><div class=\"cp-wellbeing-grid\"><div class=\"cp-wellbeing\" data-output-section=\"rof\"><h4 data-rof-heading=\"\">運動前後の疲労感（ROF-J）</h4><div class=\"cp-fatigue\"><div>運動前<div class=\"cp-bubble\">—</div></div><span style=\"font-size:22px\">→</span><div>運動後<div class=\"cp-bubble orange\">—</div></div></div></div><div class=\"cp-wellbeing\" data-output-section=\"condition\"><h4>本人の生活・コンディション記録</h4><p>未記録</p></div></div></section>\n<section class=\"cp-section\" data-output-section=\"notes\"><div class=\"cp-section-heading\"><b>04</b> 本人の気付き・指導者への質問</div><div class=\"cp-narrative\"><h4>本人が気になっていること</h4><p data-report-observation=\"\">（入力なし）</p></div><div class=\"cp-narrative\"><h4>確認・相談したいこと</h4><p data-report-question=\"\">（入力なし）</p></div></section>\n<div class=\"cp-footer\"><span>記録・本人の申告・文献参考値は区別して記載しています。</span><span class=\"number\">1 / 2</span></div></article></div><div class=\"cp-paper-scale\"><article aria-label=\"共有レポート2ページ目\" class=\"cp-paper\"><div class=\"cp-report-head\"><div><div class=\"cp-report-kicker\">ACTIVITY / REFERENCE</div><h2>活動の詳細・参考情報</h2><p class=\"cp-report-sub\">運動記録に対応する参考情報</p></div><div class=\"cp-report-mark\"><span class=\"cp-mini-pill\" data-report-mode=\"\">1回の運動</span><div></div></div></div>\n<section class=\"cp-section\" data-output-section=\"body\"><div class=\"cp-section-heading\"><b>05</b> 人体図・12部位の参考値</div><div class=\"cp-science-grid\"><div class=\"cp-body-figures\"></div><div class=\"cp-part-columns\"><table class=\"cp-part-table\"><thead><tr><th>部位</th><th>参考値</th></tr></thead><tbody></tbody></table><table class=\"cp-part-table\"><thead><tr><th>部位</th><th>参考値</th></tr></thead><tbody></tbody></table></div></div><div class=\"cp-science-meaning\"><strong>参考値の読み方</strong><span>各部位自身の基準を100とする文献参考値です。部位同士の大小比較や、実測された身体負荷・傷害リスクを示すものではありません。</span></div><div class=\"cp-info-note\"><strong></strong><br/>対象の保存済み記録に対応する参考値を表示します。算出できない部位は「—」と理由を示します。</div></section>\n<section class=\"cp-section cp-period-original\" data-output-section=\"trend\"><div class=\"cp-section-heading\"><b>09</b> 運動記録の推移（期間レポート）</div><div class=\"cp-trend-holder\"></div><p class=\"cp-txtmeta\">縦軸：距離（km）／横軸：記録日。未記録日は0kmとして扱いません。</p></section>\n<div class=\"cp-footer\"><span>記録の出所と文献参考値は区別して記載しています。</span><span class=\"number\">2 / 2</span></div></article></div><div class=\"cp-paper-scale\"><article aria-label=\"共有レポート3ページ目\" class=\"cp-paper\"><div class=\"cp-report-head\"><div><div class=\"cp-report-kicker\">ACTIVITY / EXPLANATION</div><h2>参考値の読み方・共有条件</h2><p class=\"cp-report-sub\">算出方法・記録の取得元・適用範囲を確認するための補足</p></div><div class=\"cp-report-mark\"><span class=\"cp-mini-pill\" data-report-mode=\"\">1回の運動</span><div></div></div></div><section class=\"cp-section\" data-output-section=\"body\">\n<div class=\"cp-section-heading\"><b>06</b> 算出値・回答値の見方</div>\n<div class=\"cp-explain-lead\"><strong>算出値・回答値の意味を区別して確認できます。</strong><p>運動の計算値、ROF-Jの回答、生活記録、科学的な文献参考値は、それぞれ意味と利用条件が異なります。</p></div>\n<div class=\"cp-explain-grid\">\n<div class=\"cp-explain-card\"><div class=\"cp-explain-title\"><strong>平均ペース</strong><span>記録から算出</span></div><div class=\"cp-explain-formula\">運動時間 ÷ 距離</div><p>1kmあたりの所要時間です。入力された距離と運動時間に基づく計算であり、身体能力の評価ではありません。</p></div>\n<div class=\"cp-explain-card\"><div class=\"cp-explain-title\"><strong>疲労感の変化（ROF-J）</strong><span>本人の回答</span></div><div class=\"cp-explain-formula\">運動後 − 運動前</div><p>0〜10の尺度で本人が回答した疲労感の差です。身体組織の負荷量や医学的な検査値ではありません。</p></div>\n<div class=\"cp-explain-card\"><div class=\"cp-explain-title\"><strong>在床時間</strong><span>生活記録から算出</span></div><div class=\"cp-explain-formula\">起床時刻と就床時刻の差</div><p>時刻の入力がある場合に計算します。睡眠を実際に測定した時間とは区別して扱います。</p></div>\n<div class=\"cp-explain-card\"><div class=\"cp-explain-title\"><strong>12部位の文献参考値</strong><span>科学的参考情報</span></div><div class=\"cp-explain-formula\">各部位自身の基準を100とした比較</div><p>単独活動・保存済み記録など、元モデルの条件が成立するときだけ算出できます。部位間の負荷順位や傷害リスクを表しません。</p></div>\n</div>\n<div class=\"cp-method-note\"><strong>算出・表示の条件</strong><p>活動種別が未選択の場合、走歩混合の場合、根拠とする速度範囲から外れる場合は、対応する12部位参考値を作りません。異なる活動の参考値を平均・合算することもありません。</p></div>\n</section><section class=\"cp-section\" data-output-section=\"course\"><div class=\"cp-section-heading\"><b>07</b> 走行条件・補足情報</div><div class=\"cp-conditions\"><div class=\"cp-condition\"><small>走行条件</small><strong>—</strong></div><div class=\"cp-condition\"><small>コース</small><strong>—</strong></div><div class=\"cp-condition\"><small>使用品</small><strong>—</strong></div></div><p class=\"cp-txtmeta\">標高・勾配を取得していない場合は、計測した値として記載しません。</p></section><section class=\"cp-section\"><div class=\"cp-section-heading\"><b data-report-last-index=\"\">08</b> 記録の出所と共有範囲</div><div class=\"cp-privacy\">距離・時間などの入力値と、それを基に計算した値は区別して記載します。欠測をゼロで補わず、取得方法や適用範囲が分からない情報は数値化しません。GPS軌跡・プロフィールなどは本人が選択しない限り含めず、相手先への自動送信も行いません。</div></section><div class=\"cp-footer\"><span>各数値は出所と適用条件を区別して共有します。</span><span class=\"number\">3 / 3</span></div></article></div><div class=\"cp-paper-scale cp-period-only\"><article aria-label=\"共有レポート4ページ目\" class=\"cp-paper\"><div class=\"cp-report-head\"><div><div class=\"cp-report-kicker\">ACTIVITY / HISTORY</div><h2>期間中の活動の推移</h2><p class=\"cp-report-sub\">期間中の距離の変化</p></div><div class=\"cp-report-mark\"><span class=\"cp-mini-pill\" data-report-mode=\"\">一定期間</span><div></div></div></div><section class=\"cp-section\" data-output-section=\"trend\"><div class=\"cp-section-heading\"><b>09</b> 運動記録の推移（期間レポート）</div><div class=\"cp-trend-holder\"></div><p class=\"cp-txtmeta\">縦軸：距離（km）／横軸：記録日。未記録日は0kmとして扱いません。</p></section><div class=\"cp-footer\"><span>記録の出所と文献参考値は区別して記載しています。</span><span class=\"number\">4 / 4</span></div></article></div></div></section></div>\n";
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const isValid=r=>r&&typeof r.id==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.distanceKm)&&r.distanceKm>0;
const secs=r=>r.source==='manual'?r.durationSeconds:r.activeSeconds;
const gait=r=>r.source==='manual'?({RUNNING:'ランニング',JOGGING:'ジョギング',WALK:'ウォーキング'}[r.draft?.activityGait]||'活動種別未選択'):({RUNNING:'ランニング',JOGGING:'ジョギング',WALK:'ウォーキング',MIXED:'走歩混在'}[r.activity]||'不明');
const pad=n=>String(n).padStart(2,'0');
const clock=n=>Number.isFinite(n)&&n>0?Math.floor(n/3600)?Math.floor(n/3600)+':'+pad(Math.floor(n%3600/60))+':'+pad(Math.floor(n%60)):Math.floor(n/60)+':'+pad(Math.floor(n%60)):'—';
const pace=r=>Number.isFinite(secs(r))&&r.distanceKm>0?clock(Math.round(secs(r)/r.distanceKm))+' /km':'—';
const dateLabel=s=>String(s||'').replace(/^(\d{4})-(\d{2})-(\d{2})$/,'$1/$2/$3');
const sorted=records=>(Array.isArray(records)?records:[]).filter(isValid).sort((a,b)=>b.date.localeCompare(a.date)||(b.createdAt||'').localeCompare(a.createdAt||''));
const formatDist=n=>Number.isFinite(n)?(Math.round(n*100)/100).toFixed(2)+' km':'—';
const isoLocal=d=>new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);
const periodStart=days=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-days+1);return isoLocal(d)};
export function consultationSources({manual,gps,conditions}={}){
 const entries=conditions?.canSave?conditions.entries:[];
 return {records:sorted([...(manual?.ok?manual.records:[]),...(gps?.ok?gps.records:[])]),conditions:Array.isArray(entries)?entries:[],errors:[!manual?.ok?manual?.reason||'手入力の保存記録を読み取れません':null,!gps?.ok?gps?.reason||'GPS保存記録を読み取れません':null,!conditions?.canSave?conditions?.reason||'コンディションを読み取れません':null].filter(Boolean)};
}
export function periodRecords(records,days=30,today=new Date()){
 const d=new Date(today);d.setHours(0,0,0,0);d.setDate(d.getDate()-Math.max(1,days)+1);
 const start=isoLocal(d),end=isoLocal(today);
 return sorted(records).filter(r=>r.date>=start&&r.date<=end);
}
export function trendSvg(records){
 const sortedItems=sorted(records).slice().reverse().slice(-12);
 if(!sortedItems.length)return '<p class="cp-txtmeta">対象期間に保存済みの運動記録はありません。</p>';
 const max=Math.max(...sortedItems.map(r=>r.distanceKm));
 const step=Math.max(1,Math.ceil(max/4)); const top=4*step;
 const X0=64,X1=603,Y0=136,Y1=38;
 const points=sortedItems.map((r,i)=>({x:X0+(i+.5)*(X1-X0)/sortedItems.length,y:Y0-(r.distanceKm/top)*(Y0-Y1),r}));
 const lines=[0,1,2,3,4].map(i=>{const y=Y0-(i/4)*(Y0-Y1);return '<line x1="64" x2="603" y1="'+y+'" y2="'+y+'" stroke="#dce8ed"/><text x="53" y="'+(y+4)+'" text-anchor="end" font-size="11" fill="#567783">'+i*step+'</text>';}).join('');
 const xs=points.map(p=>'<text x="'+p.x.toFixed(1)+'" y="161" text-anchor="middle" font-size="'+(points.length>8?8.7:11)+'" fill="#587984">'+esc(p.r.date.slice(5).replace('-','/'))+'</text>').join('');
 const dots=points.map(p=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="4.2" fill="#079cab" stroke="white" stroke-width="1.5"/><text text-anchor="middle" x="'+p.x.toFixed(1)+'" y="'+Math.max(26,p.y-9).toFixed(1)+'" font-size="10.5" font-weight="750" fill="#196b79">'+p.r.distanceKm.toFixed(1)+'</text>').join('');
 return '<svg class="cp-trend" viewBox="0 0 630 172" role="img" aria-label="保存済み運動記録の距離の推移。縦軸は距離km、横軸は記録日"><text x="24" y="19" class="cp-trend-axis-title">距離（km）</text>'+lines+'<path fill="none" stroke="#078f9f" stroke-width="3" d="'+points.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ')+'"/>'+dots+xs+'</svg>';
}
export function renderConsultation(){return '<section id="runload-consultation" aria-label="相談・共有">'+MARKUP+'</section>';}
function figures(rows){return BODY_REGION_VIEWS.map((v,i)=>{
 const prefix='cpsvg'+i;
 const clip=bodyReferenceSilhouetteClipDef(v,prefix);
 const paths=v.paths.map(([id,path])=>{
  const row=bodyReferenceRow(rows,id),color=bodyReferenceColor(row);
  return '<path d="'+path+'" fill="'+color.fill+'" fill-opacity=".98" stroke="#e7f1f2" stroke-width="1.15" aria-label="'+esc(REGIONS.find(r=>r.id===id)?.name||id)+'"/>';
 }).join('');
 return '<figure class="cp-body-view"><svg viewBox="70 10 160 430" role="img" aria-label="'+esc(v.title)+'"><defs>'+clip+'</defs><g fill="#b2c4cb" clip-path="url(#'+prefix+'-silhouette-clip)">'+v.silhouette+'</g><g clip-path="url(#'+prefix+'-silhouette-clip)">'+paths+'</g></svg><figcaption>'+esc(v.title)+'</figcaption></figure>';
}).join('')}
function tableRows(rows){return REGIONS.map(r=>{const row=bodyReferenceRow(rows,r.id);return '<tr><td>'+esc(r.name)+'</td><td>'+ (calculatedReference(row)?row.value.toFixed(1):'—') +'</td></tr>';});}
function setText(root,sel,value){root.querySelectorAll(sel).forEach(el=>el.textContent=String(value??'—'));}
function setHtml(root,sel,value){root.querySelectorAll(sel).forEach(el=>el.innerHTML=value);}
function checkbox(root,key){return !!root.querySelector('[data-share="'+key+'"]')?.checked;}
export function mountConsultation(host,source){
 if(!host)return;
 const records=source.records,conditions=source.conditions;
 const panel=host.querySelector('.cp-preview-panel'),app=host.closest('.cp-app');
 const target=host.querySelector('#cp-target'),noteFields=['purpose','observation','question'];
 const state={mode:'single',periodDays:30,chosen:records[0]?.id||''};
 const select=()=>records.find(r=>r.id===state.chosen)||null;
 const period=()=>periodRecords(records,state.periodDays);
 const lastCondition=date=>state.mode==='single'?conditions.find(c=>c.date===date)||null:conditions.filter(c=>c.date<=isoLocal(new Date())&&c.date>=periodStart(state.periodDays)).sort((a,b)=>b.date.localeCompare(a.date))[0]||null;
 const chosenScience=()=>{const r=state.mode==='single'?select():period().find(x=>x.source==='manual'&&x.draft?.runningFormat!=='RUN_WALK');return r?.source==='manual'?r:null;};
 const draw=()=>{
  const group=state.mode==='single'?(select()?[select()]:[]):period();
  const single=state.mode==='single'?select():null, newest=group[0]||null;
  const scienceRun=chosenScience();
  const ref=scienceRun?calculateActivityReference(scienceRun):null;
  const rows=ref?.rows||[]; const count=rows.filter(calculatedReference).length;
  const sumDist=group.reduce((a,r)=>a+r.distanceKm,0),sumSeconds=group.reduce((a,r)=>a+(Number.isFinite(secs(r))?secs(r):0),0);
  const label=single?single.date:state.periodDays===7?'直近7日間':'直近30日間';
  setText(host,'[data-report-date]',label);
  setText(host,'[data-report-mode]',state.mode==='single'?'1回の運動':'一定期間');
  const pairs=single?[['活動種別',gait(single)],['距離',formatDist(single.distanceKm)],['運動時間',clock(secs(single))],['平均ペース',pace(single)]]:state.mode==='period'?[['活動回数',group.length+' 回'],['合計距離',group.length?formatDist(sumDist):'—'],['活動時間',group.length?clock(sumSeconds):'—'],['対象期間',state.periodDays+' 日間']]:[['活動種別','—'],['距離','—'],['運動時間','—'],['平均ペース','—']];
  pairs.forEach((a,i)=>{setText(host,'[data-metric'+(i+1)+'-name]',a[0]);setText(host,'[data-metric'+(i+1)+'-val]',a[1]);});
  setText(host,'[data-report-overview-label]',state.mode==='single'?'運動記録の概要':'期間中の運動記録');
  const byType=group.reduce((acc,r)=>{const k=gait(r);acc[k]=(acc[k]||0)+1;return acc;},{});
  setText(host,'[data-activity-source]',single?(single.source==='manual'?'取得方法：手入力':'取得方法：GPS測定'):'保存済み記録の内訳：'+(group.length?Object.entries(byType).map(([k,n])=>k+' '+n+'件').join('・'):'対象記録なし')+'。距離・時間は活動の実績であり、12部位参考値の合計ではありません。');
  const rof=state.mode==='single'?single:group.find(r=>r.source==='manual'&&r.rofBefore!==null&&r.rofAfter!==null);
  const hasRof=rof&&rof.source==='manual'&&Number.isInteger(rof.rofBefore)&&Number.isInteger(rof.rofAfter);
  setText(host,'[data-rof-heading]',hasRof?'運動前後の疲労感（ROF-J：'+dateLabel(rof.date)+'）':'運動前後の疲労感（ROF-J）');
  const bubbles=host.querySelectorAll('.cp-bubble');if(bubbles[0])bubbles[0].textContent=hasRof?String(rof.rofBefore):'—';if(bubbles[1])bubbles[1].textContent=hasRof?String(rof.rofAfter):'—';
  const life=lastCondition(single?.date||newest?.date||isoLocal(new Date()));
  const lifeText=life?('記録日：'+dateLabel(life.date)+'／その日の調子：'+(life.feeling||'未記録')+'／'+(Number.isInteger(life.sleepMinutes)?(life.sleepSource==='clock'?'在床時間':'記録された時間')+'：'+Math.floor(life.sleepMinutes/60)+'時間'+pad(life.sleepMinutes%60)+'分':'時間未記録')):'該当する生活コンディションの記録はありません。';
  setText(host,'.cp-wellbeing[data-output-section="condition"] p',lifeText);
  setText(host,'.cp-wellbeing[data-output-section="condition"] h4','本人の生活・コンディション記録');
  setHtml(host,'.cp-body-figures',figures(rows));
  const tr=tableRows(rows),tables=host.querySelectorAll('.cp-part-table tbody');tables.forEach((tb,i)=>{tb.innerHTML=tr.slice(i*6,i*6+6).join('');});
  const info=host.querySelector('[data-output-section="body"] .cp-info-note');if(info)info.textContent=count?('対象記録：'+dateLabel(scienceRun.date)+'／'+gait(scienceRun)+'／'+count+'/12部位を算出。各部位自身の文献基準を100とする参考値であり、傷害リスクではありません。'):(scienceRun?'活動種別または文献の適用速度範囲により、12部位参考値は算出対象外です。':'対応する保存済み手入力の単独活動がないため、12部位参考値は表示できません。');
  const memo=single?.source==='manual'?single:scienceRun||newest;
  const conditionsList=host.querySelectorAll('.cp-condition strong');
  const d=memo?.source==='manual'?memo.draft||{}:{};
  const surface=d.primarySurface||d.surfaceMode;
  if(conditionsList[0])conditionsList[0].textContent=surface&&surface!=='UNKNOWN'?surface:'未記録';
  if(conditionsList[1])conditionsList[1].textContent=memo?.courseName||'未記録';
  if(conditionsList[2])conditionsList[2].textContent=memo?.shoeName||'未記録';
  setHtml(host,'.cp-trend-holder',trendSvg(group));
  host.querySelector('[data-period-toggle]').hidden=state.mode!=='period';
  host.querySelectorAll('.cp-period-only').forEach(e=>e.classList.toggle('cp-printed',state.mode==='period'));
  host.querySelector('.cp-preview-top p').textContent='A4縦・'+(state.mode==='single'?3:4)+'ページを基準に表示（内容により増ページ）';
  const sheets=[...host.querySelectorAll('.cp-paper-scale')];
  const showSheets=[true, checkbox(host,'body')||(state.mode==='period'&&checkbox(host,'trend')&&false),true,state.mode==='period'&&checkbox(host,'trend')];
  sheets.forEach((e,i)=>{e.style.display=showSheets[i]?'':'none';});
  const countSheets=showSheets.filter(Boolean).length;let pageNumber=0;
  sheets.forEach((e,i)=>{if(showSheets[i]){pageNumber++;e.querySelector('.cp-footer .number').textContent=pageNumber+' / '+countSheets;}});
  const sections=['summary','rof','condition','body','course','notes','trend'];
  sections.forEach(k=>host.querySelectorAll('[data-output-section="'+k+'"]').forEach(e=>e.classList.toggle('cp-hidden',!checkbox(host,k)||(k==='trend'&&state.mode!=='period'))));
  const rc=host.querySelector('[data-output-section="rof-condition"]');if(rc)rc.classList.toggle('cp-hidden',!checkbox(host,'rof')&&!checkbox(host,'condition'));
  host.querySelectorAll('.cp-check').forEach(e=>e.classList.toggle('is-off',!e.querySelector('input')?.checked));
  const values=Object.fromEntries(noteFields.map(k=>[k,host.querySelector('#cp-'+k).value.trim()]));
  noteFields.forEach(k=>setText(host,'[data-report-'+k+']',values[k]||'（入力なし）'));
  const banner=host.querySelector('.cp-demo-banner');if(banner)banner.textContent=source.errors.length?'保存データの一部を読み取れません：'+source.errors.join('／'):'端末内の保存済み記録と本人の入力から作成しています。選択した情報だけを印刷・PDFに含めます。';
  updateScale();
 };
 const updateScale=()=>{const width=panel.clientWidth-(window.innerWidth<=800?22:35);const s=Math.max(.30,Math.min(.88,width/794));host.style.setProperty('--paper-scale',s.toFixed(4));};
 const options=()=>{const old=state.chosen;target.innerHTML='';if(state.mode==='single'){
  if(!records.length)target.add(new Option('保存された運動記録がありません',''));
  else records.forEach(r=>target.add(new Option(dateLabel(r.date)+'　'+gait(r)+'（'+(r.source==='manual'?'手入力':'GPS')+'）',r.id)));
  state.chosen=records.some(r=>r.id===old)?old:records[0]?.id||'';
 }else{target.add(new Option('直近30日間','30'));target.add(new Option('直近7日間','7'));target.value=String(state.periodDays);}
 target.value=state.mode==='single'?state.chosen:String(state.periodDays);};
 host.querySelectorAll('[data-mode-button]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.modeButton;app.dataset.modePreview=state.mode;host.querySelectorAll('[data-mode-button]').forEach(x=>x.classList.toggle('active',x===b));options();draw();}));
 host.querySelectorAll('[data-share]').forEach(c=>c.addEventListener('change',draw));
 noteFields.forEach(k=>host.querySelector('#cp-'+k)?.addEventListener('input',draw));
 target.addEventListener('change',()=>{if(state.mode==='single')state.chosen=target.value;else state.periodDays=Number(target.value)===7?7:30;draw();});
 host.querySelectorAll('[data-switch]').forEach(b=>b.addEventListener('click',()=>{app.dataset.mobileView=b.dataset.switch;host.querySelectorAll('[data-switch]').forEach(x=>x.classList.toggle('active',x===b));draw();window.scrollTo(0,0);}));
 host.querySelector('#cp-show-full').addEventListener('click',()=>{if(window.innerWidth<=800)app.dataset.mobileView='preview';host.querySelector('#cp-report')?.scrollIntoView({block:'start',behavior:'smooth'});draw();});
 host.querySelector('#cp-print').addEventListener('click',()=>{draw();window.print();});
 window.addEventListener('resize',updateScale,{signal:hostSignal(host)});
 app.dataset.mobileView='edit';app.dataset.modePreview='single';options();draw();
}
function hostSignal(host){ // Reuse one abort controller per mounted host; listeners never keep old page alive.
 if(!host._consultationAbort)host._consultationAbort=new AbortController();return host._consultationAbort.signal;
}
