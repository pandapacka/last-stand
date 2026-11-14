import {actions,cellKey,duration,region,type Action,type Cell} from '../shared/world.ts';
type Trip={type:string;ids:number[];cell?:Cell;action?:Action;arriveAt?:number};
type State={food:number;wood:number;metal:number;day:number;settlers:{id:number;health:number;status:string}[];expeditions:Trip[];world:{posts?:string[];surveyed?:string[];exploredCells?:string[]}};
export function dispatch(s:State,cell:Cell,action:Action,ids:number[],now=Date.now(),kind:'house'|'tower'='tower',origin:Cell={x:-1,y:1}){
  if(!Object.hasOwn(actions,action)||![cell.x,cell.y].every(n=>Number.isInteger(n)&&Math.abs(n)<=24))return 'Недоступная цель';
  const party=s.settlers.filter(p=>ids.includes(p.id)&&p.health>0&&p.status==='дома');
  if(!ids.length||ids.length>2||party.length!==ids.length)return 'Выбери одного или двух свободных поселенцев';
  if(s.food<3*ids.length)return 'Не хватает пайков';
  if(action==='build'){
    if(!['house','tower'].includes(kind)||cell.x===-1&&cell.y===1)return 'Выбери другую постройку или клетку';
    if(s.world.posts?.includes(cellKey(cell))||s.expeditions.some(e=>e.action==='build'&&e.cell&&cellKey(e.cell)===cellKey(cell)))return 'Здесь уже есть пост или идёт строительство';
    if(s.wood<20||s.metal<5)return 'Нужны 20 материалов и 5 металла';
    s.wood-=20;s.metal-=5;
  }
  s.food-=3*ids.length;
  for(const p of party)p.status='в экспедиции';
  const leg=Math.max(1,Math.ceil(Math.hypot(cell.x-origin.x,cell.y-origin.y)))*60000;
  const siteAt=now+leg,doneAt=siteAt+(kind==='house'?30:10)*60000;
  s.expeditions.push({...action==='build'?{kind,siteAt,doneAt}:{},origin:{...origin},type:'sector',action,cell:{...cell},ids:[...ids],departAt:now,arriveAt:action==='build'?doneAt+leg:now+duration(cell,action,origin)*60000,returnDay:s.day+1} as Trip);
  return '';
}
export function finishCell(s:State,cell:Cell,action:Action){
  const field=action==='build'?'posts':action==='scout'?'surveyed':'exploredCells';
  const records=s.world[field]??=[];
  if(!records.includes(cellKey(cell)))records.push(cellKey(cell));
}
export function fieldMission(cell:Cell,action:Action){
  const area=region(cell),loot=action==='research'?area.material:0;
  return {risk:area.risk*(action==='scout'?.6:1),food:[0,0],wood:[loot,loot],metal:[0,action==='research'?2:0]};
}
