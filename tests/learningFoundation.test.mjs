import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 LEARNING_COURSES,READY_LESSON,QUIZ,paceSecondsPerKm,paceLabel,
 splitPractice,evaluateQuiz,mountLearning
} from '../ui/learningExperience.js';

assert.equal(LEARNING_COURSES.length,8);
assert.equal(LEARNING_COURSES.filter(x=>x.ready).length,1);
assert.equal(READY_LESSON.id,'pace-basics');
assert.equal(QUIZ.length,3);
assert.equal(paceSecondsPerKm(6,33*60),330);
assert.equal(paceLabel(paceSecondsPerKm(6,33*60)),'5:30/km');
assert.equal(paceLabel(paceSecondsPerKm(4,24*60)),'6:00/km');
assert.equal(paceSecondsPerKm(0,600),null);
assert.equal(paceSecondsPerKm(4,0),null);
assert.equal(paceSecondsPerKm(NaN,600),null);
assert.equal(paceLabel(null),'—');
assert.deepEqual(splitPractice(5),{first:5,second:7,average:'6:00/km'});
assert.deepEqual(splitPractice(8),{first:8,second:4,average:'6:00/km'});
assert.equal(splitPractice(9),null);
assert.equal(splitPractice(5.5),null);
assert.deepEqual(evaluateQuiz({q1:'1',q2:'1',q3:'0'}).map(r=>r.correct),[true,true,true]);
assert.deepEqual(evaluateQuiz({q1:'0',q2:'2',q3:'1'}).map(r=>r.correct),[false,false,false]);
assert.deepEqual(evaluateQuiz({q1:null,q2:undefined,q3:''}).map(r=>r.correct),[false,false,false]);
const catalogue={innerHTML:''};
mountLearning(catalogue,new URLSearchParams());
assert.match(catalogue.innerHTML,/平均ペースと区間ペースを学ぶ/);
assert.match(catalogue.innerHTML,/準備中/);
assert.equal((catalogue.innerHTML.match(/教材を準備しています/g)||[]).length,7);
const invalid={innerHTML:''};
mountLearning(invalid,new URLSearchParams('lesson=invalid'));
assert.match(invalid.innerHTML,/まだ利用できません/);
assert.doesNotMatch(invalid.innerHTML,/学習の一覧へ戻る.*平均ペースと区間ペースを学ぶ/);
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(app,/learning:"学習"/);
assert.match(app,/mountLearning\(app\.querySelector\("#runload-learning"\)/);
assert.match(app,/href="#\/\$\{path\}"/);
assert.match(shell,/"\.\/ui\/learningExperience\.js"/);
assert.match(shell,/"\.\/ui\/learningExperience\.css"/);
assert.match(index,/ui\/learningExperience\.css/);
assert.match(index,/app\.js\?v=20261107-first-learning-v1/);
assert.doesNotMatch(index,/<script[^>]+src="\.\/ui\/learningExperience\.js/);
console.log('learning foundation: deterministic unit and wiring checks PASS');
