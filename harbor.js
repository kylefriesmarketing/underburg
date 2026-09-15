import './harbor-data.js';
const H=window.UBHarbor;
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=n=>'#'+n.toString(16).padStart(6,'0');
const icons={anchor:'⚓',sun:'☀',kraken:'✥',crown:'♛'};
const category={paint:'HULL FINISH',emblem:'CITADEL INSIGNIA',fitting:'EXPEDITION FITTING',weapon:'WEAPON BLUEPRINT'};

/** Persistent silver purchases and honors. The actual ship remains visible behind this panel. */
export class Harbor{
 constructor({view,onChange,onClose,onEquip,sound,getHull}={}){Object.assign(this,{view,onChange,onClose,onEquip,sound,getHull});this.active=false;this.tab='shop';this.filter='all';this.customType='paint';this.mount();}
 mount(){
  this.el=document.createElement('section');this.el.id='harbor-screen';this.el.className='hidden';this.el.setAttribute('aria-label','Shipyard shop, customization, and achievements');
  this.el.innerHTML='<div class="harbor-shade"></div><div class="harbor-panel"><div class="harbor-top"><div class="harbor-title-row"><div><span class="eyebrow">WERFT 07 / THE HANSE SHIPYARD</span><h1>Built for <em>your ambition.</em></h1></div><button class="harbor-close" aria-label="Close shipyard">RETURN ↗</button></div><div class="harbor-wallet"><span>SILVER RESERVES <strong id="harbor-silver"></strong></span><small id="harbor-honors"></small></div><nav class="harbor-tabs" role="tablist" aria-label="Shipyard departments"><button data-harbor-tab="shop" role="tab" aria-controls="harbor-content">SILVER SHOP</button><button data-harbor-tab="customize" role="tab" aria-controls="harbor-content">CUSTOMIZE</button><button data-harbor-tab="achievements" role="tab" aria-controls="harbor-content">ACHIEVEMENTS</button></nav></div><div class="harbor-scroller"><div id="harbor-content" role="tabpanel"></div></div></div><aside class="harbor-preview"><span class="eyebrow">LIVE CITADEL / NORTH SEA ENGINEERING</span><h2 id="harbor-preview-hull"></h2><p id="harbor-preview-paint"></p><div id="harbor-preview-fitting"></div><small>One fitting per expedition. Cosmetics stay with your fleet.</small></aside><div id="harbor-message" role="status" aria-live="polite"></div>';
  document.body.append(this.el);this.el.querySelector('.harbor-close').onclick=()=>{this.hide();this.onClose?.();};
  this.el.querySelectorAll('[data-harbor-tab]').forEach(button=>button.onclick=()=>this.setTab(button.dataset.harborTab));
  this.el.addEventListener('keydown',event=>{const tab=event.target.closest('[data-harbor-tab]');if(tab&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const tabs=[...this.el.querySelectorAll('[data-harbor-tab]')],next=tabs[(tabs.indexOf(tab)+(event.key==='ArrowRight'?1:2))%3];this.setTab(next.dataset.harborTab);next.focus();}});
  addEventListener('keydown',event=>{if(!this.active||event.defaultPrevented||event.code!=='Escape'||event.repeat||(document.getElementById('modal')&&!document.getElementById('modal').classList.contains('hidden')))return;event.preventDefault();event.stopImmediatePropagation();this.hide();this.onClose?.();});
 }
 show(harbor,meta,campaign,tab='shop'){this.harbor=harbor;Object.assign(this.harbor,H.sanitizeHarbor(harbor));this.meta=meta;this.campaign=campaign;this.active=true;this.el.classList.remove('hidden');this.tab=tab==='customization'?'customize':['shop','customize','achievements'].includes(tab)?tab:'shop';this.filter='all';this.render();this.view?.setMenuHull(this.hull(),H.getLoadout(this.harbor));this.el.querySelector('[data-harbor-tab="'+this.tab+'"]').focus();}
 hide(){this.active=false;this.el.classList.add('hidden');clearTimeout(this.messageTimer);}
 hull(){return this.getHull?.()||this.view?.menuHull||'nautilus';}
 refresh(harbor=this.harbor,meta=this.meta,campaign=this.campaign){this.harbor=harbor;this.meta=meta;this.campaign=campaign;if(this.active)this.render();}
 setTab(tab){if(!['shop','customize','achievements'].includes(tab))return;this.tab=tab;this.render();this.el.querySelector('.harbor-scroller').scrollTop=0;this.chime();}
 chime(){this.sound?.start?.();this.sound?.tone?.(392,.18,'sine',.025,523.25);}
 message(text){const el=this.el.querySelector('#harbor-message');el.textContent=text;el.classList.add('visible');clearTimeout(this.messageTimer);this.messageTimer=setTimeout(()=>el.classList.remove('visible'),4200);}
 changed(){this.onChange?.(this.harbor,this.meta);this.render();}
 install(id){if(!H.equip(this.harbor,id))return;const look=H.getLoadout(this.harbor);if(this.onEquip)this.onEquip(look);else this.view?.setMenuHull(this.hull(),look);this.changed();this.chime();this.message(H.ITEMS[id].name+' equipped. Ready for your next descent.');}
 buy(id){if(!H.purchase(this.harbor,this.meta,id))return;this.changed();this.chime();this.message(H.ITEMS[id].name+(H.ITEMS[id].type==='weapon'?' blueprint unlocked. Select it in your starting loadout.':' acquired. Equip it in Customization.'));}
 portrait(item){
  if(item.type==='emblem')return '<div class="harbor-emblem" aria-hidden="true">'+icons[item.symbol]+'</div>';
  const model=item.type==='paint'?this.hull():item.model,url=this.view?.thumbnail(model)||'';
  return '<div class="harbor-portrait"'+(item.profile?' style="--paint:'+hex(item.profile.hull)+';--accent:'+hex(item.profile.accent)+'"':'')+'>'+(url?'<img alt="" src="'+url+'">':'<span aria-hidden="true">'+(item.type==='weapon'?'✣':'⚒')+'</span>')+'</div>';
 }
 itemCard(item,progress){
  const owned=this.harbor.owned.includes(item.id),equipped=this.harbor.equipped[item.type]===item.id,achievement=H.ACHIEVEMENT_BY_ID[item.source],status=owned?(equipped?'EQUIPPED':'OWNED'):item.source==='silver'?'SILVER PURCHASE':'HONOR REWARD';
  const card=document.createElement('article');card.className='harbor-card'+(equipped?' equipped':'')+(!owned&&achievement?' locked':'');card.dataset.harborItem=item.id;
  card.innerHTML=this.portrait(item)+'<div class="harbor-card-body"><span class="harbor-card-category">'+category[item.type]+' <b>'+status+'</b></span><h3>'+escape(item.name)+'</h3><span class="harbor-item-english">'+escape(item.english)+'</span>'+(item.profile?'<div class="harbor-swatches" aria-label="Hull, accent, and running light colors">'+[item.profile.hull,item.profile.accent,item.profile.light].map(color=>'<i style="background:'+hex(color)+'"></i>').join(''):'')+'<p>'+escape(item.desc)+'</p>'+(achievement&&!owned?'<div class="harbor-requirement">'+escape(achievement.name)+' · '+(progress?.value||0)+' / '+achievement.target+'<small>'+escape(achievement.desc)+'</small></div>':'')+'</div>';
  const button=document.createElement('button');button.dataset.harborAction=item.id;
  if(owned){button.textContent=item.type==='weapon'?'BLUEPRINT UNLOCKED':equipped?'EQUIPPED':'EQUIP';button.disabled=equipped||item.type==='weapon';button.onclick=()=>this.install(item.id);}
  else if(item.source==='silver'){button.textContent=(this.tab==='shop'?'BUY / ':'VIEW IN SHOP / ')+item.price+' SILVER';button.disabled=this.tab==='shop'&&this.meta.silver<item.price;button.onclick=()=>{if(this.tab==='shop')this.buy(item.id);else{this.filter=item.type;this.setTab('shop');}};}
  else {button.textContent='EARN '+achievement.name.toUpperCase();button.disabled=true;}
  card.append(button);return card;
 }
 filterBar(values,selected,onClick){const bar=document.createElement('nav');bar.className='harbor-filters';bar.setAttribute('aria-label','Item categories');for(const [key,label]of values){const b=document.createElement('button');b.textContent=label;b.className=key===selected?'active':'';b.setAttribute('aria-pressed',String(key===selected));b.dataset.harborFilter=key;b.onclick=()=>onClick(key);bar.append(b);}return bar;}
 render(){
  if(!this.harbor||!this.meta)return;const root=this.el.querySelector('#harbor-content');root.replaceChildren();this.el.querySelector('#harbor-silver').textContent=Math.floor(this.meta.silver||0);this.el.querySelector('#harbor-honors').textContent=this.harbor.achievements.length+' / 12 HONORS EARNED';
  for(const b of this.el.querySelectorAll('[data-harbor-tab]')){b.classList.toggle('active',b.dataset.harborTab===this.tab);b.setAttribute('aria-selected',String(b.dataset.harborTab===this.tab));b.tabIndex=b.dataset.harborTab===this.tab?0:-1;}
  const progress=H.achievementProgress(this.harbor,this.campaign),intro=document.createElement('p');intro.className='harbor-intro';intro.textContent=this.tab==='shop'?'Invest your silver in permanent fleet equipment. Honors unlock additional designs.':this.tab==='customize'?'Choose a hull finish, physical insignia, and one fitting. Fitting bonuses include a tradeoff and apply to your next expedition.':'Every honor unlocks a unique fleet reward. Progress is recorded when an expedition ends.';root.append(intro);
  const grid=document.createElement('div');grid.className='harbor-grid';
  if(this.tab==='achievements'){
   grid.classList.add('harbor-achievements');for(const a of progress){const card=document.createElement('article');card.className='harbor-achievement'+(a.awarded?' earned':'');card.dataset.achievement=a.id;card.innerHTML='<div class="harbor-honor-icon" aria-hidden="true">'+(a.awarded?'✦':'◇')+'</div><span class="harbor-card-category">'+(a.awarded?'HONOR EARNED':'IN PROGRESS')+'</span><h3>'+escape(a.name)+'</h3><span class="harbor-item-english">'+escape(a.english)+'</span><p>'+escape(a.desc)+'</p><div class="harbor-progress" role="progressbar" aria-label="'+escape(a.name)+'" aria-valuemin="0" aria-valuemax="'+a.target+'" aria-valuenow="'+a.value+'"><i style="width:'+(a.ratio*100)+'%"></i></div><div class="harbor-progress-count">'+a.value+' / '+a.target+'</div><div class="harbor-honor-reward"><small>'+(a.awarded?'UNLOCKED':'REWARD')+'</small><strong>'+escape(a.rewardItem.name)+'</strong><span>'+category[a.rewardItem.type]+'</span></div>';grid.append(card);}
  }else{
   const types=this.tab==='shop'?[['all','ALL'],['paint','PAINTS'],['emblem','EMBLEMS'],['fitting','FITTINGS'],['weapon','BLUEPRINTS']]:[['paint','HULL FINISH'],['emblem','INSIGNIA'],['fitting','FITTING']];
   const selected=this.tab==='shop'?this.filter:this.customType;root.append(this.filterBar(types,selected,key=>{if(this.tab==='shop')this.filter=key;else this.customType=key;this.render();}));
   const items=H.CATALOG.filter(item=>selected==='all'||item.type===selected);if(this.tab==='shop')items.sort((a,b)=>(this.harbor.owned.includes(a.id)?2:a.source==='silver'?0:1)-(this.harbor.owned.includes(b.id)?2:b.source==='silver'?0:1));
   for(const item of items)grid.append(this.itemCard(item,progress.find(a=>a.id===item.source)));
  }
  root.append(grid);const look=H.getLoadout(this.harbor),hull=window.UBContent?.HULLS[this.hull()];this.el.querySelector('#harbor-preview-hull').textContent=hull?.name||this.hull();this.el.querySelector('#harbor-preview-paint').textContent=look.paint.name+' · '+look.emblem.name;
  this.el.querySelector('#harbor-preview-fitting').innerHTML='<span>EXPEDITION FITTING</span><strong>'+escape(look.fitting.name)+'</strong><p>'+escape(H.ITEMS[look.fitting.id].desc)+'</p>';
 }
}
