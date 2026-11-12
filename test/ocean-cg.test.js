import {test} from 'node:test';import assert from 'node:assert/strict';
import {newGame,validSave,migrateCharacterSave} from '../public/engine.js';
import {enterNode,advanceNarrative,chooseNarrative,choiceIllustration} from '../public/narrative.js';
function current(s){return s.script[s.line];}
function finishNode(s){const start=s.nodeId;for(let n=0;n<100&&s.phase==='story'&&s.nodeId===start;n++)advanceNarrative(s);}
test('Nemu CG opens exactly after turning, then 3 CG dialogue lines before normal conversation',()=>{
 const s=newGame('확인');enterNode(s,'ocean-change');assert.match(s.script.at(-1).text,/고개를 돌렸다/);finishNode(s);
 assert.equal(s.nodeId,'ocean-red-moment');assert.equal(current(s).cgMode,'art');assert.equal(current(s).moment,'red-ocean');assert.equal(current(s).text,'…여기요.');
 for(let i=0;i<3;i++){advanceNarrative(s);assert.equal(current(s).cgMode,'dialogue');assert.equal(current(s).moment,'red-ocean');assert.ok(validSave(s));assert.deepEqual(migrateCharacterSave(s),s);}
 advanceNarrative(s);assert.equal(s.nodeId,'ocean-red-reveal');assert.equal(current(s).moment,undefined);assert.ok(s.viewedMoments.includes('red-ocean'));
});
for(const [node,moment,choice,normal] of [['ocean-white-moment','white-ocean','ocean-close','ocean-close~0'],['ocean-moment','black-ocean','ocean-black-choice','ocean-black-choice~0']]){
 test(`${moment}: art only -> 3 dialogue lines -> CG choice -> normal reaction; score once`,()=>{
  const s=newGame('확인');enterNode(s,node);assert.equal(current(s).cgMode,'art');
  for(let i=0;i<3;i++){advanceNarrative(s);assert.equal(current(s).cgMode,'dialogue');assert.equal(current(s).moment,moment);}
  advanceNarrative(s);assert.equal(s.phase,'choice');assert.equal(s.nodeId,choice);assert.equal(choiceIllustration(s),moment);const before=Object.fromEntries(Object.entries(s.profiles).map(([id,p])=>[id,p.score]));
  assert.equal(chooseNarrative(s,0),true);assert.equal(s.nodeId,normal);assert.equal(current(s).moment,undefined);assert.equal(choiceIllustration(s),null);assert.equal(chooseNarrative(s,0),false);
  const hero=moment.split('-')[0];assert.equal(s.profiles[hero].score,before[hero]+3);assert.equal(s.viewedMoments.filter(m=>m===moment).length,1);
 });
}
test('Shiori CG starts immediately after the protagonist offers to clean up together',()=>{
 const s=newGame('확인');enterNode(s,'ocean-black-alone');assert.equal(s.script.at(-1).text,'알겠어. 그래서 같이 치우고 있잖아.');finishNode(s);
 assert.equal(s.nodeId,'ocean-moment');assert.equal(current(s).cgMode,'art');advanceNarrative(s);assert.match(current(s).text,/어깨를 가볍게 떨며 웃었다/);
});
test('previous bare-CG saves gain dialogue and retain scores and unlocks',()=>{
 const s=newGame('확인');enterNode(s,'ocean-white-moment');s.script=[{speaker:'',text:'먼저 달려간 여름.',moment:'white-ocean'}];s.line=0;
 const next=migrateCharacterSave(s);assert.equal(next.script.length,4);assert.equal(next.script[0].cgMode,'art');assert.equal(next.profiles.white.score,s.profiles.white.score);assert.deepEqual(next.viewedMoments,s.viewedMoments);
});
