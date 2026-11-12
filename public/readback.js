// A read-only presentation history: never restores or mutates gameplay state.
export function createReadback(limit=250){
 let frames=[],cursor=null;
 const previousIndex=currentKey=>cursor!==null?cursor-1:frames.length-1-(frames.at(-1)?.key===currentKey?1:0);
 return {
  capture(key,frame){if(cursor!==null)return;if(frames.at(-1)?.key===key)frames[frames.length-1]={key,...frame};else{frames.push({key,...frame});if(frames.length>limit)frames.shift();}},
  current:()=>cursor===null?null:frames[cursor],
  canBack:key=>previousIndex(key)>=0,
  back(key){const next=previousIndex(key);if(next<0)return false;cursor=next;return true;},
  forward(currentKey){if(cursor===null)return false;const next=cursor+1;cursor=next>=frames.length||frames[next].key===currentKey?null:next;return true;},
  resume(){cursor=null;},
  reset(){frames=[];cursor=null;}
 };
}
