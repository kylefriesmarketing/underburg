import * as THREE from './assets/lib/three.module.js';
const TAU=Math.PI*2,S=.1;
const hash=n=>{const f=Math.sin(n*127.1+311.7)*43758.5453;return f-Math.floor(f);};

/** Low archaeological reliefs and motes, never new movement obstacles.
 * The tall monuments use the existing solid circles; every supporting stone,
 * pipe and inscription remains below the submarine sailing plane. */
export class WorldDioramas {
 constructor(view,parent){this.view=view;this.root=new THREE.Group();this.root.name='regional-archaeology';parent.add(this.root);this.groups=[];this.anchors=[];this.dummy=new THREE.Object3D();this.clock=0;this.instances=0;this.maxReliefTop=-Infinity;}
 clear(){const geometries=new Set(),materials=new Set();for(const child of [...this.root.children]){this.root.remove(child);child.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});}for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.groups=[];this.anchors=[];this.instances=0;this.maxReliefTop=-Infinity;}
 build(stage,seed,landmarks,sites=[]){
  this.clear();this.stage=stage;this.seed=seed;const W=window.UBWorld;
  const palettes=[{stone:0x465f50,metal:0x3c6157,glow:0x8f9270},{stone:0x45483d,metal:0x5c5341,glow:0xa07b42},{stone:0x303f53,metal:0x3f5267,glow:0x5a78a0}],p=palettes[stage];
  const stone=new THREE.MeshStandardMaterial({color:p.stone,roughness:1,metalness:0});
  const metal=new THREE.MeshStandardMaterial({color:p.metal,roughness:.84,metalness:.22});
  const glow=new THREE.MeshStandardMaterial({color:p.glow,emissive:p.glow,emissiveIntensity:.12,roughness:.9,metalness:.08});
  const tileGeo=new THREE.BoxGeometry(1,.18,1),lineGeo=new THREE.BoxGeometry(1,.08,1),beadGeo=new THREE.OctahedronGeometry(.13,0);
  const allowed=(x,z,l)=>W.boundaryDistance(x/S,z/S,stage)>90&&sites.every(s=>Math.hypot(x-s.x*S,z-s.y*S)>s.r*S+4)&&(!l.courtyard||Math.hypot(x-l.courtyard.x*S,z-l.courtyard.y*S)>8);
  for(let index=0;index<landmarks.length;index++){
   const l=landmarks[index],x=l.x*S,z=l.y*S,r=(l.solidRadius||50)*S,originY=W.heightAt(x,z,stage),anchor=new THREE.Group();anchor.name='archaeology-'+l.id;this.root.add(anchor);
   const lists=[[],[],[]],add=(kind,px,pz,a,sx,sz)=>{const salt=px*9.7+pz*17.3+seed%997;px+=(hash(salt+11)-.5)*.6;pz+=(hash(salt+31)-.5)*.6;if(!allowed(px,pz,l))return;const top=Math.min(-.46,W.heightAt(px,pz,stage)+.08),h=kind===1?.08:.18,wear=.52+hash(salt+61)*.42;lists[kind].push({x:px,z:pz,y:top-h/2,a:a+(hash(salt+47)-.5)*.25,sx:sx*(.69+hash(salt+19)*.42),sz:sz*(.7+hash(salt+37)*.40),wear,tint:hash(salt+81)});this.maxReliefTop=Math.max(this.maxReliefTop,top);};
   // Incomplete rings read as a buried guild square / pressure manifold / rune court.
   for(let ring=0;ring<2;ring++)for(let j=0;j<32;j++){
    if(hash(j*19+ring*43+index*31+seed%997)<.24||hash(Math.floor(j/4)*23+ring*71+index*47+seed%199)<.23)continue;
    const a=j/32*TAU+(l.rotation||0),rr=r+3.4+ring*3.8,px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr;
    add(stage===1?1:0,px,pz,-a,stage===1?2.1:1.35,stage===1?.55:2.2);
    if(stage===2&&j%3===0)add(2,px,pz,-a+.6,1.5,.17);
   }
   for(let spoke=0;spoke<3;spoke++)for(let j=0;j<12;j++){
    if(hash(Math.floor(j/3)*29+spoke*41+index*73+seed%487)<.31||hash(j*43+index*71+spoke)<.12)continue;
    const a=(l.rotation||0)+spoke*TAU/3+.3,rr=r+9+j*2.4,px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr;
    add(stage===1?1:0,px,pz,-a,stage===1?2.15:1.75,stage===1?.42:2.7);
    if(stage===0&&j%3===0)add(1,px+Math.sin(a)*1.9,pz-Math.cos(a)*1.9,-a,.45,2.2);
    if(stage===2&&j%2===0)add(2,px,pz,-a+Math.PI/4,1.7,.11);
   }
   for(let kind=0;kind<lists.length;kind++){
    const list=lists[kind];if(!list.length)continue;
    const mesh=new THREE.InstancedMesh(kind===1?lineGeo:tileGeo,[stone,metal,glow][kind],list.length);mesh.name=['submerged-masonry','submerged-manifolds','submerged-rune-inlays'][kind];mesh.receiveShadow=true;
    const weathered=new THREE.Color();list.forEach((v,i)=>{this.dummy.position.set(v.x,v.y,v.z);this.dummy.rotation.set(0,v.a,0);this.dummy.scale.set(v.sx,1,v.sz);this.dummy.updateMatrix();mesh.setMatrixAt(i,this.dummy.matrix);weathered.setRGB(v.wear*(.96+v.tint*.06),v.wear,v.wear*(.96+(1-v.tint)*.06));mesh.setColorAt(i,weathered);});mesh.computeBoundingSphere();anchor.add(mesh);this.instances+=list.length;
   }
   const appearance=W.landmarkPresentation(l,stage),motifs=appearance.baseRadius?18:8;
   const dust=new THREE.InstancedMesh(beadGeo,new THREE.MeshBasicMaterial({color:p.glow,transparent:true,opacity:.35,depthWrite:false}),motifs);dust.name='monument-biological-motes';dust.frustumCulled=false;anchor.add(dust);
   this.groups.push({root:anchor,dust,x,z,r,y:originY,index});this.anchors.push({id:l.id,x,y:originY,z,model:appearance.model,theme:appearance.theme});
  }
  // Geometries with no instances in this biome still have a clear owner.
  const used=new Set();this.root.traverse(o=>{if(o.geometry)used.add(o.geometry);});for(const g of [tileGeo,lineGeo,beadGeo])if(!used.has(g))g.dispose();const usedM=new Set();this.root.traverse(o=>{if(o.material)usedM.add(o.material);});for(const m of [stone,metal,glow])if(!usedM.has(m))m.dispose();
 }
 update(dt,focus){this.clock+=dt;for(const g of this.groups){g.root.visible=Math.hypot(g.x-focus.x,g.z-focus.z)<170;if(!g.root.visible)continue;for(let i=0;i<g.dust.count;i++){const a=i*2.399+g.index+.1*Math.sin(this.clock*.2+i),r=g.r*(.65+hash(i+g.index*23)*.2),lift=(this.clock*(this.stage===1?1.1:.35)+i*1.77)%16;this.dummy.position.set(g.x+Math.cos(a)*r,g.y+2+lift,g.z+Math.sin(a)*r);this.dummy.rotation.set(0,a,0);this.dummy.scale.setScalar(.3+hash(i+g.index)*.6);this.dummy.updateMatrix();g.dust.setMatrixAt(i,this.dummy.matrix);}g.dust.instanceMatrix.needsUpdate=true;}}
 get stats(){return {theme:['hanse','pressure','imperial'][this.stage],monuments:this.anchors.filter(a=>a.model.startsWith('world-hanse')||a.model==='world-druckwerk'||a.model==='world-kaiserdom').length,reliefInstances:this.instances,maxReliefTop:this.maxReliefTop,anchors:this.anchors.map(a=>({...a}))};}
}
