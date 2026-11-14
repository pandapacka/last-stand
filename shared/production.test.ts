import test from 'node:test';
import assert from 'node:assert/strict';
import {enqueueDish,finishDishes,settleWorkshops} from '../server/production.ts';

function fixture(){return {agri:{produce:{'Картофель':20}},cooking:{kitchen:1,pantry:{'Вода':20},meals:{},queue:[]}}}
test('five independent portions reserve ingredients and credit exactly once across reload',()=>{
  const s=fixture();
  for(let i=0;i<5;i++)assert.equal(enqueueDish(s,0,1000),'');
  const snapshot=structuredClone(s);
  assert.ok(enqueueDish(s,0,2000));assert.deepEqual(s,snapshot);
  assert.equal(s.agri.produce.Картофель,10);
  assert.equal(finishDishes(s,600999).length,0);
  const resumed=JSON.parse(JSON.stringify(s));
  assert.equal(finishDishes(resumed,601000).length,1);
  assert.equal(finishDishes(resumed,3001000).length,4);
  assert.equal(finishDishes(resumed,3001000).length,0);
  assert.deepEqual(resumed.cooking.meals,{'Печёный картофель':5});
});
test('unavailable recipes do not charge ingredients',()=>{
  const s=fixture(),old=structuredClone(s);
  for(const i of [-1,0.5,999,1,10])assert.ok(enqueueDish(s,i));
  assert.deepEqual(s,old);
});
test('workshops reconcile from their own deadlines after time offline',()=>{
  const state={wood:0,metal:0,buildings:[{t:'scrap',x:2,y:3,buildEnd:1000},{t:'scrap',x:2,y:2,outputAt:901001}]};
  assert.equal(settleWorkshops(state,1801000),true);
  assert.deepEqual([state.wood,state.metal],[36,15]);
  assert.equal(settleWorkshops(state,1801000),false);
  settleWorkshops(state,1801001);assert.deepEqual([state.wood,state.metal],[48,20]);
});
