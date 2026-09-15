const COLORS={bastion:'#e7a184',salvage:'#e3c17c',beacon:'#89d8dc',shrine:'#c9b1ee'};
const ICONS={bastion:'♜',salvage:'⚒',beacon:'◎',shrine:'✦'};
const TITLES={bastion:'CONQUER',salvage:'SALVAGE',beacon:'CALIBRATE',shrine:'INVESTIGATE'};
const REWARDS={bastion:'Defeat the garrison · hold 12s · earn gold tribute',salvage:'Defend 18s · recover gold and an artifact',beacon:'Calibrate 10s · repair 20% hull and reveal all sites',shrine:'Defeat the guards · claim an Epic-or-better artifact'};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const svgNS='http://www.w3.org/2000/svg';

/** Presentation only. Site discovery, combat and rewards belong to Game. */
export class ExpeditionUI {
 constructor({onChart,onInteract,onTrack}){
  this.onTrack=onTrack;this.tracked=null;this.runId=null;this.layoutFrame=0;this.layoutSize='';
  this.chart=document.createElement('button');this.chart.id='survey-open';this.chart.setAttribute('aria-keyshortcuts','T');this.chart.innerHTML='<span class="survey-glyph" aria-hidden="true">◈</span><span><strong>SURVEY CHART <kbd>T</kbd></strong><small id="survey-count">0 / 8 SITES SECURED</small></span>';this.chart.onclick=onChart;
  this.el=document.createElement('div');this.el.id='expedition-dock';this.el.hidden=true;this.el.innerHTML='<button id="site-interact" aria-keyshortcuts="G" hidden><kbd>G</kbd><span><strong></strong><small></small></span><i></i></button>';
  document.getElementById('hud').append(this.chart,this.el);this.button=this.el.querySelector('#site-interact');this.button.onclick=onInteract;window.addEventListener('resize',()=>this.queueLayout());
 }
 update(game){
  if(this.runId!==game.runId){this.runId=game.runId;this.tracked=null;}
  const summary=game.siteSummary||{captured:0,total:8},prompt=game.sitePrompt;
  this.chart.querySelector('#survey-count').textContent=summary.captured+' / '+summary.total+' SITES SECURED';this.chart.setAttribute('aria-label','Survey chart, T. '+summary.captured+' of '+summary.total+' sites secured.');
  this.button.hidden=!prompt;this.el.hidden=!prompt;this.el.classList.toggle('has-site',!!prompt);this.queueLayout();
  if(prompt){this.button.disabled=game.state!=='playing'||!prompt.canInteract;this.button.dataset.status=prompt.status;this.button.style.setProperty('--site-color',COLORS[prompt.kind]||'#9de6c6');this.button.querySelector('strong').textContent=prompt.name;const activeText=!prompt.inside?'RETURN TO THE RING · PROGRESS PAUSED':['bastion','shrine'].includes(prompt.kind)&&prompt.guardsRemaining?'DEFEAT '+prompt.guardsRemaining+' GUARDS':Math.floor(prompt.progress||0)+' / '+Math.ceil(prompt.duration||1)+'s · '+(prompt.kind==='salvage'?'DEFEND THE WRECK':prompt.kind==='beacon'?'AVOID DAMAGE':'HOLD POSITION');this.button.querySelector('small').textContent=prompt.status==='active'?activeText:(prompt.action||TITLES[prompt.kind]||'INTERACT');this.button.querySelector('i').style.width=Math.min(100,(prompt.progress||0)/Math.max(1,prompt.duration||1)*100)+'%';}
 }
 queueLayout(){if(!this.layoutFrame)this.layoutFrame=requestAnimationFrame(()=>{this.layoutFrame=0;this.layout();});}
 layout(){
  if(!this.chart.getClientRects().length)return;const rect=this.chart.getBoundingClientRect(),gap=6,size=innerWidth+'x'+innerHeight,preferred=parseFloat(getComputedStyle(this.chart).getPropertyValue('--survey-top'))||rect.top;
  // Read current HUD geometry after main has placed the waypoint; the side control never
  // competes with telemetry, a live contact, or the bottom ability targets on short screens.
  const selectors=['header','.mission','.run-currency','.telemetry','#boss-hud','#radar','.abilities','.weapons-panel','#toast','#site-interact'];
  const visible=e=>{if(!e||!e.getClientRects().length)return false;const style=getComputedStyle(e);return style.visibility!=='hidden'&&Number(style.opacity)>.05;};
  const obstacles=selectors.map(s=>document.querySelector(s)).filter(visible).map(e=>e.getBoundingClientRect()).filter(r=>r.right+gap>rect.left&&r.left-gap<rect.right);
  const fits=y=>y>=16&&y+rect.height<=innerHeight-16&&obstacles.every(r=>y+rect.height+gap<=r.top||y-gap>=r.bottom);
  const candidates=[preferred,...obstacles.flatMap(r=>[r.bottom+gap,r.top-rect.height-gap])].filter(fits).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred));
  const y=this.layoutSize===size&&Number.isFinite(this.utilityTop)&&fits(this.utilityTop)?this.utilityTop:candidates[0]??preferred;this.layoutSize=size;this.utilityTop=y;
  if(this.chart.style.top!==y+'px')this.chart.style.top=y+'px';
  // A world waypoint may approach the HUD edge. Offset only its presentation so the
  // persistent chart button stays in place and the target name remains readable.
  const marker=document.getElementById('nav-marker');if(marker){marker.style.translate='';if(visible(marker)){const r=marker.getBoundingClientRect();let dx=0,dy=0;if(r.right+gap>rect.left&&r.left-gap<rect.right&&r.bottom+gap>y&&r.top-gap<y+rect.height)dx=Math.min(0,rect.left-gap-r.right);if(visible(this.button)){const action=this.button.getBoundingClientRect();if(r.right+dx+gap>action.left&&r.left+dx-gap<action.right&&r.bottom+gap>action.top&&r.top-gap<action.bottom)dy=action.top-gap-r.bottom;}if(dx||dy)marker.style.translate=dx+'px '+dy+'px';}}
 }
 target(game){return game.sites?.find(s=>s.id===this.tracked&&s.discovered&&s.status!=='captured')||null;}
 draw(container,game,choose){
  const sites=game.sites||[],summary=game.siteSummary||{},frame=document.createElement('div');frame.className='survey-map';
  const points=window.UBWorld.boundaryVertices(game.stage),project=(x,y)=>[320+x*.064,285+y*.064];
  const boundary=points.filter((_,i)=>i%4===0).map(p=>project(p.x,p.y).map(n=>n.toFixed(2)).join(',')).join(' ');
  frame.innerHTML='<svg viewBox="0 0 640 580" role="img" aria-label="Survey of the current sea basin"><defs><radialGradient id="survey-water"><stop stop-color="#254e58"/><stop offset="1" stop-color="#0b2738"/></radialGradient><pattern id="survey-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#aedbcc" stroke-opacity=".065"/></pattern><clipPath id="survey-basin"><polygon points="'+boundary+'"/></clipPath></defs><polygon points="'+boundary+'" fill="url(#survey-water)" stroke="#bdc9a1" stroke-width="3"/><g clip-path="url(#survey-basin)"><rect width="640" height="580" fill="url(#survey-grid)"/><g class="survey-contours"></g><g class="survey-sites"></g></g><text x="35" y="45" class="survey-map-title">'+escape(game.biome?.name||'SEA BASIN')+'</text><text x="600" y="47" text-anchor="end" class="survey-map-north">N ↑</text><text x="320" y="560" text-anchor="middle" class="survey-map-foot">LIGHT THE BEACONS · CHART THE DEEP</text></svg>';
  const svg=frame.querySelector('svg'),make=(type,attrs,parent)=>{const e=document.createElementNS(svgNS,type);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
  const contour=frame.querySelector('.survey-contours');
  for(let j=0;j<5;j++){const coords=[];for(let i=0;i<=40;i++){const x=-4200+i*210,y=Math.sin(x*.0007+game.stage)*640+(j-2)*390;coords.push(project(x,y).join(','));}make('polyline',{points:coords.join(' '),fill:'none',stroke:'#74acc0','stroke-width':j===2?14:1,'stroke-opacity':j===2?.1:.12},contour);}
  const layer=frame.querySelector('.survey-sites');
  for(const l of game.world?.landmarks||[]){const [x,y]=project(l.x,l.y);make('circle',{cx:x,cy:y,r:4,fill:'#819e9b',opacity:.6},layer);}
  for(const site of sites){if(!site.discovered)continue;const [x,y]=project(site.x,site.y),group=make('g',{class:'survey-site '+(site.status==='captured'?'is-captured':''),'data-survey-marker':site.id},layer);make('circle',{cx:x,cy:y,r:18,fill:site.status==='captured'?'#235d50':'#102e3d',stroke:COLORS[site.kind],'stroke-width':site.id===this.tracked?3:1.5},group);const icon=make('text',{x,y:y+6,'text-anchor':'middle',fill:COLORS[site.kind],'font-size':22},group);icon.textContent=site.status==='captured'?'⚑':ICONS[site.kind];if(site.status!=='captured'){group.style.cursor='pointer';group.onclick=()=>choose(site.id);}}
  const [px,py]=project(game.p.x,game.p.y);make('circle',{cx:px,cy:py,r:24,fill:'none',stroke:'#dcf4db','stroke-opacity':.18},layer);make('path',{d:'M0 -9L6 7L0 3L-6 7Z',fill:'#ecf5d7',stroke:'#082332',transform:'translate('+px+' '+py+') rotate('+(game.p.a*180/Math.PI+90)+')'},layer);
  const list=document.createElement('div');list.className='survey-list';const header=document.createElement('div');header.className='survey-summary';header.innerHTML='<strong>'+summary.captured+' <span>/ '+summary.total+'</span></strong><div>LOCATIONS SECURED<small>'+summary.discovered+' DISCOVERED · '+(summary.incomePerMinute||0)+' GOLD / MIN</small></div>';list.append(header);
  for(const site of sites.filter(s=>s.discovered)){const b=document.createElement('button');b.className='survey-entry';b.dataset.surveySite=site.id;b.dataset.status=site.status;b.style.setProperty('--site-color',COLORS[site.kind]);b.disabled=site.status==='captured';b.innerHTML='<span>'+ICONS[site.kind]+'</span><div><strong>'+escape(site.name)+'</strong><small>'+escape(site.english)+'</small><p>'+(site.status==='captured'?'SECURED · '+(site.kind==='bastion'?'PAYING TRIBUTE':'REWARD COLLECTED'):site.status==='active'?'OPERATION IN PROGRESS':REWARDS[site.kind])+'</p></div><em>'+(site.status==='captured'?'✓':'↗')+'</em>';b.onclick=()=>choose(site.id);list.append(b);}
  if(summary.discovered<summary.total){const note=document.createElement('p');note.className='survey-unseen';note.textContent=(summary.total-summary.discovered)+' signals remain uncharted. Explore the basin or calibrate a sonar beacon to reveal them.';list.append(note);}
  const legend=document.createElement('p');legend.className='survey-legend';legend.textContent='Optional operations reward this dive. All three guardians must still fall to clear the mission.';list.append(legend);container.append(frame,list);
 }
 event(e,toast){if(e.type==='sitesRevealed')toast('SONAR NETWORK ONLINE / All eight expedition sites revealed',6);if(e.type==='siteDiscovered')toast('NEW SIGNAL / '+(e.name||'Uncharted location'),4);if(e.type==='siteActivated')toast('OPERATION BEGUN / '+(e.name||'Hold the area'),4);if(e.type==='siteCaptured')toast('SECURED / '+(e.name||'Location')+' · '+(e.gold?('+'+e.gold+' GOLD'):'REWARD RECOVERED'),6);}
}
