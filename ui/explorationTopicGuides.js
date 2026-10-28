// Beginner observation guides that can be used without an experimental or medical claim.
// Editorial status "design-prompt" is NOT a peer-reviewed, evidence-approved scientific lesson.
export const EXPLORATION_DRAFT_GUIDES=Object.freeze({
 "02|姿勢と走る動作":Object.freeze({"id": "body-posture", "question": "観察したい動きを、一度に一つだけ選んでみましょう。", "record": "姿勢を見た・感じたという本人の言葉と、記録日時を分けて残せます。", "limit": "本人の自覚だけでは関節角度や動作の良し悪しは測定できません。", "next": "次は自分が何に気付くか、記録で確かめますか？", "status": "design-prompt"}),
 "02|体幹と腕の動き":Object.freeze({"id": "body-upper", "question": "腕の振りや上半身の動きのうち、気になった場面を整理してみましょう。", "record": "走った日時や本人の感想を参照し、実際に測定していない動きは数値化しません。", "limit": "体幹の強さやフォームの優劣を、本人の短いメモから判定できません。", "next": "次に自分が確認したい動きを一つ書きますか？", "status": "design-prompt"}),
 "03|路面":Object.freeze({"id": "course-surface", "question": "走った道の特徴について、本人が入力した情報を確認してみましょう。", "record": "コース入力に路面があればその記録を見返し、なければ思い出を任意で書けます。", "limit": "路面の記録だけからケガのリスクや部位別負荷を計算できません。", "next": "次は路面と感じ方を別々に記録してみますか？", "status": "design-prompt"}),
 "03|気温・天候":Object.freeze({"id": "course-weather", "question": "走った日の天候や暑さ寒さを、本人がどのように感じたか振り返りましょう。", "record": "入力済みの気温や環境メモがあれば走行事実と区別して確認できます。", "limit": "同じ天候の日の調子でも、天候が原因だとは特定できません。", "next": "次に確かめたい環境条件は何ですか？", "status": "design-prompt"}),
 "03|屋外・室内":Object.freeze({"id": "course-location", "question": "屋外と室内で、自分が気になる条件の違いを言葉にしてみましょう。", "record": "走行場所が本人の記録にない場合は、場所を推測せずに自由に考えられます。", "limit": "屋内・屋外という区別だけで走行の難しさや身体反応を断定できません。", "next": "どの場所の何が気になったか残しますか？", "status": "design-prompt"}),
 "04|筋肉痛・違和感":Object.freeze({"id": "recovery-discomfort", "question": "どこで、いつ、どのように感じたかを、自分の言葉で整理することを考えましょう。", "record": "身体についての本人のメモを見返すことができます。無回答なら何も推定しません。", "limit": "違和感の原因や病名、けがの有無を判定する機能ではありません。強い痛みや持続する症状は医療者に相談してください。", "next": "次に記録で確かめたい感覚は何ですか？", "status": "design-prompt"}),
 "04|休養と回復":Object.freeze({"id": "recovery-rest", "question": "休んだ日と走った日の過ごし方を、必要に応じて振り返りましょう。", "record": "過去の走行日時や本人の疲労感を、事実と主観に分けて確認します。", "limit": "休んだことで回復したと証明するものではなく、最適な休養日数を指示しません。", "next": "次は休んだ日について何を記録したいですか？", "status": "design-prompt"}),
 "04|疲れを考える視点":Object.freeze({"id": "recovery-context", "question": "同じ「疲れ」でも、感じた時点とその日の状況を区別して考えましょう。", "record": "ROF-Jの運動前・運動後と、本人が記録した生活コンディションを別々に確認できます。", "limit": "関連する記録を並べても疲れの原因や身体の状態は断定できません。", "next": "次にどの時点の感じ方を確かめたいですか？", "status": "design-prompt"}),
 "05|食事・水分":Object.freeze({"id": "life-food", "question": "走る前後に何を食べ飲みしたか、本人が気になったことを整理しましょう。", "record": "現行の走行記録に食事量を測定する機能はありません。気付いたことだけを任意で記録します。", "limit": "摂取量の不足や個人に必要な栄養・水分量を判定する機能ではありません。", "next": "次に気になる生活習慣は何ですか？", "status": "design-prompt"}),
 "05|気分・ストレス":Object.freeze({"id": "life-mood", "question": "走りたい気分や、走る前後に感じた気持ちに目を向けましょう。", "record": "本人の生活メモがあれば、運動の結果と混ぜずに読み返せます。", "limit": "気分の違いから精神状態やストレスの原因を診断することはできません。", "next": "次はいつの気分を記録してみますか？", "status": "design-prompt"}),
 "05|日々のコンディション":Object.freeze({"id": "life-daily", "question": "一日だけでなく、複数の日に自分が何を記録したか確認しましょう。", "record": "生活コンディションの履歴を開き、入力方式が異なる睡眠時間は同一として比較しません。", "limit": "記録の並びは生活習慣と走行との因果関係を示しません。", "next": "次回は何を揃えて観察したいですか？", "status": "design-prompt"}),
 "06|ウォームアップ":Object.freeze({"id": "practice-warmup", "question": "走る前に何をしていたか、自分の習慣を整理しましょう。", "record": "運動前の本人の疲労感やメモを確認することができます。", "limit": "特定の準備運動の効果や傷害予防を、本アプリでは検証していません。", "next": "次回の走る前に何を確かめたいですか？", "status": "design-prompt"}),
 "06|走行中の対応":Object.freeze({"id": "practice-during", "question": "途中で速度を変えたり、休んだりしたかを思い返してみましょう。", "record": "経過時間と距離から得た平均値は、区間ごとの速さを表しません。", "limit": "走行途中の判断が正しかったかどうかを自動評価しません。", "next": "次は途中で気になった場面を残してみますか？", "status": "design-prompt"}),
 "06|クールダウン・ストレッチ":Object.freeze({"id": "practice-after", "question": "走り終えた後の自分の習慣を、必要なら書き出してみましょう。", "record": "運動後の本人の疲労感と行動のメモを区別して振り返れます。", "limit": "特定のストレッチの効果や筋肉痛の予防を、この記録から推定しません。", "next": "次に残したい運動後の習慣は何ですか？", "status": "design-prompt"}),
 "06|無理をしない判断":Object.freeze({"id": "practice-boundaries", "question": "運動を中断したり休んだりしたとき、そのときの自分の判断を振り返りましょう。", "record": "本人の主観や過去の記録は参照できますが、未記録の症状を推測しません。", "limit": "安全な運動強度や継続可否を判定する医療・運動処方機能ではありません。", "next": "次に気を付けたいことを自分の言葉で整理しますか？", "status": "design-prompt"}),
 "07|走る目的":Object.freeze({"id": "goal-meaning", "question": "走り始めた理由や、今大切にしたいことを整理しましょう。", "record": "目的は本人が任意で選ぶものです。距離や速さの優劣から推測しません。", "limit": "目標の達成度や心理的効果を数値で判定したものではありません。", "next": "これから何を確かめたいですか？", "status": "design-prompt"}),
 "07|目標との付き合い方":Object.freeze({"id": "goal-choices", "question": "数字で表せる目標だけでなく、走ることへの関わり方も考えましょう。", "record": "走行の距離・時間と、本人が選んだ目標を別の情報として扱います。", "limit": "目標達成のための訓練量や適切なペースを自動処方しません。", "next": "次に続けたいことを一つ選びますか？", "status": "design-prompt"}),
 "07|楽しみ方":Object.freeze({"id": "goal-enjoyment", "question": "どんなときに走ることが楽しかったかを思い出しましょう。", "record": "お気に入りのコースや本人のメモを見返すきっかけにできます。", "limit": "走行記録の数値から楽しさや満足度を測定したことにはなりません。", "next": "次に楽しみにしていることを自由に残しますか？", "status": "design-prompt"}),
});
export const EXPLORATION_DRAFT_COUNT=Object.keys(EXPLORATION_DRAFT_GUIDES).length;
export function validateExplorationCatalog(categories,learnedKeys){
 const seen=new Set(),missing=[],unknown=[];
 for(const category of categories){for(const title of category.topics){
  const key=category.id+'|'+title;
  if(seen.has(key))unknown.push(key+'（重複）');
  seen.add(key);
  if(!learnedKeys.includes(key)&&!EXPLORATION_DRAFT_GUIDES[key])missing.push(key);
 }}
 for(const key of [...learnedKeys,...Object.keys(EXPLORATION_DRAFT_GUIDES)])if(!seen.has(key))unknown.push(key);
 return {total:seen.size,learned:learnedKeys.filter(k=>seen.has(k)).length,
  observation:Object.keys(EXPLORATION_DRAFT_GUIDES).filter(k=>seen.has(k)).length,
  missing,unknown,ok:missing.length===0&&unknown.length===0};
}
