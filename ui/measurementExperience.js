/* Real GPS presentation. Unlike the former mock, the UI never fabricates metrics.
 * Measurement is user-triggered and GPS samples remain device-local by default.
 */
import {GPS_ACTIVITY,formatGpsClock,gpsPace} from './gpsMeasurementCore.js';
import {gpsEnergyDisplay} from './gpsEnergyDisplay.js';
import {updateGpsLiveMap} from './gpsLiveMap.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const descriptions={RUNNING:'連続した走行を記録します。速度の目標は自動設定しません。',JOGGING:'ゆっくり走ったことを記録します。走行速度による活動区分の自動判定は行いません。',WALK:'歩いた経路と時間を記録します。走行の12部位モデルは適用しません。',MIXED:'走る・ジョギング・歩く区間を自分で切り替えながら記録します。'};
const gpsIcon='<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4M12 19v4M1 12h4M19 12h4"/></svg>';
const opt=(data,selected)=>data.map(([key,label])=>`<option value="${key}" ${selected===key?'selected':''}>${label}</option>`).join('');
function format(s,elapsedMs){const energy=gpsEnergyDisplay({...s,elapsedMs});return {distance:(s.distanceM/1000).toFixed(2),time:formatGpsClock(elapsedMs),pace:gpsPace(s.distanceM,elapsedMs),energy};}
const canSave=s=>s.distanceM>=10&&s.accepted>=2;
const flagCards=s=>`<details class="gps-flag-review" open><summary>⚑ フラッグのメモ <span>${s.flags.length}地点・任意</span></summary><div class="gps-flag-review-body"><p>地点の出来事を記録できます。メモと位置は「コースと動的結果用データを保存する」を選んだ場合だけ保存されます。</p>${s.flags.map((f,i)=>`<label class="gps-flag-note-card"><span class="gps-flag-note-heading"><b>⚑ ${i+1}</b><strong>${f.km.toFixed(2)} km の地点</strong></span><span class="gps-flag-note-label">この地点のメモ <small>省略可</small></span><textarea data-gps-flag-note="${esc(f.id)}" maxlength="240" rows="2" placeholder="例：上り坂に入った、足が重く感じた">${esc(f.note)}</textarea></label>`).join('')}</div></details>`;
const reportedScore=score=>Number.isInteger(score)&&score>=0&&score<=10?score+' / 10':'未回答';
export function gpsReviewPage(s,elapsedMs=0,experience={}){
 if(s.phase!=='finished')return '<section class="gps-v2 gps-review" data-gps-review><h1>GPS記録内容の確認</h1><p role="alert">終了したGPS測定がありません。未保存の記録は再読込後に復元できません。</p><a href="#/measurement">GPS測定へ戻る</a></section>';
 const data=format(s,elapsedMs);
 const ready=canSave(s);
 return '<div class="gps-v2 gps-review" data-gps-review><header class="gps-v2-header"><a href="#/measurement" class="gps-v2-back" aria-label="測定終了画面へ戻る">‹</a><div><small class="gps-live-eyebrow">REAL GPS / 実測</small><h1>GPS記録内容の確認</h1></div></header>'+
 '<section class="gps-v35-panel gps-review-facts"><h2>GPSで取得した記録</h2><dl><div><dt>活動</dt><dd>'+esc(GPS_ACTIVITY[s.activity])+'</dd></div><div><dt>GPS移動距離</dt><dd>'+data.distance+' km</dd></div><div><dt>測定した活動時間</dt><dd>'+data.time+'</dd></div><div><dt>平均ペース</dt><dd>'+data.pace+' /km</dd></div></dl></section>'+
 '<section class="gps-v35-panel gps-review-subjective"><h2>任意の記録</h2>'+
 '<a href="#/gps-rof" class="gps-rof-link" data-gps-rof-entry="after"><span><strong>運動後の疲労感（ROF-J）</strong><small>任意・イラストで選択</small></span><output>'+reportedScore(experience.rofAfter)+'</output><span aria-hidden="true">›</span></a>'+
 '<p class="gps-review-rof-before">運動前：'+reportedScore(experience.rofBefore)+'</p>'+
 '<p class="gps-review-provenance">疲労感は本人の任意回答（0〜10）です。0は回答済み、未回答は未回答のまま保存します。「運動前／後」の区分だけで実際の時間的前後差を判定しません。</p>'+
 '<label class="gps-review-note">今回の気づき・メモ（任意）<textarea data-gps-note maxlength="500" rows="3" placeholder="次に確かめたいこと、気づいたことなど">'+esc(experience.memo||'')+'</textarea></label>'+
 '</section>'+
 '<section class="gps-v35-panel gps-review-save"><h2>保存する</h2><p class="gps-review-storage-note">記録の距離・時間と本人の任意回答をこの端末に保存します。位置情報を含むコース詳細は、次のチェックを入れた場合だけ追加保存します。</p>'+
 '<label class="gps-live-checkbox"><input type="checkbox" data-gps-save-route '+(experience.saveRoute?'checked':'')+'><span><b>コースと動的結果用データを保存する</b><small>位置・速度・フラッグを含みます。初期OFFで、本人が選んだ場合だけ保存します。</small></span></label>'+
 (s.flags?.length?flagCards(s):'')+
 ''+
 '<div class="gps-live-actions"><button type="button" data-gps-action="save" class="gps-v2-button gps-v2-primary" '+(ready?'':'disabled')+'>走行記録を保存する</button><a href="#/measurement" class="gps-v2-button gps-v2-secondary">測定終了画面に戻る</a></div>'+
 (!ready?'<p role="alert">有効なGPS移動距離が10m未満のため保存できません。</p>':'')+'</section></div>';
}
export function measurementPage(s,elapsedMs=0,experience={}){
 const ready=s.phase==='ready',active=s.phase==='running',paused=s.phase==='paused',finished=s.phase==='finished',working=active||paused;
 const data=format(s,elapsedMs);
 const status=ready?'開始前':active?(s.positionError?'測位を確認してください':'GPS計測中'):paused?'一時停止中':'計測終了';
 const target=s.goalMode==='time'?`${esc(s.goalValue||'—')}分`:s.goalMode==='distance'?`${esc(s.goalValue||'—')}km`:'目標なし';
 return `<div class="gps-v2 gps-v35" data-measurement-v2 data-gps-live-page data-phase="${s.phase}">
  <header class="gps-v2-header"><a class="gps-v2-back" href="#/record-start" aria-label="記録方法へ戻る">‹</a><div><small class="gps-live-eyebrow">REAL GPS / 実走計測</small><h1>GPSで走行を記録</h1></div></header>
  <div class="gps-live-steps" aria-label="操作順序"><span class="${ready?'is-current':''}" ${ready?'aria-current="step"':''}><b>01</b> 準備</span><span class="${working?'is-current':''}" ${working?'aria-current="step"':''}><b>02</b> 測定</span><span class="${finished?'is-current':''}" ${finished?'aria-current="step"':''}><b>03</b> 保存</span></div>
  ${ready?`<section class="gps-v35-panel gps-live-prep"><div class="gps-live-section-head"><b>01</b><div><h2>今回の活動</h2></div></div>
   <div class="gps-activity-surface"><label for="gps-activity"><span class="gps-activity-icon">${gpsIcon}</span><span><small>運動の形式</small><select id="gps-activity" data-gps-activity>${opt(Object.entries(GPS_ACTIVITY),s.activity)}</select></span><span class="gps-activity-arrow" aria-hidden="true">⌄</span></label></div>
   <div class="gps-live-prep-grid"><label>測定の目標<select data-gps-goal-mode>${opt([['free','自由に測る'],['time','時間を決めて測る'],['distance','距離を決めて測る']],s.goalMode||'free')}</select></label><label ${s.goalMode==='free'?'hidden':''}>${s.goalMode==='time'?'目標時間（分）':'目標距離（km）'}<span class="gps-goal-input"><input type="number" data-gps-goal-value inputmode="decimal" step="0.1" min="0.1" max="1000" value="${esc(s.goalValue||'')}"><small>${s.goalMode==='time'?'分':'km'}</small></span></label></div>
   <a href="#/gps-rof" class="gps-rof-link" data-gps-rof-entry="before"><span><strong>運動前の疲労感<b class="gps-rof-term">（ROF-J）</b></strong><small>任意・イラストで選択</small></span><output>${reportedScore(experience.rofBefore)}</output><span aria-hidden="true">›</span></a>
   <p class="gps-live-disclaimer">未保存の計測はアプリ終了・再読み込みで失われます。測定開始時に位置情報の利用を確認します。</p><label class="gps-live-checkbox gps-screen-awake-pref"><input type="checkbox" data-gps-keep-awake ${s.keepScreenAwake?'checked':''}><span><b>測定中は画面を点灯したままにする（任意）</b><small>初期OFF・対応端末のみ</small></span></label>
   <button class="gps-v2-button gps-v2-primary" type="button" data-gps-action="start">位置情報を許可して測定開始</button></section>`:''}
  <section class="gps-v35-panel gps-live-measure"><div class="gps-live-section-head"><b>02</b><div><h2>走行の記録</h2></div></div>
   <div class="gps-live-status" role="status"><i class="gps-v2-dot ${active?'': 'gps-v2-dot--pause'}"></i><strong data-gps-status>${status}</strong><span data-gps-accuracy>${s.lastPosition?`受信精度 ±${Math.round(s.lastPosition.accuracyM)}m`:target}</span></div>
   <div class="gps-live-time"><small>計測した時間（停止中を除く）</small><strong data-gps-elapsed>${data.time}</strong></div>
   <div class="gps-v2-metrics gps-v35-metrics"><div><span>GPSの移動距離</span><strong data-gps-distance>${data.distance}</strong><small>km</small></div><div><span>平均ペース</span><strong data-gps-pace>${data.pace}</strong><small>/km</small></div><div class="gps-v35-energy"><span>推定消費カロリー</span><strong data-gps-energy>${data.energy.text}</strong><small>kcal</small><em data-gps-energy-note>${data.energy.text==='—'?'':esc(data.energy.note)}</em></div></div>
   <div class="gps-live-map-box"><div class="gps-live-map-heading"><strong>現在地と走行ルート</strong><small>GPSを受信すると地図を表示</small></div><div class="gps-live-map-canvas" data-gps-map role="img" aria-label="現在地付近の道路地図と測定したGPS軌跡"><span class="gps-map-waiting">GPS測位後に、この場所の地図を表示します。</span></div><div class="gps-live-map-foot"><span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></span><span>地図の表示には通信が必要です</span></div></div>
   <div class="gps-live-map-flags" data-gps-map-flags role="status" aria-live="polite">${s.flags.length?'⚑ フラッグ '+s.flags.length+'件を地図に表示中':'フラッグを記録すると地図上に番号が表示されます'}</div>
   <p data-gps-notice class="gps-live-notice" role="status">${esc(s.positionError||s.notice||'位置情報を利用できない場合は、手入力での記録が可能です。')}</p>
   ${s.activity==='MIXED'&&working?`<label class="gps-live-segment">現在の区間<select data-gps-segment>${opt([['RUNNING','ランニング'],['JOGGING','ジョギング'],['WALK','ウォーキング']],s.segmentActivity)}</select><small>切替直前と直後のGPS点は、距離をつなぎません。</small></label>`:''}
   ${working?`<div class="gps-live-actions gps-live-actions--measuring ${active?'':'gps-live-actions--paused'}">${active?`<button data-gps-action="flag" class="gps-v2-button gps-v2-secondary gps-action-flag" type="button">⚑ フラッグ <span data-gps-flag-count>${s.flags.length?`(${s.flags.length})`:''}</span></button>`:''}<button data-gps-action="${active?'pause':'resume'}" class="gps-v2-button gps-v2-primary gps-action-pause" type="button">${active?'一時停止':'測定を再開'}</button><button data-gps-action="finish" class="gps-v2-button gps-action-finish" type="button">測定を終了</button></div>`:''}
   ${finished?`<div class="gps-live-finish">${canSave(s)?`<p class="gps-finish-success">測定終了：${data.distance} km・${esc(GPS_ACTIVITY[s.activity])}</p><div class="gps-live-actions gps-live-actions--finished"><button type="button" data-gps-action="review" class="gps-v2-button gps-v2-primary">記録内容の確認へ進む</button><button type="button" data-gps-action="discard" class="gps-v2-button gps-v2-secondary">保存せず戻る</button></div>`:`<div class="gps-finish-unavailable" role="alert"><strong>この測定は保存できません</strong><p>GPSによる有効な移動距離が10mに達していません。移動しないまま終了した場合は記録を作成できません。</p></div><button type="button" data-gps-action="discard" class="gps-v2-button gps-v2-primary gps-finish-back">保存せず戻る</button>`}</div>`:''}
  </section>
  <details class="gps-live-info"><summary>測定値と保存の範囲</summary><p>GPS距離・時間には測位条件による誤差があります。12部位の参考値は適用条件を満たす場合に限り、身体負荷の直接測定ではありません。走行軌跡は選択した場合のみ端末に保存します。</p></details>
  ${working?'<div class="gps-live-leave">画面を離れた場合は測定を一時停止します。ブラウザーの再読み込みや強制終了では未保存の測定を復元できません。</div>':''}</div>`;
}
export function updateMeasurementDom(root,s,elapsedMs){if(!root)return;const d=format(s,elapsedMs);const set=(sel,v)=>{const e=root.querySelector(sel);if(e)e.textContent=v;};
 set('[data-gps-elapsed]',d.time);set('[data-gps-distance]',d.distance);set('[data-gps-pace]',d.pace);set('[data-gps-energy]',d.energy.text);set('[data-gps-energy-note]',d.energy.text==='—'?'':d.energy.note);set('[data-gps-flag-count]',s.flags?.length?'('+s.flags.length+')':'');set('[data-gps-map-flags]',s.flags?.length?'⚑ フラッグ '+s.flags.length+'件を地図に表示中':'フラッグを記録すると地図上に番号が表示されます');set('[data-gps-status]',s.positionError?'測位を確認してください':s.phase==='running'?'GPS計測中':s.phase==='paused'?'一時停止中':s.phase==='finished'?'計測終了':'開始前');set('[data-gps-accuracy]',s.lastPosition?`受信精度 ±${Math.round(s.lastPosition.accuracyM)}m`:'GPS待機中');set('[data-gps-notice]',s.positionError||s.notice||'位置情報を利用できない場合は、手入力での記録が可能です。');updateGpsLiveMap(root,s);
}
export function activityDescription(id){return descriptions[id]||'';}
