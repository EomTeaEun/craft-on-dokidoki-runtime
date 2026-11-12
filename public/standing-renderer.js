// Keep decoded artwork alive across dialogue renders and only swap ready poses.
export function createPoseLoader(ImageClass=Image){
 const cache=new Map(),wanted=new WeakMap();
 function preload(url){
  if(cache.has(url))return cache.get(url).ready;
  const image=new ImageClass();
  const loaded=new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Standing image unavailable'));});
  image.src=url;
  const ready=(async()=>{await loaded;if(image.decode)await image.decode();return image;})();
  cache.set(url,{image,ready});
  ready.catch(()=>{if(cache.get(url)?.image===image)cache.delete(url);});
  return ready;
 }
 function update(image,url){
  wanted.set(image,url);
  if(image.getAttribute('src')===url)return Promise.resolve(false);
  return preload(url).then(()=>{
   if(wanted.get(image)!==url||!image.isConnected)return false;
   image.setAttribute('src',url);return true;
  }).catch(()=>false); // Failed pose requests leave the previous pose visible.
 }
 return {preload,update};
}
export function renderWithStandingReuse(root,html,poses){
 const template=root.ownerDocument.createElement('template');template.innerHTML=html;
 const next=template.content,oldCast=root.querySelector('.cast'),newCast=next.querySelector('.cast');
 if(oldCast&&newCast){
  const previous=new Map([...oldCast.querySelectorAll('img[data-hero]')].map(img=>[img.dataset.hero,img]));
  const children=[...newCast.children].map(target=>{
   const image=previous.get(target.dataset.hero);
   if(!image)return target;
   image.className=target.className;image.alt=target.alt;
   poses.update(image,target.getAttribute('src'));
   return image;
  });
  oldCast.className=newCast.className;oldCast.replaceChildren(...children);newCast.replaceWith(oldCast);
 }
 // Retain unchanged scene artwork as well, rather than restarting its paint.
 for(const selector of ['.backdrop','.extra-standing','.special-art','.cover-art']){
  const old=root.querySelector(selector),target=next.querySelector(selector);
  if(old&&target&&old.isEqualNode(target))target.replaceWith(old);
 }
 root.replaceChildren(next);
}
