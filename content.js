(function(scope){
'use strict';
const HULLS={
 nautilus:{name:'Nautilus',title:'DER ENTDECKER',hp:185,speed:173,turn:3.8,magnet:150,color:0x5cacaa,desc:'Balanced explorer. +25% salvage reach. Finds opportunity in every ruin.'},
 bastion:{name:'Eisenwall',title:'DIE FESTUNG',hp:265,speed:143,turn:2.8,magnet:115,color:0xc1aa80,desc:'Armored citadel. +43% starting hull and stronger ramming. Slow, deliberate, relentless.'},
 wraith:{name:'Nachtjäger',title:'DER JÄGER',hp:145,speed:211,turn:5,magnet:120,color:0x8fbcc7,desc:'Fast hunter. +15% weapon rate. Fragile hull, devastating pursuit.'}
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
 cryo:{name:'Eisatem',subtitle:'Supercooled brine projector',slot:'PORT',family:'cryo',icon:'❄',color:'#9edfea',damage:11,cooldown:.42,range:240,active:16,desc:'Brine slows approaching enemies and freezes the seabed.',ability:'Flash-freeze everything in a wide radius.',model:'cryo'}
};
const RARITIES={common:{name:'STANDARD',color:'#a9b7b3',factor:1,weight:58},uncommon:{name:'REFINED',color:'#87d6b6',factor:1.45,weight:27},rare:{name:'EXCEPTIONAL',color:'#8ebdea',factor:2,weight:12},legendary:{name:'MASTERWORK',color:'#e9bb71',factor:3,weight:3}};
const ARTIFACTS={
 amberLedger:{name:'Bernsteinbuch',english:'The Amber Ledger',rarity:'uncommon',icon:'▤',desc:'+20% gold income. Every vault also grants 25 gold.',tag:'ECONOMY',effect:{gold:.2,chestGold:25}},
 hanseSeal:{name:'Hanse-Siegel',english:'Seal of the Drowned League',rarity:'rare',icon:'◈',desc:'Every 10 consumed objects creates a 40-gold payout.',tag:'ECONOMY / CONSUME',effect:{consumePay:40}},
 krakenLens:{name:'Krakenauge',english:'The Kraken Lens',rarity:'rare',icon:'◎',desc:'+25% critical chance. Critical hits deal double damage.',tag:'CRITICAL',effect:{crit:.25}},
 thunderBell:{name:'Sturmglocke',english:'Bell of the Sunken Storm',rarity:'rare',icon:'♧',desc:'Electric attacks chain to 2 more targets and deal +20% damage.',tag:'ELECTRIC',effect:{chains:2,electric:.2}},
 volatilePearl:{name:'Zornperle',english:'The Volatile Pearl',rarity:'rare',icon:'●',desc:'Torpedo impacts explode in a 75m radius.',tag:'TORPEDO / EXPLOSIVE',effect:{torpedoBlast:75}},
 saltCrown:{name:'Salzkrone',english:'Crown of Salt',rarity:'legendary',icon:'♜',desc:'Defeated enemies explode for 35 damage. Explosions can chain.',tag:'CHAIN REACTION',effect:{deathBlast:35}},
 abyssHeart:{name:'Abgrundherz',english:'Heart of the Abyss',rarity:'legendary',icon:'♥',desc:'Survive a fatal hit once with 45% hull and a massive sonar burst.',tag:'SECOND CHANCE',effect:{revives:1}},
 salvageMagnet:{name:'Nordmagnet',english:'Northbound Magnet',rarity:'common',icon:'⌁',desc:'+100m salvage reach. Collecting gold heals 0.1 hull.',tag:'SALVAGE / SUSTAIN',effect:{magnet:100,goldHeal:.1}},
 pressureDial:{name:'Druckmesser',english:'The Forbidden Gauge',rarity:'uncommon',icon:'◴',desc:'Automatic cooldowns are 14% shorter.',tag:'ATTACK RATE',effect:{haste:.14}},
 masterKey:{name:'Werftschlüssel',english:'The Shipwright’s Key',rarity:'uncommon',icon:'⚿',desc:'Two free rerolls in every draft. Gold upgrade prices are 15% lower.',tag:'DRAFT / ECONOMY',effect:{rerolls:2,discount:.15}},
 echoMirror:{name:'Echospiegel',english:'The Echo Mirror',rarity:'legendary',icon:'◇',desc:'The next artifact you recover has double strength.',tag:'ARTIFACT AMPLIFIER',effect:{nextDouble:1}},
 coralOath:{name:'Koralleneid',english:'Oath of Living Coral',rarity:'uncommon',icon:'✚',desc:'+0.9 hull regeneration per second. Repairs grant 5 seconds of shielding.',tag:'SUSTAIN',effect:{regen:.9,repairShield:5}},
 jetValve:{name:'Sturmventil',english:'Storm-Tide Valve',rarity:'common',icon:'»',desc:'Overdrive consumes 25% less energy and grants +20% ramming damage.',tag:'OVERDRIVE',effect:{boostSave:.25,ram:.2}},
 whiteAnchor:{name:'Weißer Anker',english:'Anchor of the Last Harbor',rarity:'rare',icon:'⚓',desc:'+60 maximum hull. At less than 30% hull, gain 35% damage.',tag:'LAST STAND',effect:{hp:60,lastStand:.35}},
 frostStar:{name:'Froststern',english:'Star of the Frozen Trench',rarity:'rare',icon:'❄',desc:'Frozen targets take +35% damage from all weapons.',tag:'CRYO SYNERGY',effect:{shatter:.35}},
 gildedFuse:{name:'Goldene Lunte',english:'The Gilded Fuse',rarity:'uncommon',icon:'✹',desc:'Explosive kills drop 3 extra gold. Explosions are 20% wider.',tag:'EXPLOSIVE / GOLD',effect:{blastGold:3,blastRadius:.2}},
 huntsmanClock:{name:'Jägeruhr',english:'The Hunter’s Clock',rarity:'rare',icon:'◷',desc:'Every 12 kills resets all active weapon cooldowns.',tag:'ABILITY ENGINE',effect:{killReset:12}},
 torpedoGyro:{name:'Kreiselkompass',english:'Gyroscopic Compass',rarity:'uncommon',icon:'⊕',desc:'Homing torpedoes turn faster and gain one additional projectile.',tag:'TORPEDO',effect:{extraTorpedo:1}},
 diversMedal:{name:'Taucherorden',english:'Order of the Deep',rarity:'common',icon:'✥',desc:'Every consumed object restores 2 hull. +10% growth experience.',tag:'CONSUME / GROW',effect:{consumeHeal:2,xp:.1}},
 bronzeLung:{name:'Bronzelunge',english:'The Bronze Lung',rarity:'uncommon',icon:'≋',desc:'+30 maximum overdrive energy. Active cooldowns run 20% faster while boosting.',tag:'ABILITY / OVERDRIVE',effect:{energy:30,boostHaste:.2}},
 droneHive:{name:'Bienenkorb',english:'The Brass Beehive',rarity:'rare',icon:'⬡',desc:'Add two drones to the wing. Drones deal 20% more damage.',tag:'DRONE',effect:{drones:2,droneDamage:.2}},
 harpoonChain:{name:'Walfängerkette',english:'The Whaler’s Chain',rarity:'uncommon',icon:'↠',desc:'Harpoons deal +35% damage and pull targets twice as hard.',tag:'HARPOON',effect:{harpoon:.35}},
 salvageChoir:{name:'Tiefenchor',english:'Choir of the Depths',rarity:'rare',icon:'♫',desc:'Sonar pulls every gold pickup within 650m and recharges 25% faster.',tag:'SONAR / SALVAGE',effect:{sonarMagnet:650,sonarHaste:.25}},
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
 cryo:[{id:'zero',name:'Nullpunkt',desc:'Freeze radius grows by 80m. Automatic frost briefly stuns enemies.'},{id:'crystal',name:'Kristallbruch',desc:'Frozen enemies shatter on defeat, dealing 65 damage in a 130m radius.'}]
};
const PRESSURES={
 survey:{name:'Erkundung',english:'Survey',desc:'Standard expedition. Learn the currents and build something outrageous.',hp:1,damage:1,speed:1,reward:1},
 abyssal:{name:'Tiefendruck',english:'Abyssal',desc:'Stronger, faster hunters. Earn 35% more silver.',hp:1.5,damage:1.35,speed:1.12,reward:1.35},
 iron:{name:'Eiserne Flut',english:'Iron Tide',desc:'Relentless heavy fortresses. Earn 75% more silver.',hp:2.1,damage:1.7,speed:1.22,reward:1.75}
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
scope.UBContent={HULLS,CAPTAINS,CREWS,WEAPONS,RARITIES,ARTIFACTS,EVOLUTIONS,PRESSURES,RESEARCH,BIOMES};if(typeof module!=='undefined')module.exports=scope.UBContent;
})(typeof window!=='undefined'?window:globalThis);
