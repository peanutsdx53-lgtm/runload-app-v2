import test from "node:test";
import assert from "node:assert/strict";
import {DATA_KEYS,RESET_KEYS,PORTABLE_FORMAT,PORTABLE_VERSION,inspectLocalStorage,
 inspectPortableBackup,planPortableRestore} from "../ui/dataManagement.js";
import {makeDataUi,renderDataBackup,renderDataDelete} from "../ui/dataManagementUi.js";
import {CONDITION_KEY} from "../ui/homeExperience.js";
import {PROFILE_KEY} from "../ui/settingsExperience.js";
import {LEGAL_CONSENT_KEY} from "../ui/legalDocuments.js";
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
 assert.equal(DATA_KEYS.length,9);
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
 assert.match(remove,/元に戻せません/);
 assert.match(remove,/data-dm-delete-confirm disabled/);
 assert.doesNotMatch(backup+remove,/RunLoad|ランロード/);
});
