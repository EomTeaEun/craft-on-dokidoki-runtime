import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SAVE_KEY,SAVE_SLOTS,readSaveSlot,removeSaveSlot} from '../public/save-slots.js';
function storage(){const map=new Map();return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('deleting any supported slot preserves every other save, gallery and setting',()=>{
 for(const slot of SAVE_SLOTS){
  const s=storage();for(const id of [...SAVE_SLOTS,'prefs','unlocks','moment-unlocks'])s.setItem(`${SAVE_KEY}-${id}`,'data-'+id);
  const before=new Map(s.map);assert.equal(removeSaveSlot(s,slot,readSaveSlot(s,slot)),'deleted');before.delete(`${SAVE_KEY}-${slot}`);assert.deepEqual(s.map,before);
 }
});
test('a save changed after confirmation opened is never removed',()=>{
 const s=storage();s.setItem(`${SAVE_KEY}-1`,'first');const snapshot=readSaveSlot(s,'1');s.setItem(`${SAVE_KEY}-1`,'newer');assert.equal(removeSaveSlot(s,'1',snapshot),'changed');assert.equal(readSaveSlot(s,'1'),'newer');
});
test('empty and corrupt saves are handled without parsing or touching unrelated keys',()=>{
 const s=storage();assert.equal(removeSaveSlot(s,'auto','old'),'missing');s.setItem(`${SAVE_KEY}-auto`,'{broken');assert.equal(removeSaveSlot(s,'auto','{broken'),'deleted');assert.throws(()=>removeSaveSlot(s,'prefs','{}'));assert.throws(()=>readSaveSlot(s,'anything'));
});
test('deletion requires the exact reviewed contents and propagates storage failure',()=>{
 const s=storage();s.setItem(`${SAVE_KEY}-2`,'save');assert.equal(removeSaveSlot(s,'2',undefined),'changed');s.removeItem=()=>{throw Error('blocked');};assert.throws(()=>removeSaveSlot(s,'2','save'),/blocked/);assert.equal(readSaveSlot(s,'2'),'save');
});
