import test from 'node:test';
import assert from 'node:assert/strict';
import {loadProfile,saveProfile,loadDisplay,saveDisplay,renderSettings,PROFILE_KEY,DISPLAY_KEY} from '../ui/settingsExperience.js';
const memory=()=>{const entries=new Map();return {getItem:key=>entries.has(key)?entries.get(key):null,setItem:(key,value)=>entries.set(key,value),dump:()=>entries}};
test('Japanese and dark stay the only active language/theme',()=>{const st=memory(),d=loadDisplay(st);assert.deepEqual(d,{textSize:'standard',motion:'system',language:'ja',theme:'dark'});const html=renderSettings({profile:loadProfile(st),display:d});assert.match(html,/English — 対応予定/);assert.match(html,/ライト.*対応予定/s);assert.ok(!/data-settings-language|data-settings-theme|data-backup-execute|data-delete-all/.test(html));});
test('opt-in profile survives reload, including optional empty fields',()=>{const st=memory();const s=saveProfile(st,{nickname:'使用者',purpose:'learn',heightCm:'171.2',weightKg:'68.3',ageBand:'18-29'});assert.equal(s.ok,true);assert.deepEqual(loadProfile(st),s.value);assert.equal(saveProfile(st,{nickname:'',purpose:'',heightCm:'',weightKg:''}).ok,true);assert.equal(loadProfile(st).heightCm,null);assert.equal(loadProfile(st).weightKg,null)});
test('invalid or unavailable profile storage fails without inventing success',()=>{const st=memory();assert.equal(saveProfile(st,{heightCm:'400'}).ok,false);assert.equal(saveProfile(st,{weightKg:'Infinity'}).ok,false);assert.equal(saveProfile(null,{}).ok,false);assert.deepEqual(loadProfile({getItem(){throw Error('blocked')}},{nickname:'legacy',purpose:'health'}).nickname,'legacy')});
test('display choices persist safely and reject unapproved values',()=>{const st=memory();assert.equal(saveDisplay(st,{textSize:'large',motion:'reduce'}).ok,true);assert.equal(loadDisplay(st).textSize,'large');st.setItem(DISPLAY_KEY,JSON.stringify({language:'en',theme:'light',textSize:'huge',motion:'weird'}));assert.deepEqual(loadDisplay(st),{textSize:'standard',motion:'system',language:'ja',theme:'dark'});assert.equal(saveDisplay(null,{}).ok,false)});
test('settings text does not claim legal consent or finished GPS/backup',()=>{const html=renderSettings({profile:loadProfile(null),display:loadDisplay(null)});for(const name of ['プロフィール','バックアップ・復元','利用規約・プライバシー','位置情報','初回ガイド','文字サイズ','表示言語'])assert.ok(html.includes(name),name);assert.ok(html.includes('同意済みになることはありません'));assert.ok(html.includes('GPS測定エンジン'));assert.ok(html.includes('data-onboard-open'));assert.ok(html.includes('data-install-app'));assert.ok(!html.includes('data-settings-delete'))});

test('purpose selector is one native, accessible select without tiled radios',()=>{
 const html=renderSettings({profile:{nickname:'',purpose:'learn',heightCm:null,weightKg:null,ageBand:''},display:loadDisplay(null)});
 assert.match(html,/<label for="s4-purpose">走る目的/);
 assert.match(html,/<select id="s4-purpose" name="purpose">/);
 assert.match(html,/<option value="learn" selected>/);
 assert.equal((html.match(/name="purpose"/g)||[]).length,1);
 assert.ok(!html.includes('s3-purpose-choices'));
 assert.ok(!html.includes('type="radio" name="purpose"'));
});
