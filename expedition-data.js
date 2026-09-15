(function(scope){
'use strict';
const W=typeof module!=='undefined'?require('./world-data.js'):scope.UBWorld;
const TAU=Math.PI*2,KINDS=Object.freeze(['bastion','salvage','beacon','shrine']);
const PREFIX=['gardens','iron','trench'];
const NAMES=[
 {bastion:[['Zollfeste','Customs Bastion'],['Hansebollwerk','Hanse Bulwark']],salvage:[['Alte Hansekogge','Old Hanse Cog'],['Bernsteinwrack','Amber Wreck']],beacon:[['Glockenpeiler','Bell Sounding Station'],['Nordlichtpeiler','Northern Light Beacon']],shrine:[['Eidstein der Tiefe','Oathstone of the Deep'],['Seefahrerschrein','Mariners’ Shrine']]},
 {bastion:[['Schlackentor','Slag Gate'],['Eisenwacht','Iron Watch']],salvage:[['Kesselwrack','Boiler Wreck'],['Versunkene Werft','Sunken Shipyard']],beacon:[['Dampfpeiler','Steam Sounding Station'],['Signalwerk','Signal Works']],shrine:[['Ambosseid','Oath of the Anvil'],['Schmiedeschrein','Smiths’ Shrine']]},
 {bastion:[['Nachtzwinger','Night Citadel'],['Kronenbastion','Crown Bastion']],salvage:[['Kaiserwrack','Imperial Wreck'],['Sternenkogge','Star Cog']],beacon:[['Runenpeiler','Rune Sounding Station'],['Schwarzes Leuchtfeuer','Black Beacon']],shrine:[['Sterneneid','Oath of the Stars'],['Schrein der Letzten Wache','Shrine of the Last Watch']]}
];
const walls=[];
for(let v=-96;v<=96;v+=32){walls.push([-120,v,16],[v,-120,16],[v,120,16]);}
for(const x of [-120,120])for(const y of [-120,120])walls.push([x,y,17]);
walls.push([120,-104,18],[120,104,18],[120,-83,8],[120,83,8]);
for(const [x,y] of [[-63,-95.5],[-49,-95.5],[-35,-95.5],[8,-95.5],[20,-95.5],[32,-95.5],[-71,95],[-54,95],[-37,95]])walls.push([x,y,10]);
const TYPES=Object.freeze({
 bastion:Object.freeze({r:200,duration:12,model:'site-bastion',gold:70,goldPerStage:15,court:[0,0],solids:walls}),
 salvage:Object.freeze({r:170,duration:18,model:'site-salvage',gold:95,goldPerStage:20,court:[0,115],solids:[[-98,0,14],[-76,0,20.5],[-51,0,24.5],[-30,0,22.5],[49,-15,21],[72,-15,18.5],[90,-15,13],[-78,46,8],[-48,46,8]]}),
 beacon:Object.freeze({r:140,duration:10,model:'site-beacon',gold:0,goldPerStage:0,court:[80,0],solids:[[0,0,18.5],[-34,0,18]]}),
 shrine:Object.freeze({r:160,duration:4,model:'site-shrine',gold:35,goldPerStage:15,court:[105,0],solids:[[-26,0,26.5],[7,0,26.5],[34.5,-25,9.5],[34.5,25,9.5]]})
});
// Rotation follows THREE.Object3D.rotation.y: model +X rotates toward simulation -Y.
function point(site,x,y){const c=Math.cos(site.rotation),s=Math.sin(site.rotation);return {x:site.x+x*c+y*s,y:site.y-x*s+y*c};}
function createSites(stage=0,worldSeed=1){
 stage=Math.max(0,Math.min(2,Math.floor(Number(stage)||0)));let seed=((Number(worldSeed)>>>0)^Math.imul(stage+1,0x9e3779b1)^0x71be53d9)>>>0;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const world=W.createWorld(stage,worldSeed),sites=[],phase=rand()*TAU;
 const layout=[['beacon',760],['salvage',1100],['bastion',1450],['shrine',1800],['beacon',2260],['salvage',2730],['bastion',2900],['shrine',3140]],counts={};
 for(let i=0;i<layout.length;i++){
  const [kind,baseRadius]=layout[i],def=TYPES[kind],ordinal=counts[kind]||0;counts[kind]=ordinal+1;let candidate;
  for(let attempt=0;attempt<160;attempt++){
   const angle=phase+i*2.399963+attempt*.31,radius=Math.max(720,Math.min(3250,baseRadius+(rand()-.5)*(attempt?650:100)));
   const p={x:Math.cos(angle)*radius,y:Math.sin(angle)*radius};
   if(W.boundaryDistance(p.x,p.y,stage)<def.r+220)continue;
   if(world.landmarks.some(l=>Math.hypot(p.x-l.x,p.y-l.y)<def.r+(l.solidRadius||70)+170))continue;
   if(sites.some(s=>Math.hypot(p.x-s.x,p.y-s.y)<def.r+s.r+240))continue;
   candidate=p;break;
  }
  if(!candidate)throw new Error('Unable to place reachable expedition site '+kind);
  const [name,english]=NAMES[stage][kind][ordinal],site={id:PREFIX[stage]+'-site-'+kind+'-'+(ordinal+1),kind,name,english,...candidate,r:def.r,model:def.model,rotation:rand()*TAU,status:'available',progress:0,duration:def.duration,discovered:false,guardIds:[],guardKills:[],wave:0,incomeT:0,rewarded:false};
  site.courtyard=point(site,...def.court);site.solids=def.solids.map(([x,y,r])=>({...point(site,x,y),r}));sites.push(site);
 }
 return sites;
}
const api={KINDS,TYPES,createSites,point};scope.UBExpedition=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
