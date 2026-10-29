import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const lock=readFileSync(new URL('../ui/manualRunLock.js',import.meta.url),'utf8');
test('manual run, correction, export, restore and deletion all use one exclusion lock',()=>{
 for(const snippet of [
  'withManualRunWriteLock(()=>manualRunStore.saveManualRun',
  'withManualRunWriteLock(()=>dataManagement.exportPortableBackup',
  'withManualRunWriteLock(()=>dataManagement.restorePortableBackup',
  'withManualRunWriteLock(()=>dataManagement.removeAllPortableData',
  'manualRunStore.classifySavedManualRun(onboardStorage,record.id,gait)'
 ])assert.ok(app.includes(snippet),'missing serialized operation: '+snippet);
 assert.match(app,/onAssignGait:async gait=>/);
 assert.match(lock,/mode:'exclusive'/);
 assert.match(lock,/保存を停止しました/);
});
test('note write and delete use the same lock; failure is not accepted as deletion success',()=>{
 assert.match(app,/withManualRunWriteLock\(\(\)=>explorationExperience\.saveNote/);
 assert.match(app,/withManualRunWriteLock\(\(\)=>explorationExperience\.deleteNote/);
 assert.match(app,/const success=deleteResult===true/);
 assert.doesNotMatch(app,/const success=await manualRunLock\.withManualRunWriteLock/);
});
