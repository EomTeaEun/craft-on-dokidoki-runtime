import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {newGame as createCurrentGame,validSave,migrateCharacterSave} from '../public/engine.js';
import {enterNode,advanceNarrative,skipConversation,chooseNarrative} from '../public/narrative.js';
import {MOMENTS,mergeMomentUnlocks,rememberMoment} from '../public/moments.js';
function fixture(hero){const s=newGame('하늘');s.active=hero;s.routeHero=hero;s.episodeHero=hero;s.personalDone=[];s.flags.handHeld=true;s.lastChoiceDelta=4;return s;}
function reachImage(s){for(let i=0;i<20;i++){if(s.script[s.line]?.moment)return s.script[s.line].moment;assert.equal(advanceNarrative(s),true);}assert.fail('special image was not reached');}
for(const hero of ['black','white','red'])for(const [node,suffix] of [['personal-start','date'],['rain-arrival','rain'],['festival-reply','festival']])test(`${hero} ${suffix}: only actually displayed images unlock and survive save/load`,()=>{
 const s=fixture(hero);enterNode(s,node);
 if(node!=='festival-reply')assert.deepEqual(s.viewedMoments,[],'future image is still locked');
 const id=reachImage(s);assert.equal(id,`${hero}-${suffix}`);assert.deepEqual(s.viewedMoments,[id]);
 const copy=migrateCharacterSave(JSON.parse(JSON.stringify(s)));assert.ok(copy);assert.equal(copy.script[copy.line].moment,id);
 assert.equal(rememberMoment(s,id),false);assert.deepEqual(s.viewedMoments,[id]);
 advanceNarrative(s);assert.equal(s.script[s.line].moment,undefined,'regular dialogue resumes');assert.equal(validSave(s),true);
});
for(const hero of ['black','white','red'])for(const choice of [1,2])test(`${hero}: hand-holding CG remains locked for alternative choice ${choice}`,()=>{
 const s=fixture(hero);s.flags.handHeld=false;enterNode(s,'festival-hand');chooseNarrative(s,choice);
 assert.ok(s.script.every(l=>!l.moment));assert.deepEqual(s.viewedMoments,[]);
});
test('skipping personal episodes does not unlock their CGs or fabricate outing memories',()=>{
 const s=fixture('red');s.phase='selectPersonal';assert.equal(skipConversation(s),true);assert.deepEqual(s.viewedMoments,[]);
 for(const p of Object.values(s.profiles))assert.deepEqual(p.memory.events,[]);
});
test('gallery merge keeps discoveries across saves and rejects unknown or duplicate IDs',()=>{
 assert.deepEqual(mergeMomentUnlocks(['black-date'],['white-rain','black-date'],['red-festival','bad-id'],null),['black-date','white-rain','red-festival']);
 const s=fixture('red');enterNode(s,'personal-start');delete s.viewedMoments;assert.deepEqual(migrateCharacterSave(s).viewedMoments,[]);
 assert.equal(rememberMoment(s,'bad-id'),false);s.viewedMoments=['bad-id'];assert.equal(validSave(s),false);
});
test('all fifteen special CG assets exist and are unique',()=>{
 assert.equal(Object.keys(MOMENTS).length,15);assert.equal(new Set(Object.values(MOMENTS).map(m=>m.image)).size,15);
 for(const m of Object.values(MOMENTS))assert.ok(existsSync(new URL('../public'+m.image,import.meta.url)),m.image);
});

// Legacy save fixtures deliberately retain revision 3 rules.
function newGame(...args){const state=createCurrentGame(...args);state.storyRevision=3;return state;}
