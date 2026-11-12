import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,migrateCharacterSave,validSave} from '../public/engine.js';
import {OPENING} from '../public/data.js';
import {enterNode,advanceNarrative} from '../public/narrative.js';

for(const pastOpening of [false,true])test(`old opening save ${pastOpening?'inside the removed extension':'inside the retained opening'} keeps progress and affection`,()=>{
 const s=newGame('보존');enterNode(s,'opening');s.profiles.black.score=41;s.history.push({speaker:'나',text:'이미 읽은 기록'});
 s.script.push({speaker:'교수',text:'오늘 할 일은 대단한 실험이 아니에요. 먼저 서로 이름부터 익혀 보세요.'});s.line=pastOpening?OPENING.length:2;
 const copy=migrateCharacterSave(s);assert.ok(validSave(copy));assert.equal(copy.profiles.black.score,41);assert.deepEqual(copy.history,s.history);
 assert.deepEqual(migrateCharacterSave(copy),copy);
 if(pastOpening){assert.equal(copy.resumeNode,'first-day-choice');const node=copy.resumeNode;delete copy.resumeNode;enterNode(copy,node);assert.equal(copy.phase,'choice');}
 else {assert.equal(copy.line,2);assert.equal(copy.resumeNode,undefined);assert.equal(copy.sceneBg,OPENING[2].bg);}
});
test('the current opening reaches the first choice without a second professor entrance',()=>{
 const s=newGame('확인');enterNode(s,'opening');
 const leave=s.script.findIndex(l=>l.text.includes('연구실을 떠났다'));assert.ok(leave>=0);
 assert.ok(s.script.slice(leave+1).every(l=>!l.speaker?.startsWith('교수')));
 for(let n=0;n<100&&s.phase==='story';n++)advanceNarrative(s);
 assert.equal(s.phase,'choice');assert.equal(s.nodeId,'first-day-choice');assert.ok(validSave(s));
});
