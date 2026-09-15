/** Continuous, bounded submarine machinery. Created once per Soundscape context. */
export class PropulsionAudio {
 constructor(sound){
  this.sound=sound;const c=sound.ctx;this.ctx=c;this.level=0;this.boosting=false;
  this.gain=c.createGain();this.gain.gain.value=.0001;this.gain.connect(sound.master);
  this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=180;this.filter.Q.value=.35;this.filter.connect(this.gain);
  this.shaft=c.createOscillator();this.shaft.type='triangle';this.shaft.frequency.value=45;
  this.shaftGain=c.createGain();this.shaftGain.gain.value=.56;this.shaft.connect(this.shaftGain);this.shaftGain.connect(this.filter);
  this.turbine=c.createOscillator();this.turbine.type='sine';this.turbine.frequency.value=105;
  this.turbineGain=c.createGain();this.turbineGain.gain.value=.21;this.turbine.connect(this.turbineGain);this.turbineGain.connect(this.filter);
  this.pulse=c.createOscillator();this.pulse.type='sine';this.pulse.frequency.value=7;
  this.pulseDepth=c.createGain();this.pulseDepth.gain.value=.12;this.pulse.connect(this.pulseDepth);this.pulseDepth.connect(this.shaftGain.gain);
  const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let smooth=0;
  for(let i=0;i<data.length;i++){smooth=(smooth+(Math.random()*2-1)*.09)/1.07;data[i]=smooth;}
  this.water=c.createBufferSource();this.water.buffer=buffer;this.water.loop=true;
  this.waterFilter=c.createBiquadFilter();this.waterFilter.type='bandpass';this.waterFilter.frequency.value=700;this.waterFilter.Q.value=.6;
  this.waterGain=c.createGain();this.waterGain.gain.value=.08;this.water.connect(this.waterFilter);this.waterFilter.connect(this.waterGain);this.waterGain.connect(this.gain);
  for(const source of [this.shaft,this.turbine,this.pulse,this.water])source.start();
 }
 update(game){
  const c=this.ctx,t=c.currentTime,active=this.sound.enabled&&game?.state==='playing',p=game?.p;
  const speed=active?Math.min(1.9,Math.hypot(p.vx,p.vy)/Math.max(1,p.speed)):0;
  const boost=active&&p.boosting,heavy=game?.hull==='bastion',light=game?.hull==='wraith',base=heavy?31:light?58:42;
  if(active&&this.runId===game.runId){if(boost&&!this.boosting)this.sound.event({type:'boostStart'});else if(!boost&&this.boosting)this.sound.event({type:'boostEnd'});if(this.throttle>.5&&(p.throttle??speed)<.05&&speed>.2)this.sound.event({type:'brakeVent'});}this.runId=game?.runId;this.throttle=p?.throttle??0;
  this.level=active?.012+speed*.026+(boost?.015:0):0;this.boosting=!!boost;
  this.gain.gain.setTargetAtTime(Math.max(.0001,this.level),t,active?.09:.12);
  this.shaft.frequency.setTargetAtTime(base+speed*(heavy?24:38),t,.11);
  this.turbine.frequency.setTargetAtTime(base*2.45+speed*93+(boost?40:0),t,.1);
  this.pulse.frequency.setTargetAtTime(5+speed*8,t,.12);
  this.filter.frequency.setTargetAtTime(140+speed*260+(boost?230:0),t,.12);
  this.waterFilter.frequency.setTargetAtTime(550+speed*850,t,.12);
  this.waterGain.gain.setTargetAtTime(.06+speed*.16,t,.12);
 }
 get stats(){return {sources:4,level:this.level,boosting:this.boosting,shaftHz:this.shaft.frequency.value};}
}
