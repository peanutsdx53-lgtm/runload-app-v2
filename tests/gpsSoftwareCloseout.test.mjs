import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('GPS scope closing record has every workstage and explicit real-device deferral',()=>{
 const content=read('docs/GPS_SOFTWARE_CLOSEOUT_20261027.md');
 for(const id of ['P-00','W-01','W-02','W-03','W-04','W-05','W-06','W-07','W-08'])assert.ok(content.includes(id));
 assert.match(content,/実走検証の保留/);
 assert.match(content,/専用ドメイン/);
 assert.match(content,/未保存測定/);
 assert.match(content,/CIがPASS/);
});
