import * as THREE from './assets/lib/three.module.js';
const TAU=Math.PI*2,S=.1,COLORS={bastion:0xe89b73,salvage:0xe9bc68,beacon:0x7edfe2,shrine:0xc5a0f2};
const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
const floor=(x,z,stage)=>window.UBWorld.heightAt(x,z,stage);

/** Original site dioramas and low seabed ruins. No simulation state is changed here. */
export class ExpeditionWorld {
 constructor(view,parent){this.view=view;this.parent=parent;this.root=new THREE.Group();this.root.name='expedition-sites';parent.add(this.root);this.records=new Map();this.clock=0;this.key='';this.ruins=[];this.animalRoot=new THREE.Group();this.root.add(this.animalRoot);this.fish=null;this.fishDummy=new THREE.Object3D();}
 clear(){for(const child of [...this.root.children]){this.root.remove(child);child.traverse(o=>{if(o.isInstancedMesh)o.dispose();});this.view.release(child);}this.records.clear();this.ruins=[];this.fish=null;this.animalRoot=new THREE.Group();this.root.add(this.animalRoot);}
 addMesh(parent,geo,mat,x=0,y=0,z=0){const mesh=new THREE.Mesh(geo,mat);mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 build(game){
  this.clear();this.key=game.runId+'|'+game.stage+'|'+game.worldSeed;this.stage=game.stage;const paving=[];
  const stone=game.stage===0?0x687c6d:game.stage===1?0x635e51:0x454b64;
  for(const site of game.sites||[]){
   const root=new THREE.Group();root.name='operation-'+site.id;const x=site.x*S,z=site.y*S,y=floor(x,z,game.stage);root.position.set(x,y,z);this.root.add(root);
   const base=this.addMesh(root,new THREE.CylinderGeometry(site.kind==='bastion'?22:16,site.kind==='bastion'?24:18,.65,12),new THREE.MeshStandardMaterial({color:stone,roughness:.95,metalness:.05}),0,-.28,0);base.receiveShadow=true;
   const asset=this.view.clone(site.model,true);asset.rotation.y=site.rotation||0;root.add(asset);
   const color=COLORS[site.kind]||0x9edbc3,holdRadius=site.r*S;
   const ring=this.addMesh(root,new THREE.RingGeometry(holdRadius-.25,holdRadius,64).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}),0,.48,0);
   const progress=this.addMesh(root,new THREE.RingGeometry(holdRadius-.95,holdRadius-.6,64).rotateX(-Math.PI/2),new THREE.ShaderMaterial({uniforms:{amount:{value:0},tint:{value:new THREE.Color(color)},alpha:{value:.8}},vertexShader:'varying vec2 ringUV;void main(){ringUV=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 ringUV;uniform float amount;uniform vec3 tint;uniform float alpha;void main(){float a=mod(atan(ringUV.y-.5,ringUV.x-.5)+6.2831853,6.2831853)/6.2831853;if(a>amount)discard;gl_FragColor=vec4(tint,alpha);}',transparent:true,depthWrite:false,side:THREE.DoubleSide}),0,.5,0);
   const beacon=this.addMesh(root,new THREE.CylinderGeometry(.12,.65,24,12,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),0,12,0);
   const pole=this.addMesh(root,new THREE.CylinderGeometry(.09,.12,10,8),new THREE.MeshStandardMaterial({color:0xc4a46a,metalness:.72,roughness:.4}),site.kind==='bastion'?-9:8,9,0);
   const banner=this.addMesh(root,new THREE.PlaneGeometry(3.2,1.9,6,2),new THREE.MeshStandardMaterial({color:0x73dbc1,emissive:0x123d38,emissiveIntensity:.3,roughness:.6,side:THREE.DoubleSide}),pole.position.x+1.6,13,0);banner.visible=false;banner.userData.base=new Float32Array(banner.geometry.attributes.position.array);
   this.records.set(site.id,{root,asset,ring,progress,beacon,banner,pole,state:site.status,color});
   // Low paving and fallen architecture lie below the submarine's sailing plane.
   for(let i=0;i<24;i++){const salt=i*31+x*7+z*13+game.worldSeed%997;if(hash(salt)<.38)continue;const a=i/24*TAU+(hash(salt+7)-.5)*.035,r=(site.kind==='bastion'?25:19)+(hash(salt+19)-.5)*.65,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;paving.push({x:px,y:Math.min(-.54,floor(px,pz,game.stage)+.06),z:pz,a:-a+(hash(salt+41)-.5)*.22,scale:.65+hash(salt+59)*.42,wear:.50+hash(salt+73)*.4});}
  }
  // Broken radial streets, arch fragments and submerged neighborhoods give old landmarks context.
  for(const [index,landmark]of (game.world?.landmarks||[]).entries()){
   const x=landmark.x*S,z=landmark.y*S;
   // Regional archaeology owns the landmark streets; avoid a second radial grid here.
   for(let i=0;i<7;i++){const a=i/7*TAU+index*.7,r=25+hash(i+index*37)*15,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;const ruin=this.view.clone(i%3===0?'world-arch':i%3===1?'colony':'wreck',true);ruin.scale.setScalar(i%3===0?.27:.3);ruin.rotation.set(i%3===0?.65:0,a,i%3===0?.2:0);ruin.position.set(px,0,pz);ruin.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(ruin);ruin.position.y=Math.min(-.5,floor(px,pz,game.stage)+.75)-bounds.max.y;ruin.userData.reliefTop=Math.min(-.5,floor(px,pz,game.stage)+.75);this.root.add(ruin);this.ruins.push(ruin);}
  }
  const streets=new THREE.InstancedMesh(new THREE.BoxGeometry(2.4,.16,1.3),new THREE.MeshStandardMaterial({color:[0x42594d,0x47483e,0x303d50][game.stage],roughness:1}),paving.length);streets.name='sunken-paved-streets';const wearColor=new THREE.Color();for(let i=0;i<paving.length;i++){const p=paving[i];this.fishDummy.position.set(p.x,p.y,p.z);this.fishDummy.rotation.set(0,p.a,0);this.fishDummy.scale.set(p.scale,1,p.scale);this.fishDummy.updateMatrix();streets.setMatrixAt(i,this.fishDummy.matrix);wearColor.setScalar(p.wear);streets.setColorAt(i,wearColor);}streets.receiveShadow=true;streets.computeBoundingSphere();this.root.add(streets);
  const fishGeo=new THREE.ConeGeometry(.18,.95,5);fishGeo.rotateZ(-Math.PI/2);const fishMat=new THREE.MeshStandardMaterial({color:game.stage===2?0x83c8dc:0xc2c99c,metalness:.25,roughness:.4,emissive:game.stage===2?0x17475c:0x122d29,emissiveIntensity:.6});this.fish=new THREE.InstancedMesh(fishGeo,fishMat,96);this.fish.name='ambient-fish-schools';this.fish.frustumCulled=false;this.root.add(this.fish);
 }
 update(dt,game,focus){
  this.clock+=dt;if(!game){this.root.visible=false;return;}this.root.visible=true;if(this.key!==game.runId+'|'+game.stage+'|'+game.worldSeed)this.build(game);
  for(const site of game.sites||[]){const record=this.records.get(site.id);if(!record)continue;const d=Math.hypot(site.x*S-focus.x,site.y*S-focus.z);record.root.visible=d<180;if(!record.root.visible)continue;
   const active=site.status==='active',done=site.status==='captured',color=done?0x83e6b9:record.color;record.ring.material.color.setHex(color);record.ring.material.opacity=done?.3:active?.68:.3;record.progress.material.uniforms.amount.value=done?1:active?Math.min(1,(site.progress||0)/Math.max(1,site.duration||1)):0;record.progress.material.uniforms.tint.value.setHex(color);record.beacon.material.color.setHex(color);record.beacon.material.opacity=done?.06:active?.12+Math.sin(this.clock*3)*.035:.055;
   record.banner.visible=done;record.pole.visible=done;record.banner.position.y=12.3+Math.sin(this.clock*.7)*.12;
   if(done){const attr=record.banner.geometry.attributes.position,base=record.banner.userData.base;for(let i=0;i<attr.count;i++)attr.setZ(i,base[i*3+2]+Math.sin(this.clock*2.3+base[i*3]*1.4)*.14*(base[i*3]+1.6));attr.needsUpdate=true;}
   if(record.state!==site.status){if(done){this.view.ring(site.x,site.y,260,0xa3f2ca,1.3);this.view.addSprite(site.x,site.y,13,0xf0ce88,.9,2);}record.state=site.status;}
  }
  for(const ruin of this.ruins)ruin.visible=Math.abs(ruin.position.x-focus.x)<150&&Math.abs(ruin.position.z-focus.z)<150;
  let count=0;for(let school=0;school<8;school++){const site=game.sites?.[school];if(!site)continue;const sx=site.x*S+Math.cos(this.clock*.06+school)*34,sz=site.y*S+Math.sin(this.clock*.06+school)*26;if(Math.hypot(sx-focus.x,sz-focus.z)>130)continue;for(let i=0;i<12;i++){const x=sx+Math.sin(i*9+school)*7+Math.cos(this.clock+i)*.6,z=sz+Math.cos(i*5+school)*5;this.fishDummy.position.set(x,Math.min(1.2,floor(x,z,game.stage)+2.5)+Math.sin(this.clock*.8+i)*.2,z);this.fishDummy.rotation.set(0,-this.clock*.06-school-Math.PI/2,0);this.fishDummy.scale.setScalar(.6+hash(i*9+school)*.6);this.fishDummy.updateMatrix();this.fish.setMatrixAt(count++,this.fishDummy.matrix);}}if(this.fish){this.fish.count=count;this.fish.instanceMatrix.needsUpdate=true;}
 }
 get stats(){return {sites:this.records.size,visibleSites:[...this.records.values()].filter(r=>r.root.visible).length,seabedRuins:this.ruins.length,fish:this.fish?.count||0};}
}
