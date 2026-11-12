import {test} from 'node:test';import assert from 'node:assert/strict';import {existsSync,readFileSync} from 'node:fs';
import {newGame,canPreserve,migrateCharacterSave,validSave} from '../public/engine.js';
import {enterNode,advanceNarrative,chooseFinal} from '../public/narrative.js';import {endingLines,MODERN_ENDINGS,BEFORE_MORNING_LINES} from '../public/ending-v4.js';
function prepared(){const s=newGame('확인');s.routeHero=s.episodeHero=s.active='black';s.profiles.black.score=70;s.profiles.black.relationship.repairState='resolved';s.intent=true;s.relationshipIntent='continue';return s;}
function finishNode(s){const id=s.nodeId;for(let n=0;n<100&&s.phase==='story'&&s.nodeId===id;n++){assert.ok(validSave(s));advanceNarrative(s);}}
test('memory choice precedes repair; cohabitation is a separate choice on the happy path',()=>{
 const s=prepared();enterNode(s,'roof-farewell');finishNode(s);assert.equal(s.phase,'final');assert.equal(s.flags.memoryRepairComplete,undefined);assert.equal(canPreserve(s),true);
 assert.equal(chooseFinal(s,'normal'),false);assert.equal(chooseFinal(s,'preserve'),true);assert.equal(s.nodeId,'repair-result');finishNode(s);
 assert.equal(s.flags.memoryRepairComplete,true);for(const p of Object.values(s.profiles))assert.equal(p.events.memorySafe,true);assert.equal(s.nodeId,'followup-offer');finishNode(s);assert.equal(s.phase,'final');assert.equal(canPreserve(s),true);assert.equal(chooseFinal(s,'reset'),false);
});
for(const id of ['black','white','red'])test(`${id}: short cohabitation ending leads to a character-specific morning`,()=>{
 const s=prepared();s.active=s.routeHero=s.episodeHero=id;s.flags.memoryRepairComplete=true;const ls=endingLines(s,id),text=ls.map(l=>l.text).join('\n');
 assert.match(text,/3년간 지원/);assert.match(text,/함께 살기 시작/);assert.match(text,/아침|눈을 뜨/);assert.doesNotMatch(text,/3년 후|열쇠|설거지|초기화|기억.*지워/);
 if(id==='black'){assert.match(text,/남편(?:이라고|이라) 불러도/);assert.match(text,/좋은 아침이에요, (?:남편|여보)/);}
 if(id==='red'){assert.match(text,/뒤에서 두 팔이 허리를 감았다/);assert.match(text,/조금만 더 이러고/);}
 if(id==='white'){assert.match(text,/오늘은 일찍 들어와야 해/);assert.match(text,/조심히 다녀와/);for(const l of ls.filter(l=>l.speaker==='white'))assert.doesNotMatch(l.text,/(?:^|\s)(나는|내가|저는|제가)(?:\s|$)/);}
 for(const l of ls)if(l.bg)assert.ok(existsSync(new URL('../public'+l.bg,import.meta.url)));assert.ok(existsSync(new URL('../public'+MODERN_ENDINGS[id].image,import.meta.url)));
});
test('reset restores the original memory-loss ending and cannot be bypassed with a happy choice',()=>{
 const s=prepared();s.profiles.black.score=40;enterNode(s,'final');assert.equal(canPreserve(s),false);assert.equal(chooseFinal(s,'preserve'),false);assert.equal(chooseFinal(s,'normal'),false);assert.equal(chooseFinal(s,'reset'),true);
 const text=s.script.map(l=>l.text).join('\n');assert.match(text,/初期化|초기화/);assert.match(text,/처음 뵙/);assert.equal(s.ending,'bad');assert.equal(s.flags.memoryResetComplete,true);assert.ok(Object.values(s.profiles).every(p=>p.events.memorySafe===false));assert.ok(validSave(s));assert.ok(!s.script.some(l=>l.moment?.endsWith('happymorning')));
});
for(const hero of ['black','white','red'])for(const action of ['preserve','normal'])test(`${hero}: ${action} keeps memories and saves the correct ending independently`,()=>{
 const s=prepared();s.active=s.routeHero=s.episodeHero=hero;s.profiles[hero].score=70;s.profiles[hero].relationship.repairState='resolved';s.flags.memoryRepairComplete=true;for(const p of Object.values(s.profiles))p.events.memorySafe=true;enterNode(s,'final');
 assert.equal(chooseFinal(s,action),true);assert.equal(MODERN_ENDINGS[s.ending].kind,action==='normal'?'normal':'cohabit');assert.ok(validSave(s));assert.equal(chooseFinal(s,action),false,'cannot apply a choice twice');
 if(action==='normal'){assert.ok(!s.script.some(l=>l.moment?.endsWith('happymorning')));assert.ok(s.script.every(l=>!l.cast||l.cast.length===0));assert.match(s.script.map(l=>l.text).join('\n'),/연구를 마쳐야지/);assert.doesNotMatch(s.script.map(l=>l.text).join('\n'),/데이트|다음 약속|다시 만나/);assert.deepEqual(s.viewedMoments,[]);}
 assert.ok(Object.values(s.profiles).every(p=>p.events.memorySafe));assert.deepEqual(migrateCharacterSave(structuredClone(s)),s);s.phase='ending';assert.ok(validSave(s));assert.deepEqual(migrateCharacterSave(structuredClone(s)),s);
});
test('all three ending types have gallery metadata and existing artwork',()=>{
 assert.deepEqual(new Set(Object.values(MODERN_ENDINGS).map(e=>e.kind)),new Set(['cohabit','normal','bad']));assert.equal(Object.keys(MODERN_ENDINGS).length,5);for(const e of Object.values(MODERN_ENDINGS))assert.ok(existsSync(new URL('../public'+e.image,import.meta.url)));
});
test('old final and epilogue saves use the new ending without changing affection',()=>{
 const old=prepared();old.phase='final';delete old.endingRevision;const next=migrateCharacterSave(old);assert.equal(next.resumeNode,'roof-farewell');assert.equal(next.profiles.black.score,70);
 const ending=prepared();ending.phase='story';ending.ending='black';ending.after='end';ending.script=[{speaker:'나',text:'이전 후일담'}];ending.line=0;delete ending.endingRevision;
 const fixed=migrateCharacterSave(ending);assert.match(fixed.script.map(l=>l.text).join('\n'),/남편/);assert.equal(fixed.profiles.black.score,70);assert.deepEqual(migrateCharacterSave(fixed),fixed);
});

for(const id of ['black','white','red'])test(`${id}: morning illustration begins after the introduction and stays behind every remaining line`,()=>{
 const s=prepared(),ls=endingLines(s,id),wake=ls.findIndex(l=>l.moment===`${id}-happymorning`);
 assert.equal(wake,4+BEFORE_MORNING_LINES[id].length);assert.ok(ls.slice(0,wake).every(l=>!l.moment));
 for(const l of ls.slice(wake)){assert.equal(l.moment,`${id}-happymorning`);assert.equal(l.cgMode,'dialogue');assert.deepEqual(l.cast,[]);assert.equal(l.bg,MODERN_ENDINGS[id].image);}
 const old=prepared();old.endingRevision=2;old.phase='story';old.ending=id;old.after='end';old.script=ls.map(({moment,cgMode,...l})=>({...l,bg:'/old-room.png',cast:[id]}));old.line=wake+2;
 const fixed=migrateCharacterSave(old);assert.equal(fixed.line,old.line);assert.equal(fixed.script[fixed.line].text,ls[old.line].text);assert.equal(fixed.sceneBg,MODERN_ENDINGS[id].image);assert.deepEqual(fixed.cast,[]);assert.ok(fixed.viewedMoments.includes(`${id}-happymorning`));assert.equal(fixed.profiles.black.score,old.profiles.black.score);assert.deepEqual(migrateCharacterSave(fixed),fixed);
 const final=prepared();final.endingRevision=2;final.phase='final';assert.equal(migrateCharacterSave(final).resumeNode,'roof-farewell');
});

test('temporary separate-living saves map to the common normal ending without changing scores',()=>{
 const s=prepared();s.phase='story';s.after='end';s.ending='black-apart';s.endingRevision=4;s.script=[{speaker:'black',text:'이전 임시 대사'}];s.line=0;
 const fixed=migrateCharacterSave(s);assert.equal(fixed.ending,'normal');assert.deepEqual(fixed.cast,[]);assert.equal(fixed.profiles.black.score,70);assert.ok(validSave(fixed));assert.deepEqual(migrateCharacterSave(fixed),fixed);
});

for(const id of ['black','white','red'])test(`${id}: authored black-screen lines precede the morning and old saves keep the same reading position`,()=>{
 const s=prepared();s.active=s.routeHero=s.episodeHero=id;s.flags.memoryRepairComplete=true;
 const lines=endingLines(s,id),dark=lines.filter(l=>l.blackout),wake=lines.findIndex(l=>l.moment===`${id}-happymorning`);
 assert.equal(dark.length,BEFORE_MORNING_LINES[id].length);assert.deepEqual(lines.slice(wake-BEFORE_MORNING_LINES[id].length,wake),dark);
 assert.deepEqual(dark.map(({speaker,text})=>({speaker,text})),BEFORE_MORNING_LINES[id]);
 for(const other of ['black','white','red'].filter(hero=>hero!==id))assert.notDeepEqual(dark.map(l=>l.text),BEFORE_MORNING_LINES[other].map(l=>l.text));
 for(const l of dark){assert.equal(l.bg,'/assets/backgrounds/black.svg');assert.deepEqual(l.cast,[]);assert.equal(l.moment,undefined);assert.ok(l.text.length);}
 assert.match(readFileSync(new URL('../public'+dark[0].bg,import.meta.url),'utf8'),/#000/);
 s.endingRevision=5;s.phase='story';s.ending=id;s.after='end';s.script=lines.filter(l=>!l.blackout);s.line=5;
 const oldText=s.script[s.line].text,fixed=migrateCharacterSave(s);assert.equal(fixed.script[fixed.line].text,oldText);assert.equal(fixed.line,5+BEFORE_MORNING_LINES[id].length);assert.equal(fixed.sceneBg,MODERN_ENDINGS[id].image);assert.deepEqual(fixed.profiles,s.profiles);assert.deepEqual(migrateCharacterSave(fixed),fixed);
 s.phase='final';s.after='flow:final';const decision=migrateCharacterSave(s);assert.equal(decision.flags.memoryRepairComplete,true);assert.equal(decision.resumeNode,undefined);
});
