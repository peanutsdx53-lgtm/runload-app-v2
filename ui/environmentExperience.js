// Environment Ver.4: visual inputs and draft editing only.
// Weather and subjective flags are UI-only unless the person explicitly copies
// them into the already-supported environmentNote; no scientific schema changes.
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const weatherOptions=Object.freeze([['SUN','晴れ','☀'],['CLOUD','くもり','☁'],['RAIN','雨','☂'],['SNOW','雪','❄']]);
export const conditionOptions=Object.freeze([['WIND','風が強い'],['HUMID','湿度が高い']]);
export const environmentDraftKeys=Object.freeze(['temperatureC','environmentNote']);
export function newEnvironmentUi(){return {weather:null,flags:[],notice:''};}
export function temperatureError(value){
 const raw=String(value??'').trim();
 if(raw==='')return '';
 const x=Number(raw);
 return !Number.isFinite(x)||x< -50||x>60?'気温は−50〜60℃の範囲で入力してください。':'';
}
export function toggleWeather(ui,key){if(!weatherOptions.some(x=>x[0]===key))return false;ui.weather=ui.weather===key?null:key;return true;}
export function toggleFlag(ui,key){if(!conditionOptions.some(x=>x[0]===key))return false;ui.flags=ui.flags.includes(key)?ui.flags.filter(k=>k!==key):[...ui.flags,key];return true;}
export function environmentSummary(d,ui){
 const t=String(d.temperatureC??'').trim(),weather=weatherOptions.find(x=>x[0]===ui.weather),flags=conditionOptions.filter(x=>ui.flags.includes(x[0])).map(x=>x[1]);
 return [temperatureError(t)?'気温を確認':t===''?'気温未入力':t+'℃',weather?.[1]||'天候未入力',...flags].join(' · ');
}
/** Explicitly copy self-reported selectors into the existing optional note.
 * Do not silently persist an unapproved structured weather schema. */
export function applyEnvironmentSelections(d,ui){
 const weather=weatherOptions.find(x=>x[0]===ui?.weather)?.[1];
 const flags=conditionOptions.filter(x=>ui?.flags?.includes(x[0])).map(x=>x[1]);
 const selected=[...(weather?['天候：'+weather]:[]),...flags];
 if(!selected.length)return {ok:false,reason:'記録する天候・条件が選択されていません'};
 const segment='【本人申告の環境選択】'+selected.join('、');
 const existing=String(d.environmentNote??'');
 if(existing.split('\n').includes(segment))return {ok:false,reason:'この内容は環境メモに反映済みです'};
 const next=existing?(existing+'\n'+segment):segment;
 if(next.length>500)return {ok:false,reason:'環境メモが500文字を超えるため反映できません。元の文章を変更していません'};
 d.environmentNote=next;
 ui.notice='選択した内容を環境メモに反映しました。保存前の確認画面で確かめてください';
 return {ok:true,value:next};
}
export function environmentPage(d={},ui=newEnvironmentUi()){
 const options=weatherOptions.map(([key,label,icon])=>`<button type="button" class="e4-chip" data-e4-weather="${key}" aria-pressed="${ui.weather===key}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('');
 const checks=conditionOptions.map(([key,label])=>`<button type="button" class="e4-flag" data-e4-flag="${key}" aria-pressed="${ui.flags.includes(key)}">${label}</button>`).join('');
 return `<div class="record-v3 environment-v4" data-e4-page><header class="rv-head"><a href="#/record" class="rv-back" aria-label="手入力に戻る">‹</a><h1>環境</h1></header>
 <p class="e4-intro">走ったときの環境を、覚えている範囲で記録します。</p>
 <div class="e4-grid"><section class="rv-panel e4-panel"><div class="e4-top"><h2>気温と天候</h2><small>任意</small></div>
 <label class="e4-label">気温<span class="e4-temperature"><input data-draft="temperatureC" type="number" min="-50" max="60" inputmode="decimal" step="0.1" placeholder="未入力" value="${safe(d.temperatureC)}" aria-label="気温（摂氏）"><b>℃</b></span></label><p class="e4-help">0℃と未入力は別です。気温を推測して埋めることはありません。</p><div class="e4-divider"></div>
 <p class="e4-label-text">天候を選択</p><div class="e4-chips" role="group" aria-label="天候の選択">${options}</div><p class="e4-help">もう一度押すと選択を解除できます。</p>
 <p class="e4-label-text e4-gap">気になった条件（複数可）</p><div class="e4-flags" role="group" aria-label="環境に関する補足">${checks}</div>
 <p class="e4-draft-note">天候・風・湿度の選択はこの画面だけの一時表示です。環境メモに明示的に反映しない場合、移動や再読み込みで消えます。</p></section>
 <section class="rv-panel e4-panel"><div class="e4-top"><h2>環境メモ</h2><small>任意</small></div>
 <label class="e4-label">気づいたこと<textarea data-draft="environmentNote" rows="5" maxlength="500" placeholder="例：向かい風が強かった。日陰は涼しかった。">${safe(d.environmentNote)}</textarea></label>
 <p class="e4-help">入力した内容を天候の選択で自動的に書き換えることはありません。保存したい場合は下の操作で本人の申告として環境メモに追記できます。</p><button type="button" data-e4-commit>選択した天候などを環境メモに反映</button><p data-e4-notice role="status">${safe(ui.notice||'')}</p>
 <div class="e4-summary"><strong>入力内容の確認</strong><p data-e4-summary>${safe(environmentSummary(d,ui))}</p></div>
 <p class="e4-error" data-e4-error role="alert" ${temperatureError(d.temperatureC)?'':'hidden'}>${safe(temperatureError(d.temperatureC))}</p>
 </section></div><div class="e4-bottom"><p>気温と環境メモは記録の確認画面に引き継がれます。天候・風・湿度は「環境メモに反映」を押したものだけ文章として保存できます。</p><a class="e4-done" data-e4-done href="#/record">入力を確認</a></div></div>`;
}
export function paintEnvironment(root,d,ui){
 if(!root)return;
 root.querySelectorAll('[data-e4-weather]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.e4Weather===ui.weather)));
 root.querySelectorAll('[data-e4-flag]').forEach(el=>el.setAttribute('aria-pressed',String(ui.flags.includes(el.dataset.e4Flag))));
 const err=temperatureError(d.temperatureC);const label=root.querySelector('[data-e4-error]');if(label){label.textContent=err;label.hidden=!err;}
 const done=root.querySelector('[data-e4-done]');if(done){done.setAttribute('aria-disabled',String(!!err));done.classList.toggle('e4-disabled',!!err);}
 const summary=root.querySelector('[data-e4-summary]');if(summary)summary.textContent=environmentSummary(d,ui);
 const notice=root.querySelector('[data-e4-notice]');if(notice)notice.textContent=ui.notice||'';
}