(function(scope){
'use strict';
const own=(o,k)=>!!o&&Object.hasOwn(o,k),bounded=(v,min,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const rows=[
 ['glockenhafen','Glockenhafen','Bell Harbor',0,1,0,['harbor'],['harbor'],'world-bell-tower',1,'The harbor bell still rings beneath the tide. Reclaim the first sea lane for the Hanse fleet.','Der Hafenknecht',90,800,.9,.9,.95,1.05,30],
 ['korallenhof','Korallenhof','Coral Court',0,1,1,['glockenhafen'],['glockenhafen'],'world-anemone',1,'Lantern anemones grow through a sunken merchant court. Follow their light and drive out its squatter.','Die Korallenhüterin',100,1000,.95,.85,1,1.15,35],
 ['hansebogen','Hansebogen','The Hanse Arch',0,2,-1,['glockenhafen'],['glockenhafen'],'world-arch',2,'Smugglers race through the stone trading gate. Hold a steady course as their fast cutters close in.','Der Zollbrecher',110,1250,1,1,1.12,1.1,40],
 ['glasgarten','Glasgarten','Glass Gardens',0,2,0,['korallenhof','hansebogen'],['korallenhof','hansebogen'],'world-observatory',2,'Cracked observation domes shelter a rich salvage field. Armored patrols have claimed the glasshouses.','Die Glasmacherin',110,1200,1.15,.9,.95,1.2,45],
 ['bernsteinwarte','Bernsteinwarte','Amber Observatory',0,3,-1,['glasgarten'],['glasgarten'],'world-observatory',2,'Amber lenses reveal the route into the iron sea. Silence the watch fortress and recover its charts.','Der Bernsteinvogt',120,1500,1.1,1.1,1,1.15,55],
 ['kaiserwerk','Kaiserwerk','Imperial Foundry',1,3,0,['bernsteinwarte'],['bernsteinwarte'],'world-foundry',3,'The imperial furnaces glow again. Their slow, plated defenders carry enough salvage to forge a new fleet.','Der Hochofenmeister',125,1750,1.2,1.1,.9,1.3,65],
 ['dampfader','Dampfader','The Steam Vein',1,2,1,['kaiserwerk'],['kaiserwerk'],'world-pipeline',3,'Pressure pipes cross an exposed service trench. Interceptor boats run hot along the steam current.','Die Ventilkönigin',120,1700,.95,1.15,1.18,1.2,65],
 ['eisenglocke','Eisenglocke','The Iron Bell',1,3,1,['kaiserwerk'],['kaiserwerk'],'world-bell-tower',3,'An iron alarm summons reinforced hulls from the yards. Break the bell keeper before the next shift arrives.','Der Eisengießer',130,1900,1.25,1.05,1,1.2,70],
 ['werfttor','Werfttor','Shipyard Gate',1,2,2,['dampfader','eisenglocke'],['dampfader','eisenglocke'],'world-arch',3,'Abandoned gantries form the entrance to the old navy yard. Take the gate and open a second supply route.','Die Werftmarschallin',125,1800,1.15,1.15,1.05,1.25,75],
 ['schmelzkessel','Schmelzkessel','The Crucible',1,3,2,['werfttor','eisenglocke'],['werfttor','eisenglocke'],'world-foundry',4,'The last great furnace feeds a fortress of riveted armor. Seize its deepwater lift into the black trench.','Der Schlackenkönig',140,2300,1.35,1.2,1,1.3,90],
 ['nachtwarte','Nachtwarte','The Night Watch',2,4,1,['schmelzkessel'],['schmelzkessel'],'world-observatory',4,'A silent observatory marks the descent. Its sentries strike harder in the dark, but their holds are full.','Die Nachtwächterin',140,2300,1.2,1.25,1.08,1.25,95],
 ['schwarzdom','Schwarzdom','Black Cathedral',2,4,0,['nachtwarte'],['nachtwarte'],'world-basalt',4,'Basalt spires shelter ponderous armored guardians. Circle the black nave and dismantle their procession.','Der Basaltabt',150,2600,1.5,1.1,.85,1.3,100],
 ['sternenschlund','Sternenschlund','Starlit Chasm',2,5,0,['nachtwarte','schwarzdom'],['nachtwarte','schwarzdom'],'world-crystal',4,'Luminous crystals draw swift raiders into the chasm. Their glittering cargo rewards an aggressive course.','Die Sternenjägerin',140,2400,1.1,1.2,1.2,1.35,105],
 ['schattentor','Schattentor','The Shadow Gate',2,4,2,['nachtwarte'],['nachtwarte'],'world-arch',5,'A broken triumphal arch guards the royal approach. The final guard carries heavy guns and heavier treasure.','Der Schattenadmiral',150,2900,1.3,1.35,1.1,1.4,115],
 ['tiefenkrone','Tiefenkrone','Crown of the Deep',2,5,1,['sternenschlund','schattentor'],['sternenschlund','schattentor'],'world-crystal',5,'The crown fortress waits among the deepest crystal towers. Defeat its sovereign and reunite the sunken sea lanes.','Der Tiefenkaiser',165,3400,1.45,1.3,1.08,1.5,150]
];
const pct=n=>{const v=Math.round((n-1)*100);return v===0?'standard':(v>0?'+':'')+v+'%';};
const NODES=[{id:'harbor',name:'Heimathafen',english:'Home Harbor',stage:0,kind:'harbor',q:0,r:0,links:['glockenhafen'],requires:[],model:'world-bell-tower',difficulty:1,desc:'The Hanse fleet begins here. Choose a cleared sea lane, refit your citadel, and chart the next expedition.',objective:'Chart the sunken sea lanes.',condition:'Safe harbor',reward:0,boss:'',bossAt:0,bossHP:0,enemyHp:1,enemyDamage:1,enemySpeed:1,goldMult:1}];
for(const [id,name,english,stage,q,r,links,requires,model,difficulty,desc,boss,bossAt,bossHP,enemyHp,enemyDamage,enemySpeed,goldMult,reward] of rows){
 NODES.push({id,name,english,stage,kind:'mission',q,r,links:[...links],requires:[...requires],model,difficulty,desc,
  objective:'Defeat '+boss+' and secure the sea lane.',
  condition:'Patrol hulls '+pct(enemyHp)+' · Enemy damage '+pct(enemyDamage)+' · Enemy speed '+pct(enemySpeed)+' · Salvage gold '+pct(goldMult),
  reward,boss,bossAt,bossHP,enemyHp,enemyDamage,enemySpeed,goldMult});
}
const BY_ID=Object.fromEntries(NODES.map(n=>[n.id,n]));
for(const n of NODES)for(const id of n.links)if(!BY_ID[id].links.includes(n.id))BY_ID[id].links.push(n.id);
for(const n of NODES){Object.freeze(n.links);Object.freeze(n.requires);Object.freeze(n);}Object.freeze(NODES);Object.freeze(BY_ID);
function freshCampaign(){return {version:1,position:'harbor',cleared:{},settled:[]};}
function isUnlocked(state,id){const n=own(BY_ID,id)?BY_ID[id]:null;return !!n&&(n.kind==='harbor'||own(state?.cleared,id)||n.requires.some(k=>k==='harbor'||own(state?.cleared,k)));}
function pathTo(state,id){
 if(!isUnlocked(state,id))return null;
 const start=own(BY_ID,state?.position)?state.position:'harbor',queue=[[start]],seen=new Set([start]);
 for(let i=0;i<queue.length;i++){const path=queue[i],at=path[path.length-1];if(at===id)return path;
  for(const next of BY_ID[at].links){if(seen.has(next)||next!==id&&next!=='harbor'&&!own(state?.cleared,next))continue;seen.add(next);queue.push([...path,next]);}
 }
 return null;
}
function moveTo(state,id){const path=pathTo(state,id);if(!path)return false;state.position=id;return true;}
function sanitizeCampaign(raw){
 const state=freshCampaign();if(!raw||raw.version!==1||typeof raw!=='object')return state;
 if(raw.cleared&&typeof raw.cleared==='object'&&!Array.isArray(raw.cleared))for(const n of NODES){
  if(n.kind!=='mission'||!own(raw.cleared,n.id)||!isUnlocked(state,n.id))continue;
  const entry=raw.cleared[n.id];if(entry!==true&&(!entry||typeof entry!=='object'||Array.isArray(entry)))continue;
  state.cleared[n.id]={wins:Math.floor(bounded(entry.wins,1,1e6,1)),bestTime:bounded(entry.bestTime,0,1e7),bestLevel:Math.floor(bounded(entry.bestLevel,1,10000,1)),firstRunId:typeof entry.firstRunId==='string'?entry.firstRunId.slice(0,160):''};
 }
 state.settled=Array.isArray(raw.settled)?[...new Set(raw.settled.filter(id=>typeof id==='string'&&id.length>0&&id.length<=160))].slice(-10000):[];
 if(own(BY_ID,raw.position)&&pathTo(state,raw.position))state.position=raw.position;
 return state;
}
function recordResult(state,game){
 const id=game?.missionId,n=own(BY_ID,id)?BY_ID[id]:null,runId=game?.runId;
 if(!n||n.kind!=='mission'||!['won','lost'].includes(game.state)||typeof runId!=='string'||!runId||runId.length>160||!Array.isArray(state?.settled)||state.settled.includes(runId)||!isUnlocked(state,id))return 0;
 state.settled.push(runId);if(game.state!=='won')return 0;
 const old=own(state.cleared,id)?state.cleared[id]:null,time=bounded(game.time,0,1e7),level=Math.floor(bounded(game.level,1,10000,1));
 state.cleared[id]={wins:old?Math.min(1e6,(old.wins||1)+1):1,bestTime:old&&old.bestTime>0?Math.min(old.bestTime,time):time,bestLevel:Math.max(old?.bestLevel||1,level),firstRunId:old?.firstRunId||runId};
 return old?0:n.reward;
}
function completionSummary(state){
 const missions=NODES.filter(n=>n.kind==='mission'),cleared=missions.filter(n=>own(state?.cleared,n.id)).length;
 return {cleared,total:missions.length,percent:Math.round(cleared/missions.length*100),complete:cleared===missions.length,
  regions:[0,1,2].map(stage=>({stage,cleared:missions.filter(n=>n.stage===stage&&own(state?.cleared,n.id)).length,total:5})),
  available:missions.filter(n=>isUnlocked(state,n.id)&&!own(state?.cleared,n.id)).map(n=>n.id),position:own(BY_ID,state?.position)?state.position:'harbor'};
}
const api={NODES,BY_ID,freshCampaign,sanitizeCampaign,isUnlocked,pathTo,moveTo,recordResult,completionSummary};scope.UBCampaign=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
