import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfile,saveProfile,loadDisplay,saveDisplay,renderSettings,PROFILE_KEY,DISPLAY_KEY} from '../ui/settingsExperience.js';
const memory=()=>{const entries=new Map();return {getItem:key=>entries.has(key)?entries.get(key):null,setItem:(key,value)=>entries.set(key,value),dump:()=>entries}};
test('Japanese and dark stay the only active language/theme',()=>{const st=memory(),d=loadDisplay(st);assert.deepEqual(d,{textSize:'standard',motion:'system',language:'ja',theme:'dark'});const html=renderSettings({profile:loadProfile(st),display:d});assert.match(html,/English — 対応予定/);assert.match(html,/ライト.*対応予定/s);assert.ok(!/data-settings-language|data-settings-theme|data-backup-execute|data-delete-all/.test(html));});
test('opt-in profile survives reload, including optional empty fields',()=>{const st=memory();const s=saveProfile(st,{nickname:'使用者',purpose:'learn',heightCm:'171.2',weightKg:'68.3',ageBand:'18-29'});assert.equal(s.ok,true);assert.deepEqual(loadProfile(st),s.value);assert.equal(saveProfile(st,{nickname:'',purpose:'',heightCm:'',weightKg:''}).ok,true);assert.equal(loadProfile(st).heightCm,null);assert.equal(loadProfile(st).weightKg,null)});
test('invalid or unavailable profile storage fails without inventing success',()=>{const st=memory();assert.equal(saveProfile(st,{heightCm:'400'}).ok,false);assert.equal(saveProfile(st,{weightKg:'Infinity'}).ok,false);assert.equal(saveProfile(null,{}).ok,false);assert.deepEqual(loadProfile({getItem(){throw Error('blocked')}},{nickname:'legacy',purpose:'health'}).nickname,'legacy')});
test('display choices persist safely and reject unapproved values',()=>{const st=memory();assert.equal(saveDisplay(st,{textSize:'large',motion:'reduce'}).ok,true);assert.equal(loadDisplay(st).textSize,'large');st.setItem(DISPLAY_KEY,JSON.stringify({language:'en',theme:'light',textSize:'huge',motion:'weird'}));assert.deepEqual(loadDisplay(st),{textSize:'standard',motion:'system',language:'ja',theme:'dark'});assert.equal(saveDisplay(null,{}).ok,false)});
test('settings text does not claim legal consent or finished GPS/backup',()=>{const html=renderSettings({profile:loadProfile(null),display:loadDisplay(null)});for(const name of ['プロフィール','バックアップ・復元','利用規約・プライバシー','位置情報','初回ガイド','文字サイズ','表示言語'])assert.ok(html.includes(name),name);assert.ok(html.includes('同意済みになることはありません'));assert.ok(!html.includes('GPSでの測定中に音や振動で知らせる機能'));assert.ok(html.includes('data-onboard-open'));assert.ok(html.includes('data-install-app'));assert.ok(!html.includes('data-settings-delete'))});

test('purpose selector is one native, accessible select without tiled radios',()=>{
 const html=renderSettings({profile:{nickname:'',purpose:'learn',heightCm:null,weightKg:null,ageBand:''},display:loadDisplay(null)});
 assert.match(html,/<label for="s4-purpose">走る目的/);
 assert.match(html,/<select id="s4-purpose" name="purpose">/);
 assert.match(html,/<option value="learn" selected>/);
 assert.equal((html.match(/name="purpose"/g)||[]).length,1);
 assert.ok(!html.includes('s3-purpose-choices'));
 assert.ok(!html.includes('type="radio" name="purpose"'));
});

test('malformed stored settings are protected; writes are checked afterwards (035)',()=>{
 const s=memory(),badProfile='{broken',badDisplay='{"textSize":"huge","motion":"reduce"}';
 s.setItem(PROFILE_KEY,badProfile);s.setItem(DISPLAY_KEY,badDisplay);
 assert.equal(saveProfile(s,{nickname:'上書き不可'}).ok,false);
 assert.equal(saveDisplay(s,{textSize:'large',motion:'reduce'}).ok,false);
 assert.equal(s.getItem(PROFILE_KEY),badProfile);
 assert.equal(s.getItem(DISPLAY_KEY),badDisplay);
 const fresh=memory(),ignored={getItem:k=>fresh.getItem(k),setItem(){}};
 assert.equal(saveProfile(ignored,{nickname:'記録'}).ok,false);
 assert.equal(saveDisplay(ignored,{textSize:'large'}).ok,false);
 assert.equal(fresh.getItem(PROFILE_KEY),null);
 assert.equal(fresh.getItem(DISPLAY_KEY),null);
});
test('stale settings snapshot cannot overwrite a newer tab (035)',()=>{
 const s=memory();
 const profile=saveProfile(s,{nickname:'最初の状態'});assert.equal(profile.ok,true);
 const display=saveDisplay(s,{textSize:'standard',motion:'system'});assert.equal(display.ok,true);
 const firstProfile=profile.raw,firstDisplay=display.raw;
 const updatedProfile=saveProfile(s,{nickname:'別タブの変更'},firstProfile);assert.equal(updatedProfile.ok,true);
 const updatedDisplay=saveDisplay(s,{textSize:'large',motion:'reduce'},firstDisplay);assert.equal(updatedDisplay.ok,true);
 assert.equal(saveProfile(s,{nickname:'古い画面の保存'},firstProfile).ok,false);
 assert.equal(saveDisplay(s,{textSize:'standard',motion:'system'},firstDisplay).ok,false);
 assert.equal(s.getItem(PROFILE_KEY),updatedProfile.raw);
 assert.equal(s.getItem(DISPLAY_KEY),updatedDisplay.raw);
 assert.equal(saveProfile(s,{nickname:'更新後'},updatedProfile.raw).ok,true);
 assert.equal(saveDisplay(s,{textSize:'standard'},updatedDisplay.raw).ok,true);
});

test('unapproved shoe library and GPS alert cards are not displayed (038)',()=>{
 const html=renderSettings({profile:loadProfile(null),display:loadDisplay(null)});
 assert.doesNotMatch(html,/使用したシューズ|シューズ候補の保存・編集|測定中のお知らせ|音や振動で知らせる機能/);
 assert.doesNotMatch(html,/data-settings-(?:shoes|shoe-save|gps-alert|notification-toggle)/);
 assert.match(html,/位置情報/,'existing GPS permission explanation is retained');
 assert.match(html,/バックアップ・復元/,'existing record management is retained');
 assert.match(html,/プロフィールを保存/,'existing profile editing is retained');
 // The existing free-text shoeName input lives on the record page, not the
 // unapproved settings library. Removing a card must not remove that field.
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 const body=readFileSync(new URL('../ui/bodyContextExperience.js',import.meta.url),'utf8');
 assert.match(app,/shoeName:""/);
 assert.ok(body.includes('shoeName'));
});
