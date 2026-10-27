import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OFFICIAL_NAMES} from '../ui/resultExperience.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Result v4 references all formal region names, with immutable official identifiers',()=>{
 assert.equal(OFFICIAL_NAMES.length,12);
 assert.equal(new Set(OFFICIAL_NAMES.map(x=>x[0])).size,12);
 assert.ok(OFFICIAL_NAMES.some(x=>x[0]==='BA-DISP-028'&&x[1]==='足底中部・内側縦足弓'));
});
test('Result v4 does not fabricate biomechanical comparisons when no activity is selected',()=>{
 const js=read('ui/resultExperience.js');
 assert.match(js,/value:null/);
 assert.match(js,/比較する記録はありません/);
 assert.match(js,/calculateActivityReference/);
 assert.match(js,/この部位自身の文献基準100/);
 assert.match(js,/まだ保存していない記録/);
 assert.ok(!js.includes('distance:8.20'));
 assert.ok(!js.includes('rofBefore:6,rofAfter:8'));
 assert.ok(!js.includes('12部位比較値'));
});
test('Result v4 view is isolated and precached',()=>{
 const app=read('app.js'),sw=read('sw.js'),html=read('index.html');
 assert.ok(app.includes('resultExperience.mountResult'));
 assert.ok(sw.includes('./ui/resultExperience.js'));
 assert.ok(sw.includes('./ui/resultExperience.css'));
 assert.ok(html.includes('app.js?v=20261027-manual-gait-v5'));
 assert.ok(sw.includes('./ui/gpsDynamicResult.js'));
 assert.ok(sw.includes('./ui/gpsDynamicResult.css'));
});
test('History does not read unsaved input or present fake saved-record links',()=>{
 const app=read('app.js');
 assert.match(app,/manualRunStore\.findManualRun/);assert.match(app,/resultExperience\.mountResult\(app\.querySelector\("#runload-result-v4"\),record\?\.draft\|\|\{\}/);
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
 assert.match(html,/save-button-v20/);
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
