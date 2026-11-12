import {test} from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {newGame} from '../public/engine.js';import {NODES} from '../public/episodes.js';
import {enterNode,advanceNarrative,chooseNarrative} from '../public/narrative.js';import {HEROES,sprite} from '../public/data.js';
import {storyExpressions} from '../public/story-expressions.js';
test('a character keeps their expression through protagonist, narration and another heroine speaking',()=>{
 const s={phase:'story',line:3,script:[{speaker:'black',text:'잠깐…',emotion:'shy'},{speaker:'나',text:'응.'},{speaker:'',text:'잠시 바람이 불었다.'},{speaker:'white',text:'…' ,emotion:'jealous'}]};
 const before=structuredClone(s),m=storyExpressions(s);assert.equal(m.black,'shy');assert.equal(m.white,'jealous');assert.deepEqual(s,before);
 s.script.push({speaker:'black',text:'다시',emotion:'neutral'});s.line++;assert.equal(storyExpressions(s).black,'neutral');
});
test('the joke at lunch produces distinct reactions and narration keeps Nemu smiling',()=>{
 const s=newGame('확인');enterNode(s,'restaurant');while(s.line<s.script.length-1)advanceNarrative(s);
 assert.deepEqual(storyExpressions(s),{black:'happy',white:'jealous',red:'happy'});
});
test('Rinka hurt is visible before her next line; concrete repair softens the reaction',()=>{
 const s=newGame('확인');s.routeHero=s.episodeHero=s.active='white';enterNode(s,'conflict-start');
 while(!s.script[s.line].text.startsWith('린카의 표정이 굳었다'))advanceNarrative(s);assert.equal(storyExpressions(s).white,'sad');
 advanceNarrative(s);assert.equal(storyExpressions(s).white,'sad');enterNode(s,'repair-choice');chooseNarrative(s,0);assert.notEqual(storyExpressions(s).white,'sad');
});
test('authored dialogue on all routes only references existing expression assets',()=>{
 const known=new Set();for(const id of ['black','white','red'])for(const resolved of [false,true]){
  const s=newGame('확인');s.routeHero=s.episodeHero=id;
  for(const p of Object.values(s.profiles)){p.events={hairpinBought:resolved,protected:resolved,handHeld:resolved,festivalPromise:resolved};p.relationship.repairState=resolved?'resolved':'unresolved';}
  for(const [nodeId,make] of Object.entries(NODES)){const n=make(s);if(!n.lines)continue;s.nodeId=nodeId;s.phase='story';s.script=n.lines;
   for(let i=0;i<n.lines.length;i++){s.line=i;for(const [hero,emotion] of Object.entries(storyExpressions(s))){assert.ok(HEROES[hero].files[emotion]);known.add(sprite(hero,emotion));}}
  }
 }
 for(const url of known)assert.ok(existsSync(new URL('../public'+url,import.meta.url)),url);assert.ok(known.size>=16,known.size);
});
test('unannotated old saves use the same cues, while AI chat expression stays separate',()=>{
 const old={phase:'story',line:0,script:[{speaker:'red',text:'…머리색만요?'}]};assert.equal(storyExpressions(old).red,'surprise');old.phase='chat';assert.equal(storyExpressions(old).red,'neutral');
});
