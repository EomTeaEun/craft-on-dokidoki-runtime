import {ENDING_REVISION,endingLines} from './ending-v4.js';
import {EPISODES,NODES,dateIllustrationLines,hero} from './episodes.js';
import {MOMENTS,mergeMomentUnlocks} from './moments.js';
import {HEROES,OPENING,ENDINGS,formatLine,GREETINGS,ROOF_GREETINGS} from './data.js';
import {CHAT_STAGES,chatLimit,chatTurns} from './stages.js';
export const VERSION = 1;
export const CHARACTER_REVISION = 2;
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
export function newGame(name='') {
  return {version:VERSION,characterRevision:CHARACTER_REVISION,storyRevision:4,flowRevision:3,endingRevision:ENDING_REVISION,runId:globalThis.crypto.randomUUID(),episode:1,conflictDone:[],outfit:"normal",relationshipIntent:null,viewedMoments:[],personalDone:[],routeHero:null,episodeHero:null,nodeId:null,chapterTitle:'처음 만나는 마음',flags:{repaired:false},choiceHistory:[],lastChoiceDelta:0,chatReturn:null,name,phase:'title',script:[],line:0,after:'meet',active:null,done:[],dateHero:null,ending:null,emotion:'neutral',reply:'',chatClosed:false,intent:false,cast:[],sceneBg:'',history:[],profiles:Object.fromEntries(Object.keys(HEROES).map(id=>[id,{events:{},relationship:{conflictSeen:false,repairState:"unresolved"},score:30,meetDelta:0,roofDelta:0,meetTurns:0,roofTurns:0,stageTurns:{},stageDelta:{},memory:{facts:[],events:[],preferences:[],summary:''},messages:[]}])),updatedAt:Date.now()};
}
export function migrateCharacterSave(value){
 if(!validSave(value))return null;
 const state=structuredClone(value);
 // Saved festival entrances now continue directly without the removed repair choice.
 if(state.storyRevision===4){
  if(state.nodeId==='festival-repair'&&state.phase==='choice')state.resumeNode='festival-start';
  if(state.after==='flow:festival-repair')state.after='flow:festival-start';
 }
 // Retire the duplicated professor/first-day dialogue from existing opening saves.
 if(state.storyRevision===4&&state.phase==='story'&&state.nodeId==='opening'&&state.script.some(l=>l.text==='오늘 할 일은 대단한 실험이 아니에요. 먼저 서로 이름부터 익혀 보세요.')){
  const previousLine=state.line;state.script=structuredClone(OPENING);state.line=Math.min(previousLine,state.script.length-1);state.after='flow:first-day-choice';
  for(const l of state.script.slice(0,state.line+1)){if(l.bg)state.sceneBg=l.bg;if(l.cast)state.cast=l.cast;}
  if(previousLine>=state.script.length)state.resumeNode='first-day-choice';
 }
 // Old saved backgrounds follow the replaced dating venue.
 const oldVenue='/assets/backgrounds/데이트_천문관.png',cinema='/assets/backgrounds/데이트_영화관.png';
 if(state.sceneBg===oldVenue)state.sceneBg=cinema;
 for(const line of state.script)if(line.bg===oldVenue)line.bg=cinema;
 // Update opening staging in saves created before the entrance timing fix.
 if(state.script?.[0]?.text===OPENING[0].text&&state.script?.[1]?.text===OPENING[1].text){
  state.script[0].cast=[];state.script[1].cast=[];
  if(state.phase==='story'&&state.line<2)state.cast=[];
 }
 state.viewedMoments=mergeMomentUnlocks(state.viewedMoments);
 const updateCharacters=(state.characterRevision||1)<CHARACTER_REVISION;
 if(updateCharacters){
 if(state.phase==='story'){
  let source=state.after==='meet'?OPENING:null;
  if(state.after==='end'&&ENDINGS[state.ending]){const e=ENDINGS[state.ending];source=e.lines.map(([speaker,text],i)=>({speaker,text,...(i===0?{bg:e.image,cast:[]}:{} )}));}
  if(source){state.script=structuredClone(source);state.line=Math.min(state.line,source.length-1);}
 }
 if(state.phase==='chat'&&HEROES[state.active]){
  const p=state.profiles[state.active],turn=state.chatStage==='roof'?p.roofTurns:p.meetTurns;
  if(turn===0){state.reply=formatLine((state.chatStage==='roof'?ROOF_GREETINGS:GREETINGS)[state.active],state.name);const last=p.messages.at(-1);if(last?.role==='assistant')last.content=state.reply;}
 }
 state.characterRevision=CHARACTER_REVISION;
 }
 state.runId||=globalThis.crypto.randomUUID();state.personalDone||=[];state.flags||={repaired:false};state.choiceHistory||=[];state.routeHero??=null;state.episodeHero??=null;state.nodeId??=null;state.chatReturn??=null;
 for(const p of Object.values(state.profiles)){p.events||={};p.relationship||={conflictSeen:false,repairState:"unresolved"};p.stageTurns||={};p.stageDelta||={};}
 // The retired v1 screens are no longer shipped. Keep old scores/memories and resume at a v3 checkpoint.
 if(!state.storyRevision||state.storyRevision===1){
  state.storyRevision=3;state.chapterTitle='이전 시나리오';
  const phase=state.phase,after=state.after;
  if(phase==='selectDate'||phase==='story'&&after==='selectDate')state.resumeNode='lunch';
  else if(['selectPlace','date'].includes(phase)||phase==='story'&&after==='conflict')state.resumeNode='personal-select';
  else if(phase==='mini'||phase==='story'&&after==='mini'||phase==='selectRoof'||phase==='story'&&after==='selectRoof'){
   state.routeHero=(HEROES[state.active]?state.active:null)||(HEROES[state.dateHero]?state.dateHero:null)||Object.keys(HEROES).sort((a,b)=>state.profiles[b].score-state.profiles[a].score)[0];
   state.active=state.routeHero;state.personalDone=Object.keys(HEROES);
   state.resumeNode=phase==='selectRoof'||after==='selectRoof'?'before-roof':'crisis';
  }else if(phase==='chat'&&state.chatStage==='roof'){
   state.routeHero=state.active;state.chatReturn='final';
  }
 }
 // Migrate the two older episode orders without changing earned scores or route.
 if(state.storyRevision===4&&state.flowRevision!==3){
  const renumber=state.flowRevision===2?{3:4,4:3}:{3:5,4:4,5:3};
  state.episode=renumber[state.episode]||state.episode;
  if(state.phase==='episode'){
   state.nodeId=`episode-${state.episode}`;
   state.episodeNext=['opening','lunch','ocean-plan','rain-intro','conflict-intro','festival-intro','roof-arrival'][state.episode-1];
  }
  if(state.nodeId?.startsWith('ocean-')){
   state.resumeNode='ocean-plan';
   state.flags.legacyOceanReplay=state.choiceHistory.some(c=>c.node?.startsWith('ocean-'));
  }
  if(state.nodeId==='rain-end')state.after='flow:episode-3';
  state.chapterTitle=EPISODES[state.episode-1];
  state.flowRevision=3;
 }
 // Existing date saves inherit the new cue without replaying scored choices.
 if(state.storyRevision===4){
  if(state.phase==='story'&&['personal-start','personal-middle'].includes(state.nodeId)){
   state.script=dateIllustrationLines(state,state.script);state.line=Math.min(state.line,state.script.length-1);
   if(state.script[state.line]?.moment)state.viewedMoments=mergeMomentUnlocks(state.viewedMoments,[state.script[state.line].moment]);
  }
  if(state.phase==='choice'&&state.nodeId==='personal-choice'&&hero(state)==='black')state.viewedMoments=mergeMomentUnlocks(state.viewedMoments,['black-date']);
  if(state.nodeId==='personal-cg')state.resumeNode||=hero(state)==='black'?'personal-promise':'chat-personal';
  if(state.phase==='chat'&&state.chatStage==='personal'){
   state.profiles[state.active].events.personalChatVisited=true;
   if(hero(state)!=='black'&&!state.profiles[state.active].events.outingFarewellDone&&state.choiceHistory.filter(c=>c.node==='personal-promise').length<=state.personalDone.length)state.chatReturn='personal-promise';
  }
 }
 // Apply revised CG cue points to saves made during the previous ocean staging.
 if(state.storyRevision===4&&state.phase==='story'){
  if(state.nodeId==='ocean-change'&&state.after==='flow:ocean-red-reveal'){
   state.after='flow:ocean-red-moment';state.script.at(-1).text='나는 어깨에 닿은 손끝을 따라 고개를 돌렸다.';
  }
  if(!state.resumeNode&&state.nodeId==='ocean-red-reveal'&&state.script[0]?.text==='…여기요.')state.resumeNode='ocean-red-moment';
  if(state.nodeId==='ocean-black-alone'&&state.script.length>10){
   if(state.line>=10){state.resumeNode||='ocean-moment';}
   else{state.script=state.script.slice(0,10);state.after='flow:ocean-moment';}
  }
  if(['ocean-red-moment','ocean-white-moment','ocean-moment'].includes(state.nodeId)&&state.script.length===1&&!state.script[0].cgMode){
   state.script=structuredClone(NODES[state.nodeId](state).lines);state.line=0;
   state.after=`flow:${NODES[state.nodeId](state).next}`;
  }
 }
 // Old checkpoints return to the memory decision; affection stays intact.
 if(state.storyRevision===4&&(state.endingRevision||1)<2){
  if(state.phase==='final')state.resumeNode='roof-farewell';
  if(state.phase==='story'&&['crisis-call','roof-farewell','roof-intent~0','roof-intent~1'].includes(state.nodeId)){
   const node=NODES[state.nodeId](state);state.script=structuredClone(node.lines);state.line=Math.min(state.line,state.script.length-1);state.after=`flow:${node.next}`;
  }
  if(state.after==='end'&&state.ending){state.flags.memoryRepairComplete=true;state.script=endingLines(state,state.ending);state.line=0;state.sceneBg=state.script[0].bg;state.cast=state.script[0].cast||[];}
 }
 // Refresh ending scripts and checkpoints while retaining earned affection.
 if(state.storyRevision===4&&state.endingRevision!==ENDING_REVISION){
  if(/^(black|white|red)-apart$/.test(state.ending||''))state.ending='normal';
  if((state.endingRevision||1)<5&&(state.phase==='final'||state.phase==='story'&&['repair-result','followup-offer'].includes(state.nodeId))){
   delete state.flags.memoryRepairComplete;for(const p of Object.values(state.profiles))delete p.events.memorySafe;
   state.resumeNode='roof-farewell';
  }
  if(state.after==='end'&&state.ending){
   const previousLine=state.script[state.line];
   state.script=endingLines(state,state.ending);
   const sameLine=state.script.findIndex(l=>l.speaker===previousLine?.speaker&&l.text===previousLine?.text);
   state.line=sameLine>=0?sameLine:Math.min(state.line,state.script.length-1);
   if(state.ending==='bad'){delete state.flags.memoryRepairComplete;state.flags.memoryResetComplete=true;for(const p of Object.values(state.profiles))p.events.memorySafe=false;}
   for(const l of state.script.slice(0,state.line+1)){if(l.bg)state.sceneBg=l.bg;if(l.cast)state.cast=l.cast;}
   const current=state.script[state.line];
   if(state.phase==='story'&&current.moment)state.viewedMoments=mergeMomentUnlocks(state.viewedMoments,[current.moment]);
  }
  state.endingRevision=ENDING_REVISION;
 }
 state.chapterTitle||='처음 만나는 마음';
 return state;
}
export function setScript(state,lines,after) {state.phase='story';state.script=lines;state.line=0;state.after=after;}
export function addEvent(state,id,summary) {const m=state.profiles[id].memory;if(!m.events.includes(summary))m.events.push(summary);m.events=m.events.slice(-16);}
export function score(state,id,amount){state.profiles[id].score=clamp(state.profiles[id].score+amount,0,100);}
export function applyChat(state,text,result) {
  if(state.phase!=='chat'||state.chatClosed)return false;
  const p=state.profiles[state.active],roof=state.chatStage==='roof';
  const stage=state.chatStage;if(!CHAT_STAGES[stage])return false;
  const counter=roof?'roofTurns':'meetTurns',deltaKey=roof?'roofDelta':'meetDelta',legacy=roof||stage==='meet',limit=chatLimit(stage);
  const turn=chatTurns(state);if(turn>=limit)return false;
  p.stageTurns||={};p.stageDelta||={};
  if(legacy)p[counter]++;else p.stageTurns[stage]=turn+1;
  const d=clamp(Number(result.affinity_delta)||0,-2,2);
  const previous=legacy?p[deltaKey]:p.stageDelta[stage]||0;
  const cap=state.storyRevision===4?({meet:8,personal:6,rain:4,festival:4,roof:6})[stage]||0:CHAT_STAGES[stage].cap;
  const next=clamp(previous+d,-cap,cap);
  score(state,state.active,next-previous);if(legacy)p[deltaKey]=next;else p.stageDelta[stage]=next;
  if(state.storyRevision!==4&&['repair','festival'].includes(stage)&&state.routeHero&&d>0){state.flags.repairUnderstanding=(state.flags.repairUnderstanding||0)+1;if(state.flags.repairUnderstanding>=2)state.flags.repaired=true;}
  // Only preserve extracted facts with a verbatim evidence span from this input.
  for(const fact of result.memory_updates||[]) {
    if(!fact.evidence||!text.includes(fact.evidence)||!fact.value.trim())continue;
    const item={key:fact.key,value:fact.value.slice(0,120),evidence:fact.evidence.slice(0,200),stage:state.chatStage,turn:turn+1};
    const index=p.memory.facts.findIndex(x=>x.key===item.key);
    if(index<0)p.memory.facts.push(item);else p.memory.facts[index]=item;
    p.memory.facts=p.memory.facts.slice(-12);
  }
  if(result.revealed_preference&&!p.memory.preferences.includes(result.revealed_preference))p.memory.preferences.push(result.revealed_preference);
  p.memory.preferences=p.memory.preferences.slice(-8);
  if(result.summary)p.memory.summary=result.summary.slice(0,500);
  if(roof&&result.relationship_intent==='continue')state.intent=true;
  if(roof&&result.relationship_intent==='decline')state.intent=false;
  p.messages.push({role:'user',content:text},{role:'assistant',content:result.reply});
  
  state.lastChatInput=text;state.reply=result.reply;state.emotion=result.emotion||'neutral';state.chatClosed=turn+1>=limit;
  state.history.push({speaker:state.name,text},{speaker:HEROES[state.active].name,text:result.reply});
  state.updatedAt=Date.now();return true;
}
export function canPreserve(state){if(state.storyRevision===4)return !!state.routeHero&&state.active===state.routeHero&&state.profiles[state.active].score>=60&&state.intent&&state.relationshipIntent==='continue'&&state.profiles[state.active].relationship?.repairState==='resolved';return !!state.active&&state.profiles[state.active].score>=(state.routeHero?60:55)&&state.intent&&(!state.routeHero||state.flags.repaired===true);}
export function validSave(value){
  const phases=['episode','story','selectMeet','selectDate','selectPlace','date','mini','selectRoof','chat','final','ending','choice','selectPersonal','selectRain'];
  const stages=Object.keys(CHAT_STAGES);
  if(value?.viewedMoments!==undefined&&(!Array.isArray(value.viewedMoments)||value.viewedMoments.length>Object.keys(MOMENTS).length||value.viewedMoments.some(id=>typeof id!=='string'||!Object.hasOwn(MOMENTS,id))))return false;
  if(!value||value.version!==VERSION||!phases.includes(value.phase)||typeof value.name!=='string'||!value.name.trim()||value.name.length>12)return false;
  if(!Array.isArray(value.script)||value.script.length>100||!Number.isInteger(value.line)||value.line<0||!Array.isArray(value.history)||!Array.isArray(value.done))return false;
  if(value.phase==='story'&&(!value.script.length||value.line>=value.script.length))return false;
  if(value.phase==='chat'&&(!HEROES[value.active]||!stages.includes(value.chatStage)))return false;
  if(['date','selectPlace'].includes(value.phase)&&!HEROES[value.dateHero])return false;
  if(value.phase==='final'&&!HEROES[value.active])return false;
  if([3,4].includes(value.storyRevision)){
   if(!Array.isArray(value.personalDone)||new Set(value.personalDone).size!==value.personalDone.length||value.personalDone.some(id=>!HEROES[id])||!value.flags||typeof value.flags!=='object'||!Array.isArray(value.choiceHistory))return false;
   if(value.routeHero!==null&&!HEROES[value.routeHero])return false;
   if(value.phase==='selectRain'&&value.personalDone.length!==3)return false;
   if(value.phase==='choice'&&typeof value.nodeId!=='string')return false;
   if(['personal','rain','repair','festival'].includes(value.chatStage)&&value.phase==='chat'&&(!value.chatReturn||value.chatStage!=='personal'&&value.active!==value.routeHero))return false;
  }
  if(value.storyRevision===4){
   if(!Number.isInteger(value.episode)||value.episode<1||value.episode>7||!Array.isArray(value.conflictDone)||new Set(value.conflictDone).size!==value.conflictDone.length||value.conflictDone.some(id=>!HEROES[id]))return false;
   if(value.phase==='episode'&&typeof value.episodeNext!=='string'||value.phase==='chat'&&value.chatStage==='repair')return false;
   if(!Object.keys(HEROES).every(id=>value.profiles?.[id]?.events&&['unresolved','partial','resolved'].includes(value.profiles?.[id]?.relationship?.repairState)))return false;
  }
  if(!value.profiles||!Object.keys(HEROES).every(id=>{
    const p=value.profiles[id];return p&&Object.entries(p.stageTurns||{}).every(([stage,turn])=>CHAT_STAGES[stage]&&Number.isInteger(turn)&&turn>=0&&turn<=chatLimit(stage))&&Object.values(p.stageDelta||{}).every(Number.isFinite)&&Number.isFinite(p.score)&&p.score>=0&&p.score<=100&&Number.isInteger(p.meetTurns)&&p.meetTurns>=0&&p.meetTurns<=8&&Number.isInteger(p.roofTurns)&&p.roofTurns>=0&&p.roofTurns<=10&&Number.isFinite(p.meetDelta)&&Number.isFinite(p.roofDelta)&&Array.isArray(p.messages)&&p.messages.every(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string')&&p.memory&&['facts','events','preferences'].every(k=>Array.isArray(p.memory[k]));
  }))return false;
  return true;
}
