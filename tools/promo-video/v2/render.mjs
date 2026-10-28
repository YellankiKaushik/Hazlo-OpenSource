import fs from 'node:fs/promises';
import path from 'node:path';
import { renderServer } from '../scripts/server.mjs';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { root, dependency, chromeOptions } from '../scripts/lib.mjs';
import { duration, fps, scenes, captions } from './timeline.js';

const { chromium }=dependency('playwright');
const sharp=dependency('sharp');
const out=path.resolve(root,process.env.HAZLO_V2_OUTPUT||'renders-v2');
await fs.mkdir(path.join(out,'previews'),{recursive:true});
await fs.mkdir(path.join(root,'assets/v2/frames'),{recursive:true});
const extract=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(root,'assets/v2/manual-entry.mp4'),'-vf','fps=30','-q:v','2',path.join(root,'assets/v2/frames/frame-%04d.jpg')],{encoding:'utf8'});
if(extract.status!==0)throw new Error(extract.stderr);
const stamp=s=>{const n=Math.round(s*1000);return `${String(Math.floor(n/3600000)).padStart(2,'0')}:${String(Math.floor(n/60000)%60).padStart(2,'0')}:${String(Math.floor(n/1000)%60).padStart(2,'0')},${String(n%1000).padStart(3,'0')}`;};
await fs.writeFile(path.join(out,'hazlo-launch-teaser-v2.srt'),captions.map(([a,b,s],i)=>`${i+1}\n${stamp(a)} --> ${stamp(b)}\n${s}\n`).join('\n'));
const server=renderServer(root, 'v2/index.html');
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch(chromeOptions);
try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/v2/index.html`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.filmReady,null,{timeout:30000});
  const draw=async(time,png=false,thumbnail=false)=>{
    const data=await page.evaluate(async({time,png,thumbnail})=>{await window.renderFrame(Math.round(time*30),{thumbnail});return document.querySelector('canvas').toDataURL(png?'image/png':'image/jpeg',.97).split(',')[1];},{time,png,thumbnail});
    if(pageErrors.length)throw new Error(pageErrors.join('\n'));
    return Buffer.from(data,'base64');
  };
  const times=[1.9,5.2,7.7,10.2,15.2,20.8,24.7,27.1,30.2];
  const labels=['Hook / full-frame type','Product hero / real dark UI','Voice / actual control close-up','Typing / real recording','Tasks / real checkbox interaction','Save + sync / labelled workflow','Fork / configure / deploy','Closing / product-led entrance','CTA / exact destinations'];
  const cells=[];
  for(let i=0;i<times.length;i++){
    const buffer=await draw(times[i],true);
    await fs.writeFile(path.join(out,'previews',`preview-${String(i+1).padStart(2,'0')}.png`),buffer);
    const caption=Buffer.from(`<svg width="640" height="44"><rect width="640" height="44" fill="#20242b"/><text x="16" y="29" fill="#f7f5f0" font-family="Arial" font-size="18">${times[i].toFixed(1)}s — ${labels[i]}</text></svg>`);
    const cell=await sharp({create:{width:640,height:404,channels:3,background:'#20242b'}}).composite([{input:await sharp(buffer).resize(640,360).toBuffer(),left:0,top:0},{input:caption,left:0,top:360}]).png().toBuffer();
    cells.push({input:cell,left:(i%3)*640,top:Math.floor(i/3)*404});
  }
  await sharp({create:{width:1920,height:1212,channels:3,background:'#20242b'}}).composite(cells).png().toFile(path.join(out,'hazlo-launch-teaser-v2-contact-sheet.png'));
  const thumbnail=await draw(5,true,true);
  await sharp(thumbnail).resize(1280,720).png({compressionLevel:9}).toFile(path.join(out,'hazlo-launch-teaser-v2-thumbnail.png'));
  console.log('V2 previews, 1280×720 thumbnail, contact sheet and captions ready.');
  if(!process.argv.includes('--preview')){
    const args=['-hide_banner','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',path.join(root,'assets/v2/audio/mix.wav'),'-i',path.join(out,'hazlo-launch-teaser-v2.srt'),'-map','0:v','-map','1:a','-map','2:s','-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:v','libx264','-crf','18','-preset','medium','-pix_fmt','yuv420p','-r',String(fps),'-c:a','aac','-b:a','256k','-ar','48000','-af','loudnorm=I=-14:TP=-1.2:LRA=7','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata','title=Hazlo — Build your own Hazlo / V2','-metadata','artist=Kaushik (YellankiKaushik)','-metadata','comment=Original 120 BPM score. Authentic UI. Speech waveform and successful sync flow are illustrative.','-t',String(duration),'-movflags','+faststart',path.join(out,'hazlo-launch-teaser-v2.mp4')];
    const encoder=spawn(process.env.FFMPEG||'ffmpeg',args,{stdio:['pipe','ignore','pipe']});
    let logs='',pipeError=null;encoder.stderr.on('data',v=>logs+=v);encoder.stdin.on('error',e=>pipeError=e);
    const finished=once(encoder,'close'),start=Date.now();
    for(let frame=0;frame<duration*fps;frame++){
      if(pipeError)throw pipeError;
      const data=await draw(frame/fps);
      if(!encoder.stdin.write(data))await once(encoder.stdin,'drain');
      if(frame%120===0)console.log(`V2: ${frame/fps} / ${duration}s, elapsed ${((Date.now()-start)/1000).toFixed(1)}s`);
    }
    encoder.stdin.end();const [code]=await finished;
    await fs.writeFile(path.join(out,'encode.log'),logs);
    if(code!==0)throw new Error(logs.slice(-2000));
    console.log('V2 final MP4 rendered.');
  }
}finally{await browser.close();server.close();}
