import * as THREE from './assets/lib/three.module.js';

const S=.1,TAU=Math.PI*2;
const AFTERMATH=new Set(['silt','bubble','spark']);
const ROLE_LIGHT={vanguard:0xffbc7c,hunter:0xa9ceff,sovereign:0xffa087};
const qualityOf=view=>(typeof view.graphics==='string'?view.graphics:(view.graphics?.effectiveQuality||view.graphics?.quality))==='low'?'low':'high';
// Per-instance alpha prevents fading normal-blended silt into opaque dark discs.
function softMaterial(map,opacity,blend=THREE.NormalBlending){
 const material=new THREE.MeshBasicMaterial({color:0xffffff,map,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:blend});
 material.onBeforeCompile=shader=>{shader.vertexShader='attribute float aftermathOpacity;varying float vAftermathOpacity;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vAftermathOpacity=aftermathOpacity;\n#include <begin_vertex>');shader.fragmentShader='varying float vAftermathOpacity;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vAftermathOpacity;');};
 material.customProgramCacheKey=()=> 'underburg-aftermath-alpha-v1';return material;
}
const additive=map=>new THREE.MeshBasicMaterial({color:0xffffff,map:map||null,transparent:true,opacity:.85,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});

/** Fixed instance buffers keep rapid fire, engine wakes and destruction allocation-free. */
export class ImpactFX{
 constructor(view){
  this.view=view;this.clock=0;this.budget=0;this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.pools={};this.emitted={debris:0,pressure:0,wake:0,flash:0,silt:0,bubble:0,spark:0};this.aftermathBudget=0;this.guardianCues=0;
  this.pool('debris',192,new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:0xffffff,metalness:.82,roughness:.33,emissive:0x513313,emissiveIntensity:.35}));
  this.pool('pressure',48,new THREE.RingGeometry(.92,1,40).rotateX(-Math.PI/2),additive());
  this.pool('wake',144,new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),additive(view.lightTexture));
  this.pool('flash',72,new THREE.PlaneGeometry(2,2),additive(view.lightTexture));
  this.pool('silt',64,new THREE.PlaneGeometry(2,2),softMaterial(view.lightTexture,.18));
  this.pool('bubble',128,new THREE.RingGeometry(.78,1,12),softMaterial(null,.40,THREE.AdditiveBlending));
  this.pool('spark',128,new THREE.PlaneGeometry(2,2),softMaterial(view.lightTexture,.64,THREE.AdditiveBlending));
 }
 pool(kind,capacity,geometry,material){if(AFTERMATH.has(kind))geometry.setAttribute('aftermathOpacity',new THREE.InstancedBufferAttribute(new Float32Array(capacity),1).setUsage(THREE.DynamicDrawUsage));const mesh=new THREE.InstancedMesh(geometry,material,capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.frustumCulled=false;mesh.name='impact-pool-'+kind;mesh.renderOrder=kind==='debris'?0:kind==='silt'?1:4;this.view.scene.add(mesh);this.pools[kind]={mesh,cursor:0,items:Array.from({length:capacity},()=>({life:0,color:new THREE.Color()}))};}
 emit(kind,x,y,z,size,life,color,vx=0,vy=0,vz=0,angle=0){
  if(!this.pools[kind]||![x,y,z,size,life,vx,vy,vz].every(Number.isFinite)||life<=0||size<=0||this.budget>=100)return;const aftermath=AFTERMATH.has(kind);if(aftermath&&this.aftermathBudget>=40)return;this.budget++;if(aftermath)this.aftermathBudget++;const pool=this.pools[kind],p=pool.items[pool.cursor++%pool.items.length];Object.assign(p,{x,y,z,size,life,max:life,vx,vy,vz,angle,spin:(Math.random()-.5)*8,phase:Math.random()*TAU});p.color.setHex(color);this.emitted[kind]++;return p;
 }
 wake(x,z,a,thrust,vx=0,vz=0){this.emit('wake',x,2.1,z,.65+thrust*.62,.65,0x81ddce,-vx*.06,0,-vz*.06,-a);}
 muzzle(point,key,active){if(!point)return;const color=['arc','rail','sonic','cryo'].includes(key)?0xaffff0:key==='flame'?0xff984e:0xffdc90;this.emit('flash',point.x,point.y,point.z,active?2.4:1.45,.13,color);if(active)this.emit('pressure',point.x,point.y-.4,point.z,2,.2,color);}
 burst(x,y,size=25,count=8,color=0xe0b86c){
  const n=this.view.reducedMotion?Math.min(4,count):count;
  for(let i=0;i<n;i++){const a=Math.random()*TAU,speed=2+Math.random()*Math.min(12,size*.2),life=.35+Math.random()*.6;this.emit('debris',x*S,3.5,y*S,.08+Math.random()*.19,life,color,Math.cos(a)*speed,2+Math.random()*7,Math.sin(a)*speed,a);}
 }
 pressure(x,y,r,color=0xffd594,life=.5){this.emit('pressure',x*S,2.7,y*S,r*S,life,color);}
 // Only presentation values are sampled here; no simulation RNG or gameplay changes.
 aftermath(x,y,size=60,kind='blast',light=0xffc188){
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(size))return;
  const reduced=this.view.reducedMotion,low=qualityOf(this.view)==='low',factor=reduced?.24:low?.45:1;
  const strength=Math.max(.4,Math.min(1.8,size/85)),r=Math.max(1.5,Math.min(8,size*S)),sinking=kind==='sinking';
  const siltCount=Math.max(1,Math.round((sinking?4:kind==='buckling'?1:3)*factor));
  const siltColor=this.view.game?.stage===2?0x4c6477:this.view.game?.stage===1?0x677168:0x62877b;
  for(let i=0;i<siltCount;i++){const a=i*TAU/siltCount+Math.random()*.7,spread=r*(sinking?.42:.28);this.emit('silt',x*S+Math.cos(a)*spread,sinking?-1.2:1.3,y*S+Math.sin(a)*spread,Math.min(5.5,r*.58)*(reduced?.68:1),reduced?.65:1.5+strength*.6,siltColor,Math.cos(a)*(reduced?.15:.7),reduced?.15:sinking?.9:.5,Math.sin(a)*(reduced?.15:.7),a);}
  const bubbles=Math.max(1,Math.round((sinking?15:kind==='buckling'?4:9)*factor));
  for(let i=0;i<bubbles;i++){const a=Math.random()*TAU,spread=Math.random()*r*.65;this.emit('bubble',x*S+Math.cos(a)*spread,sinking?-1:2,y*S+Math.sin(a)*spread,.11+Math.random()*.24,reduced?.6:1.1+Math.random()*1.15,0x9adfdc,Math.cos(a)*(reduced?.2:.65),reduced?.8:2.3+Math.random()*2.2,Math.sin(a)*(reduced?.2:.65),a);}
  if(sinking)return;
  const sparks=Math.max(1,Math.round((kind==='buckling'?5:11)*factor));
  for(let i=0;i<sparks;i++){const a=Math.random()*TAU,speed=(reduced?.5:1.4)+Math.random()*2.2;this.emit('spark',x*S,2.8,y*S,.12+Math.random()*.17,reduced?.36:.6+Math.random()*.8,i%3===0?0x9ce7eb:light,Math.cos(a)*speed,reduced?.2:.5+Math.random()*1.6,Math.sin(a)*speed,a);}
 }
 guardianCue(e){
  if(!e||!['guardianBuckling','guardianSinking'].includes(e.type)||!Number.isFinite(e.x)||!Number.isFinite(e.y))return;
  this.guardianCues++;const sinking=e.type==='guardianSinking',light=ROLE_LIGHT[e.role]||0xffbd89;
  this.aftermath(e.x,e.y,sinking?125:e.stage>=4?105:45,sinking?'sinking':e.stage>=4?'blast':'buckling',light);
 }
 event(e,game){
  if(e.type==='damage'){this.burst(e.x,e.y,15,e.crit?5:2,e.family==='electric'?0xa0eced:0xd4b985);if(e.crit)this.emit('flash',e.x*S,4,e.y*S,1.8,.14,0xffecc7);}
  if(e.type==='explode'&&(e.boss||e.elite||e.size>=38))this.aftermath(e.x,e.y,e.size,'blast',e.boss?ROLE_LIGHT[e.bossRole]||0xffbf8c:0xffc188);
  if(e.type==='explode'){this.burst(e.x,e.y,e.size,e.boss?10:e.elite?18:10);this.pressure(e.x,e.y,e.size*1.7,0xffce84,e.boss?.95:.55);this.emit('flash',e.x*S,4,e.y*S,e.size*.17,.43,0xffc383);}
  if(e.type==='ram'){this.aftermath(e.x,e.y,Math.min(105,45+(e.impulse||0)*.1),'ram',0xffd3a0);this.burst(e.x,e.y,45,17,0xffdfac);this.pressure(e.x,e.y,Math.min(140,45+e.impulse*.2),0xc5ffed,.38);this.emit('flash',e.x*S,4,e.y*S,5,.19,0xffead0);}
  if(e.type==='hit'&&game){this.burst(game.p.x,game.p.y,20,5,0x99d5d1);}
  if(e.type==='bossStrike'&&e.pattern==='fan'){this.pressure(e.x,e.y,50,0xffd19b,.3);}
  if(e.type==='bossStrike'&&e.pattern!=='fan'){this.aftermath(e.x,e.y,e.r||90,'blast',0xffb694);this.burst(e.x,e.y,e.r||100,20,0xffa77c);this.pressure(e.x,e.y,e.r||100,0xff9f74,.65);this.emit('flash',e.x*S,3.8,e.y*S,10,.4,0xffb475);}
  if(e.type==='bossExposed'||e.type==='bossInterrupted'){this.pressure(e.x,e.y,130,0xb5ffe2,.55);this.emit('flash',e.x*S,5,e.y*S,5,.3,0xb5ffe2);}
 }
 clear(){for(const pool of Object.values(this.pools)){for(const p of pool.items)p.life=0;pool.mesh.count=0;pool.cursor=0;}this.budget=0;this.aftermathBudget=0;}
 update(dt,camera){
  dt=Number.isFinite(dt)?Math.max(0,dt):0;this.clock+=dt;this.budget=0;this.aftermathBudget=0;
  for(const[kind,pool]of Object.entries(this.pools)){let count=0;
   for(const p of pool.items){if(p.life<=0)continue;p.life-=dt;if(p.life<=0)continue;const age=1-p.life/p.max,fade=1-age;if(AFTERMATH.has(kind)&&!this.view.reducedMotion){p.vx+=Math.sin(this.clock*.8+p.phase)*dt*.13;p.vz+=Math.cos(this.clock*.6+p.phase)*dt*.13;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
    if(kind==='spark'){p.vx*=Math.exp(-dt*1.5);p.vz*=Math.exp(-dt*1.5);p.vy*=Math.exp(-dt*.6);}
    if(kind==='debris'){p.vy-=dt*9;p.vx*=Math.exp(-dt*2);p.vz*=Math.exp(-dt*2);}
    this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(0,0,0);
    if(AFTERMATH.has(kind)){this.dummy.quaternion.copy(camera.quaternion);this.dummy.rotateZ(p.angle+age*p.spin*(this.view.reducedMotion?0:.06));const scale=kind==='silt'?p.size*(.55+age*.95):kind==='bubble'?p.size*(.7+age*.7):p.size*(.6+fade*.4);this.dummy.scale.set(scale,scale*(kind==='silt'?.66:kind==='spark'?1.65:1),scale);pool.mesh.geometry.attributes.aftermathOpacity.setX(count,kind==='silt'?Math.sin(Math.PI*age)*fade:Math.min(1,age*9)*fade*fade);}
    else if(kind==='flash'){this.dummy.quaternion.copy(camera.quaternion);this.dummy.scale.setScalar(p.size*(1+age*.6));}
    else if(kind==='pressure'){this.dummy.scale.set(p.size*(.22+age*.78),1,p.size*(.22+age*.78));}
    else if(kind==='wake'){this.dummy.rotation.y=p.angle;this.dummy.scale.set(p.size*(1+age*2),1,p.size*(.4+age*.85));}
    else{this.dummy.rotation.set(age*p.spin,p.angle+age*p.spin,age*p.spin*.6);this.dummy.scale.set(p.size*fade,p.size*.45*fade,p.size*.65*fade);}
    this.dummy.updateMatrix();pool.mesh.setMatrixAt(count,this.dummy.matrix);this.color.copy(p.color).multiplyScalar(AFTERMATH.has(kind)?1:kind==='debris'?.45+fade*.55:fade*fade);pool.mesh.setColorAt(count,this.color);count++;
   }
   pool.mesh.count=count;if(AFTERMATH.has(kind))pool.mesh.geometry.attributes.aftermathOpacity.needsUpdate=true;pool.mesh.instanceMatrix.needsUpdate=true;if(pool.mesh.instanceColor)pool.mesh.instanceColor.needsUpdate=true;
  }
 }
 get stats(){return{active:Object.fromEntries(Object.entries(this.pools).map(([k,p])=>[k,p.mesh.count])),capacity:Object.fromEntries(Object.entries(this.pools).map(([k,p])=>[k,p.items.length])),emitted:{...this.emitted},aftermath:{active:[...AFTERMATH].reduce((n,k)=>n+this.pools[k].mesh.count,0),capacity:320,pools:3,quality:qualityOf(this.view),reducedMotion:!!this.view.reducedMotion,guardianCues:this.guardianCues}};}
}
