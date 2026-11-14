import Phaser from 'phaser';
import {gridToScreen,screenToGrid,isoSortKey} from '../shared/iso.ts';
import {snapToPlacement,GAMEPLAY_TILE} from '../shared/grid.ts';
import {constructionError,type Building,type ShelterState,type Cell} from '../shared/shelter.ts';

const projection={originX:400,originY:100,cellW:54,cellH:27,worldW:800,worldH:640};
export function point(x:number,y:number){return gridToScreen(projection,x,y)}
export function cellAt(x:number,y:number){
  const p=screenToGrid(projection,x,y);
  const snap=(n:number)=>snapToPlacement(n*GAMEPLAY_TILE,4,GAMEPLAY_TILE)/GAMEPLAY_TILE;
  return {x:snap(p.x),y:snap(p.y)};
}
type Model={state:ShelterState & {zombies:Cell[]};preview:Building|null;zoom:number;panX:number;panY:number};
export class Shelter extends Phaser.Scene{
  private layer!:Phaser.GameObjects.Container;
  private buildings=new Map<string,Phaser.GameObjects.Image>();
  private labels=new Map<string,Phaser.GameObjects.Text>();
  constructor(private model:()=>Model,private art:Record<string,string>){super('shelter')}
  preload(){
    for(const [key,path] of Object.entries(this.art))this.load.image(key,'assets/atlas-sprites/'+path+'.png');
    this.load.image('ground','assets/atlas-sprites/nature/shelter-ground.png');
    this.load.image('undead','assets/shelter/undead.png');
  }
  create(){
    this.layer=this.add.container();
    this.layer.add(this.add.image(-32,86.5,'ground').setOrigin(0).setScale(.5).setDepth(-1));
  }
  pick(x:number,y:number){
    const ordered=[...this.model().state.buildings].sort((a,b)=>isoSortKey(b.x,b.y)-isoSortKey(a.x,a.y));
    for(const b of ordered){
      const image=this.buildings.get('b'+b.x+','+b.y);if(!image)continue;
      const u=(x-image.x)/image.scaleX+image.width/2,v=(y-image.y)/image.scaleY+image.height;
      if(u>=0&&u<image.width&&v>=0&&v<image.height&&(this.textures.getPixelAlpha(Math.floor(image.flipX?image.width-1-u:u),Math.floor(v),image.texture.key)??0)>35)return b;
    }
    return cellAt(x,y);
  }
  update(){
    const {state,preview,zoom,panX,panY}=this.model(),now=Date.now(),live=new Set<string>();
    const resolution=this.scale.width/800;
    this.layer.setPosition((400+panX-400*zoom)*resolution,(225+panY-225*zoom)*resolution).setScale(zoom*resolution);
    const sprite=(id:string,key:string,x:number,y:number,width:number,depth:number)=>{
      live.add(id);let image=this.buildings.get(id);
      if(!image){image=this.add.image(x,y,key).setOrigin(.5,1);this.layer.add(image);this.buildings.set(id,image)}
      if(image.texture.key!==key)image.setTexture(key);
      image.setPosition(x,y).setScale(width/image.width).setDepth(depth);
      return image;
    };
    const building=(b:Building,ghost:boolean)=>{
      const id=ghost?'preview':'b'+b.x+','+b.y,p=point(b.x,b.y),depth=isoSortKey(b.x,b.y),site=(b.buildEnd??0)>now;
      const width=site?60:b.t==='hq'?130:b.t==='tower'?54:79;
      const image=sprite(id,site?'site':b.t,p.x,p.y+10,width,depth).setFlipX(!!b.rot).setAlpha(ghost ? 0.55 : 1);
      if(ghost&&constructionError(state,b))image.setTint(0xff6464);else image.clearTint();
      if(site){
        const phase=now/1000+b.x;
        sprite(id+'hammer2','hammer',p.x+5,p.y-17,8,depth+.1).setRotation(Math.sin(phase*7+2)*.8);
        sprite(id+'hammer','hammer',p.x-10,p.y-9,8,depth+.1).setRotation(Math.sin(phase*7)*.8);
        sprite(id+'saw','saw',p.x+12+Math.sin(phase*8)*3,p.y-3,19,depth+.2).setRotation(-.34);
        let timer=this.labels.get(id);if(!timer){timer=this.add.text(0,0,'',{fontSize:'12px',backgroundColor:'#231e17',color:'#ffe0a1'}).setOrigin(.5,0);this.layer.add(timer);this.labels.set(id,timer)}
        const sec=Math.ceil((b.buildEnd!-now)/1000);
        timer.setText(Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')).setPosition(p.x,p.y+5).setDepth(2000);
        live.add(id+'clock');
      }
    };
    for(const b of state.buildings)building(b,false);
    if(preview)building(preview,true);
    state.zombies.forEach((z,i)=>{const p=point(z.x,z.y);sprite('z'+i,'undead',p.x,p.y,19,isoSortKey(z.x,z.y)+.5)});
    for(const [id,img] of this.buildings)if(!live.has(id)){img.destroy();this.buildings.delete(id)}
    for(const [id,timer] of this.labels)if(!live.has(id+'clock')){timer.destroy();this.labels.delete(id)}
    this.layer.sort('depth');
  }
}
