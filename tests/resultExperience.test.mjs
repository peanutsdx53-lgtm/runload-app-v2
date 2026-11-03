import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_NAMES,resultImageAnnotation} from '../ui/resultExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Result v4 references all formal region names, with immutable official identifiers',()=>{
 assert.equal(OFFICIAL_NAMES.length,12);
 assert.equal(new Set(OFFICIAL_NAMES.map(x=>x[0])).size,12);
 assert.ok(OFFICIAL_NAMES.some(x=>x[0]==='BA-DISP-028'&&x[1]==='足底中部・内側縦足弓'));
});
test('Result v4 does not fabricate biomechanical comparisons when no activity is selected',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/value:null/);
 assert.match(js,/同じ活動種別の保存記録をもう1件残すと/);
 assert.match(js,/calculateActivityReference/);
 assert.match(js,/各部位自身の文献基準100/);
 assert.doesNotMatch(js,/rv4-tone-legend/,'duplicate legend removed');
 assert.match(js,/rv4-region-selection/,'picker has its own row');
 assert.match(js,/BODY_REFERENCE_GRADIENT/,'reference scale uses unchanged scientific palette');
 assert.match(js,/まだ保存していない記録/);
 assert.ok(!js.includes('distance:8.20'));
 assert.ok(!js.includes('rofBefore:6,rofAfter:8'));
 assert.ok(!js.includes('12部位比較値'));
});
test('PNG export explains calculated and uncalculated literature references',()=>{
 assert.deepEqual(resultImageAnnotation({}),{status:'保存前：部位別値は未表示',detail:'保存した走行の文献適用条件を確認します'});
 assert.equal(resultImageAnnotation({saved:true,reference:{count:9}}).status,'文献参考値：9/12 部位算出');
 assert.equal(resultImageAnnotation({gps:true,reference:{count:0}}).status,'文献参考値：算出対象外');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:0,reason:'GAIT_NOT_SELECTED'}}).detail,'活動種別が未選択のため算出しません');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:12}}).status,'文献参考値：12/12 部位算出');
 assert.equal(resultImageAnnotation({saved:true,reference:{count:99}}).status,'文献参考値：算出対象外');
 const js=read('ui/resultExperience.js');
 assert.doesNotMatch(js,/身体の部位別の参考値はまだありません/);
 assert.doesNotMatch(js,/文献参考値を確認できる記録/);
 assert.match(js,/ROF-Jは本人が回答した疲労感です/);
});

test('ROF-J results and image export do not manufacture time-eligible before/after changes',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/data-rof-time-status="unverified"/);
 assert.match(js,/実際の時間的な順序が検証できないため、変化量や原因は判定しません/);
 assert.match(js,/回答の実際の時間的前後差は判定しません/);
 assert.doesNotMatch(js,/評価時刻未記録：前後差は判定不可/,'PNG must not falsely claim no time evidence is stored');
 assert.doesNotMatch(js,/<small>前後差<\/small>|rv4-change/,'remove obsolete difference field');
 assert.match(js,/<p class="rv4-fatigue-caption">本人が記録した疲労感です。運動による変化とは断定できません。<\/p>/,'show a plain sentence under the bars');
 assert.doesNotMatch(js,/rv4-fatigue-note|role="note"/,'do not render a callout');
 for(const css of [read('ui/resultExperience.css'),read('ui/resultInlineStyles.js')]){
  const caption=css.match(/\.rv4-fatigue-caption\{([^}]+)\}/);
  assert.ok(caption,'caption has its own minimal styling');
  assert.match(caption[1],/font-size:12px/);
  assert.doesNotMatch(caption[1],/background|border|box-shadow|font-weight|padding:(?!0)/,'no callout styling');
  assert.doesNotMatch(css,/\.rv4-fatigue-note/,'old callout styling removed');
 }
 assert.equal((js.match(/<details class="rv4-fatigue-method"/g)||[]).length,1,'one unified disclosure');
 assert.doesNotMatch(js,/<details class="rv4-rof-audit"/,'audit lives inside the disclosure');
 assert.match(js,/回答時刻・訂正履歴を確認・訂正/);
 assert.match(js,/回答時刻と判定の限界を確認/);
 assert.match(js,/data-rof-correct-save/,'saved correction action remains');
 assert.match(js,/rofCorrections/,'saved correction history remains');
 assert.match(js,/GPS時の入力操作時刻/);
 assert.match(js,/未回答は「—」で、0と区別します。/);
 assert.match(js,/before\?\?'—'/,'valid zero must not become missing');
 assert.match(js,/after\?\?'—'/,'valid zero must not become missing');
 for(const css of [read('ui/resultExperience.css'),read('ui/resultInlineStyles.js')]){
  assert.doesNotMatch(css,/\.rv4-change/,'obsolete delta styling absent');
  assert.match(css,/\.rv4-fatigue-numbers>div\{/,'retain two-value layout');
  assert.match(css,/\.rv4-rof-audit h3\{/,'audit section has a heading');
 }
 assert.doesNotMatch(js,/\(after-before\)/);
 assert.doesNotMatch(js,/<h2>疲労感の変化<\/h2>/);
});

test('Result v4 view is isolated and precached',()=>{
 const app=read('app.js'),sw=read('sw.js'),html=read('index.html');
 assert.ok(app.includes('resultExperience.mountResult'));
 assert.ok(sw.includes('./ui/resultExperience.js'));
 assert.ok(sw.includes('./ui/resultExperience.css'));
 const currentAsset=html.match(/\.\/app\.js\?v=([a-z0-9-]+)/);assert.ok(currentAsset,'HTML cache-busted application entry');assert.ok(sw.includes('./app.js?v='+currentAsset[1]),'matching offline precache asset');
 assert.ok(sw.includes('./ui/gpsDynamicResult.js'));
 assert.ok(sw.includes('./ui/gpsDynamicResult.css'));
});
test('History does not read unsaved input or present fake saved-record links',()=>{
 const app=read('app.js');
 assert.match(app,/manualRunStore\.findManualRun/);assert.match(app,/resultExperience\.mountResult\(resultHost,record\?\.draft\|\|\{\}/);
 assert.ok(app.includes('historyExperience.mountHistory'));
 assert.ok(!app.includes('const data=[{day:22')); 
 assert.ok(read('ui/historyExperience.js').includes('data-history-unconnected')); 
 assert.ok(!app.includes('href="#/${entry.type'));
});

test('result palette is synchronously rendered inside the shadow root',()=>{
 const js=read('ui/resultExperience.js');
 const inline=read('ui/resultInlineStyles.js');
 assert.match(js,/RESULT_STYLES/);
 assert.match(js,/style data-result-inline-styles/);
 assert.doesNotMatch(js,/<link rel=.*stylesheet/);
 assert.match(inline,/radial-gradient/);
});

test('Result and manual-save surfaces use the approved dark chrome and button states',()=>{
 const styles=read('styles.css');
 const review=read('ui/recordReviewExperience.css');
 const html=read('index.html');
 for(const style of [
  '.app-shell:has(#runload-result-v4) .topbar{display:none}',
  '.app-shell:has(#runload-result-v4) .main-content{background:transparent;',
  'body:has(#runload-result-v4) #app{background:#061725',
  'padding-bottom:calc(95px + env(safe-area-inset-bottom',
 ]) assert.ok(styles.includes(style),style);
 for(const style of [
  '.rr-page .rr-foot-actions .rr-save:not(:disabled){background:linear-gradient',
  '.rr-page .rr-foot-actions .rr-save:disabled{background:#1e4859',
  '.rr-page .rr-foot-actions .rr-save:focus-visible{outline:3px',
 ]) assert.ok(review.includes(style),style);
 assert.match(html,/result-chrome-v20/);
 assert.match(html,/recordReviewExperience\.css\?v=20261101-review-density-v1/);
});

test('public-facing result copy omits internal branding and preserves formal names',()=>{
 const js=read('ui/resultExperience.js');
 for(const literal of ['RUNLOAD / RESULTS',"t('RUNLOAD'",'RunLoad_入力中の走行.png','正式保存前','履歴未接続'])assert.equal(js.includes(literal),false,literal);
 assert.ok(OFFICIAL_NAMES.some(([,name])=>name==='膝蓋大腿関節部'),'official anatomical names are never rewritten');
});

test('saved UNKNOWN manual record has explicit repair choices with no inferred activity',()=>{
 const result=read('ui/resultExperience.js');
 const store=read('ui/manualRunStore.js');
 assert.match(result,/missingActivityPanel/);
 assert.match(result,/data-result-gait/);
 assert.match(result,/options\.onAssignGait/);
 assert.match(store,/classifySavedManualRun/);
 assert.match(result,/GAIT_NOT_SELECTED/);
});

test('result route explains missing or deleted explicit IDs, with no fallback',()=>{
 const app=read('app.js'),result=read('ui/resultExperience.js');
 assert.match(app,/if\(params\.has\("record"\)&&!record\)/);
 assert.match(app,/指定された保存済み走行記録が見つかりません/);
 assert.match(app,/found\.reason/);
 assert.match(result,/rv4-compare-summary/);
 assert.doesNotMatch(result,/記録ID末尾|比較する2件の記録情報/);
 assert.match(result,/同条件/);
 assert.match(result,/比較相手/);
 assert.match(result,/選択中/);
});


test('S09 comparison data and long IDs remain readable without changing scientific provenance',()=>{
 const inline=read('ui/resultInlineStyles.js'),js=read('ui/resultExperience.js');
 assert.match(inline,/\.rv4-region-compare-stats/);
 assert.match(inline,/\.rv4-region-compare-method/);
 assert.match(inline,/\.rv4-compare-summary/);
 assert.match(js,/rv4-export-menu/);
 assert.match(inline,/\.rv4-fatigue-method-content>p\{[^}]*font-size:14px/);
 assert.doesNotMatch(js,/記録ID末尾 '\+clean\(other\.id\.slice\(-8\)\)/);
 assert.match(js,/sameKind/,'same-date options remain distinguishable without user-facing IDs');
 assert.match(js,/compareBodyReferenceRows/);
 assert.match(js,/再計算した参考値です/);
});


test('UIUX batch03 S09: tab/view redraw restores keyboard focus without changing three-tab or science contract',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/\[data-tab=\"'\+tab\+'\"\]'/);
 assert.match(js,/\[data-view=\"'\+view\+'\"\]'/);
 assert.match(js,/focus\(\{preventScroll:true\}\)/);
 assert.match(js,/\['body','身体'\],\['fatigue','疲労感'\],\['radar','過去と比較'\]/);
 assert.match(js,/compareBodyReferenceRows/);
});

test('legacy result markup is retired; standalone body detail never displays mock numbers (001,004)',()=>{
 const app=read('app.js');
 assert.doesNotMatch(app,/function result\(\)\{/,'the retired full result renderer must not be reachable');
 assert.match(app,/data-body-detail-source="saved-only"/,'direct links must clearly route to the saved-result view');
 assert.match(app,/resultExperience\.mountResult/,'the active three-tab results stay in the scientific component');
 assert.match(app,/resultExperience\.OFFICIAL_NAMES/,'metadata comes from the official body region registry');
 assert.doesNotMatch(app,/value:101\.7|value:112\.4|value:106\.3/,'fixed scientific-looking numbers are removed');
 assert.doesNotMatch(app,/11\/12<\/strong>/,'unverified fixed region availability is removed');
});
test('official science test targets actual result/reference sources rather than legacy demo rows (005)',()=>{
 const app=read('app.js'),result=read('ui/resultExperience.js');
 const parity=read('tests/scienceEngineParity.test.mjs');
 assert.equal(OFFICIAL_NAMES.length,12);
 assert.match(result,/calculateActivityReference\(options\.record\)/);
 assert.match(result,/bodyReferenceRow\(reference\?\.rows/);
 assert.match(app,/REGIONS=resultExperience\.OFFICIAL_NAMES\.map/);
 assert.match(parity,/calculateActivityReference\(record\)/);
 assert.match(parity,/expected\.reference100/);
 assert.ok(!app.includes('value:101.7'),'legacy sample references must not serve as test oracle');
});
