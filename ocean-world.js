import * as THREE from './assets/lib/three.module.js';
import {ExpeditionWorld} from './expedition-world.js';
const TAU=Math.PI*2;
const hash=n=>{let x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const height=(x,z,stage)=>window.UBWorld?.heightAt(x,z,stage)??-1;
const MIX=new THREE.Color();
export const OCEAN_PALETTES=[
 {water:0x164c57,deep:0x17484a,sand:0x789889,reef:0x386d60,shaft:0xb4efcf,glow:0x64efcb},
 {water:0x173d4b,deep:0x203a45,sand:0x64766c,reef:0x414e50,shaft:0xb7ced0,glow:0xf0b364},
 {water:0x111f39,deep:0x172535,sand:0x42495b,reef:0x2c3a52,shaft:0x97afdc,glow:0x75c9ff}
];

/** A world anchored to map coordinates: no camera-snapped scenery or changing routes. */
export class OceanWorld {
 constructor(view){this.view=view;this.scene=view.scene;this.root=new THREE.Group();this.root.name='charted-seabed';this.scene.add(this.root);this.stage=-1;this.seed=0;this.landmarks=[];this.groups=[];this.deco=[];this.bubbles=[];this.visibleDecor=0;this.lastCull=new THREE.Vector2(Infinity,Infinity);this.dummy=new THREE.Object3D();this.matrix=new THREE.Matrix4();this.clock=0;this.buildFloor();this.buildShafts();this.buildMotes();this.boundaryRoot=new THREE.Group();this.boundaryRoot.name='physical-map-border';this.root.add(this.boundaryRoot);this.boundaryTriangles=0;this.boundaryUniforms={focus:{value:new THREE.Vector3()}};this.expeditionView=new ExpeditionWorld(view,this.root);}
 buildFloor(){
  const geo=new THREE.PlaneGeometry(1300,1300,260,260);geo.rotateX(-Math.PI/2);geo.setAttribute('color',new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count*3),3));
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),pixels=ctx.createImageData(512,512);for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;const ripple=Math.sin(y*.19+Math.sin(x*.018)*2.5)*3,n=hash(x+y*512)*15;pixels.data[i]=166+n+ripple;pixels.data[i+1]=176+n+ripple;pixels.data[i+2]=162+n+ripple;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(40,40);
  this.floor=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,map,roughness:.98,metalness:.01}));this.floor.receiveShadow=true;this.floor.name='sculpted-seafloor';this.root.add(this.floor);
  this.caustic=new THREE.Mesh(geo.clone(),new THREE.ShaderMaterial({uniforms:{time:{value:0},strength:{value:.13},tint:{value:new THREE.Color(0x8bd7b1)}},vertexShader:'varying vec3 pos;void main(){pos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform float time;uniform float strength;uniform vec3 tint;varying vec3 pos;
  void main(){vec2 p=pos.xz*.65;float a=sin(p.x+sin(p.y*.82+time*.23)*1.8+time*.14);float b=cos(p.y*.92+cos(p.x*.71-time*.17)*1.9);float line=pow(max(0.,1.-abs(a+b)*2.8),8.);float patches=.32+.68*smoothstep(-.4,.7,sin(pos.x*.038+pos.z*.021));gl_FragColor=vec4(tint,line*strength*patches);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.caustic.position.y=.018;this.root.add(this.caustic);
  // A dark escarpment outside the navigable area gives the seabed a distant silhouette.
  const edgeGeo=new THREE.RingGeometry(250,290,128,3);edgeGeo.rotateX(-Math.PI/2);this.rim=new THREE.Mesh(edgeGeo,new THREE.MeshStandardMaterial({color:0x0d2b32,roughness:1,side:THREE.DoubleSide}));this.rim.position.y=-3;this.rim.visible=false;this.root.add(this.rim);
 }

 buildBoundary(stage,palette){
  const W=window.UBWorld,vertices=W.boundaryVertices(stage),N=vertices.length,positions=[],colors=[],indices=[],caps=[];
  const cliffColor=new THREE.Color(stage===0?0x49665a:stage===1?0x48545a:0x343f57),upperColor=new THREE.Color(palette.sand),vColor=new THREE.Color();
  const crest=i=>{const a=i/N*TAU;return [18,24,29][stage]+Math.sin(a*(stage+5)+.7)*[4,6,7][stage]+Math.cos(a*19+.4)*2.2;};
  const addVertex=(x,y,z,t,i)=>{positions.push(x,y,z);vColor.copy(cliffColor).lerp(upperColor,t).multiplyScalar(.82+hash(i*13+stage)*.27);colors.push(vColor.r,vColor.g,vColor.b);};
  // The interior face is vertical at the exact shared collision polygon. Every
  // stratum has identical x/z; its first visible contact is its first solid contact.
  const layers=[0,.19,.43,.7,1];
  for(let j=0;j<layers.length;j++)for(let i=0;i<N;i++){const p=vertices[i],x=p.x*.1,z=p.y*.1,bottom=height(x,z,stage)-1.5,y=THREE.MathUtils.lerp(bottom,crest(i),layers[j]);addVertex(x,y,z,[.12,.31,.14,.48,.64][j],i+j*7);}
  for(let j=0;j<layers.length-1;j++)for(let i=0;i<N;i++){const next=(i+1)%N,a=j*N+i,b=j*N+next,c=(j+1)*N+next,d=(j+1)*N+i;indices.push(a,b,d,b,c,d);}
  // Broad fractured rock berms lie outside the navigable side of the wall.
  const ridgeStart=positions.length/3,offsets=[0,7,23,46,78];
  for(let j=0;j<offsets.length;j++)for(let i=0;i<N;i++){const p=vertices[i],a=i/N*TAU,r=Math.hypot(p.x,p.y)*.1,off=offsets[j]+(j&&j<4?Math.sin(a*23+j)*1.4:0),x=Math.cos(a)*(r+off),z=Math.sin(a)*(r+off),top=crest(i),y=j===0?top:j===1?top+2+Math.sin(a*13)*2:j===2?top*.76:j===3?top*.32:height(x,z,stage)-.3;addVertex(x,y,z,[.64,.72,.48,.27,.14][j],i+j*21);}
  for(let j=0;j<offsets.length-1;j++)for(let i=0;i<N;i++){const next=(i+1)%N,a=ridgeStart+j*N+i,b=ridgeStart+j*N+next,c=ridgeStart+(j+1)*N+next,d=ridgeStart+(j+1)*N+i;indices.push(a,d,b,b,d,c);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const cliff=new THREE.Mesh(geometry,this.cutawayMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.97,metalness:.04,flatShading:true,side:THREE.DoubleSide})));cliff.name='physical-basin-cliff';cliff.receiveShadow=true;cliff.castShadow=true;this.boundaryRoot.add(cliff);this.boundaryTriangles=indices.length/3;
  // Original Blender rocks break the crest silhouette; they remain beyond the wall.
  for(let i=0;i<N;i+=3){const a=i/N*TAU,p=vertices[i],r=Math.hypot(p.x,p.y)*.1+5+hash(i+54)*12;caps.push({name:i%2?'rock-a':'rock-b',x:Math.cos(a)*r,z:Math.sin(a)*r,y:crest(i)*.85,scale:4.2+hash(i*17+stage)*4.8,rotation:a+hash(i)*2,phase:a,boundary:true});}
  for(let i=0;i<N;i+=9){const a=i/N*TAU,p=vertices[i],r=Math.hypot(p.x,p.y)*.1+34;caps.push({name:'rock-b',x:Math.cos(a)*r,z:Math.sin(a)*r,y:crest(i)*.42,scale:6+hash(i+20)*6,rotation:a,phase:a,boundary:true});}
  // Geometric warning buoys are physical-looking guide lights before the cliff,
  // not an invisible collision barrier. Their bases float clear of the sea floor.
  const count=N/8,baseGeo=new THREE.CylinderGeometry(.7,.48,.6,8),poleGeo=new THREE.CylinderGeometry(.055,.055,2.8,6),lampGeo=new THREE.SphereGeometry(.25,8,6);
  const baseMat=new THREE.MeshStandardMaterial({color:0x516f66,metalness:.7,roughness:.4}),poleMat=new THREE.MeshStandardMaterial({color:0xb48a42,metalness:.75,roughness:.4});
  this.boundaryLampMaterial=new THREE.MeshBasicMaterial({color:palette.glow,transparent:true,opacity:.85});this.boundaryLampColor=palette.glow;
  const parts=[{geo:baseGeo,mat:baseMat,y:1.6},{geo:poleGeo,mat:poleMat,y:3.1},{geo:lampGeo,mat:this.boundaryLampMaterial,y:4.55}];
  for(const part of parts){const inst=new THREE.InstancedMesh(part.geo,part.mat,count);inst.name='cliff-warning-buoys';inst.frustumCulled=false;
   for(let j=0;j<count;j++){const i=j*8,p=vertices[i],a=i/N*TAU,r=Math.hypot(p.x,p.y)*.1-13;this.dummy.position.set(Math.cos(a)*r,part.y,Math.sin(a)*r);this.dummy.rotation.set(0,a,0);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();inst.setMatrixAt(j,this.dummy.matrix);}inst.instanceMatrix.needsUpdate=true;this.boundaryRoot.add(inst);
  }
  // Thin mineral seams make the stratified wall readable through underwater fog.
  const seams=[];for(let i=0;i<N;i+=7){const a=i/N*TAU,p=vertices[i],r=Math.hypot(p.x,p.y)*.1-.015,x=Math.cos(a)*r,z=Math.sin(a)*r;seams.push(x,height(x,z,stage)+.6,z,x,crest(i)*(.3+hash(i)*.35),z);}
  const seamGeo=new THREE.BufferGeometry();seamGeo.setAttribute('position',new THREE.Float32BufferAttribute(seams,3));const seam=new THREE.LineSegments(seamGeo,new THREE.LineBasicMaterial({color:palette.glow,transparent:true,opacity:.26,depthWrite:false}));seam.name='mineral-seams';this.boundaryRoot.add(seam);
  return caps;
 }
 cutawayMaterial(material){
  // A local see-through window keeps the submarine readable behind foreground
  // cliffs. This changes shading only: wall position and collision stay exact.
  material.transparent=true;material.depthWrite=true;material.onBeforeCompile=shader=>{
   shader.uniforms.basinFocus=this.boundaryUniforms.focus;
   shader.vertexShader='varying vec3 basinWorld;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    vec4 basinPoint=vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     basinPoint=instanceMatrix*basinPoint;
    #endif
    basinWorld=(modelMatrix*basinPoint).xyz;`);
   shader.fragmentShader='uniform vec3 basinFocus;varying vec3 basinWorld;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`vec3 basinDelta=basinWorld-basinFocus;
    float cameraHeight=basinWorld.y-basinDelta.z*(90.0/76.0);
    float windowMask=(1.0-smoothstep(12.0,21.0,abs(basinDelta.x)))*(1.0-smoothstep(10.0,18.0,abs(cameraHeight-6.0)));
    windowMask*=smoothstep(0.3,2.0,basinDelta.z)*(1.0-smoothstep(65.0,90.0,basinDelta.z))*smoothstep(2.8,4.5,basinWorld.y);
    diffuseColor.a*=mix(1.0,0.065,windowMask);
    #include <alphatest_fragment>`);
  };material.customProgramCacheKey=()=> 'underburg-foreground-cliff-cutaway';return material;
 }
 clearBoundary(){for(const child of [...this.boundaryRoot.children]){this.boundaryRoot.remove(child);if(child.isInstancedMesh)child.dispose();child.geometry?.dispose();for(const m of Array.isArray(child.material)?child.material:[child.material])m?.dispose();}this.boundaryTriangles=0;this.boundaryLampMaterial=null;}

 buildShafts(){
  const c=document.createElement('canvas');c.width=64;c.height=256;const x=c.getContext('2d'),data=x.createImageData(64,256);for(let y=0;y<256;y++)for(let i=0;i<64;i++){const u=(i/63-.5)*2,v=y/255,width=.15+v*.8;const a=Math.exp(-Math.pow(u/width,2)*5)*Math.sin(v*Math.PI)*.55;const n=(y*64+i)*4;data.data[n]=data.data[n+1]=data.data[n+2]=255;data.data[n+3]=a*255;}x.putImageData(data,0,0);this.shaftMap=new THREE.CanvasTexture(c);
  this.shafts=[];const geometry=new THREE.PlaneGeometry(15,75);this.shaftMaterial=new THREE.MeshBasicMaterial({map:this.shaftMap,color:0xb4efcf,transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});for(let i=0;i<65;i++){const o=new THREE.Mesh(geometry,this.shaftMaterial);o.position.set((hash(i+38)-.5)*840,24,(hash(i+79)-.5)*840);o.userData.phase=hash(i)*TAU;this.root.add(o);this.shafts.push(o);}
 }
 buildMotes(){const geometry=new THREE.SphereGeometry(.05,5,4);this.ventBubbles=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:0xb7e8e0,transparent:true,opacity:.24,depthWrite:false}),180);this.ventBubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.ventBubbles.frustumCulled=false;this.ventBubbles.count=0;this.root.add(this.ventBubbles);}
 clearRegion(){
  for(const g of this.groups){this.root.remove(g.mesh);g.mesh.dispose();if(g.ownedMaterial)g.mesh.material.dispose();}this.groups=[];this.deco=[];
  for(const o of this.landmarks){this.root.remove(o);this.view.release(o);}this.landmarks=[];this.bubbles=[];this.clearBoundary();this.lastCull.set(Infinity,Infinity);
 }
 setRegion(stage,seed,landmarkDefs,menu=false){
  const key=stage+'|'+seed+'|'+menu;if(this.key===key)return;this.key=key;this.stage=stage;this.seed=seed;this.menu=menu;this.clearRegion();const palette=OCEAN_PALETTES[stage],geo=this.floor.geometry,positions=geo.attributes.position,colors=geo.attributes.color;const deep=new THREE.Color(palette.deep),sand=new THREE.Color(palette.sand),reef=new THREE.Color(palette.reef);
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i),h=height(x,z,stage)-Math.max(0,Math.hypot(x,z)-window.UBWorld.boundaryRadius(Math.atan2(z,x),stage)*.1-95)*.11;positions.setY(i,h);const dune=.5+.5*Math.sin(x*.043+Math.sin(z*.034)*2.3),patch=.5+.5*Math.cos(z*.063+Math.sin(x*.059));MIX.copy(deep).lerp(sand,Math.max(.08,Math.min(.87,(h+6)/6))*(.45+dune*.35));MIX.lerp(reef,patch*.24);MIX.multiplyScalar(.91+hash(i+stage*779)*.1);colors.setXYZ(i,MIX.r,MIX.g,MIX.b);}positions.needsUpdate=true;colors.needsUpdate=true;geo.computeVertexNormals();geo.computeBoundingSphere();this.caustic.geometry.attributes.position.array.set(positions.array);this.caustic.geometry.attributes.position.needsUpdate=true;this.caustic.geometry.computeBoundingSphere();this.caustic.material.uniforms.strength.value=[.045,.025,.012][stage];this.caustic.material.uniforms.tint.value.setHex(palette.glow);this.shaftMaterial.color.setHex(palette.shaft);this.shaftMaterial.opacity=[.2,.1,.065][stage];
  const landmarks=menu?[
   {id:'harbor',name:'Glockenhafen',model:'world-bell-tower',x:-320,y:-320,rotation:-.2,scale:1},
   {id:'dome',name:'Nautisches Institut',model:'world-observatory',x:520,y:-290,rotation:.3,scale:1},
   {id:'gate',name:'Altes Tor',model:'world-arch',x:470,y:430,rotation:.6,scale:1.15}
  ]:landmarkDefs||[];
  this.landmarkDefs=landmarks;
  for(const d of landmarks){const o=this.view.clone(d.model,true);o.name=d.id;o.position.set(d.x*.1,height(d.x*.1,d.y*.1,stage),d.y*.1);o.rotation.y=d.rotation||0;o.scale.setScalar(d.scale||1);this.root.add(o);this.landmarks.push(o);if(d.model.includes('basalt')||d.model.includes('pipeline'))this.bubbles.push({x:d.x*.1,z:d.y*.1});}
  const points=menu?[]:this.buildBoundary(stage,palette);const salt=seed%65521+stage*195;
  const sites=menu?[]:(window.UBExpedition?.createSites(stage,seed)||[]);
  const allowed=(x,z)=>Math.hypot(x,z)>12&&Math.hypot(x,z)<window.UBWorld.boundaryRadius(Math.atan2(z,x),stage)*.1-8&&(!menu||Math.hypot(x-17,z)>20)&&sites.every(site=>Math.hypot(x-site.x*.1,z-site.y*.1)>site.r*.1+8)&&landmarks.every(l=>Math.hypot(x-l.x*.1,z-l.y*.1)>(l.solidRadius||95)*.1+4&&(!l.courtyard||Math.hypot(x-l.courtyard.x*.1,z-l.courtyard.y*.1)>9));
  const add=(name,x,z,scale,rotation)=>{if(allowed(x,z))points.push({name,x,z,scale,rotation,phase:hash(points.length+43)*TAU});};
  // Irregular, anchored outcrops and narrow forests; open sand is the main movement space.
  for(let i=0;i<2000;i++){const x=(hash(i*13+salt)-.5)*850,z=(hash(i*23+salt+88)-.5)*850;const pocket=Math.sin(x*.037)+Math.cos(z*.031+x*.009);let name=stage===0?(i%4===0?'coral':i%3===0?'fan':i%2?'rock-a':'rock-b'):stage===1?(i%7===0?'wreck':i%4===0?'vent':i%2?'rock-a':'rock-b'):(i%7===0?'world-crystal':i%5===0?'vent':i%2?'rock-a':'rock-b');const scale=name==='world-crystal'?.22+hash(i+19)*.25:name==='wreck'?.5+hash(i)*.5:.65+hash(i+21)*1.5;if(pocket>-.75)add(name,x,z,scale,hash(i+77)*TAU);}
  for(let cluster=0;cluster<300;cluster++){const cx=(hash(cluster*7+salt+200)-.5)*840,cz=(hash(cluster*17+salt+450)-.5)*840;if(Math.sin(cx*.037)+Math.cos(cz*.031+cx*.009)<-.8)continue;const count=stage===0?13:stage===1?5:4;for(let j=0;j<count;j++){const a=hash(cluster*41+j+89)*TAU,r=2+hash(j*43+cluster+42)*8;const name=stage===0?(j%7===0?'world-anemone':'kelp'):stage===1?(j%4===0?'coral':'kelp'):(j%3===0?'world-crystal':'fan');const scale=name.startsWith('world-')?.15+hash(j+cluster)*.13:.45+hash(j*61+cluster)*.85;add(name,cx+Math.cos(a)*r,cz+Math.sin(a)*r,scale,hash(j+95)*TAU);}}
  // Hand-placed harbor vegetation frames the first few seconds of play.
  for(let i=0;i<38;i++){const a=i*2.4,r=22+hash(i+salt)*40;add(stage===2?'world-crystal':i%3?'kelp':'coral',Math.cos(a)*r,Math.sin(a)*r,stage===2?.2:.7+hash(i)*.8,a);}
  this.deco=points;
  for(const groupKey of new Set(points.map(p=>p.name+(p.boundary?'|border':'')))){const [name,border]=groupKey.split('|'),asset=this.view.assets[name];if(!asset)continue;asset.updateMatrixWorld(true);const list=points.filter(p=>p.name===name&&!!p.boundary===!!border);asset.traverse(part=>{if(!part.isMesh)return;const plant=['kelp','fan','coral','world-anemone'].includes(name),mat=plant||border?part.material.clone():part.material;if(border)this.cutawayMaterial(mat);if(plant){mat.onBeforeCompile=shader=>{shader.uniforms.oceanTime={value:0};mat.userData.shader=shader;shader.vertexShader='uniform float oceanTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat bend=pow(max(0.,position.y),1.25)*.024; transformed.x+=sin(oceanTime*.8+instanceMatrix[3].x*.14+instanceMatrix[3].z*.09)*bend;');};mat.customProgramCacheKey=()=> 'underburg-kelp-sway';}const mesh=new THREE.InstancedMesh(part.geometry,mat,Math.min(list.length,900));mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.frustumCulled=false;mesh.receiveShadow=true;mesh.castShadow=false;mesh.count=0;this.root.add(mesh);this.groups.push({mesh,points:list,base:part.matrixWorld.clone(),name,ownedMaterial:!!(plant||border)});});}
  for(let i=0;i<24;i++)this.bubbles.push({x:(hash(i+salt+880)-.5)*760,z:(hash(i+salt+960)-.5)*760});this.cull(0,0,true);
 }
 cull(x,z,force=false){const extentX=Math.max(65,Math.abs(this.view.camera.right)+26),extentZ=Math.max(75,Math.abs(this.view.camera.top)*1.4+32),extentKey=extentX+'/'+extentZ;if(!force&&extentKey===this.extentKey&&this.lastCull.distanceToSquared(new THREE.Vector2(x,z))<16)return;this.extentKey=extentKey;this.extents={x:extentX,z:extentZ};this.lastCull.set(x,z);let total=0;for(const g of this.groups){let count=0;for(const p of g.points){if(Math.abs(p.x-x)>extentX||Math.abs(p.z-z)>extentZ)continue;if(count>=g.mesh.instanceMatrix.count)break;this.dummy.position.set(p.x,p.y??height(p.x,p.z,this.stage),p.z);this.dummy.rotation.set(0,p.rotation,0);this.dummy.scale.setScalar(p.scale);this.dummy.updateMatrix();this.matrix.multiplyMatrices(this.dummy.matrix,g.base);g.mesh.setMatrixAt(count++,this.matrix);}g.mesh.count=count;g.mesh.instanceMatrix.needsUpdate=true;total+=count;}this.visibleDecor=total;}
 update(dt,focus,camera,game){this.clock+=dt;this.expeditionView.update(dt,game,focus);this.boundaryUniforms.focus.value.copy(focus);if(this.boundaryLampMaterial){const clearance=window.UBWorld.boundaryDistance(focus.x*10,focus.z*10,this.stage)*.1;this.edgeClearance=clearance;this.boundaryLampMaterial.opacity=clearance<42?.55+Math.pow(Math.sin(this.clock*4.6),2)*.45:.7;}this.caustic.material.uniforms.time.value=this.clock;for(const g of this.groups)if(g.ownedMaterial&&g.mesh.material.userData.shader)g.mesh.material.userData.shader.uniforms.oceanTime.value=this.clock;this.cull(focus.x,focus.z);for(const o of this.landmarks)o.visible=Math.hypot(o.position.x-focus.x,o.position.z-focus.z)<155;for(const s of this.shafts){const d=Math.hypot(s.position.x-focus.x,s.position.z-focus.z);s.visible=d<125;if(s.visible){s.quaternion.copy(camera.quaternion);s.rotateZ(-.23+Math.sin(this.clock*.12+s.userData.phase)*.015);}}
  let n=0;for(const b of this.bubbles){if(Math.hypot(b.x-focus.x,b.z-focus.z)>90)continue;for(let i=0;i<10;i++){if(n>=this.ventBubbles.instanceMatrix.count)break;const t=(this.clock*.32+i*.37)%4,y=height(b.x,b.z,this.stage)+t*4;this.dummy.position.set(b.x+Math.sin(t+i)*.45,y,b.z+Math.cos(i*3+t)*.4);this.dummy.scale.setScalar(.6+t*.24);this.dummy.rotation.set(0,0,0);this.dummy.updateMatrix();this.ventBubbles.setMatrixAt(n++,this.dummy.matrix);}}this.ventBubbles.count=n;this.ventBubbles.instanceMatrix.needsUpdate=true;
 }
 get stats(){return {expedition:this.expeditionView.stats,landmarks:this.landmarks.length,anchoredDecor:this.deco.length,visibleInstances:this.visibleDecor,rootChildren:this.root.children.length,cullExtents:this.extents,floorHalfExtent:650,boundaryTriangles:this.boundaryTriangles,edgeClearance:this.edgeClearance,stage:this.stage};}
}
