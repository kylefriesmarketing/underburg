import * as THREE from './assets/lib/three.module.js';

const vertex = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const reconstruct = `
vec3 viewAt(vec2 uv,float depth){
 vec4 p=inverseProjection*vec4(uv*2.-1.,depth*2.-1.,1.);
 return p.xyz/p.w;
}`;
const blurShader = `
varying vec2 vUv;
uniform sampler2D source;
uniform vec2 stepUV;
uniform float extractBright;
vec3 sampleLight(vec2 uv){
 vec3 c=texture2D(source,uv).rgb;
 float b=max(c.r,max(c.g,c.b));
 float knee=clamp(b-.4,0.,1.4);
 float light=max(knee*knee/2.8,b-1.1)/max(b,.0001);
 return c*mix(1.,light,extractBright);
}
void main(){
 vec3 c=sampleLight(vUv)*.227027;
 c+=(sampleLight(vUv+stepUV*1.384615)+sampleLight(vUv-stepUV*1.384615))*.316216;
 c+=(sampleLight(vUv+stepUV*3.230769)+sampleLight(vUv-stepUV*3.230769))*.070270;
 gl_FragColor=vec4(c,1.);
}`;
const contactShader = `
varying vec2 vUv;
uniform sampler2D depthSource;
uniform mat4 inverseProjection;
uniform vec2 projectionScale;
uniform float orthographic;
uniform int tapCount;
${reconstruct}
void main(){
 float depth=texture2D(depthSource,vUv).r;
 if(depth>=.999999){gl_FragColor=vec4(1.,1.,1.,0.);return;}
 vec3 center=viewAt(vUv,depth);
 vec3 n=cross(dFdx(center),dFdy(center));
 n/=max(length(n),.00001);
 if(n.z<0.)n=-n;
 float radius=2.15;
 vec2 reach=projectionScale*radius*.5/mix(max(-center.z,1.),1.,orthographic);
 float occlusion=0.;
 for(int i=0;i<8;i++){
  if(i>=tapCount)break;
  float angle=(float(i)+.375)*6.2831853/float(tapCount);
  vec2 uv=clamp(vUv+vec2(cos(angle),sin(angle))*reach,vec2(.001),vec2(.999));
  float d=texture2D(depthSource,uv).r;
  vec3 delta=viewAt(uv,d)-center;
  float distanceToSample=length(delta);
  float horizon=max(dot(n,delta)/max(distanceToSample,.0001)-.13,0.);
  float falloff=1.-smoothstep(radius*.3,radius*1.8,distanceToSample);
  occlusion+=horizon*falloff*step(d,.999998);
 }
 float visibility=max(.82,1.-occlusion/float(tapCount)*.75);
 gl_FragColor=vec4(vec3(visibility),-center.z);
}`;
const combineShader = `
varying vec2 vUv;
uniform sampler2D source,bloom,farBloom,depthSource,contactSource;
uniform mat4 inverseProjection,cameraWorld;
uniform vec2 texel,contactTexel,resolution;
uniform float glow,waterAmount,contactAmount,gradeAmount,vignetteAmount,eyeY,cinematic;
uniform vec3 waterColor,grade;
uniform vec2 ringCenter[4];
uniform vec4 ringBasis[4],ringData[4];
${reconstruct}
float contactAt(vec2 uv,float distanceToEye){
 vec4 a=texture2D(contactSource,uv);
 float valid=1.-smoothstep(.7,2.8,abs(a.a-distanceToEye));
 return mix(1.,a.r,valid);
}
void main(){
 vec2 offsetPixels=vec2(0.);
 for(int i=0;i<4;i++){
  vec4 data=ringData[i];
  vec4 basis=ringBasis[i];
  float det=basis.x*basis.w-basis.y*basis.z;
  if(data.w>.5&&abs(det)>.00000001){
   vec2 d=vUv-ringCenter[i];
   vec2 q=vec2(basis.w*d.x-basis.z*d.y,-basis.y*d.x+basis.x*d.y)/det;
   float band=(length(q)-data.x)/data.z;
   float wave=sin(band*3.14159265)*exp(-band*band*1.6);
   vec2 direction=d*resolution;
   offsetPixels+=direction/max(length(direction),.001)*wave*data.y*5.;
  }
 }
 offsetPixels*=min(1.,8./max(length(offsetPixels),.001));
 vec2 uv=clamp(vUv+offsetPixels*texel,texel,vec2(1.)-texel);
 vec3 c=texture2D(source,uv).rgb;
 float depth=texture2D(depthSource,uv).r;
 if(depth<.999999){
  vec3 p=viewAt(uv,depth);
  float contact=contactAt(uv,-p.z);
  if(cinematic>.5){
   contact=contact*.5+(contactAt(uv+vec2(contactTexel.x,0.),-p.z)+contactAt(uv-vec2(contactTexel.x,0.),-p.z)+contactAt(uv+vec2(0.,contactTexel.y),-p.z)+contactAt(uv-vec2(0.,contactTexel.y),-p.z))*.125;
  }
  c*=mix(1.,contact,contactAmount);
  vec3 world=(cameraWorld*vec4(p,1.)).xyz;
  float fraction=clamp((32.-world.y)/max(1.,eyeY-world.y),0.,1.);
  float waterPath=min(length(p)*fraction,95.);
  float highlight=1.-smoothstep(1.,3.,max(c.r,max(c.g,c.b)))*.55;
  vec3 transmission=exp(-vec3(.008,.0035,.0026)*waterPath*waterAmount*highlight);
  c=c*transmission+waterColor*(vec3(1.)-transmission)*.55;
 }
 float luminance=dot(c,vec3(.2126,.7152,.0722));
 c=mix(c,mix(vec3(luminance),c*grade,.985),gradeAmount);
 vec3 softLight=texture2D(bloom,uv).rgb*.65+texture2D(farBloom,uv).rgb*.35;
 c+=softLight*glow;
 vec2 edge=(vUv-.5)*2.;
 c*=1.-vignetteAmount*smoothstep(.2,1.8,dot(edge,edge));
 gl_FragColor=vec4(max(c,vec3(0.)),1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const QUALITY=['low','balanced','cinematic'];
const WATER=[[.055,.19,.21],[.055,.115,.19],[.085,.075,.18]];
const GRADE=[[1.014,1.022,1.015],[.99,1.012,1.03],[.985,1.003,1.035]];
function material(fragmentShader,uniforms,toneMapped=false){
 return new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader,uniforms,depthTest:false,depthWrite:false,toneMapped});
}

/** One HDR geometry pass. Depth, bloom and pressure effects reuse bounded targets. */
export class OceanPost{
 constructor(renderer){
  this.renderer=renderer;
  this.hdr=!!(renderer.capabilities.isWebGL2&&renderer.extensions.has('EXT_color_buffer_float'));
  this.quality='balanced';this.distortion=true;this.reducedMotion=false;
  this.mode='menu';this.stage=0;this.enabled=this.hdr;this.disposed=false;
  this.size=new THREE.Vector2();this.resizeCount=0;this.pulses=[];
  this.emittedPulses=0;this.clearedPulses=0;this.expiredPulses=0;this.droppedPulses=0;
  this.stats={calls:0,triangles:0,scenePasses:0,postPasses:0};
  const type=this.hdr?THREE.HalfFloatType:THREE.UnsignedByteType;
  this.target=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:true,stencilBuffer:false});
  this.target.samples=this.hdr?Math.min(2,renderer.capabilities.maxSamples):0;
  if(this.hdr){
   this.target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
   this.target.depthTexture.minFilter=THREE.NearestFilter;
   this.target.depthTexture.magFilter=THREE.NearestFilter;
  }
  this.bright=new THREE.WebGLRenderTarget(1,1,{type,depthBuffer:false});
  this.blur=this.bright.clone();this.farBright=this.bright.clone();this.farBlur=this.bright.clone();this.contact=this.bright.clone();
  this.targets=[this.target,this.bright,this.blur,this.farBright,this.farBlur,this.contact];
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();
  this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2));this.quad.frustumCulled=false;this.scene.add(this.quad);
  const blur=(source,extractBright=0)=>material(blurShader,{source:{value:source},stepUV:{value:new THREE.Vector2()},extractBright:{value:extractBright}});
  this.extract=blur(this.target.texture,1);this.horizontal=blur(this.bright.texture);
  this.farHorizontal=blur(this.blur.texture);this.farVertical=blur(this.farBright.texture);
  this.inverseProjection=new THREE.Matrix4();this.cameraWorld=new THREE.Matrix4();
  this.contactMaterial=material(contactShader,{
   depthSource:{value:this.target.depthTexture},inverseProjection:{value:this.inverseProjection},
   projectionScale:{value:new THREE.Vector2()},orthographic:{value:1},tapCount:{value:6}
  });
  this.combine=material(combineShader,{
   source:{value:this.target.texture},bloom:{value:this.blur.texture},farBloom:{value:this.farBlur.texture},
   depthSource:{value:this.target.depthTexture},contactSource:{value:this.contact.texture},
   inverseProjection:{value:this.inverseProjection},cameraWorld:{value:this.cameraWorld},
   texel:{value:new THREE.Vector2()},contactTexel:{value:new THREE.Vector2()},resolution:{value:new THREE.Vector2()},
   glow:{value:.2},waterAmount:{value:0},contactAmount:{value:0},gradeAmount:{value:0},
   vignetteAmount:{value:0},eyeY:{value:1},cinematic:{value:0},
   waterColor:{value:new THREE.Vector3()},grade:{value:new THREE.Vector3(1,1,1)},
   ringCenter:{value:Array.from({length:4},()=>new THREE.Vector2())},
   ringBasis:{value:Array.from({length:4},()=>new THREE.Vector4())},
   ringData:{value:Array.from({length:4},()=>new THREE.Vector4())}
  },true);
  this.materials=[this.extract,this.horizontal,this.farHorizontal,this.farVertical,this.contactMaterial,this.combine];
  this.projected=Array.from({length:4},()=>({active:false,x:0,y:0,radiusX:0,radiusY:0}));
  this.origin=new THREE.Vector3();this.edgeX=new THREE.Vector3();this.edgeZ=new THREE.Vector3();
  this.resize();this.update(0,{mode:'menu',stage:0});
 }
 configure(options={}){
  if(QUALITY.includes(options.quality))this.quality=options.quality;
  if(typeof options.distortion==='boolean')this.distortion=options.distortion;
  if(typeof options.reducedMotion==='boolean')this.reducedMotion=options.reducedMotion;
  this.enabled=this.hdr&&this.quality!=='low'&&!this.disposed;
  if(!this.enabled||!this.distortion||this.reducedMotion)this.clear();
  this.contactMaterial.uniforms.tapCount.value=this.quality==='cinematic'?8:6;
  this.combine.uniforms.cinematic.value=this.quality==='cinematic'?1:0;
  this.setKernelSteps();this.resize();return this.state;
 }
 setKernelSteps(){
  const w=this.target.width,h=this.target.height,hw=this.bright.width,hh=this.bright.height;
  const far=this.quality==='cinematic'?1.28:1.;
  this.extract.uniforms.stepUV.value.set(1/w,0);
  this.horizontal.uniforms.stepUV.value.set(0,1/hh);
  this.farHorizontal.uniforms.stepUV.value.set(2*far/hw,0);
  this.farVertical.uniforms.stepUV.value.set(0,far/this.farBright.height);
 }
 resize(){
  if(!this.enabled||this.disposed)return false;
  this.renderer.getDrawingBufferSize(this.size);
  const w=Math.max(1,Math.floor(this.size.x)),h=Math.max(1,Math.floor(this.size.y));
  if(w===this.target.width&&h===this.target.height)return false;
  const hw=Math.max(1,w>>1),hh=Math.max(1,h>>1),qw=Math.max(1,w>>2),qh=Math.max(1,h>>2);
  this.target.setSize(w,h);this.bright.setSize(hw,hh);this.blur.setSize(hw,hh);
  this.farBright.setSize(qw,qh);this.farBlur.setSize(qw,qh);this.contact.setSize(hw,hh);
  this.combine.uniforms.texel.value.set(1/w,1/h);this.combine.uniforms.contactTexel.value.set(1/hw,1/hh);
  this.combine.uniforms.resolution.value.set(w,h);this.setKernelSteps();this.resizeCount++;return true;
 }
 update(dt,options={}){
  const previousMode=this.mode,previousStage=this.stage;
  if(['ocean','menu','atlas'].includes(options.mode))this.mode=options.mode;
  if(Number.isFinite(options.stage))this.stage=clamp(Math.floor(options.stage),0,2);
  if(typeof options.reducedMotion==='boolean')this.reducedMotion=options.reducedMotion;
  if(this.mode!=='ocean'||this.reducedMotion||!this.distortion||previousStage!==this.stage||previousMode!==this.mode)this.clear();
  const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;
  for(let i=this.pulses.length-1;i>=0;i--){this.pulses[i].age+=elapsed;if(this.pulses[i].age>=this.pulses[i].life){this.pulses.splice(i,1);this.expiredPulses++;}}
  const u=this.combine.uniforms,amount=this.mode==='ocean'?1:this.mode==='menu'?.18:.08;
  u.waterAmount.value=.28*amount;u.contactAmount.value=this.mode==='ocean'?.85:this.mode==='menu'?.45:.25;
  u.gradeAmount.value=amount;u.vignetteAmount.value=.025*amount;
  u.waterColor.value.fromArray(WATER[this.stage]);u.grade.value.fromArray(GRADE[this.stage]);
 }
 pulse({x,y,r=400,strength=.8,life=.9,kind='pressure'}={}){
  if(!this.enabled||!this.distortion||this.reducedMotion||this.mode!=='ocean'||![x,y,r,strength,life].every(Number.isFinite)||r<=0||strength<=0||life<=0)return false;
  if(this.pulses.length===4){this.pulses.shift();this.droppedPulses++;}
  this.emittedPulses++;
  this.pulses.push({x,y,r:clamp(r,20,1800),strength:clamp(strength,0,1.5),life:clamp(life,.2,3),kind:String(kind),age:0});return true;
 }
 clear(){
  this.clearedPulses+=this.pulses.length;this.pulses.length=0;
  if(this.combine)for(const d of this.combine.uniforms.ringData.value)d.set(0,0,0,0);
  if(this.projected)for(const p of this.projected)p.active=false;
 }
 projectPulses(camera){
  const u=this.combine.uniforms;
  for(let i=0;i<4;i++){
   const pulse=this.pulses[i],out=this.projected[i];out.active=false;u.ringData.value[i].set(0,0,0,0);
   if(!pulse||this.mode!=='ocean'||this.reducedMotion||!this.distortion)continue;
   const x=pulse.x*.1,z=pulse.y*.1,r=pulse.r*.1;
   this.origin.set(x,3.2,z).project(camera);this.edgeX.set(x+r,3.2,z).project(camera);this.edgeZ.set(x,3.2,z+r).project(camera);
   if(!Number.isFinite(this.origin.x)||this.origin.z<-1||this.origin.z>1)continue;
   const cx=this.origin.x*.5+.5,cy=this.origin.y*.5+.5;
   const dx=(this.edgeX.x-this.origin.x)*.5,dy=(this.edgeX.y-this.origin.y)*.5;
   const zx=(this.edgeZ.x-this.origin.x)*.5,zy=(this.edgeZ.y-this.origin.y)*.5;
   if(Math.abs(dx*zy-dy*zx)<1e-8)continue;
   const progress=pulse.age/pulse.life,fade=Math.sin(Math.min(1,progress*8)*Math.PI*.5)*(1-progress);
   u.ringCenter.value[i].set(cx,cy);u.ringBasis.value[i].set(dx,dy,zx,zy);
   u.ringData.value[i].set(progress,pulse.strength*fade,clamp(2.5/r,.035,.18),1);
   Object.assign(out,{active:true,x:cx,y:cy,radiusX:Math.hypot(dx,zx),radiusY:Math.hypot(dy,zy)});
  }
 }
 render(scene,camera){
  if(this.disposed)return;
  const r=this.renderer;
  if(!this.enabled){
   r.setRenderTarget(null);r.render(scene,camera);
   Object.assign(this.stats,{calls:r.info.render.calls,triangles:r.info.render.triangles,scenePasses:1,postPasses:0});return;
  }
  this.resize();
  // r160 resolves the attached depth texture with color during this MSAA target's blit.
  // Ordinary render targets remain linear; only the final screen material is tone mapped.
  r.setRenderTarget(this.target);r.render(scene,camera);
  const calls=r.info.render.calls,triangles=r.info.render.triangles;
  this.inverseProjection.copy(camera.projectionMatrixInverse);this.cameraWorld.copy(camera.matrixWorld);
  const p=camera.projectionMatrix.elements;
  this.contactMaterial.uniforms.projectionScale.value.set(Math.abs(p[0]),Math.abs(p[5]));
  this.contactMaterial.uniforms.orthographic.value=camera.isOrthographicCamera?1:0;
  this.combine.uniforms.eyeY.value=camera.matrixWorld.elements[13];this.projectPulses(camera);
  const pass=(target,mat)=>{r.setRenderTarget(target);this.quad.material=mat;r.render(this.scene,this.camera);};
  pass(this.bright,this.extract);pass(this.blur,this.horizontal);
  pass(this.farBright,this.farHorizontal);pass(this.farBlur,this.farVertical);
  pass(this.contact,this.contactMaterial);pass(null,this.combine);
  Object.assign(this.stats,{calls:calls+6,triangles:triangles+12,scenePasses:1,postPasses:6});
 }
 get state(){
  return {quality:this.quality,requestedQuality:this.quality,effectiveQuality:this.enabled?this.quality:'low',
   hdr:this.hdr,depth:!!this.target.depthTexture,enabled:this.enabled,distortion:this.distortion,reducedMotion:this.reducedMotion,
   mode:this.mode,stage:this.stage,rings:this.pulses.length,emittedPulses:this.emittedPulses,clearedPulses:this.clearedPulses,expiredPulses:this.expiredPulses,droppedPulses:this.droppedPulses,pulses:this.pulses.map(p=>({...p})),projected:this.projected.map(p=>({...p})),
   scenePasses:this.stats.scenePasses,postPasses:this.stats.postPasses,samples:this.target.samples,contactTaps:this.contactMaterial.uniforms.tapCount.value,
   targetCount:this.targets.length,resizeCount:this.resizeCount,targetSizes:{scene:[this.target.width,this.target.height],near:[this.bright.width,this.bright.height],far:[this.farBright.width,this.farBright.height],contact:[this.contact.width,this.contact.height]}};
 }
 dispose(){
  if(this.disposed)return;this.clear();this.disposed=true;this.enabled=false;
  for(const target of this.targets)target.dispose();
  for(const mat of this.materials)mat.dispose();this.quad.geometry.dispose();this.scene.remove(this.quad);
 }
}
