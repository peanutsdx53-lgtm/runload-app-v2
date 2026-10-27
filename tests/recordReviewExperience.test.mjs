import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewView, paceLabel, durationLabel } from '../ui/recordReviewExperience.js';
const base={date:'2026-10-25',distance:'5.2',hours:'',minutes:'32.5',seconds:'',rofBefore:0,rofAfter:5,steps:'',stepsProvenance:'UNKNOWN',runningFormat:'UNKNOWN',temperatureC:'',environmentNote:'',bodyObservation:'',shoeName:'',memo:'',gradeMode:'UNKNOWN',surfaceMode:'UNKNOWN'};
test('minutes decimal precision and manual pace',()=>{ assert.equal(durationLabel(base),'32:30');assert.equal(paceLabel(base),'6:15'); });
test('GPS hours and seconds are not rounded to integer minutes',()=>{const d={...base,hours:'0',minutes:'32',seconds:'16'};assert.equal(durationLabel(d),'32:16');assert.equal(paceLabel(d),'6:12');});
test('manual record review renders real draft and five editing destinations',()=>{const s=reviewView({...base,courseName:'川沿い往復',shoeName:'練習用シューズ'},{});assert.match(s,/川沿い往復/);assert.match(s,/練習用シューズ/);assert.match(s,/6:15/);assert.equal((s.match(/data-review-link=/g)||[]).length,5);assert.match(s,/data-manual-run-save/);assert.doesNotMatch(s,/<button[^>]*>保存する/);});
test('zero ROF-J is shown as a valid selection and no phantom region values',()=>{const s=reviewView(base,{});assert.match(s,/運動前 0 ／ 運動後 5/);assert.doesNotMatch(s,/心拍数|消費カロリー|獲得標高/);});
test('GPS preview values never become recorded values',()=>{const s=reviewView({...base,date:'2026-10-25'},{source:'gps'});assert.match(s,/GPSでの記録はまだ利用できません/);assert.match(s,/距離が未取得/);assert.doesNotMatch(s,/>5\.20</); assert.doesNotMatch(s,/練習用シューズA/);assert.match(s,/手入力で補足/);});
test('missing values remain missing and rest has no running metrics',()=>{const s=reviewView({date:'',distance:'',minutes:''},{});assert.match(s,/日付が未取得/);assert.match(s,/距離が未取得/);const rest=reviewView({date:'2026-10-25',memo:'休養'},{recordType:'rest'});assert.doesNotMatch(rest,/class="rr-metrics"/);assert.equal((rest.match(/data-review-link=/g)||[]).length,2);});
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
 const html=reviewView(base,{source:'manual',recordType:'run'});
 assert.match(html,/活動種別が未選択です/);
 assert.match(html,/data-review-gait="RUNNING"/);
 assert.match(html,/data-review-gait="JOGGING"/);
 assert.match(html,/data-review-gait="WALK"/);
 assert.match(html,/このまま保存すると人体図/);
 assert.match(html,/data-manual-run-save(?! disabled)/);
 const selected=reviewView({...base,activityGait:'RUNNING'},{source:'manual',recordType:'run'});
 assert.doesNotMatch(selected,/data-review-gait=/);
});
