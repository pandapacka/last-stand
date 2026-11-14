export interface Cell {x:number;y:number}
export const actions={research:'Исследовать',scout:'Разведывать',build:'Построить'} as const;
export type Action=keyof typeof actions;
export function region({x,y}:Cell){
  if(Math.abs(x-y+3)<1.3||(x===-8&&y>0&&y<14))return {name:'Дорога',risk:.10,material:4};
  if(x>4&&y>-5&&y<7)return {name:'Руины',risk:.24,material:10};
  if(x< -5&&y>2&&y<12)return {name:'Поля',risk:.08,material:3};
  return {name:'Лесополоса',risk:.14,material:6};
}
export function duration(cell:Cell,action:Action,origin:Cell={x:-1,y:1}){
  const travel=Math.ceil(Math.hypot(cell.x-origin.x,cell.y-origin.y));
  return travel+({scout:2,research:5,build:10}[action]);
}
export function cellKey(c:Cell){return c.x+','+c.y}
