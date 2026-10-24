import { duration, scenes } from './timeline.js';

const canvas = document.querySelector('#film');
const ctx = canvas.getContext('2d', { alpha: false });
const W = 1920, H = 1080;
const C = {
  paper: '#f7f5f0', white: '#fffdfa', ink: '#18212f', black: '#111316',
  slate: '#242832', line: '#343a45', gray: '#969fab', gold: '#ffd98a',
  ochre: '#805400', green: '#9ee7bd', softLine: '#d8cfc4',
};
const img = {};
for (const name of ['dark-empty','light-empty','manual-empty','manual-full','light-pending','dark-pending','dark-failed','entry-unchecked','entry-checked','entry-failed','task-one','task-two','task-one-done']) {
  const image = new Image();
  image.src = `../assets/v2/screenshots/${name}.png`;
  await image.decode();
  img[name] = image;
}
const manifest = await fetch('../assets/v2/capture-manifest.json').then(r => r.json());
let clip = img['manual-empty'];
let lastFrame = -1;
const clamp = x => Math.max(0, Math.min(1, x));
const mix = (a,b,p) => a+(b-a)*p;
const out = x => 1-(1-clamp(x))**4;
const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
const spring = x => x<=0?0:1-Math.exp(-9*x)*Math.cos(10*x);

function path(x,y,w,h,r=18) { ctx.beginPath();ctx.roundRect(x,y,w,h,r); }
function box(x,y,w,h,color,stroke=null,r=18) {
  path(x,y,w,h,r);ctx.fillStyle=color;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke();}
}
function line(x1,y1,x2,y2,color,width=2) {
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function text(value,x,y,size=32,color=C.ink,weight=400,align='left',font='Segoe UI') {
  ctx.font=`${weight} ${size}px "${font}",Arial,sans-serif`;
  ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillStyle=color;ctx.fillText(value,x,y);
}
function title(value,x,y,size,color=C.ink,weight=600) { text(value,x,y,size,color,weight,'left','Bahnschrift'); }
function label(value,x,y,color=C.gray,size=18,spacing=2.7) {
  ctx.font=`600 ${size}px "Segoe UI",sans-serif`;ctx.textAlign='left';ctx.fillStyle=color;
  for(const char of value){ctx.fillText(char,x,y);x+=ctx.measureText(char).width+spacing;}
}
function group(x,y,scale,opacity,draw,angle=0) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.rotate(angle);ctx.globalAlpha*=clamp(opacity);draw();ctx.restore();
}
function reveal(value,x,y,size,p,color=C.ink,direction='up') {
  ctx.save();path(x-12,y-size-15,1800,size+55,0);ctx.clip();
  const progress=out(p);
  if(direction==='scale')group(x,y,.78+.22*progress,progress,()=>title(value,0,0,size,color));
  else title(value,x+(direction==='right'?(1-progress)*110:0),y+(direction==='up'?(1-progress)*(size+35):0),size,color);
  ctx.restore();
}
function bolt(x,y,size=44,color=C.paper,progress=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(size/24,size/24);
  ctx.beginPath();ctx.moveTo(13,2);ctx.lineTo(3,14);ctx.lineTo(11,14);ctx.lineTo(10,22);ctx.lineTo(21,10);ctx.lineTo(13,10);ctx.closePath();
  ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.setLineDash([80]);ctx.lineDashOffset=80*(1-clamp(progress));ctx.stroke();ctx.restore();
}
function smallBrand(light=true) {
  const color=light?C.ink:C.paper;
  bolt(102,64,27,color);
  text('Hazlo by Kaushik',142,86,22,color,600);
}

// Static photographic grain; no decorative particle field or animated orbs.
const grain=document.createElement('canvas');grain.width=480;grain.height=270;
const gc=grain.getContext('2d'), pixels=gc.createImageData(480,270);
let seed=442;
for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)|0;const value=(seed>>>24);pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=14;}
gc.putImageData(pixels,0,0);
function background(mode='paper',time=0) {
  const light=mode==='paper';
  const gradient=ctx.createLinearGradient(0,0,W,H*.62);
  if(light){gradient.addColorStop(0,'#fffdfa');gradient.addColorStop(1,'#ede9e1');}
  else if(mode==='slate'){gradient.addColorStop(0,'#101215');gradient.addColorStop(1,'#2a2e36');}
  else{gradient.addColorStop(0,'#111316');gradient.addColorStop(1,'#1b1e23');}
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=light?.16:.1;ctx.drawImage(grain,0,0,W,H);ctx.restore();
  if(mode==='slate') {
    ctx.fillStyle='#ffffff03';ctx.beginPath();ctx.moveTo(1240,0);ctx.lineTo(1920,0);ctx.lineTo(1920,1080);ctx.lineTo(760,1080);ctx.closePath();ctx.fill();
  }
}
function image(media,x,y,w,h,source=null) {
  const asset=typeof media==='string'?img[media]:media;
  const rect=source?[...source]:[0,0,asset.width,asset.height];
  const aspect=w/h;
  if(rect[2]/rect[3]>aspect){const nw=rect[3]*aspect;rect[0]+=(rect[2]-nw)/2;rect[2]=nw;}
  else{const nh=rect[2]/aspect;rect[1]+=(rect[3]-nh)/2;rect[3]=nh;}
  ctx.drawImage(asset,...rect,x,y,w,h);
}
function browser(media,x,y,w,h,{source=null,light=false,angle=0,opacity=1}={}) {
  group(x+w/2,y+h/2,1,opacity,()=>{
    ctx.shadowColor=light?'#18212f28':'#0007';ctx.shadowBlur=40;ctx.shadowOffsetY=24;
    box(-w/2,-h/2,w,h,light?'#f5f1e9':'#242832',light?'#d8cfc4':'#454b56',18);
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    for(let i=0;i<3;i++)box(-w/2+20+i*15,-h/2+17,5,5,light?'#b0a89d':'#777f8c',null,3);
    text('hazlo-opensource.vercel.app',0,-h/2+25,15,light?'#778192':'#a5acb8',400,'center');
    ctx.save();path(-w/2+2,-h/2+38,w-4,h-40,15);ctx.clip();image(media,-w/2+2,-h/2+38,w-4,h-40,source);ctx.restore();
  },angle);
}
function pointer(x,y,click=0,light=true) {
  ctx.save();ctx.translate(x,y);ctx.fillStyle=light?C.ink:C.paper;ctx.strokeStyle=light?C.white:C.black;ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(3,35);ctx.lineTo(13,25);ctx.lineTo(22,42);ctx.lineTo(30,38);ctx.lineTo(21,22);ctx.lineTo(35,18);ctx.closePath();ctx.fill();ctx.stroke();
  if(click>0){ctx.globalAlpha*=1-click;path(-17-15*click,-17-15*click,50+30*click,50+30*click,12);ctx.strokeStyle=C.ochre;ctx.stroke();}
  ctx.restore();
}
function pill(value,x,y,{light=true,accent=false}={}) {
  ctx.font='500 22px "Segoe UI"';const width=ctx.measureText(value).width+36;
  box(x,y-31,width,48,light?(accent?'#fff0c5':'#fffdfa'):(accent?'#342a1b':'#242832'),light?'#d8cfc4':'#454b56',24);
  text(value,x+18,y,22,light?C.ink:(accent?C.gold:C.paper),500);
}

function hook(t) {
  background('paper',t);smallBrand(true);
  label('CAPTURE AT THE SPEED OF THOUGHT',1015,84,'#778192',17,1.6);
  const second=t>=1.5, local=second?t-1.5:t;
  const slide=smooth((t-1.34)/.16);
  if(!second) {
    reveal('Your ideas',115,405,150,local/.32,C.ink);
    reveal('move fast.',115,590,172,(local-.22)/.36,C.ink,'right');
    const p=out((t-.52)/.38);box(126,630,800*p,13,C.gold,null,0);
    group(1400-mix(80,0,out(t/.45)),470,1,out(t/.3),()=>{
      for(let i=0;i<3;i++){const offset=(t*420+i*130)%400;box(offset-230,i*75,270,3,i===1?'#b1a79a':'#d8cfc4',null,0);}
      bolt(23,12,152,C.ink,out((t-.3)/.5));
    });
  } else {
    reveal('Your task capture',115,412,132,local/.32,C.ink,'right');
    reveal('should too.',115,592,168,(local-.18)/.34,C.ink);
    box(128,641,1180*out((local-.4)/.35),12,C.gold,null,0);
    label('LESS FRICTION. MORE MOMENTUM.',125,787,'#778192',22,2.2);
  }
  if(t>2.7){const p=out((t-2.7)/.3);box(0,H-108*p,W,108*p,C.ink,null,0);}
}

function product(t) {
  background('slate',t);smallBrand(false);
  reveal('Meet Hazlo.',112,183,109,t/.42,C.paper,'right');
  group(1160,156,1,out((t-.45)/.35),()=>text('Voice-first task capture.',0,0,38,C.gold,400));
  const enter=spring(t/.72), push=out((t-2.5)/1.5);
  const width=mix(1420,1500,push),x=(W-width)/2,y=245+(1-enter)*220-push*12;
  browser('dark-pending',x,y,width,710+push*18,{source:[120,0,1680,790],angle:(1-enter)*.035});
  const a=out((t-1.15)/.45);
  group(125,1004,1,a,()=>{label('REAL APP. REAL LOCAL TASKS.',0,0,'#b5bbc5',19,2);});
  group(1475,1004,1,a,()=>text('MIT · OPEN SOURCE',0,0,21,C.gold,600));
}

function capture(t) {
  const voice=t<1.5;
  const drawVoice=()=>{
    background('dark',t);smallBrand(false);
    reveal('Speak it.',110,229,128,t/.32,C.paper,'scale');
    label('BROWSER SPEECH RECOGNITION',1115,201,C.gray,18,2);
    const push=out(t/1.5);
    browser('dark-empty',mix(220,170,push),365,1480+100*push,430+40*push,{source:[380,990,1160,345]});
    // This waveform is an explanatory overlay, never a claim of recorded speech.
    for(let i=0;i<52;i++){
      const amplitude=7+Math.max(0,Math.sin(i*.64-t*8))*24*(.4+.6*Math.sin(Math.PI*clamp(t/1.5)));
      box(520+i*17,930-amplitude/2,6,amplitude,C.gold,null,3);
    }
    text('Illustrative waveform · browser support varies',960,1006,22,C.gray,400,'center');
  };
  const drawManual=()=>{
    background('paper',t);smallBrand(true);
    const local=t-1.5;
    reveal('Or type it.',110,222,124,local/.32,C.ink,'right');
    label('ACTUAL MANUAL-ENTRY RECORDING',1120,195,'#778192',17,1.8);
    const clipTime=mix(.08,manifest.clip.duration-.02,clamp(local/3.45));
    const saveProgress=out((clipTime-(manifest.clip.save-.1))/.3);
    const y=mix(335,250,saveProgress),h=mix(578,730,saveProgress);
    const sourceY=mix(415,130,saveProgress);
    if(local>3.2){
      browser('light-pending',200,250,1520,730,{source:[300,210,1320,630],light:true});
    }else{
      browser(clip,200,y,1520,h,{source:[235,sourceY,810,mix(286,370,saveProgress)],light:true});
    }
    if(local>2.55&&local<3.25){
      const p=out((local-2.55)/.4);
      pointer(mix(1640,1576,p),mix(795,737,p),local>3.05?clamp((local-3.05)/.2):0,true);
    }
    text('Finish the landing page and review the deployment',960,1014,27,'#475569',400,'center');
  };
  if(voice)drawVoice();
  else if(t<1.72){
    drawVoice();
    const p=smooth((t-1.5)/.22);
    ctx.save();path(W*(1-p),0,W*p,H,0);ctx.clip();drawManual();ctx.restore();
  }else drawManual();
}

function taskPhoto(name,x,y,w=740,opacity=1) {
  const h=w/700*105;
  group(x,y,1,opacity,()=>{
    ctx.shadowColor='#18212f16';ctx.shadowBlur=24;ctx.shadowOffsetY=13;
    box(0,0,w,h,C.white,'#e7e1d8',18);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.save();path(0,0,w,h,16);ctx.clip();image(name,0,0,w,h,[0,0,700,105]);ctx.restore();
  });
}
function extraction(t) {
  background('paper',t);smallBrand(true);
  reveal('Thoughts become tasks.',110,218,112,t/.4,C.ink);
  label('LOCAL, RULE-BASED EXTRACTION',1115,85,'#778192',17,1.7);
  const original=out((t-.3)/.4);
  group(220,326,1,original,()=>{
    label('ORIGINAL CAPTURE',10,0,'#778192',18,2);
    ctx.shadowColor='#18212f12';ctx.shadowBlur=25;ctx.shadowOffsetY=12;
    box(0,36,1480,154,C.white,'#e7e1d8',23);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    image('entry-unchecked',20,69,1440,79,[15,82,1120,62]);
    const p=out((t-.8)/.35);line(40,169,40+620*p,169,'#ffd98a',5);
  });
  const p=clamp((t-.9)/.5);
  line(960,531,960,531+50*p,'#b6ac9e',2);
  if(p>0){line(590,581,590+740*p,581,'#b6ac9e',2);line(590,581,590,581+54*p,'#b6ac9e',2);line(1330,581,1330,581+54*p,'#b6ac9e',2);}
  const first=spring((t-1)/.6),second=spring((t-1.5)/.6);
  taskPhoto('task-one',mix(300,160,first),mix(400,645,first),740,out((t-1)/.3));
  const checked=out((t-2.5)/.22);
  taskPhoto('task-one-done',160,645,740,checked);
  taskPhoto('task-two',mix(880,1020,second),mix(400,645,second),740,out((t-1.5)/.3));
  if(t>2.2&&t<3.4){pointer(203,676,clamp((t-2.5)/.3),true);}
  group(130,920,1,out((t-2.75)/.4),()=>{
    title('Two tasks. Original context intact.',0,0,46,C.ink,400);
    text('Actual Hazlo task controls',1160,0,23,'#778192',400);
  });
}

function arrow(x1,x2,y,p,color=C.gold) {
  const end=mix(x1,x2,clamp(p));line(x1,y,end,y,color,2);
  if(p>.8){line(x2-9,y-6,x2,y,color,2);line(x2-9,y+6,x2,y,color,2);}
}
function sync(t) {
  background('dark',t);smallBrand(false);
  reveal('Capture locally.',110,221,104,t/.35,C.paper);
  reveal('Sync to Notion.',110,336,104,(t-.2)/.4,C.gold,'right');
  const nodeX=[140,610,1070,1540],nodeLabels=['Entry','Local storage','Vercel backend','Notion'];
  for(let i=0;i<4;i++){
    const p=out((t-.65-i*.22)/.35);
    group(nodeX[i],490+(1-p)*55,1,p,()=>{
      label(String(i+1).padStart(2,'0'),0,0,'#858e9c',20,1.5);
      title(nodeLabels[i],0,80,i===2?39:42,C.paper,400);
      if(i===0){ctx.save();path(0,120,340,135,12);ctx.clip();image('entry-unchecked',0,120,340,135,[0,0,1152,458]);ctx.restore();}
      if(i===1){text('Zustand',0,133,27,C.gray);text('+ localStorage',0,171,27,C.gray);}
      if(i===2){text('POST',0,133,24,C.gray,500,'left','Consolas');text('/api/notion-sync',0,170,21,C.gray,400,'left','Consolas');}
      if(i===3){text('Page + task blocks',0,133,23,C.gray);text('Your workspace',0,171,23,C.gray);}
    });
    if(i<3){const progress=clamp((t-1-i*.4)/.45);arrow(nodeX[i]+345,nodeX[i+1]-25,563,progress);if(progress>0&&progress<1)box(mix(nodeX[i]+345,nodeX[i+1]-25,progress)-10,556,20,14,C.gold,null,2);}
  }
  const success=out((t-2.5)/.4);
  group(1490,801,1,success,()=>{
    pill('Syncing → Synced',0,0,{light:false,accent:true});
    text('Illustrative success flow',8,48,20,C.gray);
  });
  if(t>3.25){
    group(120,822,1,out((t-3.25)/.35),()=>{
      text('If sync fails, your local entry stays.',0,0,31,C.paper,500);
      ctx.save();path(0,26,570,70,14);ctx.clip();image('entry-failed',0,26,570,70,[26,30,570,70]);ctx.restore();
      text('Actual retry UI · sync blocked for this capture',600,72,19,C.gray);
    });
  }
}

function openSource(t) {
  background('paper',t);smallBrand(true);
  reveal('Your setup.',110,235,120,t/.35,C.ink,'right');
  reveal('Your workspace.',110,372,120,(t-.13)/.4,C.ink);
  const labelP=out((t-.4)/.5);group(1300,294,1,labelP,()=>{
    box(0,0,482,78,C.ink,null,12);text('MIT · OPEN SOURCE',35,49,26,C.paper,600);
  });
  line(120,430,1800,430,'#d8cfc4',2);
  const names=['Fork','Connect Notion','Configure Vercel','Deploy'];
  const positions=[120,505,1000,1550];
  const active=clamp((t-.5)/2.25)*3;
  names.forEach((value,i)=>{
    const p=out((t-.5-i*.25)/.3);
    group(positions[i],590+(1-p)*70,1,p,()=>{
      const width=[290,400,450,240][i];
      text('0'+(i+1),0,-35,23,'#778192',500,'left','Consolas');
      title(value,0,34,i===2?42:47,C.ink,400);
      const lineProgress=clamp(active-i+1);
      box(0,69,width*lineProgress,7,C.ochre,null,0);
      if(i<3)arrow(width+8,width+51,10,p,C.ink);
    });
  });
  const p=out((t-1.9)/.45);
  group(120,825+(1-p)*40,1,p,()=>{
    box(0,-48,1680,147,'#fffdfa','#e7e1d8',20);
    text('NOTION_DATA_SOURCE_ID',28,5,30,C.ink,500,'left','Consolas');
    text('Your integration. Your configuration.',690,5,28,'#778192');
    text('Raw Speech / Title    ·    Status / Status    ·    Date / Date',28,62,26,'#475569');
  });
}

function closing(t) {
  background('dark',t);smallBrand(false);
  const p=out(t/.55);
  if(t<1.6){
    reveal('Build your own',105,402,142,t/.35,C.paper,'right');
    reveal('Hazlo.',100,650,224,(t-.18)/.42,C.gold,'scale');
    group(1180,280,1,p,()=>browser('dark-pending',0,0,840,590,{source:[180,0,1530,1080],angle:-.035}));
  }else{
    const u=t-1.6;
    reveal('Build your own Hazlo.',110,265,113,u/.3,C.paper);
    group(120,368,1,out((u-.15)/.35),()=>text('Open source. Forkable. Yours.',0,0,45,C.gold,400));
    const urlAlpha=out((u-.3)/.32);
    group(120,564,1,urlAlpha,()=>{
      label('TRY THE LIVE APP',0,-33,C.gray,18,2);
      text('https://hazlo-opensource.vercel.app',0,29,43,C.paper,500);
      label('FORK THE REPOSITORY',0,139,C.gray,18,2);
      text('https://github.com/YellankiKaushik/Hazlo-OpenSource',0,200,40,C.paper,500);
      const selected=u<2?0:1;
      const lineP=out((u-(selected?2:.6))/.55);
      line(0,selected?222:50,(selected?1330:1050)*lineP,selected?222:50,C.gold,2);
    });
    text('Built by Kaushik',120,962,28,C.gray);
    bolt(1700,865,100,C.gold,out((t-4.5)/.45));
    const final=out((t-5.5)/.35);line(120,1005,120+1680*final,1005,'#49515f',1);
  }
}

const drawScenes=[hook,product,capture,extraction,sync,openSource,closing];
const transitions=['none','up','cut','up','right','left','zoom'];

function drawAt(index,local) { drawScenes[index](Math.max(0,local)); }
function drawTransition(index,local,time) {
  const length=.28,p=smooth(local/length);
  const previous=index-1,prevEnd=scenes[previous].end-scenes[previous].start-.01;
  const type=transitions[index];
  if(type==='cut'||local>=length){drawAt(index,local);return;}
  ctx.save();
  ctx.filter=`blur(${(Math.sin(Math.PI*p)*1.4).toFixed(2)}px)`;
  if(type==='up'){
    ctx.save();ctx.translate(0,-H*p);drawAt(previous,prevEnd);ctx.restore();
    ctx.save();ctx.translate(0,H*(1-p));drawAt(index,local);ctx.restore();
  }else if(type==='left'||type==='right'){
    const direction=type==='left'?-1:1;
    ctx.save();ctx.translate(-direction*W*p,0);drawAt(previous,prevEnd);ctx.restore();
    ctx.save();ctx.translate(direction*W*(1-p),0);drawAt(index,local);ctx.restore();
  }else{
    drawAt(previous,prevEnd);
    ctx.save();path(0,H*(1-p)/2,W,H*p,0);ctx.clip();drawAt(index,local);ctx.restore();
  }
  ctx.restore();
}

window.renderFrame=async (frame,{thumbnail=false}={})=>{
  const time=frame/30;
  if(time>=8.5&&time<12){
    const sourceTime=mix(.08,manifest.clip.duration-.02,clamp((time-8.5)/3.45));
    const id=Math.min(Math.floor(manifest.clip.duration*30)-1,Math.floor(sourceTime*30)+1);
    if(id!==lastFrame){const image=new Image();image.src=`../assets/v2/frames/frame-${String(Math.max(1,id)).padStart(4,'0')}.jpg`;await image.decode();clip=image;lastFrame=id;}
  }
  ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.filter='none';
  if(thumbnail){
    background('paper');smallBrand(true);
    title('HAZLO',105,370,183,C.ink);title('Voice. Tasks.',116,483,75,C.ink,400);title('Your Notion.',116,575,75,C.ochre,400);
    label('OPEN SOURCE',125,724,'#778192',23,3);
    browser('dark-pending',920,130,1150,825,{source:[220,0,1480,1065],angle:-.025});
    box(775,743,133,99,C.ink,null,20);ctx.fillStyle=C.paper;ctx.beginPath();ctx.moveTo(827,767);ctx.lineTo(827,819);ctx.lineTo(864,793);ctx.closePath();ctx.fill();
    text('Built by Kaushik',125,922,29,'#778192');return;
  }
  const index=Math.max(0,scenes.findIndex(s=>time>=s.start&&time<s.end));
  const local=time-scenes[index].start;
  if(index>0)drawTransition(index,local,time);else drawAt(index,local);
};
window.filmReady=true;
await window.renderFrame(150);
