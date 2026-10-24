import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { root, dependency, chromeOptions } from './lib.mjs';
import { scenes, captions, fps, duration } from '../src/timeline.js';
const { chromium } = dependency('playwright');
const sharp = dependency('sharp');
const out = path.resolve(root, process.env.HAZLO_VIDEO_OUTPUT || 'renders');
await fs.mkdir(out,{recursive:true});
await fs.mkdir(path.join(out,'previews'),{recursive:true});
await fs.mkdir(path.join(root,'assets/recordings/frames'),{recursive:true});
const extracted=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(root,'assets/recordings/manual-entry.mp4'),'-vf','fps=25','-q:v','2',path.join(root,'assets/recordings/frames/frame-%04d.jpg')],{encoding:'utf8'});
if(extracted.status!==0)throw new Error(extracted.stderr);
const time = value => {const ms=Math.round(value*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
const srt=captions.map(([start,end,body],i)=>`${i+1}\n${time(start)} --> ${time(end)}\n${body}\n`).join('\n');
await fs.writeFile(path.join(out,'hazlo-launch-captions.srt'),srt);
const types={'.html':'text/html','.js':'text/javascript','.png':'image/png','.mp4':'video/mp4','.json':'application/json'};
const server=http.createServer(async(req,res)=>{
  try{
    const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';
    const file=path.resolve(root,rel);
    if(!file.startsWith(root+path.sep)&&file!==path.join(root,'index.html'))throw new Error('invalid path');
    const body=await fs.readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':body.length});res.end(body);
  }catch{res.writeHead(404);res.end('not found');}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch(chromeOptions);
try{
  const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  page.on('pageerror',error=>{console.error(error);});
  await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.filmReady,{timeout:30000});
  const draw=async(frame,png=false,thumbnail=false)=>{
    const base64=await page.evaluate(async({frame,png,thumbnail})=>{await window.renderFrame(frame,{thumbnail});return document.getElementById('film').toDataURL(png?'image/png':'image/jpeg',.95).split(',')[1];},{frame,png,thumbnail});
    return Buffer.from(base64,'base64');
  };
  const sheets=[];
  for(let i=0;i<scenes.length;i++){
    const scene=scenes[i],seconds=scene.start+Math.min(5,(scene.end-scene.start)*.6);
    const frame=await draw(Math.round(seconds*fps),true);
    await fs.writeFile(path.join(out,'previews',`scene-${String(i+1).padStart(2,'0')}.png`),frame);
    const label=Buffer.from(`<svg width="640" height="48"><rect width="640" height="48" fill="#20242b"/><text x="18" y="31" font-family="Arial" font-size="19" fill="#f7f5f0">${i+1}. ${scene.name} — ${seconds.toFixed(1)}s</text></svg>`);
    const cell=await sharp({create:{width:640,height:408,channels:3,background:'#20242b'}}).composite([{input:await sharp(frame).resize(640,360).toBuffer(),top:0,left:0},{input:label,top:360,left:0}]).png().toBuffer();
    sheets.push({input:cell,left:(i%3)*640,top:Math.floor(i/3)*408});
  }
  await sharp({create:{width:1920,height:1224,channels:3,background:'#15171a'}}).composite(sheets).png().toFile(path.join(out,'hazlo-launch-contact-sheet.png'));
  const thumb=await draw(420,true,true);
  await sharp(thumb).resize(1280,720).png({compressionLevel:9,palette:false}).toFile(path.join(out,'hazlo-launch-thumbnail.png'));
  console.log('Nine scene previews, contact sheet, thumbnail and SRT ready.');
  if(process.argv.includes('--preview'))process.exitCode=0;
  else{
    const output=path.join(out,'hazlo-launch-promo.mp4');
    const encoder=spawn(process.env.FFMPEG||'ffmpeg',['-hide_banner','-y','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0','-i',path.join(root,'assets/audio/score.wav'),'-i',path.join(out,'hazlo-launch-captions.srt'),'-map','0:v:0','-map','1:a:0','-map','2:s:0','-vf','scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p','-color_range','tv','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p','-r',String(fps),'-c:a','aac','-b:a','192k','-ar','48000','-af','loudnorm=I=-18:TP=-1.5:LRA=7','-c:s','mov_text','-metadata:s:s:0','language=eng','-metadata','title=Hazlo — Capture first. Organize later.','-metadata','artist=Kaushik (YellankiKaushik)','-metadata','comment=Authentic Hazlo UI. Voice waveform and Notion success flow are illustrative. Original generated instrumental score.','-t',String(duration),'-movflags','+faststart',output],{stdio:['pipe','ignore','pipe']});
    let log='';encoder.stderr.on('data',chunk=>{log+=chunk.toString();});
    let encodeError;encoder.on('error',err=>encodeError=err);encoder.stdin.on('error',err=>encodeError=err);
    const finished=once(encoder,'close');
    const started=Date.now();
    for(let frame=0;frame<fps*duration;frame++){
      if(encodeError)throw encodeError;
      const buffer=await draw(frame);
      if(!encoder.stdin.write(buffer))await once(encoder.stdin,'drain');
      if(frame%150===0)console.log(`Rendered ${(frame/fps).toFixed(1)} / ${duration}s (${Math.round((Date.now()-started)/1000)}s elapsed)`);
    }
    encoder.stdin.end();const [exitCode]=await finished;
    await fs.writeFile(path.join(out,'encode.log'),log);
    if(exitCode!==0)throw new Error(`FFmpeg exited ${exitCode}: ${log.slice(-2000)}`);
    console.log(`Final film rendered: ${output}`);
  }
}finally{await browser.close();server.close();}
