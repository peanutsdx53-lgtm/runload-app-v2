import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
test("S02 design sample toggle is absent from the production home page",()=>{
 assert.doesNotMatch(source,/data-home-preview/);
 assert.doesNotMatch(source,/表示例を見る|表示例を終了/);
});

test("production Home never enables unreachable sample data without a design decision (029)",()=>{
 assert.match(source,/homeUi=\{preview:false,/,'production Home starts without sample preview');
 assert.doesNotMatch(source,/homeUi\.preview\s*=\s*true\b/,'no production handler may enable sample data');
 assert.doesNotMatch(source,/data-home-preview|data-preview-home/,'no sample data toggle is exposed');
 assert.match(source,/homeUi\.preview=false/,'navigating Home also restores normal record mode');
 // The demonstration fixtures remain isolated in the currently unreachable
 // preview branch until a separate approved design decision is made.
});
