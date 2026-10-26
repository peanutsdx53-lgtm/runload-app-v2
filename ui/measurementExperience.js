/* RunLoad v2 measurement UI. Preview states never start GPS, timers or storage. */
const STATES=Object.freeze(['ready','running','paused','confirm']);
const CLOCK={ready:'00:00:00',running:'00:32:16',paused:'00:32:16',confirm:'00:32:16'};
const DISTANCE={ready:'—',running:'5.21',paused:'5.21',confirm:'5.21'};
const PACE={ready:'—',running:'6:12',paused:'6:12',confirm:'6:12'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createMeasurementViewState(){return {preview:false,phase:'ready',previous:'running'};}
export function stepMeasurementPreview(ui,action){
 if(!ui||typeof ui!=='object')return false;
 if(action==='preview'){
  ui.preview=!ui.preview;ui.phase='ready';ui.previous='running';return true;
 }
 if(!ui.preview)return false;
 if(action==='show-running'){ui.phase='running';return true;}
 if(action==='show-paused'){ui.phase='paused';return true;}
 if(action==='show-ready'){ui.phase='ready';return true;}
 if(action==='end'){
  if(!['running','paused'].includes(ui.phase))return false;
  ui.previous=ui.phase;ui.phase='confirm';return true;
 }
 if(action==='cancel-end'&&ui.phase==='confirm'){ui.phase=ui.previous;return true;}
 if(action==='confirm-end'&&ui.phase==='confirm'){
  ui.phase='ready';ui.preview=false;return true;
 }
 return false;
}
const mapIcon=`<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11 19 5l11 7 13-6v31l-13 6-11-7-14 6V11Z"/><path d="M19 5v31M30 12v31"/></svg>`;
function previewTabs(ui){
 return `<div class="gps-v2-tabs" role="group" aria-label="画面の表示例を切り替える">
  ${[['ready','準備'],['running','測定中'],['paused','一時停止']].map(([mode,label])=>
   `<button type="button" data-gps-preview="show-${mode}" aria-pressed="${ui.phase===mode}" ${ui.phase==='confirm'?'disabled':''}>${label}</button>`).join('')}
 </div>`;
}
function stateTitle(phase){return phase==='ready'?'測定の準備':phase==='paused'?'一時停止中':'GPS測定';}
function safetyNote(ready){return ready?
 `<div class="gps-v2-note"><strong>測定開始の前に</strong><p>位置情報の権限と測位状態を確認してから計測を開始する設計です。GPSを使った測定はまだ利用できません。</p></div>`:
 `<div class="gps-v2-note"><strong>測定中の安全性</strong><p>停止と終了は別の操作にし、終了時には確認を挟みます。表示中の値は実際の測定結果ではありません。</p></div>`;
}
export function measurementPage(ui){
 const phase=STATES.includes(ui?.phase)?ui.phase:'ready',preview=!!ui?.preview;
 const ready=!preview||phase==='ready',paused=preview&&phase==='paused',confirmed=preview&&phase==='confirm';
 const running=preview&&!ready;
 const metricPhase=ready?'ready':phase;
 const status=ready?'GPSの測定は準備中':paused?'一時停止（例）':'測定中（例）';
 const stateName=ready?'開始前':paused?'停止中':'表示例';
 const note=ready?'GPS測定機能は現在利用できません。準備画面のデザインと操作説明を確認できます。':'表示例：時間・距離・ペースはサンプル値です。位置情報の取得や記録の保存は行っていません。';
 return `<div class="gps-v2 ${running?'gps-v2--demo-active':''}" data-measurement-v2 data-measurement-phase="${esc(phase)}" data-preview="${preview}">
  <header class="gps-v2-header"><a class="gps-v2-back" href="#/record-start" aria-label="記録方法の選択へ戻る">‹</a><h1>${stateTitle(phase)}</h1>${preview?'<span class="gps-v2-demo-badge">表示例</span>':''}</header>
  <p class="gps-v2-banner" role="status">${note}</p>
  <section class="gps-v2-grid" aria-label="GPS測定画面">
   <div class="gps-v2-main"><section class="gps-v2-meter" aria-label="計測情報">
    <div class="gps-v2-meter-top"><strong class="gps-v2-signal"><span class="gps-v2-dot ${ready?'gps-v2-dot--off':paused?'gps-v2-dot--pause':''}"></span>${status}</strong><span class="gps-v2-state">${stateName}</span></div>
    <div class="gps-v2-clock"><span>経過時間</span><strong>${CLOCK[metricPhase]}</strong></div>
    <div class="gps-v2-metrics"><div><span>走行距離</span><strong>${DISTANCE[metricPhase]}</strong><small>km</small></div><div><span>平均ペース</span><strong>${PACE[metricPhase]}</strong><small>/km</small></div></div>
   </section>
   <section class="gps-v2-map" aria-label="GPS軌跡">${mapIcon}<strong>GPS軌跡</strong><p>測定した位置情報がある場合だけ表示します</p></section>
   <div class="gps-v2-actions">
    ${ready?'<button class="gps-v2-button gps-v2-primary" type="button" disabled aria-disabled="true">測定開始</button>':
    `<button class="gps-v2-button gps-v2-primary" type="button" data-gps-preview="${paused?'show-running':'show-paused'}">${paused?'▶ 再開':'Ⅱ 一時停止'}</button><button class="gps-v2-button gps-v2-secondary" type="button" data-gps-preview="end">■ 終了</button>`}
   </div></div>
   <aside class="gps-v2-side">${safetyNote(ready)}
    <div class="gps-v2-preview-box"><p>画面の確認</p><button class="gps-v2-preview-toggle" type="button" data-gps-preview="preview" aria-pressed="${preview}">${preview?'表示例を終了':'操作画面の表示例を見る'}</button>${preview?previewTabs(ui):''}</div>
   </aside>
  </section>
  ${confirmed?`<div class="gps-v2-shade" data-gps-overlay><section class="gps-v2-confirm" role="dialog" aria-modal="true" aria-labelledby="gps-v2-confirm-title"><h2 id="gps-v2-confirm-title">測定を終了しますか？</h2><p>終了すると計測を再開できません。この画面は表示例であり、GPS記録は保存されません。</p><div class="gps-v2-confirm-actions"><button type="button" data-gps-preview="cancel-end">測定画面へ戻る</button><button type="button" data-gps-preview="confirm-end">表示例を終了</button></div></section></div>`:''}
 </div>`;
}