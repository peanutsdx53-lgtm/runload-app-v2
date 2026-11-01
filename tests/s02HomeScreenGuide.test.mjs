import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../ui/homeExperience.css',import.meta.url),'utf8');
function guide(open){
 const start=app.indexOf('  function homeScreenGuide(){'),end=app.indexOf('  function home(){',start);
 assert.ok(start>0&&end>start);
 return vm.runInNewContext('const homeUi={guideOpen:'+open+'};'+app.slice(start,end)+';homeScreenGuide();');
}
test('S02 guide is initially closed and accessible',()=>{
 assert.match(app,/guideOpen:false/);
 assert.match(app,/data-home-guide-toggle aria-expanded=/);
 assert.match(app,/aria-controls="home-screen-guide"/);
 assert.match(guide(false),/<section id="home-screen-guide" hidden/);
 const open=guide(true);
 assert.match(open,/role="region" aria-labelledby="home-screen-guide-title"/);
 assert.equal((open.match(/<li>/g)||[]).length,3);
 for(const title of ['走行を記録する','自分の記録に戻る','表示を自分好みに','生活コンディション'])assert.ok(open.includes(title));
 assert.doesNotMatch(open,/傷害を減らす|自己理解が向上する/);
 assert.match(app,/data-home-guide-close/);
 assert.match(app,/focus\(\{preventScroll:true\}\)/);
 assert.doesNotMatch(app,/data-home-preview/);
});
test('S02 guide keeps PC 3-column and smartphone vertical layout',()=>{
 assert.match(css,/\.hx-guide-steps\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/s);
 assert.match(css,/\.hx-guide-steps\{grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/\.hx-help-toggle:focus-visible/);
});
