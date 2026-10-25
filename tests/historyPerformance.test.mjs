import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HISTORY_STYLES} from '../ui/historyInlineStyles.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('history mounts exact CSS synchronously, without a deferred shadow-link fetch',()=>{
 assert.equal(HISTORY_STYLES,read('ui/historyExperience.css'));
 const history=read('ui/historyExperience.js');
 assert.match(history,/data-history-inline-styles/);
 assert.doesNotMatch(history,/<link rel=/);
 assert.match(read('sw.js'),/historyInlineStyles\.js/);
});
test('PWA status bar matches dark RunLoad design without shifting regular Safari',()=>{
 const html=read('index.html'),css=read('styles.css');
 assert.match(html,/name="theme-color" content="#061725"/);
 assert.match(html,/name="apple-mobile-web-app-status-bar-style" content="black-translucent"/);
 assert.match(css,/html, body \{ background-color:#061725; \}/);
 assert.match(css,/@media \(display-mode:standalone\)/);
 assert.match(html,/styles\.css\?v=20261025-history-footer-03/);
});
