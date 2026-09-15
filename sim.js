(function(scope){
'use strict';
const C=typeof module!=='undefined'?require('./content.js'):scope.UBContent;
const W=typeof module!=='undefined'?require('./world-data.js'):scope.UBWorld;
const K=typeof module!=='undefined'?require('./campaign-data.js'):scope.UBCampaign;
const {HULLS,CAPTAINS,CREWS,WEAPONS,RARITIES,ARTIFACTS,EVOLUTIONS,PRESSURES,RESEARCH,BIOMES}=C;
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function freshMeta(){return {version:2,silver:0,runs:0,wins:0,bestLevel:0,bestKills:0,discovered:[],research:{hull:0,purse:0,magnet:0,weapon:0,reroll:0},settled:[],totalGold:0};}
function sanitizeMeta(raw){const m=freshMeta();if(!raw||typeof raw!=='object')return m;for(const k of ['silver','runs','wins','bestLevel','bestKills','totalGold'])m[k]=clamp(Math.floor(Number(raw[k])||0),0,1e9);m.discovered=Array.isArray(raw.discovered)?[...new Set(raw.discovered.filter(k=>ARTIFACTS[k]))]:[];m.settled=Array.isArray(raw.settled)?raw.settled.filter(x=>typeof x==='string').slice(-30):[];for(const k in RESEARCH)m.research[k]=clamp(Math.floor(Number(raw.research?.[k])||0),0,RESEARCH[k].max);return m;}
function researchCost(meta,key){return Math.round(RESEARCH[key].cost*(1+(meta.research[key]||0)*.8));}
function purchaseResearch(meta,key){const d=Object.hasOwn(RESEARCH,key)?RESEARCH[key]:null;if(!d||(meta.research[key]||0)>=d.max||meta.silver<researchCost(meta,key))return false;meta.silver-=researchCost(meta,key);meta.research[key]=(meta.research[key]||0)+1;return true;}
class Game{
 constructor(opts={}){
  if(typeof opts==='string')opts={hull:opts};this.seed=(opts.seed??Date.now())>>>0;this.worldSeed=this.seed;this.missionId=typeof opts.mission==='string'&&Object.hasOwn(K.BY_ID,opts.mission)&&K.BY_ID[opts.mission].kind==='mission'?opts.mission:null;this.runId=opts.runId||this.seed+'-'+Math.floor(Date.now()/1000);this.hull=HULLS[opts.hull]?opts.hull:'nautilus';this.captain=CAPTAINS[opts.captain]?opts.captain:'greta';this.crew=CREWS[opts.crew]?opts.crew:'divers';this.meta=sanitizeMeta(opts.meta);const h=HULLS[this.hull],c=CAPTAINS[this.captain];
  this.pressure=Object.hasOwn(PRESSURES,opts.pressure||'')?opts.pressure:'survey';this.fields=[];this.state='playing';this.time=0;this.stageTime=0;this.stage=this.mission?.stage??0;this.level=1;this.xp=0;this.need=28;this.gold=20+(c.startGold||0)+(this.meta.research.purse||0)*10;this.goldEarned=0;this.silver=0;this.kills=0;this.consumed=0;this.chestsOpened=0;this.bosses=0;this.upgradesBought=0;this.id=0;this.events=[];this.enemies=[];this.projectiles=[];this.mines=[];this.loot=[];this.props=[];this.effects=[];this.artifacts=[];this.art={};this.modules={};this.moduleOrder=[];this.pending=[];this.choices=[];this.draftKind='';this.freeRerolls=0;this.rerollsUsed=0;this.offerDelay=12;this.bankDelay=0;this.bossSpawned=false;this.overtime=false;this.combo=0;this.comboT=0;this.bestCombo=0;this.stats={crit:0,damage:0,abilities:0};this.popups=[];
  const hp=Math.round((h.hp+(this.meta.research.hull||0)*12)*(c.hp||1));this.p={x:0,y:0,a:-.6,vx:0,vy:0,r:30,hp,max:hp,speed:h.speed,magnet:h.magnet+(this.meta.research.magnet||0)*12,energy:100,maxEnergy:100,sonar:0,hit:0,shield:0,boosting:false,boostLock:0};
  this.install(WEAPONS[opts.weapon]?opts.weapon:'torpedo');this.populate();this.events=[];
 }
 rand(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 pick(a){return a[Math.floor(this.rand()*a.length)];}
 emit(type,data={}){this.events.push({type,...data});}
 get mission(){return this.missionId?K.BY_ID[this.missionId]:null;}
 get biome(){const base=BIOMES[Math.min(2,this.stage)],m=this.mission;return m?{...base,boss:m.boss,bossAt:m.bossAt,bossHP:m.bossHP}:base;}
 get tier(){return Math.min(4,1+Math.floor((this.level-1)/4));}
 get cap(){return Math.min(6,2+Math.floor(this.level/3));}
 weaponStats(key){const w=WEAPONS[key],m=this.modules[key];if(!w||!m)return null;const elemental=['electric','cryo'].includes(w.family)?CAPTAINS[this.captain].element||1:1;let damage=w.damage*(1+m.auto*.18)*(1+(this.meta.research.weapon||0)*.03)*elemental*(this.crew==='gunners'?1.12:1);damage*=1+(key==='arc'&&m.evolution==='thunder'?.7:key==='flak'&&m.evolution==='steel'?.5:key==='drone'&&m.evolution==='rescue'?.3:0);damage*=1+(this.art[w.family]||0)+(key==='drone'?this.art.droneDamage||0:0)+(key==='harpoon'?this.art.harpoon||0:0);if(this.p.hp/this.p.max<.3)damage*=1+(this.art.lastStand||0);damage*=1+Math.min(.8,Math.floor(this.gold/25)*(this.art.goldDamage||0));const rate=Math.max(.24,1-m.reload*.075)*(1-Math.min(.6,this.art.haste||0))*(this.hull==='wraith'?.85:1);return {damage,cooldown:w.cooldown*rate,range:w.range*(1+m.auto*.015),active:w.active*(CAPTAINS[this.captain].active||1)*Math.max(.45,1-m.reload*.04),ability:1+m.ability*.3,shots:1+Math.floor(m.auto/3)};}
 install(key){if(!WEAPONS[key]||this.modules[key])return false;this.modules[key]={auto:0,ability:0,reload:0,cool:.25,active:0,purchases:0,evolution:null};this.moduleOrder.push(key);this.emit('installed',{key});return true;}
 drop(x,y,value=2,kind='gold'){if(this.loot.length>750)return;this.loot.push({id:++this.id,x,y,value,kind,vx:(this.rand()-.5)*70,vy:(this.rand()-.5)*70,age:0});}
 goldGain(value,x=this.p.x,y=this.p.y){value=Math.max(1,Math.round(value*(CAPTAINS[this.captain].gold||1)*(1+(this.art.gold||0))*(this.mission?.goldMult||1)));this.gold+=value;this.goldEarned+=value;this.p.hp=Math.min(this.p.max,this.p.hp+value*(this.art.goldHeal||0));this.emit('gold',{value,x,y});}
 xpGain(n){this.xp+=Math.round(n*(1+(this.art.xp||0)));while(this.xp>=this.need){this.xp-=this.need;this.level++;this.need=Math.round(this.need*1.18+12);this.p.r=30+(this.tier-1)*5;this.p.hp=Math.min(this.p.max,this.p.hp+10);this.p.max+=5;this.emit('level',{level:this.level,tier:this.tier});if([3,6,9,12,16].includes(this.level)&&this.moduleOrder.length<6)this.pending.push({kind:'module'});}}
 populate(){
  this.world=W.createWorld(this.stage,this.worldSeed);this.discovered=[];
  this.props=[];this.loot=[];this.enemies=[];this.projectiles=[];this.mines=[];this.fields=[];this.spawnT=2;this.rewardT=8;this.eliteT=38;this.bossSpawned=false;
  // Opening salvage path and a visible first vault give the expedition direction.
  for(let i=0;i<10;i++)this.drop(70+i*19,-30-i*8,2,'gold');
  this.addProp('chest',330,-170);this.addProp('habitat',-250,-50);this.addProp('wreck',140,240);this.addProp('repair',-340,210);this.addProp('shipyard',520,80);
  for(let i=0;i<70;i++){const a=this.rand()*TAU,r=420+Math.sqrt(this.rand())*1900;const type=this.rand()<.35?'habitat':this.rand()<.7?'wreck':'cache';this.addProp(type,Math.cos(a)*r,Math.sin(a)*r);}
  for(let i=0;i<9;i++){let a=i*2.4+.3,r=650+i*150;this.addProp('chest',Math.cos(a)*r,Math.sin(a)*r);}
  for(let i=0;i<6;i++){const a=i*1.05+.4;this.addProp('repair',Math.cos(a)*(600+i*180),Math.sin(a)*(600+i*180));}
  for(let i=0;i<14;i++){const a=this.rand()*TAU,r=350+this.rand()*1200;this.spawn('shoal',r,a);}
  for(let i=0;i<4;i++)this.spawn('scout',620+i*110);
 }
 addProp(kind,x,y){
  for(const l of this.world.landmarks){if(!l.solidRadius)continue;const dx=x-l.x,dy=y-l.y,d=Math.hypot(dx,dy),r=l.solidRadius+70;if(d<r){const a=d?Math.atan2(dy,dx):Math.atan2(l.courtyard.y-l.y,l.courtyard.x-l.x);x=l.x+Math.cos(a)*r;y=l.y+Math.sin(a)*r;}}
  const prop={id:++this.id,kind,x,y,a:this.rand()*TAU,used:false,hold:0,tier:kind==='habitat'?1+Math.floor(this.rand()*3):1};this.props.push(prop);return prop;
 }
 resolveLandmarks(entity,slide=0){
  for(const l of this.world.landmarks){if(!l.solidRadius)continue;let dx=entity.x-l.x,dy=entity.y-l.y,d=Math.hypot(dx,dy),r=l.solidRadius+(entity.r||0);if(d>=r)continue;
   if(d<.0001){dx=l.courtyard.x-l.x;dy=l.courtyard.y-l.y;d=Math.hypot(dx,dy)||1;}const nx=dx/d,ny=dy/d;
   entity.x=l.x+nx*(r+.01);entity.y=l.y+ny*(r+.01);
   if(Number.isFinite(entity.vx)&&Number.isFinite(entity.vy)){const inward=entity.vx*nx+entity.vy*ny;if(inward<0){entity.vx-=nx*inward;entity.vy-=ny*inward;}}
   if(slide){const cross=nx*(this.p.y-entity.y)-ny*(this.p.x-entity.x),side=Math.abs(cross)>.001?Math.sign(cross):(entity.id%2?1:-1);entity.x-=ny*slide*side;entity.y+=nx*slide*side;}
   entity.x=clamp(entity.x,-2450,2450);entity.y=clamp(entity.y,-2450,2450);
  }
 }
 updateDiscoveries(){
  for(const l of this.world.landmarks){if(this.discovered.includes(l.id)||distance(this.p,l)>l.radius)continue;
   this.discovered.push(l.id);const before=this.gold;this.goldGain(l.gold,l.courtyard.x,l.courtyard.y);
   const chest=this.addProp('chest',l.courtyard.x,l.courtyard.y);chest.discovery=l.id;
   this.emit('discovery',{id:l.id,name:l.name,english:l.english,x:l.x,y:l.y,gold:this.gold-before});
  }
 }
 spawn(kind,dist=900,a=this.rand()*TAU){const defs={shoal:[8,8,42,2],scout:[42,24,70,9],rammer:[85,31,92,14],gunner:[105,34,54,13],fort:[260,46,38,20],elite:[570,58,44,24],boss:[this.biome.bossHP,95,36,28]};const [hp,r,speed,damage]=defs[kind];const mission=this.mission,scale=kind==='boss'?1:1+(mission?0:this.stage*.55)+this.stageTime/550,armor=kind==='shoal'||kind==='boss'?1:mission?.enemyHp||1;const e={id:++this.id,kind,x:clamp(this.p.x+Math.cos(a)*dist,-2520,2520),y:clamp(this.p.y+Math.sin(a)*dist,-2520,2520),a:a+Math.PI,hp:hp*scale*armor*(kind==='shoal'?1:PRESSURES[this.pressure].hp),max:hp*scale*armor*(kind==='shoal'?1:PRESSURES[this.pressure].hp),r,speed:speed*(kind==='shoal'?1:PRESSURES[this.pressure].speed*(mission?.enemySpeed||1)),damage:damage*(mission?mission.enemyDamage:1+this.stage*.15)*PRESSURES[this.pressure].damage,shot:1.8+this.rand()*2,hit:0,slow:0,stun:0,charge:0,phase:0};this.enemies.push(e);return e;}
 emitDamage(e,n,family='kinetic',critEligible=true){if(e.hp<=0||['lost','won','sector'].includes(this.state))return;let crit=critEligible&&this.rand()<.06+(this.art.crit||0);if(crit){n*=2;this.stats.crit++;}if(e.slow>0)n*=1+(this.art.shatter||0);e.hp-=n;e.hit=.12;this.stats.damage+=n;this.emit('damage',{x:e.x,y:e.y,value:Math.round(n),crit});if(e.hp<=0)this.kill(e,family);}
 kill(e,family){this.kills++;this.combo++;this.comboT=4;this.bestCombo=Math.max(this.bestCombo,this.combo);const boss=e.kind==='boss',elite=e.kind==='elite';this.emit('explode',{x:e.x,y:e.y,size:e.r,boss,elite});this.xpGain(boss?110:elite?55:e.kind==='fort'?26:e.kind==='shoal'?2:8);const num=boss?30:elite?15:e.kind==='shoal'?1:4;for(let i=0;i<num;i++)this.drop(e.x,e.y,boss?8:elite?5:2,'gold');
  if(this.art.blastGold&&family==='explosive')this.goldGain(this.art.blastGold,e.x,e.y);
  if(this.art.killReset&&this.kills%this.art.killReset===0){for(const m of Object.values(this.modules))m.active=0;this.emit('reset');}
  if(elite){this.addProp('chest',e.x,e.y);this.silver+=8+this.stage*3;this.emit('elite',{silver:8+this.stage*3});}
  if(e.slow>0&&this.modules.cryo?.evolution==='crystal')this.explosion(e.x,e.y,130,65,'cryo',true);
  if(this.art.deathBlast&&e.kind!=='shoal')this.explosion(e.x,e.y,90,this.art.deathBlast,'explosive',true);
  if(boss){this.bosses++;this.silver+=35+this.stage*25;this.goldGain(90+this.stage*45);this.pending=[];this.state=this.missionId||this.stage===2?'won':'sector';this.emit(this.state,{stage:this.stage});}
 }
 explosion(x,y,r,damage,family='explosive',chain=false){r*=1+(this.art.blastRadius||0);this.emit('blast',{x,y,r,family});const victims=this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<r+e.r);for(const e of victims)this.emitDamage(e,damage,family,!chain);}
 damage(n){const p=this.p;if(p.hit>0||p.shield>0||this.state!=='playing')return;p.hp=Math.max(0,p.hp-n);p.hit=.45;this.emit('hit',{value:n});if(p.hp<=0){if(this.art.revives>0){this.art.revives--;p.hp=p.max*.45;p.shield=3;this.explosion(p.x,p.y,400,160,'electric');this.emit('revive');}else{this.state='lost';this.emit('lost');}}}
 heal(value){const p=this.p,old=p.hp;p.hp=Math.min(p.max,p.hp+value*(CAPTAINS[this.captain].repair||1));if(p.hp>old){p.shield=Math.max(p.shield,this.art.repairShield||0);this.emit('heal',{value:Math.round(p.hp-old),x:p.x,y:p.y});}}
 consume(prop){prop.used=true;this.consumed++;let gold=prop.kind==='cache'?16:prop.kind==='habitat'?12*prop.tier:9;gold+=this.crew==='divers'?3:0;this.goldGain(gold,prop.x,prop.y);this.xpGain(prop.kind==='habitat'?12*prop.tier:7);this.heal(this.art.consumeHeal||0);this.emit('consume',{x:prop.x,y:prop.y,kind:prop.kind});if(this.art.consumePay&&this.consumed%10===0){this.goldGain(this.art.consumePay);this.emit('jackpot',{value:this.art.consumePay});}}
 rarity(min=0){const r=this.rand()*100;return min>=2?'rare':min>=1?(r<25?'rare':'uncommon'):r<3?'legendary':r<15?'rare':r<42?'uncommon':'common';}
 upgradePrice(rarity='common'){return Math.max(8,Math.round((24+this.upgradesBought*5)*(.8+RARITIES[rarity].factor*.2)*(1-Math.min(.5,this.art.discount||0))));}
 openDraft(kind,options={}){if(this.state!=='playing')return false;this.state='draft';this.draftKind=kind;this.draftContext=options;this.freeRerolls=1+(this.meta.research.reroll||0)+(this.art.rerolls||0);this.rerollsUsed=0;this.makeChoices();this.emit('draft',{kind});return true;}
 makeChoices(){const kind=this.draftKind;this.choices=[];const used=new Set();if(kind==='evolution'){const key=this.draftContext.key;this.choices=(EVOLUTIONS[key]||[]).map(d=>({id:key+'-'+d.id,key,evolution:d.id,rarity:'legendary',cost:0}));}
  else if(kind==='artifact'){const pool=Object.keys(ARTIFACTS).filter(k=>!this.artifacts.some(a=>a.key===k)||!['echoMirror','abyssHeart'].includes(k));while(this.choices.length<3&&pool.length){const weights=pool.map(k=>({common:4,uncommon:3,rare:1.6,legendary:.45})[ARTIFACTS[k].rarity]);let r=this.rand()*weights.reduce((a,b)=>a+b,0),idx=0;while(r>weights[idx]&&idx<pool.length-1){r-=weights[idx++];}const key=pool.splice(idx,1)[0];this.choices.push({id:key,key,rarity:ARTIFACTS[key].rarity,cost:0});}}
  else if(kind==='module'){const pool=Object.keys(WEAPONS).filter(k=>!this.modules[k]);while(this.choices.length<3&&pool.length){const key=pool.splice(Math.floor(this.rand()*pool.length),1)[0];this.choices.push({id:key,key,rarity:'uncommon',cost:0});}}
  else {for(let i=0;i<3;i++){let key,stat,id,tries=0;do{key=this.pick(this.moduleOrder);stat=this.pick(['auto','ability','reload']);id=key+'-'+stat;tries++;}while(used.has(id)&&tries<50);used.add(id);const rarity=this.rarity();this.choices.push({id,key,stat,rarity,cost:this.upgradePrice(rarity),amount:RARITIES[rarity].factor});}if(this.choices.every(c=>c.cost>this.gold))this.choices[0].cost=this.upgradePrice('common');}
 }
 reroll(){if(this.state!=='draft'||this.draftKind==='evolution')return false;const cost=this.rerollsUsed<this.freeRerolls?0:8+(this.rerollsUsed-this.freeRerolls)*5;if(this.gold<cost)return false;this.gold-=cost;this.rerollsUsed++;this.makeChoices();this.emit('reroll');return true;}
 choose(id){if(this.state!=='draft')return false;const c=this.choices.find(c=>c.id===id);if(!c||this.gold<c.cost)return false;this.gold-=c.cost;const kind=this.draftKind;if(kind==='artifact')this.applyArtifact(c.key);else if(kind==='module')this.install(c.key);else if(kind==='evolution'){this.modules[c.key].evolution=c.evolution;this.emit('evolution',{key:c.key,evolution:c.evolution});}else{const m=this.modules[c.key];m[c.stat]+=c.amount;m.purchases=(m.purchases||0)+1;if(m.purchases===5&&!m.evolution)this.pending.unshift({kind:'evolution',key:c.key});this.upgradesBought++;this.emit('upgrade',{key:c.key,stat:c.stat,rarity:c.rarity});}this.state='playing';this.choices=[];this.bankDelay=8;return true;}
 bank(){if(this.state!=='draft'||this.draftKind!=='upgrade')return false;this.state='playing';this.choices=[];this.bankDelay=22;return true;}
 applyArtifact(key){const def=ARTIFACTS[key];if(!def)return;const factor=this.art.nextDouble&&key!=='echoMirror'?2:1;if(factor===2)this.art.nextDouble--;this.artifacts.push({key,factor});for(const [k,v] of Object.entries(def.effect)){if(k==='hp'){this.p.max+=v*factor;this.p.hp+=v*factor;}else if(k==='energy'){this.p.maxEnergy+=v*factor;this.p.energy+=v*factor;}else if(k==='magnet')this.p.magnet+=v*factor;else if(k==='grantGold')this.goldGain(v*factor);else this.art[k]=(this.art[k]||0)+v*factor;}this.goldGain(this.art.chestGold||1);this.emit('artifact',{key,factor});}
 nearest(x,y,range=700,exclude=[]){let out=null,bd=range;for(const e of this.enemies){const d=Math.hypot(e.x-x,e.y-y);if(e.hp>0&&!exclude.includes(e.id)&&d<bd){bd=d;out=e;}}return out;}
 projectile(key,x,y,a,damage,options={}){this.projectiles.push({id:++this.id,key,x,y,ox:x,oy:y,a,damage,speed:options.speed||360,life:options.life||2.5,enemy:false,hitIds:[],...options});}
 fire(key,active=false){const m=this.modules[key],w=WEAPONS[key];if(!m||this.state!=='playing')return false;const p=this.p,s=this.weaponStats(key),t=this.nearest(p.x,p.y,s.range+100);if(active&&m.active>0)return false;if(!active&&!t&&key!=='mines')return false;const a=t?Math.atan2(t.y-p.y,t.x-p.x):p.a;let damage=s.damage*(active?s.ability*1.7:1);if(active){m.active=s.active;this.stats.abilities++;this.emit('ability',{key});}else m.cool=s.cooldown;
  if(key==='torpedo'){const n=(active?6:1+Math.floor(m.auto/3))+(this.art.extraTorpedo||0)+(m.evolution==='swarm'?2:0);for(let i=0;i<n;i++){let aa=a+(i-(n-1)/2)*.12;this.projectile(key,p.x,p.y,aa,damage,{target:t?.id,speed:300,life:3});}}
  if(key==='flak'||key==='harpoon'){const n=(active?(key==='flak'?18:7):key==='flak'?5:1+s.shots)+(key==='flak'&&m.evolution==='hail'?(active?12:4):key==='harpoon'&&m.evolution==='trident'?3:0);for(let i=0;i<n;i++){const aa=active&&key==='flak'?i/n*TAU:a+(i-(n-1)/2)*(key==='flak'?.13:.09);this.projectile(key,p.x,p.y,aa,damage,{speed:key==='harpoon'?510:440,life:key==='harpoon'?1.7:1.15,pierce:true});}}
  if(key==='arc'){let x=p.x,y=p.y;const hit=[];for(let i=0;i<(active?8:3)+Math.floor(m.auto/2)+(this.art.chains||0)+(m.evolution==='web'?3:0);i++){const e=this.nearest(x,y,(active?440:290)*(active&&m.evolution==='thunder'?1.5:1),hit);if(!e)break;this.emit('arc',{x,y,tx:e.x,ty:e.y});this.emitDamage(e,damage,'electric');hit.push(e.id);e.stun=active?.7:m.evolution==='web'?.22:0;x=e.x;y=e.y;}}
  if(key==='mortar'){const tx=t?.x??p.x+Math.cos(a)*300,ty=t?.y??p.y+Math.sin(a)*300;for(let i=0;i<(active?5:1)*(m.evolution==='double'?2:1);i++){const spread=active?110:20;this.projectile(key,p.x,p.y,a,damage,{tx:tx+(this.rand()-.5)*spread,ty:ty+(this.rand()-.5)*spread,flight:0,duration:1.2,life:1.3});}}
  if(key==='mines'){for(let i=0;i<(active?(m.evolution==='chain'?12:8):1);i++){const aa=active?i/(m.evolution==='chain'?12:8)*TAU:p.a+Math.PI,r=active?95:60;this.mines.push({id:++this.id,x:p.x+Math.cos(aa)*r,y:p.y+Math.sin(aa)*r,damage,life:18,age:0});}}
  if(key==='drone'){if(active)this.droneOver=m.evolution==='queen'?12:7;else {const n=2+(this.art.drones||0)+Math.floor(m.auto/3)+(m.evolution==='queen'?3:0);for(let i=0;i<n;i++){const aa=this.time*.75+i/n*TAU,x=p.x+Math.cos(aa)*70,y=p.y+Math.sin(aa)*70,tt=this.nearest(x,y,s.range);if(tt)this.projectile(key,x,y,Math.atan2(tt.y-y,tt.x-x),damage*(this.droneOver>0?1.6:1),{speed:450,life:1.5});}}}
  if(key==='cryo'){const r=(active?340:220)+(m.evolution==='zero'?80:0);this.emit('frost',{x:p.x,y:p.y,r,active});for(const e of this.enemies)if(e.hp>0&&distance(p,e)<r+e.r){this.emitDamage(e,damage*(active?4:1),'cryo');e.slow=active?5:1.3;if(active)e.stun=1;else if(m.evolution==='zero')e.stun=.35;}}
  this.emit('shot',{key,x:p.x,y:p.y,active});return true;
 }
 activate(index){return this.fire(this.moduleOrder[index],true);}
 pulse(){const p=this.p;if(this.state!=='playing'||p.sonar>0)return false;p.sonar=11*(1-Math.min(.65,this.art.sonarHaste||0));const r=290+(this.tier-1)*25;this.emit('sonar',{x:p.x,y:p.y,r});for(const e of this.enemies)if(e.hp>0&&distance(p,e)<r+e.r){const d=distance(p,e)||1;this.emitDamage(e,55+this.tier*10,'electric');e.x+=(e.x-p.x)/d*80;e.y+=(e.y-p.y)/d*80;e.stun=.35;}for(const b of this.projectiles)if(b.enemy&&distance(p,b)<r)b.life=0;for(const l of this.loot)if(distance(p,l)<(this.art.sonarMagnet||r*1.4))l.magnet=true;return true;}
 nextSector(){if(this.missionId||this.state!=='sector')return false;this.stage++;this.stageTime=0;this.p.x=0;this.p.y=0;this.p.vx=0;this.p.vy=0;this.heal(this.p.max*.35);this.p.energy=this.p.maxEnergy;this.state='playing';this.populate();this.pending=[{kind:'artifact'},{kind:'module'}].filter(x=>x.kind!=='module'||this.moduleOrder.length<6);this.emit('sectorStart',{stage:this.stage});return true;}
 extract(){if(this.state!=='sector')return false;this.state='won';this.emit('won');return true;}
 settlement(meta){if(!['won','lost'].includes(this.state))return false;if(meta.settled.includes(this.runId))return false;const reward=Math.round((this.silver+Math.floor(this.goldEarned/25)+this.level+(this.state==='won'?30:0))*PRESSURES[this.pressure].reward);meta.silver+=reward;meta.runs++;if(this.state==='won')meta.wins++;meta.bestLevel=Math.max(meta.bestLevel,this.level);meta.bestKills=Math.max(meta.bestKills,this.kills);meta.totalGold+=this.goldEarned;meta.discovered=[...new Set([...meta.discovered,...this.artifacts.map(a=>a.key)])];meta.settled.push(this.runId);meta.settled=meta.settled.slice(-30);return reward;}
 snapshot(){const data={};for(const key of Object.keys(this))if(key!=='events')data[key]=this[key];return JSON.parse(JSON.stringify({version:3,data}));}
 static restore(raw){
  if(!raw||raw.version!==3||!raw.data||typeof raw.data!=='object')return null;
  const d=raw.data;if(!['playing','paused','draft','sector'].includes(d.state)||!Object.hasOwn(HULLS,d.hull)||!Object.hasOwn(CAPTAINS,d.captain)||!Object.hasOwn(CREWS,d.crew)||!Object.hasOwn(PRESSURES,d.pressure)||!d.p||!Array.isArray(d.moduleOrder)||!d.moduleOrder.length||d.moduleOrder.length>6||new Set(d.moduleOrder).size!==d.moduleOrder.length||!d.modules)return null;
  if(!Number.isFinite(d.p.hp)||d.p.hp<=0||!Number.isFinite(d.p.max)||d.p.max<=0||!Number.isFinite(d.p.x)||!Number.isFinite(d.p.y)||!Number.isInteger(d.stage)||d.stage<0||d.stage>2||!Number.isInteger(d.seed)||d.seed<0)return null;
  for(const k of d.moduleOrder){const m=d.modules[k];if(!Object.hasOwn(WEAPONS,k)||!m||!['auto','ability','reload','cool','active'].every(n=>Number.isFinite(m[n])))return null;if(m.evolution&&!EVOLUTIONS[k].some(e=>e.id===m.evolution))return null;}
  const limits={enemies:100,projectiles:1200,mines:100,loot:800,props:1000,artifacts:1000,pending:30,choices:3,fields:40};for(const [k,limit]of Object.entries(limits))if(!Array.isArray(d[k])||d[k].length>limit)return null;
  for(const k of ['enemies','projectiles','mines','loot','props','fields'])for(const e of d[k])if(!e||!Number.isFinite(e.x)||!Number.isFinite(e.y))return null;
  if(d.artifacts.some(a=>!a||!Object.hasOwn(ARTIFACTS,a.key)||![1,2].includes(a.factor)))return null;
  if(d.state==='draft'&&(!['artifact','module','upgrade','evolution'].includes(d.draftKind)||!d.choices.length))return null;
  if(Object.hasOwn(d,'missionId')&&d.missionId!==null&&(typeof d.missionId!=='string'||!Object.hasOwn(K.BY_ID,d.missionId)||K.BY_ID[d.missionId].kind!=='mission'||K.BY_ID[d.missionId].stage!==d.stage||d.state==='sector'))return null;
  const g=new Game({hull:d.hull,captain:d.captain,crew:d.crew,pressure:d.pressure,seed:d.seed,runId:d.runId,mission:d.missionId});for(const k of Object.keys(g))if(Object.hasOwn(d,k))g[k]=d[k];for(const k of ['draftContext','droneOver'])if(Object.hasOwn(d,k))g[k]=d[k];g.meta=sanitizeMeta(d.meta);
  if(Object.hasOwn(d,'worldSeed')&&(!Number.isInteger(d.worldSeed)||d.worldSeed<0||d.worldSeed>0xffffffff))return null;
  if(Object.hasOwn(d,'discovered')&&(!Array.isArray(d.discovered)||d.discovered.some(id=>typeof id!=='string')))return null;
  const legacySeed=/^(\d{1,10})-/.exec(String(d.runId||''));
  g.worldSeed=Object.hasOwn(d,'worldSeed')?d.worldSeed:legacySeed&&Number(legacySeed[1])<=0xffffffff?Number(legacySeed[1]):d.seed>>>0;
  // Regenerate the immutable layout instead of trusting arbitrary saved geometry.
  g.world=W.createWorld(g.stage,g.worldSeed);const ids=new Set(g.world.landmarks.map(l=>l.id));
  g.discovered=[...new Set((d.discovered||[]).filter(id=>ids.has(id)))];g.events=[];return g;
 }
 update(dt,input={}){
  if(this.state!=='playing')return;dt=clamp(dt,0,.05);const p=this.p;this.time+=dt;this.stageTime+=dt;this.comboT-=dt;if(this.comboT<=0)this.combo=0;this.bankDelay-=dt;this.offerDelay-=dt;this.droneOver=Math.max(0,(this.droneOver||0)-dt);
  let ix=input.x||0,iy=input.y||0,n=Math.hypot(ix,iy);if(n>1){ix/=n;iy/=n;}let boosting=!!input.boost&&n>.05&&p.energy>1;
  if(boosting)p.boostLock=.5;else p.boostLock=Math.max(0,p.boostLock-dt);p.energy=clamp(p.energy+(boosting?-32*(1-Math.min(.75,this.art.boostSave||0)):p.boostLock<=0?20:0)*dt,0,p.maxEnergy);p.boosting=boosting;
  p.hit=Math.max(0,p.hit-dt);p.shield=Math.max(0,p.shield-dt);p.sonar=Math.max(0,p.sonar-dt);p.hp=Math.min(p.max,p.hp+((this.art.regen||0)+(this.crew==='mechanics'&&!boosting?1:0))*dt);
  if(n>.05){let da=Math.atan2(iy,ix)-p.a;p.a+=clamp(Math.atan2(Math.sin(da),Math.cos(da)),-HULLS[this.hull].turn*dt,HULLS[this.hull].turn*dt);}
  const speed=p.speed*(boosting?1.9:1),desired=n>.05?Math.min(1,n):0,smooth=1-Math.exp(-dt*3.7);p.vx+=(Math.cos(p.a)*speed*desired-p.vx)*smooth;p.vy+=(Math.sin(p.a)*speed*desired-p.vy)*smooth;p.x=clamp(p.x+p.vx*dt,-2450,2450);p.y=clamp(p.y+p.vy*dt,-2450,2450);this.resolveLandmarks(p);
  if(input.sonar)this.pulse();if(input.activeAll)for(let i=0;i<this.moduleOrder.length;i++)this.activate(i);
  for(const [key,m] of Object.entries(this.modules)){m.cool-=dt*(key==='drone'&&this.droneOver>0?1.8:1);m.active=Math.max(0,m.active-dt*(boosting?1+(this.art.boostHaste||0):1));if(m.cool<=0)this.fire(key);}
  this.spawnT-=dt;if(this.spawnT<=0){this.spawnT=Math.max(.65,2.7-this.stageTime/120-this.stage*.25);if(this.enemies.length<75){const r=this.rand();this.spawn(this.stageTime>65&&r<.13?'fort':this.stageTime>30&&r<.35?'gunner':r<.62?'rammer':'scout');if(this.rand()<.7)for(let i=0;i<3;i++)this.spawn('shoal',650+this.rand()*250);}}
  this.eliteT-=dt;if(this.eliteT<=0){this.eliteT=55;this.spawn('elite',850);this.emit('eliteIncoming');}
  if(this.stageTime>=this.biome.bossAt&&!this.bossSpawned){this.bossSpawned=true;this.spawn('boss',900);this.emit('boss',{name:this.biome.boss});}
  const overtime=this.stageTime>this.biome.bossAt+95;if(overtime&&!this.overtime){this.overtime=true;this.emit('overtime');}if(!overtime)this.overtime=false;
  for(const e of this.enemies){if(e.hp<=0)continue;e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);e.stun=Math.max(0,e.stun-dt);e.shot-=dt;const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;let a=Math.atan2(dy,dx);e.a=a;const boss=e.kind==='boss',shoal=e.kind==='shoal';
   if(shoal){if(d<175){e.x-=dx/d*e.speed*dt;e.y-=dy/d*e.speed*dt;}else{e.x+=Math.cos(e.a+1.2)*e.speed*.3*dt;e.y+=Math.sin(e.a+1.2)*e.speed*.3*dt;}if(d<p.r+16){e.hp=0;this.consumed++;this.goldGain(2);this.xpGain(3);this.emit('consume',{x:e.x,y:e.y,kind:'shoal'});this.heal(this.art.consumeHeal||0);}continue;}
   let speed=e.speed*(e.slow>0?.45:1)*(this.overtime?1.45:1),stop=e.kind==='gunner'?280:boss?320:0;
   if(boss){e.phase+=dt;if(e.phase>8){e.phase=0;e.charge=1.4;this.emit('bossCharge',{x:e.x,y:e.y});}e.charge=Math.max(0,e.charge-dt);if(e.charge>0){speed*=4;stop=0;}}
   if(e.stun<=0&&d>stop){e.x+=dx/d*speed*dt;e.y+=dy/d*speed*dt;}this.resolveLandmarks(e,e.stun<=0?speed*dt*.85:0);
   if(d<e.r+p.r){if(e.kind!=='boss'&&e.kind!=='elite'&&e.r<p.r*.8){e.hp=0;this.kill(e,'consume');this.consumed++;this.heal(this.art.consumeHeal||0);this.emit('consume',{x:e.x,y:e.y,kind:e.kind});for(const l of this.loot)if(distance(l,e)<80)l.magnet=true;continue;}if(boosting){this.emitDamage(e,(this.hull==='bastion'?55:35)*(1+(this.art.ram||0)),'kinetic');e.x-=dx/d*35;e.y-=dy/d*35;}this.damage(e.damage);if(this.state==='lost')return;e.x-=dx/d*12;e.y-=dy/d*12;}
   if(['gunner','fort','elite','boss'].includes(e.kind)&&e.shot<=0&&d<1000&&e.stun<=0){e.shot=boss?2.4:e.kind==='elite'?2.6:3.4;const count=boss?7:e.kind==='elite'?5:e.kind==='fort'?3:1;for(let i=0;i<count;i++)this.projectile('hostile',e.x,e.y,a+(i-(count-1)/2)*.15,e.damage,{enemy:true,speed:160+this.stage*15,life:6});this.emit('enemyShot',{x:e.x,y:e.y});}
  }
  for(const b of this.projectiles){b.life-=dt;if(b.life<=0)continue;b.age=(b.age||0)+dt;if(b.key==='mortar'){b.flight+=dt;const t=clamp(b.flight/b.duration,0,1);b.x=b.ox+(b.tx-b.ox)*t;b.y=b.oy+(b.ty-b.oy)*t;b.height=Math.sin(t*Math.PI)*160;if(t>=1){this.explosion(b.x,b.y,110,b.damage);if(this.modules.mortar?.evolution==='fire'){this.fields.push({id:++this.id,x:b.x,y:b.y,life:4,tick:0,damage:b.damage*.25});this.emit('mineralFire',{x:b.x,y:b.y,r:110});}b.life=0;}continue;}
   if(b.target){const e=this.enemies.find(e=>e.id===b.target&&e.hp>0);if(e){let da=Math.atan2(e.y-b.y,e.x-b.x)-b.a;b.a+=Math.atan2(Math.sin(da),Math.cos(da))*Math.min(1,dt*(this.art.extraTorpedo?7:4));}}
   b.x+=Math.cos(b.a)*b.speed*dt;b.y+=Math.sin(b.a)*b.speed*dt;
   if(b.enemy){if(distance(b,p)<p.r){this.damage(b.damage);b.life=0;if(this.state==='lost')return;}}
   else for(const e of this.enemies)if(e.hp>0&&!b.hitIds.includes(e.id)&&distance(b,e)<e.r+6){this.emitDamage(e,b.damage*(b.key==='harpoon'&&this.modules.harpoon?.evolution==='whale'&&e.hp>e.max*.5?2:1),WEAPONS[b.key]?.family||'kinetic');b.hitIds.push(e.id);if(b.key==='drone'&&this.modules.drone?.evolution==='rescue')p.hp=Math.min(p.max,p.hp+.8);if(b.key==='flak'&&this.modules.flak?.evolution==='steel'&&!b.bounced){const next=this.nearest(e.x,e.y,240,b.hitIds);if(next){b.a=Math.atan2(next.y-b.y,next.x-b.x);b.bounced=true;}}if(b.key==='harpoon'){e.x-=(e.x-p.x)*.09*(this.art.harpoon?2:1);e.y-=(e.y-p.y)*.09*(this.art.harpoon?2:1);}if(b.key==='torpedo'&&(this.art.torpedoBlast||this.modules.torpedo?.evolution==='split'))this.explosion(e.x,e.y,(this.art.torpedoBlast||0)+(this.modules.torpedo?.evolution==='split'?110:0),b.damage*.6);if(!b.pierce){b.life=0;break;}}
  }
  for(const m of this.mines){m.life-=dt;m.age+=dt;if(m.life>0&&m.age>.4&&this.enemies.some(e=>e.hp>0&&distance(e,m)<(this.modules.mines?.evolution==='anchor'?105:60)+e.r)){this.explosion(m.x,m.y,this.modules.mines?.evolution==='anchor'?210:130,m.damage);if(this.modules.mines?.evolution==='chain')for(let i=0;i<6;i++)this.projectile('flak',m.x,m.y,i/6*TAU,m.damage*.4,{speed:440,life:1,pierce:true});m.life=0;}}
  for(const f of this.fields){f.life-=dt;f.tick-=dt;if(f.tick<=0&&f.life>0){f.tick=.5;this.explosion(f.x,f.y,110,f.damage,'explosive');}}this.fields=this.fields.filter(f=>f.life>0).slice(-40);
  if(this.state!=='playing')return;
  this.updateDiscoveries();
  for(let i=this.loot.length-1;i>=0;i--){const l=this.loot[i];l.age+=dt;l.x+=l.vx*dt;l.y+=l.vy*dt;l.vx*=Math.exp(-dt*5);l.vy*=Math.exp(-dt*5);const dx=p.x-l.x,dy=p.y-l.y,d=Math.hypot(dx,dy)||1;if(d<p.magnet||l.magnet){const move=Math.min(d,(180+Math.max(0,p.magnet-d)*3)*dt);l.x+=dx/d*move;l.y+=dy/d*move;}if(d<p.r+10&&l.age>.1){this.loot.splice(i,1);this.goldGain(l.value,l.x,l.y);}}
  for(const prop of this.props){if(prop.used)continue;const d=distance(p,prop);if(d<60+p.r){if(['wreck','cache'].includes(prop.kind)||prop.kind==='habitat'&&this.tier>=prop.tier){this.consume(prop);}else if(prop.kind==='repair'&&p.hp<p.max-12){prop.used=true;this.heal(p.max*.3+25);}else if(prop.kind==='chest'){prop.hold+=dt;if(prop.hold>.4){prop.used=true;this.chestsOpened++;this.emit('chest',{x:prop.x,y:prop.y});this.pending.push({kind:'artifact'});}}else if(prop.kind==='shipyard'&&this.offerDelay<=0&&this.bankDelay<=0&&this.gold>=this.upgradePrice()){this.offerDelay=20;this.pending.push({kind:'upgrade'});}}else prop.hold=0;}
  this.rewardT-=dt;if(this.rewardT<=0){this.rewardT=10;const a=this.rand()*TAU,d=300+this.rand()*300;if(this.props.filter(p=>!p.used).length<150)this.addProp(this.rand()<.2?'chest':'cache',clamp(p.x+Math.cos(a)*d,-2380,2380),clamp(p.y+Math.sin(a)*d,-2380,2380));}
  this.enemies=this.enemies.filter(e=>e.hp>0&&(e.kind==='boss'||distance(e,p)<1600));this.projectiles=this.projectiles.filter(b=>b.life>0);this.mines=this.mines.filter(m=>m.life>0).slice(-80);this.loot=this.loot.filter(l=>distance(l,p)<3000).slice(-750);this.props=this.props.filter(p=>!p.used||distance(p,this.p)<950);if(this.events.length>800)this.events=this.events.slice(-800);
  if(this.pending.length){const next=this.pending.shift();if(next.kind==='module'&&this.moduleOrder.length>=6)return;this.openDraft(next.kind,next);}
  else if(this.gold>=this.upgradePrice()&&this.bankDelay<=0&&this.offerDelay<=0){this.openDraft('upgrade');this.offerDelay=12;}
 }
}
scope.Underburg={Game,...C,clamp,distance,freshMeta,sanitizeMeta,purchaseResearch,researchCost};if(typeof module!=='undefined')module.exports=scope.Underburg;
})(typeof window!=='undefined'?window:globalThis);
