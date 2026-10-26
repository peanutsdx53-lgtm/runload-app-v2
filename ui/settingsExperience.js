// RunLoad v2 settings: local-only opt-in preferences. No legal consent is recorded here.
export const PROFILE_KEY='runload-v2-user-profile-v1';
export const DISPLAY_KEY='runload-v2-display-preferences-v1';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const purposeOptions=Object.freeze([['','選択しない'],['health','健康のため'],['record','ランニングの記録'],['learn','身体への理解・探究'],['other','その他']]);
const ageOptions=Object.freeze([['','回答しない'],['under18','18歳未満'],['18-29','18〜29歳'],['30-39','30〜39歳'],['40-49','40〜49歳'],['50-59','50〜59歳'],['60plus','60歳以上']]);
const within=(value,min,max)=>{const n=Number(value);return value!==''&&Number.isFinite(n)&&n>=min&&n<=max?n:null};
function parse(storage,key){try{const v=JSON.parse(storage?.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch{return null}}
export function loadProfile(storage,legacy={}){
 const saved=parse(storage,PROFILE_KEY)||{};
 const nickname=String(saved.nickname??legacy.nickname??'').slice(0,40);
 const purpose=purposeOptions.some(x=>x[0]===saved.purpose)?saved.purpose:(purposeOptions.some(x=>x[0]===legacy.purpose)?legacy.purpose:'');
 return {nickname,purpose,heightCm:within(saved.heightCm??'',80,250),weightKg:within(saved.weightKg??'',15,400),ageBand:ageOptions.some(x=>x[0]===saved.ageBand)?saved.ageBand:'',};
}
export function saveProfile(storage,raw){
 const nickname=String(raw.nickname??'').trim();
 if(nickname.length>40)return {ok:false,message:'表示名は40文字以内にしてください。'};
 const height=String(raw.heightCm??'').trim(),weight=String(raw.weightKg??'').trim();
 if(height!==''&&within(height,80,250)===null)return {ok:false,message:'身長は80〜250cmの範囲で入力してください。'};
 if(weight!==''&&within(weight,15,400)===null)return {ok:false,message:'体重は15〜400kgの範囲で入力してください。'};
 const profile={nickname,purpose:purposeOptions.some(x=>x[0]===raw.purpose)?raw.purpose:'',heightCm:height===''?null:Number(height),weightKg:weight===''?null:Number(weight),ageBand:ageOptions.some(x=>x[0]===raw.ageBand)?raw.ageBand:''};
 try{if(!storage)throw Error('unavailable');storage.setItem(PROFILE_KEY,JSON.stringify(profile));return {ok:true,value:profile}}catch{return {ok:false,message:'端末内に保存できませんでした。保存領域を確認してください。'}}
}
export function loadDisplay(storage){const s=parse(storage,DISPLAY_KEY)||{};return {textSize:s.textSize==='large'?'large':'standard',motion:s.motion==='reduce'?'reduce':'system',language:'ja',theme:'dark'};}
export function saveDisplay(storage,settings){const data={textSize:settings.textSize==='large'?'large':'standard',motion:settings.motion==='reduce'?'reduce':'system'};try{if(!storage)throw Error('unavailable');storage.setItem(DISPLAY_KEY,JSON.stringify(data));return {ok:true,value:{...data,language:'ja',theme:'dark'}}}catch{return {ok:false,message:'表示設定を保存できませんでした。'}}}
export function applyDisplay(settings,root){if(!root)return;root.classList.toggle('rl-text-large',settings.textSize==='large');root.classList.toggle('rl-reduce-motion',settings.motion==='reduce');}
export const PURPOSE_OPTIONS=purposeOptions;
export const AGE_OPTIONS=ageOptions;
const choice=(name,options,selected)=>options.map(([value,label])=>`<option value="${escape(value)}" ${selected===value?'selected':''}>${escape(label)}</option>`).join('');
const item=(symbol,title,desc,body,{hint='',open=false}={})=>`<details class="s2-item" ${open?'open':''}><summary><span class="s2-item-icon" aria-hidden="true">${symbol}</span><span class="s2-item-copy"><strong>${title}</strong><small>${desc}</small></span>${hint?`<em class="s2-indicator">${hint}</em>`:''}<span class="s2-chevron" aria-hidden="true">⌄</span></summary><div class="s2-item-content">${body}</div></details>`;
const group=(icon,title,children)=>{const tones={'表示と言語':'aqua','利用者情報':'mint','記録と測定':'blue','データとプライバシー':'violet','アプリとヘルプ':'slate'};return `<section class="s2-panel" data-settings-tone="${tones[title]||'aqua'}"><header class="s2-panel-head"><span class="s2-panel-icon" aria-hidden="true">${icon}</span><h2>${title}</h2></header><div class="s2-rows">${children.join('')}</div></section>`;};
export function renderSettings({profile,display,notice=''}){
 const p=profile||loadProfile(null),d=display||loadDisplay(null);
 const textOptions=`<div class="s2-choice-row" role="group" aria-label="文字サイズ"><button type="button" data-settings-text="standard" aria-pressed="${d.textSize==='standard'}">標準</button><button type="button" data-settings-text="large" aria-pressed="${d.textSize==='large'}">大きめ</button></div>`;
 const motionOptions=`<div class="s2-choice-row" role="group" aria-label="画面の動き"><button type="button" data-settings-motion="system" aria-pressed="${d.motion==='system'}">端末に合わせる</button><button type="button" data-settings-motion="reduce" aria-pressed="${d.motion==='reduce'}">動きを抑える</button></div>`;
 const purposeChoices=choice('purpose',purposeOptions,p.purpose);
 const profileForm=`<div class="s3-profile-intro"><span class="s3-optional-mark">すべて任意</span><p>必要な項目だけ入力できます。情報はこの端末に保存し、自動送信しません。</p></div>
 <form data-settings-profile-form class="s3-profile-form">
 <div class="s3-field s3-full"><label for="s3-nickname">表示名 <small>任意</small></label><input id="s3-nickname" name="nickname" maxlength="40" autocomplete="nickname" value="${escape(p.nickname)}" placeholder="例：ランナー / 未入力でもOK"></div>
 <div class="s3-field s3-full s4-purpose-field"><label for="s4-purpose">走る目的 <small>一つ選択・任意</small></label><div class="s4-purpose-select"><span class="s4-purpose-icon" aria-hidden="true">↗</span><select id="s4-purpose" name="purpose">${purposeChoices}</select><span class="s4-purpose-chevron" aria-hidden="true"></span></div><p class="s4-purpose-help">選択肢は必要なときだけ表示します。</p></div>
 <div class="s3-profile-metrics"><div class="s3-field"><label for="s3-height">身長 <small>任意</small></label><div class="s3-measure"><input id="s3-height" name="heightCm" type="number" inputmode="decimal" min="80" max="250" step="0.1" value="${p.heightCm??''}" placeholder="未入力"><span aria-hidden="true">cm</span></div></div><div class="s3-field"><label for="s3-weight">体重 <small>任意</small></label><div class="s3-measure"><input id="s3-weight" name="weightKg" type="number" inputmode="decimal" min="15" max="400" step="0.1" value="${p.weightKg??''}" placeholder="未入力"><span aria-hidden="true">kg</span></div></div></div>
 <div class="s3-field s3-full"><label for="s3-age">年齢帯 <small>任意</small></label><select id="s3-age" name="ageBand">${choice('ageBand',ageOptions,p.ageBand)}</select></div>
 <div class="s3-profile-action"><button class="s2-save s3-save-primary" type="submit"><span aria-hidden="true">✓</span> プロフィールを保存</button><p>探究・測定での利用は機能接続後に対応します。</p></div>
 </form>`;
 const groups=[
  group('◈','表示と言語',[
   item('文','文字サイズ','読みやすい大きさに調整',textOptions,{hint:'変更可能'}),
   item('◌','画面の動き','端末の設定を尊重',motionOptions,{hint:'変更可能'}),
   item('あ','表示言語','日本語',`<div class="s2-fixed"><span>日本語 <b>使用中</b></span><span class="s2-soon">English — 対応予定</span></div><p>英語の専門用語・研究上の表記を検証してから追加します。</p>`,{hint:'日本語'}),
   item('☾','外観','ダークモードを標準で使用',`<div class="s2-theme-preview"><span class="s2-theme-mini s2-dark-mini">☾ <b>ダーク</b> <small>使用中</small></span><span class="s2-theme-mini s2-light-mini">☀ <b>ライト</b> <small>対応予定</small></span></div><p>ライトモードは人体図・グラフまで対応した後に公開します。</p>`,{hint:'ダーク'})
  ]),
  group('♧','利用者情報',[
   item('♙','プロフィール','身長・体重・目的などの任意情報',profileForm,{hint:'編集できます'}),
   item('♧','使用したシューズ','保存候補の管理',`<p>シューズ候補の保存・編集は、準備ができ次第、利用できるようになります。過去記録は変更しません。</p>`,{hint:'準備中'})
  ]),
  group('◉','記録と測定',[
   item('◎','位置情報','GPS測定時の権限・位置情報',`<p>位置情報へのアクセスはGPS測定を利用する際に端末が確認します。権限は端末・ブラウザ側で変更できます。この設定画面では位置情報の許可を変更できません。</p>`,{hint:'案内'}),
   item('◴','測定中のお知らせ','音・振動などの通知',`<p>GPSでの測定中に音や振動で知らせる機能は、まだ利用できません。</p>`,{hint:'準備中'})
  ]),
  group('▤','データとプライバシー',[
   item('▣','バックアップ・復元','端末内の記録を保護',`<p>データ形式の検査・復元前バックアップ・破損防止が完成してから有効化します。現在、復元や書き出しは実行できません。</p>`,{hint:'準備中'}),
   item('×','データの削除','保存した情報を安全に削除',`<p>正式保存とバックアップの連携後に、確認手順付きで提供します。設定画面から誤って削除できる状態にはしません。</p>`,{hint:'準備中'}),
   item('§','利用規約・プライバシー','正式公開時に必要な文書',`<p>現在は画面・操作の検証段階です。正式公開時は、確定した文書を提示し必要な同意を取得します。ここで同意済みになることはありません。</p>`,{hint:'準備中'})
  ]),
  group('ⓘ','アプリとヘルプ',[
   item('⇩','アプリをインストール','ホーム画面やPCに追加',`<button type="button" class="s2-inline-btn" data-install-app>インストール方法を見る →</button>`,{hint:'案内あり'}),
   item('?','初回ガイド','使い始めの案内を再確認',`<button type="button" class="s2-inline-btn" data-onboard-open>初回ガイドを開く →</button>`,{hint:'案内あり'}),
   item('ⓘ','このアプリについて','アプリの現在の状態',`<p>手入力した走行は端末に保存できます。GPSによる測定の保存と、身体の部位別の参考値の表示は準備中です。医療上の診断は行いません。</p>`,{hint:'アプリ情報'})
  ])
 ];
 return `<div class="s2-page" data-settings-v2><header class="s2-heading"><div><h1>設定</h1><p>使いやすさと、自分の情報を管理する。</p></div><div class="s2-locale"><span>日本語</span><span class="s2-status-dot" aria-hidden="true"></span><strong>暗い画面</strong></div></header>${notice?`<p class="s2-notice" role="status">${escape(notice)}</p>`:''}<div class="s2-grid"><div class="s2-column">${groups.slice(0,3).join('')}</div><div class="s2-column">${groups.slice(3).join('')}</div></div><p class="s2-footer">日本語版 · 設定はこの端末に保存されます</p></div>`;
}
