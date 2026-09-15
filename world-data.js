(function(scope){
'use strict';
// Map coordinates are simulation units. heightAt alone receives Three.js world units.
const WORLD_ASSETS=['world-bell-tower','world-arch','world-observatory','world-foundry','world-pipeline','world-basalt','world-crystal','world-anemone'];

const MAP_EXTENT=4300,BOUNDARY_SEGMENTS=512,TAU=Math.PI*2;
const EXPANSION_ASSETS=['module-rail','module-vortex','module-flame','module-sonic','enemy-minelayer','enemy-sniper','enemy-carrier','enemy-leech'];
const stageIndex=stage=>Math.max(0,Math.min(2,Math.floor(Number(stage)||0)));
function basinShape(a,stage){
 if(stage===0)return 3810+135*Math.cos(a*2+.3)+65*Math.sin(a*3-.7)+35*Math.cos(a*7+1.1);
 if(stage===1)return 3860+145*Math.sin(a*2+1.1)+65*Math.cos(a*5-.2)+35*Math.sin(a*8+.6);
 return 3830+160*Math.cos(a*3+.8)+65*Math.sin(a*5-1.7)+40*Math.cos(a*9+.4);
}
// This same piecewise-linear inner face is used by collision and the cliff mesh.
// Ray intersections avoid the tiny analytic-curve/triangle mismatch at contact.
const BASINS=[0,1,2].map(stage=>{
 const points=Array.from({length:BOUNDARY_SEGMENTS},(_,i)=>{const a=i/BOUNDARY_SEGMENTS*TAU,r=basinShape(a,stage);return Object.freeze({x:Math.cos(a)*r,y:Math.sin(a)*r});});
 const edges=points.map((p,i)=>{const q=points[(i+1)%points.length],dx=q.x-p.x,dy=q.y-p.y,len=Math.hypot(dx,dy);return Object.freeze({x:p.x,y:p.y,dx,dy,len2:len*len,nx:dy/len,ny:-dx/len});});
 return {points:Object.freeze(points),edges:Object.freeze(edges)};
});
function boundaryRadius(angle,stage=0){
 const a=((Number(angle)||0)%TAU+TAU)%TAU,b=BASINS[stageIndex(stage)],i=Math.min(BOUNDARY_SEGMENTS-1,Math.floor(a/TAU*BOUNDARY_SEGMENTS)),e=b.edges[i],ux=Math.cos(a),uy=Math.sin(a);
 return (e.x*e.dy-e.y*e.dx)/(ux*e.dy-uy*e.dx);
}
function boundaryVertices(stage=0){return BASINS[stageIndex(stage)].points;}
function nearestBoundary(x,y,stage,full=false){
 const edges=BASINS[stageIndex(stage)].edges,a=(Math.atan2(y,x)+TAU)%TAU,center=Math.floor(a/TAU*BOUNDARY_SEGMENTS);
 let best=null,best2=Infinity;const count=full?BOUNDARY_SEGMENTS:17,start=full?0:center-8;
 for(let j=0;j<count;j++){const e=edges[(start+j+BOUNDARY_SEGMENTS)%BOUNDARY_SEGMENTS],t=Math.max(0,Math.min(1,((x-e.x)*e.dx+(y-e.y)*e.dy)/e.len2)),qx=e.x+t*e.dx,qy=e.y+t*e.dy,d2=(x-qx)**2+(y-qy)**2;if(d2<best2){best2=d2;best={x:qx,y:qy,nx:e.nx,ny:e.ny,d:Math.sqrt(d2)};}}
 return best;
}
function boundaryDistance(x,y,stage=0){
 if(!Number.isFinite(x)||!Number.isFinite(y))return 0;
 const distance=nearestBoundary(x,y,stage,true).d;
 return Math.hypot(x,y)<=boundaryRadius(Math.atan2(y,x),stage)?distance:-distance;
}
function constrainToBoundary(entity,stage=0,padding=0){
 if(!entity||!Number.isFinite(entity.x)||!Number.isFinite(entity.y))return entity;
 const clearance=Math.max(0,Number(entity.r)||0)+Math.max(0,Number(padding)||0),st=stageIndex(stage);
 for(let pass=0;pass<4;pass++){
  const d=Math.hypot(entity.x,entity.y),rad=boundaryRadius(Math.atan2(entity.y,entity.x),st),outside=d>rad;
  // Every authored boundary slope is <0.4; this conservative radial rejection
  // skips distant interior entities while preserving exact near-wall circles.
  if(!outside&&rad-d>clearance*1.35+3)return entity;
  const hit=nearestBoundary(entity.x,entity.y,st,outside&&d-rad>500);
  if(!outside&&hit.d>=clearance-.0001)return entity;
  let nx=hit.nx,ny=hit.ny;
  if(hit.d>.000001){const sign=outside?1:-1;nx=(entity.x-hit.x)/hit.d*sign;ny=(entity.y-hit.y)/hit.d*sign;}
  entity.x=hit.x-nx*(clearance+.02);entity.y=hit.y-ny*(clearance+.02);
  if(Number.isFinite(entity.vx)&&Number.isFinite(entity.vy)){const outward=entity.vx*nx+entity.vy*ny;if(outward>0){entity.vx-=outward*nx;entity.vy-=outward*ny;}}
 }
 return entity;
}

const REGIONS=[
 {id:'gardens',sites:[
  ['glockenhafen','Glockenhafen','Bell Harbor','world-bell-tower',520,-.86,1,50],
  ['hansebogen','Hansebogen','The Hanse Arch','world-arch',1420,.62,1.12,0],
  ['glasgarten','Glasgarten','The Glass Gardens','world-observatory',2010,-2.08,.95,65],
  ['korallenhain','Korallenhain','Coral Sanctuary','world-anemone',2750,2.60,1.16,50],
  ['bernsteinwarte','Bernsteinwarte','Amber Observatory','world-observatory',3250,-.35,1.14,65]
 ]},
 {id:'iron',sites:[
  ['kaiserwerk','Kaiserwerk','The Imperial Foundry','world-foundry',540,-.83,.93,90],
  ['dampfader','Dampfader','The Steam Vein','world-pipeline',1440,1.15,1.12,80],
  ['werfttor','Werfttor','Shipyard Gate','world-arch',2060,-2.33,1.2,0],
  ['eisenglocke','Eisenglocke','The Iron Bell','world-bell-tower',2760,.06,1.06,50],
  ['schmelzkessel','Schmelzkessel','The Crucible','world-foundry',3280,2.61,1.08,90]
 ]},
 {id:'trench',sites:[
  ['nachtwarte','Nachtwarte','The Night Watch','world-observatory',530,-.91,.98,65],
  ['schwarzdom','Schwarzdom','The Black Cathedral','world-basalt',1490,.75,1.13,60],
  ['sternenschlund','Sternenschlund','The Starlit Chasm','world-crystal',2120,-2.37,1.18,60],
  ['schattentor','Schattentor','The Shadow Gate','world-arch',2810,2.46,1.05,0],
  ['tiefenkrone','Tiefenkrone','Crown of the Deep','world-crystal',3260,-.04,1.34,60]
 ]}
];
function createWorld(stage=0,seed=1){
 stage=Math.max(0,Math.min(2,Math.floor(Number(stage)||0)));seed=Number(seed)>>>0;
 let state=(seed^Math.imul(stage+1,0x9e3779b9))>>>0;
 const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const region=REGIONS[stage],turn=(rand()-.5)*.16;
 const landmarks=region.sites.map(([key,name,english,model,baseR,baseA,scale,solidRadius],i)=>{
  solidRadius=Math.round(solidRadius*scale);
  const a=baseA+turn+(rand()-.5)*.09,r=baseR+(rand()-.5)*(i?54:26);
  const x=Math.round(Math.cos(a)*r),y=Math.round(Math.sin(a)*r),rotation=a+Math.PI/2+(rand()-.5)*.22;
  // A seaward courtyard keeps the reward outside the monument's collision footprint.
  const courtyardDistance=solidRadius+112,ca=a+Math.PI+(i%2?-.22:.22);
  return {id:region.id+'-'+key,name,english,model,x,y,scale,rotation,solidRadius,
   radius:Math.max(180,solidRadius+122),
   courtyard:{x:Math.round(x+Math.cos(ca)*courtyardDistance),y:Math.round(y+Math.sin(ca)*courtyardDistance),radius:75},
   gold:12+i*2};
 });
 return {stage,seed,region:region.id,extent:MAP_EXTENT,boundarySegments:BOUNDARY_SEGMENTS,landmarks};
}
function heightAt(x,z,stage=0){
 // Broad, continuous shelves and two gentle channels; the entire navigable floor stays submerged.
 const a=[.23,-.57,.92][Math.max(0,Math.min(2,Math.floor(stage)))],u=x*Math.cos(a)+z*Math.sin(a),v=-x*Math.sin(a)+z*Math.cos(a);
 const shelf=.55+.42*Math.sin(u*.034+stage*1.7)*Math.cos(v*.028)+.26*Math.sin(u*.061-v*.042);
 const channelCenter=12*Math.sin(u*.025+stage*.8),crossCenter=20*Math.sin(v*.019+1.4);
 const mainChannel=Math.exp(-Math.pow((v-channelCenter)/(stage===2?10:13),2));
 const crossChannel=Math.exp(-Math.pow((u-crossCenter-64)/(stage===1?11:16),2));
 return Math.max(-6,Math.min(-.65,-.92-shelf-3.65*mainChannel-1.25*crossChannel));
}
const api={WORLD_ASSETS,EXPANSION_ASSETS,MAP_EXTENT,BOUNDARY_SEGMENTS,boundaryRadius,boundaryVertices,boundaryDistance,constrainToBoundary,createWorld,heightAt};scope.UBWorld=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
