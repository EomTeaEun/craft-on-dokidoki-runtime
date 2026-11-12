import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createPostgresLogStore} from '../src/postgres-log-store.js';

test('cloud records survive instances, isolate players and deduplicate concurrent requests', {skip:process.env.RUN_POSTGRES_TESTS!=='1'}, async()=>{
 const password=randomUUID();
 const a=await createPostgresLogStore({password}),b=await createPostgresLogStore({password});
 const player=await a.createPlayer(),other=await a.createPlayer();
 let session;
 try{
  await a.consent(player.id,true);
  assert.equal((await b.player(player.secret)).consent,1);
  const input={name:'제출판 QA',hero:'red',stage:'meet',turn:0,mode:'demo',text:'자동 검증용 가상 대화'};
  const meta={runId:randomUUID(),messageId:randomUUID(),storyRevision:4,episode:1,nodeId:'qa'};
  const attempts=await Promise.allSettled([a.begin(player,input,meta),b.begin(player,input,meta)]);
  assert.equal(attempts.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(attempts.find(r=>r.status==='rejected').reason.status,409);
  const row=attempts.find(r=>r.status==='fulfilled').value;
  await a.fail(row.id,'검증용 실패');
  assert.equal((await b.begin(player,input,meta)).status,'new');
  await b.complete(row.id,{reply:'검증용 답변'});
  const saved=await a.begin(player,input,meta);
  assert.equal(saved.status,'succeeded');
  assert.equal(JSON.parse(saved.response).reply,'검증용 답변');
  await assert.rejects(()=>b.begin(player,{...input,text:'다른 내용'},meta),e=>e.status===409);
  assert.equal((await b.list({player:other.id})).total,0);
  const list=await b.list({player:player.id,q:'제출판',run:meta.runId});
  assert.equal(list.total,1);assert.equal(list.runs.length,1);assert.equal(list.rows[0].attempts,2);
  assert.equal(await a.login('wrong-password'),null);
  session=await a.login(password);assert.ok(session.secret);
  assert.equal((await b.admin(session.secret)).csrf,session.csrf);
  await b.logout(session.secret);assert.equal(await a.admin(session.secret),undefined);
 }finally{
  if(session)await a.logout(session.secret);
  await a.removePlayer(player.id);await a.removePlayer(other.id);
  assert.equal(await b.player(player.secret),undefined);
  a.close();b.close();
 }
});
