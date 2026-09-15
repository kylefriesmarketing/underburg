(function(scope){
'use strict';
const C=typeof module!=='undefined'?require('./content.js'):scope.UBContent;
const own=(o,k)=>!!o&&Object.hasOwn(o,k),bounded=(v,min,max,fallback=0)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
const BOSS_SCHEDULE=Object.freeze([240,420,540]);
const LIEUTENANTS=[['Der Hafenschild','Die Riffjägerin'],['Der Eisenwallvogt','Die Schlackenjägerin'],['Der Nachtvogt','Die Abgrundjägerin']];
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
rows.push(
 ['salzspeicher','Salzspeicher','Salt Granaries',0,0,1,['glockenhafen'],['glockenhafen'],'world-foundry',2,'Hanse merchants sealed their winter stores behind shielded granary barges. Break the wardens and reopen the old salt road.','Der Salzvogt',240,1300,1.05,.95,.95,1.2,50],
 ['ankerfriedhof','Ankerfriedhof','Anchor Graveyard',0,0,2,['salzspeicher'],['salzspeicher'],'world-arch',2,'Abandoned anchor chains hide flotillas of fuse skiffs. Follow their warning lamps through the graveyard and claim the admiral’s burial tithe.','Die Kettenhüterin',240,1450,1,1,1.05,1.25,60],
 ['hansekrone','Hansekrone','The Hanse Crown',0,1,2,['ankerfriedhof'],['ankerfriedhof'],'world-bell-tower',3,'A merchant prince binds his shield fleet with repair choirs. Silence the tenders before the guild crown can rise from its flooded counting house.','Der Hansefürst',240,1650,1.1,1.05,.95,1.3,70],
 ['kesselkai','Kesselkai','Boiler Quay',1,1,3,['werfttor'],['werfttor'],'world-pipeline',3,'Boiler ships bombard the old coal quay. Thread the glowing depth-charge circles and seize the furnace convoys.','Der Kesselbaron',240,2000,1.1,1.1,.95,1.3,80],
 ['stahlchor','Stahlchor','Choir of Steel',1,2,3,['kesselkai'],['kesselkai'],'world-foundry',4,'The foundry brotherhood repairs its escort fortresses in a relentless steel procession. Cut the healing beams at their source.','Die Stahlkantorin',240,2250,1.2,1.1,.9,1.35,90],
 ['adlerwerft','Adlerwerft','Eagle Shipyard',1,3,3,['stahlchor'],['stahlchor'],'world-observatory',4,'An electorial eagle watches the imperial slips. Artillery barges fire from behind shield walls as a new flagship leaves its cradle.','Der Werftkurfürst',240,2450,1.15,1.15,1,1.4,100],
 ['runenkluft','Runenkluft','Rune Chasm',2,5,2,['tiefenkrone'],['tiefenkrone'],'world-crystal',4,'Runic beacons pulse across the royal chasm. Needle guns and fuse skiffs hunt among the lights; read each warning before the ambush closes.','Die Runenseherin',240,2700,1.1,1.2,1.1,1.4,115],
 ['finsterhorst','Finsterhorst','The Dark Eyrie',2,6,1,['runenkluft'],['runenkluft'],'world-basalt',5,'The last fleet chaplains shelter in a basalt eyrie. Their tenders and shield escorts keep ancient warships moving through the dark.','Der Nebeljäger',240,2950,1.25,1.15,1,1.45,125],
 ['kaisergrab','Kaisergrab','The Emperor’s Tomb',2,6,0,['finsterhorst'],['finsterhorst'],'world-bell-tower',5,'Beyond the reunited sea lanes lies the emperor’s drowned mausoleum. A complete honor fleet guards the final vault beneath its iron bells.','Der Grabkaiser',240,3600,1.3,1.2,1.05,1.55,175]
);
const roster=(entries)=>Object.freeze(entries.map(([kind,weight,from=0])=>Object.freeze({kind,weight,from})));
const MISSION_MODELS={salzspeicher:'enemy-warden',ankerfriedhof:'enemy-kamikaze',hansekrone:'enemy-bellwarden',kesselkai:'enemy-artillery',stahlchor:'enemy-tender',adlerwerft:'enemy-jagddom',runenkluft:'world-crystal',finsterhorst:'world-basalt',kaisergrab:'enemy-kaiserburg'};
const PROFILES={
 salzspeicher:['Shielded merchant escorts',[['scout',25],['rammer',20],['warden',35,20],['gunner',20,30]]],
 ankerfriedhof:['Fuse-skiff ambush flotilla',[['scout',25],['rammer',15],['kamikaze',40,25],['minelayer',20,45]]],
 hansekrone:['The guild’s shield and repair fleet',[['scout',20],['gunner',20,25],['warden',30,25],['tender',30,35]]],
 kesselkai:['Depth artillery and mine boats',[['rammer',20],['gunner',20,25],['artillery',40,35],['minelayer',20,45]]],
 stahlchor:['Fortress repair procession',[['scout',20],['fort',30,40],['tender',35,30],['warden',15,50]]],
 adlerwerft:['Shielded imperial gun line',[['rammer',20],['gunner',20,25],['warden',25,35],['artillery',35,45]]],
 runenkluft:['Needle guns and explosive skiffs',[['scout',20],['sniper',30,25],['kamikaze',35,30],['leech',15,45]]],
 finsterhorst:['The eyrie’s guarded repair fleet',[['scout',20],['fort',20,40],['tender',25,35],['warden',25,30],['leech',10,55]]],
 kaisergrab:['The emperor’s complete honor fleet',[['rammer',15],['fort',15,45],['warden',20,30],['artillery',20,40],['tender',15,35],['kamikaze',15,30]]]
};
const pct=n=>{const v=Math.round((n-1)*100);return v===0?'standard':(v>0?'+':'')+v+'%';};
const NODES=[{id:'harbor',name:'Heimathafen',english:'Home Harbor',stage:0,kind:'harbor',q:0,r:0,links:['glockenhafen'],requires:[],model:'world-bell-tower',difficulty:1,desc:'The Hanse fleet begins here. Choose a cleared sea lane, refit your citadel, and chart the next expedition.',objective:'Chart the sunken sea lanes.',condition:'Safe harbor',reward:0,boss:'',bossAt:0,bossHP:0,enemyHp:1,enemyDamage:1,enemySpeed:1,goldMult:1}];
for(const [id,name,english,stage,q,r,links,requires,model,difficulty,desc,boss,bossAt,bossHP,enemyHp,enemyDamage,enemySpeed,goldMult,reward] of rows){
 NODES.push({id,name,english,stage,kind:'mission',q,r,links:[...links],requires:[...requires],model:MISSION_MODELS[id]||model,difficulty,desc,enemyRoster:PROFILES[id]?roster(PROFILES[id][1]):C.DEFAULT_ENEMY_ROSTER,enemyProfile:PROFILES[id]?.[0]||'Mixed sea patrols',
  objective:'Defeat all three guardians in one dive: the vanguard, the hunter, and '+boss+'.',
  condition:'Patrol hulls '+pct(enemyHp)+' · Enemy damage '+pct(enemyDamage)+' · Enemy speed '+pct(enemySpeed)+' · Salvage gold '+pct(goldMult),
  reward,boss,bossAt:BOSS_SCHEDULE[0],bossHP,enemyHp,enemyDamage,enemySpeed,goldMult,bossWaves:Object.freeze(BOSS_SCHEDULE.map((at,i)=>Object.freeze({at,name:i<2?LIEUTENANTS[stage][i]:boss,role:['vanguard','hunter','sovereign'][i],model:['enemy-bellwarden','enemy-jagddom','enemy-kaiserburg'][i],hpMult:[4,12,28][i],damageMult:[1,1.3,1.6][i]})))});
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
  state.cleared[n.id]={wins:Math.floor(bounded(entry.wins,1,1e6,1)),bestTime:bounded(entry.bestTime,0,1e7),bestLevel:Math.floor(bounded(entry.bestLevel,1,10000,1)),firstRunId:typeof entry.firstRunId==='string'?entry.firstRunId.slice(0,160):'',bestSites:Math.floor(bounded(entry.bestSites,0,8)),siteKinds:Array.isArray(entry.siteKinds)?[...new Set(entry.siteKinds.filter(kind=>['bastion','salvage','beacon','shrine'].includes(kind)))].sort():[]};
 }
 state.settled=Array.isArray(raw.settled)?[...new Set(raw.settled.filter(id=>typeof id==='string'&&id.length>0&&id.length<=160))].slice(-10000):[];
 if(own(BY_ID,raw.position)&&pathTo(state,raw.position))state.position=raw.position;
 return state;
}
function isMissionVictory(game){
 const node=own(BY_ID,game?.missionId)?BY_ID[game.missionId]:null,kills=game?.bossKillWaves;
 return !!node&&node.kind==='mission'&&game.state==='won'&&game.bosses===3&&game.bossesSpawned===3&&Array.isArray(kills)&&kills.length===3&&new Set(kills).size===3&&[0,1,2].every(i=>kills.includes(i))&&(!Array.isArray(game.enemies)||!game.enemies.some(e=>e.kind==='boss'&&e.hp>0));
}function recordResult(state,game){
 const id=game?.missionId,n=own(BY_ID,id)?BY_ID[id]:null,runId=game?.runId;
 if(!n||n.kind!=='mission'||!['won','lost'].includes(game.state)||typeof runId!=='string'||!runId||runId.length>160||!Array.isArray(state?.settled)||state.settled.includes(runId)||!isUnlocked(state,id))return 0;
 if(game.state==='won'&&!isMissionVictory(game))return 0;
 state.settled.push(runId);if(game.state!=='won')return 0;
 const old=own(state.cleared,id)?state.cleared[id]:null,time=bounded(game.time,0,1e7),level=Math.floor(bounded(game.level,1,10000,1)),sites=(Array.isArray(game.sites)?game.sites:[]).filter(s=>s.status==='captured'&&s.rewarded&&['bastion','salvage','beacon','shrine'].includes(s.kind));
 state.cleared[id]={wins:old?Math.min(1e6,(old.wins||1)+1):1,bestTime:old&&old.bestTime>0?Math.min(old.bestTime,time):time,bestLevel:Math.max(old?.bestLevel||1,level),firstRunId:old?.firstRunId||runId,bestSites:Math.max(old?.bestSites||0,Math.min(8,new Set(sites.map(s=>s.id)).size)),siteKinds:[...new Set([...(old?.siteKinds||[]),...sites.map(s=>s.kind)])].sort()};
 return old?0:n.reward;
}
function completionSummary(state){
 const missions=NODES.filter(n=>n.kind==='mission'),cleared=missions.filter(n=>own(state?.cleared,n.id)).length;
 return {cleared,total:missions.length,percent:Math.round(cleared/missions.length*100),complete:cleared===missions.length,
  regions:[0,1,2].map(stage=>({stage,cleared:missions.filter(n=>n.stage===stage&&own(state?.cleared,n.id)).length,total:missions.filter(n=>n.stage===stage).length})),
  available:missions.filter(n=>isUnlocked(state,n.id)&&!own(state?.cleared,n.id)).map(n=>n.id),position:own(BY_ID,state?.position)?state.position:'harbor'};
}
const api={BOSS_SCHEDULE,NODES,BY_ID,isMissionVictory,freshCampaign,sanitizeCampaign,isUnlocked,pathTo,moveTo,recordResult,completionSummary};scope.UBCampaign=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
