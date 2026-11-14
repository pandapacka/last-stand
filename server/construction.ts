import {constructionError,rules,type BuildCommand,type ShelterState} from '../shared/shelter.ts';
// Same authority can be called locally or by a room that owns the state.
export function construct(state:ShelterState,cmd:BuildCommand,now=Date.now()){
  const error=constructionError(state,cmd);
  if(error)return error;
  const [food,wood,metal,minutes]=rules[cmd.t];
  state.buildings.push({x:cmd.x,y:cmd.y,t:cmd.t,rot:cmd.rot===1?1:0,buildEnd:now+minutes*60000});
  state.food-=food;state.wood-=wood;state.metal-=metal;
  return '';
}
