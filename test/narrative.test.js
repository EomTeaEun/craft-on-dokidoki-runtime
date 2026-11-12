import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {newGame as createCurrentGame,applyChat,canPreserve,validSave,migrateCharacterSave} from '../public/engine.js';
import {NODES,enterNode,advanceNarrative,chooseNarrative,selectPersonal,selectRain,endSceneChat,progressLabel,choiceOptions,skipFirstConversations,skipConversation,startSceneChat} from '../public/narrative-v3.js';
import {chatLimit,chatTurns,CHAT_STAGES} from '../public/stages.js';
import {inputSchema,demoReply,dialogueSystem} from '../src/dialogue.js';
import {HEROES,ENDINGS} from '../public/data.js';

function input(s,text){const p=s.profiles[s.active];return {mode:'demo',hero:s.active,name:s.name,stage:s.chatStage,turn:chatTurns(s),score:p.score,text,messages:p.messages,memory:p.memory,dated:s.routeHero===s.active,routeLocked:!!s.routeHero};}
function converse(s,kind=true){
 const limit=chatLimit(s.chatStage);
 for(let i=chatTurns(s);i<limit;i++){
  const text=kind?`${i===limit-1&&s.chatStage==='roof'?'사랑해. 앞으로도 함께 있고 싶어. ':''}${s.chatStage}에서 네가 원하는 마음을 듣고 기억하고 싶어. 이야기 ${i}.`:`쓸모없어. ${s.chatStage} ${i}`;
  const request=inputSchema.parse(input(s,text));
  assert.equal(applyChat(s,text,demoReply(request)),true);
  assert.equal(validSave(s),true,`${s.nodeId} ${s.chatStage}`);
 }
 assert.equal(s.chatClosed,true);
 const count=chatTurns(s);assert.equal(applyChat(s,'한 번 더',{reply:'네',affinity_delta:2}),false);assert.equal(chatTurns(s),count);
}
function afterFirstChats(kind=true){
 const s=newGame('하늘');
 for(const id of Object.keys(HEROES)){s.phase='chat';s.active=id;s.chatStage='meet';s.chatClosed=false;converse(s,kind);s.done.push(id);}
 s.chatStage=null;s.active=null;enterNode(s,'lunch');return s;
}
function walk(s,route='black',kind=true){
 const visits=[],counts={};
 for(let guard=0;guard<500;guard++){
  assert.equal(validSave(s),true,`${s.phase}: ${s.nodeId}`);
  if(s.sceneBg?.startsWith('/assets/'))assert.ok(existsSync(new URL('../public'+s.sceneBg,import.meta.url)),s.sceneBg);
  if(s.phase==='final')return {s,visits,counts};
  if(s.phase==='story'){visits.push(s.nodeId);assert.equal(advanceNarrative(s),true);}
  else if(s.phase==='choice'){const items=choiceOptions(s);assert.ok(items.length);assert.equal(chooseNarrative(s,kind?0:items.length-1),true);}
  else if(s.phase==='selectPersonal'){
   const id=['red','white','black'].find(id=>!s.personalDone.includes(id));assert.equal(selectPersonal(s,id),true);
  }else if(s.phase==='selectRain'){
   assert.equal(s.personalDone.length,3);assert.equal(selectRain(s,route),true);
   assert.equal(selectRain(s,'white'),false,'route cannot be reselected after leaving selection');
  }else if(s.phase==='chat'){
   counts[`${s.active}:${s.chatStage}`]=chatLimit(s.chatStage);converse(s,kind);assert.equal(endSceneChat(s),true);
  }else assert.fail(`unhandled phase ${s.phase}`);
  // Saved copies continue without incrementing choices or affinity.
  const before=JSON.stringify(s);const restored=migrateCharacterSave(JSON.parse(before));assert.ok(restored);assert.equal(JSON.stringify(restored),before);
 }
 assert.fail('the story did not reach its final decision');
}
for(const id of Object.keys(HEROES))for(const kind of [true,false])test(`${id}: 전체 에피소드·루트 고정·${kind?'해피':'배드'} 조건`,()=>{
 const {s,visits,counts}=walk(afterFirstChats(kind),id,kind);
 assert.equal(s.routeHero,id);assert.equal(s.active,id);
 assert.deepEqual(s.personalDone,['red','white','black']);
 for(const hero of Object.keys(HEROES))assert.equal(counts[`${hero}:personal`],6);
 for(const stage of ['rain','repair','festival'])assert.equal(counts[`${id}:${stage}`],6);
 assert.equal(counts[`${id}:roof`],10);
 assert.equal(canPreserve(s),kind);
 assert.ok(visits.includes('route-conflict'));assert.ok(visits.includes('ordinary-private'));assert.ok(visits.includes('crisis'));
 assert.ok(visits.indexOf('festival-start')<visits.indexOf('crisis'));
 for(const other of Object.keys(HEROES).filter(x=>x!==id))assert.equal(s.profiles[other].stageTurns.rain,undefined);
});
test('개인 이벤트를 모두 마치기 전에는 우산 선택으로 넘어갈 수 없음',()=>{
 const s=afterFirstChats();s.phase='selectRain';assert.equal(selectRain(s,'red'),false);assert.equal(validSave(s),false);
 s.phase='selectPersonal';assert.equal(selectPersonal(s,'red'),true);s.personalDone=['red'];s.phase='selectPersonal';assert.equal(selectPersonal(s,'red'),false);
});
test('서툰 갈등 선택도 실제 화해 대화로 회복할 수 있음',()=>{
 const s=afterFirstChats();s.routeHero='red';s.episodeHero='red';s.personalDone=['red','white','black'];enterNode(s,'repair-choice');chooseNarrative(s,2);while(s.phase==='story')advanceNarrative(s);
 assert.equal(s.flags.repaired,false);converse(s,true);assert.equal(s.flags.repaired,true);
});
test('슬롯 복원은 당시 호감도·선택·초안·턴을 정확하게 유지',()=>{
 const s=afterFirstChats();s.phase='selectPersonal';selectPersonal(s,'black');const saved=JSON.stringify(s);s.profiles.black.score=99;s.chatDraft='나중 입력';
 const restored=migrateCharacterSave(JSON.parse(saved));assert.notEqual(restored.profiles.black.score,99);assert.equal(restored.nodeId,'personal-start');assert.equal(restored.line,0);assert.equal(progressLabel(restored),'둘이 있으면 다른 얼굴');
});
test('기존 초기 진행은 점수와 기억을 보존해 새 에피소드로 이어짐',()=>{
 const old=afterFirstChats();delete old.storyRevision;old.phase='selectDate';const facts=structuredClone(old.profiles);const result=migrateCharacterSave(old);
 assert.equal(result.resumeNode,'lunch');assert.equal(result.storyRevision,3);assert.deepEqual(result.profiles,facts);
});
test('기존 후반 저장은 원래 흐름을 유지',()=>{
 const s=afterFirstChats();delete s.storyRevision;s.phase='final';s.active='white';const restored=migrateCharacterSave(s);assert.equal(restored.storyRevision,3);assert.equal(restored.phase,'final');assert.equal(restored.active,'white');
});
test('모든 새 대화 단계는 API 제한과 장면 지시를 공유',()=>{
 for(const stage of Object.keys(CHAT_STAGES)){
  const s=newGame('하늘');s.phase='chat';s.active='red';s.chatStage=stage;
  const req={...input(s,'조용히 같이 걷고 싶어.'),routeLocked:true};assert.equal(inputSchema.safeParse({...req,turn:chatLimit(stage)}).success,false);
  const prompt=dialogueSystem(req);assert.ok(prompt.includes(CHAT_STAGES[stage].context));assert.ok(prompt.includes(`1/${chatLimit(stage)}`));
 }
 assert.doesNotMatch(HEROES.red.preference,/게임/);assert.doesNotMatch(ENDINGS.red.lines.map(x=>x[1]).join(''),/게임/);
});
test('모든 고정 장면은 존재하는 전환 대상으로 연결',()=>{
 const s=afterFirstChats();s.episodeHero='red';s.routeHero='red';s.flags.seatHero='white';
 for(const id of Object.keys(NODES)){
  const node=NODES[id](s);if(node.next)assert.ok(NODES[node.next]||node.next==='final',`${id} → ${node.next}`);
  for(const o of node.options||[])assert.ok(NODES[o.next],`${id} → ${o.next}`);
 }
});

test('높은 호감도라도 해결되지 않은 갈등과 관계 거절은 해피 조건이 아님',()=>{
 const s=newGame('하늘');s.active='red';s.routeHero='red';s.profiles.red.score=90;s.intent=true;s.flags.repaired=false;
 assert.equal(canPreserve(s),false);s.flags.repaired=true;assert.equal(canPreserve(s),true);s.intent=false;assert.equal(canPreserve(s),false);
 const prompt=dialogueSystem({...input(s,'계속 함께 있고 싶어.'),stage:'roof',routeLocked:true,relationshipReady:false});assert.match(prompt,/아직 관계가 충분히 깊지 않다/);
});
test('새 고정 장면에서도 린카는 자신을 린카로 지칭함',()=>{
 const s=afterFirstChats();s.routeHero='white';s.episodeHero='white';s.flags.seatHero='white';
 const firstPerson=/(?:^|[\s….,!?])(?:나는|내가|나도|내|나를|나랑|나한테|저는|제가|저도|저를)(?=[\s….,!?]|$)/;
 for(const id of Object.keys(NODES))for(const l of NODES[id](s).lines||[])if(l.speaker==='white')assert.doesNotMatch(l.text,firstPerson,`${id}: ${l.text}`);
});

for(const partial of [false,true])test(`첫 대화 스킵: ${partial?'일부 대화 후':'시작 전'} 기억과 점수 보존 및 다음 에피소드 진행`,()=>{
 const s=newGame('하늘');
 if(partial){s.phase='chat';s.active='black';s.chatStage='meet';converse(s,true);s.done.push('black');}
 s.phase='selectMeet';const profiles=structuredClone(s.profiles);
 assert.equal(skipFirstConversations(s),true);assert.equal(s.nodeId,'lunch');assert.equal(s.phase,'story');
 assert.deepEqual(s.profiles,profiles);assert.equal(s.done.length,3);assert.equal(validSave(s),true);
 assert.doesNotMatch(s.script[0].text,/처음 이야기를 나눈/);
 const snapshot=JSON.stringify(s);assert.equal(skipFirstConversations(s),false);assert.equal(JSON.stringify(s),snapshot);
 assert.equal(walk(s,'red',true).s.phase,'final');assert.equal(canPreserve(s),true);
});

for(const partial of [false,true])test(`개인 이벤트 선택 스킵: ${partial?'일부 완료':'전체 미진행'} 및 우산 선택 연결`,()=>{
 const s=afterFirstChats();if(partial){s.personalDone=['black'];s.profiles.black.memory.events.push('이미 함께한 산책');}
 s.phase='selectPersonal';const profiles=structuredClone(s.profiles);
 assert.equal(skipConversation(s),true);assert.equal(s.nodeId,'rain-intro');assert.deepEqual(s.profiles,profiles);
 assert.equal(s.flags.personalSkipped.length,partial?2:3);assert.equal(validSave(s),true);
 while(s.phase==='story')advanceNarrative(s);
 assert.equal(s.phase,'selectRain');assert.equal(selectRain(s,'red'),true);
 assert.ok(migrateCharacterSave(JSON.parse(JSON.stringify(s))));
});
for(const stage of ['personal','rain','repair','festival','roof'])test(`${stage} 자유대화 스킵은 점수·턴·고백·갈등 판정을 만들지 않음`,()=>{
 const s=afterFirstChats();s.routeHero='red';s.episodeHero='red';s.personalDone=['black','white'];
 startSceneChat(s,stage,stage==='roof'?'final':stage==='personal'?'personal-end':stage==='rain'?'rain-after':stage==='repair'?'repair-end':'festival-end');
 // Use an existing scene as return for this transition-focused test.
 if(stage!=='roof'&&stage!=='personal')s.chatReturn='rain-intro';
 const p=structuredClone(s.profiles.red),intent=s.intent,repaired=s.flags.repaired;
 assert.equal(skipConversation(s),true);assert.equal(s.profiles.red.score,p.score);assert.equal(s.profiles.red.roofTurns,p.roofTurns);
 assert.deepEqual(s.profiles.red.stageTurns,p.stageTurns);assert.deepEqual(s.profiles.red.messages,p.messages);
 assert.deepEqual(s.profiles.red.memory.facts,p.memory.facts);assert.equal(s.intent,intent);assert.equal(s.flags.repaired,repaired);
 if(stage!=='personal')assert.deepEqual(s.profiles.red.memory,p.memory);
 assert.equal(validSave(s),true);assert.ok(migrateCharacterSave(JSON.parse(JSON.stringify(s))));
 if(stage==='roof')assert.equal(s.phase,'final');
});
test('첫 1:1 대화 안에서 스킵하면 다음 히로인 선택으로 복귀',()=>{
 const s=newGame('하늘');s.phase='chat';s.active='red';s.chatStage='meet';const profiles=structuredClone(s.profiles);
 assert.equal(skipConversation(s),true);assert.equal(s.phase,'selectMeet');assert.deepEqual(s.done,['red']);assert.deepEqual(s.profiles,profiles);
 assert.equal(validSave(s),true);assert.equal(skipConversation({...s,phase:'story'}),false);
});

// Legacy save fixtures deliberately retain revision 3 rules.
function newGame(...args){const state=createCurrentGame(...args);state.storyRevision=3;return state;}
