(function(scope){
'use strict';
const HULLS={
 nautilus:{radius:30,visualScale:1,name:'Nautilus',title:'DER ENTDECKER',hp:185,speed:173,turn:3.8,magnet:150,color:0x5cacaa,desc:'Balanced explorer. +25% salvage reach. Finds opportunity in every ruin.'},
 bastion:{radius:40,visualScale:1.28,name:'Eisenwall',title:'DIE FESTUNG',hp:265,speed:143,turn:2.8,magnet:115,color:0xc1aa80,desc:'Armored citadel. +43% starting hull and stronger ramming. Slow, deliberate, relentless.'},
 wraith:{radius:23,visualScale:.8,name:'Nachtjäger',title:'DER JÄGER',hp:145,speed:211,turn:5,magnet:120,color:0x8fbcc7,desc:'Fast hunter. +15% weapon rate. Fragile hull, devastating pursuit.'}
};
const CAPTAINS={
 greta:{name:'Greta Stahl',role:'THE SHIPWRIGHT',icon:'⚒',desc:'+15% maximum hull. Repairs restore 20% more health.',hp:1.15,repair:1.2},
 otto:{name:'Otto Goldmann',role:'THE SALVAGE BARON',icon:'◈',desc:'+25% gold from all sources. Start each expedition with 25 extra gold.',gold:1.25,startGold:25},
 lotte:{name:'Lotte Sturm',role:'THE STORM ENGINEER',icon:'ϟ',desc:'+20% electric and cryogenic damage. Active weapons recharge 15% faster.',element:1.2,active:.85}
};
const CREWS={
 divers:{name:'Bergungstaucher',role:'SALVAGE DIVERS',desc:'Every consumed wreck or habitat yields +3 gold.',icon:'⚓'},
 mechanics:{name:'Maschinisten',role:'ENGINE ROOM',desc:'Recover 1 hull every second while not boosting.',icon:'⚙'},
 gunners:{name:'Artilleristen',role:'GUN CREW',desc:'Automatic attacks deal 12% more damage.',icon:'✣'}
};
const WEAPONS={
 torpedo:{name:'Torpedowerfer',subtitle:'Homing torpedo battery',slot:'BOW',family:'kinetic',icon:'➶',color:'#e6bc7f',damage:32,cooldown:1.6,range:680,active:14,desc:'Homing torpedoes track priority targets.',ability:'Launch a six-torpedo hunter salvo.',model:'torpedo'},
 arc:{name:'Blitzspule',subtitle:'Stormglass lightning coil',slot:'DORSAL',family:'electric',icon:'ϟ',color:'#92f2d6',damage:34,cooldown:2.3,range:290,active:17,desc:'Lightning chains through nearby enemies.',ability:'Discharge a storm across eight targets.',model:'arc'},
 flak:{name:'Splitterkanone',subtitle:'Pearlshot broadside turret',slot:'PORT',family:'kinetic',icon:'✣',color:'#dfba85',damage:15,cooldown:1.9,range:490,active:12,desc:'A piercing spread rewards close passes.',ability:'Fire a devastating ring of pearlshot.',model:'flak'},
 mortar:{name:'Tiefenmörser',subtitle:'Depth-pressure mortar',slot:'DORSAL',family:'explosive',icon:'◉',color:'#e7a36c',damage:68,cooldown:3.8,range:720,active:19,desc:'Arcing shells detonate across an area.',ability:'Carpet a target area with five depth bombs.',model:'mortar'},
 mines:{name:'Minenkranz',subtitle:'Stern-launched proximity charges',slot:'STERN',family:'explosive',icon:'✹',color:'#f0a584',damage:83,cooldown:3.3,range:290,active:15,desc:'Leave explosive traps in your wake.',ability:'Deploy a ring of eight armed mines.',model:'mines'},
 harpoon:{name:'Walzahn',subtitle:'Armor-piercing harpoon',slot:'BOW',family:'kinetic',icon:'↠',color:'#bfc9c9',damage:59,cooldown:2.6,range:720,active:14,desc:'Heavy bolts pierce multiple hulls and drag them back.',ability:'Fire a fan of seven reinforced harpoons.',model:'harpoon'},
 drone:{name:'Taucherschwarm',subtitle:'Autonomous diving-bell wing',slot:'STARBOARD',family:'drone',icon:'⋈',color:'#b8eac7',damage:13,cooldown:.85,range:520,active:22,desc:'Orbiting drones fire at nearby hostiles.',ability:'Overclock the swarm for 7 seconds.',model:'drone'},
 cryo:{name:'Eisatem',subtitle:'Supercooled brine projector',slot:'PORT',family:'cryo',icon:'❄',color:'#9edfea',damage:11,cooldown:.42,range:240,active:16,desc:'Brine slows approaching enemies and freezes the seabed.',ability:'Flash-freeze everything in a wide radius.',model:'cryo'},
 rail:{name:'Sternlanze',subtitle:'Capacitor rail lance',slot:'BOW',family:'electric',icon:'╱',color:'#9ee6ff',damage:95,cooldown:3.6,range:980,active:18,desc:'Charges a precise beam that pierces every hull in its path.',ability:'Charge a heavy lance through an entire formation.',model:'rail'},
 vortex:{name:'Strudelkern',subtitle:'Gravity-well projector',slot:'DORSAL',family:'electric',icon:'◎',color:'#b99af1',damage:19,cooldown:4.8,range:620,active:21,desc:'Deploys a persistent vortex that pulls enemies into its center.',ability:'Create a larger, stronger gravity well for five seconds.',model:'vortex'},
 flame:{name:'Glutstrom',subtitle:'Hydrothermal flame projector',slot:'PORT',family:'thermal',icon:'♨',color:'#ffac74',damage:13,cooldown:.34,range:260,active:16,desc:'Sweeps a close cone of superheated brine. Targets keep burning.',ability:'Vent a broad thermal surge that ignites an enemy pack.',model:'flame'},
 sonic:{name:'Schallbrecher',subtitle:'Resonant pressure-wave organ',slot:'STARBOARD',family:'sonic',icon:')))',color:'#aaeacb',damage:47,cooldown:3.1,range:470,active:19,desc:'Expanding pressure waves hit each enemy once and push it back.',ability:'Release three overlapping shock rings.',model:'sonic'}
};
const RARITY_ORDER=['common','rare','epic','legendary','universe'];
const RARITIES={common:{name:'COMMON',color:'#a9b7b3',factor:1,weight:60},rare:{name:'RARE',color:'#8bbfee',factor:2,weight:25},epic:{name:'EPIC',color:'#c392ed',factor:3,weight:11},legendary:{name:'LEGENDARY',color:'#f4c667',factor:5,weight:3.7},universe:{name:'UNIVERSE',color:'#d6f8ff',factor:9,weight:.3},uncommon:{name:'RARE',color:'#8bbfee',factor:1.45,weight:0,legacy:true}};
const BASE_WEAPONS=['torpedo','arc','flak','mortar','mines','harpoon','drone','cryo'];
const normalizeRarity=key=>key==='uncommon'?'rare':RARITY_ORDER.includes(key)?key:'common';
const ENEMIES={
 shoal:{name:'Leuchtfisch',english:'Lantern shoal',desc:'Small schools of luminous fish. Sail through them to gather salvage and experience.',model:null,hp:8,r:8,speed:42,damage:2},
 scout:{name:'Späher',english:'Scout cutter',desc:'Light patrol boats pursue your citadel. Larger hulls can consume them.',model:'wraith',hp:42,r:24,speed:70,damage:9},
 rammer:{name:'Rammboot',english:'Ram boat',desc:'An armored bow closes quickly for collision damage. Turn aside before contact.',model:'wraith',hp:85,r:31,speed:92,damage:14},
 gunner:{name:'Kanonenboot',english:'Gunboat',desc:'Keeps its distance and fires aimed shells. Cross its firing line instead of sailing toward it.',model:'nautilus',hp:105,r:34,speed:54,damage:13},
 fort:{name:'Seefeste',english:'Sea fortress',desc:'A broad armored fortress with a three-shell fan. Circle outside its guns.',model:'bastion',hp:260,r:46,speed:38,damage:20},
 elite:{name:'Admiralsschiff',english:'Admiral ship',desc:'An oversized five-gun flagship. Its wreck yields a vault and a mission bounty.',model:'enemy-bellwarden',hp:570,r:58,speed:44,damage:24},
 boss:{name:'Wächter',english:'Regional guardian',desc:'Three named guardians arrive at 4:00, 7:00, and 9:00. Defeat every guardian in the same mission.',model:'enemy-kaiserburg',hp:3400,r:95,speed:36,damage:28},
 minelayer:{name:'Sperrleger',english:'Minelayer',desc:'Circles your route and leaves mines that arm after 1.3 seconds. Sonar clears nearby mines.',model:'enemy-minelayer',hp:135,r:35,speed:64,damage:16},
 sniper:{name:'Nadeljäger',english:'Sniper',desc:'Locks a firing lane for 1.4 seconds. Move sideways before its high-speed shot.',model:'enemy-sniper',hp:85,r:28,speed:53,damage:29},
 carrier:{name:'Schwarmträger',english:'Carrier',desc:'Opens its bays before launching a bounded wing of small interceptors. Destroy the carrier to stop reinforcements.',model:'enemy-carrier',hp:220,r:45,speed:42,damage:13},
 leech:{name:'Saugdrohne',english:'Siphon leech',desc:'Latches onto your hull and drains energy. Sustained overdrive or sonar shakes it free.',model:'enemy-leech',hp:28,r:19,speed:142,damage:4},
 warden:{name:'Schildvogt',english:'Shield warden',desc:'Projects a locked forward shield over nearby escorts, reducing damage by 45%. Flank behind the shield or break it with sonar; guardians are not protected.',model:'enemy-warden',hp:190,r:52,speed:43,damage:16,xp:20,goldDrops:6,goldValue:3},
 artillery:{name:'Donnerkahn',english:'Depth artillery',desc:'Marks your predicted position before a depth charge lands 1.65 seconds later. Leave the marked circle or interrupt the gunboat with nearby sonar.',model:'enemy-artillery',hp:145,r:48,speed:38,damage:27,xp:22,goldDrops:5,goldValue:3},
 tender:{name:'Werftdiakon',english:'Repair tender',desc:'Repairs one nearby damaged escort every four seconds. Prioritize the tender; its beam cannot repair guardians or itself.',model:'enemy-tender',hp:125,r:38,speed:52,damage:7,xp:18,goldDrops:5,goldValue:3},
 kamikaze:{name:'Zündling',english:'Fuse skiff',desc:'A tiny explosive skiff warns for 0.85 seconds, then rushes in a straight line. Dodge sideways or interrupt it with sonar. It cannot be consumed.',model:'enemy-kamikaze',hp:30,r:16,speed:100,damage:34,xp:8,goldDrops:3,goldValue:2}
};
const DEFAULT_ENEMY_ROSTER=Object.freeze([
 ['scout',20,0],['rammer',16,0],['leech',10,18],['sniper',10,28],['gunner',14,30],['minelayer',10,42],['fort',10,65],['carrier',10,65],
 ['kamikaze',8,75],['warden',8,90],['tender',7,105],['artillery',7,110]
].map(([kind,weight,from])=>Object.freeze({kind,weight,from})));
const ARTIFACTS={
 amberLedger:{name:'Bernsteinbuch',english:'The Amber Ledger',rarity:'rare',icon:'▤',desc:'+20% gold income. Every vault also grants 25 gold.',tag:'ECONOMY',effect:{gold:.2,chestGold:25}},
 hanseSeal:{name:'Hanse-Siegel',english:'Seal of the Drowned League',rarity:'epic',icon:'◈',desc:'Every 10 consumed objects creates a 40-gold payout.',tag:'ECONOMY / CONSUME',effect:{consumePay:40}},
 krakenLens:{name:'Krakenauge',english:'The Kraken Lens',rarity:'epic',icon:'◎',desc:'+25% critical chance. Critical hits deal double damage.',tag:'CRITICAL',effect:{crit:.25}},
 thunderBell:{name:'Sturmglocke',english:'Bell of the Sunken Storm',rarity:'epic',icon:'♧',desc:'Electric attacks chain to 2 more targets and deal +20% damage.',tag:'ELECTRIC',effect:{chains:2,electric:.2}},
 volatilePearl:{name:'Zornperle',english:'The Volatile Pearl',rarity:'epic',icon:'●',desc:'Torpedo impacts explode in a 75m radius.',tag:'TORPEDO / EXPLOSIVE',effect:{torpedoBlast:75}},
 saltCrown:{name:'Salzkrone',english:'Crown of Salt',rarity:'legendary',icon:'♜',desc:'Defeated enemies explode for 35 damage. Explosions can chain.',tag:'CHAIN REACTION',effect:{deathBlast:35}},
 abyssHeart:{name:'Abgrundherz',english:'Heart of the Abyss',rarity:'legendary',icon:'♥',desc:'Survive a fatal hit once with 45% hull and a massive sonar burst.',tag:'SECOND CHANCE',effect:{revives:1}},
 salvageMagnet:{name:'Nordmagnet',english:'Northbound Magnet',rarity:'common',icon:'⌁',desc:'+100m salvage reach. Collecting gold heals 0.1 hull.',tag:'SALVAGE / SUSTAIN',effect:{magnet:100,goldHeal:.1}},
 pressureDial:{name:'Druckmesser',english:'The Forbidden Gauge',rarity:'rare',icon:'◴',desc:'Automatic cooldowns are 14% shorter.',tag:'ATTACK RATE',effect:{haste:.14}},
 masterKey:{name:'Werftschlüssel',english:'The Shipwright’s Key',rarity:'rare',icon:'⚿',desc:'Two free rerolls in every draft. Gold upgrade prices are 15% lower.',tag:'DRAFT / ECONOMY',effect:{rerolls:2,discount:.15}},
 echoMirror:{name:'Echospiegel',english:'The Echo Mirror',rarity:'legendary',icon:'◇',desc:'The next artifact you recover has double strength.',tag:'ARTIFACT AMPLIFIER',effect:{nextDouble:1}},
 coralOath:{name:'Koralleneid',english:'Oath of Living Coral',rarity:'rare',icon:'✚',desc:'+0.9 hull regeneration per second. Repairs grant 5 seconds of shielding.',tag:'SUSTAIN',effect:{regen:.9,repairShield:5}},
 jetValve:{name:'Sturmventil',english:'Storm-Tide Valve',rarity:'common',icon:'»',desc:'Overdrive consumes 25% less energy and grants +20% ramming damage.',tag:'OVERDRIVE',effect:{boostSave:.25,ram:.2}},
 whiteAnchor:{name:'Weißer Anker',english:'Anchor of the Last Harbor',rarity:'epic',icon:'⚓',desc:'+60 maximum hull. At less than 30% hull, gain 35% damage.',tag:'LAST STAND',effect:{hp:60,lastStand:.35}},
 frostStar:{name:'Froststern',english:'Star of the Frozen Trench',rarity:'epic',icon:'❄',desc:'Frozen targets take +35% damage from all weapons.',tag:'CRYO SYNERGY',effect:{shatter:.35}},
 gildedFuse:{name:'Goldene Lunte',english:'The Gilded Fuse',rarity:'rare',icon:'✹',desc:'Explosive kills drop 3 extra gold. Explosions are 20% wider.',tag:'EXPLOSIVE / GOLD',effect:{blastGold:3,blastRadius:.2}},
 huntsmanClock:{name:'Jägeruhr',english:'The Hunter’s Clock',rarity:'epic',icon:'◷',desc:'Every 12 kills resets all active weapon cooldowns.',tag:'ABILITY ENGINE',effect:{killReset:12}},
 torpedoGyro:{name:'Kreiselkompass',english:'Gyroscopic Compass',rarity:'rare',icon:'⊕',desc:'Homing torpedoes turn faster and gain one additional projectile.',tag:'TORPEDO',effect:{extraTorpedo:1}},
 diversMedal:{name:'Taucherorden',english:'Order of the Deep',rarity:'common',icon:'✥',desc:'Every consumed object restores 2 hull. +10% growth experience.',tag:'CONSUME / GROW',effect:{consumeHeal:2,xp:.1}},
 bronzeLung:{name:'Bronzelunge',english:'The Bronze Lung',rarity:'rare',icon:'≋',desc:'+30 maximum overdrive energy. Active cooldowns run 20% faster while boosting.',tag:'ABILITY / OVERDRIVE',effect:{energy:30,boostHaste:.2}},
 droneHive:{name:'Bienenkorb',english:'The Brass Beehive',rarity:'epic',icon:'⬡',desc:'Add two drones to the wing. Drones deal 20% more damage.',tag:'DRONE',effect:{drones:2,droneDamage:.2}},
 harpoonChain:{name:'Walfängerkette',english:'The Whaler’s Chain',rarity:'rare',icon:'↠',desc:'Harpoons deal +35% damage and pull targets twice as hard.',tag:'HARPOON',effect:{harpoon:.35}},
 salvageChoir:{name:'Tiefenchor',english:'Choir of the Depths',rarity:'epic',icon:'♫',desc:'Sonar pulls every gold pickup within 650m and recharges 25% faster.',tag:'SONAR / SALVAGE',effect:{sonarMagnet:650,sonarHaste:.25}},
 finalDividend:{name:'Letzte Dividende',english:'The Final Dividend',rarity:'legendary',icon:'✦',desc:'Gain 1% damage for every 25 gold carried, up to +80%. Gain 100 gold now.',tag:'ECONOMY / DAMAGE',effect:{goldDamage:.01,grantGold:100}}
};
// Five purchased improvements earn a permanent, mutually exclusive specialization for that module.
const EVOLUTIONS={
 torpedo:[{id:'swarm',name:'Schwarmkammer',desc:'Two extra homing torpedoes in every automatic volley and active salvo.'},{id:'split',name:'Spaltladung',desc:'Torpedo impacts detonate in a 110m radius. Stacks with Zornperle.'}],
 arc:[{id:'web',name:'Sturmnetz',desc:'Lightning jumps to three additional enemies. Every arc briefly stuns.'},{id:'thunder',name:'Donnerschlag',desc:'Lightning deals 70% more damage. Active storm has 50% more reach.'}],
 flak:[{id:'hail',name:'Perlenorkan',desc:'Four extra shells in every volley. Active barrage adds twelve shells.'},{id:'steel',name:'Stahlhagel',desc:'Flak shells deal 50% more damage and ricochet toward one additional target.'}],
 mortar:[{id:'fire',name:'Tiefenfeuer',desc:'Depth charges leave burning mineral clouds, damaging enemies for four seconds.'},{id:'double',name:'Doppelschlag',desc:'Double the depth charges in both automatic attacks and active bombardments.'}],
 mines:[{id:'anchor',name:'Ankerminen',desc:'Mines detect targets farther away and explode across a 210m radius.'},{id:'chain',name:'Kettenzündung',desc:'Mine explosions launch six piercing shrapnel bolts. Active field lays twelve mines.'}],
 harpoon:[{id:'trident',name:'Dreizack',desc:'Three additional piercing harpoons in every volley and active fan.'},{id:'whale',name:'Walbrecher',desc:'Harpoons deal double damage against enemies above half hull integrity.'}],
 drone:[{id:'queen',name:'Schwarmkönigin',desc:'Three additional combat drones. Overclock lasts twelve seconds.'},{id:'rescue',name:'Rettungsflotte',desc:'Drone hits repair 0.8 hull. Drones deal 30% more damage.'}],
 cryo:[{id:'zero',name:'Nullpunkt',desc:'Freeze radius grows by 80m. Automatic frost briefly stuns enemies.'},{id:'crystal',name:'Kristallbruch',desc:'Frozen enemies shatter on defeat, dealing 65 damage in a 130m radius.'}],
 rail:[{id:'longshot',name:'Horizontspalter',desc:'Rail lances travel 35% farther and deal 45% more damage.'},{id:'echo',name:'Nachbrenner',desc:'Every rail lance fires a second echo beam after 0.28 seconds at 60% power.'}],
 vortex:[{id:'singularity',name:'Singularität',desc:'Gravity wells grow by 70m and pull 60% harder.'},{id:'collapse',name:'Kollapskern',desc:'Each expired gravity well collapses into a blast dealing 3.3 times its tick damage.'}],
 flame:[{id:'wildfire',name:'Kettenbrand',desc:'Burning wrecks spread their fire to enemies within 150m.'},{id:'whiteheat',name:'Weißglut',desc:'Thermal attacks deal 45% more damage. Burning targets take 25% more damage from all weapons.'}],
 sonic:[{id:'resonance',name:'Rückhall',desc:'Pressure rings contract for a second hit after reaching their maximum radius.'},{id:'breaker',name:'Panzerbrecher',desc:'Pressure waves stun for 0.6 seconds and deal 50% more damage to forts and guardians.'}]
};
const PRESSURES={
 survey:{name:'Erkundung',english:'Survey',desc:'Standard expedition. Learn the currents and build something outrageous.',hp:1,damage:1,speed:1,reward:1},
 abyssal:{name:'Tiefendruck',english:'Abyssal',desc:'Stronger, faster hunters. Earn 35% more gold at mission end.',hp:1.5,damage:1.35,speed:1.12,reward:1.35},
 iron:{name:'Eiserne Flut',english:'Iron Tide',desc:'Relentless heavy fortresses. Earn 75% more gold at mission end.',hp:2.1,damage:1.7,speed:1.22,reward:1.75}
};
const RESEARCH={
 hull:{name:'Druckhüllen',desc:'+12 starting hull per rank.',cost:30,max:6},
 purse:{name:'Bergungsfonds',desc:'+10 starting gold per rank.',cost:25,max:5},
 magnet:{name:'Sonararchiv',desc:'+12m salvage reach per rank.',cost:25,max:5},
 weapon:{name:'Präzisionswerk',desc:'+3% all damage per rank.',cost:40,max:5},
 reroll:{name:'Patentsammlung',desc:'+1 free reroll per draft.',cost:70,max:2}
};
const BIOMES=[
 {name:'Die Versunkenen Gärten',english:'The Drowned Gardens',depth:840,color:0x15494b,fog:0x124653,sand:0x35605a,boss:'Der Glockenwächter',bossAt:150,bossHP:2000,desc:'Abandoned habitats and coral nurseries. Something is still ringing the harbor bell.'},
 {name:'Der Eisenfriedhof',english:'The Iron Graveyard',depth:1540,color:0x173444,fog:0x122f43,sand:0x35424c,boss:'Die Rostkönigin',bossAt:165,bossHP:4800,desc:'A fleet of drowned factories. Rich cargo lies among the pressure mines.'},
 {name:'Der Schwarze Graben',english:'The Black Trench',depth:2700,color:0x101e35,fog:0x111c32,sand:0x252d43,boss:'Der Tiefenfürst',bossAt:180,bossHP:8500,desc:'Geothermal vents light the last descent. The sovereign of the abyss awaits.'}
];
scope.UBContent={HULLS,CAPTAINS,CREWS,WEAPONS,RARITIES,RARITY_ORDER,BASE_WEAPONS,ENEMIES,DEFAULT_ENEMY_ROSTER,normalizeRarity,ARTIFACTS,EVOLUTIONS,PRESSURES,RESEARCH,BIOMES};if(typeof module!=='undefined')module.exports=scope.UBContent;
})(typeof window!=='undefined'?window:globalThis);
