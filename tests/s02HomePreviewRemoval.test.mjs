import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
const home=readFileSync(new URL("../ui/homeExperience.js",import.meta.url),"utf8");

test("production home has no obsolete preview state, toggle, banner or fixture (029)",()=>{
 assert.doesNotMatch(app,/homeUi\.preview|preview:false|data-home-preview|data-preview-home|hx-preview-banner/);
 assert.doesNotMatch(home,/demoEntries\(|function sample\(|preview\?|if\(preview\)|hx-demo-activity|42\.0|7\.20|表示例/);
 assert.match(app,/homeExperience\.latestCard\(/);
 assert.match(app,/homeExperience\.conditionCard\(/);
 assert.match(app,/homeExperience\.achievementCard\(/);
 assert.match(app,/homeExperience\.trendCard\(/);
});

test("saved-only home still distinguishes missing records and unreadable storage (029)",()=>{
 assert.match(home,/保存済みの手入力走行/);
 assert.match(home,/走行記録はまだありません/);
 assert.match(home,/走行記録を確認できません/);
 assert.match(home,/直近7日の記録はまだありません/);
 assert.match(home,/生活記録を確認できません/);
 assert.match(home,/保存済みの手入力走行のみを集計します/);
 assert.match(home,/記録しない日を失敗と判定しません/);
});
