import * as THREE from './assets/lib/three.module.js';
import {applyLivery} from './ship-livery.js';
import {weaponModel,CROWN_MODELS} from './armory-visuals.js';

const MOUNTS=[[1.75,2.78,0],[.1,2.78,-2.05],[.1,2.78,2.05],[-3,2.9,0],[2.3,3.9,0],[-1.1,4.75,0]];
// Real emitter tips from build_assets.py / build_expansion.py, converted to glTF Y-up.
// Authored Muzzle nodes on evolved weapons always take precedence over these anchors.
export const BASE_MUZZLES=Object.freeze(Object.fromEntries(Object.entries({
 torpedo:[1.36,.92,0],arc:[0,2.6,0],flak:[1.545,.82,.27],mortar:[.59,1.87,0],
 mines:[0,1.4,0],harpoon:[1.86,1.1,0],drone:[0,1.645,0],cryo:[1.42,.7,0],
 rail:[2.215,.99,0],vortex:[0,2.16,0],flame:[1.765,.8,.2728],sonic:[1.075,1.54,0],
 sonar:[0,1.5,.8],salvage:[1.5,1.35,0],repair:[0,1.5,0],armor:[0,1.27,0]
}).map(([key,p])=>[key,Object.freeze(p)])));
const radii=new WeakMap();
const eased=t=>1-Math.pow(1-t,3);
const bounded=(x,min,max)=>Math.max(min,Math.min(max,x));

/** A stable hull with independently earned sockets and structural attachments. */
export class ShipAssembly{
 constructor(view,root,body,hull,shadow,look){
  this.view=view;this.root=root;this.body=body;this.hull=hull;this.shadow=shadow;this.look=look;this.modules=new Map();this.parts=new Map();this.signature='';this.animations=[];this.clock=0;this.bank=0;this.pitch=0;this.thrust=0;this.wakeAt=0;this.lastAngle=null;this.docked=0;
  this.playerHull=!!window.UBContent.HULLS[hull]&&!look?.paint?.id?.startsWith('hostile-');
  this.rotors=[];const hubs=[],blades=[];body.updateWorldMatrix(true,true);body.traverse(o=>{if(/Runtime.rotor/i.test(o.name))this.rotors.push(o);else if(/propeller.hub/i.test(o.name))hubs.push(o);else if(/propeller.blade/i.test(o.name))blades.push(o);});
  for(const hub of hubs){const center=body.worldToLocal(hub.getWorldPosition(new THREE.Vector3())),rotor=new THREE.Group();rotor.position.copy(center);body.add(rotor);rotor.updateWorldMatrix(true,false);this.rotors.push(rotor);}
  for(const blade of blades){const point=body.worldToLocal(blade.getWorldPosition(new THREE.Vector3()));let nearest=null,distance=Infinity;for(const rotor of this.rotors){const d=rotor.position.distanceToSquared(point);if(d<distance){distance=d;nearest=rotor;}}nearest?.attach(blade);}
  this.lamps=[];body.traverse(o=>{if(o.userData.engineGlow)this.lamps.push(o);});
 }
 tint(part){applyLivery(part,this.look?.paint?{paint:this.look.paint}:null);return part;}
 dock(object,target,animate,delay=0){
  this.animations=this.animations.filter(a=>a.object!==object);object.position.copy(target);
  if(!animate||this.view.reducedMotion)return;
  const start=target.clone().add(new THREE.Vector3(target.z?0:-1.5,2.5,target.z?Math.sign(target.z)*2.8:0));object.position.copy(start);this.animations.push({object,start,target:target.clone(),age:-delay,duration:.64});
 }
 addPart(id,model,position,scale=1,rotation=0,animate=false,parent=this.body){
  if(this.parts.has(id)||!this.view.assets[model])return this.parts.get(id);
  const group=new THREE.Group(),mesh=this.tint(this.view.clone(model,this.shadow));mesh.scale.setScalar(scale);mesh.rotation.y=rotation;group.add(mesh);group.userData.growthPart=id;group.userData.growthModel=model;parent.add(group);this.parts.set(id,group);this.dock(group,new THREE.Vector3(...position),animate,(this.animations.length%4)*.045);return group;
 }
 releaseFlank(flank){
  for(const [id,part]of this.parts)if(part.parent===flank.socket){part.removeFromParent();this.view.release(part);this.parts.delete(id);}
  flank.socket.removeFromParent();this.view.release(flank.socket);
  this.animations=this.animations.filter(a=>a.object.parent);
 }
 makeFlank(key,index){
  const socket=new THREE.Group();socket.userData.module=key;this.body.add(socket);
  return {key,index,side:null,socket,weapon:null,model:null,evolution:null,muzzles:[],mechanisms:[],recoil:0,kick:0,baseScale:1,flash:0,aim:0,paired:false,mountSignature:''};
 }
 modelRadius(model,key){
  const source=this.view.assets[model];if(!source)return 1.3;
  if(!radii.has(source)){
   const b=new THREE.Box3().setFromObject(source),x=Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),z=Math.max(Math.abs(b.min.z),Math.abs(b.max.z));
   let radius=Number.isFinite(x+z)?Math.hypot(x,z):1.3;
   source.updateWorldMatrix(true,true);source.traverse(o=>{if(/^Muzzle(?:[ _|]|$)/i.test(o.name)){const p=source.worldToLocal(o.getWorldPosition(new THREE.Vector3()));radius=Math.max(radius,Math.hypot(p.x,p.z));}});
   radii.set(source,radius);
  }
  const p=BASE_MUZZLES[key]||[0,0,0];return Math.max(radii.get(source),Math.hypot(p[0],p[2]));
 }
 setWeapon(flank,evolution=null){
  const requested=weaponModel(flank.key,evolution),model=this.view.assets[requested]?requested:'module-'+flank.key;flank.evolution=evolution;
  if(flank.model===model)return;
  const previous=flank.weapon,weapon=this.tint(this.view.clone(model,this.shadow));
  if(previous){weapon.position.copy(previous.position);weapon.rotation.copy(previous.rotation);weapon.scale.copy(previous.scale);previous.removeFromParent();this.view.release(previous);}
  flank.socket.add(weapon);flank.weapon=weapon;flank.model=model;flank.muzzles=[];flank.mechanisms=[];
  weapon.traverse(object=>{
   if(/^Muzzle(?:[ _|]|$)/i.test(object.name))flank.muzzles.push(object);
   const match=/^Runtime.(recoil|flywheel|piston).([XYZ])/i.exec(object.name);
   if(match)flank.mechanisms.push({object,kind:match[1].toLowerCase(),axis:match[2].toLowerCase(),position:object.position.clone(),rotation:object.rotation.clone(),phase:0});
  });
  flank.muzzles.sort((a,b)=>(Number(/^Muzzle[ _]+(\d+)/i.exec(a.name)?.[1])||0)-(Number(/^Muzzle[ _]+(\d+)/i.exec(b.name)?.[1])||0));
  if(!flank.muzzles.length){const anchor=new THREE.Object3D();anchor.name='Muzzle fallback | '+flank.key;anchor.position.fromArray(BASE_MUZZLES[flank.key]||[1.1,.8,0]);weapon.add(anchor);flank.muzzles.push(anchor);}
 }
 hardpoints(index){
  if(this.playerHull&&typeof window.UBContent.weaponHardpoints==='function')return window.UBContent.weaponHardpoints(index,this.hull);
  return [{side:null,position:MOUNTS[index%MOUNTS.length],yaw:index===1?Math.PI/2:index===2?-Math.PI/2:index===3?Math.PI:0}];
 }
 ensureModule(key,index,animate,evolution=null){
  let entry=this.modules.get(key);
  if(!entry){entry=this.makeFlank(key,index);entry.flanks=[entry];this.modules.set(key,entry);}
  const mounts=this.hardpoints(index),paired=this.playerHull&&(index===1||index===2)&&mounts.length===2;
  while(entry.flanks.length>mounts.length)this.releaseFlank(entry.flanks.pop());
  while(entry.flanks.length<mounts.length)entry.flanks.push(this.makeFlank(key,index));
  for(let i=0;i<entry.flanks.length;i++){
   const flank=entry.flanks[i],mount=mounts[i],stamp=index+'|'+mount.side+'|'+mount.position.join(',')+'|'+mount.yaw;
   flank.index=index;flank.paired=paired;flank.side=mount.side??null;flank.socket.userData.flank=flank.side;
   if(flank.mountSignature!==stamp){flank.mountSignature=stamp;flank.socket.rotation.y=mount.yaw;flank.aim=0;if(flank.weapon)flank.weapon.rotation.y=0;this.dock(flank.socket,new THREE.Vector3(...mount.position),animate);}
   this.setWeapon(flank,evolution);
   // Reserve the full upgrade scale and maximum recoil, plus the collar/capacitor footprint.
   const radius=Math.max(this.modelRadius(flank.model,key)*1.12+.36,1.26);
   flank.socket.scale.setScalar(paired?Math.min(.68,1.12/radius):index>=4?.7:.83);
  }
  return entry;
 }
 sync(tier,keys,states=null,animate=false,showcase=false){
  const data=states||Object.fromEntries(keys.map((key,i)=>[key,{purchases:showcase&&tier>1?i<3?3:1:0,auto:0,ability:0,reload:0}]));
  const signature=tier+'|'+keys.map(key=>{const m=data[key]||{};return[key,m.purchases||0,m.auto||0,m.ability||0,m.reload||0,m.evolution||''].join(':');}).join('|');if(signature===this.signature)return;this.signature=signature;
  const desired=new Set(),add=(id,...args)=>{desired.add(id);return this.addPart(id,...args);};
  keys.forEach((key,index)=>{
   const m=data[key]||{},entry=this.ensureModule(key,index,animate,m.evolution||null),purchases=m.purchases||0;
   for(let i=0;i<entry.flanks.length;i++){
    const flank=entry.flanks[i],suffix=i?'-'+flank.side:'';
    flank.baseScale=1+Math.min(.12,(m.auto||0)*.006+(m.ability||0)*.003);flank.weapon.scale.setScalar(flank.baseScale);
    if(flank.paired&&index===1)add('side-platform-'+key+suffix,'growth-deck',[0,-.62,0],.65,0,animate,flank.socket);
    if(flank.paired&&index===2){
     // Fixed cantilevers join the stern deck; their size must not shrink with a long barrel.
     const mount=this.hardpoints(index).find(p=>p.side===flank.side).position,sign=Math.sign(mount[2]);
     add('aft-bridge-'+key+'-'+flank.side,'growth-deck',[mount[0],mount[1]-.944*.55,sign*(Math.abs(mount[2])-.42)],.55,Math.PI/2,animate);
     if(this.hull==='bastion')add('aft-pedestal-'+key+'-'+flank.side,'growth-engine',[mount[0],2.70,sign*(Math.abs(mount[2])-.20)],.7,0,animate);
    }
    if(this.playerHull&&purchases>=1)add('battery-'+key+suffix,'growth-battery',[0,-.22,0],.83,0,animate,flank.socket);
    if(this.playerHull&&(purchases>=3||(m.ability||0)>=4))add('capacitor-'+key+suffix,'growth-reactor',[-.67,.15,.48],.27,0,animate,flank.socket);
    if(m.evolution&&flank.model==='module-'+key){const id='evolved-'+key+suffix;desired.add(id);if(!this.parts.has(id)){const ring=new THREE.Mesh(new THREE.TorusGeometry(.86,.045,6,32),new THREE.MeshBasicMaterial({color:0xf2d590,transparent:true,opacity:.65,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=.12;ring.userData.growthPart=id;flank.socket.add(ring);this.parts.set(id,ring);}}
   }
  });
  if(this.playerHull){
   const slim=this.hull==='wraith',wide=this.hull==='bastion',side=slim?1.95:wide?2.4:2.18,partScale=slim?.8:1;
   if(tier>=2){for(const sign of [-1,1])add('gallery-'+sign,'growth-deck',[-.65,2.32,side*sign],partScale,0,animate);add('aft-engine','growth-engine',[-3.38,slim?.65:1.05,0],slim?.72:wide?1:.88,0,animate);}
   if(tier>=3){for(const sign of [-1,1])add('watchtower-'+sign,'growth-tower',[-1.65,3.05,side*sign],partScale*.84,0,animate);add('power-heart','growth-reactor',[-3.15,3.05,0],slim?.65:.8,0,animate);}
   if(tier>=4)add('citadel-crown',this.view.assets[CROWN_MODELS[this.hull]]?CROWN_MODELS[this.hull]:'growth-crown',[-1.1,4.38,0],slim?.73:wide?1.02:.9,0,animate);
  }
  for(const[id,part]of this.parts)if(!desired.has(id)){part.removeFromParent();this.view.release(part);this.parts.delete(id);}
  for(const[key,entry]of this.modules)if(!keys.includes(key)){for(const flank of entry.flanks)this.releaseFlank(flank);this.modules.delete(key);}
  this.animations=this.animations.filter(a=>a.object.parent);this.root.userData.assembly={tier,modules:this.modules.size,parts:this.parts.size};
 }
 shot(key,active=false,angle=null,side=null){
  const entry=this.modules.get(key);if(!entry)return null;
  const flank=side==null?entry:entry.flanks.find(f=>f.side===side);if(!flank)return null;
  flank.kick=Math.min(.36,Math.max(flank.kick,active?.3:.16));flank.recoil=1;flank.flash=.11;
  if(Number.isFinite(angle)){flank.aim=-angle-this.root.rotation.y-flank.socket.rotation.y;flank.weapon.rotation.y=flank.aim;}
  const point=new THREE.Vector3();flank.weapon.updateWorldMatrix(true,true);flank.muzzles[0].getWorldPosition(point);return point;
 }
 update(dt,player=null){
  this.clock+=dt;const reduced=this.view.reducedMotion;
  for(let i=this.animations.length-1;i>=0;i--){const a=this.animations[i];a.age+=dt;if(a.age<0&&!reduced)continue;const t=reduced?1:Math.min(1,a.age/a.duration);a.object.position.lerpVectors(a.start,a.target,eased(t));if(t===1){this.animations.splice(i,1);this.docked++;}}
  for(const entry of this.modules.values())for(const flank of entry.flanks){
   flank.recoil=Math.max(0,flank.recoil-dt*7);flank.flash=Math.max(0,flank.flash-dt);
   const kick=flank.kick*flank.recoil*(reduced?.25:1);flank.weapon.position.x=-Math.cos(flank.aim)*kick;flank.weapon.position.z=Math.sin(flank.aim)*kick;flank.weapon.rotation.z=flank.recoil*flank.kick*.13*(reduced?.25:1);flank.weapon.scale.setScalar(flank.baseScale);
   const powered=!this.view.game||this.view.game.state==='playing';
   for(const part of flank.mechanisms){
    if(part.kind==='flywheel'){if(powered&&!reduced)part.phase+=dt*(.75+flank.recoil*9);part.object.rotation[part.axis]=part.rotation[part.axis]+part.phase;}
    else part.object.position[part.axis]=part.position[part.axis]+(part.kind==='recoil'?-.2:.13)*flank.recoil*(reduced?.25:1);
   }
  }
  const driving=!player||this.view.game?.state==='playing',moving=player&&driving?Math.hypot(player.vx||0,player.vy||0)/Math.max(1,player.speed||150):player?0:.16,target=player?.boosting&&driving?1.7:Math.min(1,moving);
  this.thrust+=(target-this.thrust)*(1-Math.exp(-dt*10));
  for(const rotor of this.rotors)rotor.rotation.x+=dt*(reduced?1:2+this.thrust*22);
  for(const lamp of this.lamps){lamp.material.opacity=.18+Math.min(1,this.thrust)*.38;lamp.scale.setScalar(1.1+this.thrust*.65);}
  if(player){const turn=Number.isFinite(player.turnRate)?player.turnRate:this.lastAngle==null?0:Math.atan2(Math.sin(player.a-this.lastAngle),Math.cos(player.a-this.lastAngle))/Math.max(.001,dt);this.lastAngle=player.a;const desiredBank=reduced?0:bounded(turn*.055*Math.min(1,moving),-.13,.13),desiredPitch=reduced?0:-(player.boosting?.033:.008)*Math.min(1,moving);this.bank+=(desiredBank-this.bank)*(1-Math.exp(-dt*9));this.pitch+=(desiredPitch-this.pitch)*(1-Math.exp(-dt*8));this.body.rotation.x=this.bank;this.body.rotation.z=this.pitch;
   this.wakeAt-=dt;if(moving>.12&&this.wakeAt<=0){this.wakeAt=reduced?.2:player.boosting?.04:.1;this.root.updateWorldMatrix(true,false);for(const z of [-.8,.8]){const p=new THREE.Vector3(-4.7,.9,z);this.body.localToWorld(p);this.view.impactFX?.wake(p.x,p.z,player.a,this.thrust,player.vx*.1,player.vy*.1);}}
  }
 }
 get stats(){
  const entries=[...this.modules.values()],flanks=entries.flatMap(e=>e.flanks),evolved=entries.filter(entry=>entry.evolution&&entry.model!=='module-'+entry.key);
  return {parts:this.parts.size+evolved.length,partIds:[...this.parts.keys(),...evolved.map(entry=>'evolved-'+entry.key)],weaponModels:Object.fromEntries(entries.map(entry=>[entry.key,entry.model])),mechanisms:flanks.reduce((n,f)=>n+f.mechanisms.length,0),modules:this.modules.size,physicalGuns:flanks.length,
   banks:entries.map(e=>({key:e.key,index:e.index,flanks:e.flanks.map(f=>({side:f.side,model:f.model,position:f.socket.position.toArray(),scale:f.socket.scale.x,recoil:f.recoil,muzzles:f.muzzles.length}))})),
   docking:this.animations.length,docked:this.docked,bank:this.bank,pitch:this.pitch,thrust:this.thrust,recoil:flanks.reduce((n,f)=>Math.max(n,f.recoil),0),rotors:this.rotors.length};
 }
}
