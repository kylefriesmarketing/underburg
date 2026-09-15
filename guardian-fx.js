import * as THREE from './assets/lib/three.module.js';

const S=.1,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ROLES={
 vanguard:{hull:'enemy-bellwarden',modules:['flak','armor','mortar'],paint:[0x315963,0xd7b779,0xffd69a],model:'guardian-bell-armor',light:0xffb75e,char:0x163439,sites:[[-1.5,2.32,-2.04],[-1.5,2.32,2.04]],scale:.78,roll:.22},
 hunter:{hull:'enemy-jagddom',modules:['rail','harpoon','sonic'],paint:[0x383058,0xbcb0e0,0xc5d6ff],model:'guardian-lance-fin',light:0xafa2ff,char:0x20233e,sites:[[-1.25,1.5,-2.12],[-1.25,1.5,2.12]],scale:.87,roll:-.37},
 sovereign:{hull:'enemy-kaiserburg',modules:['torpedo','flak','mortar','arc'],paint:[0x652e38,0xe7be67,0xff9c7d],model:'guardian-crown-armor',light:0xff8160,char:0x372028,sites:[[-1.55,2.75,-3.08],[-1.55,2.75,3.08],[1.52,2.75,-3.08],[1.52,2.75,3.08]],scale:.84,roll:.3}
};
const damageStage=ratio=>ratio<=.15?3:ratio<=.35?2:ratio<=.65?1:0;

/** Live damage follows HP; collapse owns visuals only and never retains a simulated enemy. */
export class GuardianFX{
 constructor(view){this.view=view;this.live=new Map();this.collapses=[];this.clock=0;this.defeats=0;this.released=0;this.buckles=0;this.tempColor=new THREE.Color();}
 cue(type,record,stage){this.view.guardianCue({type,id:record.id,role:record.role,stage,x:record.x,y:record.y});}
 ownMaterials(root,role){
  const cache=new Map(),entries=[],owned=[];root.traverse(o=>{
   if(!o.material)return;const original=Array.isArray(o.material)?o.material:[o.material];
   const materials=original.map(m=>{if(cache.has(m))return cache.get(m);let c=m;
    if(o.isMesh&&!m.userData?.ownedTexture){if(!o.userData.sharedAsset)owned.push(m);c=m.clone();c.userData={...c.userData,ownedTexture:false};owned.push(c);}
    cache.set(m,c);const name=m.name||'',lamp=/Lamp|glass|pearl/i.test(name),paint=/Paint|Ceramic/i.test(name),entry={material:c,color:c.color?.clone(),emissive:c.emissive?.clone(),light:c.emissiveIntensity||0,roughness:c.roughness,opacity:c.opacity,lamp,paint};
    if(lamp&&c.emissive){c.emissive.setHex(ROLES[role].light);entry.emissive=c.emissive.clone();}
    entries.push(entry);return c;});o.material=Array.isArray(o.material)?materials:materials[0];
  });root.userData.ownedGuardian=owned;return entries;
 }
 attach(enemy,root){
  if(this.live.has(enemy.id))return this.live.get(enemy.id);const role=ROLES[enemy.bossRole]?enemy.bossRole:ROLES[root.userData.bossRole]?root.userData.bossRole:'sovereign',profile=ROLES[role]||ROLES.sovereign,body=root.children.find(o=>o.userData.shipBody)||root,plates=[];
  for(let i=0;i<profile.sites.length;i++){const at=profile.sites[i],mount=new THREE.Group(),model=this.view.clone(profile.model,true);model.scale.setScalar(profile.scale);model.rotation.y=at[2]<0?Math.PI:0;mount.add(model);mount.position.set(...at);mount.userData.guardianArmor=profile.model;body.add(mount);plates.push({mount,rest:new THREE.Vector3(...at),side:Math.sign(at[2]),index:i});}
  const record={id:enemy.id,root,body,role,profile,plates,materials:this.ownMaterials(root,role),stage:damageStage(enemy.hp/Math.max(1,enemy.max)),ratio:enemy.hp/Math.max(1,enemy.max),smooth:1,clock:0,x:enemy.x,y:enemy.y};record.smooth=record.ratio;root.userData.guardianRole=role;this.live.set(enemy.id,record);return record;
 }
 forget(id){this.live.delete(id);}
 event(e){
  if(e.type!=='explode'||!e.boss)return;let root=this.view.entities.get(e.id);if(!root){const role=ROLES[e.bossRole]?e.bossRole:'sovereign',p=ROLES[role];root=this.view.createShip(p.hull,p.modules,1,false,{paint:{id:'guardian-'+role,hull:p.paint[0],accent:p.paint[1],light:p.paint[2]}});root.userData.bossRole=role;root.userData.renderModel=p.hull;const bounds=this.view.assetSizes[p.hull],width=Math.max(bounds?.x||10,bounds?.z||5);root.scale.setScalar(Math.max(8,e.size||95)*S*2/width);this.view.scene.add(root);}root.position.set(e.x*S,2,e.y*S);root.rotation.y=-(e.a||0);const enemy=this.view.game?.enemies.find(v=>v.id===e.id)||{id:e.id,hp:0,max:1,bossRole:e.bossRole,x:e.x,y:e.y},record=this.live.get(e.id)||this.attach(enemy,root);
  this.live.delete(e.id);this.view.entities.delete(e.id);this.defeats++;record.x=e.x;record.y=e.y;
  const group=new THREE.Group();group.userData.guardianCollapse=true;this.view.scene.add(group);group.attach(root);root.visible=true;
  const collapsed={...record,group,age:0,duration:this.view.reducedMotion?.65:2.25,base:root.position.clone(),rotation:root.rotation.clone(),fragments:[],buckled:false,sinking:false};this.collapses.push(collapsed);
  if(this.collapses.length>4)this.releaseCollapse(this.collapses.shift());
 }
 releaseCollapse(c){c.group.removeFromParent();this.view.release(c.group);this.released++;}
 clear(){this.live.clear();for(const c of this.collapses)this.releaseCollapse(c);this.collapses=[];}
 update(dt,game){
  this.clock+=dt;const reduced=this.view.reducedMotion;
  for(const enemy of game?.enemies||[]){if(enemy.kind!=='boss'||enemy.hp<=0)continue;const root=this.view.entities.get(enemy.id);if(!root)continue;const record=this.live.get(enemy.id)||this.attach(enemy,root),ratio=clamp(enemy.hp/Math.max(1,enemy.max)),stage=damageStage(ratio),profile=record.profile;
   if(stage>record.stage){this.buckles++;this.cue('guardianBuckling',record,stage);if(root.visible)this.view.impactFX.burst(enemy.x,enemy.y,30,reduced?2:5,profile.light);}record.stage=stage;record.ratio=ratio;record.smooth+=(ratio-record.smooth)*(1-Math.exp(-dt*9));record.x=enemy.x;record.y=enemy.y;record.clock+=dt;
   const wear=1-record.smooth,warning=enemy.bossState==='windup',attacking=enemy.bossState==='attack',open=enemy.exposed>0,activity=warning?.65:attacking?1:open?.9:.15;
   for(const m of record.materials){const material=m.material;
    if(m.color){material.color.copy(m.color);if(m.paint)material.color.lerp(this.tempColor.setHex(profile.char),wear*.78);else if(!m.lamp)material.color.multiplyScalar(1-wear*.37);}
    if(Number.isFinite(m.roughness))material.roughness=Math.min(.94,m.roughness+wear*.36);
    if(m.emissive){material.emissive.copy(m.emissive);if(m.lamp){material.emissive.setHex(open?0xa8ffd7:profile.light);material.emissiveIntensity=.65+activity*.7+wear*.5+(reduced?0:Math.sin(this.clock*3+record.id)*.07);}else material.emissiveIntensity=m.light;}
   }
   for(const plate of record.plates){const {mount,rest,side,index}=plate;mount.position.copy(rest);const idle=reduced?0:Math.sin(record.clock*(record.role==='hunter'?3:1.5)+index)*.025;
    if(record.role==='vanguard'){mount.rotation.x=side*(idle+wear*.3+(open?.35:warning?.12:0));mount.position.y+=open?.15:0;}
    else if(record.role==='hunter'){mount.rotation.x=side*(.06+(warning||attacking?.48:open?.26:0)+wear*.24+idle);mount.position.x-=attacking?.15:0;}
    else{mount.rotation.x=side*(wear*.22+(open?.48:warning?.2:.03)+idle);mount.position.y+=(open?.32:warning?.12:0)+wear*.12;}
   }
   root.rotation.z=reduced?0:stage>=2?Math.sin(record.id)*.018*stage:0;
  }
  for(let i=this.collapses.length-1;i>=0;i--){const c=this.collapses[i];c.age+=dt;const t=c.age,quiet=reduced||c.duration<1;if(reduced)c.duration=Math.min(c.duration,.65);
   if(!quiet&&!c.buckled&&t>=.35){c.buckled=true;this.cue('guardianBuckling',c,4);c.group.updateWorldMatrix(true,true);
    for(const plate of c.plates){c.group.attach(plate.mount);const p=plate.mount.position.clone(),dx=p.x-c.base.x,dz=p.z-c.base.z,length=Math.hypot(dx,dz)||1;c.fragments.push({object:plate.mount,start:p,velocity:new THREE.Vector3(dx/length*4,3+plate.index*.45,dz/length*4),rotation:plate.mount.rotation.clone(),spin:plate.side*(.55+plate.index*.1)});}
    this.view.impactFX.pressure(c.x,c.y,80,c.profile.light,.7);
   }
   if(!c.sinking&&t>=(quiet?.15:.9)){c.sinking=true;this.cue('guardianSinking',c,5);this.view.impactFX.pressure(c.x,c.y,110,c.profile.light,quiet?.25:.7);}
   const sink=quiet?clamp(t/c.duration):clamp((t-.65)/1.6);c.root.position.y=c.base.y-(quiet?1.6:18)*sink*sink;
   c.root.rotation.copy(c.rotation);if(!quiet){c.root.rotation.x+=c.profile.roll*sink;c.root.rotation.z+=(c.role==='hunter'?-.4:.24)*sink;}
   const fade=quiet?1-clamp(t/c.duration):1-clamp((t-1.4)/.8);for(const m of c.materials){if(!m.material.transparent){m.material.transparent=true;m.material.needsUpdate=true;}m.material.opacity=m.opacity*fade;if(m.material.emissive)m.material.emissiveIntensity=m.light*(1-sink);}
   for(const f of c.fragments){const age=t-.35;f.object.position.copy(f.start).addScaledVector(f.velocity,age);f.object.position.y-=4.5*age*age;f.object.rotation.set(f.rotation.x+f.spin*age,f.rotation.y+f.spin*.6*age,f.rotation.z+f.spin*.4*age);}
   if(t>=c.duration){this.releaseCollapse(c);this.collapses.splice(i,1);}
  }
 }
 get stats(){return{live:[...this.live.values()].map(r=>({id:r.id,role:r.role,stage:r.stage,hpRatio:r.ratio,armor:r.plates.length,ownedMaterials:r.root.userData.ownedGuardian.length,hinges:r.plates.map(p=>p.mount.rotation.x)})),collapses:this.collapses.map(c=>({id:c.id,role:c.role,age:c.age,stage:c.sinking?'sinking':c.buckled?'buckled':'impact',fragments:c.fragments.length,y:c.root.position.y,sourceUuid:c.root.uuid})),defeats:this.defeats,released:this.released,buckles:this.buckles};}
}
