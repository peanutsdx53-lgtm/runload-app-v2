import test from 'node:test';
import assert from 'node:assert/strict';
import {COURSE_PRESET_KEY,readCoursePresets,saveCoursePreset,deleteCoursePreset,applyCoursePreset,snapshotCourse} from '../ui/coursePresetStore.js';
import {initialCourseUi,coursePage} from '../ui/recordExperience.js';
const storage=()=>{const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)}};
const draft=()=>({courseName:'川沿い往復',gradeMode:'SUMMARY',upPercent:'30',downPercent:'25',upGradePercent:'2',downGradePercent:'3',surfaceMode:'SINGLE',primarySurface:'paved',distance:'5.7',minutes:'38',date:'2026-10-26',rofBefore:3,memo:'自分だけのメモ'});
test('save, reload, apply and delete a course without touching run fields',()=>{
 const st=storage(),d=draft(),ui=initialCourseUi(d),saved=saveCoursePreset(st,d,ui);
 assert.equal(saved.ok,true);
 assert.equal(readCoursePresets(st).records.length,1);
 assert.deepEqual(Object.keys(saved.preset.data).some(k=>['distance','minutes','rofBefore','memo','date'].includes(k)),false);
 const other={...draft(),courseName:'別の記録',distance:'9.75',minutes:'47',rofBefore:9,memo:'残す'};
 const apply=applyCoursePreset(other,readCoursePresets(st).records[0]);assert.equal(apply.ok,true);
 assert.equal(apply.draft.distance,'9.75');assert.equal(apply.draft.minutes,'47');assert.equal(apply.draft.rofBefore,9);assert.equal(apply.draft.memo,'残す');
 assert.equal(apply.draft.courseName,'川沿い往復');assert.equal(apply.draft.upPercent,'30');
 const view=coursePage({recordDraft:apply.draft,recordCourseUi:apply.ui},apply.ui,readCoursePresets(st),true);
 assert.match(view,/data-course-use=/);assert.match(view,/data-course-delete=/);assert.match(view,/href="#\/home"/);
 assert.equal(deleteCoursePreset(st,saved.preset.id).ok,true);assert.equal(readCoursePresets(st).records.length,0);
 assert.equal(other.distance,'9.75');
});
test('update retains stable identity, save as copy is independent',()=>{
 const st=storage(),d=draft(),saved=saveCoursePreset(st,d,initialCourseUi(d));
 const modified={...d,courseName:'修正後',upPercent:'20'};
 const updated=saveCoursePreset(st,modified,initialCourseUi(modified),saved.preset.id);
 assert.equal(updated.ok,true);assert.equal(updated.preset.id,saved.preset.id);assert.equal(updated.preset.createdAt,saved.preset.createdAt);
 const copy=saveCoursePreset(st,modified,initialCourseUi(modified));assert.equal(copy.ok,true);
 assert.notEqual(copy.preset.id,updated.preset.id);assert.equal(readCoursePresets(st).records.length,2);
});
test('invalid slope, missing name and mixed surfaces never save',()=>{
 const st=storage(),d=draft();d.upPercent='90';d.downPercent='30';
 assert.equal(saveCoursePreset(st,d,initialCourseUi(d)).ok,false);
 d.upPercent='30';d.courseName='';assert.equal(saveCoursePreset(st,d,initialCourseUi(d)).ok,false);
 d.courseName='安全';d.surfaceMode='MIXED';d.surfacepaved='70';d.surfacetrail='20';
 assert.equal(saveCoursePreset(st,d,initialCourseUi(d)).ok,false);
 d.surfacetrail='30';const ok=saveCoursePreset(st,d,initialCourseUi(d));assert.equal(ok.ok,true);
 assert.equal(ok.preset.data.surfacepaved,'70');assert.equal(ok.preset.data.surfacetrail,'30');
});
test('malformed existing course data fails closed, never overwritten or deleted',()=>{
 const st=storage();st.setItem(COURSE_PRESET_KEY,'{"version":1,"revision":1,"records":[{"id":"bad"}]}');const previous=st.getItem(COURSE_PRESET_KEY);
 assert.equal(readCoursePresets(st).ok,false);
 assert.equal(saveCoursePreset(st,draft(),initialCourseUi(draft())).ok,false);
 assert.equal(deleteCoursePreset(st,'bad').ok,false);
 assert.equal(st.getItem(COURSE_PRESET_KEY),previous);
});
test('course text is escaped and deletion requires explicit selection in UI',()=>{
 const st=storage(),d={...draft(),courseName:'<img src=x onerror=alert(1)>'},saved=saveCoursePreset(st,d,initialCourseUi(d));
 assert.equal(saved.ok,true);
 const ui=initialCourseUi(d);ui.pendingDelete=saved.preset.id;
 const html=coursePage({recordDraft:d,recordCourseUi:ui},ui,readCoursePresets(st));
 assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
 assert.match(html,/data-course-confirm-delete/);
 assert.match(html,/data-course-cancel-delete/);
});
