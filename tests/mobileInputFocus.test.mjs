import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../ui/mobileInputFocus.css",import.meta.url),"utf8");
test("mobile input zoom prevention ships last and remains offline installable",()=>{
 const links=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1]);
 assert.match(links.at(-1),/mobileInputFocus\.css\?v=20261026-ios-input-v25/);
 assert.match(sw,/\.\/ui\/mobileInputFocus\.css/);
 assert.match(css,/@media \(max-width: 800px\)/);
 assert.match(css,/font-size:\s*16px\s*!important/);
});
test("allow users to pinch zoom; text, number, search, select and textarea are covered",()=>{
 const viewport=html.match(/<meta name="viewport" content="([^"]+)"/)?.[1]||"";
 assert.match(viewport,/width=device-width/);
 assert.doesNotMatch(viewport,/user-scalable\s*=\s*no|maximum-scale|minimum-scale\s*=\s*1/i);
 for(const type of ['text','search','number','email','tel','password','date','time','datetime-local'])
  assert.ok(css.includes('[type="'+type+'"]'),type);
 assert.match(css,/\bselect\b/);
 assert.match(css,/\btextarea\b/);
 assert.doesNotMatch(css,/touch-action:\s*none|pointer-events:\s*none|preventDefault\(\)/);
 assert.match(css,/\.rv-unit-input input/);
});
