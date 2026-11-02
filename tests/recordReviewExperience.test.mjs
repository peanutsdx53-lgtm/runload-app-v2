import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewView, paceLabel, durationLabel } from '../ui/recordReviewExperience.js';
const base={date:'2026-10-25',distance:'5.2',hours:'',minutes:'32.5',seconds:'',rofBefore:0,rofAfter:5,steps:'',stepsProvenance:'UNKNOWN',activityGait:'RUNNING',runningFormat:'UNKNOWN',temperatureC:'',environmentNote:'',bodyObservation:'',shoeName:'',memo:'',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN'};
test('minutes decimal precision and manual pace',()=>{ assert.equal(durationLabel(base),'32:30');assert.equal(paceLabel(base),'6:15'); });
test('GPS hours and seconds are not rounded to integer minutes',()=>{const d={...base,hours:'0',minutes:'32',seconds:'16'};assert.equal(durationLabel(d),'32:16');assert.equal(paceLabel(d),'6:12');});
test('manual record review renders real draft and five editing destinations',()=>{const s=reviewView({...base,courseName:'川沿い往復',shoeName:'練習用シューズ'},{});assert.match(s,/川沿い往復/);assert.match(s,/練習用シューズ/);assert.match(s,/6:15/);assert.equal((s.match(/data-review-link=/g)||[]).length,5);assert.match(s,/data-manual-run-save/);assert.doesNotMatch(s,/<button[^>]*>保存する/);});
test('zero ROF-J is shown as a valid selection and no phantom region values',()=>{const s=reviewView(base,{});assert.match(s,/運動前 0 ／ 運動後 5/);assert.doesNotMatch(s,/心拍数|消費カロリー|獲得標高/);});
test('GPS preview values never become recorded values',()=>{const s=reviewView({...base,date:'2026-10-25'},{source:'gps'});assert.match(s,/GPSでの記録はまだ利用できません/);assert.match(s,/距離が未取得/);assert.doesNotMatch(s,/>5\.20</); assert.doesNotMatch(s,/練習用シューズA/);assert.match(s,/手入力で補足/);});
test('missing values remain missing and rest has no running metrics',()=>{const s=reviewView({date:'',distance:'',minutes:''},{});assert.match(s,/日付が未取得/);assert.match(s,/距離を入力してください/);const rest=reviewView({date:'2026-10-25',memo:'休養'},{recordType:'rest'});assert.doesNotMatch(rest,/class="rr-metrics"/);assert.equal((rest.match(/data-review-link=/g)||[]).length,2);});
test('script injection in notes is escaped',()=>{const s=reviewView({...base,bodyObservation:'<script>alert(1)</script>'},{});assert.ok(!s.includes('<script>'));assert.match(s,/&lt;script&gt;/);});

import {saveManualRun,readManualRuns,toHistoryRows,MANUAL_RUN_KEY} from '../ui/manualRunStore.js';
const localStore=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}};
test('manual-run persistence reloads validated records and feeds history explicitly',()=>{
 const storage=localStore();
 const saved=saveManualRun(storage,{...base,memo:'夕方の走行'});
 assert.equal(saved.ok,true,saved.reason);
 const read=readManualRuns(storage);
 assert.equal(read.ok,true);assert.equal(read.records.length,1);
 assert.equal(read.records[0].id,saved.record.id);
 assert.equal(read.records[0].durationSeconds,1950);
 assert.equal(toHistoryRows(read)[0].id,saved.record.id);
});
test('manual-run persistence rejects GPS, rest, invalid day, and duration',()=>{
 for(const [draft,opts] of [
  [base,{source:'gps'}],[base,{type:'rest'}],
  [{...base,date:'2026-02-30'},{}],[{...base,minutes:''},{}]
 ]){
  const s=localStore();assert.equal(saveManualRun(s,draft,opts).ok,false);
  assert.equal(s.getItem(MANUAL_RUN_KEY),null);
 }
});
test('manual-run persistence fails closed on corrupt storage and leaves other records intact',()=>{
 const s=localStore();s.setItem(MANUAL_RUN_KEY,'{broken');
 s.setItem('runload-v2-life-condition-v1','keep');
 assert.equal(saveManualRun(s,base).ok,false);
 assert.equal(s.getItem(MANUAL_RUN_KEY),'{broken');
 assert.equal(s.getItem('runload-v2-life-condition-v1'),'keep');
});

test('record review highlights unknown activity and offers direct choices before saving',()=>{
 const html=reviewView({...base,activityGait:'UNKNOWN'},{source:'manual',recordType:'run'});
 assert.match(html,/活動種目の選択が必要です/);
 assert.match(html,/data-review-gait="RUNNING"/);
 assert.match(html,/data-review-gait="JOGGING"/);
 assert.match(html,/data-review-gait="WALK"/);
 assert.match(html,/保存の必須項目/);
 assert.match(html,/data-manual-run-save[^>]* disabled/);
 assert.match(html,/活動種目を選択してください/);
 const selected=reviewView({...base,activityGait:'RUNNING'},{source:'manual',recordType:'run'});
 assert.doesNotMatch(selected,/data-review-gait=/);
});

test('distance time activity are all required on review and save stays disabled until valid',()=>{
 const scenarios=[
  [{...base,distance:''},'距離を入力してください'],
  [{...base,distance:'0'},'距離は0より大きい'],
  [{...base,minutes:'',hours:'',seconds:''},'時間を入力してください'],
  [{...base,minutes:'0'},'時間は0より大きい'],
  [{...base,activityGait:'UNKNOWN'},'活動種目を選択してください']
 ];
 for(const [input,message] of scenarios){
  const markup=reviewView(input,{source:'manual',recordType:'run'});
  assert.match(markup,new RegExp(message));
  assert.match(markup,/data-manual-run-save[^>]* disabled/);
  assert.match(markup,/role="alert"/);
 }
 const complete=reviewView(base,{source:'manual',recordType:'run'});
 assert.match(complete,/data-required-status="distance" data-required-ok="true"/);
 assert.match(complete,/data-required-status="time" data-required-ok="true"/);
 assert.match(complete,/data-required-status="activity" data-required-ok="true"/);
 assert.match(complete,/data-manual-run-save(?![^>]*disabled)/);
});

test('S08/S20: accessible save control references a real error message only when errors exist',()=>{
 const good=reviewView(base,{source:'manual',recordType:'run'});
 assert.match(good,/data-manual-run-save/);
 assert.doesNotMatch(good,/aria-describedby="rr-review-validation"/);
 assert.doesNotMatch(good,/id="rr-review-validation"/);
 const bad=reviewView({...base,distance:''},{source:'manual',recordType:'run'});
 assert.match(bad,/data-manual-run-save aria-describedby="rr-review-validation"/);
 assert.match(bad,/id="rr-review-validation"[^>]*role="alert"/);
 assert.match(bad,/data-manual-run-save[^>]*disabled/);
});

test('S09: valid review relies on status badges, without a redundant success card',()=>{
 const html=reviewView(base,{source:'manual',recordType:'run'});
 assert.equal((html.match(/data-required-status=/g)||[]).length,3);
 assert.doesNotMatch(html,/入力内容を確認しました|入力内容の基本的な形式を確認しました/);
 assert.doesNotMatch(html,/class="rr-panel rr-alert/);
 assert.doesNotMatch(html,/入力した日付・距離・時間を確認/);
 assert.match(html,/data-manual-run-save(?![^>]*disabled)/);
 assert.match(html,/平均ペースは距離と時間から計算しています/);
 assert.match(html,/外部へ送信しません/);
 assert.doesNotMatch(html,/12部位の文献参考値は活動種別と速度の適用条件/);
 assert.doesNotMatch(html,/今回の内容を確かめ、必要な項目を編集/);
});
test('S09: incomplete required input retains explicit errors and disabled save',()=>{
 const missing={...base,distance:'',activityGait:'UNKNOWN'};
 const h=reviewView(missing,{source:'manual',recordType:'run'});
 assert.match(h,/保存前に入力が必要な項目があります/);
 assert.match(h,/data-required-status="distance" data-required-ok="false"/);
 assert.match(h,/data-manual-run-save[^>]*disabled/);
 assert.match(h,/data-review-gait="RUNNING"/);
});
test('S09: optional section icon paths have the same shared SVG source',()=>{
 const h=reviewView(base,{source:'manual',recordType:'run'});
 assert.equal((h.match(/class="rr-row-icon"><svg/g)||[]).length,5);
});

test('long personal notes stay intact in the draft but are concise on the save review',()=>{
 const long='走行後の本人の気づき'.repeat(48);
 const note='自由記述'+long;
 const d={...base,bodyObservation:long,shoeName:'使用したシューズ名'.repeat(12),memo:note,temperatureC:'18.5',environmentNote:'気づいた環境のメモ\n【本人申告の環境選択】天候：くもり、風が強い'};
 const html=reviewView(d,{});
 assert.match(html,/本人申告：天候：くもり、風が強い/);
 assert.match(html,/全文は編集画面で確認/);
 assert.equal(html.includes(long),false,'full long text is not duplicated in the review summary');
 assert.match(html,/気になった部位|身体・使用品・メモ/);
 assert.match(html,/data-manual-run-save/);
});

test('S08 repeated warnings are merged without losing any validation or disabling',()=>{
 const html=reviewView({...base,date:'',distance:'',minutes:'',activityGait:''},{});
 assert.match(html,/id="rr-review-validation"/);
 assert.match(html,/aria-describedby="rr-review-validation"/);
 assert.match(html,/role="alert"/);
 assert.match(html,/距離を入力してください/);
 assert.match(html,/時間を入力してください/);
 assert.doesNotMatch(html,/距離が未取得です/);
 assert.doesNotMatch(html,/時間が未取得です/);
 assert.match(html,/data-manual-run-save[^>]+disabled/);
 assert.doesNotMatch(html,/id="rr-save-validation"/);
 assert.doesNotMatch(html,/class="rr-save-required-warning"/);
 assert.equal((html.match(/data-required-status=/g)||[]).length,3);
 assert.match(html,/data-required-status="distance".*?<b>距離<\/b><em>要入力<\/em>/);
 const good=reviewView(base,{});
 assert.match(good,/data-required-status="distance".*?<b>距離<\/b><em>入力済み<\/em>/);
 assert.doesNotMatch(good,/id="rr-review-validation"/);
});
