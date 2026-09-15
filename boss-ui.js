const $=id=>document.getElementById(id);
let timeline,progressLabel,rows;
function mount(){
 if(timeline)return;
 timeline=document.createElement('div');timeline.id='boss-timeline';timeline.setAttribute('aria-label','Mission guardian schedule');
 for(let i=0;i<3;i++){const el=document.createElement('div');el.className='boss-milestone';el.dataset.bossWave=i;el.innerHTML='<b></b><span></span>';timeline.append(el);}
 progressLabel=document.createElement('div');progressLabel.id='boss-progress';const mission=document.querySelector('.mission'),location=document.getElementById('location-chip');mission.insertBefore(timeline,location);mission.insertBefore(progressLabel,location);
 rows=document.createElement('div');rows.id='boss-contacts';
 for(let i=0;i<3;i++){const row=document.createElement('div');row.className='boss-contact';row.dataset.bossContact=i;row.innerHTML='<div><span></span><b></b></div><div class="bar"><i></i></div><div class="boss-phase"><strong></strong><em></em></div>';rows.append(row);}
 $('boss-hud').append(rows);
}
export function syncBossHud(g,fmt){
 mount();const progress=g.bossProgress,active=g.enemies.filter(e=>e.kind==='boss'&&e.hp>0),mission=!!progress;
 $('hud').style.setProperty('--active-boss-count',active.length);timeline.hidden=progressLabel.hidden=!mission;rows.hidden=!mission;
 $('boss-name').hidden=mission;$('boss-fill').parentElement.hidden=mission;
 $('boss-hud').classList.toggle('mission-bosses',mission);$('boss-hud').classList.toggle('hidden',!active.length);
 if(!mission){const boss=active[0];$('countdown').textContent=g.bossSpawned?(g.overtime?'PRESSURE SURGE · THE DEEP IS CLOSING IN':'Hunt '+g.biome.boss+' · follow the red signal'):'Guardian signal in '+fmt(Math.max(0,g.biome.bossAt-g.stageTime));if(boss){$('boss-name').textContent=g.biome.boss.toUpperCase();$('boss-fill').style.width=Math.max(0,boss.hp/boss.max*100)+'%';}return;}
 progressLabel.textContent=progress.defeated+' / 3 GUARDIANS DEFEATED · ONE RUN';
 for(let i=0;i<3;i++){const el=timeline.children[i],wave=g.mission.bossWaves[i],defeated=g.bossKillWaves.includes(i),live=active.find(e=>e.bossWave===i);
  el.className='boss-milestone'+(defeated?' defeated':live?' active':'');el.querySelector('b').textContent=defeated?'✓':String(i+1);el.querySelector('span').textContent=defeated?'DEFEATED':fmt(wave.at);el.title=wave.name+' · '+fmt(wave.at)+(defeated?' · defeated':live?' · active':'');
  const row=rows.children[i];row.hidden=!live;if(live){row.querySelector('span').textContent=(i+1)+' / '+live.bossName;row.querySelector('b').textContent=Math.ceil(live.hp/live.max*100)+'%';row.querySelector('i').style.width=Math.max(0,live.hp/live.max*100)+'%';const state=live.bossState||'cruise',exposed=(live.exposed||0)>0,pattern=live.bossPattern||window.UBContent.BOSS_COMBAT?.[live.bossRole]?.pattern,action=pattern==='fan'?'DODGE BROADSIDE':pattern==='lance'?'DODGE LANCE':'DODGE BARRAGE';row.dataset.phase=exposed?'recovery':state;row.dataset.enraged=live.bossEnraged?'true':'false';const phase=row.querySelector('.boss-phase');phase.querySelector('strong').textContent=exposed?'EXPOSED ×'+(live.exposedMult||1).toFixed(1):state==='windup'||state==='attack'?action:live.bossEnraged?'ENRAGED':'MANEUVERING';phase.querySelector('em').textContent=exposed?live.exposed.toFixed(1)+'s':state==='windup'?Math.max(0,live.bossTimer).toFixed(1)+'s':state==='attack'?'NOW':'';row.title=live.bossName+' · '+Math.ceil(live.hp)+' / '+Math.round(live.max)+' hull'+(exposed?' · '+Math.round(((live.exposedMult||1)-1)*100)+'% extra damage taken while exposed':state==='windup'?' · Signature attack preparing; sonar can interrupt it':'');}
 }
 const next=progress.nextAt===null?'All guardians have arrived':'Boss '+(progress.spawned+1)+' in '+fmt(Math.max(0,progress.nextAt-g.stageTime));
 $('countdown').textContent=(active.length?active.length+' active · ':'')+next+(g.overtime?' · PRESSURE SURGE':'');
}
