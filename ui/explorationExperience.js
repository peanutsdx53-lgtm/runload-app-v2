import {createExplorationContext, compareLifeDays, readCourseDraft} from "./explorationReadAdapter.js";
import {EXPLORATION_DRAFT_GUIDES} from "./explorationTopicGuides.js";
import {renderObservationGuide} from "./explorationTopicView.js";
// RunLoad exploration field v3. Relevance is a traceable link to available data,
// not a diagnosis, performance ranking, inferred cause, or physiological score.
// Separate opt-in exploration notes never mutate or read the run history store.
export const EXPLORATION_NOTE_KEY="runload-v2-exploration-notes-v1";
const LIMIT=50;
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const meta={
 "01":{short:"走行記録",glyph:"◷",x:17,y:20,accent:"#79c2f4",why:"走行距離や時間の入力があります"},
 "02":{short:"身体",glyph:"◎",x:49,y:12,accent:"#f4b978",why:"身体についてのメモがあります"},
 "03":{short:"コース",glyph:"⌁",x:82,y:20,accent:"#65e5c2",why:"坂道や路面の情報があります"},
 "04":{short:"疲れと回復",glyph:"♡",x:85,y:54,accent:"#d4adfb",why:"運動前後の疲れを入力しています"},
 "05":{short:"暮らし",glyph:"✦",x:69,y:85,accent:"#9de9e0",why:"生活コンディションの記録があります"},
 "06":{short:"走る前後",glyph:"✳",x:30,y:85,accent:"#c3b5ff",why:"走る前後の工夫についての記録があります"},
 "07":{short:"楽しみ方",glyph:"⚑",x:15,y:54,accent:"#faa6c8",why:"自分の目標についての記録があります"}
};
const isProvided=x=>x!==null&&x!==undefined&&String(x).trim()!=="";
export function makeUi(storage){
 const ui={selected:"03",topic:"",search:"",tab:"field",sample:false,notes:[],storage,canSave:true,notice:"",modal:"",trialDistance:5,trialMinutes:30,toolChoice:"up",bodyChoice:"hip",lifeA:"",lifeB:"",followup:""};
 if(!storage){ui.canSave=false;return ui;}
 try{
  const raw=storage.getItem(EXPLORATION_NOTE_KEY);
  if(raw===null)return ui;
  const list=JSON.parse(raw);
  if(!Array.isArray(list)||list.length>LIMIT||list.some(n=>!n||typeof n!=="object"||typeof n.id!=="string"||typeof n.category!=="string"||typeof n.text!=="string"||!n.text.trim()||n.text.length>500||!/^[A-Za-z0-9_-]{1,32}$/.test(n.category)||n.id.length>80||typeof n.createdAt!=="string"||(n.topicId!==undefined&&typeof n.topicId!=="string")))throw Error("invalid notes");
  ui.notes=list;
 }catch{ui.canSave=false;ui.notice="メモを読み取れません。保存済みのデータは変更していません。";}
 return ui;
}

/* Only validated local manual-run records may light a saved-activity theme.
   Do not derive any injury, body loading or health interpretation here. */
function latestSavedManualRun(read,requestedId=null){
 if(read?.ok!==true||!Array.isArray(read.records))return null;
 return read.records.filter(r=>(requestedId===null||r.id===requestedId)&&r?.source==="manual"&&r.type==="run"&&r.schema===1&&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Number.isFinite(r.distanceKm)&&r.distanceKm>0&&
    Number.isInteger(r.durationSeconds)&&r.durationSeconds>0)
  .slice().sort((a,b)=>b.date.localeCompare(a.date)||String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null;
}
export function signals(draft,conditions,manualRuns=null,requestedId=null){
 const linked=new Map();
 const strict=createExplorationContext({draft,conditions});
 const sources=new Map(),recentRun=latestSavedManualRun(manualRuns,requestedId);
 const mark=(id,label,source)=>{if(!linked.has(id)){linked.set(id,label);sources.set(id,source);}};
 // Current draft is kept separate from confirmed saved runs.
 if(draft&&[draft.distance,draft.hours,draft.minutes,draft.seconds,draft.steps].some(isProvided))
  mark("01","入力中の走行距離・時間などに関連","draft");
 if(strict.highlights.some(h=>h.themeId==="上り坂・下り坂"))
  mark("03","入力中の上り坂・下り坂の情報に関連","draft");
 if(draft&&(draft.rofBefore!==null&&draft.rofBefore!==undefined&&String(draft.rofBefore).trim()!==""||
   draft.rofAfter!==null&&draft.rofAfter!==undefined&&String(draft.rofAfter).trim()!==""))
  mark("04","入力中の運動前後の疲れに関連","draft");
 if(draft&&isProvided(draft.bodyObservation))mark("02","入力中の身体に関するメモに関連","draft");
 if(recentRun){
  const date=recentRun.date;
  mark("01",date+" に保存した走行距離と時間に関連","saved-run");
  const course=readCourseDraft(recentRun.draft);
  if(course.status==="complete"&&(course.shares.up>0||course.shares.down>0))
   mark("03",date+" に保存した坂道の入力に関連","saved-run");
  if([recentRun.rofBefore,recentRun.rofAfter].some(x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=10))
   mark("04",date+" に保存したROF-Jの入力に関連","saved-run");
  if(isProvided(recentRun.draft?.bodyObservation))
   mark("02",date+" に保存した身体に関するメモに関連","saved-run");
 }
 const recent=strict.life.status==="complete"?strict.life.records.filter(n=>n.minutes!==null).at(-1):null;
 if(recent&&requestedId===null)mark("05",recent.date+" の生活コンディション記録に関連","saved-life");
 return {linked,sources,hasDraft:[...sources.values()].includes("draft"),hasSavedRun:[...sources.values()].includes("saved-run"),
  hasCondition:linked.has("05"),conditionDate:recent?.date||null,recentRunDate:recentRun?.date||null,strict};
}

function relevance(ui,ctx){
 if(ui.sample)return {linked:new Map([["01","表示例：走行距離の入力"],["03","表示例：上り坂の入力"]]),sources:new Map([["01","sample"],["03","sample"]]),hasDraft:false,hasCondition:false,sample:true};
 return {...signals(ctx.focusRunId?null:ctx.draft,ctx.conditions,ctx.manualRuns,ctx.focusRunId||null),sample:false};
}
function buttonAction(name,label,kind="") {return `<button type="button" class="ex-action ${kind}" data-ex-action="${name}">${label}</button>`;}

function art(links){
 const stars=Array.from({length:72},(_,i)=>{const x=(i*73+31)%760,y=(i*47+(i%5)*37+17)%520,r=i%7===0?1.75:.85;return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="#c4efff" opacity="'+(i%4===0?.52:.16)+'"/>';}).join("");
 const routes=Object.entries(meta).map(([id,p])=>{
  const active=links.linked.has(id);
  return '<path class="'+(active?'ex-constellation-link is-related':'ex-constellation-link')+'" d="M380 253 Q'+(380+(p.x*7.6-380)*.48)+' '+(253+(p.y*5.1-253)*.62-18)+' '+p.x*7.6+' '+p.y*5.1+'" stroke="'+p.accent+'" stroke-width="'+(active?'2.7':'1.5')+'" fill="none" opacity="'+(active?'.75':'.19')+'"/>';
 }).join("");
 return '<svg class="ex-art" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true"><defs><radialGradient id="ex-glow"><stop stop-color="#59efd9" stop-opacity=".4"/><stop offset="1" stop-color="#59efd9" stop-opacity="0"/></radialGradient></defs>'+stars+'<path class="ex-contours" d="M-70 370 Q125 120 310 356 T820 192 M-70 405 Q125 155 310 391 T820 227 M-70 438 Q125 188 310 424 T820 260 M-70 470 Q125 220 310 456 T820 290 M-70 502 Q125 252 310 488 T820 323" fill="none" stroke="#85d4cd" opacity=".12" stroke-width="2"/>'+routes+'<circle cx="380" cy="253" r="155" fill="url(#ex-glow)" opacity=".3"/></svg>';
}

const KNOWLEDGE={
 "距離・時間・ペース":{
   heading:"平均ペースと平均速度の見方",
   lead:"平均ペースは1 km進むためにかかる平均時間です。平均速度は1時間に進む平均距離です。どちらも記録した距離と経過時間から求められます。",
   warning:"平均値には速く走った区間もゆっくり進んだ区間も含まれます。手入力された距離と経過時間の計算であり、GPS測定や身体負荷の判定ではありません。",
   sourceNote:"距離と経過時間から求める算術上の定義です。個人への効果や医学的な主張を裏付ける文献引用ではありません。"
 },
 "足・膝・股関節":{
   heading:"走るとき、脚の関節はどう働く？",lead:"地面を押して前に進むとき、股関節・膝・足首が連携して動きます。走る速さが変わると、関節の動きや仕事の分担も変化し得ます。",
   cite:"Fukuchi ほか（2017）",url:"https://doi.org/10.7717/peerj.3298",warning:"定速トレッドミル走を扱った研究に基づく一般知識です。初心者本人の関節への負荷やけがの可能性を判定するものではありません。",sourceNote:"Fukuchi ほか（2017）は習慣的に走る28人を対象に、2.5・3.5・4.5 m/sでのトレッドミル走行時の下肢関節角度・関節モーメント等を測定しました。利用者本人の関節を計測したものでも、負荷を個別推定できる根拠でもありません。"},
 "上り坂・下り坂":{
   heading:"上り坂と下り坂、走る動きの違い",lead:"上り坂では体を持ち上げて進む働きが、下り坂では前に進む勢いを受け止めて制御する働きが重要になります。",
   cite:"Vernillo ほか（2020）",url:"https://doi.org/10.1111/sms.13708",warning:"研究で設定した傾斜角度（度）と、アプリの上り・下りの走行コース構成比（％）は異なります。割合から個人の筋肉の負荷やけがの危険は計算できません。",sourceNote:"Vernillo ほか（2020）は成人19人のトレッドミル走で、速度2.50・3.33・4.17 m/s、傾斜角0・±5・±10度における地面反力・筋活動等を調べました。アプリの「上り30％」はコース構成比であり、実験の傾斜角度とは比較できません。"},
 "12部位の参考値の見方":{
   heading:"文献の参考値をどう読めばよい？",lead:"各部位の数値は、その部位自身の文献上の参照値を100として表したものです。あなたの身体の負荷を測定した数値ではありません。まず部位の名前と研究条件を確かめ、適用外の数値は表示しない決まりを確認しましょう。",
   cite:"部位ごとの採用研究（研究Currentの原典台帳）",warning:"異なる身体部位同士の大小比較や危険度の順位はできません。速度条件や活動種別に適用できない場合、参考値を無理に算出しません。",
   sourceNote:"文献と測定量・適用条件は部位ごとに異なります。ひとつの原著を12部位すべての共通根拠とはしません。結果画面では数値の可否と限界を確認でき、原著との対応は研究用の出典台帳で管理しています。"},
 "自分が感じた疲れ":{
   heading:"自分で感じた疲れを見返す",lead:"運動前と運動後に本人が0〜10で回答した疲労感は、本人の主観的な記録です。0は未回答ではなく、有効な回答として扱います。数値を確認して、どのように感じたかを自分の言葉で振り返れます。",
   cite:"Suzuki・Arai（2026）",url:"https://doi.org/10.1186/s40798-026-01108-8",
   warning:"本人の感じ方と文献参考値は異なる情報です。数値の差だけで原因、身体組織の状態やケガを判断することはできません。",
   sourceNote:"日本語版ROF-Jは大学生85人と大学運動部員35人などで検討された、主観的な疲労感を記録する尺度です。初心者ランナー全員での妥当性や傷害リスクの予測を保証するものではありません。本人が回答した0と未回答を区別します。"},
 "過去の走りとの比較":{
   heading:"違いを見つけて、自分で考える",lead:"保存された2回の走行を、距離・経過時間・平均ペース・回答した疲労感など同じ意味の項目で並べると、何が異なっていたかを確かめられます。",
   cite:"Li, Dey & Forlizzi（2011）",url:"https://doi.org/10.1145/2030112.2030166",warning:"過去との違いだけでは能力の向上・負荷・原因・次回の結果を示せません。活動種別の相違や欠測がある場合は不適切な比較や補完をしません。",sourceNote:"Li, Dey & Forlizzi（2011）は、自己記録に関する現在・履歴・目標・差異・文脈・要因などの情報ニーズを質的に調べました。記録を並べて問いを考えられるUIの設計背景ですが、この比較機能の効果を直接実証した研究ではありません。"},
 "気付きと次の確認":{
   heading:"気になることを、自分の言葉で残す",lead:"今回の記録と過去の記録を見て、次に何を確かめたいか、気になったことを任意で残せます。毎回メモを残す必要はありません。後で読み返し、考えが変わっていても構いません。",
   cite:"Epstein ほか（2015）",url:"https://doi.org/10.1145/2750858.2804250",warning:"メモの保存や再訪は自己理解の向上を証明しません。記述内容は本人の自由な考えであり、行動指示・医学的助言ではありません。",sourceNote:"Epstein ほか（2015）は日常的な自己記録の収集・振り返り・中断・再開を整理した個人情報学のモデルです。任意メモと後からの再訪を認める設計の背景であり、Runloadの効果を直接示したものではありません。"},
 "疲れの感じ方":{
   heading:"疲れの数字と、自分の感じ方",lead:"走る前の疲れと走った後の疲れは、同じ0〜10の尺度でも、記録した時点を区別して考えます。自分の感覚を思い出すための手掛かりであり、他人との優劣を表すものではありません。",
   cite:"Suzuki・Arai（2026）",url:"https://doi.org/10.1186/s40798-026-01108-8",
   warning:"運動前の回答を後から補ったものや、回答のない項目を推測しません。文献参考値と合算した総合スコアも作りません。",
   sourceNote:"ROF-Jは主観的疲労を扱う日本語尺度です。妥当性の検討対象は大学生や運動部員であり、初心者ランナーの身体組織や安全性を判定する検査ではありません。運動前後の値は本人が記録した時点の違いとして示します。"},
 "自分に合う記録の使い方":{
   heading:"毎回すべてを記録しなくてもいい",lead:"気になる項目だけを確かめる、少し間が空いてから振り返る、記録なしで知識を調べるなど、使い方は本人が選べます。記録の量よりも、何を知りたいかを大切にします。",
   cite:"Epstein ほか（2015）",url:"https://doi.org/10.1145/2750858.2804250",warning:"これは自己記録に関する設計方針です。利用継続率や自己理解への効果を検証した結果ではありません。",sourceNote:"Epstein ほか（2015）は日常生活の中で自己記録を中断・再開する経験を扱いました。必要に応じた記録と再訪を可能にする設計上の理由であり、記録の省略が特定の効果を生むと示した研究ではありません。"},
 "睡眠":{
   heading:"睡眠と、走る日の調子",lead:"睡眠は回復や日中の注意・気分とも関係します。短い睡眠や質の低下が続くと運動への影響が懸念されますが、必要な睡眠の長さには個人差があります。",
   cite:"Walsh ほか（2021）",url:"https://doi.org/10.1136/bjsports-2020-102025",warning:"競技者を主な対象とした研究・専門家の合意文書です。初心者個人の必要睡眠時間を指定せず、本人の生活記録から睡眠と走行の因果関係を推定しません。",sourceNote:"Walsh ほか（2021）は競技者の睡眠に関するナラティブレビューと専門家コンセンサスです。初心者向けの個別処方ではなく、本人の睡眠記録と主観的な調子を分けて考えるための背景知識として参照します。"}
};
const STARTER_GUIDES=Object.freeze({
  "距離・時間・ペース": "記録した距離と時間を見て、今日はどんなペースだったか確かめてみましょう。",
  "自分が感じた疲れ": "運動前と運動後に感じた疲れを、ROF-Jの記録と一緒に見返してみましょう。",
  "過去の走りとの比較": "距離やコースが近い日の走りを並べると、どこが違ったか考えるきっかけになります。",
  "気付きと次の確認": "気になったことを一つだけ書いておくと、次に走ったときに見返しやすくなります。",
  "姿勢と走る動作": "走っているとき、体がどんなふうに動いているか。気になる動きを言葉にしてみましょう。",
  "体幹と腕の動き": "腕の振りや上半身の動きについて、走っているときに気付いたことはありますか？",
  "12部位の参考値の見方": "部位ごとの数値を見る前に、その数値が「何と比べた値か」を確認してみましょう。",
  "路面": "同じ距離でも、舗装路と土の道では走った感じが違うことがあります。自分はどう感じましたか？",
  "気温・天候": "暑い日、寒い日、雨の日。走りやすかった条件を思い出してみましょう。",
  "屋外・室内": "外と室内、どちらが走りやすいですか？そう感じた理由をメモできます。",
  "疲れの感じ方": "走り終えた後の疲れだけでなく、走る前の感覚も振り返ってみましょう。",
  "筋肉痛・違和感": "どこに、いつ、どんな感じがありましたか？無理に原因を決めず、まず記録を整理しましょう。",
  "休養と回復": "休んだ次の日はどう感じましたか？休んだ日と調子の記録を見返してみましょう。",
  "疲れを考える視点": "疲れを考えるときは、その日の運動だけでなく、睡眠や気分なども思い出してみましょう。",
  "食事・水分": "走る前後に食べたものや飲んだものについて、気になったことはありますか？",
  "気分・ストレス": "走りたい気分の日も、そうでない日もあります。気持ちの変化を記録してみましょう。",
  "日々のコンディション": "朝の調子と睡眠の記録を見返して、続けて気付いたことがあるか探してみましょう。",
  "ウォームアップ": "走り始める前に何をしていますか？次も続けたいことや、気になることを書いておけます。",
  "走行中の対応": "走っている途中にペースを変えたことや、休んだことはありますか？",
  "クールダウン・ストレッチ": "走り終えた後、いつも何をしていますか？自分の習慣を整理してみましょう。",
  "無理をしない判断": "走るのをやめたり、休むことを選んだときは、どんな理由がありましたか？",
  "走る目的": "何のために走りたいと思いましたか？今の気持ちを短く書いてもかまいません。",
  "目標との付き合い方": "目標を決めるなら、今の自分にとって無理のないものから考えてみましょう。",
  "楽しみ方": "景色、音楽、友人との時間など、走って楽しかったことを思い出してみましょう。",
  "自分に合う記録の使い方": "毎回すべてを記録する必要はありません。何を見返したいかから決めてみましょう。"
});
export const LEARNING_TOPICS=Object.freeze({"01|距離・時間・ペース":"distance-time-pace","02|足・膝・股関節":"body-movement","03|上り坂・下り坂":"slope-running","05|睡眠":"sleep-recovery","02|12部位の参考値の見方":"reference-reading","01|自分が感じた疲れ":"felt-fatigue","01|過去の走りとの比較":"saved-comparison","01|気付きと次の確認":"voluntary-reflection","04|疲れの感じ方":"fatigue-reading","07|自分に合う記録の使い方":"personal-record-use"});
const followups={
 "body-movement":["次は走るときの股関節の動きを意識してみたい","足首の動きについてもう少し調べたい"],
 "slope-running":["次は上りと下りで感じ方を確かめたい","坂道のある日とない日の記録を見比べたい"],
 "sleep-recovery":["次は起床時の調子も記録してみたい","睡眠の記録を数日分見返してみたい"]
};
function experience(ui,ctx,cat,topic){
 const entry=KNOWLEDGE[topic],key=LEARNING_TOPICS[cat.id+"|"+topic];
 if(!entry||!key)return renderObservationGuide(ui,ctx,cat,topic,STARTER_GUIDES[topic]);
 const strict=createExplorationContext({draft:ctx.draft,conditions:ctx.conditions});
 // A selected run must never inherit a link from separate life data.
 const reason=ctx.focusRunId?null:strict.highlights.find(h=>h.themeId===topic);
 const specific=relevance(ui,ctx).linked.get(cat.id);
 const who=ui.sample?"これは光の見え方の表示例です。保存した本人の記録ではありません。":reason?`${reason.why}（${reason.source==="unsaved-draft"?"まだ保存していない入力":"保存済みの生活記録"}）`:"関連する入力がなくても、内容を自由に学べます";
 const h=(text)=>esc(text);
 let tool='';
 if(key==='distance-time-pace'){
  const run=ui.sample?null:latestSavedManualRun(ctx.manualRuns,ctx.focusRunId||null);
  if(ui.sample)tool='<div class="ex-tool-result"><strong>表示例を見ています</strong><p>この画面では実際の走行記録と表示例を混ぜません。表示例を終了すると保存済みの値を確認できます。</p></div>';
  else if(ctx.manualRuns?.ok===false)tool='<div class="ex-tool-result"><strong>走行記録を読み取れません</strong><p>保存データの読み取りに問題があります。記録は変更せず、数値の表示を中止しています。</p></div>';
  else if(!run)tool=ctx.focusRunId?
   '<div class="ex-tool-result"><strong>指定した走行を確認できません</strong><p>このリンクに対応する保存済み走行が見つかりません。別の走行の数値で代用せず、履歴から記録を選び直してください。</p></div><a class="ex-learning-link" href="#/history">履歴で記録を選び直す ›</a>':
   '<div class="ex-tool-result"><strong>保存済みの走行はまだありません</strong><p>距離と時間を手入力で保存すると、ここに平均ペースと平均速度が表示されます。入力途中の数値は保存済みとして扱いません。</p></div><a class="ex-learning-link" href="#/record-start">記録を始める ›</a>';
  else{
   const paceSeconds=Math.round(run.durationSeconds/run.distanceKm);
   const pace=`${Math.floor(paceSeconds/60)}:${String(paceSeconds%60).padStart(2,'0')}`;
   const elapsed=`${Math.floor(run.durationSeconds/60)}分${String(run.durationSeconds%60).padStart(2,'0')}秒`;
   const kmh=(run.distanceKm*3600/run.durationSeconds).toFixed(1);
   tool='<div class="ex-tool-result"><strong>'+(ctx.focusRunId?"選択した保存済み走行（手入力）":"最新の保存済み走行（手入力）")+'</strong>'
    +'<p>'+h(run.date)+'</p><p>距離：'+h(run.distanceKm.toFixed(2))+' km</p><p>経過時間：'+h(elapsed)+'</p>'
    +'<p>平均ペース：<strong>'+h(pace)+' 分/km</strong></p><p>平均速度：'+h(kmh)+' km/h</p>'
    +'<small>保存済みの距離と経過時間から算術計算した平均値です。速度の変化、疲れ、身体の負荷や結果の良し悪しを示す数値ではありません。</small></div>'
    +'<a class="ex-learning-link" href="'+(ctx.focusRunId?'#/result?record='+encodeURIComponent(run.id):'#/history')+'">'+(ctx.focusRunId?'この走行の結果へ戻る':'履歴で保存した走行を確認')+' ›</a>';
  }
 }else if(['reference-reading','felt-fatigue','saved-comparison','voluntary-reflection','fatigue-reading','personal-record-use'].includes(key)){
  const run=ui.sample?null:latestSavedManualRun(ctx.manualRuns,ctx.focusRunId||null);
  const count=ctx.manualRuns?.ok===true?ctx.manualRuns.records.filter(x=>x?.source==='manual'&&x.type==='run').length:0;
  const detail=run?'<p>保存済み走行：'+h(run.date)+'、'+run.distanceKm.toFixed(2)+' km、経過時間 '+(run.durationSeconds/60).toFixed(1)+' 分</p>':'<p>記録がなくても内容を学べます。</p>';
  const feeling=run?'<p>本人の疲労感：運動前 '+(run.rofBefore===null?'未回答':run.rofBefore)+' ／ 運動後 '+(run.rofAfter===null?'未回答':run.rofAfter)+'</p>':'';
  const url=run?'#/result?record='+encodeURIComponent(run.id):'#/history';
  tool='<div class="ex-tool-result"><strong>自分の情報と照らす</strong>'+detail+(['felt-fatigue','fatigue-reading'].includes(key)?feeling:'')
   +(key==='saved-comparison'?'<p>保存された手入力走行は'+count+'件です。2件以上あれば結果画面から記録を選んで比較できます。</p>':'')
   +'<small>自動的な診断や原因推定はしません。</small></div><a class="ex-learning-link" href="'+url+'">'+(run?'この走行の結果へ戻る':'履歴を確認する')+' ›</a>';
 }else if(key==='body-movement'){
  const parts={hip:{label:"股関節",body:"脚を前後に動かす関節。走るときに身体を前へ進める動きに関係します。"},knee:{label:"膝",body:"着地して体を支える間に曲げ伸ばしし、力を受け止める動きに関わります。"},ankle:{label:"足首",body:"地面を押して進むときや、着地の姿勢を調整するときに働きます。"}};
  const part=parts[ui.bodyChoice]||parts.hip;
  tool=`<div class="ex-tool-switch" role="group" aria-label="注目する関節">${Object.entries(parts).map(([id,p])=>`<button type="button" data-ex-body="${id}" aria-pressed="${ui.bodyChoice===id}">${p.label}</button>`).join('')}</div>
  <div class="ex-tool-result"><strong>${h(part.label)}</strong><p>${h(part.body)}</p><small>一般的な働きの説明です。個人の関節を測定した結果ではありません。</small></div><a class="ex-learning-link" href="'+(ctx.focusRunId&&ctx.focusRun?'#/result?record='+encodeURIComponent(ctx.focusRun.id):'#/history')+'">'+(ctx.focusRunId&&ctx.focusRun?'この走行の結果画面の参考情報を見る':'履歴から結果画面の参考情報を見る')+' ›</a>`;
 }else if(key==='slope-running'){
  const course=ctx.focusRunId&&ctx.focusRun?readCourseDraft(ctx.focusRun.draft):strict.course;
  const sourceLabel=ctx.focusRunId&&ctx.focusRun?'保存した走行の入力':'入力途中';
  const choices={up:{label:"上り",title:"押して進む",body:"上りでは重力に逆らって身体を持ち上げる必要があり、平坦路とは動きや力の使い方が異なります。"},down:{label:"下り",title:"勢いを受け止める",body:"下りでは前へ進む勢いを制御するため、着地時のブレーキの働きが大切になります。"}};
  const c=choices[ui.toolChoice]||choices.up;
  const shares=course.status==='complete'&&course.shares?
   `<div class="ex-course-bars" role="img" aria-label="${sourceLabel}の上り${course.shares.up}％、下り${course.shares.down}％、入力上の平坦${course.shares.flat}％"><span style="width:${course.shares.up}%;background:#65ddce"></span><span style="width:${course.shares.down}%;background:#80a9ef"></span><span style="width:${course.shares.flat}%;background:#426577"></span></div><small>${sourceLabel}の割合：上り ${course.shares.up}％／下り ${course.shares.down}％／平坦 ${course.shares.flat}％。GPSによる標高断面ではありません。割合はコースの構成比であり、文献にある傾斜角（度）や路面勾配（％）ではありません。</small>`:
   `<p>確定できる坂道の割合はありません。走行の入力がない場合も学べます。</p>`;
  tool=`<div class="ex-tool-switch" role="group" aria-label="坂道の方向">${Object.entries(choices).map(([id,item])=>`<button type="button" data-ex-slope="${id}" aria-pressed="${ui.toolChoice===id}">${item.label}</button>`).join('')}</div><div class="ex-tool-result"><strong>${c.title}</strong><p>${c.body}</p></div><div class="ex-course-source">${shares}</div><a class="ex-learning-link" href="${ctx.focusRunId&&ctx.focusRun?'#/result?record='+encodeURIComponent(ctx.focusRun.id):'#/record-course'}">${ctx.focusRunId&&ctx.focusRun?'この走行の結果に戻る':'自分のコース入力を確認'} ›</a>`;
 }else{
  const life=strict.life,records=life.status==='complete'?life.records:[];
  const latest=records.at(-1)||null;
  const fmt=n=>n===null?'時間の記録なし':Math.floor(n/60)+'時間'+String(n%60)+'分';
  const type=s=>s==='time-in-bed'?'就床から起床までの時間':s==='self-reported'?'記録した睡眠時間':'入力方法が不明';
  tool=ctx.focusRunId?
    '<div class="ex-tool-result"><strong>走行と生活記録は別々に扱います</strong><p>この走行と睡眠・生活コンディションを自動で結びつけていません。別の日の生活記録を、この走行の日の状態として表示しません。</p><small>生活記録は本人が別画面で確認できます。同じ日付でも睡眠が走りの調子の原因とは判断できません。</small></div><a class="ex-learning-link" href="#/condition">生活コンディションの記録を確認 ›</a>':
    '<div class="ex-tool-result"><strong>'+(latest?'いちばん新しい生活記録':'生活記録はまだありません')+'</strong>'
   +(latest?'<p>'+h(latest.date)+'　'+h(fmt(latest.minutes))+'</p><p>朝の調子：'+h(latest.feeling||'記録なし')+'</p><small>'+h(type(latest.source))+'</small>':'<p>睡眠や朝の調子を記録すると、後から振り返れます。</p>')
   +'</div><a class="ex-learning-link" href="#/condition">睡眠と朝の調子を見てみる ›</a>';

 }
 const saved=ui.notes.filter(n=>n.topicId===key).slice(0,2);
 return '<div class="ex-learning" data-ex-learning="'+key+'"><div class="ex-learning-head"><span>まずは知ってみよう</span><button type="button" data-ex-action="learn-help" class="ex-help" aria-label="研究の出典と注意点">？</button></div><h3>'+h(entry.heading)+'</h3><p class="ex-learning-lead">'+h(entry.lead)+'</p>'
 +'<div class="ex-tool"><h4>'+(key==='body-movement'?'動きを選んでみよう':key==='slope-running'?'上りと下りを比べよう':'自分の記録も見てみよう')+'</h4>'+tool+'</div>'
 +((specific||reason)&&!ui.sample?'<div class="ex-context"><small>あなたの記録とのつながり</small><p>'+h(ctx.focusRunId?specific||'選択した記録との直接の対応はありません':who)+'</p></div>':'')
 +'<div class="ex-note-invite"><div><small>自分の言葉で</small><strong>気づいたことを残す</strong><p>気になったことや、次に試したいことを書いておけます。</p></div><button type="button" data-ex-action="note">書いてみる <span aria-hidden="true">＋</span></button></div>'
 +(saved.length?'<div class="ex-note-preview"><strong>以前に書いたこと</strong>'+saved.map(n=>'<p>'+h(n.text)+'</p>').join('')+'</div>':'')+'</div>';
}

function field(ui,ctx){
 const links=relevance(ui,ctx),cats=ctx.categories;
 const counts=Object.create(null);for(const n of ui.notes)counts[n.category]=(counts[n.category]||0)+1;
 const selected=cats.find(c=>c.id===ui.selected)||cats[0],linked=links.linked.get(selected.id);
 const nodes=cats.map(c=>{
  const p=meta[c.id]||{glyph:"○",accent:"#69d5d7",x:50,y:50};
  const chosen=c.id===selected.id,related=links.linked.has(c.id),n=counts[c.id]||0;
  const source=links.sources.get(c.id)||"none";
  return '<button type="button" class="ex-node '+(related?'is-related ':'')+(chosen?'is-selected':'')+'" data-ex-category="'+esc(c.id)+'" data-ex-source="'+esc(source)+'" style="--ex-accent:'+p.accent+';--ex-x:'+p.x+'%;--ex-y:'+p.y+'%" aria-pressed="'+chosen+'" aria-label="'+esc(c.name)+(related?'、'+esc(links.linked.get(c.id)):'')+'"><span class="ex-node-orb"><span class="ex-node-icon" aria-hidden="true">'+p.glyph+'</span>'+(related?'<span class="ex-node-signal" aria-hidden="true"></span>':'')+'</span><span class="ex-node-copy"><strong class="ex-node-title">'+esc(c.name)+'</strong></span>'+(n?'<span class="ex-memory-count" aria-label="'+n+'件のメモ">'+n+'</span>':'')+'</button>';
 }).join("");
 const currentTopic=selected.topics.includes(ui.topic)?ui.topic:selected.topics[0]||selected.name;
 const summary=links.sample?'光る星は説明用の例です。自分の記録ではありません。':linked?linked:'記録がなくても自由に選べます。';
 const any=links.linked.size>0;
 return '<section class="ex-workspace ex-orbit-workspace"><div class="ex-map-card ex-constellation"><div class="ex-map-head"><div><span class="ex-eyebrow">記録からも広がる発見</span><h2>今日は何が気になる？</h2><p>気になる星をタップしてみましょう。</p></div><button type="button" class="ex-help" data-ex-action="field-help" aria-label="星が光る理由と表示の意味">？</button></div>'
 +'<div class="ex-map" role="group" aria-label="星座型の7分野から探す">'+art(links)+'<div class="ex-core" aria-hidden="true"><span>気になることから</span><strong>探究</strong><small>好きな星を選ぼう</small></div>'+nodes+'</div>'
 +'<div class="ex-legend ex-signal-legend"><span class="ex-legend-glow" aria-hidden="true"></span><span>'+(any?'光る星は、入力や記録とつながる分野です。':'どの星からでも自由に始められます。')+'</span></div>'
 +'<div class="ex-map-foot">'+(!any&&!links.sample?buttonAction("sample","光る星の表示例を見る","quiet"):links.sample?buttonAction("sample","表示例を終了","quiet"):'')+'</div></div>'
 +'<div class="ex-side"><section class="ex-focus" id="ex-topic-content"><div class="ex-focus-label"><span>選んだ分野</span>'+(linked?'<span class="ex-related-label">記録とつながる</span>':'')+'</div><h2>'+esc(selected.name)+'</h2><p class="ex-focus-intro">'+esc(summary)+'</p><div class="ex-topic-heading"><div class="ex-topic-label">どれから読んでみる？</div><span class="ex-topic-hint">'+selected.topics.length+' テーマ · 横に動かして選ぶ <span aria-hidden="true">→</span></span></div><div class="ex-topic-set" role="group" aria-label="読むテーマ・横スクロール">'+selected.topics.map((name,i)=>'<button type="button" data-ex-topic="'+esc(name)+'" aria-pressed="'+(currentTopic===name)+'" class="ex-topic '+(currentTopic===name?'is-picked':'')+'" title="'+esc(name)+'"><span aria-hidden="true">'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(name)+'</strong><span aria-hidden="true">›</span></button>').join('')+'</div>'
 +experience(ui,ctx,selected,currentTopic)+'</section>'
 +'</div></section>';
}

export function catalogCards(categories,search=""){
 const q=String(search).trim().toLocaleLowerCase("ja");
 const all=categories.flatMap(c=>c.topics.map((title,i)=>({category:c,title,i})));
 const rows=all.filter(x=>(x.title+x.category.name).toLocaleLowerCase("ja").includes(q));
 if(!rows.length)return '<p class="ex-catalog-empty">見つかりませんでした。別の言葉でも探してみてください。</p>';
 return categories.map(c=>{
  const list=rows.filter(x=>x.category.id===c.id);if(!list.length)return '';
  const p=meta[c.id]||{accent:'#72dbd7',glyph:'○'};
  return '<section class="ex-catalog-group" style="--ex-accent:'+p.accent+'"><div class="ex-catalog-group-head"><span class="ex-catalog-group-icon" aria-hidden="true">'+p.glyph+'</span><h3>'+esc(c.name)+'</h3><small>'+list.length+' テーマ</small></div><div class="ex-catalog-items">'+list.map(t=>'<button type="button" data-ex-category="'+esc(c.id)+'" data-ex-pick-topic="'+esc(t.title)+'"><strong>'+esc(t.title)+'</strong><span aria-hidden="true">›</span></button>').join('')+'</div></section>';
 }).join('');
}
function catalog(ui,ctx){
 const all=ctx.categories.reduce((n,c)=>n+c.topics.length,0);
 return '<section class="ex-catalog"><div class="ex-catalog-head"><div><span class="ex-eyebrow">知りたいことを探す</span><h2>テーマから探す</h2><p>言葉で探したり、分野ごとに眺めたりできます。</p></div><span class="ex-count">'+all+' テーマ</span></div><label class="ex-search-label"><span class="sr-only">テーマを検索</span><input type="search" data-ex-search placeholder="例：睡眠、上り坂、ペース" value="'+esc(ui.search)+'" autocomplete="off"/></label><div class="ex-catalog-grid">'+catalogCards(ctx.categories,ui.search)+'</div></section>';
}
export function render(ui,ctx){
 return '<section class="ex-page" data-experience-v3><header class="ex-heading"><h1>探究</h1><button type="button" class="ex-header-memo" data-ex-action="memories">ふり返り <span>'+ui.notes.length+'</span></button></header>'+(ctx.focusRunId?(ctx.focusRun?'<div class="ex-record-return"><div><small>この走行から調べています</small><strong>'+esc(ctx.focusRun.date)+'の保存した走行</strong><p>関連する分野の目印はこの記録から選びます。危険度や優先順位を示しません。</p></div><a href="#/result?record='+encodeURIComponent(ctx.focusRun.id)+'">この走行の結果へ戻る ›</a></div>':'<p class="ex-notice" role="status">指定された走行記録が見つかりません。保存済み記録との関連づけは行いません。</p>'):'')+(ui.notice?'<p class="ex-notice" role="status">'+esc(ui.notice)+'</p>':'')+'<div class="ex-switch" role="group" aria-label="探し方"><button type="button" data-ex-tab="field" aria-pressed="'+(ui.tab==="field")+'">気になることから</button><button type="button" data-ex-tab="catalog" aria-pressed="'+(ui.tab==="catalog")+'">テーマから探す</button></div>'+(ui.tab==="catalog"?catalog(ui,ctx):field(ui,ctx))+modal(ui,ctx)+'</section>';
}
function modal(ui,ctx){if(!ui.modal)return "";const category=ctx.categories.find(c=>c.id===ui.selected)||ctx.categories[0],title=ui.topic||category.topics[0]||category.name,links=relevance(ui,ctx);let body="";
 if(ui.modal==="field-help")body='<p>光る星は、現在入力している情報や、保存した走行・生活記録とつながる分野です。優先順位や、身体への負担の大きさを示すものではありません。</p><p>記録がなくても、どの分野も自由に選べます。</p>';
 if(ui.modal==="learn-help"){
  const k=KNOWLEDGE[title];
  body='<p>学びの内容は一般的な知識です。あなたの身体や調子の原因を自動的に判定しているわけではありません。</p>'
  +(k?'<div class="ex-dialog-block"><strong>内容と適用上の注意</strong><p>'+esc(k.warning)+'</p></div>'+(k.url?'<p>参考資料：<a class="ex-dialog-source" href="'+esc(k.url)+'" target="_blank" rel="noopener noreferrer">'+esc(k.cite)+' ↗</a></p><div class="ex-dialog-block"><strong>研究の対象・使える範囲</strong><p>'+esc(k.sourceNote||'出典の対象・適用条件はテーマごとに確認します。')+'</p></div>':'<p>'+esc(k.sourceNote||"本人の記録を読み取るための設計上の説明です。個人への医学的な判断や効果を裏付ける文献引用ではありません。")+'</p>'):'<p>この内容は本人による観察のための設計上の問いです。科学的な解説としての出典審査はまだ完了していません。</p>')
  +'<p class="ex-muted">光る星は、入力・保存記録とのつながりを表す目印です。重要度や危険度を示すものではありません。</p>';
 }
 if(ui.modal==="know")body=`<p>「${esc(title)}」に関連する知識を確認する場所です。</p><div class="ex-dialog-block"><strong>自分の情報との接点</strong><p>${esc(links.linked.get(category.id)||"このテーマを調べるのに記録は必要ありません。")}</p></div><div class="ex-dialog-block"><strong>読み取るときの注意</strong><p>記録や感覚の違いだけでは、原因や身体の状態を判断できません。</p></div><p class="ex-muted">根拠審査済みのコラム本文は今後接続します。未確認の医学的な説明は表示しません。</p>`;
 if(ui.modal==="try")body=`<p>距離と時間を動かして、平均ペースと平均速度の関係を確かめられます。</p><div class="ex-range-label"><label for="ex-distance">距離</label><output data-ex-distance-value>${ui.trialDistance.toFixed(1)} km</output></div><input id="ex-distance" type="range" min="1" max="15" step=".5" value="${ui.trialDistance}" data-ex-distance/><div class="ex-range-label"><label for="ex-minutes">時間</label><output data-ex-minutes-value>${ui.trialMinutes} 分</output></div><input id="ex-minutes" type="range" min="10" max="100" step="1" value="${ui.trialMinutes}" data-ex-minutes/><div class="ex-metric-grid"><div><small>平均ペース</small><strong data-ex-pace>—</strong><em>分/km</em></div><div><small>平均速度</small><strong data-ex-speed>—</strong><em>km/h</em></div></div><p class="ex-muted">算術計算のみ。個人の将来の走りや身体への負荷・ケガを予測するものではありません。</p>`;
 if(ui.modal==="note")body=`<p>「${esc(title)}」について、感じたことや次に試したいことを自由に書けます。あとから画面上部の「ふり返り」で読み返せます。</p><label class="ex-form-label" for="ex-note">書き残す内容（500文字まで）</label><textarea id="ex-note" maxlength="500" rows="4" placeholder="例：上り坂は思っていたより息が上がった。次回はペースを意識してみたい。">${esc(ui.followup||"")}</textarea>${followups[LEARNING_TOPICS[category.id+"|"+title]]?.length?'<div class="ex-note-prompts"><small>書く内容に迷ったら</small>'+followups[LEARNING_TOPICS[category.id+"|"+title]].map((t,i)=>'<button type="button" data-ex-next="'+i+'">'+esc(t)+'</button>').join('')+'</div>':''}<div class="ex-dialog-actions"><button type="button" data-ex-action="save-note" ${!ui.canSave?"disabled":""}>保存する</button></div>${!ui.canSave?'<p class="ex-muted">保存されたメモを安全に読み取れないため、上書き防止のため保存を停止しています。</p>':""}`;
 if(ui.modal==="memories")body=ui.notes.length?`<div class="ex-saved-list">${ui.notes.map(n=>`<div class="ex-saved"><div><small>${esc(ctx.categories.find(c=>c.id===n.category)?.name||"探究")} · ${esc(n.createdAt.slice(0,10))}</small><p>${esc(n.text)}</p></div><button type="button" data-ex-delete="${esc(n.id)}" ${!ui.canSave?"disabled":""} aria-label="この記録を削除">削除</button></div>`).join("")}</div>`:"<p>まだ書いたことはありません。テーマを読んで、気になったことがあれば残せます。</p>";
 if(ui.modal==="share")body=`<p>相談したいことを整理するための下書きです。自動で送信されません。</p><div class="ex-dialog-block" data-ex-draft-text><strong>話したいテーマ：${esc(title)}</strong><p>参考にした分野：${esc(category.name)}</p><p>記録との接点：${esc(links.linked.get(category.id)||"記録との直接的な接点はありません")}</p><p>相談したいこと：</p></div><div class="ex-dialog-actions"><button type="button" data-ex-action="copy">文章をコピー</button></div><p class="ex-muted">個人の走行データやメモを自動で共有しません。</p>`;
 return `<div class="ex-backdrop" data-ex-overlay><section class="ex-dialog" role="dialog" aria-modal="true" aria-labelledby="ex-dialog-title"><div class="ex-dialog-head"><div><small>${esc(category.name)}</small><h2 id="ex-dialog-title">${esc({know:"知る",try:"試す",note:"気づきを書く",share:"相談用にまとめる","learn-help":"研究の出典と注意点","field-help":"分野の印について",memories:"ふり返りノート"}[ui.modal]||ui.modal)}</h2></div><button type="button" data-ex-action="close" aria-label="閉じる">×</button></div>${body}</section></div>`;
}
export function updatePace(root){const d=root.querySelector("[data-ex-distance]"),m=root.querySelector("[data-ex-minutes]");if(!d||!m)return;const distance=Number(d.value),minutes=Number(m.value);root.querySelector("[data-ex-distance-value]").textContent=`${distance.toFixed(1)} km`;root.querySelector("[data-ex-minutes-value]").textContent=`${minutes} 分`;const seconds=Math.round(minutes/distance*60),mm=Math.floor(seconds/60),ss=seconds%60;root.querySelector("[data-ex-pace]").textContent=`${mm}:${String(ss).padStart(2,"0")}`;root.querySelector("[data-ex-speed]").textContent=(distance/(minutes/60)).toFixed(1);}
export function saveNote(ui,text){if(!ui.canSave||!ui.storage)return {ok:false,reason:"保存領域が利用できません"};const value=String(text??"").trim();if(!value||value.length>500)return {ok:false,reason:"1〜500文字で入力してください"};const time=new Date().toISOString();const id=`${time}-${Math.random().toString(36).slice(2,12)}`;const key=LEARNING_TOPICS[ui.selected+"|"+ui.topic]||EXPLORATION_DRAFT_GUIDES[ui.selected+"|"+ui.topic]?.id;const next=[{id,category:ui.selected,text:value,createdAt:time,...(key?{topicId:key}:{})},...ui.notes].slice(0,LIMIT);try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);const expected=JSON.stringify(next);if(old!==(ui.notes.length?JSON.stringify(ui.notes):null)){ui.canSave=false;return {ok:false,reason:"他の画面で変更されています。元のデータを保護しました"};}ui.storage.setItem(EXPLORATION_NOTE_KEY,expected);if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==expected)return {ok:false,reason:"保存を確認できませんでした"};ui.notes=next;return {ok:true};}catch{return {ok:false,reason:"保存できませんでした"}}}
export function deleteNote(ui,id){if(!ui.canSave||!ui.storage)return false;const oldList=ui.notes;const next=oldList.filter(n=>n.id!==id);if(next.length===oldList.length)return false;try{const old=ui.storage.getItem(EXPLORATION_NOTE_KEY);if(old!==JSON.stringify(oldList)){ui.canSave=false;return false;}ui.storage.setItem(EXPLORATION_NOTE_KEY,JSON.stringify(next));if(ui.storage.getItem(EXPLORATION_NOTE_KEY)!==JSON.stringify(next))return false;ui.notes=next;return true}catch{return false}}
