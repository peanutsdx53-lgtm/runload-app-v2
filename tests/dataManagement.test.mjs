import test from "node:test";
import assert from "node:assert/strict";
import {DATA_KEYS,RESET_KEYS,PORTABLE_FORMAT,PORTABLE_VERSION,inspectLocalStorage,
 inspectPortableBackup,planPortableRestore,restorePortableBackup,exportPortableBackup,portableUtf8Bytes} from "../ui/dataManagement.js";
import {makeDataUi,renderDataBackup,renderDataDelete,fieldTitles} from "../ui/dataManagementUi.js";
import {CONDITION_KEY} from "../ui/homeExperience.js";
import {PROFILE_KEY} from "../ui/settingsExperience.js";
import {REST_DAY_KEY,readRestDays,saveRestDay} from "../ui/restDayStore.js";
import {LEGAL_CONSENT_KEY} from "../ui/legalDocuments.js";
import {saveManualRun,correctSavedRof,readManualRuns,MANUAL_RUN_KEY} from "../ui/manualRunStore.js";
const fake=(entries={})=>{
 const m=new Map(Object.entries(entries));
 return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),map:m};
};
function file(storage,gpsLegacy=null,gpsCurrent=null){
 const snap=inspectLocalStorage(storage);assert.equal(snap.ok,true,snap.reason);
 return JSON.stringify({format:PORTABLE_FORMAT,version:PORTABLE_VERSION,exportedAt:"2026-10-28T10:00:00Z",local:snap.local,gpsLegacy,gpsCurrent});
}
const day=(date,feeling="良い")=>({date,sleepMinutes:420,feeling,memo:""});
test("export allowlist protects consent and onboarding keys",()=>{
 assert.equal(DATA_KEYS.length,10);
 assert.equal(DATA_KEYS.includes(LEGAL_CONSENT_KEY),false);
 assert.ok(RESET_KEYS.includes(LEGAL_CONSENT_KEY));
 assert.equal(DATA_KEYS.some(k=>/introduction-preview|consent/.test(k)),false);
 const s=fake({[LEGAL_CONSENT_KEY]:"do-not-copy",[CONDITION_KEY]:JSON.stringify([day("2026-10-10")])});
 const backup=JSON.parse(file(s));
 assert.equal(backup.local[LEGAL_CONSENT_KEY],undefined);
 assert.equal(backup.local[CONDITION_KEY]!==null,true);
});
test("portable format rejects missing, unknown, invalid and future data",()=>{
 const content=JSON.parse(file(fake()));
 assert.equal(inspectPortableBackup(JSON.stringify(content)).ok,true);
 assert.equal(inspectPortableBackup('not json').ok,false);
 const extra={...content,unverified:"should-not-run"};assert.equal(inspectPortableBackup(JSON.stringify(extra)).ok,false);
 const wrong={...content,version:PORTABLE_VERSION+1};assert.equal(inspectPortableBackup(JSON.stringify(wrong)).ok,false);
 const omitted={...content,local:{...content.local}};delete omitted.local[PROFILE_KEY];
 assert.equal(inspectPortableBackup(JSON.stringify(omitted)).ok,false);
 const bad={...content,local:{...content.local,[CONDITION_KEY]:'[{"date":"not-a-date"}]'}};
 assert.equal(inspectPortableBackup(JSON.stringify(bad)).ok,false);
 const badProfile={...content,local:{...content.local,[PROFILE_KEY]:'{"nickname":1}'}};
 assert.equal(inspectPortableBackup(JSON.stringify(badProfile)).ok,false);
});
test("restoration merges different day records without overwriting existing days",()=>{
 const old=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-10")])});
 const incoming=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-12")])});
 const plan=planPortableRestore(old,file(incoming));
 assert.equal(plan.ok,true,plan.reason);
 assert.deepEqual(JSON.parse(plan.writes[CONDITION_KEY]).map(x=>x.date),["2026-10-10","2026-10-12"]);
 assert.equal(plan.additions[CONDITION_KEY],1);
 const conflict=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-10","ふつう")])});
 const rejected=planPortableRestore(old,file(conflict));
 assert.equal(rejected.ok,false);
 assert.match(rejected.reason,/異なる内容/);
 assert.deepEqual(JSON.parse(old.getItem(CONDITION_KEY)),[day("2026-10-10")]);
});
test("rest-day backup merges distinct days with fixed revision and idempotent re-restore (034)",async()=>{
 const original=fake(),incoming=fake();
 const rest=(date,memo)=>({date,memo,bodyObservation:"",environmentNote:"",shoeName:""});
 assert.equal(saveRestDay(original,rest("2026-10-30","休養A")).ok,true);
 assert.equal(saveRestDay(incoming,rest("2026-10-31","休養B")).ok,true);
 const before=original.getItem(REST_DAY_KEY),backup=file(incoming);
 const plan=planPortableRestore(original,backup);
 assert.equal(plan.ok,true,plan.reason);
 assert.equal(plan.additions[REST_DAY_KEY],1);
 assert.equal(JSON.parse(plan.writes[REST_DAY_KEY]).revision,1,"rest-day storage format revision remains 1");
 assert.equal(original.getItem(REST_DAY_KEY),before,"preflight must never mutate existing rest days");
 const restored=await restorePortableBackup(original,backup);
 assert.equal(restored.ok,true,restored.reason);
 const merged=readRestDays(original);
 assert.equal(merged.ok,true,merged.reason);
 assert.deepEqual(merged.records.map(r=>r.date),["2026-10-30","2026-10-31"]);
 assert.deepEqual(merged.records.map(r=>r.memo),["休養A","休養B"]);
 assert.equal(JSON.parse(original.getItem(REST_DAY_KEY)).revision,1);
 const identical=planPortableRestore(original,backup);
 assert.equal(identical.ok,true,identical.reason);
 assert.equal(identical.additions[REST_DAY_KEY],0);
 assert.equal(Object.hasOwn(identical.writes,REST_DAY_KEY),false,"idempotent restore does not rewrite existing rest days");
});
test("rest-day restore rejects conflicting same-day data and accepts older backup without rest key (034)",()=>{
 const current=fake(),conflict=fake(),rest=(date,memo)=>({date,memo});
 assert.equal(saveRestDay(current,rest("2026-10-31","本人の休養")).ok,true);
 assert.equal(saveRestDay(conflict,rest("2026-10-31","異なる記録")).ok,true);
 const before=current.getItem(REST_DAY_KEY),rejected=planPortableRestore(current,file(conflict));
 assert.equal(rejected.ok,false);
 assert.match(rejected.reason,/異なる内容/);
 assert.equal(current.getItem(REST_DAY_KEY),before);
 const old=JSON.parse(file(conflict));delete old.local[REST_DAY_KEY];
 const accepted=planPortableRestore(current,JSON.stringify(old));
 assert.equal(accepted.ok,true,accepted.reason);
 assert.equal(accepted.additions[REST_DAY_KEY],0);
 assert.equal(Object.hasOwn(accepted.writes,REST_DAY_KEY),false);
 assert.equal(current.getItem(REST_DAY_KEY),before);
});
test("existing settings are not silently overwritten and irrelevant local keys are untouched",()=>{
 const current=fake({[PROFILE_KEY]:JSON.stringify({nickname:"A",purpose:"",heightCm:null,weightKg:null,ageBand:""}),random_web_key:"preserve"});
 const incoming=fake({[PROFILE_KEY]:JSON.stringify({nickname:"B",purpose:"",heightCm:null,weightKg:null,ageBand:""})});
 const plan=planPortableRestore(current,file(incoming));
 assert.equal(plan.ok,false);
 assert.equal(current.getItem("random_web_key"),"preserve");
 assert.equal(current.getItem(PROFILE_KEY).includes('"A"'),true);
});
test("settings copy gives explicit GPS disclosure, verification, and deliberate deletion",()=>{
 const ui=makeDataUi(),backup=renderDataBackup(ui),remove=renderDataDelete(ui);
 assert.match(backup,/GPS記録・走行経路も含める/);
 assert.match(backup,/暗号化されません/);
 assert.match(backup,/外部へ自動送信されません/);
 assert.match(backup,/data-dm-file/);
 assert.match(backup,/GPSを含む復元は複数の保存先に順番に追加/);
 assert.match(remove,/元に戻せません/);
 assert.match(remove,/data-dm-delete-confirm aria-describedby="dm-delete-rule" disabled/);
 assert.match(remove,/次のチェックと「削除」の入力が両方そろうまで/);
 assert.doesNotMatch(backup+remove,/RunLoad|ランロード/);
});

test("restore rolls back both earlier writes and the just-written key when post-write verification fails",async()=>{
 const originalCondition=JSON.stringify([day("2026-10-10")]);
 const existing=fake({[CONDITION_KEY]:originalCondition,unrelated_key:"keep"});
 const incoming=fake({
  [CONDITION_KEY]:JSON.stringify([day("2026-10-12")]),
  [PROFILE_KEY]:JSON.stringify({nickname:"復元",purpose:"",heightCm:null,weightKg:null,ageBand:""})
 });
 const backup=file(incoming);
 let badRead=false;
 const storage={
  getItem(k){if(k===PROFILE_KEY&&badRead){badRead=false;return "unverified-write";}return existing.getItem(k);},
  setItem(k,v){existing.setItem(k,v);if(k===PROFILE_KEY)badRead=true;},
  removeItem:k=>existing.removeItem(k)
 };
 const result=await restorePortableBackup(storage,backup);
 assert.equal(result.ok,false);
 assert.equal(result.partial,false,result.reason);
 assert.match(result.reason,/今回の書込みを変更前の状態に戻しました/);
 assert.equal(existing.getItem(CONDITION_KEY),originalCondition,"earlier successful key must also roll back");
 assert.equal(existing.getItem(PROFILE_KEY),null,"verified-write failure must roll back the currently attempted key");
 assert.equal(existing.getItem("unrelated_key"),"keep");
});
test("restore handles adapters that write data and then throw without claiming success",async()=>{
 const originalCondition=JSON.stringify([day("2026-10-10")]);
 const existing=fake({[CONDITION_KEY]:originalCondition});
 const incoming=fake({
  [CONDITION_KEY]:JSON.stringify([day("2026-10-12")]),
  [PROFILE_KEY]:JSON.stringify({nickname:"復元",purpose:"",heightCm:null,weightKg:null,ageBand:""})
 });
 let failOnce=true;
 const storage={
  getItem:k=>existing.getItem(k),
  setItem(k,v){
   existing.setItem(k,v);
   if(k===PROFILE_KEY&&failOnce){failOnce=false;throw Error("simulated post-commit storage failure");}
  },
  removeItem:k=>existing.removeItem(k)
 };
 const result=await restorePortableBackup(storage,file(incoming));
 assert.equal(result.ok,false);
 assert.equal(result.partial,false,result.reason);
 assert.equal(existing.getItem(CONDITION_KEY),originalCondition);
 assert.equal(existing.getItem(PROFILE_KEY),null);
});
test("restore does not overwrite an unexpected competing value during rollback",async()=>{
 const originalCondition=JSON.stringify([day("2026-10-10")]);
 const existing=fake({[CONDITION_KEY]:originalCondition});
 const incoming=fake({
  [CONDITION_KEY]:JSON.stringify([day("2026-10-12")]),
  [PROFILE_KEY]:JSON.stringify({nickname:"復元",purpose:"",heightCm:null,weightKg:null,ageBand:""})
 });
 let competing=true;
 const storage={
  getItem:k=>existing.getItem(k),
  setItem(k,v){
   existing.setItem(k,v);
   if(k===PROFILE_KEY&&competing){competing=false;existing.setItem(k,"different-writer");}
  },
  removeItem:k=>existing.removeItem(k)
 };
 const result=await restorePortableBackup(storage,file(incoming));
 assert.equal(result.ok,false);
 assert.equal(result.partial,true);
 assert.match(result.reason,/別の変更|再読込/);
 assert.equal(existing.getItem(CONDITION_KEY),originalCondition);
 assert.equal(existing.getItem(PROFILE_KEY),"different-writer","unknown concurrent content must not be clobbered");
});

test("backup exports one unchanged local snapshot and excludes consent without modifying storage",async()=>{
 const s=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-10")]),unrelated_key:"keep",
  [LEGAL_CONSENT_KEY]:"private-consent"});
 const before=Object.fromEntries(s.map);
 const output=await exportPortableBackup(s);
 assert.equal(output.ok,true,output.reason);
 const parsed=inspectPortableBackup(output.text);
 assert.equal(parsed.ok,true,parsed.reason);
 assert.equal(parsed.data.local[LEGAL_CONSENT_KEY],undefined);
 assert.equal(parsed.data.local[CONDITION_KEY],before[CONDITION_KEY]);
 assert.deepEqual(Object.fromEntries(s.map),before);
});
test("backup stops without producing a file if a non-cooperating writer changes an earlier key",async()=>{
 const s=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-10")])});
 const original=s.getItem(CONDITION_KEY),last=DATA_KEYS.at(-1);let changed=false;
 const adapter={
  getItem(k){
   const raw=s.getItem(k);
   if(k===last&&!changed){changed=true;s.setItem(CONDITION_KEY,JSON.stringify([day("2026-10-11")]));}
   return raw;
  }
 };
 const exported=await exportPortableBackup(adapter);
 assert.equal(changed,true);
 assert.equal(exported.ok,false);
 assert.match(exported.reason,/バックアップ中に端末の保存情報が変更/);
 assert.equal(Object.hasOwn(exported,"text"),false,"no mixed-time backup file");
 assert.notEqual(s.getItem(CONDITION_KEY),original,"external write was not overwritten");
});
test("backup stops if second snapshot becomes unreadable",async()=>{
 const s=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-10")])});
 let reads=0;
 const adapter={
  getItem(k){if(k===CONDITION_KEY&&++reads===2)throw Error("read blocked");return s.getItem(k);}
 };
 const result=await exportPortableBackup(adapter);
 assert.equal(result.ok,false);assert.match(result.reason,/再確認に失敗/);
 assert.equal(Object.hasOwn(result,"text"),false);
});
test("restore quota error after an earlier successful key rolls back without erasing originals",async()=>{
 const original=JSON.stringify([day("2026-10-10")]);
 const existing=fake({[CONDITION_KEY]:original});
 const source=fake({
  [CONDITION_KEY]:JSON.stringify([day("2026-10-11")]),
  [PROFILE_KEY]:JSON.stringify({nickname:"復元",purpose:"",heightCm:null,weightKg:null,ageBand:""})
 });
 const backup=file(source);
 const storage={
  getItem:k=>existing.getItem(k),
  setItem(k,v){if(k===PROFILE_KEY)throw Object.assign(Error("QuotaExceededError"),{name:"QuotaExceededError"});existing.setItem(k,v);},
  removeItem:k=>existing.removeItem(k)
 };
 const result=await restorePortableBackup(storage,backup);
 assert.equal(result.ok,false);assert.equal(result.partial,false,result.reason);
 assert.equal(existing.getItem(CONDITION_KEY),original);
 assert.equal(existing.getItem(PROFILE_KEY),null);
});
test("failed rollback reports partial result instead of claiming recovery",async()=>{
 const existing=fake();
 const source=fake({[CONDITION_KEY]:JSON.stringify([day("2026-10-11")]),
  [PROFILE_KEY]:JSON.stringify({nickname:"復元",purpose:"",heightCm:null,weightKg:null,ageBand:""})});
 const adapter={
  getItem:k=>existing.getItem(k),
  setItem(k,v){if(k===PROFILE_KEY)throw Error("capacity failure");existing.setItem(k,v);},
  removeItem(k){if(k===CONDITION_KEY)throw Error("cannot roll back");existing.removeItem(k);}
 };
 const result=await restorePortableBackup(adapter,file(source));
 assert.equal(result.ok,false);assert.equal(result.partial,true);
 assert.match(result.reason,/記録を再読込/);
 assert.notEqual(existing.getItem(CONDITION_KEY),null);
 assert.equal(existing.getItem(PROFILE_KEY),null);
});

test('stage 8 portable V2 roundtrip preserves before/after attribution, correction chain and unrelated storage',async()=>{
 const source=fake(),draft={date:'2026-10-25',distance:'5',hours:'',minutes:'30',seconds:'',
  activityGait:'RUNNING',runningFormat:'UNKNOWN',rofBefore:0,rofAfter:null,steps:'',
  stepsProvenance:'UNKNOWN',courseName:'',shoeName:'',memo:'本人の観察',
  exerciseTimingDraft:{startedAt:'2026-10-25T00:00:00.000Z',endedAt:'2026-10-25T00:30:00.000Z'},
  rofEntryEvidence:{before:{capturedAt:'2026-10-25T00:00:30.000Z',assessedAt:'2026-10-25T00:00:30.000Z',timeBasis:'AT_ENTRY'}}};
 const saved=saveManualRun(source,draft);
 assert.equal(saved.ok,true,saved.reason);
 const change=correctSavedRof(source,saved.record.id,'after',4,{
  timeBasis:'RECALLED',assessedAt:'2026-10-25T00:35:00.000Z',changedAt:'2026-10-30T04:00:00.000Z',reason:'思い出して訂正'});
 assert.equal(change.ok,true,change.reason);
 const archived=source.getItem(MANUAL_RUN_KEY);
 const backup=await exportPortableBackup(source);
 assert.equal(backup.ok,true,backup.reason);
 assert.equal(inspectPortableBackup(backup.text).ok,true);
 const restored=fake({'external-key':'keep me'});
 const finish=await restorePortableBackup(restored,backup.text);
 assert.equal(finish.ok,true,finish.reason);
 const read=readManualRuns(restored);
 assert.equal(read.ok,true,read.reason);
 assert.deepEqual(read.records,readManualRuns(source).records);
 assert.equal(restored.getItem(MANUAL_RUN_KEY),archived,'restoration retains original byte-encoded audit events');
 assert.equal(restored.getItem('external-key'),'keep me');
 const a=read.records[0];
 assert.equal(a.rofEvidence.before.score,0);
 assert.equal(a.rofEvidence.after.score,null);
 assert.equal(a.rofCorrections.length,1);
 assert.equal(a.rofCorrections[0].to,4);
 assert.equal(a.rofCorrections[0].next.timeBasis,'RECALLED');
 assert.equal(a.rofCorrections[0].next.assessedAt,'2026-10-25T00:35:00.000Z');
 assert.equal(a.exerciseTiming.source,'USER_DECLARED');
});

test('portable JSON byte checks use UTF-8 for Japanese and emoji (012)',async()=>{
 assert.equal('あ🙂'.length,3,'UTF-16 code units are not file bytes');
 assert.equal(portableUtf8Bytes('あ🙂'),7);
 assert.equal(portableUtf8Bytes('ASCII'),5);
 const source=fake({[CONDITION_KEY]:JSON.stringify([{...day('2026-10-29'),memo:'気づき🙂'}])});
 const backup=await exportPortableBackup(source);
 assert.equal(backup.ok,true,backup.reason);
 assert.equal(portableUtf8Bytes(backup.text),new Blob([backup.text]).size);
 assert.equal(inspectPortableBackup(backup.text).ok,true);
});

test("portable restore preview names all ten data keys in the correct order (009)",()=>{
 assert.equal(DATA_KEYS.length,10);
 const expected=["手入力の運動記録","休養日の記録","日々の体調・睡眠","保存コース","コンディションの振り返り","探究メモ","確認事項","ホームの表示設定","プロフィール","表示設定"];
 assert.deepEqual(DATA_KEYS.map(key=>fieldTitles[key]),expected);
 const html=renderDataBackup({includeGps:false,busy:false,preview:{ok:true,hasExisting:false,parsed:{counts:Object.fromEntries(DATA_KEYS.map(key=>[key,1])),gpsCount:0}}});
 for(const label of expected)assert.ok(html.includes(label),label+" should appear in the restore preview");
 assert.doesNotMatch(html,/<span>undefined<\/span>/);
});
