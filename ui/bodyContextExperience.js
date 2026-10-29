/* RunLoad Body Context v8 — unapproved presentation-layer prototype.
 * Production integration must import existing v2 BODY_REGION_VIEWS without modifications.
 * No scientific comparison values, injury interpretations or persistent region flags. */
import { BODY_REGION_VIEWS } from '../assets/bodyRegionVisuals.js';
export const REGIONS = Object.freeze([
  ['BA-DISP-014','股関節部'],['BA-DISP-015','殿部'],['BA-DISP-016','大腿前面'],
  ['BA-DISP-018','大腿後面'],['BA-DISP-019','膝蓋大腿関節部'],['BA-DISP-021','脛骨部'],
  ['BA-DISP-023','下腿後面'],['BA-DISP-024','足関節部'],['BA-DISP-025','アキレス腱部'],
  ['BA-DISP-027','後足部'],['BA-DISP-028','足底中部・内側縦足弓'],['BA-DISP-029','前足部']
].map(([id,name])=>Object.freeze({id,name})));
export const DRAFT_KEYS = Object.freeze(['bodyObservation','shoeName','memo']);
export const VIEWS = BODY_REGION_VIEWS;
const safe = v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const region = id => REGIONS.find(r=>r.id===id);
export const viewRegionIds = view => VIEWS.find(x=>x.key===view)?.paths.map(x=>x[0])??[];
export function makeUi(){return {view:'front',focusId:null,selected:[],pickerOpen:false,notice:''};}
export function setView(ui,key){if(!VIEWS.some(v=>v.key===key))return false;ui.view=key;ui.focusId=null;ui.pickerOpen=false;return true;}
export function focusRegion(ui,id){if(!region(id))return false;const view=VIEWS.find(v=>v.key===ui.view);if(!view?.paths.some(p=>p[0]===id))return false;ui.focusId=id;ui.pickerOpen=false;return true;}
export function toggleRegion(ui,id){if(!region(id))return false;ui.selected=ui.selected.includes(id)?ui.selected.filter(x=>x!==id):[...ui.selected,id];ui.notice='';return true;}
export function clearSelected(ui){ui.selected=[];ui.focusId=null;ui.notice='';}
export function addRegionNamesToNote(d,ui){const names=REGIONS.filter(r=>ui.selected.includes(r.id)).map(r=>r.name);if(!names.length){ui.notice='先に部位を選択してください。';return false;}const line='気になった部位：'+names.join('、');const old=String(d.bodyObservation??'').trim();if(old.includes(line)){ui.notice='選択した部位名はすでに文章に含まれています。';return false;}const candidate=[old,line].filter(Boolean).join('\n');if(candidate.length>500){ui.notice='500文字を超えるため追加できません。';return false;}d.bodyObservation=candidate;ui.notice='部位名を身体の自覚情報に追加しました。';return true;}
export function checkDefinitions(){const ids=VIEWS.flatMap(v=>v.paths.map(p=>p[0]));return VIEWS.length===3&&ids.length===12&&new Set(ids).size===12&&REGIONS.length===12&&REGIONS.every(r=>ids.includes(r.id));}

function mapSvg(v,ui){const sid=`cx-${v.key}`;return `<svg class="cx-map-svg" viewBox="70 10 160 430" preserveAspectRatio="xMidYMid meet" role="group" aria-label="${v.title}の人体図">
<defs><linearGradient id="${sid}-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#32677a"/><stop offset=".5" stop-color="#1b485e"/><stop offset="1" stop-color="#0a2637"/></linearGradient><linearGradient id="${sid}-focus" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#79fff0"/><stop offset="1" stop-color="#12a8d6"/></linearGradient><filter id="${sid}-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs>
<g class="cx-body-halo" fill="none" stroke="#31a8c8" stroke-width="3.6" opacity=".18" filter="url(#${sid}-glow)">${v.silhouette}</g>
<g class="cx-body-base" fill="url(#${sid}-body)" stroke="#70b6cc" stroke-width="1.05">${v.silhouette}</g>
${v.paths.map(([id,path])=>{const chosen=ui.selected.includes(id),focused=ui.focusId===id;return `<path d="${path}" class="cx-region${chosen?' cx-selected':''}${focused?' cx-focused':''}" data-region-focus="${id}" tabindex="0" role="button" aria-label="${safe(region(id)?.name)}を確認" aria-pressed="${chosen}"><title>${safe(region(id)?.name)}</title></path>`;}).join('')}
</svg>`;}
const icon=(type)=>({note:'✎',shoe:'◇',memo:'▤'}[type]||'•');
const fields=[['bodyObservation','身体の自覚情報','note',500,'例：右ふくらはぎに張りを感じた'],['shoeName','使用したシューズ','shoe',100,'今回のシューズ名を入力'],['memo','走行・休養時のメモ','memo',500,'自由に記録できます']];
function fieldCard(d,[key,label,symbol,max,placeholder]){const single=key==='shoeName';return `<section class="cx-field-card"><div class="cx-field-title"><span class="cx-field-icon">${icon(symbol)}</span><label for="cx-${key}">${label}</label><span class="cx-optional">任意</span></div>${single?`<input id="cx-${key}" type="text" maxlength="${max}" data-draft="${key}" placeholder="${placeholder}" value="${safe(d[key])}">`:`<textarea id="cx-${key}" maxlength="${max}" data-draft="${key}" placeholder="${placeholder}" rows="${key==='memo'?3:3}">${safe(d[key])}</textarea>`}<div class="cx-counter" data-counter="${key}">${String(d[key]??'').length}/${max}</div></section>`;}
export function renderScreen(d={},ui=makeUi()){
 const current=VIEWS.find(v=>v.key===ui.view)||VIEWS[0];
 const focus=region(ui.focusId),picked=focus&&ui.selected.includes(focus.id);
 const selected=REGIONS.filter(r=>ui.selected.includes(r.id));
 const tabs=VIEWS.map(v=>`<button type="button" data-map-view="${v.key}" aria-pressed="${v.key===ui.view}" class="cx-tab">${v.title}</button>`).join('');
 const namedPicker=current.paths.map(([id])=>{const r=region(id),on=ui.selected.includes(id);return `<button type="button" data-picker-id="${id}" class="cx-picker-option${on?' is-on':''}" aria-pressed="${on}">${safe(r.name)}<span>${on?'✓':'＋'}</span></button>`;}).join('');
 const chips=selected.map(r=>`<button type="button" class="cx-selected-chip" data-unselect="${r.id}" aria-label="${safe(r.name)}の選択を解除">${safe(r.name)} <span aria-hidden="true">×</span></button>`).join('');
 return `<div class="cx-page" data-cx-page>
<header class="cx-header"><a class="cx-back" href="#/record" aria-label="記録に戻る">‹</a><div><h1>身体・使用品</h1><p>身体で感じたことと、使ったもの</p></div><span class="cx-header-optional">任意入力</span></header>
<div class="cx-main-grid"><section class="cx-main-card" aria-label="気になった部位の選択"><div class="cx-card-header"><div class="cx-heading-mark"></div><h2>気になった部位</h2><span class="cx-main-hint">図をタップして選択</span></div>
<div class="cx-tabs" role="group" aria-label="表示面の切り替え">${tabs}</div>
<div class="cx-stage" data-current-view="${ui.view}"><div class="cx-stage-grain"></div><div class="cx-stage-light"></div><div class="cx-floor cx-floor-one"></div><div class="cx-floor cx-floor-two"></div><span class="cx-stage-caption">${current.title} <span class="cx-stage-separator">/</span> BODY MAP</span><div class="cx-person">${mapSvg(current,ui)}</div>
${focus?`<div class="cx-context" aria-live="polite"><div class="cx-context-kicker">選択した場所</div><strong>${safe(focus.name)}</strong><div class="cx-context-meta">${picked?'選択済み':'未選択'}</div><button type="button" class="cx-context-action${picked?' is-remove':''}" data-confirm-id="${focus.id}">${picked?'選択を解除':'この部位を選択'} <span>${picked?'−':'＋'}</span></button></div>`:`<div class="cx-blank-hint"><span class="cx-touch-icon">◎</span><strong>身体の気になる場所をタップ</strong><small>部位名を確認してから選択できます</small></div>`}
</div>
<div class="cx-toolbar"><div class="cx-chosen-head"><strong>選択中の部位</strong><span class="cx-chosen-count">${selected.length}<small> / 12</small></span></div><div class="cx-chosen-row" aria-live="polite">${chips||'<span class="cx-no-selection">まだ選択されていません</span>'}</div><div class="cx-toolbar-actions"><button type="button" data-picker-toggle aria-expanded="${ui.pickerOpen}" class="cx-picker-trigger">部位名から探す <span>${ui.pickerOpen?'−':'＋'}</span></button>${selected.length?'<button type="button" data-clear-all class="cx-clear">すべて解除</button>':''}</div></div>
${ui.pickerOpen?`<div class="cx-picker" role="group" aria-label="${current.title}の部位名から選ぶ"><div class="cx-picker-title">${current.title}で選べる部位 <span>${current.paths.length}件</span></div><div class="cx-picker-grid">${namedPicker}</div></div>`:''}
<p class="cx-science-note">選択は本人の自覚記録であり、身体部位の参考値や医学的診断ではありません。</p>
</section>
<section class="cx-notes-column" aria-label="自覚情報と使用品の入力"><div class="cx-notes-heading"><h2>感じたこと・使用品</h2><p>必要な項目だけ入力してください</p></div>${fields.map(f=>fieldCard(d,f)).join('')}
<div class="cx-transfer"><p>選択部位を文章でも残す場合</p><button type="button" data-append-name ${selected.length?'':'disabled'}>選択した部位名を自覚情報に追加 <span aria-hidden="true">↗</span></button><small>選択した部位を文章に追加できます。</small></div>
</section></div>
<footer class="cx-footer"><p>身体の部位別の参考値はまだ計算できません。入力した内容は確認画面で確かめてください。</p><button class="cx-apply" type="button" data-apply>入力を反映する <span aria-hidden="true">→</span></button></footer>
<div class="cx-status" data-status role="status" aria-live="polite">${safe(ui.notice)}</div>
</div>`;
}
