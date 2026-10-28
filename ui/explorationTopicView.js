import {EXPLORATION_DRAFT_GUIDES} from './explorationTopicGuides.js';
// Pure, independently testable observation-guide presentation. Scientific literature is not inferred.
export function renderObservationGuide(ui,ctx,cat,topic,starter){
  const guide=EXPLORATION_DRAFT_GUIDES[cat.id+'|'+topic];
  const text=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const run=ctx.focusRunId&&ctx.focusRun?ctx.focusRun:null;
  const saved=ui.notes.filter(n=>n.topicId===guide?.id).slice(0,2);
  const link=run?'<a class="ex-learning-link" href="#/result?record='+encodeURIComponent(run.id)+'">この走行の結果へ戻る ›</a>':'';
  return '<div class="ex-learning ex-learning-empty ex-observation-guide"><div class="ex-learning-head"><span>自分の記録から考える</span><button type="button" class="ex-help" data-ex-action="learn-help" aria-label="内容の根拠と注意点">？</button></div><h3>'+text(topic)+'</h3>'
   +'<p class="ex-learning-lead">'+text(starter||guide?.question||'気になったことを、自分の経験や記録から考えてみましょう。')+'</p>'
   +'<p class="ex-guide-status">観察ガイド｜専門的な学習本文は出典審査前です</p>'
   +'<div class="ex-guide-grid"><section><h4>何を見てみる？</h4><p>'+text(guide?.question||'自分が気になったことを整理しましょう。')+'</p></section>'
   +'<section><h4>自分の記録とのつながり</h4><p>'+text(guide?.record||'記録がなくても自由に考えられます。')+'</p></section>'
   +'<section><h4>この情報からは言えないこと</h4><p>'+text(guide?.limit||'本人の身体の状態や原因を断定しません。')+'</p></section>'
   +'<section><h4>次に確かめたいこと</h4><p>'+text(guide?.next||'自分で考えたことを任意でメモできます。')+'</p></section></div>'
   +(run?'<div class="ex-context"><small>選択した走行</small><p>'+text(run.date)+'に保存した走行から調べています。走行の事実と自分の感想を混同しません。</p>'+link+'</div>':'')
   +'<div class="ex-note-invite"><div><strong>気づいたことを残す</strong><p>必要なときだけ、本人の言葉で保存できます。</p></div><button type="button" data-ex-action="note">書いてみる <span aria-hidden="true">＋</span></button></div>'
   +(saved.length?'<div class="ex-note-preview"><strong>以前に書いたこと</strong>'+saved.map(n=>'<p>'+text(n.text)+'</p>').join('')+'</div>':'')+'</div>';
 }
