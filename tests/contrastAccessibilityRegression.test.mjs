import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const lum=hex=>{const n=hex.replace('#','');const channels=[0,2,4].map(i=>parseInt(n.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]};
const contrast=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
const cases=[
 ['primary white text / first gradient stop','#ffffff','#1c69ce'],
 ['primary white text / second gradient stop','#ffffff','#145cb7'],
 ['primary hover white text / first gradient stop','#ffffff','#2268c4'],
 ['primary hover white text / second gradient stop','#ffffff','#1a5db4'],
 ['active segment text','#ffffff','#226acb'],
 ['soft action text','#1e61ad','#e6f1ff'],
 ['eyebrow on white card assumption','#226aaf','#ffffff'],
 ['warning badge text','#8b5714','#fff3dd']
];
test('scoped light-theme text color candidates exceed WCAG 2.2 normal-text 4.5:1 arithmetic threshold',()=>{
 for(const [label,fg,bg] of cases)assert.ok(contrast(fg,bg)>=4.5,label+': '+contrast(fg,bg));
});
test('six targeted declarations survive source refactoring and retain shadow and layout',()=>{
 const exact=[
 '.btn.primary{background:linear-gradient(105deg,#1c69ce,#145cb7);border-color:#145cb7;color:#fff;',
 '.btn.primary:hover{background:linear-gradient(105deg,#2268c4,#1a5db4)}',
 '.btn.soft{color:#1e61ad;background:#e6f1ff}',
 '.segmented button.is-active{background:#226acb;color:#fff}',
 '.eyebrow{color:#226aaf}',
 '.badge.warn{background:#fff3dd;color:#8b5714}'
 ];
 for(const x of exact)assert.ok(css.includes(x),'missing altered declaration: '+x);
 assert.match(css,/\.btn\.primary\{[^}]*box-shadow:0 4px 11px #246ddc22/);
 assert.match(css,/@media\(max-width:800px\)/);
});
test('out-of-scope claims are not inferred from static declarations',()=>{
 assert.ok(cases.some(x=>x[0].includes('assumption')),'eyebrow background is an assumption, not measured CSS cascade');
 assert.ok(css.includes('.app-shell:has(#runload-result-v4)'),'existing dark result shell stays in place');
});