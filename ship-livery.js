import * as THREE from './assets/lib/three.module.js';

export const appearanceKey=look=>[look?.paint?.id||'original',look?.emblem?.id||'none'].join('/');

/** Clone only paint materials. The original Blender geometries stay shared. */
export function applyLivery(ship,look){
 if(!look)return ship;
 const paint=look.paint,cache=new Map();
 if(paint&&paint.id!=='original')ship.traverse(o=>{
  if(!o.isMesh||!o.material)return;
  const tint=m=>{const role=m.name||'';let color=null,light=false;
   if(/paint|ceramic/i.test(role))color=paint.hull;
   else if(/brass|copper/i.test(role))color=paint.accent;
   else if(/glass|lamp|pearl/i.test(role)){color=paint.light;light=true;}
   if(color==null)return m;if(cache.has(m))return cache.get(m);
   const c=m.clone();c.color.setHex(color);if(light&&c.emissive){c.emissive.setHex(color);c.emissiveIntensity=Math.max(1.3,c.emissiveIntensity);}
   cache.set(m,c);return c;
  };
  const old=Array.isArray(o.material)?o.material:[o.material],mats=old.map(tint);o.material=Array.isArray(o.material)?mats:mats[0];o.userData.ownedLivery=mats.filter((m,i)=>m!==old[i]);
 });
 if(look.emblem?.id&&look.emblem.id!=='none'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=160;const c=canvas.getContext('2d');
  const css=n=>'#'+(n??0xd8b979).toString(16).padStart(6,'0');c.fillStyle=css(paint?.hull||0x173e4d);c.fillRect(0,0,256,160);c.strokeStyle=css(paint?.accent);c.fillStyle=c.strokeStyle;c.lineWidth=7;c.strokeRect(6,6,244,148);c.translate(128,81);c.lineCap='round';
  const symbol=look.emblem.symbol||'anchor';
  if(symbol==='crown'){c.beginPath();c.moveTo(-54,34);c.lineTo(-65,-26);c.lineTo(-29,-4);c.lineTo(0,-48);c.lineTo(29,-4);c.lineTo(65,-26);c.lineTo(54,34);c.closePath();c.fill();c.fillRect(-52,42,104,8);}
  else if(symbol==='sun'){c.beginPath();c.arc(0,0,24,0,Math.PI*2);c.fill();for(let i=0;i<12;i++){const a=i*Math.PI/6;c.beginPath();c.moveTo(Math.cos(a)*35,Math.sin(a)*35);c.lineTo(Math.cos(a)*55,Math.sin(a)*55);c.stroke();}}
  else if(symbol==='kraken'){c.beginPath();c.ellipse(0,-17,25,30,0,0,Math.PI*2);c.fill();for(let i=0;i<6;i++){const x=(i-2.5)*15;c.beginPath();c.moveTo(x*.35,5);c.bezierCurveTo(x*1.8,15,x*.7,62,x*1.6,37);c.stroke();}c.fillStyle='#102937';c.beginPath();c.arc(-8,-17,4,0,Math.PI*2);c.arc(8,-17,4,0,Math.PI*2);c.fill();}
  else {c.beginPath();c.arc(0,-39,11,0,Math.PI*2);c.moveTo(0,-27);c.lineTo(0,44);c.moveTo(-24,-9);c.lineTo(24,-9);c.moveTo(-49,8);c.bezierCurveTo(-45,48,-8,39,0,48);c.bezierCurveTo(8,39,45,48,49,8);c.moveTo(-57,17);c.lineTo(-49,8);c.lineTo(-39,18);c.moveTo(57,17);c.lineTo(49,8);c.lineTo(39,18);c.stroke();}
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide,roughness:.85});mat.userData.ownedTexture=true;
  const mast=new THREE.Mesh(new THREE.CylinderGeometry(.048,.06,2.2,8),new THREE.MeshStandardMaterial({color:paint?.accent||0xd8b979,metalness:.75,roughness:.3}));mast.position.set(-2.8,5.3,0);ship.add(mast);
  const flag=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.3,8,3),mat);flag.position.set(-1.75,5.65,0);flag.userData.pennant=true;flag.castShadow=true;ship.add(flag);
 }
 ship.userData.appearance=appearanceKey(look);return ship;
}
