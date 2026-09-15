(function(scope){
'use strict';
// Map coordinates are simulation units. heightAt alone receives Three.js world units.
const WORLD_ASSETS=['world-bell-tower','world-arch','world-observatory','world-foundry','world-pipeline','world-basalt','world-crystal','world-anemone'];
const REGIONS=[
 {id:'gardens',sites:[
  ['glockenhafen','Glockenhafen','Bell Harbor','world-bell-tower',520,-.86,1,50],
  ['hansebogen','Hansebogen','The Hanse Arch','world-arch',870,.62,1.12,0],
  ['glasgarten','Glasgarten','The Glass Gardens','world-observatory',1120,-2.08,.95,65],
  ['korallenhain','Korallenhain','Coral Sanctuary','world-anemone',1430,2.60,1.16,50],
  ['bernsteinwarte','Bernsteinwarte','Amber Observatory','world-observatory',1760,-.35,1.14,65]
 ]},
 {id:'iron',sites:[
  ['kaiserwerk','Kaiserwerk','The Imperial Foundry','world-foundry',540,-.83,.93,90],
  ['dampfader','Dampfader','The Steam Vein','world-pipeline',860,1.15,1.12,80],
  ['werfttor','Werfttor','Shipyard Gate','world-arch',1170,-2.33,1.2,0],
  ['eisenglocke','Eisenglocke','The Iron Bell','world-bell-tower',1480,.06,1.06,50],
  ['schmelzkessel','Schmelzkessel','The Crucible','world-foundry',1740,2.61,1.08,90]
 ]},
 {id:'trench',sites:[
  ['nachtwarte','Nachtwarte','The Night Watch','world-observatory',530,-.91,.98,65],
  ['schwarzdom','Schwarzdom','The Black Cathedral','world-basalt',900,.75,1.13,60],
  ['sternenschlund','Sternenschlund','The Starlit Chasm','world-crystal',1200,-2.37,1.18,60],
  ['schattentor','Schattentor','The Shadow Gate','world-arch',1510,2.46,1.05,0],
  ['tiefenkrone','Tiefenkrone','Crown of the Deep','world-crystal',1770,-.04,1.34,60]
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
 return {stage,seed,region:region.id,landmarks};
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
const api={WORLD_ASSETS,createWorld,heightAt};scope.UBWorld=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
