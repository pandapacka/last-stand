import {readSave,saveKey} from './storage.ts';
import Phaser from 'phaser';
import {Shelter,cellAt,point} from './Shelter.ts';
import {construct} from '../server/construction.ts';
import {constructionError} from '../shared/shelter.ts';

const C=document.getElementById('game'),W=24,H=16,S=50;const defs={tower:{name:'Башня',icon:'🎯',cost:[0,35,25]},trap:{name:'Ловушка',icon:'🪤',cost:[0,15,5]},farm:{name:'Ферма',icon:'🌱',cost:[0,30,0]},scrap:{name:'Мастерская',icon:'🔧',cost:[0,25,15]},house:{name:'Жильё',icon:'🏠',cost:[20,40,0]},wall:{name:'Баррикада',icon:'🧱',cost:[0,15,0]},remove:{name:'Убрать',icon:'✖',cost:[0,0,0]}};let selected='tower',state;const initialSettlers=()=>[{id:1,name:'Анна',role:'Фельдшер',skill:2,health:100,status:'дома'},{id:2,name:'Виктор',role:'Механик',skill:3,health:100,status:'дома'},{id:3,name:'Марина',role:'Агроном',skill:2,health:100,status:'дома'},{id:4,name:'Егор',role:'Охотник',skill:7,health:100,status:'дома'},{id:5,name:'Лена',role:'Разведчица',skill:6,health:100,status:'дома'}];const seed=()=>({day:1,food:120,wood:160,metal:90,people:5,hp:100,settlers:initialSettlers(),expeditions:[],log:[],buildings:[{x:6,y:5,t:'hq'},{x:5,y:4,t:'farm'},{x:8,y:5,t:'house'},{x:7,y:7,t:'scrap'},{x:3,y:4,t:'tower'},{x:12,y:6,t:'trap'}],zombies:[],wave:0});try{state=readSave(localStorage)||seed()}catch{state=seed()}if(!Array.isArray(state.settlers)){state.settlers=initialSettlers();state.expeditions=[];state.log=[];state.people=state.settlers.length}state.expeditions ||= [];state.log ||= [];const inside=(x,y)=>x>=4&&x<=10&&y>=3&&y<=8;const occupied=(x,y)=>state.buildings.some(b=>b.x===x&&b.y===y);const $=id=>document.getElementById(id);const save=()=>{try{localStorage.setItem(saveKey,JSON.stringify(state))}catch{}};const msg=t=>$('message').textContent=t;function renderUI(){state.people=state.settlers.filter(p=>p.health>0).length;for(let k of ['food','wood','metal','people','hp'])$(k).textContent=state[k];$('day').textContent='День '+state.day;$('wave').textContent=state.wave?'Набегов: '+state.wave:'Угроза: низкая';document.querySelectorAll('.tool').forEach(el=>el.classList.toggle('active',el.dataset.t===selected))}let zoom=1,panX=0,panY=0,preview=null;
defs.canteen={name:'Столовая',icon:'🍲',cost:[0,45,15]};
if (!state.canteenPlaced) {
  let tile;
  for(let y=8;y>=3&&!tile;y--)for(let x=10;x>=4;x--)if(!occupied(x,y)){tile={x,y,t:'canteen'};break}
  if(tile)state.buildings.push(tile);
  state.canteenPlaced=true;
}
const minute=60000;
function completed(b){return !b.buildEnd || b.buildEnd<=Date.now()}
function cropEnd(plot,crop){
  if(!plot.readyAt)plot.readyAt=Date.now()+Math.max(0,crop.days-(plot.progress||0))*10*minute;
  return plot.readyAt;
}
const sprites={};
const art = {
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
const pointers=new Map();let gesture=null,gestureMoved=false,downAt=null;
function pointerDistance(){let a=[...pointers.values()];return Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)}
C.addEventListener('pointerdown',e=>{C.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){downAt={x:e.clientX,y:e.clientY,panX,panY};gestureMoved=false;const cell=hit(e);movingGhost=!!preview&&preview.x===cell.x&&preview.y===cell.y}else if(pointers.size===2){movingGhost=false;gesture={dist:pointerDistance(),zoom,panX,panY,midX:([...pointers.values()][0].x+[...pointers.values()][1].x)/2,midY:([...pointers.values()][0].y+[...pointers.values()][1].y)/2};gestureMoved=true}});
C.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2&&gesture){let a=[...pointers.values()],midX=(a[0].x+a[1].x)/2,midY=(a[0].y+a[1].y)/2;zoom=Math.max(.65,Math.min(2.6,gesture.zoom*pointerDistance()/Math.max(1,gesture.dist)));let r=C.getBoundingClientRect(),factor=800/r.width;panX=gesture.panX+(midX-gesture.midX)*factor;panY=gesture.panY+(midY-gesture.midY)*factor;draw()}else if(pointers.size===1&&downAt){if(Math.hypot(e.clientX-downAt.x,e.clientY-downAt.y)>6)gestureMoved=true;if(gestureMoved&&movingGhost&&preview){Object.assign(preview,hit(e));syncPreview()}else if(gestureMoved){const scale=800/C.getBoundingClientRect().width;panX=downAt.panX+(e.clientX-downAt.x)*scale;panY=downAt.panY+(e.clientY-downAt.y)*scale;draw()}}});
// Pick the frontmost visible sprite before falling back to its ground cell.
function inspectTap(e){const pos=worldPointerPosition(e);const b=scene.pick(pos.x,pos.y);if(b.x>=0&&b.y>=0&&b.x<W&&b.y<H)inspectCell(b.x,b.y)}
C.addEventListener('pointerup',e=>{if(!gestureMoved&&pointers.size===1){let p=hit(e);if(window.mapMode==='view')inspectTap(e,p);else if(p.x>=0&&p.x<W&&p.y>=0&&p.y<H){if(selected==='remove')place(p.x,p.y);else{preview={...p,t:selected,rot:preview?.rot||0};syncPreview()}}}pointers.delete(e.pointerId);if(pointers.size<2)gesture=null;downAt=null});
C.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;gestureMoved=true});const missions={forest:{label:'Охота в лесу',days:1,risk:.12,food:[18,40],wood:[0,8],metal:[0,0]},scout:{label:'Разведка окрестностей',days:1,risk:.19,food:[0,12],wood:[5,18],metal:[0,5]},city:{label:'Поиск припасов в городе',days:2,risk:.42,food:[15,45],wood:[5,20],metal:[10,35]},farmstead:{label:'Заброшенная ферма',days:2,risk:.24,food:[15,30],wood:[8,24],metal:[0,8]},clinic:{label:'Медпункт',days:2,risk:.5,food:[0,8],wood:[0,4],metal:[8,20]},relay:{label:'Радиовышка',days:3,risk:.54,food:[0,8],wood:[0,10],metal:[10,24]}};
function logEvent(text){state.log.unshift(text);state.log=state.log.slice(0,15)}
function renderExpeditions(){let box=$('settlers');box.innerHTML='';for(let p of state.settlers){let l=document.createElement('label');l.className='settler'+(p.status!=='дома'?' busy':'');let cb=document.createElement('input');cb.type='checkbox';cb.value=p.id;cb.disabled=p.status!=='дома'||p.health<=0;l.append(cb);l.append(document.createTextNode(' '+p.name));let sub=document.createElement('small');sub.textContent=p.role+' · опыт '+p.skill+' · здоровье '+p.health+' · '+p.status;l.append(sub);box.append(l)}$('missions').innerHTML=state.expeditions.length?state.expeditions.map(e=>'<div class="mission">'+missions[e.type].label+' · '+e.ids.map(id=>state.settlers.find(p=>p.id===id)?.name).join(', ')+' · '+(e.arriveAt?'осталось '+Math.max(0,Math.ceil((e.arriveAt-Date.now())/60000))+' мин':'возвращение: день '+e.returnDay)+'</div>').join(''):'<small>Сейчас никто не в экспедиции.</small>';$('expLog').innerHTML=state.log.length?state.log.map(t=>'<p>'+t+'</p>').join(''):'<small>Пока нет событий.</small>'}
$('send').onclick=()=>{let ids=[...document.querySelectorAll('#settlers input:checked')].map(x=>+x.value);if(ids.length<1||ids.length>2){msg('Выбери одного или двух свободных поселенцев.');return}let type=$('destination').value,m=missions[type];if(state.food<ids.length*3){msg('Для экспедиции нужно '+ids.length*3+' еды.');return}state.food-=ids.length*3;for(let id of ids)state.settlers.find(p=>p.id===id).status='в экспедиции';state.expeditions.push({type,ids,returnDay:state.day+m.days,departAt:Date.now(),arriveAt:Date.now()+({forest:8,scout:6,city:25,farmstead:15,clinic:30,relay:35}[type]||12)*60000});logEvent('Отряд отправлен: '+m.label+'.');msg('Отряд отправлен. Возвращение по таймеру реального времени.');update()};
function resolveExpeditions(){let finished=state.expeditions.filter(e=>(e.arriveAt?Date.now()>=e.arriveAt:e.returnDay<=state.day));state.expeditions=state.expeditions.filter(e=>(e.arriveAt?Date.now()<e.arriveAt:e.returnDay>state.day));for(let e of finished){let m=missions[e.type],names=e.ids.map(id=>state.settlers.find(p=>p.id===id)?.name).join(', '),skill=e.ids.reduce((n,id)=>n+state.settlers.find(p=>p.id===id).skill,0)/e.ids.length;let risk=Math.max(.04,m.risk-skill*.018),dead=0,infected=0;for(let id of e.ids){let p=state.settlers.find(p=>p.id===id);p.status='дома';let roll=Math.random();if(roll<risk*.17){p.health=0;p.status='погиб';dead++}else if(roll<risk*.57){p.health=Math.max(10,p.health-25);p.status='заражён';infected++}else if(roll<risk){p.health=Math.max(20,p.health-15)}else p.skill=Math.min(10,p.skill+1)}let survivors=e.ids.filter(id=>state.settlers.find(p=>p.id===id).health>0).length;if(survivors){let gain=(arr)=>Math.floor(arr[0]+Math.random()*(arr[1]-arr[0]+1))*survivors;let f=gain(m.food),w=gain(m.wood),met=gain(m.metal);state.food+=f;state.wood+=w;state.metal+=met;logEvent(names+' вернулись из похода. Добыча: еда '+f+', материалы '+w+', металл '+met+'.'+(infected?' Заражение: '+infected+'.':'')+(dead?' Погибли: '+dead+'.':''))}else logEvent('Экспедиция '+names+' не вернулась. Все погибли.');}}
function progressInfection(p){p.health=Math.max(0,p.health-9);if(p.health===0){p.status='погиб';logEvent(p.name+' погиб(ла) от инфекции.')} }
const oldUpdate=update;update=function(){oldUpdate();renderExpeditions()};
$('attack').onclick=()=>{state.wave++;let towers=state.buildings.filter(b=>b.t==='tower'&&completed(b)).length,traps=state.buildings.filter(b=>b.t==='trap'&&completed(b)).length,walls=state.buildings.filter(b=>b.t==='wall'&&completed(b)).length;let enemy=4+state.wave*3,def=towers*4+traps*2+walls;let dmg=Math.max(0,(enemy-def)*6);state.hp=Math.max(0,state.hp-dmg);state.zombies=Array.from({length:Math.min(enemy,12)},(_,i)=>({x:i%2?1:14,y:1+(i*3)%10}));msg(dmg?'Набег! Защита уничтожила часть орды. База потеряла '+dmg+' прочности.':'Набег отбит без потерь!');update();if(state.hp===0)msg('База разрушена. Нажми «Сброс», чтобы начать заново.')};$('reset').onclick=()=>{if(confirm('Начать новую игру?')){state=seed();msg('Новая база готова.');update()}};update();$('zin').onclick=()=>{zoom=Math.min(2.6,zoom+.2);draw()};$('zout').onclick=()=>{zoom=Math.max(.65,zoom-.2);draw()};

// World map and narrative extension 0.5. Separate save slot preserves 0.4.
const sites={home:{name:'Убежище «Север»',icon:'🏠',x:47,y:53,desc:'Наш дом. Пока только здесь можно чувствовать себя относительно спокойно.',risk:'Безопасно'},forest:{name:'Сосновый лес',icon:'🌲',x:19,y:28,desc:'Звериные тропы, ягоды, ручей. Иногда встречаются одиночные заражённые.',risk:'Низкий',type:'forest'},scout:{name:'Старая дорога',icon:'🔭',x:68,y:30,desc:'Разбитые машины и следы эвакуации. Здесь можно узнать, куда ушли люди.',risk:'Средний',type:'scout'},farmstead:{name:'Заброшенная ферма',icon:'🚜',x:22,y:76,desc:'Теплицы и зернохранилище. Возможно, уцелели семена и консервы.',risk:'Средний',type:'farmstead'},city:{name:'Окраина города',icon:'🏚️',x:80,y:66,desc:'Магазины, гаражи, квартиры. Много припасов, но и заражённых.',risk:'Высокий',type:'city'},clinic:{name:'Медпункт',icon:'🏥',x:83,y:17,desc:'Аптечные запасы, записи врача. Сюда стоит идти только подготовленной группой.',risk:'Очень высокий',type:'clinic'},relay:{name:'Радиовышка',icon:'📡',x:51,y:9,desc:'На старой вышке может работать аварийный ретранслятор. Ключ к связи с другими выжившими.',risk:'Очень высокий',type:'relay'}};
state.world ||= {discovered:['home','forest','scout','city'],visited:[],clues:[],radio:false,chapter:0,storyQueue:[],storyDone:[]};
let activeSite='forest';
function worldMessage(title,body,choices){state.world.storyQueue.push({title,body,choices});}
function renderWorld(){const w=state.world;const map=$('worldmap');map.innerHTML='';for(const [id,s] of Object.entries(sites)){const known=w.discovered.includes(id);const b=document.createElement('button');b.className='mapnode'+(activeSite===id?' active':'')+(!known?' locked':'');b.style.left=s.x+'%';b.style.top=s.y+'%';b.innerHTML='<b>'+(known?s.icon:'❔')+'</b>'+(known?s.name:'Неизвестно')+'<small>'+(known?(w.visited.includes(id)?'Исследовано':s.risk):'Не разведано')+'</small>';b.onclick=()=>{activeSite=id;renderWorld()};map.append(b)}const s=sites[activeSite],known=w.discovered.includes(activeSite);$('siteinfo').innerHTML='<strong>'+(known?s.icon+' '+s.name:'❔ Неизвестная точка')+'</strong><p>'+(known?s.desc:'Сначала исследуй окрестности, чтобы открыть эту точку.')+'</p><small>Опасность: '+(known?s.risk:'неизвестна')+'</small>';$('goWorld').disabled=!known||!s.type;$('radioStatus').textContent=w.radio?'📻 Рация работает · канал выживших открыт (сеть пока не реализована)':'📻 Связь отсутствует · альянсы недоступны';const panel=$('story');panel.innerHTML='';if(w.storyQueue.length){const event=w.storyQueue[0];let h=document.createElement('strong');h.textContent=event.title;panel.append(h);let p=document.createElement('p');p.textContent=event.body;panel.append(p);event.choices.forEach((c,i)=>{let btn=document.createElement('button');btn.textContent=c.label;btn.onclick=()=>{w.storyQueue.shift();applyChoice(c);update()};panel.append(btn)})}else{panel.innerHTML='<strong>📖 Журнал истории</strong><p>'+(w.radio?'Радиоканал открыт. Другие выжившие существуют, но серверная MMO ещё не подключена.':w.chapter?'Находки складываются в картину. Радиовышка может оказаться ключом к связи.':'День первый. За оградой — тишина. Нужно исследовать окрестности и найти следы пропавших людей.')+'</p>'}}
function applyChoice(c){const w=state.world;if(c.effect==='radio'){w.radio=true;logEvent('Восстановлена рация. Связь с другими поселениями теперь возможна.')}else if(c.effect==='food'){state.food+=15;logEvent('Найдены дополнительные консервы: +15 еды.')}else if(c.effect==='metal'){state.metal+=12;logEvent('Сохранены радиодетали: +12 металла.')}else if(c.effect==='clue'){if(!w.clues.includes('frequency'))w.clues.push('frequency');logEvent('Записана аварийная частота.')}else if(c.effect==='none')logEvent('Решение принято: '+c.label);}
function worldDiscovery(e){const w=state.world,id=e.type; if(!w.visited.includes(id))w.visited.push(id);if(id==='scout'){for(let key of ['farmstead','clinic','relay'])if(!w.discovered.includes(key))w.discovered.push(key);if(!w.storyDone.includes('scout')){w.storyDone.push('scout');w.chapter=1;worldMessage('Глава I · Следы эвакуации','На старой дороге разведчики нашли автобус с заколоченными окнами. На приборной панели — карта с отметкой радиовышки. Рядом лежит блокнот: «Не доверяйте голосам на общей частоте».',[{label:'Забрать карту и записать частоту',effect:'clue'},{label:'Забрать полезные детали',effect:'metal'}])}}
if(id==='farmstead'&&!w.storyDone.includes('farmstead')){w.storyDone.push('farmstead');worldMessage('Теплицы без хозяев','В теплице сохранились пакеты семян и банки с едой. На стене — странные царапины, будто растения пытались выбраться наружу.',[{label:'Забрать продукты (+15 еды)',effect:'food'},{label:'Зафиксировать необычные следы',effect:'none'}])}
if(id==='city'&&!w.storyDone.includes('city')){w.storyDone.push('city');worldMessage('Город · Квартира № 17','За запертой дверью слышится стук. Внутри обнаружена работающая радиостанция, но её антенна сломана. На стене записана частота аварийной связи.',[{label:'Записать частоту',effect:'clue'},{label:'Разобрать оборудование (+12 металла)',effect:'metal'}])}
if(id==='relay'&&!w.storyDone.includes('relay')){w.storyDone.push('relay');worldMessage('Глава II · Голоса в эфире','На вершине вышки сохранился аварийный радиоблок. В динамике треск и обрывок сообщения: «Если кто-то слышит — ответьте…» Вы можете наладить связь, но это выдаст ваше присутствие.',[{label:'Восстановить радиосвязь',effect:'radio'},{label:'Пока оставить передатчик выключенным',effect:'none'}])}
if(id==='clinic'&&!w.storyDone.includes('clinic')){w.storyDone.push('clinic');worldMessage('Медпункт · Протокол 09','В журнале дежурного врача описаны пациенты, реагирующие на неизвестные споры. Возможно, зомби — не единственная опасность.',[{label:'Сохранить медицинские записи',effect:'none'}])}
}
$('goWorld').onclick=()=>{const s=sites[activeSite];if(!s.type)return;$('destination').value=s.type;document.querySelector('.expeditions').scrollIntoView({behavior:'smooth',block:'start'});msg('Выбрано место: '+s.name+'. Теперь назначь участников экспедиции.')};
// Wrap existing expedition resolution to trigger narrative only for parties that return.
const baseResolveExpeditions=resolveExpeditions;
resolveExpeditions=function(){const due=state.expeditions.filter(e=>(e.arriveAt?Date.now()>=e.arriveAt:e.returnDay<=state.day)).map(e=>({...e}));baseResolveExpeditions();for(const e of due){if(e.ids.some(id=>state.settlers.find(p=>p.id===id)?.health>0))worldDiscovery(e)}};
const updateWithExpeditions=update;
update=function(){updateWithExpeditions();renderWorld()};
if(!state.world.storyDone.length&&!state.world.storyQueue.length){worldMessage('Пролог · Первый день','Убежище «Север» пережило первую ночь. Генератор молчит. За оградой иногда слышатся шаги. Никто не знает, остался ли кто-то ещё в живых. Пока ваша задача — удержать этих пятерых людей вместе.',[{label:'Начать разведку окрестностей',effect:'none'}])}
update();

// 0.6 — посевы, отдельные семена, урожай и развитие агронома.
const CROPS=[
['Картофель','🥔',3,9,2],['Морковь','🥕',3,7,2],['Свёкла','🫜',4,8,2],['Редис','🌱',2,5,2],
['Репа','🫜',3,7,2],['Пастернак','🌿',4,8,2],['Томат','🍅',5,11,3],['Огурец','🥒',4,9,3],
['Перец','🫑',6,10,3],['Баклажан','🍆',6,10,3],['Кабачок','🥒',5,12,2],['Тыква','🎃',7,18,3],
['Капуста','🥬',5,13,3],['Брокколи','🥦',5,9,3],['Цветная капуста','🥦',6,10,3],
['Горох','🫛',4,8,2],['Фасоль','🫘',5,9,3],['Чечевица','🫘',5,7,2],
['Пшеница','🌾',6,13,3],['Рожь','🌾',6,12,3],['Овёс','🌾',5,11,2],['Кукуруза','🌽',7,15,3],
['Гречиха','🌾',5,10,2],['Лук','🧅',4,8,2],['Чеснок','🧄',5,8,2],
['Укроп','🌿',3,5,2],['Петрушка','🌿',4,6,2],['Салат','🥬',3,6,2],
['Клубника','🍓',6,9,3],['Малина','🫐',8,10,3],['Подсолнечник','🌻',7,11,3]
].map(([name,icon,days,yieldAmount,water])=>({name,icon,days,yieldAmount,water}));
state.agri ||= {plots:[],seeds:{},produce:{},farmer:3,auto:false,experience:0};
let ag=state.agri;
for(const c of CROPS){if(ag.seeds[c.name]===undefined)ag.seeds[c.name]=['Картофель','Морковь','Томат','Горох','Лук','Капуста'].includes(c.name)?5:0}
function plotCapacity(){return state.buildings.filter(b=>b.t==='farm'&&completed(b)).length*4}
function normalizePlots(){let n=plotCapacity();while(ag.plots.length<n)ag.plots.push({crop:null,progress:0,water:0});if(ag.plots.length>n)ag.plots.length=n}
function farmer(){return state.settlers.find(p=>p.id===Number(ag.farmer)&&p.health>0&&p.status==='дома')}
function farmerBonus(){let p=farmer();return p?(p.id===3?2:0)+Math.floor((p.skill||0)/3):0}
function harvestPlot(i){let p=ag.plots[i];if(!p||!p.crop||cropEnd(p,CROPS.find(c=>c.name===p.crop))>Date.now())return false;let c=CROPS.find(c=>c.name===p.crop),amount=c.yieldAmount+farmerBonus();ag.produce[c.name]=(ag.produce[c.name]||0)+amount;ag.seeds[c.name]=(ag.seeds[c.name]||0)+Math.max(1,Math.floor(amount/4));let f=farmer();if(f){ag.experience++;if(ag.experience%4===0)f.skill=Math.min(10,f.skill+1)}ag.plots[i]={crop:null,progress:0,water:0};logEvent('Урожай: '+c.name+' ×'+amount+' (семена сохранены).');return true}
function plantPlot(i){let c=CROPS.find(x=>x.name===$('cropSelect').value),p=ag.plots[i];if(!c||!p||p.crop)return;if((ag.seeds[c.name]||0)<1)return msg('Нет семян '+c.name+'. Ищи их в экспедициях.');ag.seeds[c.name]--;ag.plots[i]={crop:c.name,progress:0,water:2,readyAt:Date.now()+c.days*10*minute};msg('Посажено: '+c.name);update()}
function renderAgriculture(){normalizePlots();let selected=$('cropSelect').value,c=CROPS.find(x=>x.name===selected)||CROPS[0];$('cropInfo').textContent=c.icon+' '+c.name+' · рост '+(c.days*10)+' мин. · урожай '+c.yieldAmount+'+'+farmerBonus()+' · семян '+ag.seeds[c.name]+' · полив '+c.water;
$('autoFarm').textContent='Автосбор: '+(ag.auto?'вкл.':'выкл.');
$('agriSummary').textContent='Грядок: '+ag.plots.length+' · Агроном: '+(farmer()?.name||'не назначен / занят')+' · бонус урожая: +'+farmerBonus();
let box=$('plots');box.replaceChildren();ag.plots.forEach((p,i)=>{let d=document.createElement('div');d.className='plot';let c=CROPS.find(x=>x.name===p.crop),ready=c&&cropEnd(p,c)<=Date.now();let title=document.createElement('b');title.textContent='Грядка '+(i+1)+' · '+(c?c.icon+' '+c.name:'свободна');d.append(title);
let detail=document.createElement('small');detail.textContent=c?(ready?'Урожай созрел':kitchenClock(p.readyAt-Date.now())):'Выбери культуру и посади';if(c&&!ready)detail.dataset.end=p.readyAt;d.append(detail);
if(c){let bar=document.createElement('div');bar.className='progress';let inner=document.createElement('i');inner.style.width=Math.min(100,Math.max(0,100*(1-(p.readyAt-Date.now())/(c.days*10*minute))))+'%';bar.append(inner);d.append(bar)}
let b=document.createElement('button');b.textContent=!c?'🌱 Посадить':ready?'🧺 Собрать':'💧 Полить';b.onclick=()=>{if(!c)plantPlot(i);else if(ready){harvestPlot(i);update()}else if(state.wood>=1){state.wood--;p.water=Math.min(4,p.water+2);p.readyAt=Math.max(Date.now(),p.readyAt-minute);update()}else msg('Не хватает материалов для полива.')};d.append(b);box.append(d)});
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
$('waterAll').onclick=()=>{if(state.wood<3)return msg('Нужно 3 материала.');state.wood-=3;ag.plots.filter(p=>p.crop).forEach(p=>{p.water=Math.min(4,p.water+2);p.readyAt=Math.max(Date.now(),p.readyAt-minute)});update()};
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

const RECIPE_BASE=[
['Печёный картофель',1,1,{'Картофель':2},6],['Варёная морковь',1,1,{'Морковь':2,'Вода':1},5],['Свекольный отвар',1,1,{'Свёкла':2,'Вода':2},5],['Кукуруза на углях',1,1,{'Кукуруза':2},6],['Жареные кабачки',1,1,{'Кабачок':2,'Масло':1},7],['Овсяная каша',1,1,{'Овёс':2,'Вода':1},7],['Гречневая каша',1,1,{'Гречиха':2,'Вода':1},7],['Похлёбка из репы',1,1,{'Репа':2,'Вода':2},6],['Гороховая похлёбка',1,1,{'Горох':2,'Вода':2},7],['Овощи на углях',1,1,{'Перец':1,'Томат':1},7],
['Картофельный суп',2,2,{'Картофель':2,'Морковь':1,'Вода':2},11],['Щи',2,2,{'Капуста':2,'Морковь':1,'Вода':2},12],['Борщ',2,2,{'Свёкла':2,'Капуста':1,'Картофель':1,'Вода':2},15],['Гороховый суп',2,2,{'Горох':2,'Картофель':1,'Вода':2},12],['Чечевичная похлёбка',2,2,{'Чечевица':2,'Лук':1,'Вода':2},12],['Тушёная капуста',2,2,{'Капуста':2,'Лук':1,'Масло':1},12],['Рагу из кабачков',2,2,{'Кабачок':2,'Томат':1,'Лук':1},13],['Картофельное пюре',2,2,{'Картофель':3,'Масло':1},12],['Грибной суп',2,2,{'Вешенки':2,'Картофель':1,'Вода':2},13],['Томатный суп',2,2,{'Томат':3,'Вода':2},11],
['Гречка с мясом',3,2,{'Гречиха':2,'Мясо':2,'Вода':1},18],['Тушёное мясо',3,2,{'Мясо':3,'Лук':1,'Вода':1},19],['Картофель с мясом',3,2,{'Картофель':2,'Мясо':2,'Лук':1},19],['Овощное рагу',3,2,{'Картофель':1,'Кабачок':1,'Морковь':1,'Томат':1},14],['Фасолевое рагу',3,2,{'Фасоль':2,'Томат':1,'Лук':1},15],['Каша с тыквой',3,2,{'Тыква':2,'Овёс':1,'Вода':1},14],['Пшённая каша с тыквой',3,2,{'Тыква':2,'Вода':2,'Масло':1},12],['Запечённая свёкла',3,2,{'Свёкла':2,'Масло':1},12],['Тушёные баклажаны',3,2,{'Баклажан':2,'Томат':1},14],['Овощной гарнир',3,2,{'Брокколи':1,'Цветная капуста':1,'Морковь':1},14],
['Хлеб ржаной',3,2,{'Рожь':3,'Вода':2,'Соль':1},18],['Хлеб пшеничный',3,2,{'Пшеница':3,'Вода':2,'Соль':1},18],['Лепёшка',2,2,{'Мука':2,'Вода':1},12],['Запечённая тыква',2,2,{'Тыква':2},11],['Печёный пастернак',2,2,{'Пастернак':2,'Масло':1},11],['Томатная подлива',3,2,{'Томат':2,'Лук':1},9],['Суп из брокколи',3,2,{'Брокколи':2,'Картофель':1,'Вода':2},13],['Фасолевый суп',3,2,{'Фасоль':2,'Морковь':1,'Вода':2},13],['Капустный суп с мясом',3,2,{'Капуста':2,'Мясо':2,'Вода':2},19],['Овсяная лепёшка',3,2,{'Овёс':2,'Вода':1,'Масло':1},13],
['Мясной пирог',5,3,{'Мука':3,'Мясо':3,'Лук':1,'Масло':1},28],['Овощной пирог',5,3,{'Мука':3,'Капуста':2,'Масло':1},23],['Фаршированный перец',5,3,{'Перец':2,'Мясо':2,'Гречиха':1},25],['Запеканка из картофеля',4,3,{'Картофель':3,'Мясо':1,'Масло':1},22],['Тыквенный пирог',5,3,{'Тыква':3,'Мука':2,'Масло':1},23],['Сложное овощное рагу',5,3,{'Баклажан':1,'Перец':1,'Томат':2,'Фасоль':1},22],['Праздничное жаркое',6,3,{'Мясо':4,'Картофель':2,'Лук':1,'Морковь':1},34],['Хлеб с чесноком',4,3,{'Мука':2,'Чеснок':1,'Масло':1},18],['Пирог с клубникой',5,3,{'Клубника':3,'Мука':2,'Масло':1},22],['Пирог с малиной',5,3,{'Малина':3,'Мука':2,'Масло':1},22],['Тушёная чечевица с мясом',4,3,{'Чечевица':2,'Мясо':2,'Лук':1},23],['Овощная лазанья',7,3,{'Баклажан':2,'Томат':2,'Мука':2,'Масло':1},27],['Капустные голубцы',6,3,{'Капуста':2,'Мясо':2,'Гречиха':1},26],['Пшеничный пирог с овощами',5,3,{'Пшеница':3,'Кабачок':2,'Лук':1},22]
];
const RECIPES=RECIPE_BASE.map(([name,level,kitchen,ingredients,food])=>({name,level,kitchen,ingredients,food}));
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
function pantryAmount(name){return name in ag.produce?(ag.produce[name]||0):(ck.pantry[name]||0)}
function changePantry(name,n){if(name in ag.produce)ag.produce[name]+=n;else ck.pantry[name]=(ck.pantry[name]||0)+n}
function chefPerson(){return state.settlers.find(p=>p.id===Number(ck.chef)&&p.health>0&&p.status==='дома')}
function chefLevel(){return 10}
function canCook(r){return chefLevel()>=r.level&&ck.kitchen>=r.kitchen&&Object.entries(r.ingredients).every(([k,n])=>pantryAmount(k)>=n)}
function cookRecipe(i){let r=RECIPES[i];if(!r)return;if(!canCook(r))return msg('Не хватает ингредиентов или уровня кухни.');if(!Array.isArray(ck.queue))ck.queue=[];if(ck.queue.length>=5)return msg('Очередь кухни заполнена (5 блюд).');for(const [k,n] of Object.entries(r.ingredients))changePantry(k,-n);const duration=10*minute;const start=Math.max(Date.now(),ck.queue.length?ck.queue[ck.queue.length-1].end:0);ck.queue.push({recipe:i,start,end:start+duration});logEvent('На кухне начали готовить «'+r.name+'».');update();renderCooking();renderKitchenQueue()}
const mealSatiety=18;
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
function chooseMeal(p){let meals=availableMeals();if(!meals.length)return null;let record=nt.people[p.id],recent=record.history.slice(-3);let mode=nt.mode;
meals.sort((a,b)=>{let score=m=>{let quality=m.recipe?.food||5;let repetition=recent.includes(m.name)?-15:4;let preference=m.name.includes(record.favorite)?5:0;return (mode==='save'?-quality:mode==='best'?quality*2:quality/2+repetition)+preference};return score(b)-score(a)});return meals[0];}
function feedSettler(p){let results=[];let n=nt.people[p.id] ||= {hunger:85,morale:65,history:[],favorite:'Суп'};let meal=chooseMeal(p);if(meal){ck.meals[meal.name]--;n.history.push(meal.name);n.history=n.history.slice(-7);n.hunger=Math.min(100,n.hunger+mealSatiety);let unique=new Set(n.history.slice(-4)).size;n.morale=Math.min(100,n.morale+(unique>=3?3:unique===1?-2:1));results.push(p.name+': '+meal.name)}else if(state.food>=2){state.food-=2;n.hunger=Math.min(100,n.hunger+7);n.morale=Math.max(0,n.morale-2);results.push(p.name+': аварийный паёк')}else{n.hunger=Math.max(0,n.hunger-23);n.morale=Math.max(0,n.morale-7);if(n.hunger<35){p.health=Math.max(0,p.health-8);if(!p.health)p.status='погиб'}results.push(p.name+': голод')}
if(p.status!=='дома'){n.hunger=Math.max(0,n.hunger-5)}
logEvent('Питание: '+results.join('; ')+'.');}
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
  else if(!buildingSite){
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
  function showInfo(){
    info.setAttribute('aria-pressed','true');commands.setAttribute('aria-pressed','false');
    body.textContent='Клетка '+(x+1)+' × '+(y+1);
    if(buildingSite){const timer=document.createElement('b');timer.dataset.end=b.buildEnd;timer.textContent=kitchenClock(b.buildEnd-Date.now());body.append(' · Строительство ',timer)}
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
  const ring=[{icon:'ⓘ',label:'Сведения',run:showInfo},...actions.filter(a=>a.label!=='Сброс')];
  ring.forEach((a,i)=>{
    const btn=makeButton(a,true);if(i===0)btn.onclick=showInfo;
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
 const now=Date.now();let done=false;
 while(ck.queue.length&&Number(ck.queue[0].end)<=now){
  const item=ck.queue.shift(),recipe=RECIPES[item.recipe];
  if(recipe){ck.meals[recipe.name]=(ck.meals[recipe.name]||0)+1;logEvent('Готово: «'+recipe.name+'» (+1 порция).');done=true}
 }
 if(done)update();
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
    pair.append(dishArt(r),time);row.append(pair);
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
let worldPan={x:0,y:0},worldScale=1,worldPointer=null;
function worldHash(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n)}
function worldCanvasDraw(){
 const el=document.getElementById('worldmap'),canvas=el.querySelector('canvas');if(!canvas)return;
 const width=el.clientWidth,height=el.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);
 if(width<20||height<20)return;
 canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 const c=canvas.getContext('2d');c.scale(dpr,dpr);
 c.fillStyle='#243a2d';c.fillRect(0,0,width,height);
 const tw=43*worldScale,th=22*worldScale,originX=width/2+worldPan.x,originY=height*.40+worldPan.y;
 function pt(x,y){return [originX+(x-y)*tw/2,originY+(x+y)*th/2]}
 function tile(x,y,color){let [px,py]=pt(x,y);c.fillStyle=color;c.beginPath();c.moveTo(px,py-th/2);c.lineTo(px+tw/2,py);c.lineTo(px,py+th/2);c.lineTo(px-tw/2,py);c.closePath();c.fill()}
 for(let y=-24;y<25;y++)for(let x=-24;x<25;x++){
  const h=worldHash(x,y),r=worldHash(x+90,y+90);
  const road=Math.abs(x-y+3)<1.3||Math.abs(x+8)<1&&y>0&&y<14;
  const urban=x>4&&y>-5&&y<7;
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
 const home=sites.home,selected=sites[activeSite];
 if(selected&&activeSite!=='home'&&state.world.discovered.includes(activeSite)){
  const from=pt((home.x-50)/4,(home.y-50)/4),to=pt((selected.x-50)/4,(selected.y-50)/4);
  const mid=[(from[0]+to[0])/2,(from[1]+to[1])/2-17*worldScale];
  c.beginPath();c.moveTo(...from);c.quadraticCurveTo(...mid,...to);
  c.setLineDash([8*worldScale,5*worldScale]);c.strokeStyle='#f3d58e';c.lineWidth=3*worldScale;c.stroke();c.setLineDash([]);
  c.beginPath();c.arc(to[0],to[1],8*worldScale,0,Math.PI*2);c.strokeStyle='#f8d27d';c.lineWidth=2;c.stroke();
 }

 // Real-time expedition markers move along the route, including after page reload.
 for(const expedition of state.expeditions){
  if(!expedition.departAt||!expedition.arriveAt)continue;
  const destination=Object.values(sites).find(site=>site.type===expedition.type);
  if(!destination)continue;
  const progress=Math.max(0,Math.min(1,(Date.now()-expedition.departAt)/(expedition.arriveAt-expedition.departAt)));
  const h=pt((sites.home.x-50)/4,(sites.home.y-50)/4),d=pt((destination.x-50)/4,(destination.y-50)/4);
  const travel=progress<.5?progress*2:2-progress*2;
  const px=h[0]+(d[0]-h[0])*travel,py=h[1]+(d[1]-h[1])*travel-12*worldScale*Math.sin(travel*Math.PI);
  c.beginPath();c.arc(px,py,10*worldScale,0,Math.PI*2);c.fillStyle='#f0d68c';c.fill();c.strokeStyle='#24382c';c.lineWidth=2;c.stroke();
  c.font=(12*worldScale)+'px sans-serif';c.textAlign='center';c.fillStyle='#26382b';c.fillText('➤',px,py+4*worldScale);
 }
 // Landmark nodes use the same projected plane as the terrain.
 for(const [id,site] of Object.entries(sites)){
  const node=el.querySelector('[data-site="'+id+'"]');if(!node)continue;
  const x=(site.x-50)/4,y=(site.y-50)/4;
  const [px,py]=pt(x,y);
  node.style.left=px+'px';node.style.top=(py-18*worldScale)+'px';
  node.style.display=(px< -65||px>width+65||py< -80||py>height+80)?'none':'';
 }
}
renderWorld=function(){
 worldRenderBefore13();
 const map=document.getElementById('worldmap');
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');map.prepend(canvas);
 const hud=document.createElement('div');hud.className='worldhud';hud.textContent='🌍 Окрестности · '+(sites[activeSite]?.name||'Исследование');map.append(hud);
 const controls=document.createElement('div');controls.className='worldcontrols';
 for(const [label,delta] of [['+',.2],['−',-.2]]){
  const button=document.createElement('button');button.textContent=label;button.title=delta>0?'Приблизить':'Отдалить';
  button.onclick=()=>{worldScale=Math.max(.6,Math.min(2.3,worldScale+delta));worldCanvasDraw()};
  controls.append(button);
 }
 const reset=document.createElement('button');reset.textContent='⌖';reset.title='Центрировать карту';reset.onclick=()=>{worldScale=1;worldPan={x:0,y:0};worldCanvasDraw()};controls.append(reset);map.append(controls);
 const legend=document.createElement('div');legend.className='worldlegend';legend.textContent='🟡 Маршрут  ·  🔴 Опасная зона  ·  🌲 Дикая местность';map.append(legend);
 Object.keys(sites).forEach((id,i)=>{const node=map.querySelectorAll('.mapnode')[i];if(node)node.dataset.site=id});
 worldCanvasDraw();
};
const worldMapEl=document.getElementById('worldmap');
worldMapEl.addEventListener('pointerdown',e=>{if(e.target.closest('.mapnode'))return;worldPointer={id:e.pointerId,x:e.clientX,y:e.clientY,panX:worldPan.x,panY:worldPan.y};worldMapEl.setPointerCapture(e.pointerId)});
worldMapEl.addEventListener('pointermove',e=>{if(!worldPointer||e.pointerId!==worldPointer.id)return;worldPan.x=worldPointer.panX+e.clientX-worldPointer.x;worldPan.y=worldPointer.panY+e.clientY-worldPointer.y;worldCanvasDraw()});
for(const name of ['pointerup','pointercancel'])worldMapEl.addEventListener(name,()=>{worldPointer=null});
window.addEventListener('resize',()=>{if(activeTab==='world')worldCanvasDraw()});
document.getElementById('goWorld').onclick=()=>{
 const site=sites[activeSite];if(!site?.type)return;
 document.getElementById('destination').value=site.type;openTab('exp');
 msg('Выбрано место: '+site.name+'. Отправь экспедицию.');
};


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
  const now=Date.now();let changed=false;
  for(const b of state.buildings){
    if(b.buildEnd&&b.buildEnd<=now){if(b.t==='scrap')b.outputAt=b.buildEnd+15*minute;delete b.buildEnd;changed=true}
    if(b.t==='scrap'&&completed(b)){
      if(!b.outputAt){b.outputAt=now+15*minute;changed=true}
      if(b.outputAt<=now){const batches=1+Math.floor((now-b.outputAt)/(15*minute));state.wood+=12*batches;state.metal+=5*batches;b.outputAt+=batches*15*minute;changed=true}
    }
  }
  for(const p of state.settlers){
    if(p.health<=0)continue;
    if(!p.mealAt){p.mealAt=now+(55+p.id)*minute;changed=true}
    if(p.mealAt<=now){feedSettler(p);p.mealAt=now+60*minute;changed=true}
    if(p.status==='заражён'){
      if(!p.infectionAt){p.infectionAt=now+30*minute;changed=true}
      if(p.infectionAt<=now){progressInfection(p);p.infectionAt=now+30*minute;changed=true}
    }
  }
  for(const [i,p] of ag.plots.entries()){
    if(!p.crop)continue;
    const c=CROPS.find(c=>c.name===p.crop);if(!c)continue;
    if(cropEnd(p,c)<=now){if(ag.auto){harvestPlot(i);changed=true}else if(p.progress!==c.days){p.progress=c.days;changed=true}}
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
