export const saveKey='laststand_phaser_v1';
const keys=[saveKey,'laststand_v08','laststand_v05','laststand_v01'];
export function readSave(storage:Pick<Storage,'getItem'>){
  for(const key of keys){
    try{
      const raw=storage.getItem(key);
      if(!raw)continue;
      const state=JSON.parse(raw);
      if(state && Array.isArray(state.buildings))return state;
    }catch{/* A damaged newer slot must not mask an intact older save. */}
  }
  return null;
}
