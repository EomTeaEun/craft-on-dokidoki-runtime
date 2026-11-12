export const SAVE_SLOTS=['auto','1','2','3','roof','decision'];
export const SAVE_KEY='love-exception-v1';
export const saveSlotLabel=slot=>({auto:'자동 저장',roof:'마지막 옥상 대화 전',decision:'마지막 결정 전'})[slot]||`기억 ${String(slot).padStart(2,'0')}`;
export function readSaveSlot(storage,slot){
 if(!SAVE_SLOTS.includes(String(slot)))throw Error('허용되지 않은 저장 슬롯');
 return storage.getItem(`${SAVE_KEY}-${slot}`);
}
export function removeSaveSlot(storage,slot,expected){
 const current=readSaveSlot(storage,slot);
 if(current===null)return 'missing';
 if(typeof expected!=='string'||current!==expected)return 'changed';
 storage.removeItem(`${SAVE_KEY}-${slot}`);
 return 'deleted';
}
