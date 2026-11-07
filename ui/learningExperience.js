/**
 * RunLoad learning foundation (candidate implementation).
 * Knowledge curriculum, not app-operation instructions or personal diagnosis.
 * No user records are read, edited or sent from this module.
 */
export const LEARNING_COURSES=Object.freeze([
 {id:"data",title:"走行データの基礎",description:"距離・時間・ペースなど、走行を表す数値の意味を学ぶ。",ready:true},
 {id:"movement",title:"ランニングの身体と動作",description:"身体の構造と走行動作を学ぶ。",ready:false},
 {id:"fatigue",title:"感覚・疲労・違和感",description:"主観的な感覚と疲労の知識を学ぶ。",ready:false},
 {id:"context",title:"走行条件と生活",description:"路面・坂・生活状況と走行の関係を学ぶ。",ready:false},
 {id:"science",title:"研究と数字の読み方",description:"運動科学の根拠、条件、限界を学ぶ。",ready:false},
 {id:"comparison",title:"変化と過去比較",description:"異なる走行の情報を比較する考え方を学ぶ。",ready:false},
 {id:"reflection",title:"走行経験を捉える視点",description:"数値だけでは表せない経験と情報の吟味を学ぶ。",ready:false},
 {id:"exercise",title:"運動の基礎と個人差",description:"運動強度・持久運動・適応に関する知識を学ぶ。",ready:false}
]);
export const READY_LESSON=Object.freeze({id:"pace-basics",version:"0.1",title:"平均ペースと区間ペース",courseId:"data"});
export const QUIZ=Object.freeze([
 {id:"q1",prompt:"6 kmを33分で走った場合、平均ペースについて正しいのは？",
 choices:["すべての区間を5分30秒/kmで走った。","走行全体の平均は5分30秒/kmだった。","疲労感が小さかった。"],
 correct:1,explanation:"平均ペースは全体の時間÷距離です。各区間の速さも疲労感も、この二つの数値からは分かりません。"},
 {id:"q2",prompt:"4 kmを24分で走ったとき、平均ペースは？",
 choices:["4分00秒/km","6分00秒/km","24分00秒/km"],
 correct:1,explanation:"24分÷4 km＝6分/km。単位を忘れず、距離と時間のどちらを割るか確認します。"},
 {id:"q3",prompt:"2 kmを12分で走ったAとB。Aは1 kmごとに6分、Bは5分と7分。正しいのは？",
 choices:["平均ペースは同じでも、区間ごとのペースは違う。","Bの方が疲労が大きかったと確定できる。","平均が同じなので走り方は全く同じだった。"],
 correct:0,explanation:"両方とも平均6分/kmですが、区間ごとの時間は違います。この例だけでは疲労感は分かりません。"}
]);
export function paceSecondsPerKm(distanceKm,seconds){
 if(!Number.isFinite(distanceKm)||distanceKm<=0||!Number.isFinite(seconds)||seconds<=0)return null;
 return seconds/distanceKm;
}
export function paceLabel(secondsPerKm){
 if(!Number.isFinite(secondsPerKm)||secondsPerKm<=0)return "—";
 const rounded=Math.round(secondsPerKm);
 return Math.floor(rounded/60)+":"+String(rounded%60).padStart(2,"0")+"/km";
}
export function splitPractice(firstMin){
 if(!Number.isInteger(firstMin)||firstMin<4||firstMin>8)return null;
 return {first:firstMin,second:12-firstMin,average:paceLabel(paceSecondsPerKm(2,720))};
}
export function evaluateQuiz(answers){
 return QUIZ.map(item=>({id:item.id,correct:Number(answers[item.id])===item.correct,explanation:item.explanation}));
}
function catalogue(){
 return '<section class="lr-hero"><p class="lr-eyebrow">RUNLOAD LEARNING</p><h1>学習</h1><p>ランニングの知識を、基礎から段階的に学ぶ。学習の後には復習を用意しています。自分の走行情報との照合は「探究」で行います。</p></section>'+
  '<section class="lr-catalog" aria-label="学習領域">'+LEARNING_COURSES.map((course,index)=>
   '<article class="lr-course"><div class="lr-course-top"><span class="lr-number">'+String(index+1).padStart(2,"0")+'</span><span class="lr-status">'+(course.ready?"公開中：1単元":"準備中")+'</span></div>'+
   '<h2>'+course.title+'</h2><p>'+course.description+'</p>'+
   (course.ready?'<a class="lr-action" href="#/learning?lesson=pace-basics">平均ペースと区間ペースを学ぶ</a>':'<span class="lr-coming">教材を準備しています</span>')+'</article>'
  ).join('')+'</section>'+
  '<p class="lr-note">「準備中」の領域は、教材本文と根拠の審査が完了するまで利用できません。教材の閲覧・復習は任意です。</p>';
}
function reviewMarkup(){
 return '<section class="lr-panel lr-review" id="lr-review"><p class="lr-eyebrow">REVIEW</p><h2>復習：知識を使って確かめる</h2><p>学習内容について回答し、正誤と理由を確認できます。感想や自己理解を採点するものではありません。</p>'+
  '<form data-lr-quiz>'+QUIZ.map((item,index)=>
   '<fieldset class="lr-question"><legend>問'+(index+1)+'｜'+item.prompt+'</legend>'+
   item.choices.map((choice,i)=>'<label><input required type="radio" name="'+item.id+'" value="'+i+'"><span>'+choice+'</span></label>').join('')+
   '<p class="lr-feedback" data-lr-feedback="'+item.id+'" role="status" hidden></p></fieldset>'
  ).join('')+'<button type="submit" class="lr-action">回答を確認する</button></form>'+
  '<p class="lr-note">必要ならこのページの説明を読み直し、再回答できます。復習結果はまだ端末に保存しません。</p></section>';
}
function lesson(){
 return '<div class="lr-lesson"><a href="#/learning" class="lr-back">‹ 学習の一覧へ</a>'+
  '<header class="lr-hero"><p class="lr-eyebrow">走行データの基礎 · 第1単元</p><h1>平均ペースと区間ペース</h1><p>一つの平均値だけでは、走っている途中の変化まで分かりません。数値の意味を、図と例題で確かめます。</p><p class="lr-goal"><strong>この授業の目標：</strong>平均ペースを計算し、平均値と区間ごとの違いを区別できる。</p></header>'+
  '<nav class="lr-lesson-index" aria-label="授業内の移動"><a href="#lr-basics">基礎</a><a href="#lr-example">例題</a><a href="#lr-try">体験</a><a href="#lr-review">復習</a><a href="#lr-explore">探究へ</a></nav>'+
  '<section class="lr-panel" id="lr-basics"><p class="lr-eyebrow">01 · 基礎</p><h2>平均ペースとは</h2>'+
  '<p>「ペース」は1 km進むのにかかった時間を表し、通常「分/km」で示します。走行全体の平均ペースは、記録した時間を総距離で割って求めます。</p>'+
  '<div class="lr-formula" role="note">平均ペース ＝ 走行の合計時間 ÷ 総距離</div>'+
  '<p>6.00 kmを33分なら、33÷6＝5.5分/km、つまり <strong>5分30秒/km</strong> です。これは全体の平均であり、すべての1 kmを同じ時間で走ったという意味ではありません。</p>'+
  '<p>平均速度は距離÷時間で求める別の値で、通常km/hなどで表します。ペースと速度の単位、割り算の向きを混同しないようにしましょう。</p></section>'+
  '<section class="lr-panel" id="lr-example"><p class="lr-eyebrow">02 · 完成例</p><h2>平均が同じでも、途中は違う</h2>'+
  '<div class="lr-comparison"><div><h3>例A｜一定の場合</h3><p>前半1 km：6分</p><p>後半1 km：6分</p><strong>全体2 km・12分</strong></div><div><h3>例B｜途中で変化する場合</h3><p>前半1 km：5分</p><p>後半1 km：7分</p><strong>全体2 km・12分</strong></div></div>'+
  '<p>どちらも平均は6分00秒/kmですが、1 kmごとの所要時間は異なります。したがって平均値だけから区間の変化は復元できません。また、この例だけで疲労の大小や走り方の良し悪しを判断できません。</p></section>'+
  '<section class="lr-panel" id="lr-try"><p class="lr-eyebrow">03 · 数字を動かして確かめる</p><h2>同じ平均のまま、区間を変えてみる</h2>'+
  '<p>全体を2 km・12分に固定します。最初の1 kmにかける時間を変更してみましょう。仮想例であり、本人の走行記録ではありません。</p>'+
  '<label class="lr-slider-label" for="lr-first">最初の1 kmの時間 <strong data-lr-first>6分</strong></label>'+
  '<input id="lr-first" class="lr-slider" type="range" min="4" max="8" step="1" value="6">'+
  '<div class="lr-bars" aria-label="仮想の区間ごとの所要時間"><div><span>最初の1 km</span><div class="lr-track"><span data-lr-bar-first></span></div><strong data-lr-first-small>6分</strong></div><div><span>次の1 km</span><div class="lr-track"><span data-lr-bar-second></span></div><strong data-lr-second>6分</strong></div></div>'+
  '<p class="lr-calc" data-lr-calc role="status">平均 6:00/km</p><p>区間ごとの所要時間が変わっても、合計時間と距離が同じなら平均は変わりません。</p></section>'+
  '<section class="lr-panel" id="lr-limit"><p class="lr-eyebrow">04 · 誤読しないために</p><h2>数値から言えること・言えないこと</h2>'+
  '<ul><li>距離と時間が有効なら、全体の平均を算出できます。</li><li>区間データがなければ、走行中の変化は判断できません。</li><li>平均ペースだけでは、本人の疲労、フォーム、能力の変化、傷害リスクの原因は分かりません。</li><li>GPSの活動時間など、時間の定義が異なる記録を比べる際は意味を確かめる必要があります。</li></ul>'+
  '<p class="lr-source">基礎計算は距離・時間・単位の算術説明です。ここで医学的・生体力学的な個人推定は行っていません。</p></section>'+
  reviewMarkup()+
  '<section class="lr-panel" id="lr-explore"><p class="lr-eyebrow">NEXT · 自分の走行へ</p><h2>探究で、自分の記録と照らす</h2>'+
  '<p>学習内容を使って自分の走行を確かめたい場合は、既存の探究「距離・時間・ペース」へ進めます。保存済みの手入力記録がある場合だけ、その距離・時間・平均値を参照できます。</p>'+
  '<p>区間ごとのペースが保存されていない記録から、その変化を作り出すことはしません。記録がなくても学習・復習できます。</p>'+
  '<div class="lr-actions"><a class="lr-action" href="#/exploration-tree?category=01&topic=%E8%B7%9D%E9%9B%A2%E3%83%BB%E6%99%82%E9%96%93%E3%83%BB%E3%83%9A%E3%83%BC%E3%82%B9">探究で確認する</a><a class="lr-action lr-secondary" href="#/history">履歴で走行を選ぶ</a></div></section>'+
  '<p class="lr-note">この試行版は授業・復習の進捗を保存しません。既存の走行記録・メモに変更を加えません。</p></div>';
}
export function mountLearning(host,params){
 if(!host)return;
 const selected=params?.get("lesson");
 host.innerHTML=selected===READY_LESSON.id?lesson():selected?'<section class="lr-panel"><h1>この授業はまだ利用できません</h1><p>未公開の教材や不明なリンクを、別の授業へ置き換えずにお知らせします。</p><a href="#/learning">学習の一覧へ戻る</a></section>':catalogue();
 if(selected!==READY_LESSON.id)return;
 const slider=host.querySelector("#lr-first");
 const refresh=()=>{
  const state=splitPractice(Number(slider.value));
  if(!state)return;
  host.querySelector("[data-lr-first]").textContent=state.first+"分";
  host.querySelector("[data-lr-first-small]").textContent=state.first+"分";
  host.querySelector("[data-lr-second]").textContent=state.second+"分";
  host.querySelector("[data-lr-bar-first]").style.width=(state.first/8*100)+"%";
  host.querySelector("[data-lr-bar-second]").style.width=(state.second/8*100)+"%";
  host.querySelector("[data-lr-calc]").textContent="合計 "+(state.first+state.second)+"分 ／ 平均 "+state.average;
 };
 slider.addEventListener("input",refresh);refresh();
 host.querySelector("[data-lr-quiz]").addEventListener("submit",event=>{
  event.preventDefault();
  const answers={};const data=new FormData(event.currentTarget);
  for(const question of QUIZ)answers[question.id]=data.get(question.id);
  const evaluated=evaluateQuiz(answers);
  evaluated.forEach(result=>{
   const place=host.querySelector('[data-lr-feedback="'+result.id+'"]');
   place.hidden=false;
   place.textContent=(result.correct?"正解。":"もう一度考えてみましょう。")+result.explanation;
   place.dataset.correct=String(result.correct);
  });
  host.querySelector('[data-lr-feedback="q1"]')?.scrollIntoView({block:"nearest",behavior:"auto"});
 });
}
