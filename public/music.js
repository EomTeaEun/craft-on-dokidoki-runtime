// Only the title phase owns the OP; its name/settings/gallery dialogs share it.
export function createTitleMusic(audio,getPreferences,isTitle,onState=()=>{}){
 let pending=null,blocked=false;
 const wanted=()=>{const p=getPreferences();return isTitle()&&p.sound&&p.volume>0;};
 const report=()=>onState(!wanted()?'off':audio.error?'error':!audio.paused?'playing':blocked?'blocked':'loading');
 const sync=()=>{
  audio.volume=Math.min(1,Math.max(0,Number(getPreferences().volume)||0));
  if(!wanted()){audio.pause();report();return Promise.resolve(false);}
  if(!audio.paused){report();return Promise.resolve(true);}
  if(pending)return pending;
  report();
  let attempt;
  try{attempt=audio.play();}catch(error){blocked=true;report();return Promise.resolve(false);}
  pending=Promise.resolve(attempt).then(()=>{
   blocked=false;
   if(!wanted())audio.pause();
   report();return wanted()&&!audio.paused;
  }).catch(()=>{blocked=true;report();return false;}).finally(()=>{pending=null;});
  return pending;
 };
 audio.addEventListener('playing',()=>{blocked=false;if(!wanted())audio.pause();report();});
 audio.addEventListener('pause',report);
 audio.addEventListener('error',report);
 return {sync};
}
