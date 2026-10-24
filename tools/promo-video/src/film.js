import { duration, scenes, captions } from './timeline.js';
const canvas = document.getElementById('film');
const c = canvas.getContext('2d', { alpha: false });
const W = 1920, H = 1080;
const P = { bg: '#15171a', paper: '#f7f5f0', ink: '#18212f', muted: '#969fab', line: '#343a45', surface: '#20242b', gold: '#ffd98a', green: '#9ee7bd' };
const images = {};
const imageNames = ['dark-initial','dark-clean','manual-empty','manual-partial','manual-full','entry-pending','entry-failed','entry-restored','light-entry','light-initial','mobile-light'];
await Promise.all(imageNames.map(async name => { const img = new Image(); img.src = `assets/screenshots/${name}.png`; await img.decode(); images[name] = img; }));
let footage = images['manual-empty'];
let lastFootageFrame = -1;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = v => 1 - (1 - clamp(v)) ** 3;
const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };
const lerp = (a, b, t) => a + (b - a) * t;
const spring = t => t < 0 ? 0 : 1 - Math.exp(-7 * t) * Math.cos(8 * t);
function rr(x,y,w,h,r=18) { c.beginPath(); c.roundRect(x,y,w,h,r); }
function box(x,y,w,h,fill=P.surface,stroke=P.line,r=18) { rr(x,y,w,h,r); c.fillStyle=fill; c.fill(); if(stroke){c.strokeStyle=stroke;c.lineWidth=1.5;c.stroke();} }
function text(value,x,y,size=30,color=P.paper,weight=400,align='left',font='Segoe UI') { c.font=`${weight} ${size}px "${font}", Arial, sans-serif`; c.fillStyle=color;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(value,x,y); }
function tracked(value,x,y,size=18,color=P.muted,spacing=3) { c.font=`600 ${size}px "Segoe UI",sans-serif`; c.fillStyle=color;c.textAlign='left'; for(const ch of value){c.fillText(ch,x,y);x+=c.measureText(ch).width+spacing;} }
function line(x1,y1,x2,y2,color=P.line,width=2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function circle(x,y,r,fill,stroke){c.beginPath();c.arc(x,y,r,0,Math.PI*2); if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function wrap(value,x,y,width,size=30,color=P.paper,weight=400,lineHeight=size*1.4){c.font=`${weight} ${size}px "Segoe UI",sans-serif`;let lineText='',row=0;for(const word of value.split(' ')){const n=lineText?lineText+' '+word:word;if(c.measureText(n).width>width&&lineText){text(lineText,x,y+row*lineHeight,size,color,weight);lineText=word;row++;}else lineText=n;}text(lineText,x,y+row*lineHeight,size,color,weight);return (row+1)*lineHeight;}
function group(x,y,scale,alpha,fn,rotate=0){c.save();c.globalAlpha*=clamp(alpha);c.translate(x,y);c.scale(scale,scale);c.rotate(rotate);fn();c.restore();}
function maskText(value,x,y,size,t,color=P.paper,weight=600){c.save();rr(x-10,y-size-10,1600,size*1.5,0);c.clip();const p=ease(t);text(value,x,y+(1-p)*size*1.3,size,color,weight);c.restore();}
function label(value,x,y,color=P.gold){tracked(value,x,y,18,color,2.4);}
function pill(value,x,y,color=P.green){c.font='600 20px "Segoe UI"';const w=c.measureText(value).width+38;box(x,y-30,w,46,'#202820',null,23);text(value,x+19,y,20,color,600);}
function check(x,y,size=24,progress=1,color=P.green){box(x,y,size,size,'#1b2b24',color,7);if(progress>0){c.save();rr(x,y,size*clamp(progress),size,0);c.clip();c.strokeStyle=color;c.lineWidth=3;c.lineCap='round';c.beginPath();c.moveTo(x+6,y+size*.5);c.lineTo(x+size*.43,y+size*.72);c.lineTo(x+size*.78,y+size*.28);c.stroke();c.restore();}}
function lightning(x,y,s=1,color=P.paper){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=color;c.lineWidth=2;c.lineJoin='round';c.beginPath();c.moveTo(13,2);c.lineTo(3,14);c.lineTo(11,14);c.lineTo(10,22);c.lineTo(21,10);c.lineTo(13,10);c.lineTo(13,2);c.stroke();c.restore();}
function mic(x,y,r=52,t=0){circle(x,y,r,'#f1efe9');c.save();c.translate(x,y);c.strokeStyle=P.ink;c.lineWidth=4;c.lineCap='round';c.beginPath();c.roundRect(-9,-22,18,32,9);c.stroke();c.beginPath();c.arc(0,2,17,0,Math.PI);c.stroke();line(0,19,0,28,P.ink,4);line(-10,28,10,28,P.ink,4);c.restore();for(let i=0;i<3;i++){const p=(t*.38+i/3)%1;circle(x,y,r+50*p,null,`rgba(255,217,138,${.24*(1-p)})`);}}
function browser(media,x,y,w,h,{crop=null,light=false,tilt=0,alpha=1}={}){
  const img=typeof media==='string'?images[media]:media;
  group(x+w/2,y+h/2,1,alpha,()=>{c.shadowColor='#0009';c.shadowBlur=55;c.shadowOffsetY=24;box(-w/2,-h/2,w,h,light?'#ece7df':'#242832','#49515f',20);c.shadowBlur=0;c.shadowOffsetY=0;for(let i=0;i<3;i++)circle(-w/2+26+i*19,-h/2+23,4,['#ff8c82','#ffd98a','#9ee7bd'][i]);text('hazlo-opensource.vercel.app',0,-h/2+28,16,light?'#475569':P.muted,400,'center');c.save();rr(-w/2+2,-h/2+45,w-4,h-47,0);c.clip();const b=[...(crop||[0,0,img.width,img.height])];const aspect=(w-4)/(h-47);if(b[2]/b[3]>aspect){const nw=b[3]*aspect;b[0]+=(b[2]-nw)/2;b[2]=nw;}else{const nh=b[2]/aspect;b[1]+=(b[3]-nh)/2;b[3]=nh;}c.drawImage(img,...b,-w/2+2,-h/2+45,w-4,h-47);c.restore();},tilt);
}
function cursor(x,y,t){c.save();c.translate(x,y);c.fillStyle=P.paper;c.strokeStyle=P.ink;c.lineWidth=2;c.beginPath();c.moveTo(0,0);c.lineTo(4,28);c.lineTo(12,21);c.lineTo(20,35);c.lineTo(26,32);c.lineTo(18,18);c.lineTo(29,15);c.closePath();c.fill();c.stroke();if(t>=0&&t<.5)circle(5,6,20+60*t,null,`rgba(255,217,138,${1-t*2})`);c.restore();}
function background(t,light=false){c.fillStyle=light?P.paper:P.bg;c.fillRect(0,0,W,H);const g=c.createRadialGradient(1440+Math.sin(t*.12)*180,270,0,1280,420,1000);g.addColorStop(0,light?'#eadbb377':'#26372e88');g.addColorStop(.6,light?'#f7f5f000':'#1b242000');g.addColorStop(1,'#15171a00');c.fillStyle=g;c.fillRect(0,0,W,H);c.globalAlpha=light?.13:.19;for(let i=0;i<15;i++){line(100+i*132,115,100+i*132,960,light?'#b1a899':'#49515f',.7);}c.globalAlpha=1;for(let i=0;i<34;i++){const x=(i*227.17+t*(i%2?5:-4)+19200)%1920,y=120+((i*97.3)%790);circle(x,y,i%4===0?2:1,light?'#c4bbac55':'#ffd98a33');}}
function chrome(t,index){lightning(100,55,1.5,P.paper);text('Hazlo',144,84,28,P.paper,600);label('OPEN SOURCE',260,81,P.muted);tracked(String(index+1).padStart(2,'0')+' / 09',1645,81,17,P.muted,2);line(100,112,1820,112,P.line,1);const chapter=scenes[index];tracked(chapter.chapter,100,960,16,P.muted,3);line(100,984,1820,984,'#343a45',2);line(100,984,100+1720*clamp(t/duration),984,P.gold,3);}
function subtitle(t){const cap=captions.find(v=>t>=v[0]&&t<v[1]);if(!cap)return;const a=Math.min(smooth((t-cap[0])/.15),smooth((cap[1]-t)/.15));c.save();c.globalAlpha=a;c.font='500 25px "Segoe UI"';const w=Math.min(1720,c.measureText(cap[2]).width+48);box((W-w)/2,1000,w,49,'#101113e8',null,10);text(cap[2],960,1033,25,P.paper,500,'center');c.restore();}
function card(value,x,y,w=380,h=108,t=0,i=0){group(x,y,1,1,()=>{box(0,0,w,h,'#20242bf2','#414751',18);circle(30,34,4,P.gold);text('THOUGHT '+String(i+1).padStart(2,'0'),48,41,15,P.muted,600);text(value,26,79,24,P.paper,400);},Math.sin(t*.5+i)*.035);}
function problem(t){
  const clear=ease((t-5.6)/1.5);const notes=[['Finish the landing page',130,200],['Review the deployment',1320,205],['Remember that idea',1140,670],['One more follow-up',180,720],['Capture it before it goes',710,150]];
  notes.forEach(([v,x,y],i)=>{const a=ease((t-i*.28)/.7)*(1-clear);group(x+(x-960)*clear*1.8,y+(y-540)*clear,1-.12*clear,a,()=>card(v,0,Math.sin(t*.65+i)*13,390,108,t,i));});
  group(960,475,1+.015*Math.sin(t*.3),1,()=>{
    if(t<3.75){maskText('Great ideas',-520,0,120,t/.9,P.paper);maskText("don't wait.",-480,139,120,(t-.55)/.9,P.gold);}
    else{maskText('But capturing them',-680,0,104,(t-3.75)/.7,P.paper);maskText('takes time.',-380,132,110,(t-4.15)/.7,P.gold);}
  });
}
function reveal(t){
  label('THINK IT. SAY IT. DO IT.',115,235);maskText('Meet',110,370,100,t/.7);maskText('Hazlo.',102,526,164,(t-.25)/.8,P.gold);wrap('Voice-first task capture.',117,610,550,43,P.paper,400);pill('MIT licensed · Forkable',118,710,P.green);
  const p=spring(t/1.4);browser('dark-initial',lerp(1110,760,p),205-Math.sin(t*.38)*9,1040,777,{tilt:lerp(.08,-.012,p),alpha:ease(t/.7)});
  group(1530,580,1,ease((t-4.2)/.8),()=>{const im=images['mobile-light'];c.shadowColor='#000a';c.shadowBlur=40;box(0,0,204,386,'#242832','#49515f',28);c.shadowBlur=0;c.save();rr(7,8,190,370,23);c.clip();c.drawImage(im,0,0,im.width,im.height,7,8,190,370);c.restore();});
  text('REAL APPLICATION · DESKTOP + MOBILE',800,917,17,P.muted,500);
}
function capture(t){
  label('ONE CAPTURE FLOW',112,234);maskText('Speak it.',108,360,95,t/.7);maskText('Or type it.',108,475,95,(t-.3)/.7,P.gold);
  if(t<4.7){mic(325,670,58,t);for(let i=0;i<31;i++){const a=(Math.sin(i*1.7+t*8)*.5+.5)*42+6;box(460+i*8,670-a/2,4,a,P.gold,null,2);}text('BROWSER WEB SPEECH API',111,815,20,P.muted,500);text('Illustrative waveform · support varies',111,852,19,P.muted);browser('dark-initial',820,218,970,730);}
  else{
    const p=ease((t-4.7)/.8);group(110,585,1,p,()=>{box(0,0,560,190,'#242832',P.line);label('THE DEMO THOUGHT',24,40);wrap('Finish the landing page and review the Vercel deployment',24,90,500,30,P.paper,400,45);});
    const sourceTime=.6+(t-4.7)*.66;const cropY=lerp(360,65,ease((sourceTime-2.7)/.8));
    browser(footage,765,215,1035,728,{crop:[230,cropY,820,540]});
    pill('Actual manual-entry recording',802,918,P.green);
  }
}
function extraction(t){
  label('LOCAL, RULE-BASED EXTRACTION',112,208);maskText('A thought,',106,315,84,t/.7);maskText('with a next step.',106,410,84,(t-.3)/.8,P.gold);
  const a=ease((t-.9)/.8);group(110,512,1,a,()=>{box(0,0,700,255,'#20242b',P.line,22);label('ORIGINAL THOUGHT',30,45,P.muted);wrap('Finish the landing page and review the Vercel deployment',30,109,620,37,P.paper,400,55);line(30,211,200,211,P.gold,3);text('Context preserved',226,219,19,P.muted);});
  const p=clamp((t-1.7)/2);c.save();c.setLineDash([8,10]);line(842,637,842+135*p,637,P.gold,2);c.restore();circle(842+135*p,637,5,P.gold);
  ['Finish the landing page','review the Vercel deployment'].forEach((v,i)=>{const enter=spring((t-2.2-i*1.25)/.9);group(1010+80*(1-enter),530+i*135,1,ease((t-2-i*1.25)/.7),()=>{box(0,0,780,106,'#242832',P.line,18);check(27,35,32,ease((t-6-i*.6)/.5));text(v,84,64,30,P.paper,500);});});
  text('No model call. No external parsing service.',112,854,24,P.muted);
  if(t>6.4){pill('2 tasks extracted',1040,850,P.green);}
}
function flowNode(title,subtitle,x,y,i,t){const p=spring((t-i*.6)/.7);group(x,y+25*(1-p),1,ease((t-i*.6)/.5),()=>{box(0,0,365,136,'#20242b',P.line,22);circle(35,37,13,'#2a2f38');text(String(i+1),35,43,16,P.gold,600,'center');text(title,28,81,30,P.paper,600);text(subtitle,28,113,18,P.muted);});}
function sync(t){
  label('LOCAL FIRST, NOTION NEXT',112,208);maskText('Saved locally.',106,318,90,t/.7);maskText('Synced to Notion.',106,426,90,(t-.3)/.8,P.gold);
  const nodes=[['Browser capture','Speak or type'],['Local entry','Zustand + localStorage'],['Vercel Function','POST /api/notion-sync'],['Notion','Page + task blocks']];
  nodes.forEach(([a,b],i)=>{const x=110+i*435;flowNode(a,b,x,535,i,t-1);if(i<3){const p=clamp((t-2.1-i*.7)/.7);line(x+377,604,x+377+46*p,604,P.green,2);if(p>0){circle(x+377+46*p,604,4,P.green);}}});
  const phase=(t-3.7)/1.1;for(let i=0;i<3;i++){const p=clamp(phase-i*.65);if(p>0&&p<1){circle(110+i*435+365+p*70,604,6,P.gold);}}
  group(110,735,1,ease((t-4)/.8),()=>{box(0,0,800,124,'#192a22','#2b5140',18);check(24,25,28,1);text('Local entry retained',70,47,28,P.green,600);text('A sync error does not erase the captured thought.',24,91,23,P.paper);});
  group(985,735,1,ease((t-5.7)/.8),()=>{box(0,0,805,124,P.paper,'#d8cfc4',18);text('Notion page preview',24,36,20,P.ink,600);text('☐ Finish the landing page',24,72,26,P.ink);text('☐ review the Vercel deployment',24,106,26,P.ink);});
  text('Illustrative sync flow · connect your own workspace',111,907,19,P.muted);
  if(t>9){pill('Sync failed? Retry.',1250,493,P.gold);}
}
function stack(t){
  label('SMALL STACK. PRACTICAL WORKFLOW.',112,210);maskText('Easy to understand.',106,323,86,t/.8);maskText('Ready to make yours.',106,421,86,(t-.25)/.8,P.gold);
  const tech=[['React','Interface'],['Vite','Build tooling'],['TypeScript','Typed code'],['Zustand','Local state'],['Web Speech API','Browser recognition'],['Vercel','Serverless function'],['Notion API','Page creation']];
  tech.forEach(([name,sub],i)=>{const row=i<4?0:1,j=i<4?i:i-4;const x=110+j*435+(row?217:0),y=505+row*185;const p=spring((t-.7-i*.35)/.9);group(x,y+50*(1-p)+Math.sin(t*.65+i)*3,1,ease((t-.7-i*.35)/.6),()=>{box(0,0,395,146,'#20242b',P.line,18);line(26,31,74,31,i%2?P.gold:P.green,4);text(name,26,78,31,P.paper,600);text(sub,26,114,20,P.muted);if(t>4){const scan=((t*.17+i*.14)%1);line(26+scan*280,144,26+scan*280+35,144,i%2?P.gold:P.green,2);}});});
}
function openSource(t){
  label('MIT LICENSED · OPEN SOURCE',112,208);maskText('Your workspace.',106,320,94,t/.8);maskText('Your setup.',106,430,94,(t-.3)/.8,P.gold);
  const labels=[['01','Fork the repository','Start with the code on GitHub.'],['02','Connect Notion','Your integration. Your data source.'],['03','Configure Vercel','Your environment. Your hosting.'],['04','Deploy Hazlo','A personal instance, ready to capture.']];
  labels.forEach(([n,title,sub],i)=>{const p=spring((t-1.3-i*1.5)/.8);const x=110+i*435;group(x,530+60*(1-p),1,ease((t-1.3-i*1.5)/.7),()=>{box(0,0,395,278,'#20242b',P.line,22);text(n,26,67,42,i%2?P.gold:P.green,400);text(title,26,129,29,P.paper,600);wrap(sub,26,174,340,23,P.muted);line(26,243,26+343*clamp((t-2.1-i*1.5)/.9),243,P.gold,3);});if(i<3&&t>2.6+i*1.5)line(x+400,667,x+430,667,P.green,2);});
  if(t>7.8){text('NOTION_DATA_SOURCE_ID',112,884,24,P.green,600,'left','Consolas');text('Raw Speech · Title     Status · Status     Date · Date',580,884,24,P.muted);}
  if(t>10){pill('Personal / self-hosted',1440,892,P.gold);}
}
function finalProduct(t){
  label('BUILT FOR THE WAY THOUGHTS HAPPEN',112,205);maskText('Capture first.',106,323,94,t/.7);maskText('Organize later.',106,435,94,(t-.3)/.8,P.gold);
  const p=spring(t/1.2);browser('dark-initial',lerp(900,840,p),185,950,738,{tilt:-.012+Math.sin(t*.3)*.007});
  const lp=ease((t-1.4)/1);browser('light-initial',110-60*(1-lp),535,760,390,{crop:[350,920,1220,430],light:true,alpha:lp,tilt:.012});
  pill('Light · Dark · System',112,495,P.green);
  text('Actual Hazlo interface',910,907,18,P.muted);
}
function cta(t){
  const p=ease(t/.8);group(960,435,1,1,()=>{label('HAZLO BY KAUSHIK',-175,-165,P.gold);maskText('Try Hazlo.',-370,-7,152,t/.8,P.paper);text('Open source. Forkable. Yours.',0,83,42,P.gold,400,'center');});
  group(960,682,1,p,()=>{box(-710,-35,1420,184,'#20242b',P.line,23);label('LIVE DEMO',-670,6,P.muted);text('https://hazlo-opensource.vercel.app',-460,6,31,P.paper,500);line(-670,36,670,36,P.line,1);label('GITHUB',-670,82,P.muted);text('https://github.com/YellankiKaushik/Hazlo-OpenSource',-460,82,29,P.paper,500);});
  text('Built by Kaushik',960,909,27,P.muted,400,'center');
}
const drawScene=[problem,reveal,capture,extraction,sync,stack,openSource,finalProduct,cta];
window.renderFrame=async (frame,{thumbnail=false}={})=>{
  const t=frame/30;
  if(t>=21.7&&t<30){const target=.6+(t-21.7)*.66;const idx=Math.floor(target*25)+1;if(idx!==lastFootageFrame){const img=new Image();img.src=`assets/recordings/frames/frame-${String(idx).padStart(4,'0')}.jpg`;await img.decode();footage=img;lastFootageFrame=idx;}}
  c.setTransform(1,0,0,1,0,0);c.globalAlpha=1;c.shadowBlur=0;c.shadowOffsetY=0;c.clearRect(0,0,W,H);background(t);
  if(thumbnail){
    label('HAZLO BY KAUSHIK',112,220,P.gold);text('HAZLO',104,421,170,P.paper,650);text('Voice → Tasks',113,524,58,P.paper,400);text('→ Notion',113,606,58,P.gold,400);pill('OPEN SOURCE',114,724,P.green);browser('dark-initial',855,182,945,740,{tilt:-.012});circle(1060,615,67,'#ffd98a');c.fillStyle=P.ink;c.beginPath();c.moveTo(1044,585);c.lineTo(1044,645);c.lineTo(1092,615);c.closePath();c.fill();text('Built by Kaushik',114,870,28,P.muted);return;
  }
  let index=scenes.findIndex(s=>t>=s.start&&t<s.end);if(index<0)index=8;
  const local=t-scenes[index].start;
  if(index>0&&local<.65){drawScene[index-1](scenes[index-1].end-scenes[index-1].start-.05);const p=smooth(local/.65);c.save();rr(0,0,W*p,H,0);c.clip();background(t);drawScene[index](local);c.restore();line(W*p,113,W*p,947,P.gold,2);}else drawScene[index](local);
  chrome(t,index);subtitle(t);
};
window.filmReady=true;
await window.renderFrame(420);
