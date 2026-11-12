import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPoseLoader} from '../public/standing-renderer.js';
function fixture(){
 const pending=new Map();
 class Image{set src(url){this.url=url;pending.set(url,this);}decode(){return this.decoding||Promise.resolve();}}
 const poses=createPoseLoader(Image),image={isConnected:true,src:'neutral',getAttribute(){return this.src;},setAttribute(_,v){this.src=v;}};
 return {poses,image,pending};
}
test('pose stays visible until download AND decode finish',async()=>{
 const {poses,image,pending}=fixture();const update=poses.update(image,'happy');assert.equal(image.src,'neutral');
 let decoded;pending.get('happy').decoding=new Promise(r=>decoded=r);pending.get('happy').onload();await Promise.resolve();assert.equal(image.src,'neutral');decoded();assert.equal(await update,true);assert.equal(image.src,'happy');
});
test('rapid switching only applies the latest pose, including a return to current pose',async()=>{
 const {poses,image,pending}=fixture();const happy=poses.update(image,'happy'),sad=poses.update(image,'sad');pending.get('sad').onload();await sad;pending.get('happy').onload();await happy;assert.equal(image.src,'sad');
 const love=poses.update(image,'love');await poses.update(image,'sad');pending.get('love').onload();await love;assert.equal(image.src,'sad');
});
test('failed or departed images never replace the visible artwork',async()=>{
 const {poses,image,pending}=fixture();const broken=poses.update(image,'missing');pending.get('missing').onerror();assert.equal(await broken,false);assert.equal(image.src,'neutral');
 const later=poses.update(image,'happy');image.isConnected=false;pending.get('happy').onload();assert.equal(await later,false);assert.equal(image.src,'neutral');
});
test('preloading shares decoded images and allows failed requests to retry',async()=>{
 const {poses,pending}=fixture();const first=poses.preload('happy');assert.equal(poses.preload('happy'),first);pending.get('happy').onload();await first;assert.equal(poses.preload('happy'),first);
 const failure=poses.preload('bad');pending.get('bad').onerror();await assert.rejects(failure);const retry=poses.preload('bad');assert.notEqual(retry,failure);pending.get('bad').onload();await retry;
});
