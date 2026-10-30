import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectHistoricModelBackup} from '../ui/historicModelReadOnlyAudit.js';
const key='runner-load-app-new-v1-model-results-regional-v2';
const model=v=>({id:'legacy-'+v,model_version:'runload-primary-regional-reference100-v'+v,
 output_semantic_version:'reference100-output-v'+v,result:{regions:[{value:99999}]}});
const backup=rows=>JSON.stringify({snapshot:{formatVersion:'runner-load-app-new-backup-v2',
 data:{[key]:rows}}});
test('stage 8 historic v3.0/v3.1 read only audit refuses migration and never changes original bytes',()=>{
 const raw=backup([model('3.0'),model('3.1')]),original=raw;
 const found=inspectHistoricModelBackup(raw);
 assert.equal(found.ok,true,found.reason);
 assert.deepEqual(found.modelVersions,['runload-primary-regional-reference100-v3.0','runload-primary-regional-reference100-v3.1']);
 assert.equal(found.conversionAllowed,false);
 assert.equal(found.readOnly,true);
 assert.equal(found.assessmentTimes,'NOT_VERIFIED');
 assert.equal(raw,original);
 assert.ok(!Object.hasOwn(found,'result'),'old numeric results must not be reissued as V2 references');
});
test('stage 8 old backup rejects unknown version, duplicates and malformed JSON without trying to repair it',()=>{
 const inputs=[backup([model('4.0')]),backup([model('3.0'),model('3.0')]),'{broken',backup([{}]),JSON.stringify({formatVersion:'other',data:{[key]:[]}})];
 for(const input of inputs){const copy=input,result=inspectHistoricModelBackup(input);
  assert.equal(result.ok,false);assert.equal(result.conversionAllowed,false);
  assert.equal(input,copy);
 }
});
