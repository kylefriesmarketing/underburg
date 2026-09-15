import * as THREE from './assets/lib/three.module.js';

const S=.1,TAU=Math.PI*2;
const additive=map=>new THREE.MeshBasicMaterial({color:0xffffff,map,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});

/** Fixed instance buffers keep rapid fire, engine wakes and destruction allocation-free. */
export class ImpactFX{
 constructor(view){
  this.view=view;this.clock=0;this.budget=0;this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.pools={};this.emitted={debris:0,pressure:0,wake:0,flash:0};
  this.pool('debris',192,new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xffffff,metalness:.82,roughness:.33,emissive:0x513313,emissiveIntensity:.35}));
  this.pool('pressure',48,new THREE.RingGeometry(.92,1,40).rotateX(-Math.PI/2),additive());
  this.pool('wake',144,new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),additive(view.lightTexture));
  this.pool('flash',72,new THREE.PlaneGeometry(2,2),additive(view.lightTexture));
 }
 pool(kind,capacity,geometry,material){const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=kind==='debris'?0:4;this.view.scene.add(mesh);this.pools[kind]={mesh,cursor:0,items:Array.from({length:capacity},()=>({life:0,color:new THREE.Color()}))};}
 emit(kind,x,y,z,size,life,color,vx=0,vy=0,vz=0,angle=0){
  if(this.budget>=100)return;this.budget++;const pool=this.pools[kind],p=pool.items[pool.cursor++%pool.items.length];Object.assign(p,{x,y,z,size,life,max:life,vx,vy,vz,angle,spin:(Math.random()-.5)*8});p.color.setHex(color);this.emitted[kind]++;return p;
 }
 wake(x,z,a,thrust,vx=0,vz=0){this.emit('wake',x,2.1,z,.65+thrust*.62,.65,0x81ddce,-vx*.06,0,-vz*.06,-a);}
 muzzle(point,key,active){if(!point)return;const color=['arc','rail','sonic','cryo'].includes(key)?0xaffff0:key==='flame'?0xff984e:0xffdc90;this.emit('flash',point.x,point.y,point.z,active?2.4:1.45,.13,color);if(active)this.emit('pressure',point.x,point.y-.4,point.z,2,.2,color);}
 burst(x,y,size=25,count=8,color=0xe0b86c){
  const n=this.view.reducedMotion?Math.min(4,count):count;
  for(let i=0;i<n;i++){const a=Math.random()*TAU,speed=2+Math.random()*Math.min(12,size*.2),life=.35+Math.random()*.6;this.emit('debris',x*S,3.5,y*S,.08+Math.random()*.19,life,color,Math.cos(a)*speed,2+Math.random()*7,Math.sin(a)*speed,a);}
 }
 pressure(x,y,r,color=0xffd594,life=.5){this.emit('pressure',x*S,2.7,y*S,r*S,life,color);}
 event(e,game){
  if(e.type==='damage'){this.burst(e.x,e.y,15,e.crit?5:2,e.family==='electric'?0xa0eced:0xd4b985);if(e.crit)this.emit('flash',e.x*S,4,e.y*S,1.8,.14,0xffecc7);}
  if(e.type==='explode'){this.burst(e.x,e.y,e.size,e.boss?30:e.elite?18:10);this.pressure(e.x,e.y,e.size*1.7,0xffce84,e.boss?.95:.55);this.emit('flash',e.x*S,4,e.y*S,e.size*.17,.43,0xffc383);}
  if(e.type==='ram'){this.burst(e.x,e.y,45,17,0xffdfac);this.pressure(e.x,e.y,Math.min(140,45+e.impulse*.2),0xc5ffed,.38);this.emit('flash',e.x*S,4,e.y*S,5,.19,0xffead0);}
  if(e.type==='hit'&&game){this.burst(game.p.x,game.p.y,20,5,0x99d5d1);}
  if(e.type==='bossStrike'&&e.pattern==='fan'){this.pressure(e.x,e.y,50,0xffd19b,.3);}
  if(e.type==='bossStrike'&&e.pattern!=='fan'){this.burst(e.x,e.y,e.r||100,20,0xffa77c);this.pressure(e.x,e.y,e.r||100,0xff9f74,.65);this.emit('flash',e.x*S,3.8,e.y*S,10,.4,0xffb475);}
  if(e.type==='bossExposed'||e.type==='bossInterrupted'){this.pressure(e.x,e.y,130,0xb5ffe2,.55);this.emit('flash',e.x*S,5,e.y*S,5,.3,0xb5ffe2);}
 }
 clear(){for(const pool of Object.values(this.pools)){for(const p of pool.items)p.life=0;pool.mesh.count=0;pool.cursor=0;}this.budget=0;}
 update(dt,camera){
  this.clock+=dt;this.budget=0;
  for(const[kind,pool]of Object.entries(this.pools)){let count=0;
   for(const p of pool.items){if(p.life<=0)continue;p.life-=dt;if(p.life<=0)continue;const age=1-p.life/p.max,fade=1-age;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(kind==='debris'){p.vy-=dt*9;p.vx*=Math.exp(-dt*2);p.vz*=Math.exp(-dt*2);}
    this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(0,0,0);
    if(kind==='flash'){this.dummy.quaternion.copy(camera.quaternion);this.dummy.scale.setScalar(p.size*(1+age*.6));}
    else if(kind==='pressure'){this.dummy.scale.set(p.size*(.22+age*.78),1,p.size*(.22+age*.78));}
    else if(kind==='wake'){this.dummy.rotation.y=p.angle;this.dummy.scale.set(p.size*(1+age*2),1,p.size*(.4+age*.85));}
    else{this.dummy.rotation.set(age*p.spin,p.angle+age*p.spin,age*p.spin*.6);this.dummy.scale.set(p.size*fade,p.size*.45*fade,p.size*.65*fade);}
    this.dummy.updateMatrix();pool.mesh.setMatrixAt(count,this.dummy.matrix);this.color.copy(p.color).multiplyScalar(kind==='debris'?.45+fade*.55:fade*fade);pool.mesh.setColorAt(count,this.color);count++;
   }
   pool.mesh.count=count;pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
  }
 }
 get stats(){return{active:Object.fromEntries(Object.entries(this.pools).map(([k,p])=>[k,p.mesh.count])),capacity:Object.fromEntries(Object.entries(this.pools).map(([k,p])=>[k,p.items.length])),emitted:{...this.emitted}};}
}
