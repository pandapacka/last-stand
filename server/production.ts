import {RECIPES} from '../shared/recipes.ts';
import {canPrepare,ingredientStock,type KitchenState} from '../shared/kitchen.ts';
import type {Building} from '../shared/shelter.ts';

const minute=60_000;
export function enqueueDish(state:KitchenState,index:number,now=Date.now()){
  const recipe=RECIPES[index];
  if(!Number.isInteger(index)||!recipe)return 'Неизвестный рецепт.';
  if(!canPrepare(state,recipe))return 'Не хватает ингредиентов или уровня кухни.';
  const queue=state.cooking.queue??[];
  if(queue.length>=5)return 'Очередь кухни заполнена (5 блюд).';
  const start=Math.max(now,queue.at(-1)?.end??0);
  for(const [name,qty] of Object.entries(recipe.ingredients))ingredientStock(state,name)[name]-=qty;
  queue.push({recipe:index,start,end:start+10*minute});
  state.cooking.queue=queue;
  return '';
}
export function finishDishes(state:KitchenState,now=Date.now()){
  const completed:string[]=[];
  const {queue,meals}=state.cooking;
  while(queue?.length && queue[0].end<=now){
    const job=queue.shift()!;
    const recipe=RECIPES[job.recipe];
    if(!recipe)continue;
    meals[recipe.name]=(meals[recipe.name]??0)+1;
    completed.push(recipe.name);
  }
  return completed;
}
type WorkshopState={wood:number;metal:number;buildings:(Building & {outputAt?:number})[]};
export function settleWorkshops(state:WorkshopState,now=Date.now()){
  let changed=false;
  const period=15*minute;
  for(const b of state.buildings){
    if(b.buildEnd && b.buildEnd<=now){
      if(b.t==='scrap')b.outputAt=b.buildEnd+period;
      delete b.buildEnd;
      changed=true;
    }
    if(b.t!=='scrap'||b.buildEnd)continue;
    if(!b.outputAt){b.outputAt=now+period;changed=true}
    if(now<b.outputAt)continue;
    const batches=1+Math.floor((now-b.outputAt)/period);
    state.wood+=12*batches;
    state.metal+=5*batches;
    b.outputAt+=period*batches;
    changed=true;
  }
  return changed;
}
