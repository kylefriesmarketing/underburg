(function(scope){
'use strict';
const C=typeof module!=='undefined'?require('./content.js'):scope.UBContent;
const K=typeof module!=='undefined'?require('./campaign-data.js'):scope.UBCampaign;
const LOADOUT_DEFAULTS=Object.freeze({hull:'nautilus',captain:'greta',crew:'divers',weapon:'torpedo',pressure:'survey'});
const LOADOUT_TYPES=Object.freeze(Object.keys(LOADOUT_DEFAULTS));
const own=(o,k)=>!!o&&typeof k==='string'&&Object.hasOwn(o,k),num=(v,max=1e9)=>Number.isFinite(v)?Math.max(0,Math.min(max,v)):0;
const BASE_WEAPONS=['torpedo','arc','flak','mortar','mines','harpoon','drone','cryo'];
const CORE_MISSION_IDS=['glockenhafen','korallenhof','hansebogen','glasgarten','bernsteinwarte','kaiserwerk','dampfader','eisenglocke','werfttor','schmelzkessel','nachtwarte','schwarzdom','sternenschlund','schattentor','tiefenkrone'];
const CAMPAIGN_IDS=K.NODES.filter(n=>n.kind==='mission').map(n=>n.id);
const RARITY_ORDER=['COMMON','RARE','EPIC','LEGENDARY','UNIVERSE'];
const paint=(id,name,english,hull,accent,light,source,price=0)=>({id:'paint-'+id,type:'paint',name,english,desc:'A permanent hull finish with matching metalwork and running lights.',profile:{id,name,hull,accent,light},source,price});
const emblem=(id,name,english,symbol,source)=>({id:'emblem-'+id,type:'emblem',name,english,desc:'A physical insignia mounted on your citadel.',symbol,source,price:0});
const fitting=(id,name,english,desc,bonuses,model,source,price=0)=>({id:'fitting-'+id,type:'fitting',name,english,desc,bonuses,model,source,price});
const blueprint=(id,name,english,desc,source,price=0,requires=null)=>({id:'weapon-'+id,type:'weapon',key:id,weapon:id,name,english,desc,model:'module-'+id,source,price,...(requires?{requires}: {})});
const CATALOG=[
 paint('original','Werftgrün','Original shipyard finish',0x23756f,0xc6a05a,0x8effdb,'starter'),
 paint('copper','Kupferkiel','Burnished copper',0x8f4c32,0xf3ca77,0x7ee9df,'silver',60),
 paint('ivory','Perlmutt','Pearl and cold steel',0xd4ddd1,0x707d99,0xaaddff,'wunderkammer'),
 paint('abyss','Nachtblau','Midnight survey livery',0x263854,0x9b77be,0x73d8ff,'kartograf'),
 paint('crimson','Rotgold','Crimson merchant colors',0x7b2c38,0xd7b064,0xffb774,'goldrausch'),
 paint('royal','Königsblau','Royal blue and gold',0x323177,0xe6c16f,0xb9a4ff,'hansebrief'),
 emblem('anchor','Werftanker','Shipyard anchor','anchor','starter'),
 emblem('sun','Sonnenrad','Radiant compass','sun','erste-jagd'),
 emblem('kraken','Krakenzeichen','The deep hunter','kraken','salvenmeister'),
 emblem('crown','Tiefenkrone','Crown of the deep','crown','tiefenkaiser'),
 fitting('balanced','Trimmkammer','Balanced trim','The standard configuration. No bonuses or penalties.',{},'module-repair','starter'),
 fitting('salvage','Bergungswinde','Salvage winch','+90 collection range and +12% gold. Maximum speed −4%.',{magnet:90,gold:.12,speed:-.04},'module-salvage','silver',75),
 fitting('overdrive','Strömungsturbine','Current turbine','Maximum speed +12%. Hull integrity −18.',{speed:.12,hp:-18},'module-mines','silver',90),
 fitting('battery','Feuerleitrechner','Fire-control computer','All weapon damage +12%. Maximum speed −5%.',{damage:.12,speed:-.05},'module-torpedo','silver',100),
 fitting('bulwark','Druckpanzer','Pressure armor','Hull integrity +55. Maximum speed −8%.',{hp:55,speed:-.08},'module-armor','schwimmende-festung'),
 fitting('sonar','Echokondensator','Echo capacitor','Sonar recovery is 25% faster and collection range +25. Weapon damage −4%.',{sonar:.25,magnet:25,damage:-.04},'module-sonar','werftmeister'),
 blueprint('rail','Sternlanze','Capacitor rail lance','Permanently unlocks the rail lance as a starting module and in future module drafts.','silver',180),
 blueprint('flame','Glutstrom','Hydrothermal flame projector','Permanently unlocks the thermal projector as a starting module and in future module drafts.','silver',220,'feuerprobe'),
 blueprint('sonic','Schallbrecher','Resonant pressure-wave organ','Permanently unlocks the pressure-wave organ as a starting module and in future module drafts.','silver',260,'tiefensucher'),
 blueprint('vortex','Strudelkern','Gravity-well projector','Permanently unlocks the gravity well as a starting module and in future module drafts.','silver',350,'drei-meere')
];
const LOADOUT_TABLES={hull:C.HULLS,captain:C.CAPTAINS,crew:C.CREWS,weapon:C.WEAPONS,pressure:C.PRESSURES};
const LOADOUT_PRICES={hull:{bastion:220,wraith:280},captain:{otto:120,lotte:160},crew:{mechanics:100,gunners:140},weapon:{arc:100,flak:80,mortar:140,mines:100,harpoon:120,drone:180,cryo:160},pressure:{abyssal:160,iron:300}};
for(const type of LOADOUT_TYPES)for(const [key,definition]of Object.entries(LOADOUT_TABLES[type])){
 if(type==='weapon'&&!BASE_WEAPONS.includes(key))continue;
 const starter=key===LOADOUT_DEFAULTS[type],item={id:type+'-'+key,type,key,name:definition.name,english:definition.english||definition.subtitle||definition.role||definition.title||definition.name,desc:definition.desc.replace(/silver/g,'banked gold'),source:starter?'starter':'silver',price:starter?0:LOADOUT_PRICES[type][key]};
 if(type==='weapon'){item.weapon=key;item.model='module-'+key;item.desc+=' Unlocks this starting module; it can still appear in every run’s module drafts.';}
 if(type==='hull')item.model=key;
 CATALOG.push(item);
}
const LEGACY_PAID_ITEMS=new Set(['paint-copper','fitting-salvage','fitting-overdrive','fitting-battery','weapon-rail']);
const ITEMS=Object.fromEntries(CATALOG.map(item=>[item.id,item]));
const ACHIEVEMENTS=[
 {id:'erste-jagd',name:'Erste Jagd',english:'First hunt',desc:'Sink 25 hostile vessels across expeditions.',stat:'kills',target:25,reward:'emblem-sun'},
 {id:'goldrausch',name:'Goldrausch',english:'Gold fever',desc:'Recover 1,000 gold across expeditions.',stat:'gold',target:1000,reward:'paint-crimson'},
 {id:'feuerprobe',name:'Feuerprobe',english:'Trial by fire',desc:'Defeat your first guardian.',stat:'bosses',target:1,reward:'weapon-flame'},
 {id:'tiefensucher',name:'Tiefensucher',english:'Deep diver',desc:'Open five artifact vaults across expeditions.',stat:'chests',target:5,reward:'weapon-sonic'},
 {id:'kartograf',name:'Kartograf',english:'Cartographer',desc:'Chart five different underwater landmarks.',stat:'landmarks',target:5,reward:'paint-abyss'},
 {id:'werftmeister',name:'Werftmeister',english:'Master engineer',desc:'Buy 10 weapon improvements across expeditions.',stat:'upgrades',target:10,reward:'fitting-sonar'},
 {id:'salvenmeister',name:'Salvenmeister',english:'Master of salvos',desc:'Activate weapon abilities 50 times.',stat:'abilities',target:50,reward:'emblem-kraken'},
 {id:'schwimmende-festung',name:'Schwimmende Festung',english:'Floating fortress',desc:'Reach citadel level 13 during an expedition.',stat:'bestLevel',target:13,reward:'fitting-bulwark'},
 {id:'wunderkammer',name:'Wunderkammer',english:'Cabinet of wonders',desc:'Claim a Legendary or Universe reward.',stat:'legendary',target:1,reward:'paint-ivory'},
 {id:'drei-meere',name:'Drei Meere',english:'Three seas',desc:'Win a mission in each of the three sea regions.',stat:'regions',target:3,reward:'weapon-vortex'},
 {id:'hansebrief',name:'Hansebrief',english:'Hanse charter',desc:'Secure five different campaign missions.',stat:'missions',target:5,reward:'paint-royal'},
 {id:'tiefenkaiser',name:'Tiefenkaiser',english:'Emperor of the deep',desc:'Secure all 15 original sea-chart missions.',stat:'coreMissions',target:15,reward:'emblem-crown'}
];
const ACHIEVEMENT_BY_ID=Object.fromEntries(ACHIEVEMENTS.map(a=>[a.id,a]));
for(const item of CATALOG){if(item.profile)Object.freeze(item.profile);if(item.bonuses)Object.freeze(item.bonuses);Object.freeze(item);}for(const a of ACHIEVEMENTS)Object.freeze(a);Object.freeze(CATALOG);Object.freeze(ITEMS);Object.freeze(ACHIEVEMENTS);Object.freeze(ACHIEVEMENT_BY_ID);
const FREE_ITEMS=CATALOG.filter(i=>i.source==='starter').map(i=>i.id);
function freshHarbor(){return {version:2,owned:[...FREE_ITEMS],equipped:{paint:'paint-original',emblem:'emblem-anchor',fitting:'fitting-balanced'},achievements:[],settled:[],stats:{runs:0,wins:0,kills:0,gold:0,chests:0,upgrades:0,abilities:0,bosses:0,bestLevel:0,highestRarity:'COMMON',landmarks:[],regions:[],missions:[]}};}
function sanitizeHarbor(raw){
 const state=freshHarbor();if(!raw||![1,2].includes(raw.version)||typeof raw!=='object')return state;
 const stats=raw.stats||{};for(const key of ['runs','wins','kills','gold','chests','upgrades','abilities','bosses','bestLevel'])state.stats[key]=Math.floor(num(stats[key]));
 const rarity=typeof stats.highestRarity==='string'?stats.highestRarity.toUpperCase():'COMMON';if(RARITY_ORDER.includes(rarity))state.stats.highestRarity=rarity;
 state.stats.landmarks=Array.isArray(stats.landmarks)?[...new Set(stats.landmarks.filter(id=>typeof id==='string'&&/^(gardens|iron|trench)-[a-z-]{1,70}$/.test(id)))].slice(0,100):[];
 state.stats.regions=Array.isArray(stats.regions)?[...new Set(stats.regions.filter(x=>Number.isInteger(x)&&x>=0&&x<3))]:[];
 state.stats.missions=Array.isArray(stats.missions)?[...new Set(stats.missions.filter(id=>CAMPAIGN_IDS.includes(id)))]:[];
 state.achievements=Array.isArray(raw.achievements)?[...new Set(raw.achievements.filter(id=>own(ACHIEVEMENT_BY_ID,id)))]:[];
 const earned=state.achievements.map(id=>ACHIEVEMENT_BY_ID[id].reward).filter(id=>ITEMS[id].type!=='weapon'||raw.version===1);
 const bought=Array.isArray(raw.owned)?raw.owned.filter(id=>own(ITEMS,id)&&ITEMS[id].source==='silver'&&(raw.version===1?LEGACY_PAID_ITEMS.has(id):!ITEMS[id].requires||state.achievements.includes(ITEMS[id].requires))):[];
 state.owned=[...new Set([...FREE_ITEMS,...bought,...earned])];
 for(const type of ['paint','emblem','fitting']){const id=raw.equipped?.[type];if(state.owned.includes(id)&&ITEMS[id]?.type===type)state.equipped[type]=id;}
 state.settled=Array.isArray(raw.settled)?[...new Set(raw.settled.filter(id=>typeof id==='string'&&id.length>0&&id.length<=160))].slice(-10000):[];
 return state;
}
function canPurchase(raw,meta,itemId){
 if(!raw||typeof raw!=='object'||!own(ITEMS,itemId)||!meta)return false;const item=ITEMS[itemId],state=sanitizeHarbor(raw);
 return item.source==='silver'&&!state.owned.includes(itemId)&&(!item.requires||state.achievements.includes(item.requires))&&Number.isFinite(meta.silver)&&meta.silver>=item.price;
}
function purchase(state,meta,itemId){
 if(!state||typeof state!=='object'||!meta||!own(ITEMS,itemId))return false;const item=ITEMS[itemId],safe=sanitizeHarbor(state);
 if(item.source!=='silver'||safe.owned.includes(itemId)||item.requires&&!safe.achievements.includes(item.requires)||!Number.isFinite(meta.silver)||meta.silver<item.price)return false;
 Object.assign(state,safe);meta.silver-=item.price;state.owned.push(itemId);return true;
}
function equip(state,itemId){
 if(!state||typeof state!=='object'||!own(ITEMS,itemId))return false;const safe=sanitizeHarbor(state),item=ITEMS[itemId];
 if(!safe.owned.includes(itemId)||!['paint','emblem','fitting'].includes(item.type))return false;
 Object.assign(state,safe);state.equipped[item.type]=itemId;return true;
}
function loadoutItem(kind,key){const id=kind+'-'+key;return LOADOUT_TYPES.includes(kind)&&own(ITEMS,id)&&ITEMS[id].key===key?ITEMS[id]:null;}
function isLoadoutOwned(raw,kind,key){const item=loadoutItem(kind,key);return !!item&&sanitizeHarbor(raw).owned.includes(item.id);}
function resolveLoadout(raw,selected={}){
 const state=sanitizeHarbor(raw),resolved={};
 for(const kind of LOADOUT_TYPES){const item=loadoutItem(kind,selected?.[kind]);resolved[kind]=item&&state.owned.includes(item.id)?item.key:LOADOUT_DEFAULTS[kind];}
 return resolved;
}
function getLoadout(raw){
 const state=sanitizeHarbor(raw),paint=ITEMS[state.equipped.paint],emblem=ITEMS[state.equipped.emblem],fitting=ITEMS[state.equipped.fitting];
 return {paint:{...paint.profile},emblem:{id:emblem.id,name:emblem.name,symbol:emblem.symbol},fitting:{id:fitting.id,name:fitting.name,bonuses:{...fitting.bonuses}},bonuses:{hp:0,speed:0,magnet:0,gold:0,damage:0,sonar:0,...fitting.bonuses},unlockedLoadouts:Object.fromEntries(LOADOUT_TYPES.map(type=>[type,CATALOG.filter(i=>i.type===type&&state.owned.includes(i.id)).map(i=>i.key)])),unlockedWeapons:[...new Set([...BASE_WEAPONS,...CATALOG.filter(i=>i.type==='weapon'&&state.owned.includes(i.id)).map(i=>i.weapon)])]};
}
function achievementProgress(raw,campaign){
 const state=sanitizeHarbor(raw),s=state.stats,missions=new Set([...s.missions,...CAMPAIGN_IDS.filter(id=>own(campaign?.cleared,id))]);
 const values={...s,landmarks:s.landmarks.length,regions:s.regions.length,missions:missions.size,coreMissions:CORE_MISSION_IDS.filter(id=>missions.has(id)).length,legendary:RARITY_ORDER.indexOf(s.highestRarity)>=3?1:0};
 return ACHIEVEMENTS.map(a=>({...a,value:Math.min(a.target,values[a.stat]||0),target:a.target,ratio:Math.min(1,(values[a.stat]||0)/a.target),awarded:state.achievements.includes(a.id),rewardItem:ITEMS[a.reward]}));
}
function awardAchievements(state,campaign){
 const awarded=[];for(const progress of achievementProgress(state,campaign)){if(progress.awarded||progress.value<progress.target)continue;state.achievements.push(progress.id);const weapon=progress.rewardItem.type==='weapon';if(!weapon&&!state.owned.includes(progress.reward))state.owned.push(progress.reward);awarded.push({...progress,awarded:true,rewardName:progress.rewardItem.name,rewardText:progress.rewardItem.name+(weapon?' available to purchase':' unlocked')});}return awarded;
}
function syncProgress(state,meta,campaign){
 if(!state||typeof state!=='object')return [];Object.assign(state,sanitizeHarbor(state));const s=state.stats;
 for(const [key,value]of Object.entries({runs:meta?.runs,wins:meta?.wins,kills:meta?.bestKills,gold:meta?.totalGold,bestLevel:meta?.bestLevel}))s[key]=Math.max(s[key],Math.floor(num(value)));
 const missions=CAMPAIGN_IDS.filter(id=>own(campaign?.cleared,id));s.missions=[...new Set([...s.missions,...missions])];s.bosses=Math.max(s.bosses,s.wins,missions.length);s.regions=[...new Set([...s.regions,...missions.map(id=>K.BY_ID[id].stage)])];
 for(const id of Array.isArray(meta?.discovered)?meta.discovered:[]){const rarity=scope.UBContent?.ARTIFACTS?.[id]?.rarity?.toUpperCase();if(RARITY_ORDER.indexOf(rarity)>RARITY_ORDER.indexOf(s.highestRarity))s.highestRarity=rarity;}
 return awardAchievements(state,campaign);
}
function recordResult(state,game,campaign){
 if(!state||typeof state!=='object'||!game||!['won','lost'].includes(game.state)||typeof game.runId!=='string'||!game.runId||game.runId.length>160)return [];
 const safe=sanitizeHarbor(state);if(safe.settled.includes(game.runId))return [];
 Object.assign(state,safe);state.settled.push(game.runId);if(state.settled.length>10000)state.settled.shift();const s=state.stats;s.runs++;if(game.state==='won')s.wins++;
 for(const [key,value]of Object.entries({kills:game.kills,gold:game.goldEarned,chests:game.chestsOpened,upgrades:game.upgradesBought,abilities:game.stats?.abilities,bosses:game.bosses}))s[key]=Math.min(1e9,s[key]+Math.floor(num(value)));
 s.bestLevel=Math.max(s.bestLevel,Math.floor(num(game.level,10000)));
 const rarity=String(game.highestRarity||game.stats?.highestRarity||'COMMON').toUpperCase();if(RARITY_ORDER.indexOf(rarity)>RARITY_ORDER.indexOf(s.highestRarity))s.highestRarity=rarity;
 s.landmarks=[...new Set([...s.landmarks,...(Array.isArray(game.discovered)?game.discovered:[]).filter(id=>typeof id==='string'&&/^(gardens|iron|trench)-[a-z-]{1,70}$/.test(id))])].slice(0,100);
 if(game.state==='won'&&Number.isInteger(game.stage)&&game.stage>=0&&game.stage<3){if(game.missionId)s.regions=[...new Set([...s.regions,game.stage])];else if(game.bosses>0)s.regions=[...new Set([...s.regions,...Array.from({length:Math.min(3,game.bosses)},(_,i)=>i)])];}
 s.missions=[...new Set([...s.missions,...CAMPAIGN_IDS.filter(id=>own(campaign?.cleared,id)),...(game.state==='won'&&CAMPAIGN_IDS.includes(game.missionId)?[game.missionId]:[])])];
 return awardAchievements(state,campaign);
}
const api={LOADOUT_DEFAULTS,LOADOUT_TYPES,loadoutItem,isLoadoutOwned,resolveLoadout,CATALOG,ITEMS,ACHIEVEMENTS,ACHIEVEMENT_BY_ID,BASE_WEAPONS,RARITY_ORDER,freshHarbor,sanitizeHarbor,canPurchase,purchase,equip,recordResult,syncProgress,getLoadout,achievementProgress,evaluate:achievementProgress};scope.UBHarbor=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
