import * as THREE from './assets/lib/three.module.js';
const S=.1;
const material=(color,opacity=.5)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
/** Persistent telegraphs read the same fields and timers that drive combat. */
export class CombatFX{
 constructor(view){this.view=view;this.objects=new Map();this.clock=0;}
 clear(){for(const o of this.objects.values())this.view.release(o);this.objects.clear();}
 make(kind){
  if(kind==='boss-fan')return new THREE.Mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{halfArc:{value:.7},progress:{value:0},attackGlow:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float halfArc;uniform float progress;uniform float attackGlow;void main(){vec2 p=vec2(vUv.x*2.-1.,1.-vUv.y*2.);float r=length(p);float a=abs(atan(p.y,p.x));if(r>1.||a>halfArc)discard;float edge=max(smoothstep(.973,.992,r),smoothstep(halfArc-.018,halfArc,a));float sweep=1.-smoothstep(.005,.035,abs(r-progress));float ribs=pow(.5+.5*cos(a*25.),20.);float opacity=.065+edge*.6+sweep*.28+ribs*.035;gl_FragColor=vec4(mix(vec3(1.,.32,.16),vec3(1.,.68,.31),attackGlow),opacity);}' }));
  if(kind==='boss-lance'){const group=new THREE.Group(),floor=new THREE.Mesh(new THREE.BoxGeometry(1,.02,1),material(0xff735b,.16));group.add(floor);for(const z of [-.5,.5]){const edge=new THREE.Mesh(new THREE.BoxGeometry(1,.025,.022),material(0xffb787,.72));edge.position.z=z;group.add(edge);}const end=new THREE.Mesh(new THREE.BoxGeometry(.008,.025,1),material(0xffb787,.85));end.position.x=.5;group.add(end);group.userData.floor=floor;group.userData.caps=[];for(const sign of [-1,1]){const cap=new THREE.Mesh(new THREE.CircleGeometry(.5,32).rotateX(-Math.PI/2),material(0xff9471,.18));cap.position.x=sign*.5;group.add(cap);group.userData.caps.push(cap);}return group;}
  if(kind==='boss-exposed'){const group=new THREE.Group(),rim=new THREE.Mesh(new THREE.RingGeometry(.92,1,64).rotateX(-Math.PI/2),material(0x9affd2,.75)),halo=new THREE.Mesh(new THREE.CylinderGeometry(.75,1,1,32,1,true),material(0xadffda,.08));halo.position.y=3;group.add(rim,halo);group.userData.halo=halo;return group;}
  if(kind==='vortex')return new THREE.Mesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{time:{value:0},opacity:{value:.6}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;uniform float time;uniform float opacity;void main(){vec2 p=vUv*2.-1.;float r=length(p);if(r>1.)discard;float a=atan(p.y,p.x);float wave=pow(.5+.5*sin(a*5.+r*24.-time*5.),5.);float rim=smoothstep(.87,.95,r)*(1.-smoothstep(.96,1.,r));vec3 color=mix(vec3(.4,.2,1.),vec3(.35,1.,.9),r);gl_FragColor=vec4(color,(wave*.25*(1.-r)+rim*.5)*opacity);}'}));
  if(kind==='shield'){
   const group=new THREE.Group(),arc=Math.PI*140/180,positions=[],indices=[];for(let i=0;i<=48;i++){const a=-arc*.5+arc*i/48;positions.push(Math.cos(a),0,Math.sin(a),Math.cos(a),3.5,Math.sin(a));if(i<48){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}
   const wallGeometry=new THREE.BufferGeometry();wallGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));wallGeometry.setIndex(indices);const wall=new THREE.Mesh(wallGeometry,material(0x73bfff,.14));
   const rim=new THREE.Mesh(new THREE.RingGeometry(.97,1,48,1,-arc*.5,arc).rotateX(-Math.PI/2),material(0x9fd3ff,.7));group.add(wall,rim);group.userData.wall=wall;group.userData.rim=rim;return group;
  }
  if(kind==='artillery'||kind==='boss-barrage'){
   const group=new THREE.Group(),rim=new THREE.Mesh(new THREE.RingGeometry(.92,1,64).rotateX(-Math.PI/2),material(0xff9861,.75)),sweep=new THREE.Mesh(new THREE.RingGeometry(.94,1,64).rotateX(-Math.PI/2),material(0xffd782,.65));group.add(rim,sweep);group.userData.sweep=sweep;
   for(const rotation of [0,Math.PI/2]){const line=new THREE.Mesh(new THREE.BoxGeometry(1.5,.025,.025),material(0xffa070,.7));line.rotation.y=rotation;group.add(line);}return group;
  }
  if(['rail','sniper','tether','healBeam','rush'].includes(kind))return new THREE.Mesh(new THREE.BoxGeometry(1,.05,1),material(kind==='rail'?0x8bf5fc:kind==='tether'?0xda7bea:kind==='healBeam'?0x8ff6b6:kind==='rush'?0xff574c:0xff7255,.4));
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
  for(const e of game.enemies||[]){if(e.hp<=0)continue;
   if(e.kind==='boss'){
    const warning=e.bossState==='windup',attacking=e.bossState==='attack',origin={x:e.bossOriginX??e.x,y:e.bossOriginY??e.y},progress=1-Math.min(1,Math.max(0,e.bossTimer||0)/Math.max(.01,e.bossPhaseDuration||1));
    if((warning||attacking)&&e.bossPattern==='fan'){const o=add('boss-fan-'+e.id,'boss-fan',origin);o.position.y=2.55;o.scale.set((e.bossLength||600)*S,1,(e.bossLength||600)*S);o.rotation.y=-(e.bossAngle||0);o.material.uniforms.halfArc.value=(e.bossArc||1.5)*.5;o.material.uniforms.progress.value=progress;o.material.uniforms.attackGlow.value=attacking?1:0;o.userData.telegraph={x:origin.x,y:origin.y,a:e.bossAngle,length:e.bossLength,arc:e.bossArc};}
    if((warning||attacking)&&e.bossPattern==='lance'){const o=add('boss-lance-'+e.id,'boss-lance',origin);beam(o,origin.x,origin.y,e.bossAngle||0,e.bossLength||700,e.bossWidth||100);o.position.y=2.6;for(const cap of o.userData.caps)cap.scale.x=(e.bossWidth||100)/Math.max(1,e.bossLength||700);o.userData.floor.material.opacity=attacking?.32:.12+progress*.1;o.userData.telegraph={x:origin.x,y:origin.y,a:e.bossAngle,length:e.bossLength,width:e.bossWidth};}
    if((warning||attacking)&&e.bossPattern==='barrage')for(let i=0;i<(e.bossMarkers||[]).length;i++){const mark=e.bossMarkers[i];if(mark.done)continue;const o=add('boss-marker-'+e.id+'-'+i,'boss-barrage',mark),r=mark.r*S;o.position.y=2.6;o.scale.set(r,1,r);const fill=warning?progress:.92;o.userData.sweep.scale.set(.1+fill*.9,1,.1+fill*.9);o.userData.sweep.material.opacity=.5;o.userData.telegraph={x:mark.x,y:mark.y,r:mark.r};}
    if(e.exposed>0){const o=add('boss-exposed-'+e.id,'boss-exposed',e);o.position.y=2.7;o.scale.set((e.r+17)*S,1,(e.r+17)*S);o.userData.halo.scale.y=5;o.userData.halo.material.opacity=.055+(this.view.reducedMotion?0:Math.sin(this.clock*5)**2*.045);}
   }
   if(e.guardT>0){const o=add('shield-'+e.id,'shield',e);o.scale.set((e.guardRadius||210)*S,1,(e.guardRadius||210)*S);o.rotation.y=-(e.guardAngle??e.a??0);o.position.y=2.3;o.userData.wall.material.opacity=.08+.055*Math.sin(this.clock*3)**2;o.userData.rim.material.opacity=.5+.2*Math.sin(this.clock*4)**2;}
   if(e.bombWarn>0){const target={x:e.bombX,y:e.bombY},o=add('artillery-'+e.id,'artillery',target),radius=(e.bombRadius||110)*S,progress=1-Math.min(1,e.bombWarn/1.65);o.scale.set(radius,1,radius);o.userData.sweep.scale.set(.12+progress*.88,1,.12+progress*.88);o.userData.sweep.material.opacity=.35+progress*.5;}
   if(e.healFlash>0){const target=game.enemies.find(t=>t.id===e.healTarget&&t.hp>0),x=target?.x??e.healX,y=target?.y??e.healY;if(Number.isFinite(x)&&Number.isFinite(y)){const o=add('heal-'+e.id,'healBeam',e),dx=x-e.x,dy=y-e.y;beam(o,e.x,e.y,Math.atan2(dy,dx),Math.hypot(dx,dy),8);o.material.opacity=Math.min(.75,e.healFlash*1.5);}}
   if(e.rushWarn>0||e.rushT>0){const o=add('rush-'+e.id,'rush',e),distance=e.rushWarn>0?(e.rushDistance||((e.speed||100)*3.35*1.3)):(e.rushSpeed||e.speed*3.35)*e.rushT,width=Math.max(14,e.r*1.5);beam(o,e.x,e.y,e.rushAngle??e.a??0,distance,width);o.position.y=2.45;o.material.opacity=e.rushWarn>0?.12+.2*Math.sin(this.clock*18)**2:.12;}
   if(e.aim>0){const o=add('aim-'+e.id,'sniper',e);beam(o,e.x,e.y,e.aimA||0,e.aimRange||900,7);o.material.opacity=.35+.35*Math.sin(this.clock*12)**2;}
   if(e.latched){const o=add('leech-'+e.id,'tether',e),dx=game.p.x-e.x,dy=game.p.y-e.y;beam(o,e.x,e.y,Math.atan2(dy,dx),Math.hypot(dx,dy),10);o.material.opacity=.65;}
   if(e.burn>0){const o=add('burn-'+e.id,'burn',e);o.scale.setScalar((e.r+12)*S);o.position.y=2.8;o.material.opacity=.32+.15*Math.sin(this.clock*7);}
  }
  for(const[id,o]of this.objects)if(!live.has(id)){this.view.release(o);this.objects.delete(id);}
 }
 get stats(){const result={};for(const o of this.objects.values())result[o.userData.kind]=(result[o.userData.kind]||0)+1;return result;}
 event(e){const v=this.view;
  if(e.type==='shieldPulse'){v.ring(e.x,e.y,Math.min(90,e.r||90),0x96d5ff,.65);v.addSprite(e.x,e.y,5,0x83baff,.5);}
  if(e.type==='shieldBlock'){v.ring(e.tx??e.x,e.ty??e.y,45,0x9cd5ff,.3);v.addSprite(e.tx??e.x,e.ty??e.y,3,0x82bfff,.22);}
  if(e.type==='shieldBreak'){v.ring(e.x,e.y,e.r||210,0x8acbff,.5);for(let i=0;i<8;i++){const a=i*Math.PI/4;v.addSprite(e.x+Math.cos(a)*70,e.y+Math.sin(a)*70,2.5,0xb9e8ff,.4,3);}}
  if(e.type==='depthWarning'){v.addSprite(e.x,e.y,3,0xffa168,.25);}
  if(e.type==='depthBlast'){v.ring(e.x,e.y,e.r||110,0xffae65,.75);v.addSprite(e.x,e.y,22,0xffdc9b,.45,3);v.addSprite(e.x,e.y,14,0xfb6848,.7,7);v.shake=.8;}
  if(e.type==='tenderHeal'){v.ring(e.tx,e.ty,65,0x91f5b5,.55);v.addSprite(e.x,e.y,4,0x91f5b5,.35);if(e.value)v.label({x:e.tx,y:e.ty},'+'+Math.round(e.value), '#a7efbf');}
  if(e.type==='rushWarning'){v.ring(e.x,e.y,75,0xff7858,.6);}
  if(e.type==='rushStart'){v.addSprite(e.x,e.y,7,0xffab69,.4);}
  if(e.type==='kamikazeBlast'){v.ring(e.x,e.y,e.r||105,0xff5e4f,.65);v.addSprite(e.x,e.y,18,0xffbb70,.5,2);v.shake=.55;}

  if(e.type==='railFire'){const a=Math.atan2(e.ty-e.y,e.tx-e.x),length=Math.hypot(e.tx-e.x,e.ty-e.y),o=this.make('rail');o.position.set((e.x+e.tx)*S*.5,3.8,(e.y+e.ty)*S*.5);o.rotation.y=-a;o.scale.set(length*S,1,Math.max(.22,(e.width||8)*S));o.material.color.setHex(e.enemy?0xff8169:0xc7fbff);v.scene.add(o);v.fx.push({obj:o,life:.32,max:.32,type:'line'});v.addSprite(e.x,e.y,7,0xa8edff,.3);v.shake=.22;}
  if(e.type==='flame'){for(let i=0;i<9;i++){const t=(i+1)/9,a=e.a+(Math.random()-.5)*(e.cone||.7),r=(e.r||280)*t;v.addSprite(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,1.2+t*3.6,i%2?0xff7b42:0xffd485,.35+Math.random()*.2,.5);} }
  if(e.type==='vortex'){v.ring(e.x,e.y,e.r,0xc39bff,.7);v.addSprite(e.x,e.y,9,0x8271e9,.7);}
  if(e.type==='sonic'){v.ring(e.x,e.y,e.r||220,0xb7f5ff,.8);v.addSprite(e.x,e.y,4,0xb8faff,.3);}
  if(e.type==='enemyTelegraph'&&e.kind==='carrier')v.ring(e.x,e.y,e.r||110,0xffbd68,e.duration||1.3);
  if(e.type==='enemyAction'){v.addSprite(e.x,e.y,4,e.kind==='leech'?0xd78cf4:0xff8563,.5);if(e.kind==='sniper'&&Number.isFinite(e.tx))this.event({...e,type:'railFire',width:7,enemy:true});}
  if(e.type==='rarity'&&e.rarity==='universe'){v.ring(e.x||0,e.y||0,420,0xec96ff,1.8);v.ring(e.x||0,e.y||0,270,0x99faff,1.3);}
 }
}
