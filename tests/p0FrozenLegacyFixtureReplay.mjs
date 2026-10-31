/**
 * P0 C-07: non-destructive audit against a generated backup exported
 * from the archived pre-v2 implementation itself (not a fabricated inline
 * JSON). It is still a *synthetic historic fixture*, NOT actual user data.
 *
 * Run: node tests/p0FrozenLegacyFixtureReplay.mjs <path-to-old-fixture.json>
 * GitHub CI pins the historical repo to its 2026-10-30 audit SHA.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inspectHistoricModelBackup} from '../ui/historicModelReadOnlyAudit.js';
const filename=process.argv[2];
assert.ok(filename,'need a pinned archived fixture path');
const sourceBytes=await readFile(filename);
const sha=buffer=>createHash('sha256').update(buffer).digest('hex');
const originalDigest=sha(sourceBytes);
const text=sourceBytes.toString('utf8');
const original=JSON.parse(text);
const snapshot=original.snapshot;
assert.equal(snapshot.formatVersion,'runner-load-app-new-backup-v2');
const rows=snapshot.data['runner-load-app-new-v1-model-results-regional-v2'];
assert.equal(rows.length,1);
assert.equal(rows[0].model_version,'runload-primary-regional-reference100-v3.0');
assert.ok(Array.isArray(snapshot.data['runner-load-app-new-v1-records-v1']));
assert.ok(Array.isArray(snapshot.data['runner-load-app-new-v1-second-pillar-rof-j-v1']));
const old=inspectHistoricModelBackup(text);
assert.equal(old.ok,true,old.reason);
assert.equal(old.readOnly,true);
assert.equal(old.conversionAllowed,false);
assert.equal(old.recordCount,1);
assert.equal(old.assessmentTimes,'NOT_VERIFIED');
assert.deepEqual(old.modelVersions,['runload-primary-regional-reference100-v3.0']);
assert.ok(!Object.hasOwn(old,'result'),'historic scientific values must not be exported as modern numeric results');
const altered=JSON.parse(text);
altered.snapshot.data['runner-load-app-new-v1-model-results-regional-v2'][0].model_version='unrecognized-new-version';
const rejected=inspectHistoricModelBackup(JSON.stringify(altered));
assert.equal(rejected.ok,false,'unknown old scientific model is rejected');
assert.equal(rejected.conversionAllowed,false);
const reread=await readFile(filename);
assert.equal(sha(reread),originalDigest,'legacy file bytes must be unchanged after all inspection');
assert.deepEqual(reread,sourceBytes,'byte-by-byte equality, not only semantic comparison');
console.log(JSON.stringify({gate:'P0-old-generated-v3-fixture-readonly',result:'PASS',input_sha256:originalDigest,rows:old.recordCount,model_version:old.modelVersions[0],conversionAllowed:false,source:'archived runload-app fixture, synthetic, not any user archive'}));
