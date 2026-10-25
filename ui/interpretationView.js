import {buildLifePacket,latestEligibleLifeBaseline,evaluateLifeIntent,KNOWLEDGE,minuteText} from './interpretationRules.js';
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function lifeComparisonPanel(conditions,{a='',b='',notice='',intent=null}={}){
 const life=latestEligibleLifeBaseline(conditions);const r=buildLifePacket(conditions,a,b);
 const records=Array.isArray(r.records)?r.records:[];
 const choices=records.filter(x=>x.minutes!==null).map(x=>`<option value="${e(x.date)}">${e(x.date)}</option>`).join('');
 const select=(key,date)=>`<label>${key==='a'?'日付A':'日付B'}<select data-interpret-date="${key}" aria-label="比較する日付${key.toUpperCase()}"><option value="">選んでください</option>${records.filter(x=>x.minutes!==null).map(x=>`<option value="${e(x.date)}" ${x.date===date?'selected':''}>${e(x.date)}</option>`).join('')}</select></label>`;
 let info='';
 if(r.status==='ready'){
  info=`<div class="iv-packet" role="status"><h3>記録から分かること</h3><p>${e(r.observation)}</p><p>本人が記録した調子：${e(r.entries[0].feeling||'未入力')} ／ ${e(r.entries[1].feeling||'未入力')}</p><p class="iv-method">${e(r.methodLabel)}を同じ方法で入力した2日です。</p><h3>まだ分からないこと</h3><p>${e(r.uncertainty)}</p></div>`;
 }else info=`<div class="iv-packet iv-incomplete" role="status"><strong>比較はまだできません</strong><p>${e(r.reason||'安全に比較できる記録がありません')}</p><p>記録が不足していても、睡眠の知識は読むことができます。</p></div>`;
 const base=latestEligibleLifeBaseline(conditions);
 const canSave=!!base;
 return `<section class="iv-card" data-interpretation-life id="interpret-life"><div class="iv-topline"><div><small>履歴 / 生活記録</small><h2>睡眠と、その日の調子</h2></div><a href="#/exploration-tree" class="iv-quiet-link">探究へ戻る</a></div>
 <p>比べる理由：睡眠の記録と、その日の自分の調子を一緒に振り返るためです。走行の良し悪しを判定するものではありません。</p>
 <div class="iv-selects">${select('a',a)}${select('b',b)}</div>
 ${info}
 <details class="iv-knowledge"><summary>睡眠とランニングの知識を見る</summary><p>${e(KNOWLEDGE.summary)}</p><p>${e(KNOWLEDGE.applicability)}</p><a href="${KNOWLEDGE.url}" target="_blank" rel="noopener noreferrer">参考研究：${e(KNOWLEDGE.citation)} ↗</a></details>
 <div class="iv-next"><h3>次に確認すること</h3><p>次の生活記録が追加されたとき、アプリが同じ入力方法の記録を確認し、見比べられる状態になればホームに表示します。自動で原因を判定したり、通知を送ったりはしません。</p>
 ${canSave?`<button type="button" data-interpret-save-intent>次の記録と見比べることを保存（基準：${e(base?.date)}）</button>`:'<p>同じ方法の記録が保存されると選べます。</p>'}
 <a class="iv-quiet-link" href="#/home">生活記録を入力する</a></div>
 ${notice?`<p class="iv-feedback" role="status">${e(notice)}</p>`:''}</section>`;
}
export function actionIntentCard(intent,conditions,warning=''){
 if(!intent&&!warning)return '';
 const match=intent?evaluateLifeIntent(intent,conditions):null;
 const label=intent?.status==='paused'?'一時停止中':intent?.status==='reviewed'?'見返した内容':match?.status==='ready'?'見返せます':match?.status==='unavailable'?'記録を確認できません':'記録待ち';
 return `<section class="iv-card iv-home-card" data-interpretation-action aria-label="次に確認すること"><small>自分で決めたこと</small><h2>次に確認すること</h2>${intent?`<p>次の生活記録と見比べる</p><p class="iv-status">${e(label)}</p><p>${e(match?.reason||'本人が選んだ確認事項です')}</p><p class="iv-method">基準：${e(intent.baseline.date)}（${intent.baseline.method==='self-reported'?'申告した睡眠時間':'就寝〜起床の経過時間'}）</p>
 <div class="iv-actions"><a href="#/history" data-interpret-open-history>履歴で確認する</a>${intent.status==='active'&&match?.status==='ready'?'<button type="button" data-interpret-mark-reviewed>見返した</button>':''}${intent.status==='paused'?'<button type="button" data-interpret-resume>再開</button>':'<button type="button" data-interpret-pause>一時停止</button>'}<button type="button" data-interpret-delete>削除</button></div>`:''}${warning?`<p role="alert">${e(warning)}</p>`:''}</section>`;
}
