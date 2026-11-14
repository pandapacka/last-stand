import {actions as fieldActions,cellKey,duration as fieldDuration,region} from '../shared/world.ts';
import {dispatch,finishCell,fieldMission} from '../server/world.ts';
import {CROPS} from '../shared/crops.ts';
import {growth,plant,tend,harvest} from '../server/farm.ts';
import {settleSettlers,mealSatiety} from '../server/settlers.ts';
import {RECIPES} from '../shared/recipes.ts';
import {chefLevel,canPrepare,ingredientCount} from '../shared/kitchen.ts';
import {enqueueDish,finishDishes,settleWorkshops} from '../server/production.ts';
import {readSave,saveKey} from './storage.ts';
import Phaser from 'phaser';
import {Shelter,cellAt,point} from './Shelter.ts';
import {construct} from '../server/construction.ts';
import {constructionError} from '../shared/shelter.ts';

const C=document.getElementById('game'),W=24,H=16,S=50;const defs={tower:{name:'Башня',icon:'🎯',cost:[0,35,25]},trap:{name:'Ловушка',icon:'🪤',cost:[0,15,5]},farm:{name:'Ферма',icon:'🌱',cost:[0,30,0]},scrap:{name:'Мастерская',icon:'🔧',cost:[0,25,15]},house:{name:'Жильё',icon:'🏠',cost:[20,40,0]},wall:{name:'Баррикада',icon:'🧱',cost:[0,15,0]},remove:{name:'Убрать',icon:'✖',cost:[0,0,0]}};let selected='tower',state;const initialSettlers=()=>[{id:1,name:'Анна',role:'Фельдшер',skill:2,health:100,status:'дома'},{id:2,name:'Виктор',role:'Механик',skill:3,health:100,status:'дома'},{id:3,name:'Марина',role:'Агроном',skill:2,health:100,status:'дома'},{id:4,name:'Егор',role:'Охотник',skill:7,health:100,status:'дома'},{id:5,name:'Лена',role:'Разведчица',skill:6,health:100,status:'дома'}];const seed=()=>({day:1,food:120,wood:160,metal:90,people:5,hp:100,settlers:initialSettlers(),expeditions:[],log:[],buildings:[{x:6,y:5,t:'hq'},{x:5,y:4,t:'farm'},{x:8,y:5,t:'house'},{x:7,y:7,t:'scrap'},{x:3,y:4,t:'tower'},{x:12,y:6,t:'trap'}],zombies:[],wave:0});
const activeKey=sessionStorage.getItem('activeShelter')||'-1,1';
const [homeX,homeY]=activeKey.split(',').map(Number);
const origin={x:homeX,y:homeY};
const slot=activeKey==='-1,1'?saveKey:saveKey+':'+activeKey;
function enterShelter(key){
 if(key===activeKey){openTab('base');return}
 save();sessionStorage.setItem('activeShelter',key);location.reload();
}
function registerSites(){
 const known=JSON.parse(localStorage.getItem(saveKey+':sites')||'{}');
 Object.assign(known,state.world.structures);
 for(const e of state.expeditions)if(e.kind&&e.cell&&e.doneAt<=Date.now())known[cellKey(e.cell)]=e.kind;
 const encoded=JSON.stringify(known);
 if(localStorage.getItem(saveKey+':sites')!==encoded)localStorage.setItem(saveKey+':sites',encoded);
 return known;
}
try{state=slot===saveKey?readSave(localStorage)||seed():JSON.parse(localStorage.getItem(slot)||'null');
 if(!state){state=seed();state.buildings=state.buildings.filter(b=>b.t==='hq')}
}catch{state=seed()}if(!Array.isArray(state.settlers)){state.settlers=initialSettlers();state.expeditions=[];state.log=[];state.people=state.settlers.length}state.expeditions ||= [];state.log ||= [];const inside=(x,y)=>x>=4&&x<=10&&y>=3&&y<=8;const occupied=(x,y)=>state.buildings.some(b=>b.x===x&&b.y===y);const $=id=>document.getElementById(id);const save=()=>{try{localStorage.setItem(slot,JSON.stringify(state))}catch{}};const msg=t=>$('message').textContent=t;function renderUI(){state.people=state.settlers.filter(p=>p.health>0).length;for(let k of ['food','wood','metal','people','hp'])$(k).textContent=state[k];$('day').textContent='День '+state.day;$('wave').textContent=state.wave?'Набегов: '+state.wave:'Угроза: низкая';document.querySelectorAll('.tool').forEach(el=>el.classList.toggle('active',el.dataset.t===selected))}let zoom=1,panX=0,panY=0,preview=null;
defs.canteen={name:'Столовая',icon:'🍲',cost:[0,45,15]};
if (!state.canteenPlaced) {
  let tile;
  for(let y=8;y>=3&&!tile;y--)for(let x=10;x>=4;x--)if(!occupied(x,y)){tile={x,y,t:'canteen'};break}
  if(tile)state.buildings.push(tile);
  state.canteenPlaced=true;
}
const minute=60000;
function completed(b){return !b.buildEnd || b.buildEnd<=Date.now()}

const sprites={};
const art = {
  traveler:'base/expedition-scout',
  site:'construction/site', hammer:'construction/hammer', saw:'construction/saw', clock:'construction/clock', canteen:'base/canteen', hq:'base/hq', tower:'base/watchtower', trap:'base/barricade',
  farm:'base/garden', scrap:'base/workshop', house:'base/barracks', wall:'base/fence',
  spruce:'nature/spruce', pine:'nature/pine', warehouse:'base/warehouse', grass:'nature/grass'
};
for(const [key,path] of Object.entries(art)){
 const image=sprites[key]=new Image();
 image.onload=()=>{if(activeTab==='world')worldCanvasDraw()};
 image.src='assets/atlas-sprites/'+path+'.png';
}
function paintSprite(context,key,x,y,width) {
  const image = sprites[key];
  if (!image?.naturalWidth) return false;
  const height = width * image.naturalHeight / image.naturalWidth;
  context.drawImage(image,x-width/2,y-height,width,height);
  return true;
}
function pt(x,y){const p=point(x,y);return [p.x,p.y]}
function draw(){positionBuildingWheel()}
function worldPointerPosition(e){
 const r=C.getBoundingClientRect();
 return {x:((e.clientX-r.left)/r.width*800-400-panX)/zoom+400,y:((e.clientY-r.top)/r.height*640-225-panY)/zoom+225};
}
function hit(e){const p=worldPointerPosition(e);return cellAt(p.x,p.y)}
function update(){renderUI();draw();save()}for(let [t,d] of Object.entries(defs)){let el=document.createElement('button');el.className='tool';el.dataset.t=t;el.innerHTML=`<span>${d.icon}</span>${d.name}<small>${d.cost[0]?'🥫'+d.cost[0]+' ':''}${d.cost[1]?'🪵'+d.cost[1]+' ':''}${d.cost[2]?'⚙️'+d.cost[2]:''}</small>`;el.onclick=()=>{selected=t;preview=null;syncPreview();renderUI();msg('Выбрано: '+d.name+'. Нажми на клетку для предпросмотра.')};$('tools').append(el)}function place(x,y){if(x<0||x>=W||y<0||y>=H)return;let b=state.buildings.find(b=>b.x===x&&b.y===y);if(selected==='remove'){if(!b||b.t==='hq')return msg('Этот объект нельзя убрать.');state.buildings=state.buildings.filter(q=>q!==b);msg('Объект разобран.');return update()}const error=construct(state,{x,y,t:selected,rot:preview?.rot||0});
if(error){msg(error);return false}
msg('Строительство: '+defs[selected].name);update();return true}
function syncPreview(){let el=$('placement');el.hidden=!preview;const reason=preview?constructionError(state,preview):'';$('confirm').disabled=!!reason;if(reason)msg(reason);if(preview)$('placementlabel').textContent=defs[preview.t].name+' · '+(preview.x+1)+','+(preview.y+1);draw()}
$('rotate').onclick=()=>{if(preview){preview.rot=((preview.rot||0)+1)%2;syncPreview()}};
$('cancel').onclick=()=>{preview=null;syncPreview()};
$('confirm').onclick=()=>{if(preview&&place(preview.x,preview.y)){preview=null;syncPreview()}};
let movingGhost=false;
C.addEventListener('wheel',e=>{
  e.preventDefault();
  const focus=worldPointerPosition(e);
  const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?C.clientHeight:1);
  const next=Math.max(.65,Math.min(2.6,zoom*Math.exp(-Math.max(-240,Math.min(240,pixels))*.002)));
  panX+=(focus.x-400)*(zoom-next);
  panY+=(focus.y-225)*(zoom-next);
  zoom=next;draw();
},{passive:false});
const pointers=new Map();let gesture=null,gestureMoved=false,downAt=null;
function pointerDistance(){let a=[...pointers.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}
C.addEventListener('pointerdown',e=>{C.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){downAt={x:e.clientX,y:e.clientY,panX,panY};gestureMoved=false;const cell=hit(e);movingGhost=!!preview&&preview.x===cell.x&&preview.y===cell.y}else if(pointers.size===2){movingGhost=false;gesture={dist:pointerDistance(),zoom,panX,panY,midX:([...pointers.values()][0].x+[...pointers.values()][1].x)/2,midY:([...pointers.values()][0].y+[...pointers.values()][1].y)/2};gestureMoved=true}});
C.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&gesture){let a=[...pointers.values()],midX=(a[0].x+a[1].x)/2,midY=(a[0].y+a[1].y)/2;zoom=Math.max(.65,Math.min(2.6,gesture.zoom*pointerDistance()/Math.max(1,gesture.dist)));let r=C.getBoundingClientRect(),factor=800/r.width;panX=gesture.panX+(midX-gesture.midX)*factor;panY=gesture.panY+(midY-gesture.midY)*factor;draw()}else if(pointers.size===1&&downAt){if(Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)>6)gestureMoved=true;if(gestureMoved&&movingGhost&&preview){Object.assign(preview,hit(e));syncPreview()}else if(gestureMoved){const scale=800/C.getBoundingClientRect().width;panX=downAt.panX+(e.clientX-downAt.x)*scale;panY=downAt.panY+(e.clientY-downAt.y)*scale;draw()}}});
// Pick the frontmost visible sprite before falling back to its ground cell.
function inspectTap(e){const pos=worldPointerPosition(e);const b=scene.pick(pos.x,pos.y);if(b.x>=0&&b.y>=0&&b.x<W&&b.y<H)inspectCell(b.x,b.y)}
C.addEventListener('pointerup',e=>{if(!gestureMoved&&pointers.size===1){let p=hit(e);if(window.mapMode==='view')inspectTap(e,p);else if(p.x>=0&&p.x<W&&p.y>=0&&p.y<H){if(selected==='remove')place(p.x,p.y);else{preview={...p,t:selected,rot:preview?.rot||0};syncPreview()}}}pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;downAt=null});
C.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;gestureMoved=true});const missions={sector:{label:'Разведка клетки',days:1,risk:.12,food:[0,10],wood:[2,10],metal:[0,4]},forest:{label:'Охота в лесу',days:1,risk:.12,food:[18,40],wood:[0,8],metal:[0,0]},scout:{label:'Разведка окрестностей',days:1,risk:.19,food:[0,12],wood:[5,18],metal:[0,5]},city:{label:'Поиск припасов в городе',days:2,risk:.42,food:[15,45],wood:[5,20],metal:[10,35]},farmstead:{label:'Заброшенная ферма',days:2,risk:.24,food:[15,30],wood:[8,24],metal:[0,8]},clinic:{label:'Медпункт',days:2,risk:.5,food:[0,8],wood:[0,4],metal:[8,20]},relay:{label:'Радиовышка',days:3,risk:.54,food:[0,8],wood:[0,10],metal:[10,24]}};
function logEvent(text){state.log.unshift(text);state.log=state.log.slice(0,15)}
function renderExpeditions(){$('missions').innerHTML=state.expeditions.length?state.expeditions.map(e=>'<div class="mission">'+(fieldActions[e.action]||missions[e.type].label)+(e.cell?' ('+e.cell.x+', '+e.cell.y+')':'')+' · '+e.ids.map(id=>state.settlers.find(p=>p.id===id)?.name).join(', ')+' · '+(e.arriveAt?'осталось '+Math.max(0,Math.ceil((e.arriveAt-Date.now())/60000))+' мин':'возвращение: день '+e.returnDay)+'</div>').join(''):'<small>Сейчас никто не в экспедиции.</small>';Array.from($('missions').querySelectorAll('.mission')).forEach((row,i)=>{const trip=state.expeditions[i];row.append(speedButton(()=>speedTrip(trip,true)))});$('expLog').innerHTML=state.log.length?state.log.map(t=>'<p>'+t+'</p>').join(''):'<small>Пока нет событий.</small>'}
$('chooseWorldCell').onclick=()=>openTab('world');
function resolveExpeditions(){let finished=state.expeditions.filter(e=>(e.arriveAt?Date.now()>=e.arriveAt:e.returnDay<=state.day));state.expeditions=state.expeditions.filter(e=>(e.arriveAt?Date.now()<e.arriveAt:e.returnDay>state.day));for(let e of finished){let m=e.cell&&e.action?fieldMission(e.cell,e.action):missions[e.type],names=e.ids.map(id=>state.settlers.find(p=>p.id===id)?.name).join(', '),skill=e.ids.reduce((n,id)=>n+state.settlers.find(p=>p.id===id).skill,0)/e.ids.length;let risk=Math.max(.04,m.risk-skill*.018),dead=0,infected=0;for(let id of e.ids){let p=state.settlers.find(p=>p.id===id);p.status='дома';let roll=Math.random();if(roll<risk*.17){p.health=0;p.status='погиб';dead++}else if(roll<risk*.57){p.health=Math.max(10,p.health-25);p.status='заражён';infected++}else if(roll<risk){p.health=Math.max(20,p.health-15)}else p.skill=Math.min(10,p.skill+1)}let survivors=e.ids.filter(id=>state.settlers.find(p=>p.id===id).health>0).length;if(survivors){let gain=(arr)=>Math.floor(arr[0]+Math.random()*(arr[1]-arr[0]+1))*survivors;let f=gain(m.food),w=gain(m.wood),met=gain(m.metal);state.food+=f;state.wood+=w;state.metal+=met;logEvent(names+' вернулись из похода. Добыча: еда '+f+', материалы '+w+', металл '+met+'.'+(infected?' Заражение: '+infected+'.':'')+(dead?' Погибли: '+dead+'.':''))}else logEvent('Экспедиция '+names+' не вернулась. Все погибли.');}}

const oldUpdate=update;update=function(){oldUpdate();renderExpeditions()};
$('attack').onclick=()=>{state.wave++;let towers=state.buildings.filter(b=>b.t==='tower'&&completed(b)).length,traps=state.buildings.filter(b=>b.t==='trap'&&completed(b)).length,walls=state.buildings.filter(b=>b.t==='wall'&&completed(b)).length;let enemy=4+state.wave*3,def=towers*4+traps*2+walls;let dmg=Math.max(0,(enemy-def)*6);state.hp=Math.max(0,state.hp-dmg);state.zombies=Array.from({length:Math.min(enemy,12)},(_,i)=>({x:i%2?1:14,y:1+(i*3)%10}));msg(dmg?'Набег! Защита уничтожила часть орды. База потеряла '+dmg+' прочности.':'Набег отбит без потерь!');update();if(state.hp===0)msg('База разрушена. Нажми «Сброс», чтобы начать заново.')};$('reset').onclick=()=>{if(confirm('Начать новую игру?')){state=seed();msg('Новая база готова.');update()}};update();$('zin').onclick=()=>{zoom=Math.min(2.6,zoom+.2);draw()};$('zout').onclick=()=>{zoom=Math.max(.65,zoom-.2);draw()};

// World map and narrative extension 0.5. Separate save slot preserves 0.4.
const sites={home:{name:'Убежище «Север»',icon:'🏠',x:47,y:53,desc:'Наш дом. Пока только здесь можно чувствовать себя относительно спокойно.',risk:'Безопасно'},forest:{name:'Сосновый лес',icon:'🌲',x:19,y:28,desc:'Звериные тропы, ягоды, ручей. Иногда встречаются одиночные заражённые.',risk:'Низкий',type:'forest'},scout:{name:'Старая дорога',icon:'🔭',x:68,y:30,desc:'Разбитые машины и следы эвакуации. Здесь можно узнать, куда ушли люди.',risk:'Средний',type:'scout'},farmstead:{name:'Заброшенная ферма',icon:'🚜',x:22,y:76,desc:'Теплицы и зернохранилище. Возможно, уцелели семена и консервы.',risk:'Средний',type:'farmstead'},city:{name:'Окраина города',icon:'🏚️',x:80,y:66,desc:'Магазины, гаражи, квартиры. Много припасов, но и заражённых.',risk:'Высокий',type:'city'},clinic:{name:'Медпункт',icon:'🏥',x:83,y:17,desc:'Аптечные запасы, записи врача. Сюда стоит идти только подготовленной группой.',risk:'Очень высокий',type:'clinic'},relay:{name:'Радиовышка',icon:'📡',x:51,y:9,desc:'На старой вышке может работать аварийный ретранслятор. Ключ к связи с другими выжившими.',risk:'Очень высокий',type:'relay'}};
state.world ||= {discovered:['home','forest','scout','city'],visited:[],clues:[],radio:false,chapter:0,storyQueue:[],storyDone:[]};
let selectedCell=null;

function worldMessage(title,body,choices){state.world.storyQueue.push({title,body,choices});}
function renderWorld(){const w=state.world;const map=$('worldmap');map.innerHTML='';$('radioStatus').textContent=w.radio?'📻 Рация работает · канал выживших открыт (сеть пока не реализована)':'📻 Связь отсутствует · альянсы недоступны';const panel=$('story');panel.innerHTML='';if(w.storyQueue.length){const event=w.storyQueue[0];let h=document.createElement('strong');h.textContent=event.title;panel.append(h);let p=document.createElement('p');p.textContent=event.body;panel.append(p);event.choices.forEach((c,i)=>{let btn=document.createElement('button');btn.textContent=c.label;btn.onclick=()=>{w.storyQueue.shift();applyChoice(c);update()};panel.append(btn)})}else{panel.innerHTML='<strong>📖 Журнал истории</strong><p>'+(w.radio?'Радиоканал открыт. Другие выжившие существуют, но серверная MMO ещё не подключена.':w.chapter?'Находки складываются в картину. Радиовышка может оказаться ключом к связи.':'День первый. За оградой — тишина. Нужно исследовать окрестности и найти следы пропавших людей.')+'</p>'}}
function applyChoice(c){const w=state.world;if(c.effect==='radio'){w.radio=true;logEvent('Восстановлена рация. Связь с другими поселениями теперь возможна.')}else if(c.effect==='food'){state.food+=15;logEvent('Найдены дополнительные консервы: +15 еды.')}else if(c.effect==='metal'){state.metal+=12;logEvent('Сохранены радиодетали: +12 металла.')}else if(c.effect==='clue'){if(!w.clues.includes('frequency'))w.clues.push('frequency');logEvent('Записана аварийная частота.')}else if(c.effect==='none')logEvent('Решение принято: '+c.label);}
function worldDiscovery(e){if(e.cell&&e.action){finishCell(state,e.cell,e.action);if(e.kind){state.world.structures??={};state.world.structures[cellKey(e.cell)]=e.kind;registerSites()}return}if(e.cell){state.world.exploredCells??=[];const key=e.cell.x+','+e.cell.y;if(!state.world.exploredCells.includes(key))state.world.exploredCells.push(key);return}const w=state.world,id=e.type; if(!w.visited.includes(id))w.visited.push(id);if(id==='scout'){for(let key of ['farmstead','clinic','relay'])if(!w.discovered.includes(key))w.discovered.push(key);if(!w.storyDone.includes('scout')){w.storyDone.push('scout');w.chapter=1;worldMessage('Глава I · Следы эвакуации','На старой дороге разведчики нашли автобус с заколоченными окнами. На приборной панели — карта с отметкой радиовышки. Рядом лежит блокнот: «Не доверяйте голосам на общей частоте».',[{label:'Забрать карту и записать частоту',effect:'clue'},{label:'Забрать полезные детали',effect:'metal'}])}}
if(id==='farmstead'&&!w.storyDone.includes('farmstead')){w.storyDone.push('farmstead');worldMessage('Теплицы без хозяев','В теплице сохранились пакеты семян и банки с едой. На стене — странные царапины, будто растения пытались выбраться наружу.',[{label:'Забрать продукты (+15 еды)',effect:'food'},{label:'Зафиксировать необычные следы',effect:'none'}])}
if(id==='city'&&!w.storyDone.includes('city')){w.storyDone.push('city');worldMessage('Город · Квартира № 17','За запертой дверью слышится стук. Внутри обнаружена работающая радиостанция, но её антенна сломана. На стене записана частота аварийной связи.',[{label:'Записать частоту',effect:'clue'},{label:'Разобрать оборудование (+12 металла)',effect:'metal'}])}
if(id==='relay'&&!w.storyDone.includes('relay')){w.storyDone.push('relay');worldMessage('Глава II · Голоса в эфире','На вершине вышки сохранился аварийный радиоблок. В динамике треск и обрывок сообщения: «Если кто-то слышит — ответьте…» Вы можете наладить связь, но это выдаст ваше присутствие.',[{label:'Восстановить радиосвязь',effect:'radio'},{label:'Пока оставить передатчик выключенным',effect:'none'}])}
if(id==='clinic'&&!w.storyDone.includes('clinic')){w.storyDone.push('clinic');worldMessage('Медпункт · Протокол 09','В журнале дежурного врача описаны пациенты, реагирующие на неизвестные споры. Возможно, зомби — не единственная опасность.',[{label:'Сохранить медицинские записи',effect:'none'}])}
}

// Wrap existing expedition resolution to trigger narrative only for parties that return.
const baseResolveExpeditions=resolveExpeditions;
resolveExpeditions=function(){const due=state.expeditions.filter(e=>(e.arriveAt?Date.now()>=e.arriveAt:e.returnDay<=state.day)).map(e=>({...e}));baseResolveExpeditions();for(const e of due){if(e.ids.some(id=>state.settlers.find(p=>p.id===id)?.health>0))worldDiscovery(e)}};
const updateWithExpeditions=update;
update=function(){updateWithExpeditions();renderWorld()};
if(!state.world.storyDone.length&&!state.world.storyQueue.length){worldMessage('Пролог · Первый день','Убежище «Север» пережило первую ночь. Генератор молчит. За оградой иногда слышатся шаги. Никто не знает, остался ли кто-то ещё в живых. Пока ваша задача — удержать этих пятерых людей вместе.',[{label:'Начать разведку окрестностей',effect:'none'}])}
update();

// 0.6 — посевы, отдельные семена, урожай и развитие агронома.

state.agri ||= {plots:[],seeds:{},produce:{},farmer:3,auto:false,experience:0};
let ag=state.agri;
ag.fertilizer??=100;
for(const c of CROPS){if(ag.seeds[c.name]===undefined)ag.seeds[c.name]=['Картофель','Морковь','Томат','Горох','Лук','Капуста'].includes(c.name)?5:0}
function plotCapacity(){return state.buildings.filter(b=>b.t==='farm'&&completed(b)).length*4}
function normalizePlots(){let n=plotCapacity();while(ag.plots.length<n)ag.plots.push({crop:null,progress:0,water:0});if(ag.plots.length>n)ag.plots.length=n}
function farmer(){return state.settlers.find(p=>p.id===Number(ag.farmer)&&p.health>0&&p.status==='дома')}
function farmerBonus(){let p=farmer();return p?(p.id===3?2:0)+Math.floor((p.skill||0)/3):0}
function harvestPlot(i){const name=ag.plots[i]?.crop,amount=harvest(state,i);if(amount)logEvent('Урожай: '+name+' ×'+amount+' (семена сохранены).');return !!amount}
function plantPlot(i){const name=$('cropSelect').value;if(!plant(state,i,name))return msg('Посадка недоступна. Проверь семена.');update()}
function renderAgriculture(){normalizePlots();let selected=$('cropSelect').value,c=CROPS.find(x=>x.name===selected)||CROPS[0];$('cropInfo').textContent=c.icon+' '+c.name+' · рост '+(c.days*10)+' мин. · урожай '+c.yieldAmount+'+'+farmerBonus()+' · семян '+ag.seeds[c.name]+' · удобрений '+ag.fertilizer;
$('autoFarm').textContent='Автосбор: '+(ag.auto?'вкл.':'выкл.');
$('agriSummary').textContent='Грядок: '+ag.plots.length+' · Агроном: '+(farmer()?.name||'не назначен / занят')+' · бонус урожая: +'+farmerBonus();
let box=$('plots');box.replaceChildren();ag.plots.forEach((p,i)=>{let d=document.createElement('div');d.className='plot';let c=CROPS.find(x=>x.name===p.crop),g=c&&growth(p,c),ready=g&&g.remaining===0;let title=document.createElement('b');title.textContent='Грядка '+(i+1)+' · '+(c?c.icon+' '+c.name:'свободна');d.append(title);
let detail=document.createElement('small');detail.textContent=c?(ready?'Урожай созрел':(g.wet?'Растёт':'Сухо · рост остановлен')+' · осталось '+kitchenClock(g.minutes*minute)+(p.fertilized?' · ×2':'')):'Выбери культуру и посади';d.append(detail);if(c&&!ready)d.append(speedButton(()=>{if(ag.plots[i]!==p)return;p.remaining=0;p.since=Date.now();reconcileJobs();update()}));
if(c){let bar=document.createElement('div');bar.className='progress';let inner=document.createElement('i');inner.style.width=Math.min(100,Math.max(0,100*g.progress))+'%';bar.append(inner);d.append(bar)}
let b=document.createElement('button');b.textContent=!c?'🌱 Посадить':ready?'🧺 Собрать':'💧 Полить';b.onclick=()=>{if(!c)plantPlot(i);else if(ready){harvestPlot(i);update()}else if(tend(state,[i],'water'))update();else msg('Полив недоступен.')};d.append(b);
if(c&&!ready){const fertilizer=document.createElement('button');fertilizer.textContent=p.fertilized?'Удобрено ×2':'Удобрить ×2 (−1)';fertilizer.disabled=p.fertilized||ag.fertilizer<1;fertilizer.onclick=()=>{if(tend(state,[i],'fertilize'))update()};d.append(fertilizer)}box.append(d)});
const stock=$('harvestInventory');stock.replaceChildren();
for(const [title,items] of [['Урожай',ag.produce],['Семена',ag.seeds]]){
  const block=document.createElement('section'),heading=document.createElement('h3');heading.textContent=title;block.append(heading);
  for(const [name,n] of Object.entries(items).filter(([,qty])=>qty>0).sort(([a],[b])=>a.localeCompare(b,'ru'))){
    const row=document.createElement('div'),qty=document.createElement('b');qty.textContent=n;row.append(name,qty);block.append(row);
  }
  if(block.children.length===1)block.append('Пока пусто');stock.append(block);
}}
document.querySelector('.farmTabs').onclick=e=>{
  const tab=e.target.closest('[data-farm]');if(!tab)return;
  for(const btn of tab.parentElement.children)btn.setAttribute('aria-pressed',String(btn===tab));
  for(const [key,id] of Object.entries({beds:'farmBeds',manage:'farmManage',store:'farmStore'}))$(id).hidden=key!==tab.dataset.farm;
};
let sel=$('cropSelect');for(const c of CROPS){let o=document.createElement('option');o.value=c.name;o.textContent=c.icon+' '+c.name;sel.append(o)}sel.onchange=renderAgriculture;
let fs=$('farmerSelect');let empty=document.createElement('option');empty.value='0';empty.textContent='Без агронома';fs.append(empty);for(let p of state.settlers){let o=document.createElement('option');o.value=p.id;o.textContent=p.name+' · '+p.role;fs.append(o)}fs.value=String(ag.farmer);fs.onchange=()=>{ag.farmer=Number(fs.value);update()};
$('autoFarm').onclick=()=>{ag.auto=!ag.auto;update()};
$('waterAll').onclick=()=>{if(tend(state,ag.plots.map((_,i)=>i),'water',Date.now(),true))update();else msg('Нет грядок для полива или недостаточно материалов.')};
const agriOldUpdate=update;
update=function(){agriOldUpdate();renderAgriculture()};
const agriOldResolve=resolveExpeditions;
resolveExpeditions=function(){let returning=state.expeditions.filter(e=>(e.arriveAt?Date.now()>=e.arriveAt:e.returnDay<=state.day)).map(e=>e.type);agriOldResolve();if(returning.includes('farmstead')){let finds=CROPS.filter(c=>(ag.seeds[c.name]||0)===0);let c=finds.length?finds[Math.floor(Math.random()*finds.length)]:CROPS[Math.floor(Math.random()*CROPS.length)];ag.seeds[c.name]+=3;logEvent('На ферме найдены семена: '+c.name+' ×3.')}};
update();

// Кулинария 0.7: 50+ блюд, настоящие ингредиенты, уровни кухни и повара.
state.cooking ||= {kitchen:1,chef:3,chefXp:{},meals:{},pantry:{'Вода':30,'Соль':12,'Мясо':8,'Мука':5,'Масло':4}};
const ck=state.cooking;
if (!ck.receivedStarterSupplies) {
  for (const [name, quantity] of Object.entries({'Картофель':24,'Морковь':20,'Свёкла':12,'Кукуруза':12,'Кабачок':10,'Овёс':12,'Гречиха':12,'Репа':10,'Горох':12,'Перец':8,'Томат':8})) {
    ag.produce[name]=(ag.produce[name]||0)+quantity;
  }
  for (const [name, quantity] of Object.entries({'Вода':50,'Масло':12})) ck.pantry[name]=(ck.pantry[name]||0)+quantity;
  ck.receivedStarterSupplies=true;
  save();
}
function renderFoodStocks(){
  const names=[...new Set([...Object.keys(ag.produce),...Object.keys(ck.pantry)])].filter(name=>pantryAmount(name)>0).sort((a,b)=>a.localeCompare(b,'ru'));
  $('mealCount').textContent=Object.values(ck.meals).reduce((sum,n)=>sum+n,0);
  $('supplyCount').textContent=names.reduce((sum,name)=>sum+pantryAmount(name),0);
  $('supplyList').replaceChildren(...names.map(name=>{
    const row=document.createElement('div'), qty=document.createElement('b');
    qty.textContent=pantryAmount(name);row.append(name,qty);return row;
  }));
  if(!$('kStock').hidden){
    const meals=Object.entries(ck.meals).filter(([,qty])=>qty>0).sort(([a],[b])=>a.localeCompare(b,'ru'));
    $('stockMeals').replaceChildren(...meals.map(([name,qty])=>{
      const row=document.createElement('div'), count=document.createElement('b');
      count.textContent=qty;row.append(name,count);return row;
    }));
    if(!meals.length)$('stockMeals').textContent='Готовых порций пока нет';
    $('stockIngredients').replaceChildren(...Array.from($('supplyList').children,row=>row.cloneNode(true)));
    if(!names.length)$('stockIngredients').textContent='Припасы закончились';
  }
  if(!names.length)$('supplyList').textContent='Припасы закончились';
}
document.addEventListener('click',e=>{if(!$('supplies').contains(e.target))$('supplies').open=false});


if (!state.testStock022) {
  state.wood+=10000;
  state.metal+=10000;
  state.food+=5000;
  for (const crop of CROPS) {
    ag.produce[crop.name]=(ag.produce[crop.name]||0)+250;
    ag.seeds[crop.name]=(ag.seeds[crop.name]||0)+100;
  }
  for (const name of new Set(RECIPES.flatMap(r=>Object.keys(r.ingredients)))) {
    if (!(name in ag.produce)) ck.pantry[name]=(ck.pantry[name]||0)+500;
  }
  state.testStock022=true;
  save();
}
function pantryAmount(name){return ingredientCount(state,name)}
function chefPerson(){return state.settlers.find(p=>p.id===Number(ck.chef)&&p.health>0&&p.status==='дома')}
function canCook(recipe){return canPrepare(state,recipe)}
function cookRecipe(i){
  const error=enqueueDish(state,i);
  if(error)return msg(error);
  logEvent('На кухне начали готовить «'+RECIPES[i].name+'».');
  update();renderKitchenQueue();
}

const dishGroups=['Все','Супы','Напитки','Горячее','Каши','Выпечка'];
let dishGroup='Все', selectedDish=0;
function dishKind(r){
  if(/отвар/i.test(r.name))return ['Напитки',3];
  if(/суп|похлёбка|борщ|^щи$/i.test(r.name))return ['Супы',1];
  if(/каша|гречка/i.test(r.name))return ['Каши',2];
  if(/пирог/i.test(r.name))return ['Выпечка',7];
  if(/хлеб|лепёшка/i.test(r.name))return ['Выпечка',4];
  return ['Горячее',r.ingredients.Мясо?5:/картоф/i.test(r.name)?0:6];
}
function dishArt(r){
  const el=document.createElement('span'), index=dishKind(r)[1];
  el.className='dishArt';
  el.style.backgroundPosition=(index%4*100/3)+'% '+(Math.floor(index/4)*100)+'%';
  return el;
}
function showDish(i){
  selectedDish=i;
  const r=RECIPES[i], info=$('dishInfo');
  const title=document.createElement('strong'), stock=document.createElement('p'), meta=document.createElement('small'), action=document.createElement('button');
  title.textContent=r.name;
  stock.textContent=Object.entries(r.ingredients).map(([name,qty])=>name+' '+pantryAmount(name)+'/'+qty).join(' · ');
  meta.textContent='Сытость +'+mealSatiety+' · 1 порция · 10 мин';
  action.disabled=!canCook(r)||(ck.queue?.length||0)>=5;
  action.textContent=chefLevel()<r.level||ck.kitchen<r.kitchen?'Нужны кухня '+r.kitchen+' и повар '+r.level:!canCook(r)?'Не хватает припасов':action.disabled?'Очередь полна':'＋ Готовить';
  action.onclick=()=>{cookRecipe(i);if($('kitchenScreen').classList.contains('open')){setDishPicker(false);kitchenTab('production')}};
  const copy=document.createElement('div');copy.append(title,stock,meta);info.replaceChildren(dishArt(r),copy,action);
  for(const tile of $('recipes').children)tile.setAttribute('aria-pressed',String(Number(tile.dataset.index)===i));
}
function renderCooking(){
  renderFoodStocks();
  $('cookStatus').textContent='Кухня '+ck.kitchen+'/3 · повар '+chefLevel();
  const grid=$('recipes'),filter=$('dishPicker').contains($('cooking'))?'ready':$('recipeFilter').value,scroll=grid.scrollTop;
  grid.replaceChildren();
  RECIPES.forEach((r,i)=>{
    if(dishGroup!=='Все' && dishKind(r)[0]!==dishGroup)return;
    if(filter==='ready'&&!canCook(r)||filter==='locked'&&chefLevel()>=r.level&&ck.kitchen>=r.kitchen)return;
    const tile=document.createElement('button'),name=document.createElement('span');
    tile.type='button';tile.dataset.index=i;tile.title=name.textContent=r.name;tile.append(dishArt(r),name);
    tile.onclick=()=>showDish(i);grid.append(tile);
  });
  if(grid.children.length)showDish(grid.querySelector('[data-index="'+selectedDish+'"]')?selectedDish:Number(grid.firstElementChild.dataset.index));
  else $('dishInfo').textContent='В этой категории нет блюд с выбранным фильтром.';
  grid.scrollTop=scroll;
  const cats=$('dishCategories');
  if(!cats.children.length)for(const group of dishGroups){
    const tab=document.createElement('button');tab.textContent=group;
    tab.onclick=()=>{dishGroup=group;grid.scrollTop=0;renderCooking()};cats.append(tab);
  }
  for(const tab of cats.children)tab.setAttribute('aria-pressed',String(tab.textContent===dishGroup));
  renderKitchenUpgrade();
if($('kitchenScreen').classList.contains('open')){renderCrew();if(!$('kRecipes').hidden)renderRecipeTree()}
$('mealStock').textContent='🍽️ Приготовлено: '+(Object.entries(ck.meals).filter(([k,v])=>v>0).map(([k,v])=>k+' ×'+v).join(' · ')||'пока нет блюд')}
let chefs=$('chef');for(let p of state.settlers){let opt=document.createElement('option');opt.value=p.id;opt.textContent=p.name+' · '+p.role;chefs.append(opt)}chefs.value=String(ck.chef);chefs.onchange=()=>{ck.chef=Number(chefs.value);update()};$('kitchen').value=String(ck.kitchen);$('kitchen').disabled=true;
$('upgradeKitchen').onclick=()=>{if(ck.kitchen>=3)return msg('Кухня уже максимального уровня.');let cost=ck.kitchen===1?[40,15]:[80,40];if(state.wood<cost[0]||state.metal<cost[1])return msg('Не хватает материалов или металла.');state.wood-=cost[0];state.metal-=cost[1];ck.kitchen++;$('kitchen').value=String(ck.kitchen);logEvent('Кухня улучшена до уровня '+ck.kitchen);update()};$('recipeFilter').onchange=renderCooking;
const cookOldUpdate=update;update=function(){cookOldUpdate();renderCooking()};
// Первые экспедиции приносят сырьё для приготовления, не только абстрактную еду.
const cookOldResolve=resolveExpeditions;
resolveExpeditions=function(){let finished=state.expeditions.filter(e=>(e.arriveAt?Date.now()>=e.arriveAt:e.returnDay<=state.day));cookOldResolve();for(let e of finished){let alive=e.ids.some(id=>state.settlers.find(p=>p.id===id)?.health>0);if(!alive)continue;if(e.type==='forest'||e.type==='hunt'){ck.pantry['Мясо']=(ck.pantry['Мясо']||0)+3;logEvent('Из леса привезли мясо ×3.')}else if(e.type==='farmstead'){ck.pantry['Мука']=(ck.pantry['Мука']||0)+3;logEvent('На ферме нашли муку ×3.')}else if(e.type==='outskirts'||e.type==='city'){ck.pantry['Соль']=(ck.pantry['Соль']||0)+2;ck.pantry['Масло']=(ck.pantry['Масло']||0)+2;logEvent('Найдены соль и масло для кухни.')}}};
update();

// 0.8: индивидуальное питание и простая автоматизация.
state.nutrition ||= {mode:'variety',auto:false,target:10,people:{},history:[]};
const nt=state.nutrition;
for(const p of state.settlers){nt.people[p.id] ||= {hunger:85,morale:65,history:[],favorite:({1:'Суп',2:'Картофель',3:'Овощ',4:'Мясо',5:'Каша'})[p.id]||'Суп'};}
function availableMeals(){return Object.entries(ck.meals).filter(([n,q])=>q>0).map(([n,q])=>({name:n,qty:q,recipe:RECIPES.find(r=>r.name===n)}));}
function autoCookDay(){if(!nt.auto)return;let goal=nt.target;for(let i=0;i<goal&&availableMeals().reduce((a,b)=>a+b.qty,0)<goal;i++){let ready=RECIPES.filter(r=>canCook(r));if(!ready.length)break;ready.sort((a,b)=>b.food-a.food);cookRecipe(RECIPES.indexOf(ready[0]));}}
function renderNutrition(){document.getElementById('dietMode').value=nt.mode;document.getElementById('autoCook').value=nt.auto?'on':'off';document.getElementById('mealTarget').value=String(nt.target);let alive=state.settlers.filter(p=>p.health>0),avg=Math.round(alive.reduce((a,p)=>a+(nt.people[p.id]?.morale||0),0)/Math.max(1,alive.length));$('dietSummary').textContent='Живых: '+alive.length+' · Средняя мораль: '+avg+' · Блюд готово: '+availableMeals().reduce((a,b)=>a+b.qty,0)+' · Аварийные пайки: '+state.food;
let root=$('dietPeople');root.replaceChildren();for(const p of state.settlers){let n=nt.people[p.id];let div=document.createElement('div');div.className='person';let b=document.createElement('b');b.textContent=p.name+' · '+p.role;div.append(b);let info=document.createElement('small');info.textContent=(p.health<=0?'Погиб':p.status)+' · здоровье '+p.health+' · голод '+n.hunger+'/100 · мораль '+n.morale+'/100';div.append(info);for(let [label,value] of [['Сытость',n.hunger],['Мораль',n.morale]]){let cap=document.createElement('small');cap.textContent=label;div.append(cap);let meter=document.createElement('div');meter.className='meter';let bar=document.createElement('i');bar.style.width=value+'%';bar.style.background=value<35?'#cf7868':'#a5bd70';meter.append(bar);div.append(meter)}let hist=document.createElement('small');hist.textContent='Любит: '+n.favorite+' · Недавно: '+(n.history.slice(-3).join(', ')||'нет');div.append(hist);root.append(div)}$('dietStore').textContent='Готовые блюда: '+(availableMeals().map(m=>m.name+' ×'+m.qty).join(' · ')||'нет. Приготовь на кухне или включи автоготовку.');}
$('dietMode').onchange=()=>{nt.mode=$('dietMode').value;update()};$('autoCook').onchange=()=>{nt.auto=$('autoCook').value==='on';update()};$('mealTarget').onchange=()=>{nt.target=Number($('mealTarget').value);update()};
const oldUpdate08=update;update=function(){oldUpdate08();renderNutrition()};update();

/* 0.9: compact tabs and two separate interaction modes */
const tabGroups={
base:[document.querySelector('.board'),document.querySelector('.toolbar'),document.getElementById('modebar'),document.getElementById('objectPanel')],
people:[document.getElementById('nutrition')],
farm:[document.getElementById('agriculture'),document.getElementById('cooking')],
exp:[document.querySelector('.expeditions')],
world:[document.getElementById('world')]
};
let activeTab='base';window.mapMode='view';
function openTab(name){
 if(!tabGroups[name])return;
 closeBuildingPanel();
 $('returnBase').hidden=name==='base';
 activeTab=name;document.querySelector('.wrap').dataset.screen=name;
 for(const [group,els] of Object.entries(tabGroups))for(const el of els)if(el)el.classList.toggle('game-tab-hidden',group!==name);
 document.querySelectorAll('[data-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.tab===name);b.setAttribute('aria-selected',b.dataset.tab===name?'true':'false')});
 if(name==='base')draw();
 if(name==='world')requestAnimationFrame(()=>{if(activeTab==='world')renderWorld()});
 window.scrollTo({top:0,behavior:'instant'});
}
function changeMapMode(mode){
 closeBuildingPanel();window.mapMode=mode; $('selectMap').setAttribute('aria-pressed',String(mode==='view'));$('buildMap').setAttribute('aria-pressed',String(mode==='build'));
 document.getElementById('modeView').classList.toggle('active',mode==='view');
 document.getElementById('modeBuild').classList.toggle('active',mode==='build');
 document.querySelector('.toolbar').classList.toggle('game-tab-hidden',mode!=='build'||activeTab!=='base');
 if(mode==='view'){preview=null;syncPreview();msg('Осмотр: нажми на здание, чтобы открыть его действия.')}
 else{document.getElementById('objectPanel').hidden=true;msg('Строительство: выбери постройку и клетку.')}
 draw();
}
var selectedBuilding;
function closeBuildingPanel(){
  selectedBuilding=null;$('objectPanel').hidden=true;$('buildingWheel').hidden=true;
}
function positionBuildingWheel(){
  if(!selectedBuilding||$('buildingWheel').hidden)return;
  const board=C.parentElement.getBoundingClientRect(), canvas=C.getBoundingClientRect();
  const [x,y]=pt(selectedBuilding.x,selectedBuilding.y);
  const left=canvas.left-board.left+((x-400)*zoom+400+panX)*canvas.width/800;
  const top=canvas.top-board.top+((y-225)*zoom+225+panY)*canvas.height/640;
  const wheel=$('buildingWheel');
  wheel.style.left=Math.max(92,Math.min(board.width-92,left))+'px';
  wheel.style.top=Math.max(74,Math.min(board.height-88,top-18))+'px';
}
function inspectCell(x,y){
  closeBuildingPanel();
  const b=state.buildings.find(item=>item.x===x&&item.y===y);
  const title=b?(b.t==='hq'?'Штаб':defs[b.t]?.name||'Здание'):'Свободная клетка';
  const buildingSite=b&&!completed(b);
  const actions=[];
  function add(icon,label,run){actions.push({icon,label,run})}
  if(!b)add('⚒','Строить',()=>{changeMapMode('build');preview={x,y,t:selected,rot:0};syncPreview()});
  else if(buildingSite)add('»','Ускорить',finishConstruction);
  else {
    if(b.t==='canteen'){
      add('↗','Открыть',()=>openKitchen());add('⬆','Улучшить',()=>openKitchen('settings'));add('♟','Повара',()=>openKitchen('crew'));
    }else if(b.t==='hq'||b.t==='house'){
      add('♟','Поселенцы',()=>openTab('people'));add('➶','Походы',()=>openTab('exp'));
      if(b.t==='hq'){add('⚔','Набег',()=>$('attack').click());add('↺','Сброс',()=>$('reset').click())}
    }else if(b.t==='farm'||b.t==='scrap'){
      add('↗',b.t==='farm'?'Грядки':'Хозяйство',()=>openTab('farm'));add('♟','Назначения',()=>openTab('people'));
    }
  }
  const panel=$('objectPanel'),wheel=$('buildingWheel');
  const header=document.createElement('div'),name=document.createElement('strong'),close=document.createElement('button');
  header.className='objectHead';name.textContent=title;close.textContent='✕';close.setAttribute('aria-label','Закрыть');close.onclick=closeBuildingPanel;header.append(name,close);
  const tabs=document.createElement('div'),body=document.createElement('div');tabs.className='objectTabs';body.className='objectBody';
  const info=document.createElement('button'),commands=document.createElement('button');info.textContent='Сведения';commands.textContent='Действия';
  function finishConstruction(){
    if(b.buildEnd>Date.now())b.buildEnd=Date.now();
    reconcileJobs();inspectCell(x,y);
  }
  function showInfo(){
    info.setAttribute('aria-pressed','true');commands.setAttribute('aria-pressed','false');
    body.textContent='Клетка '+(x+1)+' × '+(y+1);
    if(buildingSite){const timer=document.createElement('b');timer.dataset.end=b.buildEnd;timer.textContent=kitchenClock(b.buildEnd-Date.now());body.append(' · Строительство ',timer,speedButton(finishConstruction))}
    else if(b){const descriptions={hq:'Управление убежищем',tower:'Защита при набеге +4',trap:'Защита при набеге +2',wall:'Защита при набеге +1',canteen:'Кухня · уровень '+ck.kitchen,farm:'4 грядки',house:'Жилое здание',scrap:'Производство материалов'};body.append(' · '+(descriptions[b.t]||title))}
  }
  function makeButton(action,radial){
    const btn=document.createElement('button');btn.title=action.label;btn.setAttribute('aria-label',action.label);
    if(radial){const glyph=document.createElement('b');glyph.textContent=action.icon;btn.append(glyph,action.label)}else btn.textContent=action.icon+' '+action.label;
    btn.onclick=()=>{closeBuildingPanel();action.run()};return btn;
  }
  function showActions(){
    commands.setAttribute('aria-pressed','true');info.setAttribute('aria-pressed','false');
    body.replaceChildren(...actions.map(a=>makeButton(a,false)));
  }
  info.onclick=showInfo;commands.onclick=showActions;tabs.append(info);if(actions.length)tabs.append(commands);
  panel.replaceChildren(header,tabs,body);panel.hidden=false;showInfo();
  if(!b)return;
  selectedBuilding=b;wheel.replaceChildren();
  const ring=buildingSite?actions:[{icon:'ⓘ',label:'Сведения',run:showInfo},...actions.filter(a=>a.label!=='Сброс')];
  ring.forEach((a,i)=>{
    const btn=makeButton(a,true);if(!buildingSite&&i===0)btn.onclick=showInfo;
    const angle=ring.length===1?-Math.PI/2:-Math.PI+i*Math.PI/(ring.length-1);
    btn.style.left=(Math.cos(angle)*61)+'px';btn.style.top=(Math.sin(angle)*53)+'px';wheel.append(btn);
  });
  wheel.hidden=false;positionBuildingWheel();
}
$('returnBase').onclick=()=>{openTab('base');$('objectPanel').hidden=true};
document.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>openTab(btn.dataset.tab)));
document.getElementById('modeView').onclick=()=>changeMapMode('view');
document.getElementById('modeBuild').onclick=()=>changeMapMode('build');


function renderKitchenUpgrade(){
 const root=document.getElementById('kUpgradePanel');if(!root)return;
 root.replaceChildren();
 const level=ck.kitchen;
 const title=document.createElement('h3');title.textContent='🔧 Оборудование · уровень '+level+'/3';root.append(title);
 const desc=document.createElement('p');desc.textContent=level===1?'Сейчас: костёр. Следующее улучшение: печь, открывает блюда второго уровня.':level===2?'Сейчас: печь. Следующее улучшение: полноценная кухня, открывает сложные блюда.':'Полноценная кухня построена. Все уровни оборудования открыты.';root.append(desc);
 if(level>=3)return;
 const wood=level===1?40:80,metal=level===1?15:40;
 const cost=document.createElement('p');cost.textContent='Нужно: 🪵 '+wood+' (есть '+state.wood+') · ⚙️ '+metal+' (есть '+state.metal+')';root.append(cost);
 const btn=document.createElement('button');btn.className='kupgradebutton';btn.textContent='⬆ Улучшить до уровня '+(level+1);btn.disabled=state.wood<wood||state.metal<metal;
 btn.onclick=()=>{document.getElementById('upgradeKitchen').click();renderKitchenUpgrade();renderCooking()};
 root.append(btn);
 if(btn.disabled){const note=document.createElement('p');note.textContent='Не хватает ресурсов для улучшения.';root.append(note)}
}
/* 0.11 persistent real-time cooking queue */
if(!Array.isArray(ck.queue))ck.queue=[];
function settleKitchenQueue(){
  const meals=finishDishes(state);
  for(const name of meals)logEvent('Готово: «'+name+'» (+1 порция).');
  if(meals.length)update();
}
function speedButton(run){
 const button=document.createElement('button');button.type='button';button.textContent='Ускорить';
 button.onclick=e=>{e.stopPropagation();button.disabled=true;run()};return button;
}
function speedTrip(trip,whole=false){
 if(!state.expeditions.includes(trip))return;
 const now=Date.now(),half=(trip.departAt+trip.arriveAt)/2;
 const end=whole?trip.arriveAt:now<(trip.siteAt??half)?(trip.siteAt??half):now<trip.doneAt?trip.doneAt:trip.arriveAt;
 const shift=Math.max(0,end-now);
 for(const key of ['departAt','siteAt','doneAt','arriveAt'])if(trip[key])trip[key]-=shift;
 if(!trip.arriveAt)trip.returnDay=state.day;
 if(trip.arriveAt<=now||!trip.arriveAt)resolveExpeditions();
 registerSites();update();
}
function kitchenClock(ms){const sec=Math.max(0,Math.ceil(ms/1000));return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')}
function setDishPicker(open){
  $('dishPicker').hidden=!open;
  $('chooseRecipe').setAttribute('aria-expanded',String(open));
}
function renderKitchenQueue(){
  const root=$('kQueue'),full=ck.queue.length>=5;
  $('chooseRecipe').disabled=full;
  if(full)setDishPicker(false);
  const heading=document.createElement('h3');
  heading.textContent='Очередь приготовления · '+ck.queue.length+'/5';
  const row=document.createElement('div');row.className='queueStrip';
  if(!ck.queue.length)row.textContent='Кухня свободна';
  ck.queue.forEach((item,i)=>{
    const r=RECIPES[item.recipe];if(!r)return;
    const pair=document.createElement('span'),time=document.createElement('b');
    pair.className='queuePair';pair.title=r.name+(i===0?' · готовится':' · в очереди');
    const remaining=i===0?item.end-Date.now():item.end-item.start;
    time.textContent=kitchenClock(remaining);
    pair.setAttribute('aria-label',pair.title+' · '+time.textContent);
    pair.append(dishArt(r),time,speedButton(()=>{
      const index=ck.queue.indexOf(item);if(index<0)return;
      const now=Date.now(),shift=Math.max(0,item.end-Math.max(item.start,now));
      ck.queue.splice(index,1);
      for(const next of ck.queue.slice(index)){next.start-=shift;next.end-=shift}
      ck.queue.unshift({...item,start:now,end:now});settleKitchenQueue();renderKitchenQueue();
    }));row.append(pair);
  });
  root.replaceChildren(heading,row);
}
function renderCrew(){
  const person=state.settlers.find(p=>p.id===Number(ck.chef));
  $('crewStats').textContent=person?person.name+' · '+person.role+' · '+person.status+' | Навык '+person.skill+' · Здоровье '+person.health+'/100':'Повар не назначен';
  for(const opt of $('chef').options){
    const p=state.settlers.find(p=>p.id===Number(opt.value));opt.disabled=!p||p.health<=0||p.status!=='дома';
  }
}
function renderRecipeTree(){
  const root=$('kRecipeHolder');
  const expanded=new Set([...root.querySelectorAll('details[open]')].map(el=>el.dataset.branch));
  const first=!root.children.length;
  root.replaceChildren();
  ['Костёр','Печь','Полноценная кухня'].forEach((name,index)=>{
    const tier=index+1, section=document.createElement('section'),title=document.createElement('h4');
    section.className='treeStage';title.textContent=tier+' · '+name+(tier>ck.kitchen?' 🔒':tier===ck.kitchen?' · установлено':' ✓');section.append(title);
    for(const group of dishGroups.slice(1)){
      const recipes=RECIPES.filter(r=>r.kitchen===tier&&dishKind(r)[0]===group);if(!recipes.length)continue;
      const branch=document.createElement('details'),summary=document.createElement('summary');
      branch.dataset.branch=tier+'-'+group;branch.open=expanded.has(branch.dataset.branch)||(first&&tier===ck.kitchen&&section.children.length===1);
      summary.textContent=group+' · '+recipes.length;branch.append(summary);
      for(const r of recipes){
        const node=document.createElement('div');node.className='treeDish';
        node.append(dishArt(r),r.name+' · повар '+r.level+(tier>ck.kitchen||chefLevel()<r.level?' 🔒':' ✓'));branch.append(node);
      }
      section.append(branch);
    }
    root.append(section);
  });
}
setInterval(()=>{settleKitchenQueue();if(kitchenScreen.classList.contains('open'))renderKitchenQueue()},1000);
/* 0.10 standalone canteen screen, preserving original cooking state and handlers */
const kitchenScreen=document.getElementById('kitchenScreen');
const originalCookingParent=document.getElementById('cooking').parentNode;
const originalCookingNext=document.getElementById('cooking').nextSibling;
let currentKitchenTab='production';
function kitchenTab(tab){
 currentKitchenTab=tab;
 for(const [name,id] of Object.entries({production:'kProduction',recipes:'kRecipes',stock:'kStock',crew:'kCrew',settings:'kSettings'})){
  document.getElementById(id).hidden=name!==tab;
 }
 document.querySelectorAll('[data-ktab]').forEach(b=>b.classList.toggle('active',b.dataset.ktab===tab));
 if(tab==='recipes')renderRecipeTree();
 if(tab==='crew')renderCrew();
 if(tab==='stock')renderFoodStocks();
  document.getElementById('cooking').classList.remove('game-tab-hidden');
  renderKitchenQueue();
}
function openKitchen(tab='production'){
 document.getElementById('objectPanel').hidden=true;
 $('crewSelect').append($('chef').closest('label'));
 $('dishPicker').append($('cooking'));setDishPicker(false);
 kitchenScreen.classList.add('open');
 kitchenTab(tab);
 renderCooking();
 kitchenScreen.scrollTop=0;
}
function closeKitchen(){
 $('kitchen').closest('.cookrow').prepend($('chef').closest('label'));
 kitchenScreen.classList.remove('open');

 originalCookingParent.insertBefore(document.getElementById('cooking'),originalCookingNext);
  document.getElementById('cooking').classList.toggle('game-tab-hidden',activeTab!=='farm');
}
$('chooseRecipe').onclick=()=>{if(ck.queue.length<5){setDishPicker($('dishPicker').hidden);renderCooking()}};
document.getElementById('kBack').onclick=closeKitchen;
document.querySelectorAll('[data-ktab]').forEach(b=>b.onclick=()=>kitchenTab(b.dataset.ktab));
const kitchenSettings=document.getElementById('kSettingsInfo');
const kitchenUpgradePanel=document.createElement('div');kitchenUpgradePanel.id='kUpgradePanel';kitchenSettings.prepend(kitchenUpgradePanel);
for(const id of ['dietMode','autoCook','mealTarget']){
 const select=document.getElementById(id),label=select.closest('label');
 if(label)kitchenSettings.append(label.cloneNode(false));
 const wrapper=kitchenSettings.lastElementChild;
 wrapper.textContent=({dietMode:'План питания',autoCook:'Автоготовка',mealTarget:'Целевой запас блюд'})[id];
 const proxy=document.createElement('select');
 proxy.innerHTML=select.innerHTML;proxy.value=select.value;
 proxy.onchange=()=>{select.value=proxy.value;select.dispatchEvent(new Event('change'));};
 wrapper.append(proxy);
 select.addEventListener('change',()=>{proxy.value=select.value});
}

$('crewMap').onclick=()=>openTab('people');$('tripMap').onclick=()=>openTab('exp');
$('selectMap').onclick=()=>{openTab('base');changeMapMode('view');$('objectPanel').hidden=true};
$('buildMap').onclick=()=>openBuildCatalog();
$('worldMap').onclick=()=>openTab('world');
/* 0.13 isometric overworld; original site discovery and expedition mechanics preserved */
const worldRenderBefore13=renderWorld;
let worldPan={x:0,y:0},worldScale=1;
function worldHash(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
let worldBuildHits=[];
function pendingBuild(cell){return state.expeditions.find(e=>e.action==='build'&&e.cell&&cellKey(e.cell)===cellKey(cell)&&(e.doneAt??e.arriveAt)>Date.now())}
function worldCanvasDraw(){
 const el=document.getElementById('worldmap'),canvas=el.querySelector('canvas');if(!canvas)return;
 const width=el.clientWidth,height=el.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);
 if(width<20||height<20)return;
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const c=canvas.getContext('2d');c.scale(dpr,dpr);
 c.fillStyle='#243a2d';c.fillRect(0,0,width,height);
 const tw=43*worldScale,th=22*worldScale,originX=width/2+worldPan.x,originY=height*.40+worldPan.y;
 function pt(x,y){return [originX+(x-y)*tw/2,originY+(x+y)*th/2]}
 function tile(x,y,color){let [px,py]=pt(x,y);c.fillStyle=color;c.beginPath();c.moveTo(px,py-th/2);c.lineTo(px+tw/2,py);c.lineTo(px,py+th/2);c.lineTo(px-tw/2,py);c.closePath();c.fill();c.strokeStyle='rgba(218,219,181,.20)';c.lineWidth=.7;c.stroke()}
 for(let y=-24;y<25;y++)for(let x=-24;x<25;x++){
  const h=worldHash(x,y),r=worldHash(x+90,y+90);
  const road=Math.abs(x-y+3)<1.3||Math.abs(x+8)<1&&y>0&&y<14;
  const urban=region({x,y}).name==='Руины';
  const farm=x< -5&&y>2&&y<12;
  const color=road?'#817a60':urban?(h>.5?'#565f4b':'#4e5b48'):farm?'#626746':h>.72?'#36573d':h>.38?'#3c5e43':'#476a48';
  tile(x,y,color);
  let [px,py]=pt(x,y);
  if(px< -30||px>width+30||py< -50||py>height+50)continue;
  if(!road&&!urban&&h>.61&&r>.22){
   const sz=(8+worldHash(x+12,y)*12)*worldScale;
   if (paintSprite(c,h>.83?'spruce':'pine',px,py,sz*1.3)) continue;
   c.fillStyle='#192e25';c.fillRect(px-1.5*worldScale,py-sz*.55,3*worldScale,sz*.65);
   c.fillStyle=h>.83?'#244e35':'#1b4432';
   c.beginPath();c.moveTo(px,py-sz*1.7);c.lineTo(px-sz*.55,py-sz*.35);c.lineTo(px+sz*.55,py-sz*.35);c.closePath();c.fill();
  }else if(urban&&h>.43){
   const bh=(9+worldHash(x+2,y+4)*24)*worldScale;
   if (paintSprite(c,'warehouse',px,py,bh*1.4)) continue;
   c.fillStyle='#393d36';c.fillRect(px-8*worldScale,py-bh,16*worldScale,bh);
   c.fillStyle='#737466';c.beginPath();c.moveTo(px-8*worldScale,py-bh);c.lineTo(px,py-bh-5*worldScale);c.lineTo(px+8*worldScale,py-bh);c.lineTo(px,py-bh+4*worldScale);c.fill();
  }
 }

 // Threat zones and selected route are rendered beneath interactive landmarks.
 function ellipse(cx,cy,rx,ry,color){const [px,py]=pt(cx,cy);c.beginPath();c.ellipse(px,py,rx*tw,ry*th,0,0,Math.PI*2);c.fillStyle=color;c.fill()}
 ellipse(7,4,4.5,6,'#aa43302b');
 ellipse(8,-7,3,4,'#a3444036');
 ellipse(-8,7,3,4,'#c9a94c19');
 if(selectedCell)tile(selectedCell.x,selectedCell.y,'#ddb15aa8');
 const knownSites=registerSites();
 for(const key of new Set([...Object.keys(knownSites),...(state.world.posts||[])])){const [x,y]=key.split(',').map(Number);const [px,py]=pt(x,y);paintSprite(c,knownSites[key]||'tower',px,py+3*worldScale,24*worldScale)}
 const homePos=pt(-1,1);paintSprite(c,'hq',homePos[0],homePos[1]+3*worldScale,28*worldScale);
 worldBuildHits=[];
 // Real-time expedition markers move along the route, including after page reload.
 for(const expedition of state.expeditions){
  if(!expedition.departAt||!expedition.arriveAt)continue;
  const destination=Object.values(sites).find(site=>site.type===expedition.type);
  if(!destination&&!expedition.cell)continue;
  const progress=Math.max(0,Math.min(1,(Date.now()-expedition.departAt)/(expedition.arriveAt-expedition.departAt)));
  const h=pt(expedition.origin?.x??-1,expedition.origin?.y??1),d=expedition.cell?pt(expedition.cell.x,expedition.cell.y):pt((destination.x-50)/4,(destination.y-50)/4);
  const now=Date.now(),work=expedition.siteAt&&now>=expedition.siteAt&&now<expedition.doneAt;
  let travel=progress<.5?progress*2:2-progress*2;
  let deadline=progress<.5?(expedition.departAt+expedition.arriveAt)/2:expedition.arriveAt,label=progress<.5?'В пути':'Домой';
  const returning=expedition.doneAt?now>=expedition.doneAt:progress>=.5;
  const target=returning?h:d;
  c.save();
  c.beginPath();c.moveTo(...h);c.lineTo(...d);
  c.setLineDash([6*worldScale,4*worldScale]);c.lineCap='round';
  c.strokeStyle='#28241f';c.lineWidth=3.8;c.stroke();
  c.strokeStyle='#e1c58b';c.lineWidth=1.8;c.stroke();c.restore();
  if(expedition.siteAt){
    travel=Math.min(1,Math.max(0,(now-expedition.departAt)/(expedition.siteAt-expedition.departAt)),Math.max(0,(expedition.arriveAt-now)/(expedition.arriveAt-expedition.doneAt)));
    deadline=now<expedition.siteAt?expedition.siteAt:work?expedition.doneAt:expedition.arriveAt;
    label=now<expedition.siteAt?'В пути':work?'Стройка':'Домой';
    paintSprite(c,now>=expedition.doneAt?expedition.kind:'site',d[0],d[1]+3*worldScale,24*worldScale);
    if(now<expedition.doneAt){c.save();c.globalAlpha=.58;paintSprite(c,expedition.kind,d[0],d[1]+3*worldScale,24*worldScale);c.restore()}
  }
  const px=h[0]+(d[0]-h[0])*travel,py=h[1]+(d[1]-h[1])*travel;
  c.save();c.translate(...target);
  const arm=Math.min(12,Math.max(4,6*worldScale));
  c.beginPath();c.moveTo(-arm,-arm*.55);c.lineTo(arm,arm*.55);c.moveTo(-arm,arm*.55);c.lineTo(arm,-arm*.55);
  c.lineCap='round';c.strokeStyle='#29221c';c.lineWidth=5;c.stroke();c.strokeStyle='#ffc779';c.lineWidth=2.5;c.stroke();c.restore();
  c.save();c.translate(px,py);if((d[0]<h[0])!==returning)c.scale(-1,1);
  paintSprite(c,'traveler',0,0,Math.max(7,10*worldScale));c.restore();
  c.textAlign='center';const badge=label+' '+kitchenClock(deadline-now);c.font='bold 12px system-ui';const bw=c.measureText(badge).width+8;c.fillStyle='#201f1b';c.fillRect(px-bw/2,py+10,bw,18);c.fillStyle='#ffdfa1';c.fillText(badge,px,py+23);
  if(work)worldBuildHits.push({x:px-bw/2,y:py+10,w:bw,h:18,cell:expedition.cell},{x:d[0]-12*worldScale,y:d[1]-20*worldScale,w:24*worldScale,h:24*worldScale,cell:expedition.cell});
 }
 const orders=el.querySelector('.worldOrders');
 if(orders){
   const now=Date.now();
   const rows=state.expeditions.map(trip=>{
     const crew=trip.ids.map(id=>state.settlers.find(s=>s.id===id)?.name||'Поселенец').join(', ');
     const place=trip.cell?region(trip.cell).name+' ('+cellKey(trip.cell)+')':Object.values(sites).find(s=>s.type===trip.type)?.name||missions[trip.type]?.label;
     const purpose=trip.action==='build'?(trip.kind==='house'?'Построить жилище':'Построить пост'):fieldActions[trip.action]||missions[trip.type]?.label;
     const half=trip.departAt+(trip.arriveAt-trip.departAt)/2;
     const stage=now<(trip.siteAt??half)?'В пути':now<(trip.doneAt??0)?'Стройка':'Домой';
     return [crew,stage+' · '+place,purpose];
   });
   const key=JSON.stringify(rows);
   if(orders.dataset.orders!==key){
     orders.dataset.orders=key;
     orders.replaceChildren(...rows.map(([crew,where,why],index)=>{
       const card=document.createElement('div'),name=document.createElement('b'),place=document.createElement('span'),task=document.createElement('small');
       name.textContent=crew;place.textContent=where;task.textContent=why;
       const trip=state.expeditions[index];card.append(name,place,task,speedButton(()=>speedTrip(trip)));return card;
     }));
   }
 }
 const wheel=el.querySelector('.cellWheel');
 if(wheel&&selectedCell&&wheel.dataset.build!==String(!!pendingBuild(selectedCell))){renderWorld();return}
 if(wheel&&selectedCell){
   const [x,y]=pt(selectedCell.x,selectedCell.y);
   wheel.style.left=Math.max(90,Math.min(width-90,x))+'px';wheel.style.top=Math.max(72,Math.min(height-30,y))+'px';
 }
}
renderWorld=function(){
 worldRenderBefore13();
 const map=$('worldmap');
 $('siteinfo').textContent=selectedCell?cellDescription(selectedCell):'Выберите клетку карты';
 if(selectedCell){
   const wheel=document.createElement('div');wheel.className='cellWheel';
   const job=pendingBuild(selectedCell);wheel.dataset.build=String(!!job);
   if(job){wheel.append(speedButton(()=>{speedTrip(job);renderWorld()}))}
   else for(const [action,label] of Object.entries(fieldActions)){
     const button=document.createElement('button');button.type='button';button.textContent=label;
     button.onclick=()=>openFieldOrder(selectedCell,action);wheel.append(button);
   }
   map.append(wheel);
 }
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');map.prepend(canvas);
 const orders=document.createElement('div');orders.className='worldOrders';map.append(orders);
 const controls=document.createElement('div');controls.className='worldcontrols';
 for(const [label,delta] of [['+',.2],['−',-.2]]){
  const button=document.createElement('button');button.textContent=label;button.title=delta>0?'Приблизить':'Отдалить';
  button.onclick=()=>{worldScale=Math.max(.6,Math.min(5,worldScale+delta));worldCanvasDraw()};
  controls.append(button);
 }
 const reset=document.createElement('button');reset.textContent='⌖';reset.title='Центрировать карту';reset.onclick=()=>{worldScale=1;worldPan={x:0,y:0};worldCanvasDraw()};controls.append(reset);map.append(controls);
 const legend=document.createElement('div');legend.className='worldlegend';legend.textContent='🔴 Опасная зона  ·  🌲 Дикая местность';map.append(legend);

 worldCanvasDraw();
};
const worldMapEl=document.getElementById('worldmap');
const touches=new Map();
let moved=false;
function localWorldPoint(e){
 const rect=worldMapEl.getBoundingClientRect();
 return {x:e.clientX-rect.left-worldMapEl.clientLeft,y:e.clientY-rect.top-worldMapEl.clientTop};
}
function zoomWorld(factor,from,to=from){
 const scale=Math.min(5,Math.max(.6,worldScale*factor)),ratio=scale/worldScale;
 const ox=worldMapEl.clientWidth/2,oy=worldMapEl.clientHeight*.40;
 worldPan.x=to.x-ox-(from.x-ox-worldPan.x)*ratio;
 worldPan.y=to.y-oy-(from.y-oy-worldPan.y)*ratio;
 worldScale=scale;worldCanvasDraw();
}
worldMapEl.style.touchAction='none';
worldMapEl.addEventListener('wheel',e=>{
 e.preventDefault();zoomWorld(Math.exp(-Math.max(-240,Math.min(240,e.deltaY))*.002),localWorldPoint(e));
},{passive:false});
worldMapEl.addEventListener('pointerdown',e=>{
 if(e.target.closest('button,.cellWheel'))return;
 const pos=localWorldPoint(e);
 if(!touches.size)moved=false;else moved=true;
 touches.set(e.pointerId,{...pos,start:pos});
 worldMapEl.setPointerCapture(e.pointerId);
});
worldMapEl.addEventListener('pointermove',e=>{
 const prev=touches.get(e.pointerId);if(!prev)return;
 const pos=localWorldPoint(e),other=[...touches.entries()].find(([id])=>id!==e.pointerId)?.[1];
 if(!moved&&Math.hypot(pos.x-prev.start.x,pos.y-prev.start.y)<5)return;
 moved=true;
 touches.set(e.pointerId,{...pos,start:prev.start});
 if(other){
   const midpoint=p=>({x:(other.x+p.x)/2,y:(other.y+p.y)/2});
   const distance=p=>Math.hypot(other.x-p.x,other.y-p.y);
   zoomWorld(distance(pos)/Math.max(1,distance(prev)),midpoint(prev),midpoint(pos));
 }else{worldPan.x+=pos.x-prev.x;worldPan.y+=pos.y-prev.y;worldCanvasDraw()}
});
worldMapEl.addEventListener('pointercancel',e=>{touches.delete(e.pointerId);moved=true});
worldMapEl.addEventListener('pointerup',e=>{
 if(!touches.delete(e.pointerId)||moved)return;
 const pos=localWorldPoint(e);
 const hit=worldBuildHits.findLast(h=>pos.x>=h.x&&pos.x<=h.x+h.w&&pos.y>=h.y&&pos.y<=h.y+h.h);
 if(hit&&pendingBuild(hit.cell)){selectedCell={...hit.cell};renderWorld();return}
 const dx=(pos.x-worldMapEl.clientWidth/2-worldPan.x)/(21.5*worldScale);
 const dy=(pos.y-worldMapEl.clientHeight*.40-worldPan.y)/(11*worldScale);
 const x=Math.round((dx+dy)/2),y=Math.round((dy-dx)/2);
 if(Math.abs(x)>24||Math.abs(y)>24)return;
 const key=cellKey({x,y});if(key==='-1,1'||registerSites()[key]==='house'){enterShelter(key);return}
 selectedCell={x,y};
 renderWorld();
});
window.addEventListener('resize',()=>{if(activeTab==='world')worldCanvasDraw()});
function cellDescription(cell){
 const area=region(cell),key=cellKey(cell),w=state.world;
 const tags=[w.surveyed?.includes(key)&&'Разведана',w.exploredCells?.includes(key)&&'Исследована',w.posts?.includes(key)&&'Полевой пост'].filter(Boolean);
 return [area.name+' ('+key+')','Базовый риск '+Math.round(area.risk*100)+'%',...tags].join(' · ');
}
function openFieldOrder(cell,action){
 const dlg=$('fieldOrder'),party=$('fieldParty');
 $('fieldTitle').textContent=fieldActions[action]+' · '+region(cell).name;
 $('fieldDetails').textContent=cellDescription(cell)+' · '+fieldDuration(cell,action,origin)+' мин · 3 пайка на человека. '+({scout:'Отметить клетку как разведанную.',research:'Исследовать местность и собрать материалы.',build:'Возвести полевой пост за 20 материалов и 5 металла.'}[action]);
 const select=$('fieldKind');select.hidden=action!=='build';select.value='';party.hidden=action==='build';$('fieldSend').disabled=action==='build';
 select.onchange=()=>{party.hidden=!select.value;$('fieldSend').disabled=!select.value;$('fieldDetails').textContent=cellDescription(cell)+' · путь '+Math.max(1,fieldDuration(cell,'build',origin)-10)+' мин в одну сторону · стройка '+(select.value==='house'?30:10)+' мин · 20 материалов и 5 металла'};
 party.replaceChildren();$('fieldError').textContent='';
 for(const p of state.settlers){
   const label=document.createElement('label'),box=document.createElement('input');
   box.type='checkbox';box.value=p.id;box.disabled=p.health<=0||p.status!=='дома';
   label.append(box,p.name+' · '+p.role+' · '+p.status);party.append(label);
 }
 $('fieldSend').onclick=()=>{
   const ids=[...party.querySelectorAll(':checked')].map(el=>Number(el.value));
   if(action==='build'&&registerSites()[cellKey(cell)]){ $('fieldError').textContent='Клетка занята';return }
   const error=dispatch(state,cell,action,ids,Date.now(),select.value||'tower',origin);if(error){$('fieldError').textContent=error;return}
   logEvent(fieldActions[action]+' · '+cellKey(cell));selectedCell=null;dlg.close();update();
 };
 dlg.showModal();
}
/* 0.15: real-time expedition completion while open and after reload. */
function checkExpeditionClock(){
 const due=state.expeditions.some(e=>e.arriveAt&&Date.now()>=e.arriveAt);
 if(due){resolveExpeditions();update();}
 if(activeTab==='world')worldCanvasDraw();
 if(activeTab==='exp'&&state.expeditions.length)renderExpeditions();
}
setInterval(checkExpeditionClock,1000);
checkExpeditionClock();


/* 0.16: building catalogue is separate from map inspection and placement */
const buildCatalog=document.getElementById('buildCatalog');
function closeBuildCatalog(){
 buildCatalog.classList.remove('open');
 document.body.style.overflow='';
}
function openBuildCatalog(){
 openTab('base');
 preview=null;syncPreview();
 document.getElementById('objectPanel').hidden=true;
 const tiles=document.getElementById('buildTiles');tiles.replaceChildren();
 for(const [type,def] of Object.entries(defs)){
  const affordable=state.food>=def.cost[0]&&state.wood>=def.cost[1]&&state.metal>=def.cost[2];
  const button=document.createElement('button');button.className='buildtile'+(affordable?'':' unaffordable');
  const icon=document.createElement('span');icon.className='symbol';icon.textContent=def.icon;
  if(art[type]) {
    const img=document.createElement('img');img.src=sprites[type].src;img.alt='';
    img.style.cssText='width:100%;height:82px;object-fit:contain';icon.replaceChildren(img);
  }
  const title=document.createElement('strong');title.textContent=def.name;
  const cost=document.createElement('small');cost.textContent=type==='remove'?'Убрать существующий объект':'Стоимость: 🥫 '+def.cost[0]+' · 🪵 '+def.cost[1]+' · ⚙️ '+def.cost[2];
  const action=document.createElement('span');action.className='choose';action.textContent=affordable?'Выбрать →':'Не хватает ресурсов · выбрать →';
  button.append(icon,title,cost,action);
  button.onclick=()=>{
   selected=type;
   closeBuildCatalog();
   changeMapMode('build');
   preview=null;syncPreview();renderUI();
   msg(type==='remove'?'Коснись объекта, который нужно разобрать.':'Выбрано: '+def.name+'. Коснись свободной клетки, затем нажми «Построить».');
  };
  tiles.append(button);
 }
 buildCatalog.classList.add('open');document.body.style.overflow='hidden';
}
document.getElementById('buildCatalogBack').onclick=()=>{
 closeBuildCatalog();
 changeMapMode('view');
};
document.getElementById('modeBuild').onclick=openBuildCatalog;
const originalChangeMapMode16=changeMapMode;
changeMapMode=function(mode){
 originalChangeMapMode16(mode);
 document.querySelector('.toolbar').classList.add('game-tab-hidden');
 if(mode==='view')closeBuildCatalog();
};
document.querySelector('.toolbar').classList.add('game-tab-hidden');

// Deadlines belong to individual jobs. Polling only reconciles elapsed deadlines.
function reconcileJobs(){
  const now=Date.now();
  let changed=settleWorkshops(state,now);
  if(settleSettlers(state,logEvent,now))changed=true;
  for(const [i,p] of ag.plots.entries()){
    const c=CROPS.find(c=>c.name===p.crop);
    if(!c||growth(p,c,now).remaining>0)continue;
    if(ag.auto){harvestPlot(i);changed=true}
    else if(p.progress!==c.days){p.progress=c.days;changed=true}
  }
  if(activeTab==='farm'&&!$('farmBeds').hidden&&!changed){
    for(const [i,p] of ag.plots.entries()){
      const c=CROPS.find(c=>c.name===p.crop);if(!c)continue;
      const g=growth(p,c,now),row=$('plots').children[i];if(!row||!g.remaining)continue;
      row.querySelector('small').textContent=(g.wet?'Растёт':'Сухо · рост остановлен')+' · осталось '+kitchenClock(g.minutes*minute)+(p.fertilized?' · ×2':'');
      row.querySelector('.progress i').style.width=100*g.progress+'%';
    }
  }
  if(nt.auto&&ck.queue.length<5&&availableMeals().reduce((n,m)=>n+m.qty,0)+ck.queue.length<nt.target){
    const r=RECIPES.find(canCook);if(r)cookRecipe(RECIPES.indexOf(r));
  }
  for(const timer of document.querySelectorAll('[data-end]')){
    const left=Number(timer.dataset.end)-now;timer.textContent=left<=0?'Готово':kitchenClock(left);
  }
  if(changed)update();
}
reconcileJobs();save();
setInterval(reconcileJobs,1000);

for(const trip of state.expeditions)if(!trip.arriveAt)trip.arriveAt=Date.now()+Math.max(0,(trip.returnDay-state.day)||0)*600000;
settleKitchenQueue();
openTab('base');changeMapMode('view');
new ResizeObserver(()=>{if(activeTab==='base')draw()}).observe(C);

const scene=new Shelter(()=>({state,preview,zoom,panX,panY}),art);
const resolution=Math.min(3,Math.max(1,Math.ceil(C.getBoundingClientRect().width*(devicePixelRatio||1)/800)));
new Phaser.Game({type:Phaser.CANVAS,canvas:C,width:800*resolution,height:640*resolution,backgroundColor:'#24342c',scene,scale:{mode:Phaser.Scale.NONE,autoRound:false},banner:false});
C.style.removeProperty('width');C.style.removeProperty('height');
