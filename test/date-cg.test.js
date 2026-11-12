import {test} from 'node:test';import assert from 'node:assert/strict';
import {newGame,migrateCharacterSave} from '../public/engine.js';
import {enterNode,advanceNarrative,chooseNarrative,choiceIllustration,skipConversation} from '../public/narrative.js';
function frame(s){return s.script[s.line];}
function cue(s){for(let i=0;i<40&&frame(s).cgMode!=='art';i++)advanceNarrative(s);}
function finish(s){const id=s.nodeId;for(let i=0;i<100&&s.phase==='story'&&s.nodeId===id;i++)advanceNarrative(s);}
test('Shiori pin cue -> CG conversation and purchase choice -> regular UI at store exit',()=>{
 const s=newGame('확인');s.episodeHero=s.active='black';enterNode(s,'personal-start');assert.equal(s.viewedMoments.length,0);cue(s);
 assert.equal(frame(s).text,'시오리의 눈길이 작은 흰 머리핀에 머물렀다.');assert.equal(frame(s).moment,'black-date');advanceNarrative(s);assert.equal(frame(s).cgMode,'dialogue');finish(s);
 assert.equal(s.nodeId,'personal-choice');assert.equal(choiceIllustration(s),'black-date');chooseNarrative(s,0);assert.equal(frame(s).moment,'black-date');assert.equal(frame(s).cgMode,'dialogue');assert.equal(s.profiles.black.events.hairpinBought,true);finish(s);
 assert.equal(s.nodeId,'personal-middle');assert.match(frame(s).text,/가게를 나왔을 때/);assert.equal(frame(s).moment,undefined);assert.equal(s.viewedMoments.filter(x=>x==='black-date').length,1);
});
for(const [hero,text] of [['white','옷소매가 아주 조금 당겨졌다. 린카의 손이었다.'],['red','…이제는 조금 저를 봐도 괜찮을 것 같아요.']]){
 test(`${hero} exact cue -> art -> 3 CG lines -> normal free chat, farewell after chat`,()=>{
  const s=newGame('확인');s.episodeHero=s.active=hero;enterNode(s,'personal-middle');cue(s);assert.equal(frame(s).text,text);assert.equal(frame(s).moment,hero+'-date');
  for(let n=0;n<3;n++){advanceNarrative(s);assert.equal(frame(s).cgMode,'dialogue');assert.deepEqual(migrateCharacterSave(s),s);}
  advanceNarrative(s);assert.equal(s.phase,'chat');assert.equal(s.chatStage,'personal');assert.equal(s.active,hero);assert.deepEqual(s.cast,[hero]);assert.equal(s.chatReturn,'personal-promise');skipConversation(s);assert.equal(s.nodeId,'personal-promise');chooseNarrative(s,0);finish(s);assert.equal(s.nodeId,'personal-end');assert.equal(s.phase,'story');
 });
}
test('old date script gains its cue and old completed farewell is never scored twice',()=>{
 const s=newGame('확인');s.episodeHero=s.active='white';s.personalDone=['black'];enterNode(s,'personal-middle');s.script=s.script.map(({moment,cgMode,...l})=>l);
 s.line=0;const old=migrateCharacterSave(s);assert.ok(old.script.some(l=>l.cgMode==='art'&&l.moment==='white-date'));
 s.choiceHistory=[{node:'personal-promise',index:0},{node:'personal-promise',index:1}];enterNode(s,'chat-personal');assert.equal(s.chatReturn,'personal-end');
});
