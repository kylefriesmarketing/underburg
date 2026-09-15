export const GRAPHICS_STORAGE='underburg.graphics.v1';
export const GRAPHICS_PRESETS=Object.freeze([
 Object.freeze({id:'low',name:'Low',tag:'SMOOTHEST PLAY',desc:'A crisp, simple view with fewer light effects. Best for a busy battle or a smaller device.'}),
 Object.freeze({id:'balanced',name:'Balanced',tag:'RECOMMENDED',desc:'Soft light, gentle glow and clear underwater depth. A comfortable mix of detail and speed.'}),
 Object.freeze({id:'cinematic',name:'Cinematic',tag:'RICHEST LIGHT',desc:'Richer light, glow and atmosphere bring the deep to life. Best on a faster device.'})
]);
export function sanitizeGraphics(value){return {quality:GRAPHICS_PRESETS.some(p=>p.id===value?.quality)?value.quality:'balanced',distortion:typeof value?.distortion==='boolean'?value.distortion:true};}
export function loadGraphics(storage){try{return sanitizeGraphics(JSON.parse((storage||window.localStorage).getItem(GRAPHICS_STORAGE)));}catch{return sanitizeGraphics(null);}}
export function saveGraphics(value,storage){const next=sanitizeGraphics(value);try{(storage||window.localStorage).setItem(GRAPHICS_STORAGE,JSON.stringify(next));return true;}catch{return false;}}

/** Settings own no renderer resources or run state. Main owns modal navigation. */
export class GraphicsSettings{
 constructor({getView,onChange=()=>{}}){this.getView=getView;this.onChange=onChange;this.preferences=loadGraphics();this.saved=saveGraphics(this.preferences);this.container=null;this.media=window.matchMedia('(prefers-reduced-motion: reduce)');this.handleMotion=()=>requestAnimationFrame(()=>this.refresh());}
 apply(){this.getView()?.setGraphics({...this.preferences});}
 change(patch){this.preferences=sanitizeGraphics({...this.preferences,...patch});this.saved=saveGraphics(this.preferences);this.apply();this.refresh();this.onChange({...this.preferences});}
 mount(container){
  this.unmount();this.container=container;container.className='graphics-settings';
  const presets=document.createElement('div');presets.className='graphics-presets';presets.setAttribute('role','group');presets.setAttribute('aria-label','Graphics quality');
  for(const preset of GRAPHICS_PRESETS){const button=document.createElement('button');button.type='button';button.className='graphics-preset';button.dataset.graphicsQuality=preset.id;button.innerHTML='<span class="graphics-preset-tag">'+preset.tag+'</span><strong>'+preset.name+'</strong><span class="graphics-preset-description">'+preset.desc+'</span><span class="graphics-selected" aria-hidden="true">SELECTED</span>';button.setAttribute('aria-label',preset.name+' graphics. '+preset.desc);button.onclick=()=>this.change({quality:preset.id});presets.append(button);}
  const water=document.createElement('div');water.className='graphics-water';water.innerHTML='<div><strong id="graphics-water-label">Water refraction</strong><p id="graphics-water-description">Brief water ripples follow sonar and heavy impacts.</p></div><button id="graphics-distortion" type="button" role="switch" aria-labelledby="graphics-water-label" aria-describedby="graphics-water-description graphics-motion-note"><span></span><b aria-hidden="true"></b></button>';
  water.querySelector('button').onclick=()=>this.change({distortion:!this.preferences.distortion});
  const note=document.createElement('p');note.id='graphics-motion-note';note.className='graphics-note';
  const status=document.createElement('p');status.id='graphics-save-status';status.className='graphics-save-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  container.append(presets,water,note,status);this.media.addEventListener('change',this.handleMotion);this.refresh();
 }
 refresh(){
  if(!this.container)return;const view=this.getView(),actual=view?.graphics||{},reduced=actual.reducedMotion===true||this.media.matches,hdr=actual.hdr!==false,low=(actual.effectiveQuality||this.preferences.quality)==='low',unavailable=reduced||!hdr||low;
  for(const button of this.container.querySelectorAll('[data-graphics-quality]')){const selected=button.dataset.graphicsQuality===this.preferences.quality;button.setAttribute('aria-pressed',String(selected));button.classList.toggle('is-selected',selected);}
  const toggle=this.container.querySelector('#graphics-distortion');toggle.disabled=unavailable;toggle.setAttribute('aria-checked',String(this.preferences.distortion&&!unavailable));toggle.querySelector('span').textContent=unavailable?'OFF':this.preferences.distortion?'ON':'OFF';
  const note=this.container.querySelector('#graphics-motion-note');note.textContent=reduced?'Reduced motion is enabled on your device. Water refraction stays off; your preference is kept for when reduced motion is disabled.':!hdr?'This device uses the simpler view for smooth, reliable play. Extra light effects and water refraction are unavailable; your preferences are kept.':low?'Low keeps the water still for smoother play. Choose Balanced or Cinematic to use water refraction.':'Your device’s reduced-motion setting is always respected. Changes apply immediately.';
  const status=this.container.querySelector('#graphics-save-status');status.textContent=this.saved===false?'Applied for this visit. Your browser could not save the preference.':'Saved on this device';
 }
 unmount(){this.media.removeEventListener('change',this.handleMotion);this.container=null;}
}
