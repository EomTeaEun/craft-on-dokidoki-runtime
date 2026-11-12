import {MODERN_ENDINGS} from './ending-v4.js';
import {storyExpressions} from './story-expressions.js';
import {createReadback} from './readback.js';
import {createPoseLoader,renderWithStandingReuse} from './standing-renderer.js';
import {SAVE_SLOTS,SAVE_KEY,saveSlotLabel,readSaveSlot,removeSaveSlot} from './save-slots.js';
import {MOMENTS,MOMENT_CATEGORIES,mergeMomentUnlocks,rememberMoment} from './moments.js';
import {HEROES,sprite,bg,GREETINGS,ENDINGS,conversationClosing,formatLine} from './data.js';
import {newGame,setScript,applyChat,addEvent,canPreserve,migrateCharacterSave} from './engine.js';
import {advanceEpisode,EPISODES,enterNode,advanceNarrative,chooseNarrative,choiceOptions,choiceIllustration,selectPersonal,selectRain,endSceneChat,sceneClosing,progressLabel,skipConversation,chooseFinal} from './narrative.js';
import {chatTurns,CHAT_STAGES} from './stages.js';
import {createTitleMusic} from './music.js';

const app=document.querySelector('#app'),modal=document.querySelector('#modal'),music=document.querySelector('#music');
const KEY=SAVE_KEY;
let pendingSaveDelete=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={save:'<path d="M4 3h12l3 3v15H3V3zM7 3v6h8V3M7 21v-8h8v8"/>',load:'<path d="M3 8h7l2-3h9v14H3zM12 10v6m-3-3 3 3 3-3"/>',settings:'<path d="m10 3-.6 2-2 .9-2-.6-2 3 1.5 1.5v2.4L3.4 14l2 3 2-.6 2 .9.6 2h4l.6-2 2-.9 2 .6 2-3-1.5-1.8V10L21 8.3l-2-3-2 .6-2-.9-.6-2z"/><circle cx="12" cy="11.5" r="3"/>',log:'<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>',sound:'<path d="M11 4 6 8H3v8h3l5 4zM15 8q5 4 0 8M18 5q8 7 0 14"/>',mute:'<path d="M11 4 6 8H3v8h3l5 4zM16 9l5 6m0-6-5 6"/>',full:'<path d="M3 9V3h6m6 0h6v6M3 15v6h6m6 0h6v-6"/>',home:'<path d="m3 11 9-8 9 8M6 9v12h12V9M10 21v-7h4v7"/>',send:'<path d="m3 3 18 9-18 9 4-9zM7 12h14"/>',warning:'<path d="m12 3 10 18H2zM12 9v5m0 3v1"/>',heart:'<path d="M12 21 3 12C-2 5 7 0 12 6c5-6 14-1 9 6z"/>'};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[k]||''}</svg>`;
let state=newGame(),busy=false,chatError='',draft='',typedTimer=null,typing=false,fullText='',currentText=null,toastTimer;
const readback=createReadback();
let playerSession=null;
let status={liveReady:false,model:''},prefs={mode:'demo',volume:.18,sound:true,speed:18,textSize:20},unlocks=[],momentUnlocks=[],galleryFilter='all';
const titleMusic=createTitleMusic(music,()=>prefs,()=>state.phase==='title',value=>{app.dataset.music=value;});
const poseLoader=createPoseLoader();
function preloadHero(id){for(const emotion of Object.keys(HEROES[id].files))poseLoader.preload(sprite(id,emotion)).catch(()=>{});}
try{prefs={...prefs,...JSON.parse(localStorage.getItem(KEY+'-prefs')||'{}')};unlocks=JSON.parse(localStorage.getItem(KEY+'-unlocks')||'[]');if(!Array.isArray(unlocks))unlocks=[];unlocks=[...new Set(unlocks.map(id=>/^(black|white|red)-apart$/.test(id)?'normal':id))];momentUnlocks=mergeMomentUnlocks(JSON.parse(localStorage.getItem(KEY+'-moment-unlocks')||'[]'));}catch{}
if([19,21,24].includes(prefs.textSize))prefs.textSize-=1;
function store(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v));return true;}catch{toast('저장 공간이 부족해요. 다른 저장 슬롯을 정리해 주세요.');return false;}}
function saved(slot='auto'){try{return migrateCharacterSave(JSON.parse(localStorage.getItem(KEY+'-'+slot)));}catch{return null;}}
function persist(){if(state.phase==='title')return true;state.updatedAt=Date.now();state.chatDraft=draft;if(state.roofCheckpointPending){delete state.roofCheckpointPending;store('-roof',state);}if(state.phase==='final')store('-decision',state);return store('-auto',state);}
function toast(text){const el=document.querySelector('#toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2600);}
function text(value){return formatLine(value,state.name);}
function speakerName(s){const legacy={흑발:'black',백발:'white',적발:'red'};return HEROES[legacy[s]||s]?.name||(s==='나'?state.name:s)||'연구 기록';}
function chapter(){if(state.phase==='title')return ['VISUAL NOVEL','마음은 예외로 남는다'];if(state.phase==='ending'||state.after==='end')return ['EPILOGUE','기억의 다음 페이지'];if(state.storyRevision===4)return [`EPISODE ${String(state.episode).padStart(2,'0')}`,state.chapterTitle||EPISODES[state.episode-1]];if(state.storyRevision===3)return [state.routeHero?'OUR STORY':'DAYS TOGETHER',state.phase==='chat'?CHAT_STAGES[state.chatStage].label:state.chapterTitle||'처음 만나는 마음'];return ['OUR STORY','기억하고 싶은 마음'];}
function syncMusic(){return titleMusic.sync();}
function shell(content){const [ch,label]=chapter();return `<div class="stage-wrap"><section class="stage ${state.phase==='story'&&state.nodeId==='ocean-monologue'?'monologue':''}" aria-label="게임 화면">${state.phase!=='title'?`<div class="backdrop" style="background-image:url('${esc(state.sceneBg||bg('연구실_낮'))}')"></div><div class="vignette"></div><div class="stage-top"><div class="chapter-label"><small>${ch}</small><span>${label}</span></div><div class="status-pill">${prefs.mode==='live'?'AI 자유대화':'체험 모드'}</div></div>`:''}${content}<button class="glass-icon game-settings" data-action="settings" aria-label="설정 및 게임 메뉴" aria-haspopup="dialog">${icon('settings')}</button></section></div>`;}

function titleView(){return `<div class="title-screen"><img class="cover-art" src="/assets/cover-wide-16x9.png" alt="세 휴머노이드와 게임 제목이 그려진 표지"><div class="title-shade"></div><p class="music-unlock-note">브라우저가 자동재생을 차단했어요</p><p class="music-playing-note" role="status">♫ OP 재생 중</p><nav class="title-menu" aria-label="시작 메뉴"><button class="menu-btn primary" data-action="new"><span class="menu-glyph">◇</span><span class="menu-copy">Click to start<small>새로운 이야기</small></span><span class="menu-arrow">→</span></button><button class="menu-btn" data-action="continue" ${SAVE_SLOTS.some(slot=>saved(slot))?'':'disabled'}><span class="menu-glyph">${icon('load')}</span><span class="menu-copy">이어서 하기<small>CONTINUE</small></span><span class="menu-arrow">→</span></button><button class="menu-btn" data-action="gallery"><span class="menu-glyph">${icon('heart')}</span><span class="menu-copy">기억의 순간<small>MEMORIES</small></span><span class="menu-arrow">→</span></button></nav></div>`;}
function gameSprite(id,emotion){return state.storyRevision===4&&state.outfit==='ocean'?`/assets/standing-ocean/${id}.png`:sprite(id,emotion);}
function castView(cast=state.cast,speaker=state.active,emotion=state.emotion){const expressions=['story','choice'].includes(state.phase)?storyExpressions(state):null;return `<div class="cast ${cast.length>1?'multi':''}">${cast.map(id=>`<img data-hero="${id}" class="standing ${cast.length>1&&speaker&&speaker!==id?'dim':''}" src="${esc(gameSprite(id,expressions?.[id]||(speaker===id?emotion:'neutral')))}" alt="${HEROES[id].name}">`).join('')}</div>`;}
function dialogueView(speaker,body,extra='',cls=''){const hero=HEROES[speaker],kind=hero?'hero':speaker==='나'?'student':speaker?.startsWith('교수')?'professor':'narrator';const label=kind==='student'?`${state.name} · 학생`:kind==='professor'?'교수':speakerName(speaker);const detail=hero?.code||(kind==='professor'?(speaker.includes('메시지')?'메시지':speaker.includes('통화')?'통화':'지도교수'):'');return `<section class="dialogue ${cls}" ${state.phase==='story'?'data-action="advance"':''}><div class="nameplate" data-speaker-kind="${kind}"><span>${esc(label)}</span>${detail?`<small>${esc(detail)}</small>`:''}</div><p class="dialogue-text" id="dialogue-text" aria-live="polite">${esc(text(body))}</p>${extra}</section>`;}
function specialMomentView(moment){return `<div class="special-scene" data-action="advance"><img class="special-art" src="${esc(moment.image)}" alt="${esc(HEROES[moment.hero].name+' · '+moment.title)}" decoding="async"><button class="special-next" data-action="advance" aria-label="일러스트 감상 마치고 이야기 이어가기"><small>${esc(HEROES[moment.hero].name)} · ${MOMENT_CATEGORIES[moment.category]}</small><strong>${esc(moment.title)}</strong><span>기억의 순간에 저장됨 · 클릭해서 이야기 이어가기 →</span></button></div>`;}
function syncMomentUnlocks(){let stored=[];try{stored=JSON.parse(localStorage.getItem(KEY+'-moment-unlocks')||'[]');}catch{}const next=mergeMomentUnlocks(momentUnlocks,stored,state.viewedMoments);const added=next.filter(id=>!momentUnlocks.includes(id));if(next.length!==momentUnlocks.length){momentUnlocks=next;store('-moment-unlocks',momentUnlocks);}return added;}
function playGuideView(){return `<section class="play-guide" aria-labelledby="play-guide-title">
 <header class="play-guide-heading"><small>BEFORE THE STORY</small><h1 id="play-guide-title">이야기를 시작하기 전에</h1><p>당신의 말과 선택으로, 서로를 조금씩 알아가는 이야기예요.</p></header>
 <div class="play-guide-body">
  <article><small>01 / CONTROLS</small><h2>대사 읽기</h2><p>화면 클릭 · <kbd>Space</kbd> · <kbd>Enter</kbd> · <kbd>→</kbd>로 다음 대사를 읽어요. 글자가 나오는 중에 누르면 문장 전체가 표시돼요.</p><p><kbd>←</kbd> · <kbd>Backspace</kbd>는 이전 대사 보기, <kbd>Esc</kbd>는 현재 진행으로 돌아오기예요. 다시 읽어도 선택과 호감도는 되돌아가지 않아요.</p></article>
  <article><small>02 / CONVERSATION</small><h2>직접 대화하기</h2><p>자유대화에서는 입력창에 말을 쓰고 <kbd>Enter</kbd> 또는 전송 버튼을 눌러요. 정해진 대화를 마치면 이야기 이어가기로 진행해요.</p><p>스킵하면 남은 대화와 그 시간에 호감도를 쌓을 기회를 건너뛰어요.</p></article>
  <article class="play-guide-action"><small>03 / ROLE PLAY</small><h2>행동도 전할 수 있어요</h2><p>별표 두 개씩으로 내용을 감싸면 <strong>행동 지문</strong>이에요. 말과 함께 적어도 괜찮아요.</p><code>**조심스럽게 손을 내민다**<br>같이 걸을래?</code><p>행동 지문은 캐릭터에게 전하는 상황 묘사예요. 이야기의 선택지나 엔딩 판정을 대신하지는 않아요.</p></article>
  <article><small>04 / CHOICES</small><h2>마음은 선택으로</h2><p>선택지와 자유대화가 호감도에 영향을 줘요. 좋아하는 것뿐 아니라, 싫은 것과 원하지 않는 것도 존중해 주세요.</p><p>엔딩은 호감도, 갈등을 풀었는지, 마지막 관계 선택에 따라 달라져요. 자유대화를 스킵해도 선택에 따라 해피엔딩을 볼 수 있어요.</p></article>
  <article><small>05 / SAVE</small><h2>잠깐 쉬어 가기</h2><p>왼쪽 위 설정에서 저장·불러오기·기억·음악을 관리해요. 호감도는 저장 화면에서 확인할 수 있어요.</p><p>진행은 자동 저장되지만 중요한 선택 전에는 따로 저장해 두세요. 세이브는 현재 브라우저에 저장돼요.</p></article>
  <article><small>06 / PLEASE NOTE</small><h2>대화 전 알아 두세요</h2><p>AI 답변에는 시간이 걸리거나 이야기와 어긋나는 내용이 있을 수 있어요. 설정의 체험 모드는 미리 준비된 반응으로 진행돼요.</p><p>첫 전송 전에 대화 기록 동의를 받아요. 개인정보나 비밀번호는 입력하지 마세요. 입력 중에는 방향키가 글자를 편집하는 데 쓰여요.</p></article>
 </div>
 <footer class="play-guide-footer"><span>준비되셨나요? 첫 만남이 기다리고 있어요.</span><button class="button" data-action="tutorialNext">에피소드 1로 →</button></footer>
 </section>`;}
function finishPlayGuide(){if(state.phase!=='episode'||!state.tutorialPending)return;delete state.tutorialPending;persist();render();}
function episodeView(){if(state.tutorialPending)return playGuideView();return `<button class="episode-cover" data-action="episodeNext"><small>EPISODE ${String(state.episode).padStart(2,'0')}</small><span class="episode-rule"></span><h1>${esc(EPISODES[state.episode-1])}</h1><p>${['처음 만난 세 사람, 아직 모르는 마음.','약속 하나씩, 서로 다른 하루.','네 사람이 함께 떠나는 첫 바다.','한 우산 아래, 선택한 사람.','가까워진 만큼, 아직 몰랐던 마음.','보고서 밖에 남기고 싶은 시간.','연구가 끝난 뒤에도 이어질 수 있을까.'][state.episode-1]}</p><span>클릭해서 시작하기 →</span></button>`;}
// Extras speak alone. Conflict reactions stay with the heroine in this route.
function storyCastView(speaker,emotion='neutral'){
 const extra=({'식당 주인':'owner','준호':'student','행사 학생':'organizer'})[speaker];
 if(extra)return `<img class="extra-standing" src="/assets/extras/${extra}.png" alt="${esc(speaker)}">`;
 const conflict=/^(conflict-|repair-choice)/.test(state.nodeId||'');
 const heroine=state.routeHero||state.episodeHero;
 const cast=conflict&&HEROES[heroine]?[heroine]:state.extra?['white','black','red']:state.cast;
 return castView(cast,speaker,emotion);
}
function cgArtwork(moment,artOnly=false){return `<div class="special-scene ${artOnly?'cg-art-only':'cg-art-layer'}"><img class="special-art" src="${esc(moment.image)}" alt="${esc(HEROES[moment.hero].name+' · '+moment.title)}">${artOnly?'<button class="cg-image-hit" data-action="advance" aria-label="일러스트에 대화 표시"></button>':''}</div>`;}
function storyView(){
 const l=state.script[state.line],moment=MOMENTS[l.moment];
 if(moment&&l.cgMode==='art')return cgArtwork(moment,true);
 if(moment&&l.cgMode!=='dialogue')return specialMomentView(moment);
 return `${moment?cgArtwork(moment):storyCastView(l.speaker,l.emotion||'neutral')}<button class="story-hit" data-action="advance" aria-label="다음 대사"></button>${dialogueView(l.speaker,text(l.text),'<button class="story-back" data-action="readBack" title="← 또는 Backspace">← 이전 대사</button><button class="advance" data-action="advance">CLICK TO CONTINUE <span>◇</span></button>',moment?'cg-dialogue':'')}`;
}
function selectView(kind){
 const meet=kind==='meet',personal=kind==='personal',rain=kind==='rain';
 const heading=meet?'누구와 먼저 대화해 볼까?':personal?'오늘은 누구와 시간을 보낼까?':rain?'누구에게 우산을 가져갈까?':'누구와 함께할까?';
 const sub=meet?'서두르지 않고, 한 사람씩 알아가 보자.':personal?'처음 나눈 약속을, 한 사람씩 지켜 가는 며칠.':rain?'찾아가고 싶은 한 사람. 이 선택부터 둘만의 이야기가 시작돼요.':'함께할 사람을 골라 보자.';
 return `<div class="selection-overlay">${meet||personal?'<button class="selection-skip" data-action="requestSkip" title="이 구간을 건너뛰고 시나리오 진행">스킵 <span aria-hidden="true">≫</span></button>':''}<div class="section-heading"><small>${rain?'UNDER ONE UMBRELLA':personal?'A DAY FOR TWO':meet?'FIRST CONVERSATION':'OUR STORY'}</small><h2>${heading}</h2><p>${sub}</p></div><div class="hero-grid">${Object.values(HEROES).map(h=>{const completed=meet&&state.done.includes(h.id)||personal&&state.personalDone.includes(h.id);return `<button class="hero-card" style="--hero:${h.color};--hero-secondary:${h.secondaryColor}" data-action="chooseHero" data-id="${h.id}" data-kind="${kind}" ${completed?'disabled':''}><div class="portrait"><img src="${esc(sprite(h.id))}" alt="${h.name}"></div><div class="card-body"><span class="card-code">${h.code} / HUMANOID</span><div class="card-name">${h.fullName}<span>↗</span></div><small class="japanese-name" lang="ja">${h.japaneseName}</small><p class="hero-role">${h.role}</p><p>${personal?({black:'소품 가게까지, 처음 약속했던 산책',white:'안내도에는 없는 옥상의 바람',red:'사람이 줄어든 저녁 길'})[h.id]:rain?({black:'버스 정류장에서 기다리는 시오리',white:'도서관 입구에서 비를 보는 린카',red:'작은 가게 앞에서 답장을 기다리는 네무'})[h.id]:h.subtitle}</p><span class="card-status">${completed?(personal?'함께한 하루 완료':'첫 대화 완료'):rain?'우산을 들고 찾아가기':personal?'둘만의 시간 보내기':meet?'이야기 시작하기':'함께하기'}</span></div></button>`;}).join('')}</div></div>`;
}
function narrativeChoiceView(){const moment=MOMENTS[choiceIllustration(state)];return `${moment?cgArtwork(moment):storyCastView(state.routeHero||state.episodeHero)}<div class="narrative-choice"><div class="choice-heading"><small>${esc(state.chapterTitle)}</small><h2>${esc(state.choicePrompt)}</h2></div><div class="choice-list">${choiceOptions(state).map((o,i)=>`<button class="choice-option" data-action="narrativeChoice" data-index="${i}"><small>0${i+1}</small><span>${esc(text(o.text))}</span></button>`).join('')}</div></div>`;}

function chatView(){const p=state.profiles[state.active],last=state.lastChatInput||'',note=chatError||(prefs.mode==='demo'?'체험 대화 · 취향이나 생각을 물어보세요. 실제 AI 연결은 설정에서 전환할 수 있어요.':'');return `${!state.chatClosed?`<button class="selection-skip chat-skip" data-action="requestSkip" ${busy?'disabled':''}>스킵 <span aria-hidden="true">≫</span></button>`:''}${castView([state.active],state.active,state.emotion)}${dialogueView(state.active,busy?'답변을 기다리고 있어요…':state.reply,`${last?`<div class="last-message">${esc(state.name)} · ${esc(last)}</div>`:''}${state.chatClosed?'<div class="end-chat"><button class="button secondary" data-action="endChat">이야기 이어가기 →</button></div>':`<form class="chat-form" id="chat-form"><input id="chat-input" aria-label="${HEROES[state.active].name}에게 할 말" placeholder="하고 싶은 말을 적어 주세요…" maxlength="500" autocomplete="off" value="${esc(draft)}" ${busy?'disabled':''}><button class="send" type="submit" ${busy?'disabled':''}>${busy?'<span class="loading-dots">기다리는 중</span>':`전송 ${icon('send')}`}</button></form>${note?`<p class="chat-note ${chatError?'error':''}" role="${chatError?'alert':'note'}">${esc(note)}</p>`:''}`}`,'chat-dialogue')}`;}
function endingInfo(id){return (state.storyRevision===4?MODERN_ENDINGS:ENDINGS)[id];}
function finalView(){const yes=canPreserve(state),h=HEROES[state.active];if(state.storyRevision===4){
 const repaired=state.flags.memoryRepairComplete===true;
 if(!repaired)return `<div class="reset-overlay"><div class="reset-panel"><div class="reset-header">${icon('warning')} RELATION MEMORY / FINAL DECISION</div><h2>이 기억을 이어갈까요?</h2><p>함께한 시간을 지키는 수정안을 적용할지 정합니다.</p><button class="reset-option preserve" data-action="preserve" ${yes?'':'disabled'}><strong>함께한 기억을 지킨다</strong><small>${yes?'관계 기록을 토대로 수정안을 적용하고, 다음 시간을 함께합니다.':'아직 마음과 풀리지 않은 이야기를 충분히 확인하지 못했어요. 옥상 전 저장에서 다시 이야기할 수 있어요.'}</small></button><button class="reset-option" data-action="reset"><strong>관계 기억의 초기화를 승인한다</strong><small>세 사람은 함께한 관계를 잊고, 연구는 마무리됩니다.</small></button></div></div>`;
 return `<div class="reset-overlay"><div class="reset-panel"><div class="reset-header">${icon('heart')} FOLLOW-UP STUDY / THREE YEARS</div><h2>앞으로도, 함께.</h2><p>세 사람 모두 기억을 지켰습니다.<br>함께 사는 건 서로의 마음으로 정할 수 있어요.</p><button class="reset-option preserve" data-action="preserve" ${yes?'':'disabled'}><strong>${h.name}와 함께 살아 본다</strong><small>함께 사는 집에서, 새로운 아침을 맞이합니다.</small></button><button class="reset-option" data-action="normal" ${yes?'':'disabled'}><strong>각자의 생활로 돌아간다</strong><small>동거와 후속 연구를 거절하고, 이번 연구를 마무리합니다.</small></button></div></div>`;
 };return `<div class="reset-overlay"><div class="reset-panel"><div class="reset-header">${icon('warning')} RELATION MEMORY / FINAL DECISION</div><h2>무엇을 남길 것인가.</h2><p>기본 성격은 유지됩니다.<br>당신과 함께한 관계의 기억은, 이 결정에 달려 있습니다.</p><button class="reset-option preserve" data-action="preserve" ${yes?'':'disabled'}><strong>${h.name}의 기억을 보존한다</strong><small>${yes?'함께한 기억을 보존하고 다음 약속을 이어갑니다. 다른 두 기체는 관계 기억을 초기화합니다.':'서로의 마음과 풀리지 않은 이야기를 확인하지 못했습니다. 마지막 대화 전 저장으로 돌아가 다시 이야기할 수 있어요.'}</small></button><button class="reset-option" data-action="reset"><strong>전원 초기화를 승인한다</strong><small>세 기체 모두 당신과 형성한 관계를 잊습니다. 연구는 종료됩니다.</small></button></div></div>`;}
function endingView(){const e=endingInfo(state.ending);return `<div class="ending-screen"><div class="ending-content"><div><small>${e.tag}</small><h2>${e.title}</h2><p>${state.storyRevision===4?e.subtitle:(state.ending==='bad'?'기록은 남았다. 관계는 지워졌다.':'지켜 낸 기억으로 이어 가는, 다음 약속.')}</p></div><div class="ending-actions"><button class="button" data-action="loadDecision" ${saved('decision')?'':'disabled'}>마지막 결정으로</button><button class="button" data-action="gallery">기억의 순간</button><button class="button" data-action="home">타이틀로</button></div></div></div>`;}
function readingKey(){if(state.phase!=='story')return null;const l=state.script[state.line];return JSON.stringify([state.runId,state.nodeId,state.after,state.line,l.speaker,l.text,l.moment]);}
function readPrevious(){if(busy||state.phase==='title'||state.tutorialPending)return;if(!readback.back(readingKey()))return toast('더 이전에 읽은 대사가 없어요.');render();}
function resumeReading(){readback.resume();render();}
function readbackView(frame){
 document.documentElement.style.setProperty('--character-color',frame.color);
 document.documentElement.style.setProperty('--character-panel',frame.panel);
 renderWithStandingReuse(app,frame.html,poseLoader);
 app.dataset.phase='readback';
}
function render({focus=false}={}){
 clearTimeout(typedTimer);typing=false;
 const previous=readback.current();if(previous){readbackView(previous);return;}
 if(state.phase==='story'&&state.script[state.line]?.moment)rememberMoment(state,state.script[state.line].moment);
 const newMoments=syncMomentUnlocks();
 app.dataset.phase=state.phase;
 const speaking=state.phase==='story'?state.script[state.line]?.speaker:state.active||state.dateHero;
 const theme=HEROES[speaking];
 document.documentElement.style.setProperty('--character-color',theme?.color||'#b15a83');
 document.documentElement.style.setProperty('--character-panel',theme?.panelColor||'#9e7395');
 document.documentElement.style.setProperty('--body-size',`${prefs.textSize}px`);
 const views={episode:episodeView,title:titleView,story:storyView,selectMeet:()=>selectView('meet'),selectPersonal:()=>selectView('personal'),selectRain:()=>selectView('rain'),choice:narrativeChoiceView,chat:chatView,final:finalView,ending:endingView};
 const html=shell((views[state.phase]||titleView)());
 if(state.phase==='story')readback.capture(readingKey(),{html,color:theme?.color||'#b15a83',panel:theme?.panelColor||'#9e7395'});
 renderWithStandingReuse(app,html,poseLoader);
 for(const image of app.querySelectorAll('.cast img[data-hero]')){preloadHero(image.dataset.hero);poseLoader.preload(image.getAttribute('src')).catch(()=>{});}
 syncMusic();
 if(state.phase==='story'&&(!state.script[state.line]?.moment||state.script[state.line]?.cgMode==='dialogue')&&prefs.speed>0){const el=document.querySelector('#dialogue-text');fullText=text(state.script[state.line].text);el.textContent='';currentText=el;typing=true;let pos=0;const type=()=>{if(!el.isConnected)return;pos++;el.textContent=fullText.slice(0,pos);if(pos<fullText.length)typedTimer=setTimeout(type,prefs.speed);else typing=false;};type();}
 if(newMoments.length&&!(state.phase==='story'&&state.script[state.line]?.cgMode==='art'))toast('새로운 일러스트를 기억의 순간에 저장했어요.');
 if(focus)document.querySelector('#chat-input')?.focus({preventScroll:true});
}
function phase(value){state.phase=value;chatError='';draft='';persist();render();}
function recordLine(){const l=state.script[state.line];if(l.bg)state.sceneBg=l.bg;if(l.cast)state.cast=l.cast;state.history.push({speaker:speakerName(l.speaker),text:text(l.text)});}
function story(lines,after){state.cast=[];setScript(state,lines,after);recordLine();persist();render();}
function advance(){if(state.tutorialPending){finishPlayGuide();return;}if(readback.forward(readingKey())){render();return;}if(state.phase==='episode'){advanceEpisode(state);persist();render();return;}if(state.phase!=='story'||busy)return;if(typing){clearTimeout(typedTimer);currentText.textContent=fullText;typing=false;return;}if(state.after?.startsWith('flow:')){advanceNarrative(state);persist();render();return;}if(state.line<state.script.length-1){state.line++;recordLine();persist();render();return;}if(state.after==='meet')phase('selectMeet');else if(state.after==='end')finishEnding();}
function beginChat(id){preloadHero(id);state.active=id;state.cast=[id];state.chatStage='meet';state.chatReturn=null;state.lastChatInput='';state.chapterTitle='처음 만나는 마음';state.emotion='neutral';state.chatClosed=false;state.reply=text(GREETINGS[id]);state.sceneBg=bg('연구실_낮');state.intent=false;state.profiles[id].messages.push({role:'assistant',content:state.reply});state.history.push({speaker:HEROES[id].name,text:state.reply});phase('chat');}
async function sendChat(event){event.preventDefault();if(busy||state.phase!=='chat'||state.chatClosed)return;const input=document.querySelector('#chat-input');draft=input.value;const value=draft.trim();if(!value)return;if(!playerSession?.consent){await showConsent();return;}busy=true;chatError='';render();const p=state.profiles[state.active];
 try{const request={mode:prefs.mode,hero:state.active,name:state.name,stage:state.chatStage,turn:chatTurns(state),score:p.score,text:value,messages:p.messages,memory:p.memory,dated:state.dateHero===state.active||state.chatStage==='personal',routeLocked:!!state.routeHero,relationshipReady:state.storyRevision===4?p.relationship.repairState==='resolved':!state.routeHero||state.flags.repaired===true,storyRevision:state.storyRevision,events:state.storyRevision===4?p.events:{}};const signature=JSON.stringify(request);if(state.pendingChat?.signature!==signature)state.pendingChat={signature,messageId:crypto.randomUUID()};persist();request.logging={runId:state.runId,messageId:state.pendingChat.messageId,storyRevision:state.storyRevision||1,episode:state.episode||0,nodeId:state.nodeId||state.chatStage};const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':playerSession.csrf},body:JSON.stringify(request),signal:AbortSignal.timeout(55000)});const result=await response.json();if(!response.ok){if(result.consentRequired)playerSession.consent=false;throw Error(result.error||'대화 연결에 실패했어요.');}if(!result.reply||typeof result.reply!=='string')throw Error('답변 형식을 읽지 못했어요. 다시 시도해 주세요.');applyChat(state,value,result);delete state.pendingChat;draft='';if(state.chatClosed){state.reply+='\n\n'+(state.storyRevision===4&&state.chatStage==='roof'?sceneClosing(state):['meet','roof'].includes(state.chatStage)?text(conversationClosing(state.active,state.chatStage,canPreserve(state))):sceneClosing(state));p.messages[p.messages.length-1].content=state.reply;state.history[state.history.length-1].text=state.reply;}persist();
 }catch(e){chatError=e.name==='TimeoutError'?'답변이 늦어지고 있어요. 입력은 남아 있으니 다시 전송해 주세요.':e.message;}finally{busy=false;render({focus:!state.chatClosed});}}
function endChat(){if(!state.chatClosed)return;if(state.chatReturn){endSceneChat(state);if(state.phase==='final')store('-decision',state);persist();render();return;}if(state.chatStage!=='meet')return;if(!state.done.includes(state.active))state.done.push(state.active);addEvent(state,state.active,'연구실에서 서로 처음 알아가는 대화를 나눴다.');state.active=null;state.chatStage=null;state.cast=[];if(state.done.length===3){enterNode(state,state.storyRevision===4?'meeting-end':'lunch');persist();render();}else phase('selectMeet');}
function chooseEnding(id){
 if(busy)return;
 if(state.storyRevision===4){if(chooseFinal(state,id==='bad'?'reset':id==='normal'?'normal':'preserve')){persist();render();}return;}
 if(id!=='bad'&&!canPreserve(state))return;state.ending=id;const e=endingInfo(id);
 story(e.lines.map(([speaker,text],i)=>({speaker,text,...(i===0?{bg:e.image,cast:[]}:{} )})),'end');
}
function finishEnding(){if(!unlocks.includes(state.ending)){unlocks.push(state.ending);store('-unlocks',unlocks);}state.sceneBg=endingInfo(state.ending).image;phase('ending');}
function openModal(title,body){modal.classList.remove('gallery-modal','memory-image-modal');modal.innerHTML=`<div class="modal-head">${['기억 저장하기','기억 불러오기','기억 로그','기억의 순간'].includes(title)?'<button class="modal-back" data-action="settings" aria-label="설정으로 돌아가기">←</button>':''}<h2>${title}</h2><button class="close-modal" data-action="close" aria-label="닫기">×</button></div><div class="modal-body">${body}</div>`;if(!modal.open)modal.showModal();}
function closeModal(){pendingSaveDelete=null;modal.close();}
function newPrompt(){openModal('첫 번째 관찰 기록',`<div class="name-intro"><small>BEFORE WE MEET</small><p>당신을 어떻게<br>불러 드리면 될까요?</p></div><form id="name-form" class="name-form"><label for="player-name">연구 담당자 이름</label><input id="player-name" name="name" maxlength="12" placeholder="이름을 입력해 주세요" autocomplete="off" required><button class="button" type="submit">이야기 시작하기 →</button></form><p class="muted">${saved()?'새 이야기를 시작하면 자동 저장이 갱신됩니다. 기존 진행은 저장 슬롯에 남길 수 있어요.':'함께 나눈 대화는 이 브라우저에 저장됩니다.'}</p>`);setTimeout(()=>document.querySelector('#player-name')?.focus(),50);}
function affinitySummary(s){if(!s)return '';return `<div class="slot-affinities" aria-label="저장 당시 호감도">${Object.values(HEROES).map(h=>`<div class="slot-affinity" style="--hero:${h.color}"><span>${h.name}${s.routeHero===h.id?'<em>메인</em>':''}</span><strong>${Math.round(s.profiles[h.id].score)}<small> / 100</small></strong><div class="affinity-track" role="meter" aria-label="${h.name} 호감도" aria-valuenow="${Math.round(s.profiles[h.id].score)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${s.profiles[h.id].score}%"></i></div></div>`).join('')}</div>`;}
function saveLabel(s){return s?`${esc(s.name)} · ${new Date(s.updatedAt).toLocaleString('ko-KR')}<br>${esc(progressLabel(s))}${s.routeHero?` · ${esc(HEROES[s.routeHero].name)} 루트`:''}`:'아직 저장된 기억이 없습니다.';}
function slotCard(slot,mode){const value=saved(slot),present=hasSaveSlot(slot),disabled=mode==='save'&&state.phase==='title'||mode==='load'&&!value;return `<article class="save-slot ${!value?'empty-slot':''}" data-slot-card="${slot}"><div class="slot-head"><div><strong>${saveSlotLabel(slot)}</strong><p>${present&&!value?'읽을 수 없는 저장입니다. 삭제한 뒤 다시 저장할 수 있어요.':saveLabel(value)}</p></div><div class="slot-actions"><button class="button secondary" data-action="${mode==='save'?'saveSlot':'loadSlot'}" data-slot="${slot}" ${disabled?'disabled':''}>${mode==='save'?(value?'덮어쓰기':'저장'):'불러오기'}</button>${present?`<button class="button secondary slot-delete" data-action="deleteSlot" data-slot="${slot}" data-mode="${mode}" aria-label="${saveSlotLabel(slot)} 삭제">삭제</button>`:''}</div></div>${affinitySummary(value)}${value?.storyRevision===4&&value.routeHero?`<p class="slot-help">관계 상태 · ${{resolved:'서로 마음을 확인함',partial:'아직 남은 이야기',unresolved:'풀리지 않은 이야기'}[value.profiles[value.routeHero].relationship.repairState]}</p>`:''}</article>`;}
function slots(mode){pendingSaveDelete=null;openModal(mode==='save'?'기억 저장하기':'기억 불러오기',`${state.phase!=='title'?`<section class="current-save-status"><small>현재 진행 · ${esc(progressLabel(state))}</small>${affinitySummary(state)}</section>`:''}<p class="slot-help">각 슬롯의 호감도는 저장한 순간의 기록이에요. 불러오면 그 시점의 대화와 선택으로 돌아가요.</p>${(mode==='load'?['auto',1,2,3,...(['roof','decision'].filter(hasSaveSlot))]:[1,2,3]).filter(slot=>mode==='load'||slot!=='auto').map(slot=>slotCard(slot,mode)).join('')}`);}
function hasSaveSlot(slot){try{return readSaveSlot(localStorage,slot)!==null;}catch{return false;}}
function requestDeleteSave(slot,mode='load'){
 if(busy||!SAVE_SLOTS.includes(String(slot)))return;
 const returnMode=mode==='save'?'save':'load';
 try{
  const snapshot=readSaveSlot(localStorage,slot);
  if(snapshot===null){slots(returnMode);return toast('이미 비어 있는 슬롯이에요.');}
  pendingSaveDelete={slot:String(slot),mode:returnMode,snapshot};
  const value=saved(slot),regenerates=state.phase!=='title'&&(slot==='auto'||slot==='decision'&&state.phase==='final');
  openModal('이 세이브를 삭제할까요?',`<p><strong>${saveSlotLabel(slot)}</strong>에 저장된 진행을 삭제합니다. 삭제한 세이브는 복구할 수 없어요.</p><div class="save-slot"><p>${value?saveLabel(value):'읽을 수 없는 저장 데이터'}</p>${affinitySummary(value)}</div><p class="muted">현재 플레이, 다른 슬롯, 해금한 일러스트와 설정은 유지돼요.</p>${regenerates?'<p class="slot-help">플레이를 계속하면 이 자동 기록은 다시 만들어질 수 있어요.</p>':''}<div class="confirm-actions"><button class="button secondary" data-action="cancelDeleteSave">취소</button><button class="button slot-delete" data-action="confirmDeleteSave">세이브 삭제</button></div>`);
 }catch{pendingSaveDelete=null;toast('브라우저 저장소에 접근하지 못했어요. 다시 시도해 주세요.');}
}
function cancelDeleteSave(){const mode=pendingSaveDelete?.mode||'load';pendingSaveDelete=null;slots(mode);}
function confirmDeleteSave(){
 if(busy||!modal.open||!pendingSaveDelete)return;
 const {slot,mode,snapshot}=pendingSaveDelete;
 try{
  const result=removeSaveSlot(localStorage,slot,snapshot);
  if(result==='changed'){requestDeleteSave(slot,mode);toast('다른 창에서 저장이 바뀌었어요. 새 내용을 확인해 주세요.');return;}
  pendingSaveDelete=null;render();slots(mode);
  toast(result==='deleted'?`${saveSlotLabel(slot)}을 삭제했어요.`:'이미 비어 있는 슬롯이에요.');
 }catch{toast('삭제하지 못했어요. 브라우저 저장소를 확인해 주세요.');}
}
function requestSave(slot){if(state.phase==='title'||busy||![1,2,3].includes(Number(slot)))return;const existing=saved(slot);if(existing){openModal('이 기억을 덮어쓸까요?',`<p>기억 ${String(slot).padStart(2,'0')}의 기존 진행을 현재 진행으로 바꿉니다.</p><div class="save-slot"><p>${saveLabel(existing)}</p>${affinitySummary(existing)}</div><div class="confirm-actions"><button class="button secondary" data-action="save">취소</button><button class="button" data-action="confirmSave" data-slot="${slot}">현재 진행으로 덮어쓰기</button></div>`);}else writeSave(slot);}
function writeSave(slot){if(state.phase==='title'||![1,2,3].includes(Number(slot)))return;state.updatedAt=Date.now();state.chatDraft=draft;if(store('-'+slot,state)){toast('현재 진행과 호감도를 저장했어요.');slots('save');}}
function loadSlot(slot,confirmed=false){if(!['auto','roof','decision','1','2','3',1,2,3].includes(slot))return;const value=saved(slot);if(!value)return toast('저장한 기억을 읽지 못했어요.');if(state.phase!=='title'&&!confirmed){openModal('이 기억을 불러올까요?',`<p>현재 화면에서 저장한 시점으로 돌아갑니다. 대화와 호감도도 함께 돌아가요.</p><p>${saveLabel(value)}</p>${affinitySummary(value)}<div class="confirm-actions"><button class="button secondary" data-action="load">취소</button><button class="button" data-action="confirmLoad" data-slot="${slot}">이 기억 불러오기</button></div>`);return;}readback.reset();state=value;draft=state.chatDraft||'';chatError='';closeModal();if(state.resumeNode){const node=state.resumeNode;delete state.resumeNode;enterNode(state,node);toast('기존 기억과 호감도를 유지하며 새 에피소드로 이어져요.');}else toast('기억을 불러왔어요.');persist();render();}

function settings(){openModal('설정',`<nav class="settings-actions" aria-label="게임 메뉴"><button class="button secondary" data-action="consentInfo">대화 기록 안내</button><button class="button secondary" data-action="save" ${state.phase==='title'||busy?'disabled':''}>${icon('save')}저장</button><button class="button secondary" data-action="load" ${busy?'disabled':''}>${icon('load')}불러오기</button><button class="button secondary" data-action="log" ${busy?'disabled':''}>${icon('log')}기억 로그</button><button class="button secondary" data-action="gallery" ${busy?'disabled':''}>${icon('heart')}기억의 순간</button><button class="button secondary" data-action="sound" aria-label="음악 ${prefs.sound?'끄기':'켜기'}" aria-pressed="${prefs.sound}">${icon(prefs.sound?'sound':'mute')}음악 ${prefs.sound?'끄기':'켜기'}</button><button class="button secondary" data-action="full">${icon('full')}전체 화면</button><button class="button secondary" data-action="home" ${state.phase==='title'||busy?'disabled':''}>${icon('home')}메인 화면</button></nav><div class="settings-row"><div><label for="mode">대화 방식</label><small>체험 모드는 정해진 반응으로 진행합니다.</small></div><select id="mode" data-setting="mode"><option value="demo" ${prefs.mode==='demo'?'selected':''}>체험 모드</option><option value="live" ${prefs.mode==='live'?'selected':''} ${status.liveReady?'':'disabled'}>AI 자유대화</option></select></div><div class="settings-row"><label for="volume">타이틀 음악</label><input aria-label="타이틀 음악 크기" id="volume" type="range" min="0" max="1" step=".01" value="${prefs.volume}" data-setting="volume"></div><div class="settings-row"><label for="speed">대사 표시</label><select id="speed" data-setting="speed"><option value="30" ${prefs.speed===30?'selected':''}>천천히</option><option value="18" ${prefs.speed===18?'selected':''}>보통</option><option value="0" ${prefs.speed===0?'selected':''}>즉시 표시</option></select></div><div class="settings-row"><label for="textSize">글자 크기</label><select id="textSize" data-setting="textSize"><option value="18" ${prefs.textSize===18?'selected':''}>작게</option><option value="20" ${prefs.textSize===20?'selected':''}>보통</option><option value="23" ${prefs.textSize===23?'selected':''}>크게</option></select></div><p class="settings-info">${status.liveReady?'AI 연결 준비가 되어 있어요. AI 자유대화를 선택하면 실제 모델에 대화가 전달됩니다.':'AI 연결 키가 아직 없어요. 게임 폴더의 .env.example을 .env.local로 복사한 뒤 OPENAI_API_KEY에 OpenAI 키를 넣고 게임을 다시 실행하면 AI 자유대화를 사용할 수 있어요.'}<br>체험 모드에서도 첫 만남부터 세 갈래 엔딩까지 플레이할 수 있어요.</p>`);}
function logView(id='black',tab='memory'){const p=state.profiles[id];let body;if(tab==='all')body=`<div class="transcript">${state.history.length?state.history.map(x=>`<p><strong>${esc(speakerName(x.speaker))}</strong>${esc(x.text)}</p>`).join(''):'<p class="empty">아직 나눈 이야기가 없어요.</p>'}</div>`;else body=`<div class="log-identity"><strong>${HEROES[id].fullName}</strong><span lang="ja">${HEROES[id].japaneseName}</span><small>${HEROES[id].code} · ${HEROES[id].role}</small></div><p>${HEROES[id].description}</p>${p.memory.preferences.map(x=>`<div class="memory-item"><small>알게 된 취향</small><p>${esc(x)}</p></div>`).join('')}${p.memory.facts.map(x=>`<div class="memory-item"><small>그 사람이 기억하는 나 · ${esc({favorite_drink:'좋아하는 음료',favorite_activity:'좋아하는 활동',promise:'약속',player_fact:'나에 대한 이야기'}[x.key]||'기억')}</small><p>${esc(x.value)}</p></div>`).join('')}${p.memory.events.map(x=>`<div class="memory-item"><small>함께한 순간</small><p>${esc(x)}</p></div>`).join('')}${!p.memory.events.length&&!p.memory.facts.length&&!p.memory.preferences.length?'<div class="empty">아직 빈 페이지예요.<br>직접 이야기를 나누며 채워 보세요.</div>':''}`;openModal('기억 로그',`<div class="log-tabs">${Object.values(HEROES).map(h=>`<button class="log-tab ${id===h.id&&tab!=='all'?'active':''}" data-action="logTab" data-id="${h.id}">${h.name}</button>`).join('')}<button class="log-tab ${tab==='all'?'active':''}" data-action="transcript">대화 기록</button></div>${body}`);}
function gallery(filter=galleryFilter){
 syncMomentUnlocks();galleryFilter=['all','black','white','red','endings'].includes(filter)?filter:'all';
 const tabs=[['all','전체'],...Object.values(HEROES).map(h=>[h.id,h.name]),['endings','엔딩']];
 const selected=Object.values(MOMENTS).filter(m=>galleryFilter==='all'||m.hero===galleryFilter);
 const specials=galleryFilter==='endings'?'':`<h3 class="gallery-section-title">함께한 특별한 순간 <small>${momentUnlocks.length} / ${Object.keys(MOMENTS).length}</small></h3><div class="gallery-grid moments-grid">${selected.map(m=>momentUnlocks.includes(m.id)?`<button class="gallery-card" data-action="momentImage" data-id="${m.id}"><img src="${esc(m.image)}" alt="${esc(HEROES[m.hero].name+' · '+m.title)}" loading="lazy"><div class="memory-card-copy"><small>${HEROES[m.hero].name} · ${MOMENT_CATEGORIES[m.category]}</small><strong>${esc(m.title)}</strong></div></button>`:`<div class="gallery-card locked moment-locked"><span aria-hidden="true">◇</span><strong>${HEROES[m.hero].name} · ${MOMENT_CATEGORIES[m.category]}</strong><p>${esc(m.hint)}</p></div>`).join('')}</div>`;
 const endings=['all','endings'].includes(galleryFilter)?`<h3 class="gallery-section-title">이야기의 끝에서 <small>${unlocks.filter(id=>MODERN_ENDINGS[id]).length} / ${Object.keys(MODERN_ENDINGS).length}</small></h3><div class="gallery-grid moments-grid">${Object.entries(MODERN_ENDINGS).map(([id,e])=>unlocks.includes(id)?`<button class="gallery-card" data-action="galleryImage" data-id="${id}"><img src="${e.image}" alt="${e.title}" loading="lazy"><strong>${e.title}</strong></button>`:'<div class="gallery-card locked"><strong>◇ &nbsp; 아직 만나지 못한 엔딩</strong></div>').join('')}</div>`:'';
 openModal('기억의 순간',`<p>한 번 본 일러스트는 새 이야기나 다른 저장을 불러와도 이 브라우저에 남아요.</p><nav class="log-tabs" aria-label="일러스트 분류">${tabs.map(([id,label])=>`<button class="log-tab ${galleryFilter===id?'active':''}" data-action="galleryFilter" data-filter="${id}" aria-pressed="${galleryFilter===id}">${label}</button>`).join('')}</nav>${specials}${endings}`);modal.classList.add('gallery-modal');
}
function showMemoryImage(id,ending=false){
 const item=ending?MODERN_ENDINGS[id]:MOMENTS[id],available=ending?unlocks.includes(id):momentUnlocks.includes(id);if(!item||!available)return;
 openModal(ending?item.title:`${HEROES[item.hero].name} · ${item.title}`,`<button class="memory-back" data-action="gallery">← 기억의 순간 목록</button><figure class="memory-image"><img src="${esc(item.image)}" alt="${esc(item.title)}"><figcaption>${esc(ending?item.tag:item.caption)}</figcaption></figure>`);modal.classList.add('memory-image-modal');
}
function requestSkip(){
 if(busy||!['selectMeet','selectPersonal','chat'].includes(state.phase)||state.phase==='chat'&&state.chatClosed)return;
 const scope=state.phase==='selectMeet'?'남은 첫 1:1 자유대화를 모두 건너뛰고 다음 에피소드로 이동합니다.':state.phase==='selectPersonal'?'아직 진행하지 않은 개인 외출과 자유대화를 건너뜁니다. 새 이야기는 네 사람이 함께 떠나는 바다부터 이어집니다.':state.chatStage==='roof'?'남은 마지막 자유대화를 건너뛰고 관계를 확인하는 고정 이야기로 이어갑니다.':'현재 히로인과의 남은 자유대화를 건너뛰고 다음 장면으로 이동합니다.';
 const caution=state.chatStage==='repair'?'아직 풀지 못한 갈등이 있다면 그대로 남습니다.':state.chatStage==='roof'?(state.storyRevision===4?'다음 화면에서 앞으로의 관계를 선택지로 직접 전할 수 있어요.':'관계에 대한 마음을 전하지 않았다면 엔딩 조건을 충족하지 못할 수 있습니다.'):'이후 관계와 엔딩 결과에 영향을 줄 수 있습니다.';
 openModal('정말 스킵하시겠습니까?',`<p>${scope}</p><div class="skip-warning"><strong>${icon('warning')}호감도를 쌓을 기회가 줄어들어요</strong><p>지금까지 쌓은 호감도와 기억은 유지되지만, 건너뛴 구간에서는 호감도를 더 쌓거나 새로운 대화 기억을 남길 수 없습니다.</p><p>${caution}</p></div>${draft.trim()?'<p class="muted">아직 보내지 않은 입력 내용은 스킵하면 사라집니다.</p>':''}<div class="confirm-actions"><button class="button secondary" data-action="close">계속 플레이</button><button class="button" data-action="confirmSkip">스킵하고 진행</button></div>`);
}
function home(){if(busy)return toast('답변을 받은 뒤 이동할 수 있어요.');if(state.phase==='title')return;openModal('메인 화면으로 돌아갈까요?',`<p>현재 진행과 세 사람의 호감도를 자동 저장한 뒤 메인 화면으로 이동해요.</p><p class="muted">입력 중인 대화도 초안으로 남겨요. 메인 화면의 ‘이어서 하기’에서 다시 시작할 수 있어요. 수동 저장 슬롯은 그대로 유지됩니다.</p><div class="confirm-actions"><button class="button secondary" data-action="close">계속 플레이</button><button class="button" data-action="confirmHome">저장하고 메인으로</button></div>`);}
function returnHome(skipSave=false){if(busy||state.phase==='title')return;if(!skipSave&&!persist()){openModal('자동 저장하지 못했어요',`<p>브라우저 저장 공간에 기록하지 못했어요. 계속 플레이하거나, 저장하지 않고 메인 화면으로 돌아갈 수 있어요.</p><div class="confirm-actions"><button class="button secondary" data-action="close">계속 플레이</button><button class="button danger" data-action="homeWithoutSave">저장하지 않고 나가기</button></div>`);return;}readback.reset();state=newGame();draft='';chatError='';closeModal();render();}


function retryTitleAutoplay(event){if(!event.isTrusted||event.target.closest?.('[data-action="sound"]'))return;syncMusic();}
document.addEventListener('pointerdown',retryTitleAutoplay,{capture:true});
document.addEventListener('keydown',retryTitleAutoplay,{capture:true});

document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button||button.disabled)return;const a=button.dataset.action;if(busy&&!['settings','close','sound','full'].includes(a))return;switch(a){
 case 'new':newPrompt();break;
 case 'continue':slots('load');break;
 case 'advance':advance();break;
 case 'readBack':readPrevious();break;
 case 'reviewResume':resumeReading();break;
 case 'episodeNext':advance();break;
 case 'tutorialNext':finishPlayGuide();break;
 case 'consentInfo':showConsent();break;
 case 'consentAccept':setConsent(true);break;
 case 'consentDecline':setConsent(false);break;
 case 'narrativeChoice':if(chooseNarrative(state,Number(button.dataset.index))){persist();render();}break;
 case 'requestSkip':requestSkip();break;
 case 'confirmSkip':if(modal.open&&skipConversation(state)){closeModal();draft='';chatError='';if(state.phase==='final')store('-decision',state);persist();render();}break;
 case 'chooseHero':{const {id,kind}=button.dataset;if(!HEROES[id])break;if(kind==='personal'){if(selectPersonal(state,id)){preloadHero(id);persist();render();}break;}if(kind==='rain'){if(selectRain(state,id)){preloadHero(id);persist();render();}break;}if(kind==='meet')beginChat(id);break;}
 case 'endChat':endChat();break;
 case 'preserve':chooseEnding(state.active);break;
 case 'reset':chooseEnding('bad');break;
 case 'normal':chooseEnding('normal');break;
 case 'save':slots('save');break;
 case 'load':slots('load');break;
 case 'deleteSlot':requestDeleteSave(button.dataset.slot,button.dataset.mode);break;
 case 'cancelDeleteSave':cancelDeleteSave();break;
 case 'confirmDeleteSave':confirmDeleteSave();break;
 case 'saveSlot':requestSave(button.dataset.slot);break;
 case 'confirmSave':writeSave(button.dataset.slot);break;
 case 'loadSlot':loadSlot(button.dataset.slot);break;
 case 'confirmLoad':loadSlot(button.dataset.slot,true);break;
 case 'loadDecision':loadSlot('decision');break;
 case 'settings':settings();break;
 case 'close':closeModal();break;
 case 'log':logView(state.active||'black');break;
 case 'logTab':logView(button.dataset.id);break;
 case 'transcript':logView('black','all');break;
 case 'gallery':gallery();break;
 case 'galleryFilter':gallery(button.dataset.filter);break;
 case 'momentImage':showMemoryImage(button.dataset.id);break;
 case 'galleryImage':showMemoryImage(button.dataset.id,true);break;
 case 'home':home();break;
 case 'confirmHome':returnHome();break;
 case 'homeWithoutSave':returnHome(true);break;
 case 'sound':prefs.sound=!prefs.sound;store('-prefs',prefs);syncMusic();button.innerHTML=icon(prefs.sound?'sound':'mute');button.setAttribute('aria-label',`음악 ${prefs.sound?'끄기':'켜기'}`);if(modal.open&&modal.querySelector('.settings-actions'))settings();break;
 case 'full':if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>toast('이 화면에서는 전체 화면을 지원하지 않아요.'));break;
}});
document.addEventListener('submit',event=>{if(event.target.id==='chat-form')sendChat(event);if(event.target.id==='name-form'){event.preventDefault();const name=document.querySelector('#player-name').value.trim();if(!name)return;readback.reset();state=newGame(name.slice(0,12));state.tutorialPending=true;draft='';closeModal();enterNode(state,'episode-1');persist();render();}});
document.addEventListener('input',event=>{if(event.target.id==='chat-input')draft=event.target.value;});
document.addEventListener('change',event=>{const key=event.target.dataset.setting;if(!key)return;if(key==='mode'&&event.target.value==='live'&&!status.liveReady)return;const value=event.target.value;prefs[key]=key==='mode'?value:Number(value);store('-prefs',prefs);document.documentElement.style.setProperty('--body-size',`${prefs.textSize}px`);syncMusic();render();});
document.addEventListener('keydown',event=>{
 if(event.isComposing){if(event.key==='Enter')event.preventDefault();return;}
 if(event.ctrlKey||event.metaKey||event.altKey)return;
 const focused=document.activeElement;
 if(modal.open||focused?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(focused?.tagName))return;
 if(['Backspace','ArrowLeft'].includes(event.key)&&state.phase!=='title'){
  event.preventDefault();if(!event.repeat)readPrevious();return;
 }
 if(readback.current()&&['ArrowRight',' ','Enter','Escape'].includes(event.key)){
  if(focused?.tagName==='BUTTON'&&[' ','Enter'].includes(event.key))return;
  event.preventDefault();if(event.key==='Escape')resumeReading();else advance();return;
 }
 if(focused?.tagName==='BUTTON')return;
 if([' ','Enter','ArrowRight'].includes(event.key)&&['story','episode'].includes(state.phase)){event.preventDefault();advance();}
});
modal.addEventListener('click',event=>{if(event.target===modal){const b=modal.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closeModal();}});
window.addEventListener('beforeunload',()=>persist());
async function refreshPlayer(){const r=await fetch('/api/player/session');if(!r.ok)throw Error('대화 기록 설정을 불러오지 못했어요.');playerSession=await r.json();}
async function showConsent(){try{await refreshPlayer();openModal('자유대화 기록 안내',`<p>전송한 <strong>닉네임, 대화 내용, 캐릭터의 답변, 대화 시각과 장면</strong>을 게임 운영자가 품질 확인과 오류 대응을 위해 확인할 수 있어요.</p><p>서버에서 최대 <strong>30일</strong> 보관한 뒤 삭제합니다. AI 자유대화에서는 입력이 OpenAI에도 전달됩니다. 전송하지 않은 초안이나 게임 서버의 API 키는 수집하지 않아요. 대화에 직접 적은 내용은 저장되므로 개인 비밀번호 등 민감한 정보는 입력하지 마세요.</p><p>동의하지 않아도 자유대화를 스킵하고 스토리와 선택지로 플레이할 수 있어요. 선택에 따라 해피엔딩도 볼 수 있어요.</p><p class="muted">같은 닉네임도 브라우저별로 구분됩니다. 세이브 삭제는 서버 대화 기록 삭제가 아니에요. 삭제 요청 시 운영자에게 이 번호를 알려 주세요: ${esc(playerSession.playerId)}</p><div class="confirm-actions"><button class="button secondary" data-action="consentDecline">${playerSession.consent?'기록 동의 철회':'동의하지 않고 계속'}</button><button class="button" data-action="consentAccept">안내를 읽었고 동의합니다</button></div>`);}catch(e){toast(e.message);}}
async function setConsent(accept){try{const r=await fetch('/api/player/consent',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':playerSession.csrf},body:JSON.stringify({accept})});if(!r.ok)throw Error('설정을 저장하지 못했어요. 다시 시도해 주세요.');playerSession.consent=accept;closeModal();toast(accept?'동의가 저장됐어요. 입력한 대화를 전송할 수 있어요.':'자유대화의 스킵 버튼으로 이야기를 계속할 수 있어요.');render({focus:accept});}catch(e){toast(e.message);}}
render();
refreshPlayer().catch(()=>{});
fetch('/api/status').then(r=>r.json()).then(s=>{status=s;if(!localStorage.getItem(KEY+'-prefs')&&status.liveReady){prefs.mode='live';render();}}).catch(()=>toast('서버 연결을 확인해 주세요. 게임 실행.command로 시작할 수 있어요.'));
