import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as data from '../public/data.js';
import {newGame,migrateCharacterSave,validSave} from '../public/engine.js';
import {enterNode,NODES} from '../public/narrative-v3.js';

test('retired v1 scripts and UI actions are removed while the current opening and shared bad ending remain',()=>{
 for(const name of ['CONFLICT','CRISIS','DATE_INVITE','DATE_SCENES','PLACES','personalScene','TITLE'])assert.equal(Object.hasOwn(data,name),false,name);
 assert.ok(data.OPENING.length);assert.ok(data.ENDINGS.bad.lines.length);
 const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(app,/\b(?:CONFLICT|CRISIS|DATE_SCENES|PLACES|personalScene|miniView|dateView)\b/);
 assert.doesNotMatch(app,/case '(?:block|miniSkip|miniEnd|choosePlace|dateChoice|dateNext)'/);
});
for(const [phase,after,node]of [
 ['selectDate','selectDate','lunch'],['selectPlace','selectDate','personal-select'],['date','selectDate','personal-select'],
 ['mini','mini','crisis'],['selectRoof','selectRoof','before-roof'],
 ['story','conflict','personal-select'],['story','mini','crisis'],['story','selectRoof','before-roof']
])test(`retired ${phase}/${after} save keeps scores and memories and resumes at ${node}`,()=>{
 const old=newGame('보존');old.storyRevision=1;old.phase=phase;old.after=after;old.dateHero='red';
 old.script=[{speaker:'나',text:'저장한 이야기'}];old.profiles.red.score=67;
 old.profiles.red.memory.facts=[{key:'favorite_drink',value:'홍차',evidence:'홍차를 좋아해'}];
 assert.ok(validSave(old));const restored=migrateCharacterSave(old);assert.ok(restored);assert.equal(restored.storyRevision,3);assert.equal(restored.resumeNode,node);assert.deepEqual(restored.profiles,old.profiles);
 assert.deepEqual(migrateCharacterSave(restored),restored);assert.ok(NODES[node]);delete restored.resumeNode;enterNode(restored,node);assert.ok(validSave(restored));
});
