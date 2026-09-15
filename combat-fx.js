import * as THREE from './assets/lib/three.module.js';
const S=.1;
const material=(color,opacity=.5)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
/** Persistent telegraphs read the same fields and timers that drive combat. */
export class CombatFX{
 constructor(view){this.view=view;this.objects=new Map();this.clock=0;}
 clear(){for(const o of this.objects.values())this.view.release(o);this.objects.clear();}
 make(kind){
  if(kind==='vortex')return new THREE.Mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},opacity:{value:.6}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float time;uniform float opacity;void main(){vec2 p=vUv*2.-1.;float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x);float wave=pow(.5+.5*sin(a*5.+r*24.-time*5.),5.);float rim=smoothstep(.87,.95,r)*(1.-smoothstep(.96,1.,r));vec3 color=mix(vec3(.4,.2,1.),vec3(.35,1.,.9),r);gl_FragColor=vec4(color,(wave*.25*(1.-r)+rim*.5)*opacity);}'}));
  if(['rail','sniper','tether'].includes(kind))return new THREE.Mesh(new THREE.BoxGeometry(1,.05,1),material(kind==='rail'?0x8bf5fc:kind==='tether'?0xda7bea:0xff7255,.4));
  return new THREE.Mesh(new THREE.RingGeometry(kind==='mine'?.79:.94,1,64).rotateX(-Math.PI/2),material(kind==='mine'?0xff7752:kind==='burn'?0xffa34f:0x92eefa,.55));
 }
 update(dt,game){this.clock+=dt;const live=new Set();
  const add=(id,kind,data)=>{live.add(id);let o=this.objects.get(id);if(!o){o=this.make(kind);o.userData.kind=kind;this.view.scene.add(o);this.objects.set(id,o);}o.visible=Math.hypot(data.x-game.p.x,data.y-game.p.y)<1600;o.position.set(data.x*S,2.5,data.y*S);return o;};
  const beam=(o,x,y,a,length,width)=>{o.position.set((x+Math.cos(a)*length*.5)*S,3.3,(y+Math.sin(a)*length*.5)*S);o.rotation.y=-a;o.scale.set(length*S,1,Math.max(.1,width*S));};
  for(const f of game.fields||[]){if(!['vortex','rail','sonic'].includes(f.kind))continue;const o=add('field-'+f.id,f.kind,f);
   if(f.kind==='rail'){beam(o,f.x,f.y,f.a,f.length,f.width);o.material.opacity=.16+.42*(1-Math.max(0,f.charge)/Math.max(.01,f.maxCharge));}
   else {o.scale.setScalar(Math.max(.01,f.r*S));if(f.kind==='vortex'){o.material.uniforms.time.value=this.clock;o.material.uniforms.opacity.value=Math.min(1,f.life/.6);}else o.material.opacity=Math.min(.85,f.life*2);}
  }
  for(const m of game.mines||[]){if(!m.enemy)continue;const o=add('mine-'+m.id,'mine',m);o.scale.setScalar((m.r||90)*S);o.material.opacity=m.age<(m.arm||1.3)?.14+.16*Math.sin(this.clock*10):.45+.18*Math.sin(this.clock*5);}
  for(const e of game.enemies||[]){if(e.aim>0){const o=add('aim-'+e.id,'sniper',e);beam(o,e.x,e.y,e.aimA||0,e.aimRange||900,7);o.material.opacity=.35+.35*Math.sin(this.clock*12)**2;}
   if(e.latched){const o=add('leech-'+e.id,'tether',e),dx=game.p.x-e.x,dy=game.p.y-e.y;beam(o,e.x,e.y,Math.atan2(dy,dx),Math.hypot(dx,dy),10);o.material.opacity=.65;}
   if(e.burn>0){const o=add('burn-'+e.id,'burn',e);o.scale.setScalar((e.r+12)*S);o.position.y=2.8;o.material.opacity=.32+.15*Math.sin(this.clock*7);}
  }
  for(const[id,o]of this.objects)if(!live.has(id)){this.view.release(o);this.objects.delete(id);}
 }
 event(e){const v=this.view;
  if(e.type==='railFire'){const a=Math.atan2(e.ty-e.y,e.tx-e.x),length=Math.hypot(e.tx-e.x,e.ty-e.y),o=this.make('rail');o.position.set((e.x+e.tx)*S*.5,3.8,(e.y+e.ty)*S*.5);o.rotation.y=-a;o.scale.set(length*S,1,Math.max(.22,(e.width||8)*S));o.material.color.setHex(e.enemy?0xff8169:0xc7fbff);v.scene.add(o);v.fx.push({obj:o,life:.32,max:.32,type:'line'});v.addSprite(e.x,e.y,7,0xa8edff,.3);v.shake=.22;}
  if(e.type==='flame'){for(let i=0;i<9;i++){const t=(i+1)/9,a=e.a+(Math.random()-.5)*(e.cone||.7),r=(e.r||280)*t;v.addSprite(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,1.2+t*3.6,i%2?0xff7b42:0xffd485,.35+Math.random()*.2,.5);} }
  if(e.type==='vortex'){v.ring(e.x,e.y,e.r,0xc39bff,.7);v.addSprite(e.x,e.y,9,0x8271e9,.7);}
  if(e.type==='sonic'){v.ring(e.x,e.y,e.r||220,0xb7f5ff,.8);v.addSprite(e.x,e.y,4,0xb8faff,.3);}
  if(e.type==='enemyTelegraph'&&e.kind==='carrier')v.ring(e.x,e.y,e.r||110,0xffbd68,e.duration||1.3);
  if(e.type==='enemyAction'){v.addSprite(e.x,e.y,4,e.kind==='leech'?0xd78cf4:0xff8563,.5);if(e.kind==='sniper'&&Number.isFinite(e.tx))this.event({...e,type:'railFire',width:7,enemy:true});}
  if(e.type==='rarity'&&e.rarity==='universe'){v.ring(e.x||0,e.y||0,420,0xec96ff,1.8);v.ring(e.x||0,e.y||0,270,0x99faff,1.3);}
 }
}
