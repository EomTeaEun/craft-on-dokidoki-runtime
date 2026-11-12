import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,applyChat,migrateCharacterSave,validSave} from '../public/engine.js';
import {startSceneChat} from '../public/narrative.js';
import {chatLimit} from '../public/stages.js';
import {MAX_CHAT_MESSAGES,CHAT_REQUEST_MAX_BYTES} from '../public/chat-memory.js';
import {inputSchema,dialogueMessages,dialogueSystem,demoReply} from '../src/dialogue.js';

test('all 64 exchanges survive scene changes and save/load, isolated by heroine',t=>{
 const s=newGame('하늘');s.routeHero='black';let count=0;
 for(const hero of ['black','white','red']){
  s.active=s.episodeHero=hero;
  for(const stage of hero==='black'?['meet','personal','rain','festival','roof']:['meet','personal']){
   startSceneChat(s,stage,'test-return');
   for(let turn=0;turn<chatLimit(stage);turn++){
    const marker=`${hero}/${stage}/${turn}`,text=marker+'가'.repeat(500-marker.length),reply='나'.repeat(1000);
    assert.equal(applyChat(s,text,{reply,emotion:'happy',affinity_delta:0}),true);count++;
   }
  }
 }
 assert.equal(count,64);assert.ok(validSave(s));
 const copy=migrateCharacterSave(JSON.parse(JSON.stringify(s)));assert.ok(copy);
 for(const hero of ['black','white','red']){
  const msgs=copy.profiles[hero].messages;assert.ok(msgs.length<=MAX_CHAT_MESSAGES);
  assert.ok(msgs.some(m=>m.content.startsWith(`${hero}/meet/0`)));
  assert.equal(msgs.filter(m=>m.role==='user').length,hero==='black'?36:14);
  for(const other of ['black','white','red'].filter(id=>id!==hero))assert.ok(!msgs.some(m=>m.content.startsWith(other+'/')));
 }
 assert.ok(copy.history.some(l=>l.text.startsWith('black/meet/0')));
 const bytes=Buffer.byteLength(JSON.stringify(copy));assert.ok(bytes<1024*1024);t.diagnostic(`64 exchanges at the message length limits: ${bytes} bytes per save, before authored story text.`);
});

test('long local transcript fits the bounded request, with explicit parenthesized actions',()=>{
 const messages=Array.from({length:80},(_,n)=>({role:n%2?'assistant':'user',content:'가'.repeat(n%2?1000:500)}));
 const input={storyRevision:4,mode:'demo',hero:'black',name:'하늘',stage:'roof',turn:9,score:70,text:'기억하니?',messages,memory:{facts:[],events:[],preferences:[],summary:''},dated:true,routeLocked:true,relationshipReady:true};
 assert.ok(inputSchema.safeParse(input).success);const bytes=Buffer.byteLength(JSON.stringify(input));assert.ok(bytes>65536);assert.ok(bytes<CHAT_REQUEST_MAX_BYTES);
 const sent=dialogueMessages(input);assert.equal(sent.length,21);assert.deepEqual(sent.slice(0,-1),messages.slice(-20));assert.equal(sent.at(-1).content,'기억하니?');
 const system=dialogueSystem(input);assert.match(system,/소괄호/);assert.match(system,/사용자의 행동·감정·동의/);
 for(const hero of ['black','white','red'])assert.match(demoReply({...input,hero,stage:'meet',turn:0,text:'안녕'}).reply,/\([^()]+\)/u);
});
