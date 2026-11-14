import {CROPS} from '../shared/crops.ts';
const minute=60_000;
export const wetDuration=20*minute;
type Crop=typeof CROPS[number];
type Plot={crop:string|null;progress?:number;water?:number;readyAt?:number;remaining?:number;since?:number;wetUntil?:number;fertilized?:boolean};
type Farmer={id:number;health:number;status:string;skill:number};
type Farm={wood:number;settlers:Farmer[];agri:{plots:Plot[];seeds:Record<string,number>;produce:Record<string,number>;farmer:number;experience:number;fertilizer?:number}};
export function growth(p:Plot,c:Crop,now=Date.now()){
  const duration=c.days*10*minute;
  if(p.remaining===undefined){
    p.remaining=Math.min(duration,Math.max(0,p.readyAt!==undefined?p.readyAt-now:duration-(p.progress||0)*10*minute));
    p.since=now;p.wetUntil=now+((p.water??0)>0?wetDuration:0);
    delete p.readyAt;
  }
  const until=p.wetUntil??now;
  const elapsed=Math.max(0,Math.min(now,until)-(p.since??now));
  const rate=p.fertilized?2:1;
  const remaining=Math.max(0,p.remaining-elapsed*rate);
  return {remaining,wet:now<until,minutes:remaining/rate/minute,progress:1-remaining/duration};
}
export function plant(s:Farm,i:number,name:string,now=Date.now()){
  const ag=s.agri,c=CROPS.find(c=>c.name===name);
  if(!c||!ag.plots[i]||ag.plots[i].crop||!(ag.seeds[name]>0))return false;
  ag.seeds[name]--;ag.plots[i]={crop:name,remaining:c.days*10*minute,since:now,wetUntil:now};
  return true;
}
export function tend(s:Farm,indices:number[],kind:'water'|'fertilize',now=Date.now(),bulk=false){
  const ag=s.agri,targets=[];
  for(const i of new Set(indices)){
    const p=ag.plots[i],c=CROPS.find(c=>c.name===p?.crop);if(!c)continue;
    const g=growth(p,c,now);
    if(g.remaining>0&&(kind==='water'?(p.wetUntil??0)<now+wetDuration:!p.fertilized))targets.push({p,g});
  }
  const cost=bulk?3:1;
  if(!targets.length)return false;
  if(kind==='water'){if(s.wood<cost)return false;s.wood-=cost}
  else {if((ag.fertilizer??0)<targets.length)return false;ag.fertilizer!-=targets.length}
  for(const {p,g} of targets){
    p.remaining=g.remaining;p.since=now;
    if(kind==='water')p.wetUntil=now+wetDuration;
    else p.fertilized=true;
  }
  return true;
}
export function harvest(s:Farm,i:number,now=Date.now()){
  const ag=s.agri,p=ag.plots[i],c=CROPS.find(c=>c.name===p?.crop);
  if(!c||growth(p,c,now).remaining>0)return 0;
  const f=s.settlers.find(p=>p.id===Number(ag.farmer)&&p.health>0&&p.status==='дома');
  const amount=c.yieldAmount+(f?Math.floor(f.skill/3)+(f.id===3?2:0):0);
  ag.produce[c.name]=(ag.produce[c.name]||0)+amount;
  ag.seeds[c.name]=(ag.seeds[c.name]||0)+Math.max(1,Math.floor(amount/4));
  if(f&&++ag.experience%4===0)f.skill=Math.min(10,f.skill+1);
  ag.plots[i]={crop:null};return amount;
}
