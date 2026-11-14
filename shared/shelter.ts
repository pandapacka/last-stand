import {placementWouldOverlap} from './collision.ts';
export type Cell={x:number;y:number};
export type Building=Cell & {t:string;rot?:number;buildEnd?:number};
export type ShelterState={buildings:Building[];food:number;wood:number;metal:number};
export type BuildCommand=Building;
export const rules:Record<string,readonly [number,number,number,number]>={
  tower:[0,35,25,60],trap:[0,15,5,5],farm:[0,30,0,20],scrap:[0,25,15,45],
  house:[20,40,0,30],wall:[0,15,0,10],canteen:[0,45,15,40]
};
export function constructionError(state:ShelterState,cmd:BuildCommand){
  const {x,y,t}=cmd;
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=24||y>=16)return 'За пределами карты';
  if(!Object.hasOwn(rules,t))return 'Неизвестная постройка';
  if(placementWouldOverlap(x,y,{ox:0,oy:0,w:1,h:1},state.buildings.map(b=>({x:b.x,y:b.y,w:1,h:1}))))return 'Клетка занята';
  if(!['tower','wall','trap'].includes(t)&&(x<4||x>10||y<3||y>8))return 'Постройте внутри ограды';
  const [food,wood,metal]=rules[t];
  if(state.food<food||state.wood<wood||state.metal<metal)return 'Недостаточно ресурсов';
  return '';
}
