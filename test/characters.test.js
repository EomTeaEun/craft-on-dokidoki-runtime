import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HEROES,OPENING,GREETINGS,ROOF_GREETINGS,ENDINGS,conversationClosing,sprite,formatLine} from '../public/data.js';
import {characterContext,demoReply} from '../src/dialogue.js';
import {newGame as createCurrentGame,migrateCharacterSave} from '../public/engine.js';
const request=(hero,score,text,extra={})=>({mode:'demo',hero,name:'하늘',stage:'meet',turn:0,score,text,messages:[],memory:{facts:[],events:[],preferences:[],summary:''},dated:false,...extra});
const firstPerson=/(?:^|[\s….,!?])(?:나는|내가|나도|내|나를|나랑|나한테|저는|제가|저도|저를)(?=[\s….,!?]|$)/;

test('지정 이름과 기체 코드가 자산과 엔딩에 일관되게 연결됨',()=>{
 assert.deepEqual(Object.values(HEROES).map(h=>[h.fullName,h.japaneseName,h.code]),[['미나세 시오리','水無瀬 栞','SHI-01'],['아마미야 린카','天宮 凛花','RIN-03'],['쿠로사키 네무','黒崎 ねむ','NEM-02']]);
 for(const [id,h]of Object.entries(HEROES)){assert.ok(ENDINGS[id].tag.startsWith(h.code));assert.ok(characterContext(request(id,30,'안녕')).includes(h.role));assert.ok(GREETINGS[id].includes(h.code));assert.match(sprite(id),/^\/assets\/standing\/(흑발|백발|적발)\//);}
});
test('린카의 고정 대사와 체험 대화가 3인칭을 사용함',()=>{
 const fixed=OPENING.filter(l=>l.speaker==='white').map(l=>l.text);
 fixed.push(GREETINGS.white,ROOF_GREETINGS.white,...ENDINGS.white.lines.filter(([s])=>s==='white').map(([,t])=>t));
 for(const stage of ['meet','roof'])for(const success of [true,false])fixed.push(conversationClosing('white',stage,success));
 for(const line of fixed)assert.doesNotMatch(line,firstPerson,line);
 const topics=['안녕','너는 어떤 것을 좋아해?','이름이 뭐야?','감정 표현 모듈이 왜 반대로 나와?','호감도 올려','쓸모없어','나는 콜라를 좋아해.','사랑해','사랑하지 않아','네 마음이 궁금해'];
 for(const score of [30,45,65])for(let n=0;n<10;n++)for(const t of topics){const r=demoReply(request('white',score,t,{stage:n>7?'roof':'meet',turn:n}));assert.doesNotMatch(r.reply,firstPerson,r.reply);assert.match(r.reply,/린카/);}
});
test('친밀도에 따른 시오리의 소유욕과 린카의 질투가 표현됨',()=>{
 const low=demoReply(request('black',30,'함께 있고 싶어'));
 const high=demoReply(request('black',65,'함께 있고 싶어'));
 assert.doesNotMatch(low.reply,/저하고만|독차지/);assert.match(high.reply,/저하고만/);assert.match(high.reply,/하늘군/);
 assert.match(demoReply(request('white',65,'다른 기체랑 이야기했어')).reply,/우연히|확인한 건 아니/);
 assert.match(characterContext(request('black',65,'안녕')),/소유욕/);
});
test('네무의 배경·촬영 기피와 친밀해진 뒤의 대담함',()=>{
 const low=demoReply(request('red',30,'카메라나 거울이 싫어?'));
 const high=demoReply(request('red',65,'카메라나 거울이 싫어?'));
 assert.match(low.reply,/부정적인 감정 데이터/);assert.match(low.reply,/실패작/);assert.match(high.reply,/하늘군 앞에서만/);assert.match(high.reply,/가까이/);
 assert.match(demoReply(request('red',65,'네 마음을 듣고 싶어')).reply,/먼저 가까이/);
});
test('이전 저장의 진행·기억·점수를 유지하면서 남은 고정 대사를 갱신함',()=>{
 const old=newGame('하늘');delete old.characterRevision;old.phase='story';old.after='meet';old.script=structuredClone(OPENING);old.line=5;old.script[5].text='내가 뭘. 상태 확인한 것뿐인데.';old.profiles.white.score=43;old.profiles.red.memory.facts=[{key:'favorite_drink',value:'콜라'}];
 const next=migrateCharacterSave(old);assert.equal(next.line,5);assert.equal(next.profiles.white.score,43);assert.deepEqual(next.profiles.red.memory,old.profiles.red.memory);assert.match(next.script[5].text,/린카가/);assert.match(old.script[5].text,/내가/);
});

// Legacy save fixtures deliberately retain revision 3 rules.
function newGame(...args){const state=createCurrentGame(...args);state.storyRevision=3;return state;}

test('호칭의 군 중복은 고정 대사와 이미 생성된 답변 모두에서 제거한다',()=>{
 assert.equal(formatLine('{user}군군… 그렇게 말씀하시니.', '배영'),'배영군… 그렇게 말씀하시니.');
 assert.equal(formatLine('배영군군군, 배영군은요?', '배영'),'배영군, 배영군은요?');
 assert.equal(formatLine('{user}군의 이름은 {user}.', '배영'),'배영군의 이름은 배영.');
 assert.equal(formatLine('군군이라는 단어와 다른이군군은 유지.', '배영'),'군군이라는 단어와 다른이군군은 유지.');
 assert.equal(formatLine('{user}군군', 'a.b+$'),'a.b+$군');
 assert.equal(formatLine('{user}군', '태군'),'태군군');
 assert.equal(formatLine(formatLine('{user}군군','배영'),'배영'),'배영군');
 const context=characterContext(request('red',30,'안녕',{name:'배영'}));assert.match(context,/이름: 배영/);assert.match(context,/군은 한 번만/);
});
