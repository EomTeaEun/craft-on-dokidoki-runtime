import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReadback} from '../public/readback.js';
import {newGame} from '../public/engine.js';
import {enterNode,advanceNarrative,chooseNarrative} from '../public/narrative.js';
test('backward and forward reread without skipping the live line',()=>{
 const r=createReadback();for(const key of ['a','b','c'])r.capture(key,{html:key});
 assert.equal(r.back('c'),true);assert.equal(r.current().html,'b');r.back('c');assert.equal(r.current().html,'a');assert.equal(r.back('c'),false);
 r.forward('c');assert.equal(r.current().html,'b');r.forward('c');assert.equal(r.current(),null);assert.equal(r.forward('c'),false);
});
test('choice and episode boundaries return to the last story before resuming',()=>{
 const r=createReadback();r.capture('last',{html:'마지막 대사'});assert.equal(r.back(null),true);assert.equal(r.current().html,'마지막 대사');r.forward(null);assert.equal(r.current(),null);
});
test('repeated render, reset and bounded history behave consistently',()=>{
 const r=createReadback(2);r.capture('a',{html:'a'});r.capture('b',{html:'b'});r.capture('b',{html:'updated'});r.capture('c',{html:'c'});r.back('c');assert.equal(r.current().html,'updated');assert.equal(r.back('c'),false);r.capture('ignored',{html:'ignored'});r.resume();r.back('c');assert.equal(r.current().key,'b');r.reset();assert.equal(r.current(),null);assert.equal(r.canBack(null),false);
});
test('review after scored choice and CG cannot replay score, history or unlock effects',()=>{
 const s=newGame('검증');s.episodeHero=s.routeHero=s.active='black';const r=createReadback();
 enterNode(s,'ocean-play');chooseNarrative(s,0);r.capture('reaction',{html:s.script[0].text});
 for(let n=0;n<40&&s.nodeId!=='ocean-white-moment';n++)advanceNarrative(s);
 assert.equal(s.nodeId,'ocean-white-moment');assert.ok(s.viewedMoments.includes('white-ocean'));r.capture('cg',{html:'CG'});advanceNarrative(s);r.capture('rest',{html:s.script[0].text});
 const before=structuredClone(s);
 for(let i=0;i<10;i++){r.back('rest');r.back('rest');r.forward('rest');r.forward('rest');}
 assert.deepEqual(s,before);
});
