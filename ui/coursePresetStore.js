/* RunLoad v2 reusable course templates v1. Independent from saved runs / GPS tracks.
 * The source-of-truth for a recording stays the recording's own snapshot.
 */
import {SURFACES,courseReadiness,initialCourseUi} from './recordExperience.js';
export const COURSE_PRESET_KEY='runload-v2-course-presets-v1';
const MAX_PRESETS=50,MAX_BYTES=240000;
const KEYS=['courseName','gradeMode','upPercent','downPercent','upGradePercent','downGradePercent','surfaceMode','primarySurface',
 ...SURFACES.map(([k])=>'surface'+k),
 ...Array.from({length:5},(_,i)=>['sectionShare'+i,'sectionDirection'+i,'sectionGrade'+i,'sectionSurface'+i]).flat()];
export const COURSE_FIELDS=Object.freeze(KEYS);
const keySet=new Set(KEYS);
const surfaceIds=new Set(SURFACES.map(([k])=>k));
const directions=new Set(['UPHILL','DOWNHILL','FLAT']);
const opts=(storage)=>storage&&typeof storage.getItem==='function'&&typeof storage.setItem==='function'&&typeof storage.removeItem==='function';
const numeric=(v,max=100)=>v===''||(typeof v==='string'&&/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(v)&&Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=max);
const validFields=d=>{
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==KEYS.length||Object.keys(d).some(k=>!keySet.has(k)))return false;
 if(typeof d.courseName!=='string'||d.courseName.length<1||d.courseName.length>80||d.courseName.trim()!==d.courseName||/[\x00-\x1f]/.test(d.courseName))return false;
 if(!['UNKNOWN','FLAT','SUMMARY','SECTIONS'].includes(d.gradeMode)||!['UNKNOWN','SINGLE','MIXED'].includes(d.surfaceMode))return false;
 if(d.primarySurface!==''&&!surfaceIds.has(d.primarySurface))return false;
 for(const k of ['upPercent','downPercent','upGradePercent','downGradePercent',...SURFACES.map(([n])=>'surface'+n)])if(!numeric(d[k]))return false;
 for(let i=0;i<5;i++){
  if(!numeric(d['sectionShare'+i])||!numeric(d['sectionGrade'+i]))return false;
  if(!directions.has(d['sectionDirection'+i]))return false;
  if(d['sectionSurface'+i]!=='UNKNOWN'&&!surfaceIds.has(d['sectionSurface'+i]))return false;
 }
 const ui=initialCourseUi(d);
 return courseReadiness(d,ui).length===0;
};
const validPreset=r=>r&&typeof r==='object'&&!Array.isArray(r)&&Object.keys(r).sort().join('|')==='createdAt|data|id|updatedAt'&&
 typeof r.id==='string'&&/^course-v1-[0-9a-f-]{36}$/.test(r.id)&&
 typeof r.createdAt==='string'&&Number.isFinite(Date.parse(r.createdAt))&&
 typeof r.updatedAt==='string'&&Number.isFinite(Date.parse(r.updatedAt))&&validFields(r.data);
export function readCoursePresets(storage){
 if(!opts(storage))return {ok:false,reason:'この端末の保存領域にアクセスできません',revision:0,records:[]};
 try{
  const raw=storage.getItem(COURSE_PRESET_KEY);
  if(raw===null)return {ok:true,revision:0,records:[]};
  if(raw.length>MAX_BYTES)throw Error('oversize');
  const data=JSON.parse(raw);
  if(!data||data.version!==1||!Number.isSafeInteger(data.revision)||data.revision<0||!Array.isArray(data.records)||data.records.length>MAX_PRESETS||!data.records.every(validPreset)||new Set(data.records.map(r=>r.id)).size!==data.records.length)throw Error('invalid');
  return {ok:true,revision:data.revision,records:data.records};
 }catch{return {ok:false,reason:'保存コースを安全に読み取れません。元のデータは変更しません',revision:0,records:[]};}
}
export function snapshotCourse(draft,ui){
 if(!draft||typeof draft!=='object')return {ok:false,reason:'コースの入力を確認できません'};
 const name=typeof draft.courseName==='string'?draft.courseName.trim():'';
 if(!name||name.length>80||/[\x00-\x1f]/.test(name))return {ok:false,reason:'80文字以内のコース名を入力してください'};
 const errors=courseReadiness(draft,ui||initialCourseUi(draft));
 if(errors.length)return {ok:false,reason:errors.join(' ')};
 const data={};
 for(const k of KEYS){
  const d=draft[k];
  data[k]=k==='courseName'?name:k==='gradeMode'?String(d||'UNKNOWN'):k==='surfaceMode'?String(d||'UNKNOWN'):
   k==='primarySurface'?String(d||''):k.startsWith('sectionDirection')?String(d||'FLAT'):
   k.startsWith('sectionSurface')?String(d||'UNKNOWN'):String(d??'');
 }
 // Hidden/stale values from a different surface mode must not become part
 // of a later preset (nor reappear as selected mixed-surface fields).
 const chosen=new Set(ui?.surfaceSelected||[]);
 for(const [k] of SURFACES){
  if(data.surfaceMode!=='MIXED'||!chosen.has(k))data['surface'+k]='';
 }
 if(data.surfaceMode!=='SINGLE')data.primarySurface='';
 if(data.gradeMode!=='SUMMARY')for(const k of ['upPercent','downPercent','upGradePercent','downGradePercent'])data[k]='';
 if(data.gradeMode!=='SECTIONS')for(let i=0;i<5;i++){
  data['sectionShare'+i]='';data['sectionGrade'+i]='';data['sectionDirection'+i]='FLAT';data['sectionSurface'+i]='UNKNOWN';
 }
 if(!validFields(data))return {ok:false,reason:'コースの坂道・路面の条件を確認してください'};
 return {ok:true,data};
}
export function applyCoursePreset(draft,preset){
 if(!validPreset(preset)||!draft||typeof draft!=='object'||Array.isArray(draft))return {ok:false,reason:'保存されたコースを使用できません'};
 // Only the allowlisted course fields are returned. Never update the run record or its distance/time.
 return {ok:true,draft:{...draft,...preset.data},ui:initialCourseUi(preset.data)};
}
const persist=(storage,saved,records)=>{
 try{
  const text=JSON.stringify({version:1,revision:saved.revision+1,records});
  if(text.length>MAX_BYTES)return {ok:false,reason:'保存できるデータ容量を超えました'};
  storage.setItem(COURSE_PRESET_KEY,text);
  return {ok:true,records,revision:saved.revision+1};
 }catch{return {ok:false,reason:'保存領域に書き込めませんでした。元のコースを確認してください'};}
};
export function saveCoursePreset(storage,draft,ui,id=''){
 const snap=snapshotCourse(draft,ui);if(!snap.ok)return snap;
 const saved=readCoursePresets(storage);if(!saved.ok)return saved;
 const index=id?saved.records.findIndex(r=>r.id===id):-1;
 if(id&&index<0)return {ok:false,reason:'更新対象の保存コースが見つかりません'};
 if(index<0&&saved.records.length>=MAX_PRESETS)return {ok:false,reason:'保存コースは最大50件です'};
 const now=new Date().toISOString(),next={id:index>=0?id:'course-v1-'+crypto.randomUUID(),createdAt:index>=0?saved.records[index].createdAt:now,updatedAt:now,data:snap.data};
 const records=saved.records.slice();if(index>=0)records[index]=next;else records.push(next);
 const done=persist(storage,saved,records);return done.ok?{...done,preset:next}:done;
}
export function deleteCoursePreset(storage,id){
 const saved=readCoursePresets(storage);if(!saved.ok)return saved;
 const target=saved.records.find(r=>r.id===id);
 if(!target)return {ok:false,reason:'削除対象のコースがありません'};
 return persist(storage,saved,saved.records.filter(r=>r.id!==id));
}
