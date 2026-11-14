import {RECIPES} from './recipes.ts';
export type Stock=Record<string,number>;
export interface KitchenState {
  agri:{produce:Stock};
  cooking:{
    kitchen:number; pantry:Stock; meals:Stock;
    queue?:{recipe:number;start:number;end:number}[];
  };
}
// The local test economy grants all chef ranks; equipment requirements still apply.
export function chefLevel(){return 10}
export function ingredientStock(state:KitchenState,name:string){
  return Object.hasOwn(state.agri.produce,name)?state.agri.produce:state.cooking.pantry;
}
export function ingredientCount(state:KitchenState,name:string){
  return ingredientStock(state,name)[name]??0;
}
export function canPrepare(state:KitchenState,recipe:typeof RECIPES[number]){
  return chefLevel()>=recipe.level && state.cooking.kitchen>=recipe.kitchen &&
    Object.entries(recipe.ingredients).every(([name,qty])=>ingredientCount(state,name)>=qty);
}
