import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTitleMusic} from '../public/music.js';
class AudioStub extends EventTarget{
 paused=true;volume=1;calls=0;block=false;error=null;
 play(){this.calls++;if(this.block)return Promise.reject(new Error('NotAllowedError'));this.paused=false;return Promise.resolve();}
 pause(){this.paused=true;}
}
test('페이지 진입 시 바로 재생을 시도하며 타이틀 대화창에서 유지',async()=>{
 const audio=new AudioStub();let phase='title',value;
 const prefs={sound:true,volume:.18};const player=createTitleMusic(audio,()=>prefs,()=>phase==='title',s=>value=s);
 assert.equal(await player.sync(),true);assert.equal(audio.calls,1);assert.equal(audio.volume,.18);assert.equal(value,'playing');
 await player.sync();assert.equal(audio.calls,1);assert.equal(audio.paused,false);
 phase='story';await player.sync();assert.equal(audio.paused,true);assert.equal(value,'off');
});
test('자동재생 차단 후 첫 상호작용에서 재시도, 음소거는 존중',async()=>{
 const audio=new AudioStub();audio.block=true;let value;const prefs={sound:true,volume:.18};const player=createTitleMusic(audio,()=>prefs,()=>true,s=>value=s);
 assert.equal(await player.sync(),false);assert.equal(value,'blocked');audio.block=false;assert.equal(await player.sync(),true);assert.equal(value,'playing');
 prefs.sound=false;await player.sync();assert.equal(audio.paused,true);assert.equal(audio.calls,2);
});
test('재생 요청 중 스토리로 넘어가면 늦게 성공한 OP도 정지',async()=>{
 const audio=new AudioStub();let resolve,phase='title';audio.play=()=>new Promise(r=>resolve=()=>{audio.paused=false;r();});
 const player=createTitleMusic(audio,()=>({sound:true,volume:.18}),()=>phase==='title');
 const pending=player.sync();phase='story';await player.sync();resolve();await pending;assert.equal(audio.paused,true);
});
