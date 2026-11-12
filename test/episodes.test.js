import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {newGame,validSave,migrateCharacterSave,canPreserve,applyChat} from '../public/engine.js';
import {enterNode,advanceNarrative,advanceEpisode,choiceOptions,chooseNarrative,selectPersonal,selectRain,skipConversation,endSceneChat} from '../public/narrative.js';
import {NODES,EPISODES} from '../public/episodes.js';
import {chatLimit} from '../public/stages.js';
import {MOMENTS} from '../public/moments.js';
function play({route='black',index=0,chat=false,overrides={},skipOutings=false}={}){
 const s=newGame('테스터');enterNode(s,'episode-1');let units=0,calls=0;const visits=[],scores=[];
 for(let guard=0;guard<2500;guard++){
  assert.ok(validSave(s),`${s.nodeId}/${s.phase}`);assert.deepEqual(migrateCharacterSave(structuredClone(s)),s);
  if(s.phase==='final')return {s,visits,units,calls,scores};
  if(s.sceneBg)assert.ok(existsSync(new URL('../public'+s.sceneBg,import.meta.url)),s.sceneBg);
  if(s.phase==='episode'){visits.push(`episode-${s.episode}`);advanceEpisode(s);}
  else if(s.phase==='story'){units++;visits.push(s.nodeId);advanceNarrative(s);}
  else if(s.phase==='choice'){const option=overrides[s.nodeId]??index;assert.equal(choiceOptions(s).length,3);chooseNarrative(s,option);}
  else if(s.phase==='selectMeet'){
   if(!chat)skipConversation(s);else{
    for(const id of ['black','white','red']){s.phase='chat';s.active=id;s.chatStage='meet';s.chatClosed=false;for(let turn=0;turn<8;turn++){applyChat(s,'테스트 '+turn,{reply:'네',affinity_delta:2});calls++;}s.done.push(id);}enterNode(s,'meeting-end');
   }
  }else if(s.phase==='selectPersonal'){if(skipOutings)skipConversation(s);else selectPersonal(s,['black','white','red'].find(h=>!s.personalDone.includes(h)));}
  else if(s.phase==='selectRain'){assert.equal(s.routeHero,null);assert.equal(s.conflictDone.length,0);assert.equal(s.flags.groupOceanCompleted,true);for(const id of ['red','white','black'])assert.ok(s.viewedMoments.includes(id+'-ocean'));selectRain(s,route);assert.equal(selectRain(s,'red'),false);}
  else if(s.phase==='chat'){assert.notEqual(s.chatStage,'repair');if(!chat)skipConversation(s);else{for(let turn=0;turn<chatLimit(s.chatStage);turn++){applyChat(s,'질문 '+turn,{reply:'네',affinity_delta:2});calls++;}endSceneChat(s);}}
  else assert.fail('unhandled '+s.phase);
  scores.push({...Object.fromEntries(Object.entries(s.profiles).map(([h,p])=>[h,p.score]))});
 }
 assert.fail('story loop');
}
for(const route of ['black','white','red']){
 test(`${route}: all 7 episodes; skip every chat and still earn happy ending`,()=>{const {s,visits,units,calls}=play({route});assert.equal(calls,0);assert.ok(units>450,units);assert.equal(canPreserve(s),true);for(let i=1;i<=7;i++)assert.ok(visits.includes('episode-'+i));assert.equal(s.outfit,'normal');assert.deepEqual(s.viewedMoments.filter(id=>id.endsWith('-ocean')),['red-ocean','white-ocean','black-ocean']);assert.deepEqual(s.conflictDone,[route]);assert.deepEqual(visits.filter(v=>/^episode-/.test(v)),[1,2,3,4,5,6,7].map(n=>'episode-'+n));assert.ok(visits.indexOf('ocean-monologue')<visits.indexOf('rain-arrival'));assert.ok(visits.indexOf('ocean-return')<visits.indexOf('conflict-start'));assert.ok(visits.indexOf('conflict-end')<visits.indexOf('festival-intro'));assert.equal(visits.filter(v=>v==='conflict-start').length,NODES['conflict-start'](s).lines.length);assert.ok(s.profiles[route].score>=60);});
 test(`${route}: all chat caps sum to 64; adverse choices remain bad`,()=>{assert.equal(play({route,chat:true}).calls,64);assert.equal(canPreserve(play({route,index:2}).s),false);});
}
test('explicit intent overrides chat and final relationship rejection blocks preserve',()=>{const {s}=play({overrides:{'roof-intent':2},chat:true});assert.equal(s.relationshipIntent,'decline');assert.equal(canPreserve(s),false);});
test('later concrete repair can recover earlier hurt; generic praise cannot repair',()=>{const {s}=play({chat:true,overrides:{'conflict-public':2,'repair-choice':2}});assert.equal(s.profiles.black.relationship.repairState,'resolved');assert.equal(canPreserve(s),true);const t=newGame('가');t.phase='chat';t.active=t.routeHero='black';t.chatStage='festival';for(let i=0;i<6;i++)applyChat(t,'네 마음 '+i,{reply:'응',affinity_delta:2});assert.equal(t.profiles.black.relationship.repairState,'unresolved');});
test('declining contact does not fabricate festival hand CG or hairpin purchase',()=>{const {s}=play({overrides:{'personal-choice':1,'festival-hand':1}});assert.equal(s.profiles.black.events.hairpinBought,undefined);assert.equal(s.profiles.black.events.handHeld,false);assert.ok(!s.viewedMoments.includes('black-festival'));assert.ok(canPreserve(s));});
test('whole outing skip keeps selected conflict and never invents outing memories',()=>{const {s,visits}=play({skipOutings:true});assert.equal(s.conflictDone.length,1);assert.ok(!visits.includes('personal-start'));assert.ok(!s.viewedMoments.some(id=>id.endsWith('-date')));});
test('CG catalog and sprite assets are complete',()=>{assert.equal(Object.keys(MOMENTS).length,15);for(const m of Object.values(MOMENTS))assert.ok(existsSync(new URL('../public'+m.image.split('?')[0],import.meta.url)));for(const h of ['black','white','red'])assert.ok(existsSync(new URL(`../public/assets/standing-ocean/${h}.png`,import.meta.url)));});
test('every v4 node transition resolves and no new repair chat exists',()=>{const s=newGame('가');s.episodeHero=s.routeHero='black';for(const [id,make] of Object.entries(NODES)){const node=make(s);if(node.next)assert.ok(NODES[node.next]||node.next==='final',`${id} -> ${node.next}`);if(node.type==='chat')assert.notEqual(node.stage,'repair');for(const o of node.options||[])assert.ok(NODES[o.next]);}assert.equal(EPISODES.length,7);});
test('previous-order saves keep scores and continue at the matching episode',()=>{
 const old=newGame('이전저장');delete old.flowRevision;old.phase='episode';old.episode=4;old.nodeId='episode-4';old.episodeNext='rain-intro';old.personalDone=['black','white','red'];old.conflictDone=['black','white','red'];old.profiles.black.score=51;
 const s=migrateCharacterSave(old);assert.equal(s.episode,4);assert.equal(s.nodeId,'episode-4');assert.equal(s.profiles.black.score,51);assert.deepEqual(migrateCharacterSave(s),s);
 advanceEpisode(s);assert.equal(s.nodeId,'rain-intro');
 s.routeHero=s.active='black';enterNode(s,'episode-5');assert.equal(s.nodeId,'episode-6');
});
test('previous-order rain leads to the new group trip and old ocean restarts without duplicate points',()=>{
 const s=newGame('이전저장');s.routeHero=s.episodeHero=s.active='white';enterNode(s,'rain-end');s.flowRevision=2;s.episode=3;s.after='flow:episode-4';
 const migrated=migrateCharacterSave(s);assert.equal(migrated.after,'flow:episode-3');assert.equal(migrated.episode,4);
 const old=newGame('이전바다');old.routeHero=old.episodeHero=old.active='white';enterNode(old,'ocean-return');old.flowRevision=2;old.episode=4;old.choiceHistory=[{node:'ocean-close',index:0}];
 const next=migrateCharacterSave(old);assert.equal(next.resumeNode,'ocean-plan');assert.equal(next.flags.legacyOceanReplay,true);assert.equal(next.routeHero,'white');const before=Object.fromEntries(Object.entries(next.profiles).map(([id,p])=>[id,p.score]));
 enterNode(next,'ocean-close');chooseNarrative(next,0);assert.deepEqual(Object.fromEntries(Object.entries(next.profiles).map(([id,p])=>[id,p.score])),before);
});
test('a previous save inside pre-route conflict finishes safely before selecting rain',()=>{
 const old=newGame('이전저장');old.personalDone=['black','white','red'];old.episodeHero=old.active='red';old.conflictDone=['black','white'];enterNode(old,'conflict-start');delete old.flowRevision;old.episode=3;
 const s=migrateCharacterSave(old);
 for(let i=0;i<600&&s.phase!=='selectRain';i++){
  if(s.phase==='story')advanceNarrative(s);else if(s.phase==='choice')chooseNarrative(s,0);else if(s.phase==='episode')advanceEpisode(s);else assert.fail(s.phase);
 }
 assert.equal(s.phase,'selectRain');assert.deepEqual(s.conflictDone,['black','white','red']);assert.equal(selectRain(s,'red'),true);
});
