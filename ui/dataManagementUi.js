// Settings: user-directed backup, review, restore, and deletion controls.
import {DATA_KEYS,BACKUP_NOTICE} from "./dataManagement.js";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&quot;"}[c]));
const fieldTitles=Object.freeze({
 [DATA_KEYS[0]]:"手入力の運動記録",
 [DATA_KEYS[1]]:"日々の体調・睡眠",
 [DATA_KEYS[2]]:"保存コース",
 [DATA_KEYS[3]]:"振り返り",
 [DATA_KEYS[4]]:"メモ",
 [DATA_KEYS[5]]:"確認事項",
 [DATA_KEYS[6]]:"ホームの表示設定",
 [DATA_KEYS[7]]:"プロフィール",
 [DATA_KEYS[8]]:"表示設定"
});
export function makeDataUi(){return {includeGps:false,pendingText:"",preview:null,safetyCopy:false,deleteWord:"",deleteAgreed:false,notice:"",busy:false};}
function summary(counts,gpsCount){
 const pieces=DATA_KEYS.map(k=>({name:fieldTitles[k],count:counts?.[k]||0})).filter(x=>x.count>0);
 if(gpsCount>0)pieces.push({name:"GPS記録・結果",count:gpsCount});
 return pieces.length?'<ul class="dm-summary">'+pieces.map(x=>'<li><span>'+esc(x.name)+'</span><strong>'+x.count+'件</strong></li>').join('')+'</ul>':
  '<p class="dm-help">対象の記録がない場合でも、保存されている設定を含むファイルを作成できます。</p>';
}
export function renderDataBackup(ui){
 const count=ui.preview?.parsed?.counts,gps=ui.preview?.parsed?.gpsCount||0;
 const ready=!!ui.preview?.ok;
 const present=!!ui.preview?.hasExisting;
 const canRestore=ready&&(!present||ui.safetyCopy);
 return '<div class="dm-stack" data-dm-ui>'
  +'<div class="dm-section"><h3>バックアップを作成</h3>'
  +'<p>この端末の運動記録、体調、保存コース、メモ、プロフィール、表示設定などを一つのJSONファイルに保存します。ファイルは外部へ自動送信されません。</p><p class="dm-warning">保存されるファイルには身体や生活に関する個人情報が含まれ、暗号化されません。保管先と共有先を確認してください。</p>'
  +'<label class="dm-choice"><input type="checkbox" data-dm-include-gps '+(ui.includeGps?'checked':'')+'><span>GPS記録・走行経路も含める</span></label>'
  +'<p class="dm-warning">GPSを含めると自宅周辺の経路などの位置情報がファイルに保存されます。ファイルは暗号化されません。第三者と共有せず、安全な場所に保管してください。</p>'
  +'<button class="dm-btn dm-primary" type="button" data-dm-export '+(ui.busy?'disabled':'')+'>バックアップファイルを保存</button>'
  +'</div>'
  +'<div class="dm-section"><h3>バックアップを復元</h3>'
  +'<p>保存したJSONファイルを選択します。形式と記録の内容を検証し、既存の記録を上書きせずに追加します。内容が競合した場合は復元を中止します。</p>'
  +'<label class="dm-file"><strong>ファイルを選択</strong><input type="file" data-dm-file accept=".json,application/json" '+(ui.busy?'disabled':'')+'></label>'
  +(ui.preview?.ok?'<div class="dm-preview"><strong>読み込む内容</strong>'+summary(count,gps)
    +(present?'<p class="dm-warning">この端末には既存データがあります。復元前に現在の記録をバックアップしてください。</p>'
    +'<label class="dm-choice"><input type="checkbox" data-dm-safety '+(ui.safetyCopy?'checked':'')+'><span>現在のデータを別のファイルに保存し、保存先を確認しました。</span></label>':'')
    +'<button class="dm-btn dm-primary" type="button" data-dm-restore '+(canRestore&&!ui.busy?'':'disabled')+'>内容を確認して復元する</button></div>':'')
  +'</div>'
  +'<p class="dm-help">'+esc(BACKUP_NOTICE)+'</p>'
  +(ui.notice?'<p class="dm-status" role="status">'+esc(ui.notice)+'</p>':'')
  +'</div>';
}
export function renderDataDelete(ui){
 return '<div class="dm-stack" data-dm-delete>'
  +'<p>このアプリが端末内に保存した運動記録、GPS記録、体調、メモ、プロフィール、設定、利用開始時の確認記録を削除します。</p>'
  +'<p class="dm-warning"><strong>削除後は元に戻せません。</strong> ダウンロード済みのJSONファイルやPDF、ブラウザのキャッシュ、他のWebサイトの情報は削除されません。必要な記録は先にバックアップしてください。</p>'
  +'<label class="dm-choice"><input type="checkbox" data-dm-delete-agree '+(ui.deleteAgreed?'checked':'')+'><span>削除する内容と、復元できないことを確認しました。</span></label>'
  +'<label class="dm-confirm">確認のため「削除」と入力してください。<input type="text" data-dm-delete-word maxlength="2" autocomplete="off" value="'+esc(ui.deleteWord)+'" placeholder="削除"></label>'
  +'<button class="dm-btn dm-danger" type="button" data-dm-delete-confirm '+(ui.deleteAgreed&&ui.deleteWord==="削除"&&!ui.busy?'':'disabled')+'>端末内の記録と設定を削除</button>'
  +(ui.notice?'<p class="dm-status" role="status">'+esc(ui.notice)+'</p>':'')
  +'</div>';
}
