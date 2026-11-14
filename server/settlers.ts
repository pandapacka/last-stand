import {RECIPES} from '../shared/recipes.ts';
export const mealSatiety=18;
type Person={id:number;name:string;health:number;status:string;mealAt?:number;infectionAt?:number};
type Diet={history:string[];favorite:string;hunger:number;morale:number};
type State={settlers:Person[];food:number;cooking:{meals:Record<string,number>};nutrition:{mode:string;people:Record<number,Diet>}};
function feed(s:State,p:Person){
  const n=s.nutrition.people[p.id]??={hunger:85,morale:65,history:[],favorite:'Суп'};
  const meals=s.cooking.meals,mode=s.nutrition.mode;
  function score(name:string){
    const q=RECIPES.find(r=>r.name===name)?.food||5;
    const variety=n.history.slice(-3).includes(name)?-15:4;
    return (mode==='save'?-q:mode==='best'?q*2:q/2+variety)+(name.includes(n.favorite)?5:0);
  }
  const dish=Object.keys(meals).filter(name=>meals[name]>0).sort((a,b)=>score(b)-score(a))[0];
  let result=dish;
  if(dish){
    meals[dish]--;n.history=[...n.history,dish].slice(-7);n.hunger=Math.min(100,n.hunger+mealSatiety);
    const variety=new Set(n.history.slice(-4)).size;
    n.morale=Math.min(100,n.morale+(variety>=3?3:variety===1?-2:1));
  }else if(s.food>=2){
    s.food-=2;n.hunger=Math.min(100,n.hunger+7);n.morale=Math.max(0,n.morale-2);result='аварийный паёк';
  }else{
    n.hunger=Math.max(0,n.hunger-23);n.morale=Math.max(0,n.morale-7);result='голод';
    if(n.hunger<35){p.health=Math.max(0,p.health-8);if(!p.health)p.status='погиб'}
  }
  if(p.status!=='дома')n.hunger=Math.max(0,n.hunger-5);
  return 'Питание: '+p.name+': '+result+'.';
}
export function settleSettlers(s:State,log:(message:string)=>void,now=Date.now()){
  let changed=false;
  for(const p of s.settlers){
    if(p.health<=0)continue;
    if(!p.mealAt){p.mealAt=now+(55+p.id)*60000;changed=true}
    if(p.mealAt<=now){log(feed(s,p));p.mealAt=now+3600000;changed=true}
    if(p.status!=='заражён')continue;
    if(!p.infectionAt){p.infectionAt=now+1800000;changed=true}
    if(p.infectionAt<=now){
      p.health=Math.max(0,p.health-9);
      if(!p.health){p.status='погиб';log(p.name+' погиб(ла) от инфекции.')}
      p.infectionAt=now+1800000;changed=true;
    }
  }
  return changed;
}
