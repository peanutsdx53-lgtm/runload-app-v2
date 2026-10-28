import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TERMS,PRIVACY,LEGAL_VERSION,LEGAL_CONSENT_KEY,legalDocumentMarkup,readLegalConsent,saveLegalConsent} from "../ui/legalDocuments.js";
import {FIRST_USE_STEPS,renderFirstUse,renderLegalDocumentModal} from "../ui/firstUseExperience.js";
import {renderSettings,loadProfile,loadDisplay} from "../ui/settingsExperience.js";

const state=(step,extra={})=>({step,termsAccepted:false,privacyConfirmed:false,documentOpen:"",error:"",replay:false,nickname:"",purpose:"",heightCm:"",weightKg:"",...extra});
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),setRaw:(k,v)=>m.set(k,v)}};
test("no provisional app name appears in legal documents or first-use screens",()=>{
 const copy=JSON.stringify([TERMS,PRIVACY]);
 assert.doesNotMatch(copy,/RunLoad|ランロード/i);
 for(let step=0;step<8;step++)assert.doesNotMatch(renderFirstUse(state(step)),/RunLoad|ランロード/i);
});
test("Japanese is fixed and English is visible but disabled",()=>{
 assert.deepEqual(FIRST_USE_STEPS,["表示言語","利用規約・プライバシー","記録と振り返り","記録する","結果を確認する","履歴と体調","情報を調べる・共有する","プロフィール"]);
 const html=renderFirstUse(state(0));
 assert.match(html,/日本語/);assert.match(html,/使用中/);
 assert.match(html,/English/);assert.match(html,/fu-unavailable" disabled/);
 assert.doesNotMatch(html,/value="en"/);
});
test("terms and privacy must be separately acknowledged",()=>{
 const before=renderFirstUse(state(1));
 assert.match(before,/data-onboard-terms/);assert.match(before,/data-onboard-privacy/);
 assert.match(before,/data-onboard-next disabled/);
 const after=renderFirstUse(state(1,{termsAccepted:true,privacyConfirmed:true}));
 assert.doesNotMatch(after,/data-onboard-next disabled/);
 assert.match(after,/同意して次へ/);
});
test("complete text and legal scope are present",()=>{
 assert.equal(TERMS.sections.length,18);assert.equal(PRIVACY.sections.length,17);
 for(const term of ["GPS","身体部位別","免責","利用の終了","未成年","故意","個人","無償","無料"]){
  assert.ok(JSON.stringify([TERMS,PRIVACY]).includes(term),"missing "+term);
 }
 const modal=renderLegalDocumentModal("terms");
 assert.match(modal,/fu-doc-scroll/);assert.match(modal,/全文/);
 assert.match(legalDocumentMarkup("privacy"),/OpenStreetMap/);
 assert.match(legalDocumentMarkup("privacy"),/Github|GitHub/);
 assert.match(legalDocumentMarkup("terms"),/運営者の責任/);
 assert.match(renderFirstUse(state(7)),/data-onboard-skip-profile/);
});
test("consent persists only when saved and matches the exact document versions",()=>{
 const st=storage();assert.equal(readLegalConsent(st),false);
 const saved=saveLegalConsent(st);assert.equal(saved.ok,true);
 assert.equal(saved.record.termsVersion,LEGAL_VERSION);
 assert.equal(readLegalConsent(st),true);
 st.setRaw(LEGAL_CONSENT_KEY,JSON.stringify({...saved.record,privacyVersion:"old"}));assert.equal(readLegalConsent(st),false);
 st.setRaw(LEGAL_CONSENT_KEY,"not-json");assert.equal(readLegalConsent(st),false);
 assert.equal(saveLegalConsent(null).ok,false);
});
test("settings shows legal documents and no longer claims existing GPS capability is unavailable",()=>{
 const html=renderSettings({profile:loadProfile(null),display:loadDisplay(null)});
 assert.match(html,/data-legal-open="terms"/);assert.match(html,/data-legal-open="privacy"/);
 assert.ok(!html.includes("GPSによる測定の保存と、身体の部位別の参考値の表示は準備中"));
});
test("first-use integration stores consent independently from the guide completion",()=>{
 const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
 assert.match(app,/legalDocuments\.saveLegalConsent/);
 assert.match(app,/function finishOnboarding/);
 assert.match(app,/data-onboard-skip-profile/);
 assert.match(app,/onboardingState\.replay\?2:0/);
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 assert.match(html,/firstUseExperience\.css/);
 const sw=readFileSync(new URL("../sw.js",import.meta.url),"utf8");
 for(const f of ["firstUseExperience.js","firstUseExperience.css","legalDocuments.js"])assert.ok(sw.includes(f),f);
});
