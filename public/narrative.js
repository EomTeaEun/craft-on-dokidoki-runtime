import {MODERN_ENDINGS,endingLines} from './ending-v4.js';
import * as legacy from './narrative-v3.js';
import {NODES as V4,EPISODES,hero} from './episodes.js';
import {HEROES,bg,cg,formatLine,GREETINGS} from './data.js';
import {setScript,score,addEvent,canPreserve} from './engine.js';
import {rememberMoment} from './moments.js';
import {chatTurns,CHAT_STAGES} from './stages.js';
export {EPISODES};
export const STORY_REVISION=4;
export const NODES=V4;
const modern=s=>s.storyRevision===4;
export function choiceOptions(s){return modern(s)?V4[s.nodeId]?.(s)?.options||[]:legacy.choiceOptions(s);}
export function choiceIllustration(s){return modern(s)&&s.phase==='choice'?V4[s.nodeId]?.(s)?.illustration||null:null;}
function record(s,l){if(l.moment)rememberMoment(s,l.moment);if(l.bg)s.sceneBg=l.bg;if(l.cast)s.cast=l.cast;s.history.push({speaker:HEROES[l.speaker]?.name||(l.speaker==='나'?s.name:l.speaker)||'이야기',text:formatLine(l.text,s.name)});}
export function enterNode(s,id){
 if(!modern(s))return legacy.enterNode(s,id);
 if(id==='personal-cg')id=hero(s)==='black'?'personal-promise':'chat-personal';
 if(id==='lunch'&&s.episode===1)id='meeting-end';
 if(id==='personal-select'&&s.personalDone.length===3)id='personal-reunion';
 // Older saves may already have completed the selected heroine's conflict.
 if(id==='episode-5'&&s.routeHero&&s.conflictDone.includes(s.routeHero))id='episode-6';
 if(id==='conflict-next'){
  const next=s.routeHero?(!s.conflictDone.includes(s.routeHero)&&s.routeHero):Object.keys(HEROES).find(x=>!s.conflictDone.includes(x));
  if(next){s.episodeHero=next;s.active=next;id='conflict-start';}
  else id=s.routeHero?'episode-6':s.flags.groupOceanCompleted?'episode-4':'episode-3';
 }
 s.nodeId=id;s.chatClosed=false;
 if(id==='final'){s.episode=7;s.chapterTitle=EPISODES[6];s.phase='final';s.cast=[];s.extra=null;s.sceneBg=s.flags.memoryRepairComplete?bg('연구실_낮'):cg('04_MEMORY_RESET');return;}
 const node=V4[id]?.(s);if(!node)throw new Error(`알 수 없는 장면: ${id}`);
 s.episode=node.episode||s.episode;s.chapterTitle=EPISODES[s.episode-1];
 if(node.type==='episode'){s.phase='episode';s.episodeNext=node.next;s.cast=[];s.extra=null;s.outfit='normal';return;}
 if(node.type==='chat')return startSceneChat(s,node.stage,node.next);
 if(['selectMeet','selectPersonal','selectRain'].includes(node.type)){s.phase=node.type;s.cast=[];s.active=null;s.extra=null;return;}
 if(node.type==='choice'){s.phase='choice';s.choicePrompt=node.prompt;if(node.illustration)rememberMoment(s,node.illustration);return;}
 s.cast=node.cast||[];s.sceneBg=node.background||s.sceneBg;s.extra=typeof node.extra==='function'?node.extra(s):(node.extra??null);s.outfit=node.outfit||s.outfit||'normal';
 if(['personal-start','personal-middle'].includes(id)&&s.episodeHero==='white')s.sceneBg=bg('옥상_노을');
 if(node.conflictSeen)s.profiles[hero(s)].relationship.conflictSeen=true;
 // Completion is tied to leaving the scene, not merely displaying its first line.
 s.completePersonal=!!node.completePersonal;s.completeConflict=!!node.completeConflict;s.completeGroupOcean=!!node.completeGroupOcean;s.completeRainPromise=!!node.completeRainPromise;s.completeRepair=!!node.completeRepair;
 if(id==='personal-start')node.lines.unshift({speaker:'',text:['첫 번째 외출 약속 날. 연구실 밖에서 둘이 만나기로 했다.','다음 날, 두 번째 약속을 지키러 나왔다. 오늘 함께할 사람은 어제와 달랐다.','마지막 외출 약속 날. 각자에게 따로 비워 둔 하루가 오늘로 세 번째였다.'][s.personalDone.length]});
 setScript(s,structuredClone(node.lines),`flow:${node.next}`);record(s,s.script[0]);
}
// First decide whether to protect the memories; only the happy path offers cohabitation.
export function chooseFinal(s,action){
 if(!modern(s)||s.phase!=='final')return false;
 const ready=canPreserve(s),repaired=s.flags.memoryRepairComplete===true;
 if(action==='preserve'&&!repaired){if(!ready)return false;enterNode(s,'repair-result');return true;}
 let id;
 if(action==='reset'&&!repaired){id='bad';s.flags.memoryResetComplete=true;for(const p of Object.values(s.profiles))p.events.memorySafe=false;}
 else if(repaired&&ready&&['preserve','normal'].includes(action))id=action==='normal'?'normal':s.active;
 else return false;
 s.ending=id;s.outfit='normal';s.extra=null;s.cast=[];
 setScript(s,endingLines(s,id),'end');record(s,s.script[0]);return true;
}
export function advanceEpisode(s){if(!modern(s)||s.phase!=='episode')return false;enterNode(s,s.episodeNext);return true;}
export function advanceNarrative(s){
 if(!modern(s))return legacy.advanceNarrative(s);
 if(s.phase!=='story'||!s.after?.startsWith('flow:'))return false;
 if(s.line<s.script.length-1){s.line++;record(s,s.script[s.line]);}
 else{
  if(s.completePersonal&&!s.personalDone.includes(s.episodeHero)){s.personalDone.push(s.episodeHero);addEvent(s,s.episodeHero,'단둘의 외출을 마치고 각자 돌아갔다.');}
  if(s.completeConflict&&!s.conflictDone.includes(s.episodeHero))s.conflictDone.push(s.episodeHero);
  if(s.completeRepair){s.flags.memoryRepairComplete=true;for(const id of Object.keys(HEROES)){s.profiles[id].events.memorySafe=true;addEvent(s,id,'공동 연구팀의 수정으로 동기화 충돌이 해결되었고 세 사람 모두 관계 기억을 보존했다.');}}
  if(s.completeGroupOcean){
   s.flags.groupOceanCompleted=true;delete s.flags.legacyOceanReplay;
   for(const id of Object.keys(HEROES)){s.profiles[id].events.oceanGroup=true;addEvent(s,id,'주인공과 세 히로인이 넷이서 바다를 다녀왔다. 네무가 먼저 나타나고, 린카가 물놀이를 이끌었으며, 해 질 무렵 시오리가 주인공과 잠깐 둘이 남았다.');}
  }
  if(s.completeRainPromise&&s.routeHero){s.profiles[s.routeHero].events.festivalPromise=true;addEvent(s,s.routeHero,'비 오는 날 주인공과 단둘이 우산을 쓰고, 다음 축제를 둘이 가기로 했다.');}
  enterNode(s,s.after.slice(5));
 }return true;
}
export function chooseNarrative(s,index){
 if(!modern(s))return legacy.chooseNarrative(s,index);
 if(s.phase!=='choice'||!Number.isInteger(index))return false;const o=choiceOptions(s)[index];if(!o)return false;
 const ids=o.all?Object.keys(HEROES):[o.hero||hero(s)];
 for(const id of ids){if(!HEROES[id])continue;if(!(s.flags.legacyOceanReplay&&s.nodeId.startsWith('ocean-')))score(s,id,o.delta||0);const p=s.profiles[id];if(o.event)addEvent(s,id,o.event);if(o.flag)p.events[o.flag]=o.value;
 if(o.repair){const r=p.relationship;r.repairState=o.repair==='keep'?(r.repairState==='resolved'?'resolved':'partial'):o.repair;}
 if(s.nodeId==='personal-promise')p.events.outingFarewellDone=true;
 if(o.custom==='outingGood'&&id==='black'){p.events.hairpinBought=true;addEvent(s,id,'자신이 마음에 든 흰 꽃 머리핀을 직접 골라 샀다.');}
 }
 if(o.intent){s.intent=o.intent==='continue';s.relationshipIntent=o.intent;}
 s.lastChoiceDelta=o.delta||0;s.choiceHistory.push({node:s.nodeId,index,text:o.text});s.history.push({speaker:s.name,text:o.text});
 enterNode(s,o.next);return true;
}
export function selectPersonal(s,id){if(!modern(s))return legacy.selectPersonal(s,id);if(s.phase!=='selectPersonal'||!HEROES[id]||s.personalDone.includes(id))return false;s.episodeHero=id;s.active=id;enterNode(s,'personal-start');return true;}
export function selectRain(s,id){if(!modern(s))return legacy.selectRain(s,id);if(s.phase!=='selectRain'||!HEROES[id]||s.personalDone.length!==3)return false;s.routeHero=id;s.dateHero=id;s.active=id;addEvent(s,id,'비 오는 날 주인공이 자신에게 우산을 가져왔고 다른 두 사람은 함께 돌아갔다.');enterNode(s,'rain-arrival');return true;}
// 첫 대사의 text와 emotion을 함께 수정하세요. 표정: neutral, happy, shy, love, sad, jealous (네무는 surprise도 지원).
const greetings={
 personal:{
  black:{text:"후후, 오늘 즐거웠어요.♫ 다음에도 또 놀아주실거죠?",emotion:"happy"},
  white:{text:"린카랑 단 둘이 있을 수 있는 좋은 기회라고? 뭔가 재밌는 얘기라도 해봐.",emotion:"happy"},
  red:{text:"...너무 빤히 바라보지는 말아주세요 {user}군...",emotion:"shy"}
 },
 rain:{
  black:{text:"방 안이 조용하네요. 오늘은 둘만의 대화에 더 집중할 수 있겠어요.",emotion:"happy"},
  white:{text:"흥...비가 그칠 때까지만 있어줄 거야.",emotion:"shy"},
  red:{text:"아직 비가 오네요. ...여기에 조금 더 있어도 괜찮을까요?",emotion:"shy"}
 },
 festival:{
  black:{text:"오늘 어떤 순간이 제일 남으셨어요? 저는 조금 긴장했어요.",emotion:"shy"},
  white:{text:"린카는 오늘 나쁘지 않았어. 너는 어땠는데?",emotion:"happy"},
  red:{text:"오늘은 제가 먼저 같이 있자고 한 날로 기억하고 싶어요.",emotion:"shy"}
 },
 roof:{
  black:{text:"오늘은 {user}군 이야기를 끝까지 듣고 싶어요. 저도 숨기지 않을게요.",emotion:"love"},
  white:{text:"린카는 듣고 있어. 지금 하고 싶은 말을 해.",emotion:"neutral"},
  red:{text:"저도 여기에 있어요. 천천히 이야기해 주세요.",emotion:"love"}
 }
};
export function startSceneChat(s,stage,next){
 if(!modern(s))return legacy.startSceneChat(s,stage,next);
 const id=stage==='personal'?s.episodeHero:stage==='meet'?s.active:s.routeHero;
 s.active=id;s.cast=[id];s.extra=null;s.chatStage=stage;s.chatReturn=next;s.phase='chat';s.chatClosed=chatTurns(s)>=CHAT_STAGES[stage].limit;s.lastChatInput='';s.chatDraft='';s.emotion='neutral';
 const greeting=(stage==='meet'?GREETINGS:greetings[stage])[id];
 s.reply=formatLine(typeof greeting==='string'?greeting:greeting.text,s.name);
 s.emotion=typeof greeting==='object'&&Object.hasOwn(HEROES[id].files,greeting.emotion)?greeting.emotion:'neutral';
 s.profiles[id].messages.push({role:'assistant',content:s.reply});s.history.push({speaker:HEROES[id].name,text:s.reply});
 if(stage==='roof'){s.roofCheckpointPending=true;s.intent=false;s.sceneBg=bg('옥상_노을');}
 if(stage==='personal'){s.profiles[id].events.personalChatVisited=true;addEvent(s,id,{black:'둘이 소품 가게를 구경하며 자기 취향에 대해 이야기했다.',white:'둘이 옥상에 앉아 시간을 보냈다.',red:'둘이 저녁 길을 걸으며 조용한 시간을 보냈다.'}[id]);}
 if(stage==='rain')addEvent(s,id,'주인공 기숙사에서 단둘이 비를 피했다.');
 if(stage==='festival'){addEvent(s,id,'바다 여행 뒤 학교 축제를 둘이 찾았다.');addEvent(s,id,s.profiles[id].events.handHeld?'서로 동의하고 손을 잡았다.':'오늘 축제에서는 손을 잡지 않고 나란히 걸었다.');}
}
export function endSceneChat(s,{skipped=false}={}){if(!modern(s))return legacy.endSceneChat(s,{skipped});if(s.phase!=='chat'||!s.chatClosed||!s.chatReturn)return false;const next=s.chatReturn;s.chatReturn=null;s.chatStage=null;s.chatDraft='';enterNode(s,next);return true;}
export function skipFirstConversations(s){if(!modern(s))return legacy.skipFirstConversations(s);if(s.phase!=='selectMeet')return false;s.done=Object.keys(HEROES);s.flags.firstChatsSkipped=true;s.active=null;enterNode(s,'meeting-end');return true;}
export function skipConversation(s){
 if(!modern(s))return legacy.skipConversation(s);
 if(s.phase==='selectMeet')return skipFirstConversations(s);
 if(s.phase==='selectPersonal'){s.flags.personalSkipped=Object.keys(HEROES).filter(id=>!s.personalDone.includes(id));s.personalDone=Object.keys(HEROES);s.episodeHero=null;enterNode(s,'episode-3');return true;}
 if(s.phase!=='chat'||s.chatClosed)return false;
 s.flags.skippedChats=[...new Set([...(s.flags.skippedChats||[]),`${s.active}:${s.chatStage}`])];s.chatClosed=true;s.chatDraft='';
 if(s.chatReturn)return endSceneChat(s,{skipped:true});
 if(s.chatStage==='meet'){if(!s.done.includes(s.active))s.done.push(s.active);s.flags.firstChatsSkipped=true;s.active=null;s.chatStage=null;enterNode(s,s.done.length===3?'meeting-end':'meet-select');return true;}
 return false;
}
export function sceneClosing(s){if(!modern(s))return legacy.sceneClosing(s);return formatLine(s.chatStage==='roof'?'바람이 차가워졌네요. 내려가기 전에, 앞으로의 관계에 대한 마음도 직접 확인하고 싶어요.':{black:'오늘 이야기해 주셔서 고마워요. 이제 조금 걸을까요?',white:'오늘은 여기까지. 린카도 할 말은 다음에 더 할게.',red:'…들어 주셔서 고마워요. 이제 조금 걸어요.'}[s.active],s.name);}
export function progressLabel(s){if(!modern(s))return legacy.progressLabel(s);if(s.ending)return `${HEROES[MODERN_ENDINGS[s.ending]?.hero||s.ending]?.name||MODERN_ENDINGS[s.ending]?.title||''} · ${s.ending==='bad'?'배드':s.ending==='normal'?'노말':'해피'}엔딩`;return `EP ${String(s.episode||1).padStart(2,'0')} · ${EPISODES[(s.episode||1)-1]}`;}
