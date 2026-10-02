import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,score,ranked,expire,finish,csv,normalize} from './js/model.js';
test('weighted scoring and normalized text',()=>{const e=seed().exams[0];assert.equal(score(e.questions,{[e.questions[0].id]:'1',[e.questions[1].id]:'  АЛГОРИТМ  '}),4);assert.equal(normalize(' А  Б '),'а б');});
test('partial matching',()=>{const e=seed().exams[0],q=e.questions[2];assert.equal(score([q],{[q.id]:{[q.pairs[0].id]:q.pairs[0].id}}),1);});
test('deadline and idempotent finish',()=>{const a=seed().attempts[0];a.finishedAt=null;a.startedAt=100;a.deadline=200;assert.equal(expire(a,199),false);assert.equal(expire(a,250),true);assert.equal(a.finishedAt,200);const before=a.score;a.answers={};finish(a,300);assert.equal(a.score,before);});
test('ties use competition ranking',()=>{const db=seed();assert.deepEqual(ranked(db.attempts).map(x=>x.rank),[1,2,2]);});
test('CSV escapes formulas',()=>{const db=seed();db.attempts[0].name='=1+1';assert.ok(csv(ranked(db.attempts),db).includes("'=1+1"));});
