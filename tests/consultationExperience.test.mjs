import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {consultationSources, periodRecords,trendSvg,renderConsultation,reportRecordContext,reportRofInterpretation} from '../ui/consultationExperience.js';
const saved=(id,date,distanceKm,extra={})=>({id,date,distanceKm,source:'manual',durationSeconds:1800,createdAt:date+'T12:00:00Z',...extra});
test('read-only reporting uses only validated saved records and does not mutate inputs',()=>{
 const records=[saved('real','2026-10-25',5),saved('bad','2026-10-24',NaN)];
 const manual={ok:true,records};const gps={ok:true,records:[]};const conditions={canSave:true,entries:[]};
 const before=JSON.stringify(records[0]);
 const result=consultationSources({manual,gps,conditions});
 assert.deepEqual(result.records.map(r=>r.id),['real']);
 assert.equal(JSON.stringify(records[0]),before);
 assert.deepEqual(result.errors,[]);
});
test('corrupted storage is never interpreted as valid records',()=>{
 const r=consultationSources({manual:{ok:false,reason:'corrupt'},gps:{ok:true,records:[]},conditions:{canSave:false,reason:'corrupt'}});
 assert.deepEqual(r.records,[]);
 assert.equal(r.errors.length,2);
});
test('period selects recorded days only and keeps missing days absent',()=>{
 const r=[saved('a','2026-10-21',2),saved('b','2026-10-27',5),saved('c','2026-10-17',7)];
 const selected=periodRecords(r,7,new Date('2026-10-27T12:00:00'));
 assert.deepEqual(selected.map(x=>x.id),['b','a']);
});
test('distance trend carries a km vertical axis and never manufactures unrecorded zeros',()=>{
 assert.match(trendSvg([]),/保存済みの運動記録はありません/);
 const svg=trendSvg([saved('a','2026-10-25',2.8),saved('b','2026-10-27',5.2)]);
 assert.match(svg,/距離（km）/);
 assert.match(svg,/2\.8/);
 assert.match(svg,/5\.2/);
 assert.doesNotMatch(svg,/表示例|架空/);
});
test('approved report retains diagrams, explanations, control and print output',()=>{
 const html=renderConsultation();
 for(const label of ['人体図・12部位','算出値・回答値の見方','相談・共有','印刷 / PDF','期間中の推移'])assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/2026年10月20日|デザイン候補|実装時は/);
 assert.match(html,/data-mode-button="period"/);
});

test('consultation uses the compact RunLoad header with a home back link',()=>{
 const html=renderConsultation();
 assert.match(html,/class="cp-back" aria-label="ホームに戻る"/);
 assert.match(html,/<h1>相談・共有<\/h1>/);
 assert.doesNotMatch(html,/cp-breadcrumb/);
});

test('consultation hides the global install arrow without affecting other screens',()=>{
 const css=readFileSync(new URL('../ui/consultationExperience.css',import.meta.url),'utf8');
 assert.match(css,/@media screen\s*\{\.cp-app \.topbar\{display:none!important\}\}/);
 assert.doesNotMatch(css,/\.cp-app \.topbar\{display:contents\}/);
 assert.doesNotMatch(css,/\.cp-app \.topbar-right\{position:absolute/);
});

test('consultation identifies one source record instead of implying period aggregate',()=>{
 const r=saved('source-42','2026-10-27',5,{draft:{activityGait:'JOGGING'}});
 assert.match(reportRecordContext(r,'period'),/期間内の1記録（期間全体の平均・合計ではありません）/);
 assert.match(reportRecordContext(r,'period'),/2026\/10\/27／ジョギング／手入力／記録ID：source-42/);
 assert.match(reportRecordContext(r,'single'),/選択した1記録/);
 assert.match(reportRecordContext(null,'period'),/該当する保存済み記録はありません/);
});

// Stage 11: report language must reflect V2 provenance, not invent temporal causality.
test('consultation explains V2 ROF-J provenance without a temporal difference',()=>{
 const note=reportRofInterpretation();
 for(const phrase of ['0は有効な回答','未回答','回答区分','入力操作時刻','本人申告の評価日時','客観的に検証されていません','時間的な前後差は判定しません'])assert.ok(note.includes(phrase),phrase);
 assert.doesNotMatch(note,/個別の評価時刻がないため|前後の変化量は測定/);
 const html=renderConsultation();
 assert.match(html,/運動前・運動後の回答（ROF-J）/);
 assert.match(html,/回答区分別の主観値/);
 assert.match(html,/時間的な変化量は判定しません/);
 assert.doesNotMatch(html,/疲労感の変化（ROF-J）|運動後 − 運動前/);
});

test('opt-out of personal narration includes the stated purpose, not just observations and questions',()=>{
 const html=renderConsultation();
 assert.match(html,/data-share="notes"[^>]*>本人の記述（目的・気付き・質問）/);
 assert.match(html,/<section class="cp-section" data-output-section="notes"><div class="cp-section-heading"><b>01<\/b> 共有・相談の目的/);
 assert.match(html,/<section class="cp-section" data-output-section="notes"><div class="cp-section-heading"><b>04<\/b> 本人の気付き/);
});

test('report scope does not promise unavailable sensitive-data inclusion controls',()=>{
 const html=renderConsultation();
 assert.match(html,/GPS詳細軌跡・個人プロフィール・身体の違和感に関する個別メモは、このレポートに追加する項目がありません/);
 assert.match(html,/別の方法で本人が伝えてください/);
 assert.match(html,/共有先への自動送信も行いません/);
 assert.doesNotMatch(html,/明示的な追加選択が必要です|本人が選択しない限り含めず/);
 for(const forbidden of ['gps-track','profile','body-memo']){
  assert.doesNotMatch(html,new RegExp('data-share="'+forbidden+'"'),'unimplemented options must not appear');
 }
});

test('keyboard focus and mobile >=16px controls are limited to screen and do not alter print',()=>{
 const css=readFileSync(new URL('../ui/consultationExperience.css',import.meta.url),'utf8');
 assert.match(css,/\.cp-mode-button:focus-visible/);
 assert.match(css,/\.cp-check input:focus-visible/);
 assert.match(css,/outline:3px solid #9af9e9/);
 assert.match(css,/@media screen and \(max-width:800px\)/);
 assert.match(css,/\.cp-select,\.cp-app \.cp-field\{font-size:16px!important/);
});
