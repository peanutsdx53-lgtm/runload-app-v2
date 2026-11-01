import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../app.js",import.meta.url),"utf8");
test("S02 design sample toggle is absent from the production home page",()=>{
 assert.doesNotMatch(source,/data-home-preview/);
 assert.doesNotMatch(source,/表示例を見る|表示例を終了/);
});
