// Approved RunLoad v2 ROF-J Ver.4 interface.
// The authoritative 0..10 integer scale and original 5-image anchor descriptors
// remain in rofJScale.js. This module never invents 2.5/7.5 scores.
import {ROF_J_ANCHORS, ROF_J_RIGHTS, isValidRofJ, guidanceForRofJ, referenceImageUrl} from './rofJScale.js';

export const rofPhaseKey=Object.freeze({before:'rofBefore',after:'rofAfter'});
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=Object.freeze(['運動前','運動後']);
export const nearestAnchorIndex=v=>{
 if(!isValidRofJ(v))return 2;
 // The intermediate anchors are explanatory positions, not score values.
 // For ties, follow the explanatory grouping used in the approved v4 prototype.
 if(v===0)return 0;
 if(v<=3)return 1;
 if(v<=6)return 2;
 if(v<=8)return 3;
 return 4;
};
export const isAnchorIndex=i=>Number.isInteger(i)&&i>=0&&i<ROF_J_ANCHORS.length;
export function createRofUiState(){return {phase:'before',focusedAnchor:2,readingAnchor:false}}
export function syncRofUiState(ui,d){
 if(ui.phase!=='before'&&ui.phase!=='after')ui.phase='before';
 const n=d[rofPhaseKey[ui.phase]];
 if(!isAnchorIndex(ui.focusedAnchor)||!ui.readingAnchor){ui.focusedAnchor=nearestAnchorIndex(n)}
 return ui;
}
export function setRofPhase(ui,phase,d){
 if(!Object.hasOwn(rofPhaseKey,phase))return false;
 ui.phase=phase;ui.readingAnchor=false;ui.focusedAnchor=nearestAnchorIndex(d[rofPhaseKey[phase]]);return true;
}
export function setRofScore(ui,d,raw){
 const n=Number(raw);if(!isValidRofJ(n))return false;
 d[rofPhaseKey[ui.phase]]=n;ui.focusedAnchor=nearestAnchorIndex(n);ui.readingAnchor=false;return true;
}
export function adjustRofScore(ui,d,delta){
 if(delta!==1&&delta!==-1)return false;
 const value=d[rofPhaseKey[ui.phase]],current=isValidRofJ(value)?value:5;
 return setRofScore(ui,d,Math.min(10,Math.max(0,current+delta)));
}
export function clearRofScore(ui,d){
 d[rofPhaseKey[ui.phase]]=null;ui.focusedAnchor=2;ui.readingAnchor=false;
}
export function focusRofAnchor(ui,index){
 if(!isAnchorIndex(index))return false;
 ui.focusedAnchor=index;ui.readingAnchor=true;return true;
}
const shortLabels=['疲労なし','少し','中程度','とても','完全'];
export function rofPage(d,ui){
 syncRofUiState(ui,d);
 const n=d[rofPhaseKey[ui.phase]],hasScore=isValidRofJ(n),anchor=ROF_J_ANCHORS[ui.focusedAnchor];
 const tabs=Object.entries(rofPhaseKey).map(([phase,key],i)=>`<button type="button" role="tab" data-rof-v4-phase="${phase}" id="rof-v4-${phase}-tab" aria-controls="rof-v4-panel" aria-selected="${ui.phase===phase}" tabindex="${ui.phase===phase?0:-1}">${labels[i]}<small>${isValidRofJ(d[key])?esc(d[key]+'/10'):'未入力'}</small></button>`).join('');
 const anchors=ROF_J_ANCHORS.map((a,i)=>`<button type="button" class="rv4-anchor" style="--anchor-position:${a.position*10}%" data-rof-v4-anchor="${i}" aria-label="代表位置 ${esc(a.positionLabel)}：${esc(a.descriptor)}。説明を確認します。数値は変えません。" aria-pressed="${ui.focusedAnchor===i}">
 <span class="rv4-picture"><img src="${esc(referenceImageUrl(a))}" alt="" loading="eager" decoding="async"><span class="rv4-picture-fallback" aria-hidden="true">図を表示できません</span></span><strong>${esc(a.positionLabel)}</strong><small>${shortLabels[i]}</small></button>`).join('');
 const ticks=Array.from({length:11},(_,i)=>`<span data-rof-v4-tick="${i}" style="--tick-position:${i*10}%" class="${hasScore&&n===i?'is-selected':''}">${i}</span>`).join('');
 return `<div class="record-v3 rv4-page" data-rof-v4-root><header class="rv-head rv4-head"><a href="#/record" class="rv-back" aria-label="手入力へ戻る">‹</a><div><h1>運動前後の疲労感</h1><p>ROF-J｜0〜10の整数11段階</p></div></header>
 <section class="rv4-card" aria-labelledby="rv4-title"><div class="rv4-title"><h2 id="rv4-title">疲労感の記録</h2><span>任意</span></div>
 <div class="rv4-tabs" role="tablist" aria-label="疲労感の入力タイミング">${tabs}</div>
 <div class="rv4-workspace" role="tabpanel" id="rof-v4-panel" aria-labelledby="rof-v4-${ui.phase}-tab">
 <div class="rv4-current${hasScore?'':' is-empty'}" aria-live="polite"><output data-rof-v4-number>${hasScore?n:'—'}</output><div><small data-rof-v4-scoreline>${ui.phase==='before'?'運動前':'運動後'} / 10</small><strong data-rof-v4-meaning>${hasScore?esc(guidanceForRofJ(n)):'まだ選択されていません'}</strong><p data-rof-v4-caption>${hasScore?'選択値：'+n+' / 10':'横軸で数値を選択してください'}</p></div></div>
 <div class="rv4-rail" aria-label="評価軸と対応する代表イラスト"><div class="rv4-rail-top"><strong>代表イラスト</strong><small>タップで説明を確認</small></div>
 <div class="rv4-anchor-row" aria-label="原版の5つの代表位置">${anchors}</div>
 <div class="rv4-axis" aria-label="0から10の一直線の評価軸"><div class="rv4-ticks">${ticks}</div><div class="rv4-track"><input type="range" data-rof-v4-range aria-label="${ui.phase==='before'?'運動前':'運動後'}のROF-J疲労感、0から10まで1ずつ" min="0" max="10" step="1" value="${hasScore?n:5}"></div></div>
 <div class="rv4-axis-ends"><span>0：まったく疲れていない</span><span>10：完全な疲労困憊</span></div>
 <div class="rv4-tools"><div class="rv4-adjust"><button type="button" data-rof-v4-step="-1" aria-label="疲労感を1下げる">−</button><span>1ずつ調整</span><button type="button" data-rof-v4-step="1" aria-label="疲労感を1上げる">＋</button></div><button type="button" data-rof-v4-clear ${hasScore?'':'disabled'}>選択を消す</button></div></div>
 <aside class="rv4-aside"><div class="rv4-description"><small>代表位置：<span data-rof-v4-position>${esc(anchor.positionLabel)}</span></small><strong data-rof-v4-anchor-meaning>${esc(anchor.descriptor)}</strong><p data-rof-v4-anchor-note>${ui.readingAnchor?'選択したイラストの説明です。点数は変更されません。':hasScore?'選択値に近い代表イラストです。':'代表位置の説明です。数値は未入力です。'}</p><p>「2と3の間」「7と8の間」は目安の位置であり、入力できる中間値ではありません。</p></div><details class="rv4-rights"><summary>尺度・イラストの出典</summary><p>尺度：${esc(ROF_J_RIGHTS.scale)}。図：${esc(ROF_J_RIGHTS.images)}。</p><a href="${esc(ROF_J_RIGHTS.scaleUrl)}" target="_blank" rel="noopener">尺度の出典</a><a href="${esc(ROF_J_RIGHTS.imagesUrl)}" target="_blank" rel="noopener">図の出典</a></details><p class="rv4-help">自分が感じる疲労感の記録です。身体部位別の計算値ではありません。正式な走行保存は未接続です。</p><a class="rv4-done" href="#/record">手入力へ戻る</a></aside></div></section></div>`;
}
export function reflectRofPage(root,d,ui){
 const page=root?.querySelector('[data-rof-v4-root]');if(!page)return;
 syncRofUiState(ui,d);const n=d[rofPhaseKey[ui.phase]],selected=isValidRofJ(n),a=ROF_J_ANCHORS[ui.focusedAnchor];
 const update=(selector,value)=>{const x=page.querySelector(selector);if(x)x.textContent=value};
 page.querySelectorAll('[data-rof-v4-phase]').forEach(tab=>{
  const phase=tab.dataset.rofV4Phase,on=phase===ui.phase,score=d[rofPhaseKey[phase]];
  tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;const label=tab.querySelector('small');if(label)label.textContent=isValidRofJ(score)?score+'/10':'未入力';
 });
 page.querySelector('#rof-v4-panel')?.setAttribute('aria-labelledby','rof-v4-'+ui.phase+'-tab');
 const current=page.querySelector('.rv4-current');current?.classList.toggle('is-empty',!selected);
 update('[data-rof-v4-number]',selected?String(n):'—');
 update('[data-rof-v4-scoreline]',(ui.phase==='before'?'運動前':'運動後')+' / 10');
 update('[data-rof-v4-meaning]',selected?guidanceForRofJ(n):'まだ選択されていません');
 update('[data-rof-v4-caption]',selected?'選択値：'+n+' / 10':'横軸で数値を選択してください');
 page.querySelectorAll('[data-rof-v4-anchor]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.rofV4Anchor)===ui.focusedAnchor)));
 page.querySelectorAll('[data-rof-v4-tick]').forEach(el=>el.classList.toggle('is-selected',selected&&Number(el.dataset.rofV4Tick)===n));
 const range=page.querySelector('[data-rof-v4-range]');if(range){range.value=selected?String(n):'5';range.setAttribute('aria-label',(ui.phase==='before'?'運動前':'運動後')+'のROF-J疲労感、0から10まで1ずつ');}
 update('[data-rof-v4-position]',a.positionLabel);update('[data-rof-v4-anchor-meaning]',a.descriptor);
 update('[data-rof-v4-anchor-note]',ui.readingAnchor?'選択したイラストの説明です。点数は変更されません。':selected?'選択値に近い代表イラストです。':'代表位置の説明です。数値は未入力です。');
 const clear=page.querySelector('[data-rof-v4-clear]');if(clear)clear.disabled=!selected;
}