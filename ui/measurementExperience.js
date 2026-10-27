/* Real GPS presentation. Unlike the former mock, the UI never fabricates metrics.
 * Measurement is user-triggered and GPS samples remain device-local by default.
 */
import {GPS_ACTIVITY,formatGpsClock,gpsPace} from './gpsMeasurementCore.js';
import {renderGpxVisual} from './gpxImport.js';
import {updateGpsLiveMap} from './gpsLiveMap.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const descriptions={RUNNING:'連続した走行を記録します。速度の目標は自動設定しません。',JOGGING:'ゆっくり走ったことを記録します。走行速度による活動区分の自動判定は行いません。',WALK:'歩いた経路と時間を記録します。走行の12部位モデルは適用しません。',MIXED:'走る・ジョギング・歩く区間を自分で切り替えながら記録します。'};
const gpsIcon='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>';
const opt=(data,selected)=>data.map(([key,label])=>`<option value="${key}" ${selected===key?'selected':''}>${label}</option>`).join('');
function featureFor(s){if(s.track.length<2)return null;const segments=[];let group=[];for(const p of s.track){if(p.breakBefore&&group.length){segments.push(group);group=[];}group.push({lat:p.lat,lon:p.lon,ele:p.ele,km:p.km});}if(group.length)segments.push(group);const known=s.track.filter(p=>p.ele!==null).length;return {name:'計測中の軌跡',kind:'gps',segments,distanceKm:Math.max(s.distanceM/1000,.000001),points:s.track.length,elevationPoints:known,elevationStatus:known===0?'none':known===s.track.length?'complete':'partial',gapCount:segments.length-1};}
function trackSection(s){const feature=featureFor(s);if(!feature||feature.distanceKm<.01)return '<div class="gps-live-empty">測位が安定し、移動すると軌跡がここに描かれます。<br>これは道路地図ではありません。</div>';
 return renderGpxVisual(feature,Math.min(feature.distanceKm,s.distanceM/1000),Math.min(feature.distanceKm,s.distanceM/1000),'a');}
function format(s,elapsedMs){return {distance:(s.distanceM/1000).toFixed(2),time:formatGpsClock(elapsedMs),pace:gpsPace(s.distanceM,elapsedMs)};}
export function measurementPage(s,elapsedMs=0){
 const ready=s.phase==='ready',active=s.phase==='running',paused=s.phase==='paused',finished=s.phase==='finished',working=active||paused;
 const data=format(s,elapsedMs);
 const status=ready?'開始前':active?(s.positionError?'測位を確認してください':'GPS計測中'):paused?'一時停止中':'計測終了';
 const target=s.goalMode==='time'?`${esc(s.goalValue||'—')}分`:s.goalMode==='distance'?`${esc(s.goalValue||'—')}km`:'目標なし';
 return `<div class="gps-v2 gps-v35" data-measurement-v2 data-gps-live-page data-phase="${s.phase}">
  <header class="gps-v2-header"><a class="gps-v2-back" href="#/record-start" aria-label="記録方法へ戻る">‹</a><div><small class="gps-live-eyebrow">REAL GPS / 実走計測</small><h1>GPSで走行を記録</h1></div></header>
  <div class="gps-live-steps" aria-label="操作順序"><span>01 活動を選ぶ</span><span>02 測定する</span><span>03 確認・保存</span></div>
  ${ready?`<section class="gps-v35-panel gps-live-prep"><div class="gps-live-section-head"><b>01</b><div><h2>今回の活動を設定する</h2><p>ボタンを並べず、選んだ形式だけを確認できます。</p></div></div>
   <div class="gps-activity-surface"><label for="gps-activity"><span class="gps-activity-icon">${gpsIcon}</span><span><small>運動の形式</small><select id="gps-activity" data-gps-activity>${opt(Object.entries(GPS_ACTIVITY),s.activity)}</select></span><span class="gps-activity-arrow" aria-hidden="true">⌄</span></label><p data-gps-activity-description>${esc(descriptions[s.activity])}</p></div>
   <div class="gps-live-prep-grid"><label>測定の目標<select data-gps-goal-mode>${opt([['free','自由に測る'],['time','時間を決めて測る'],['distance','距離を決めて測る']],s.goalMode||'free')}</select></label><label ${s.goalMode==='free'?'hidden':''}>${s.goalMode==='time'?'目標時間（分）':'目標距離（km）'}<span class="gps-goal-input"><input type="number" data-gps-goal-value inputmode="decimal" step="0.1" min="0.1" max="1000" value="${esc(s.goalValue||'')}"><small>${s.goalMode==='time'?'分':'km'}</small></span></label></div>
   <p class="gps-live-disclaimer">位置情報は「測定開始」を押した時だけ取得します。HTTPS・GPS権限が必要です。画面ロック中の連続計測は保証されません。</p>
   <button class="gps-v2-button gps-v2-primary" type="button" data-gps-action="start">位置情報を許可して測定開始</button></section>`:''}
  <section class="gps-v35-panel gps-live-measure"><div class="gps-live-section-head"><b>02</b><div><h2>走行の記録</h2><p>実際に受け取れたGPSの位置点だけを集計します。</p></div></div>
   <div class="gps-live-status" role="status"><i class="gps-v2-dot ${active?'': 'gps-v2-dot--pause'}"></i><strong data-gps-status>${status}</strong><span data-gps-accuracy>${s.lastPosition?`受信精度 ±${Math.round(s.lastPosition.accuracyM)}m`:target}</span></div>
   <div class="gps-live-time"><small>計測した時間（停止中を除く）</small><strong data-gps-elapsed>${data.time}</strong></div>
   <div class="gps-v2-metrics"><div><span>GPSの移動距離</span><strong data-gps-distance>${data.distance}</strong><small>km</small></div><div><span>平均ペース</span><strong data-gps-pace>${data.pace}</strong><small>/km</small></div></div>
   <div class="gps-live-map-box"><div class="gps-live-map-heading"><strong>現在地と走行ルート</strong><small>GPSを受信すると地図を表示</small></div><div class="gps-live-map-canvas" data-gps-map role="img" aria-label="現在地付近の道路地図と測定したGPS軌跡"><span class="gps-map-waiting">GPS測位後に、この場所の地図を表示します。</span></div><div class="gps-live-map-foot"><span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></span><span>地図の表示には通信が必要です</span></div><p class="gps-live-map-privacy">地図画像の取得先には表示範囲が伝わります。通信できない場合もGPS計測は続きます。</p></div>
   <div class="gps-live-route"><strong>軌跡プレビュー <small>地図ではありません</small></strong><div data-gps-route>${trackSection(s)}</div></div>
   <p data-gps-notice class="gps-live-notice" role="status">${esc(s.positionError||s.notice||'位置情報を利用できない場合は、手入力での記録が可能です。')}</p>
   ${s.activity==='MIXED'&&working?`<label class="gps-live-segment">現在の区間<select data-gps-segment>${opt([['RUNNING','ランニング'],['JOGGING','ジョギング'],['WALK','ウォーキング']],s.segmentActivity)}</select><small>切替直前と直後のGPS点は、距離をつなぎません。</small></label>`:''}
   ${working?`<div class="gps-live-actions"><button data-gps-action="${active?'pause':'resume'}" class="gps-v2-button gps-v2-primary" type="button">${active?'一時停止':'測定を再開'}</button><button data-gps-action="finish" class="gps-v2-button gps-v2-secondary" type="button">測定を終了</button></div>`:''}
   ${finished?`<div class="gps-live-finish"><p>測定が終了しました。距離 ${data.distance}km、活動 ${esc(GPS_ACTIVITY[s.activity])}。計測値は保存前の確認状態です。</p><label class="gps-live-checkbox"><input type="checkbox" data-gps-save-route ${s.saveRoute?'checked':''}><span><b>GPS軌跡もこの端末に保存する</b><small>正確な位置情報を含みます。初期状態では保存しません。</small></span></label><div class="gps-live-actions"><button type="button" data-gps-action="save" class="gps-v2-button gps-v2-primary">この記録を保存する</button><button type="button" data-gps-action="discard" class="gps-v2-button gps-v2-secondary">保存せず終了</button></div></div>`:''}
  </section>
  <div class="gps-live-info"><strong>計算と保存の範囲</strong><p>GPS距離・時間は測位条件により誤差があります。歩行・ジョギング・混合を12部位のランニング参考値に合算せず、保存した実走軌跡だけを後でシミュレーションのコースとして再利用します。計測中の情報を外部サービスへ自動送信しません。</p></div>
  ${working?'<div class="gps-live-leave">画面を離れた場合は測定を一時停止します。</div>':''}</div>`;
}
export function updateMeasurementDom(root,s,elapsedMs){if(!root)return;const d=format(s,elapsedMs);const set=(sel,v)=>{const e=root.querySelector(sel);if(e)e.textContent=v;};
 set('[data-gps-elapsed]',d.time);set('[data-gps-distance]',d.distance);set('[data-gps-pace]',d.pace);set('[data-gps-status]',s.positionError?'測位を確認してください':s.phase==='running'?'GPS計測中':s.phase==='paused'?'一時停止中':s.phase==='finished'?'計測終了':'開始前');set('[data-gps-accuracy]',s.lastPosition?`受信精度 ±${Math.round(s.lastPosition.accuracyM)}m`:'GPS待機中');set('[data-gps-notice]',s.positionError||s.notice||'位置情報を利用できない場合は、手入力での記録が可能です。');const route=root.querySelector('[data-gps-route]');if(route)route.innerHTML=trackSection(s);updateGpsLiveMap(root,s);
}
export function activityDescription(id){return descriptions[id]||'';}
