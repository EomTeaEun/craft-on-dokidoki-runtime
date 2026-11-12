import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateText,Output} from 'ai';
import {aiStatus,createGameModel,gameProviderOptions} from '../src/openai.js';
import {replySchema,characterContext} from '../src/dialogue.js';

test('OpenAI 키만 사용하고 상태 응답에 키를 포함하지 않음',()=>{
 assert.equal(aiStatus({AI_GATEWAY_API_KEY:'obsolete-key'}).liveReady,false);
 const status=aiStatus({OPENAI_API_KEY:'not-a-real-key'});
 assert.equal(status.liveReady,true);assert.equal(status.provider,'openai');assert.equal(status.model,'gpt-5.4-mini');assert.doesNotMatch(JSON.stringify(status),/not-a-real-key/);
});
test('OpenAI Responses 요청 및 구조화된 캐릭터 응답을 로컬 모의 응답으로 검증',async()=>{
 const reply={reply:'린카는 교육형이니까 설명은 정확해. …도와주고 싶어서 그런 건 아니고!',emotion:'shy',affinity_delta:1,memory_updates:[],revealed_preference:'',summary:'하늘군과 감정 표현 모듈을 이야기했다.',relationship_intent:'none'};
 let sent;
 const env={OPENAI_API_KEY:'local-test-key'};
 const model=createGameModel({env,fetch:async(url,init)=>{
  assert.equal(String(url),'https://api.openai.com/v1/responses');
  assert.equal(new Headers(init.headers).get('authorization'),'Bearer local-test-key');
  sent=JSON.parse(init.body);
  return new Response(JSON.stringify({id:'resp_test',object:'response',created_at:1,status:'completed',model:'gpt-5.4-mini',output:[{id:'msg_test',type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(reply),annotations:[]}]}],usage:{input_tokens:10,output_tokens:20,total_tokens:30,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}}}),{status:200,headers:{'Content-Type':'application/json'}});
 }});
 const result=await generateText({model,providerOptions:gameProviderOptions(env),system:characterContext({hero:'white',score:65,name:'하늘'}),prompt:'감정 표현 모듈이 뭐야?',output:Output.object({schema:replySchema})});
 assert.deepEqual(result.output,reply);assert.equal(sent.model,'gpt-5.4-mini');assert.equal(sent.store,false);assert.equal(sent.text.format.type,'json_schema');assert.equal(sent.reasoning.effort,'none');
});
