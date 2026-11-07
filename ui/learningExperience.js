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
export const READY_LESSON=Object.freeze({id:"pace-basics",version:"0.2",title:"平均ペースと区間ペース",courseId:"data"});
export const QUIZ=Object.freeze([
 {id:"q1",prompt:"6 kmを33分で走った場合、平均ペースについて正しいのは？",
 choices:["すべての区間を5分30秒/kmで走った。","走行全体の平均は5分30秒/kmだった。","疲労感が小さかった。"],
 relearn:"lr-basics",correct:1,explanation:"平均ペースは全体の時間÷距離です。各区間の速さも疲労感も、この二つの数値からは分かりません。",rationales:["各区間の値は記録していません。平均ペースが5分30秒/kmでも、途中が一定とは限りません。","33分÷6km＝5分30秒/km。これは全体の平均値です。","疲労感は本人の申告など別の情報が必要です。距離と時間からは確定できません。"]},
 {id:"q2",prompt:"4 kmを24分で走ったとき、平均ペースは？",
 choices:["4分00秒/km","6分00秒/km","24分00秒/km"],
 relearn:"lr-partial",correct:1,explanation:"24分÷4 km＝6分/km。単位を忘れず、距離と時間のどちらを割るか確認します。",rationales:["4は距離（km）です。分/kmを求めるには合計24分を4kmで割ります。","24分÷4km＝6分00秒/kmです。","24分は全体4kmの所要時間です。1km当たりでは24÷4＝6分です。"]},
 {id:"q3",prompt:"2 kmを12分で走ったAとB。Aは1 kmごとに6分、Bは5分と7分。正しいのは？",
 choices:["平均ペースは同じでも、区間ごとのペースは違う。","Bの方が疲労が大きかったと確定できる。","平均が同じなので走り方は全く同じだった。"],
 relearn:"lr-example",correct:0,explanation:"両方とも平均6分/kmですが、区間ごとの時間は違います。この例だけでは疲労感は分かりません。",rationales:["Aは6分＋6分、Bは5分＋7分で、ともに全体2km・12分です。","区間の所要時間の違いだけでは疲労感を確定できません。疲労については別の情報が必要です。","両者の区間ごとの所要時間は異なります。平均が同じことは、走り方が同じことを意味しません。"]},
 {id:"q4",prompt:"2 kmを12分という全体記録しかないとき、最初の1 kmのペースについて正しいのは？",
 choices:["全体平均と同じ6:00/kmと確定できる。","区間の記録がなければ特定できない。","疲労感が分かれば、区間ペースを正確に復元できる。"],
 relearn:"lr-limit",correct:1,explanation:"全体平均しかない場合、途中の区間ペースは一意に定まりません。",
 rationales:["全体の平均が6:00/kmでも、最初の1 kmがそのペースだったとは限りません。","そのとおりです。最初の1 kmが5分・6分・7分など複数の可能性があります。","主観的疲労感は区間の時間を測定した記録ではありません。"]}
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
export function assessPartialExample(distanceValue,paceValue){
 const distance=Number(distanceValue),pace=Number(paceValue);
 const valid=String(distanceValue??"").trim()!==""&&String(paceValue??"").trim()!==""&&Number.isInteger(distance)&&Number.isInteger(pace)&&distance>0&&pace>0;
 if(!valid)return {valid:false,correct:false,feedback:"距離と平均ペースの空欄に、正の整数を入力してください。"};
 if(distance!==4)return {valid:true,correct:false,feedback:"最初の空欄は合計距離です。例では何km走りましたか？"};
 if(pace!==6)return {valid:true,correct:false,feedback:"距離は正しく選べています。24分を4kmで割ると、1km当たり何分になりますか？"};
 return {valid:true,correct:true,feedback:"正解です。24分÷4km＝6分/km。先ほどの6km・33分の例と、同じ計算手順を使えました。"};
}
export function evaluateQuiz(answers){
 return QUIZ.map(item=>{const chosen=answers?.[item.id];return {id:item.id,correct:chosen!==null&&chosen!==undefined&&chosen!==""&&Number(chosen)===item.correct,explanation:item.rationales?.[Number(chosen)]||item.explanation};});
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
 return '<section class="lr-panel lr-review" id="lr-review"><p class="lr-eyebrow">REVIEW</p><h2>理解確認：知識を使って確かめる</h2><p>各問に答えると正誤と選択肢ごとの理由が表示されます。後から任意に戻って再回答できますが、日時を指定した復習や得点保存はありません。感想や自己理解を採点するものではありません。</p>'+
  '<form data-lr-quiz>'+QUIZ.map((item,index)=>
   '<fieldset class="lr-question"><legend>問'+(index+1)+'｜'+item.prompt+'</legend>'+
   item.choices.map((choice,i)=>'<label><input required type="radio" name="'+item.id+'" value="'+i+'"><span>'+choice+'</span></label>').join('')+
   '<p class="lr-feedback" data-lr-feedback="'+item.id+'" role="status" hidden></p><button type="button" class="lr-relearn" data-lr-relearn="'+item.relearn+'" hidden>関連する説明を読み直す</button></fieldset>'
  ).join('')+'<button type="submit" class="lr-action">回答を確認する</button></form>'+
  '<p class="lr-note">関連する説明へ戻り、再回答できます。復習結果は端末に保存しません。</p></section>';
}
function lesson(){
 return '<div class="lr-lesson"><a href="#/learning" class="lr-back">‹ 学習の一覧へ</a>'+
  '<header class="lr-hero"><p class="lr-eyebrow">走行データの基礎 · 第1単元</p><h1>平均ペースと区間ペース</h1><p>一つの平均値だけでは、走っている途中の変化まで分かりません。数値の意味を、図と例題で確かめます。</p><p class="lr-goal"><strong>この授業の目標：</strong>平均ペースを計算し、平均値と区間ごとの違いを区別できる。</p></header>'+
  '<nav class="lr-lesson-index" aria-label="授業内の移動"><button type="button" data-lr-jump="lr-basics">基礎</button><button type="button" data-lr-jump="lr-example">区間の例題</button><button type="button" data-lr-jump="lr-partial">途中の練習</button><button type="button" data-lr-jump="lr-try">体験</button><button type="button" data-lr-jump="lr-review">復習</button><button type="button" data-lr-jump="lr-explore">探究へ</button></nav>'+
  '<section class="lr-panel" id="lr-basics"><p class="lr-eyebrow">01 · 基礎</p><h2>平均ペースは、合計時間を距離で割る</h2>'+
  '<p>「ペース」は1 km進むのにかかった時間を表し、通常「分/km」で示します。走行全体の平均ペースは、記録した時間を総距離で割って求めます。</p>'+
  '<div class="lr-formula" role="note">平均ペース ＝ 走行の合計時間 ÷ 総距離</div>'+
  '<p>6.00 kmを33分なら、33÷6＝5.5分/km。0.5分×60＝30秒なので、<strong>5分30秒/km</strong> です。これは全体の平均であり、すべての1 kmを同じ時間で走ったという意味ではありません。</p>'+
  '<p>平均速度は距離÷時間で求める別の値で、通常km/hなどで表します。ペースと速度の単位、割り算の向きを混同しないようにしましょう。</p></section>'+
  '<section class="lr-panel" id="lr-partial"><p class="lr-eyebrow">02 · 一部を自分で解く</p><h2>別の数字でも計算できる？</h2><p>距離4km、合計時間24分の仮想例です。完成例の手順を使い、二つの空欄を埋めてください。</p><p class="lr-formula">24分 ÷ □ km ＝ □ 分/km</p><form class="lr-partial-form" data-lr-partial><div class="lr-partial-inputs"><label for="lr-partial-distance">割る数：距離（km）<input id="lr-partial-distance" type="number" inputmode="numeric" min="1" max="100" step="1" required></label><label for="lr-partial-pace">計算結果：平均ペース（分/km）<input id="lr-partial-pace" type="number" inputmode="numeric" min="1" max="100" step="1" required></label></div><div class="lr-actions"><button type="submit" class="lr-action">計算を確認</button><button type="button" class="lr-action lr-outline" data-lr-hint>ヒントを見る</button></div><p class="lr-hint" data-lr-partial-hint hidden>まず「24分」が合計時間、「4km」が距離であることを確認してください。平均ペースは時間を距離で割ります。</p><p class="lr-feedback" data-lr-partial-feedback role="status" hidden></p></form><p class="lr-source">これは本人の走行記録を読んだものではなく、計算手順を練習するための仮想例です。</p></section>'+
  '<section class="lr-panel" id="lr-example"><p class="lr-eyebrow">03 · 区間を比較する完成例</p><h2>平均が同じでも、途中は違う</h2>'+
  '<div class="lr-comparison"><div><h3>例A｜一定の場合</h3><p>前半1 km：6分</p><p>後半1 km：6分</p><strong>全体2 km・12分</strong></div><div><h3>例B｜途中で変化する場合</h3><p>前半1 km：5分</p><p>後半1 km：7分</p><strong>全体2 km・12分</strong></div></div>'+
  '<p>どちらも平均は6分00秒/kmですが、1 kmごとの所要時間は異なります。したがって平均値だけから区間の変化は復元できません。また、この例だけで疲労の大小や走り方の良し悪しを判断できません。</p></section>'+
  '<section class="lr-panel" id="lr-try"><p class="lr-eyebrow">04 · 数字を動かして確かめる</p><h2>同じ平均のまま、区間を変えてみる</h2>'+
  '<p>全体を2 km・12分に固定します。最初の1 kmにかける時間を変更してみましょう。仮想例であり、本人の走行記録ではありません。</p>'+
  '<label class="lr-slider-label" for="lr-first">最初の1 kmの時間 <strong data-lr-first>6分</strong></label>'+
  '<input id="lr-first" class="lr-slider" type="range" min="4" max="8" step="1" value="6">'+
  '<label class="lr-fallback-label" for="lr-first-select">スライダー以外で選ぶ：最初の1 kmの所要時間<select id="lr-first-select" aria-label="最初の1 kmの時間を一覧から選ぶ"><option value="4">4分</option><option value="5">5分</option><option value="6" selected>6分</option><option value="7">7分</option><option value="8">8分</option></select></label>'+
  '<div class="lr-bars" aria-label="仮想の区間ごとの所要時間"><div><span>最初の1 km</span><div class="lr-track"><span data-lr-bar-first></span></div><strong data-lr-first-small>6分</strong></div><div><span>次の1 km</span><div class="lr-track"><span data-lr-bar-second></span></div><strong data-lr-second>6分</strong></div></div>'+
  '<p class="lr-calc" data-lr-calc role="status">平均 6:00/km</p><p>区間ごとの所要時間が変わっても、合計時間と距離が同じなら平均は変わりません。</p></section>'+
  '<section class="lr-panel" id="lr-limit"><p class="lr-eyebrow">05 · 誤読しないために</p><h2>数値から言えること・言えないこと</h2>'+
  '<ul><li>距離と時間が有効なら、全体の平均を算出できます。</li><li>区間データがなければ、走行中の変化は判断できません。</li><li>平均ペースだけでは、本人の疲労、フォーム、能力の変化、傷害リスクの原因は分かりません。</li><li>GPSの活動時間など、時間の定義が異なる記録を比べる際は意味を確かめる必要があります。</li></ul>'+
  '<p class="lr-source">基礎計算は距離・時間・単位の算術説明です。ここで医学的・生体力学的な個人推定は行っていません。</p></section>'+
  reviewMarkup()+
  '<section class="lr-panel" id="lr-explore"><p class="lr-eyebrow">NEXT · 自分の走行へ</p><h2>探究で、自分の記録と照らす</h2>'+
  '<p>学習内容を使って自分の走行を確かめたい場合は、既存の探究「距離・時間・ペース」へ進めます。保存済みの手入力記録がある場合だけ、その距離・時間・平均値を参照できます。</p>'+
  '<p>授業の計算例と、本人の記録の数値は別です。探究では記録に実際に残っている情報だけを確認します。</p>'+
  '<p>区間ごとのペースが保存されていない記録から、その変化を作り出すことはしません。記録がなくても学習・復習できます。</p>'+
  '<div class="lr-actions"><a class="lr-action" href="#/exploration-tree?category=01&topic=%E8%B7%9D%E9%9B%A2%E3%83%BB%E6%99%82%E9%96%93%E3%83%BB%E3%83%9A%E3%83%BC%E3%82%B9">探究で確認する</a><a class="lr-action lr-secondary" href="#/history">履歴で走行を選ぶ</a></div></section>'+
  '<p class="lr-note">この試行版は授業・復習の進捗を保存しません。既存の走行記録・メモに変更を加えません。</p></div>';
}
export function mountLearning(host,params){
 if(!host)return;
 const selected=params?.get("lesson");
 host.innerHTML=selected===READY_LESSON.id?lesson():selected?'<section class="lr-panel"><h1>この授業はまだ利用できません</h1><p>未公開の教材や不明なリンクを、別の授業へ置き換えずにお知らせします。</p><a href="#/learning">学習の一覧へ戻る</a></section>':catalogue();
 if(selected!==READY_LESSON.id)return;
 const jumpTo=id=>host.querySelector("#"+id)?.scrollIntoView({block:"start",behavior:"auto"});
 host.querySelectorAll("[data-lr-jump]").forEach(button=>button.addEventListener("click",()=>jumpTo(button.dataset.lrJump)));
 host.querySelectorAll("[data-lr-relearn]").forEach(button=>button.addEventListener("click",()=>jumpTo(button.dataset.lrRelearn)));
 const partial=host.querySelector("[data-lr-partial]");
 partial.querySelector("[data-lr-hint]").addEventListener("click",()=>{partial.querySelector("[data-lr-partial-hint]").hidden=false;});
 partial.addEventListener("submit",event=>{event.preventDefault();const result=assessPartialExample(partial.querySelector("#lr-partial-distance").value,partial.querySelector("#lr-partial-pace").value);const feedback=partial.querySelector("[data-lr-partial-feedback]");feedback.hidden=false;feedback.dataset.correct=String(result.correct);feedback.textContent=result.feedback;});
 const slider=host.querySelector("#lr-first");
 const sliderAlternative=host.querySelector("#lr-first-select");
 const refresh=()=>{
  const state=splitPractice(Number(slider.value));
  if(!state)return;
  sliderAlternative.value=String(state.first);
  host.querySelector("[data-lr-first]").textContent=state.first+"分";
  host.querySelector("[data-lr-first-small]").textContent=state.first+"分";
  host.querySelector("[data-lr-second]").textContent=state.second+"分";
  host.querySelector("[data-lr-bar-first]").style.width=(state.first/8*100)+"%";
  host.querySelector("[data-lr-bar-second]").style.width=(state.second/8*100)+"%";
  host.querySelector("[data-lr-calc]").textContent="合計 "+(state.first+state.second)+"分 ／ 平均 "+state.average;
 };
 slider.addEventListener("input",refresh);
 sliderAlternative.addEventListener("change",()=>{slider.value=sliderAlternative.value;refresh();});refresh();
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
   const button=place.parentElement.querySelector("[data-lr-relearn]");if(button)button.hidden=result.correct;
  });
  host.querySelector('[data-lr-feedback="q1"]')?.scrollIntoView({block:"nearest",behavior:"auto"});
 });
}
