import test from 'node:test';
import assert from 'node:assert/strict';
import {growth,plant,tend,harvest} from '../server/farm.ts';
import {settleSettlers} from '../server/settlers.ts';
import {CROPS} from './crops.ts';
const carrot=CROPS.find(c=>c.name==='Морковь')!,m=60000;
function fixture(){return {wood:20,settlers:[],agri:{plots:[{crop:null}],seeds:{Морковь:1},produce:{},experience:0,farmer:0,fertilizer:2}}}
test('dry seed pauses, watering only resumes normal growth, expiry survives reload',()=>{
  const s=fixture();plant(s,0,carrot.name,0);
  const remaining=(t:number)=>growth(s.agri.plots[0],carrot,t*m).remaining/m;
  assert.equal(remaining(100),30);
  tend(s,[0],'water',100*m);assert.equal(remaining(100),30);
  tend(s,[0],'water',105*m,true);assert.equal(remaining(105),25);
  assert.equal(remaining(126),5);assert.equal(remaining(999),5);
  const restored=JSON.parse(JSON.stringify(s));assert.equal(harvest(restored,0,999*m),0);
  tend(restored,[0],'water',999*m);assert.equal(harvest(restored,0,1004*m),7);
  assert.equal(harvest(restored,0,1004*m),0);
});
test('fertilizer doubles only future wet growth, including offline',()=>{
  const s=fixture();plant(s,0,carrot.name,0);
  tend(s,[0],'fertilize',0);assert.equal(growth(s.agri.plots[0],carrot,100*m).remaining,30*m);
  assert.equal(tend(s,[0],'fertilize',100*m),false);assert.equal(s.agri.fertilizer,1);
  tend(s,[0],'water',100*m);assert.equal(harvest(s,0,115*m),7);
});
test('legacy crop retains maturity or earned progress',()=>{
  assert.equal(growth({crop:'Морковь',readyAt:90*m},carrot,100*m).remaining,0);
  assert.equal(growth({crop:'Морковь',progress:1,water:0},carrot,0).remaining,20*m);
});
test('feeding and infection use individual deadlines without double consumption',()=>{
  const s={food:10,cooking:{meals:{Суп:1}},nutrition:{mode:'variety',people:{}},settlers:[{id:1,name:'Марина',health:50,status:'заражён',mealAt:1,infectionAt:1}]};
  settleSettlers(s,()=>{},2);assert.equal(s.cooking.meals.Суп,0);assert.equal(s.settlers[0].health,41);
  assert.equal(settleSettlers(s,()=>{},2),false);assert.equal(s.food,10);
});
