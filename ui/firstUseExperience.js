// First-use experience. Public copy intentionally avoids a provisional product name.
import {BODY_REGION_VIEWS} from "../assets/bodyRegionVisuals.js";
import {LEGAL_VERSION,legalDocumentMarkup,escapeLegalHtml} from "./legalDocuments.js";

export const FIRST_USE_STEPS=Object.freeze(["表示言語","利用規約・プライバシー","記録と振り返り","記録する","結果を確認する","履歴と体調","情報を調べる・共有する","プロフィール"]);
const h=escapeLegalHtml;
const badge=(title,body)=>'<article class="fu-feature"><span class="fu-feature-dot" aria-hidden="true">●</span><div><strong>'+title+'</strong><p>'+body+'</p></div></article>';
const panel=(heading,body)=>'<section class="fu-panel"><h3>'+heading+'</h3>'+body+'</section>';
const shortCard=(number,heading,description)=>'<div class="fu-number-card"><span>'+number+'</span><div><strong>'+heading+'</strong><p>'+description+'</p></div></div>';
const shell=(title,lead,body,kicker)=>'<header class="fu-screen-title"><span class="fu-eyebrow">'+kicker+'</span><h1 id="onboard-title">'+title+'</h1><p>'+lead+'</p></header>'+body;

function language(){
  return shell("表示言語","アプリ内の表示には日本語を使用します。",
    '<div class="fu-language-list" aria-label="表示言語">'
    +'<div class="fu-language-option fu-chosen"><span class="fu-language-mark" aria-hidden="true">あ</span><div><strong>日本語</strong><p>現在の表示言語</p></div><span class="fu-language-status">✓ 使用中</span></div>'
    +'<button type="button" class="fu-language-option fu-unavailable" disabled aria-label="英語は準備中のため選択できません"><span class="fu-language-mark" aria-hidden="true">A</span><div><strong>English</strong><p>準備中</p></div><span class="fu-language-status">選択不可</span></button>'
    +'</div>',"最初の設定");
}
function legal(state){
  return shell("利用規約とプライバシー","利用を開始する前に、利用条件と個人情報の取扱いを確認してください。",
    '<div class="fu-doc-links">'
    +'<button type="button" data-onboard-document="terms" class="fu-doc-link"><span class="fu-doc-symbol">§</span><span><strong>利用規約</strong><small>運動時の注意、測定結果、記録の保存と共有、運営者の責任</small></span><span class="fu-doc-chevron">全文を読む ›</span></button>'
    +'<button type="button" data-onboard-document="privacy" class="fu-doc-link"><span class="fu-doc-symbol">◇</span><span><strong>プライバシーポリシー</strong><small>保存する情報、GPS、外部サービスへの通信、削除と請求</small></span><span class="fu-doc-chevron">全文を読む ›</span></button>'
    +'</div>'
    +'<div class="fu-legal-checks"><label><input type="checkbox" data-onboard-terms '+(state.termsAccepted?'checked':'')+'> <span>利用規約を読み、内容に同意します。</span></label>'
    +'<label><input type="checkbox" data-onboard-privacy '+(state.privacyConfirmed?'checked':'')+'> <span>プライバシーポリシーを読み、内容を確認しました。</span></label></div>'
    +(state.error?'<p class="fu-error" role="alert">'+h(state.error)+'</p>':'')
    +'<p class="fu-muted">位置情報の使用は、GPS測定を開始する際に別途確認します。</p>',"利用開始前の確認");
}
function intro(){
  return shell("記録と振り返り","運動の記録と日々の体調を保存し、運動の経過を確認できます。",
    '<div class="fu-intro-cards">'+shortCard("01","手入力で記録する","本人の走行情報と感じたことを記録します。GPS測定は別の任意機能です。")
    +shortCard("02","結果を確認する","記録・主観・文献参考値の意味と限界を区別して確かめます。")
    +shortCard("03","過去と比較する","保存した過去の走行と、同じ意味・方法で比較できる情報だけを見比べます。")
    +shortCard("04","任意で気づきを書く","気づいたことや次に確かめたい問いを、自分の言葉で必要なときだけ残します。")+'</div>'
    +panel("利用の流れ",'<p>ホーム画面から手入力を始め、結果・過去比較を必要に応じて確認し、任意で気づきや問いを書き残せます。毎回すべての操作を行う必要はありません。</p>'),"初回ガイド 1 / 5");
}
function recording(){
  return shell("運動を記録する","運動の記録方法は、GPS測定と手入力から選択できます。",
    '<div class="fu-two-col">'
    +panel("GPSで測定",'<div class="fu-icon-graphic">⌖</div><p>位置情報を使用し、距離、時間及び移動経路を測定します。測定時に位置情報の許可が必要です。</p>')
    +panel("手入力で記録",'<div class="fu-icon-graphic">✎</div><p>運動の種類、距離、時間、コース等を入力できます。位置情報の使用は必要ありません。</p>')
    +'</div>'+panel("運動前後の疲労感",'<p>運動前と運動後の疲労感を、それぞれ0〜10の数値で入力できます。入力は任意です。</p>')
    +'<p class="fu-muted">測定中に画面をロックしたり別のアプリへ切り替えたりすると、GPS測定は一時停止します。</p>',"初回ガイド 2 / 5");
}
function results(){
  const maps=BODY_REGION_VIEWS.map(function(view){
    return '<div class="fu-body-map"><svg viewBox="70 10 160 430" role="img" aria-label="'+h(view.title)+'の人体図"><g fill="#c2dee4" stroke="#416f7d" stroke-width="0.45">'+view.silhouette+'</g></svg><strong>'+h(view.title)+'</strong></div>';
  }).join('');
  return shell("結果を確認する","保存した運動記録から、距離、時間、運動の結果及び参考値を確認できます。",
    '<div class="fu-body-maps">'+maps+'</div>'
    +panel("身体部位別の参考値",'<p>人体図から対象の部位を選び、表示された参考値の説明を確認できます。数値は医学的な診断や傷害の予測を示すものではありません。</p>')
    +'<p class="fu-muted">参考値には計算上の前提や適用範囲があります。数値のみで身体の状態や運動の安全性を判断しないでください。</p>',"初回ガイド 3 / 5");
}
function history(){
  return shell("履歴と体調を確認する","保存した記録を日付ごとに確認し、運動の経過を振り返ることができます。",
    '<div class="fu-two-col">'+panel("運動履歴",shortCard("01","日付から選ぶ","保存済みの運動記録を日付や種類で確認します。")
    +shortCard("02","結果を開く","選択した記録の詳細と結果を確認します。"))
    +panel("日々の体調",shortCard("01","体調を記録","日々の調子や睡眠等を記録できます。")
    +shortCard("02","変化を確認","保存した情報を日付に沿って確認します。"))+'</div>'
    +'<p class="fu-muted">記録のない日や入力しなかった項目は、測定結果があるものとして補完されません。</p>',"初回ガイド 4 / 5");
}
function explore(){
  return shell("情報を確認・共有する","運動記録に関連する情報を調べたり、必要な内容を整理して共有したりできます。",
    '<div class="fu-two-col">'+panel("関連情報を調べる",'<div class="fu-icon-graphic">✧</div><p>運動、身体、環境、疲労等の分野から情報を選び、記録と照らし合わせて確認できます。</p>')
    +panel("相談・共有",'<div class="fu-icon-graphic">▤</div><p>共有する項目を選択して、記録の内容を印刷又はPDFに保存できます。指導者等に提供する前に内容を確認してください。</p>')+'</div>'
    +panel("設定の変更",'<p>表示名、表示設定及び利用ガイドは、利用開始後も設定画面から確認できます。</p>'),"初回ガイド 5 / 5");
}
function profile(state){
  return shell("プロフィールの設定","利用目的や身体情報を必要に応じて登録できます。すべて任意で、後から設定できます。",
    '<div class="fu-profile-form">'
    +'<label>表示名（任意）<input data-onboard-nickname maxlength="40" autocomplete="nickname" placeholder="未入力でも利用できます" value="'+h(state.nickname)+'"></label>'
    +'<label>運動の目的（任意）<select data-onboard-purpose>'+[
      ["","選択しない"],["health","健康のため"],["record","ランニングの記録"],["learn","身体に関する理解"],["other","その他"]
    ].map(function(item){return '<option value="'+item[0]+'" '+(state.purpose===item[0]?'selected':'')+'>'+item[1]+'</option>';}).join('')+'</select></label>'
    +'<div class="fu-profile-pair"><label>身長（cm・任意）<input data-onboard-height type="number" inputmode="decimal" min="80" max="250" step="0.1" placeholder="未入力" value="'+h(state.heightCm)+'"></label>'
    +'<label>体重（kg・任意）<input data-onboard-weight type="number" inputmode="decimal" min="15" max="400" step="0.1" placeholder="未入力" value="'+h(state.weightKg)+'"></label></div>'
    +(state.error?'<p class="fu-error" role="alert">'+h(state.error)+'</p>':'')
    +'</div><p class="fu-muted">入力したプロフィールはこの端末に保存します。共有資料への掲載内容は共有時に確認できます。</p>',"任意プロフィール");
}
const pages=[language,legal,intro,recording,results,history,explore,profile];
export function renderFirstUse(state){
  const step=Math.max(0,Math.min(7,Number(state.step)||0));
  const current=pages[step](state);
  const canAdvance=step!==1 || (state.termsAccepted===true && state.privacyConfirmed===true);
  const final=step===7;
  const labels=step===0?"表示言語":step===1?"利用開始前の確認":step===7?"プロフィール":("ガイド "+(step-1)+" / 5");
  const progress='<div class="fu-progress" role="progressbar" aria-label="初回利用の進行状況" aria-valuenow="'+(step+1)+'" aria-valuemin="1" aria-valuemax="8">'+Array.from({length:8},function(_,i){return '<span class="'+(i<=step?'is-done':'')+'"></span>';}).join('')+'</div>';
  const sidebar='<aside class="fu-rail"><span class="fu-rail-mark" aria-hidden="true">◈</span><strong>走行記録</strong><p>初回利用の設定とガイド</p><ol>'
    +FIRST_USE_STEPS.map(function(label,i){return '<li class="'+(i===step?'is-current':i<step?'is-done':'')+'"><span>'+String(i+1).padStart(2,"0")+'</span>'+h(label)+'</li>';}).join('')+'</ol></aside>';
  const footer='<footer class="fu-footer"><button class="fu-button fu-secondary" type="button" data-onboard-back '+(step===0?'disabled':'')+'>戻る</button>'
    +'<span>'+h(labels)+'</span><div class="fu-footer-actions">'
    +(!state.replay&&step>=2&&step<=6?'<button class="fu-button fu-secondary" type="button" data-onboard-skip-guide>ガイドを後で見る</button>':'')
    +(final?'<button class="fu-button fu-secondary" type="button" data-onboard-skip-profile>設定せずに始める</button>':'')
    +'<button class="fu-button fu-primary" type="button" data-onboard-next '+(canAdvance?'':'disabled')+'>'+(final?'保存して始める':step===1?'同意して次へ':'次へ')+'</button></div></footer>';
  const doc=state.documentOpen?renderLegalDocumentModal(state.documentOpen):'';
  return '<div class="onboard-overlay fu-overlay" data-onboard-overlay><section class="onboard-dialog fu-shell" role="dialog" aria-modal="true" aria-labelledby="onboard-title"><div class="fu-layout">'
    +sidebar+'<div class="fu-workspace"><div class="fu-topbar"><div class="fu-topbrand">走行記録 <small>初回利用</small></div><span>'+h(labels)+'</span>'+(state.replay?'<button type="button" data-onboard-close aria-label="ガイドを閉じる">閉じる ×</button>':'')+'</div>'
    +progress+'<main class="fu-content">'+current+'</main>'+footer+'</div></div></section></div>'+doc;
}
export function renderLegalDocumentModal(kind){
  const title=kind==="privacy"?"プライバシーポリシー":"利用規約";
  return '<div class="fu-doc-backdrop" data-legal-backdrop><section class="fu-doc-dialog" role="dialog" aria-modal="true" aria-label="'+title+'の全文">'
    +'<header><strong>'+title+'</strong><button type="button" data-legal-dismiss>閉じる ×</button></header>'
    +'<div class="fu-doc-scroll" tabindex="0">'+legalDocumentMarkup(kind)+'</div>'
    +'<footer><span>制定日：'+LEGAL_VERSION+'</span><button type="button" data-legal-dismiss>確認画面に戻る</button></footer></section></div>';
}
