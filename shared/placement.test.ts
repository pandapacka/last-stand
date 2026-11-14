import test from 'node:test';
import assert from 'node:assert/strict';
import {construct} from '../server/construction.ts';
import {cellCenter,screenToCell} from './iso.ts';
import {snapToPlacement} from './grid.ts';
const state=()=>({buildings:[],food:100,wood:100,metal:90});
test('GZ projection round-trips every shelter cell',()=>{
  const projection={originX:400,originY:100,cellW:54,cellH:27,worldW:800,worldH:640};
  for(let x=0;x<24;x++)for(let y=0;y<16;y++){
    const p=cellCenter(projection,x,y);
    assert.deepEqual(screenToCell(projection,p.x,p.y),{x,y});
  }
  assert.equal(snapToPlacement(120,4,64),128);
});
test('placement charges once and persists the selected orientation and deadline',()=>{
  const s=state(),cmd={x:4,y:3,t:'tower',rot:1};
  assert.equal(construct(s,cmd,1000),'');
  const after=structuredClone(s);
  assert.ok(construct(s,cmd,2000));assert.deepEqual(s,after);
  assert.equal(s.wood,65);assert.equal(s.metal,65);
  assert.deepEqual(s.buildings,[{...cmd,buildEnd:3601000}]);
});
test('invalid commands leave resources and occupancy untouched',()=>{
  for(const cmd of [{x:-1,y:2,t:'tower'},{x:2,y:3,t:'farm'},{x:4.5,y:3,t:'tower'},{x:4,y:4,t:'missing'},{x:4,y:4,t:'scrap'}]){
    const s={...state(),metal:0},before=structuredClone(s);
    assert.ok(construct(s,cmd));assert.deepEqual(s,before);
  }
});

test('save migration preserves unknown fields and falls back past broken slots',async()=>{
  const {readSave,saveKey}=await import('../client/storage.ts');
  for(const key of ['laststand_v08','laststand_v05','laststand_v01']){
    const old={buildings:[{x:4,y:4,t:'tower',buildEnd:123}],story:{chapter:2},futureField:[7]};
    const slots=new Map([[saveKey,'broken'],[key,JSON.stringify(old)]]);
    assert.deepEqual(readSave({getItem:k=>slots.get(k)??null}),old);
    assert.equal(slots.get(key),JSON.stringify(old));
  }
});
