// Original 120 BPM two-step / minimal-house score: "Capture at speed".
// Synthesized instruments, drums and Foley. No external samples or recordings.
import fs from 'node:fs/promises';
import path from 'node:path';
import { root } from '../scripts/lib.mjs';
import { beat, duration, scenes } from './timeline.js';

const rate = 48000, count = rate * duration, tau = Math.PI * 2;
const music = [new Float32Array(count), new Float32Array(count)];
const effects = [new Float32Array(count), new Float32Array(count)];
const hz = note => 440 * 2 ** ((note - 69) / 12);
let randomState = 220026;
function noise() { randomState = (Math.imul(randomState,1664525)+1013904223)|0; return (randomState>>>0)/2147483648-1; }
function add(bus,start,length,synth,gain=1,pan=0) {
  const offset=Math.round(start*rate), samples=Math.round(length*rate);
  const left=Math.sqrt((1-pan)/2)*gain,right=Math.sqrt((1+pan)/2)*gain;
  for(let i=0;i<samples&&offset+i<count;i++) {
    if(offset+i<0)continue;
    const v=synth(i/rate,i/samples);
    bus[0][offset+i]+=v*left;bus[1][offset+i]+=v*right;
  }
}
const kickTimes=[];
function kick(at,velocity=1) {
  kickTimes.push(at);
  add(music,at,.38,t=>Math.sin(tau*(48*t+8.7*(1-Math.exp(-t*43))))*Math.exp(-t*14)+.22*noise()*Math.exp(-t*250),.48*velocity);
}
function snare(at,velocity=1) {
  let low=0;
  add(music,at,.19,t=>{const n=noise();low+=.17*(n-low);return (n-low)*Math.exp(-t*31)+.32*Math.sin(tau*185*t)*Math.exp(-t*25);},.20*velocity,.07);
  for(const offset of [.009,.022,.034]){
    let smooth=0;
    add(music,at+offset,.1,t=>{const n=noise();smooth+=.25*(n-smooth);return (n-smooth)*Math.exp(-t*48);},.10*velocity,offset<.02?-.32:.32);
  }
}
function hat(at,velocity=.8,open=false,pan=.2) {
  let low=0;
  add(music,at,open?.18:.055,t=>{const n=noise();low+=.35*(n-low);return (n-low)*Math.exp(-t*(open?24:95));},.10*velocity,pan);
}
function stab(at,notes,velocity=1) {
  notes.forEach((note,i)=>{
    const f=hz(note),p=(i-(notes.length-1)/2)*.24;
    const voice=t=>{
      const attack=Math.min(1,t/.003),envelope=Math.exp(-t*10.5);
      const fm=.6*Math.exp(-t*14)*Math.sin(tau*f*2*t);
      return (Math.sin(tau*f*t+fm)+.19*Math.sin(tau*f*2*t)+.07*Math.sin(tau*f*3*t))*attack*envelope;
    };
    add(music,at,.55,voice,.067*velocity,p);
    add(music,at+beat*.75,.45,voice,.017*velocity,-p);
  });
}
const chords=[[62,65,69,72,76],[58,62,65,69,72],[57,60,64,67,71],[60,64,67,74]];
const roots=[38,34,33,36];
for(let bar=0;bar<16;bar++) {
  const start=bar*4*beat,chord=chords[Math.floor(bar/2)%4],base=roots[Math.floor(bar/2)%4];
  const intro=bar<1,ending=bar>=15;
  const pattern=bar%2?[0,1.75,2.5,3.5]:[0,1.5,2.75];
  for(const b of pattern)if(!ending||b<2)kick(start+b*beat,intro?.7:1);
  if(!intro&&!ending){snare(start+beat);snare(start+3*beat,bar%4===3?1.1:1);}
  if(bar%4===3&&!ending){snare(start+2.75*beat,.24);hat(start+3.75*beat,.6,false,-.4);}
  for(let step=0;step<8;step++){
    const swing=step%2?.055:0;
    const at=start+step*beat/2+swing;
    if(!ending||step<4)hat(at,step%2?.82:.36,step===5&&!intro,step%2?.42:-.36);
    if(bar%2===1&&step===6)hat(at+beat*.25,.22,false,-.5);
  }
  const stabBeats=bar%2?[.5,2.25,3.5]:[0,1.75,3.25];
  for(const b of stabBeats)if(!ending||b===.5)stab(start+b*beat,chord,intro?.6:.95);
  for(const [b,n,len] of [[0,base,.66],[1.5,base,.23],[2.25,base+7,.3],[3.25,base+12,.3]]){
    if(ending&&b>1.5)continue;
    const f=hz(n);
    add(music,start+b*beat,len,t=>{
      const envelope=Math.min(1,t/.007)*Math.min(1,(len-t)/.05);
      const osc=Math.sin(tau*f*t)+.21*Math.sin(tau*f*2*t)+.07*Math.sin(tau*f*3*t);
      return Math.tanh(osc*1.25)*envelope;
    },.17);
  }
  if([3,7,11,13].includes(bar)){
    const f=hz(chord[3]+12);
    add(music,start+2.75*beat,.8,t=>Math.sin(tau*f*t+.4*Math.sin(tau*f*2*t)*Math.exp(-t*10))*Math.exp(-t*9),.055,-.35);
    add(music,start+3.25*beat,.8,t=>Math.sin(tau*f*1.5*t)*Math.exp(-t*9),.028,.4);
  }
}
// Tight, short editorial cues synchronized to visual actions.
function tick(at,tone=950,gain=.07){
  add(effects,at,.09,t=>(Math.sin(tau*tone*t)*.6+noise()*.1)*Math.exp(-t*70),gain);
}
for(const at of [.5,1.5,2.5,4.5,7,8.5,9,10.5,11.5,12,13,13.5,22.5,23.25,24,24.75])tick(at);
for(const at of [14.5,15.5,18,19.5,20.5,26,28.5]){
  tick(at,740,.055);
  add(effects,at+.055,.23,t=>Math.sin(tau*1480*t)*Math.exp(-t*25),.04,.15);
}
for(const {start} of scenes.slice(1)){
  let low=0;
  add(effects,start-.11,.24,(t,p)=>{const n=noise();low+=.12*(n-low);return (n-low)*Math.sin(Math.PI*p)**2;},.055,-.2);
}
add(effects,30.5,.85,t=>(Math.sin(tau*hz(74)*t)+.38*Math.sin(tau*hz(81)*t))*Math.exp(-t*7),.06);

// Subtle pumping connects sustained low notes to the two-step kicks.
for(let i=0;i<count;i++) {
  const t=i/rate;
  let duck=1;
  for(const at of kickTimes)if(t>=at&&t-at<.14)duck=Math.min(duck,.6+.4*(t-at)/.14);
  const fade=Math.min(1,t/.06,(duration-t)/.5);
  for(let ch=0;ch<2;ch++)music[ch][i]*=fade*(.88+.12*duck);
}
await fs.mkdir(path.join(root,'assets/v2/audio'),{recursive:true});
async function wav(name,bus){
  const buffer=Buffer.alloc(44+count*4);
  buffer.write('RIFF');buffer.writeUInt32LE(36+count*4,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(rate,24);buffer.writeUInt32LE(rate*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(count*4,40);
  let peak=0;
  for(let i=0;i<count;i++)for(let ch=0;ch<2;ch++){
    const sample=Math.tanh(bus[ch][i]*1.2)*.85;
    peak=Math.max(peak,Math.abs(sample));buffer.writeInt16LE(Math.round(sample*32760),44+i*4+ch*2);
  }
  await fs.writeFile(path.join(root,'assets/v2/audio',name),buffer);
  return 20*Math.log10(peak);
}
await wav('music.wav',music);await wav('effects.wav',effects);
const mixed=[new Float32Array(count),new Float32Array(count)];
for(let i=0;i<count;i++)for(let ch=0;ch<2;ch++)mixed[ch][i]=music[ch][i]+effects[ch][i];
const peak=await wav('mix.wav',mixed);
console.log(`Original 120 BPM score, isolated Foley and combined mix generated. Mix peak ${peak.toFixed(2)} dBFS.`);
