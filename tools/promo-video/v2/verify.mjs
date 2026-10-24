import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, dependency } from '../scripts/lib.mjs';
const sharp=dependency('sharp');
const out=path.resolve(root,process.env.HAZLO_V2_OUTPUT||'renders-v2');
const file=path.join(out,'hazlo-launch-teaser-v2.mp4');
const ffmpeg=process.env.FFMPEG||'ffmpeg';
function run(args,options={}) {
  const r=spawnSync(ffmpeg,args,{encoding:'utf8',maxBuffer:8*1024*1024,...options});
  if(r.status!==0)throw new Error(String(r.stderr));
  return r;
}
const probe=spawnSync(process.env.FFPROBE||'ffprobe',['-v','error','-show_format','-show_streams','-of','json',file],{encoding:'utf8'});
if(probe.status!==0)throw new Error(probe.stderr);
const metadata=JSON.parse(probe.stdout),v=metadata.streams.find(x=>x.codec_type==='video'),a=metadata.streams.find(x=>x.codec_type==='audio');
metadata.format.filename='hazlo-launch-teaser-v2.mp4';
const errors=[];
if(v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||v.width!==1920||v.height!==1080||v.avg_frame_rate!=='30/1')errors.push('Video format');
if(Number(v.nb_frames)!==960||Math.abs(Number(metadata.format.duration)-32)>.04)errors.push('Timing/frame count');
if(a?.codec_name!=='aac'||a?.channels!==2||a?.sample_rate!=='48000')errors.push('Audio format');
const bytes=await fs.readFile(file),atoms=[];let offset=0;
while(offset+8<=bytes.length){let n=bytes.readUInt32BE(offset);const type=bytes.toString('ascii',offset+4,offset+8);if(n===1)n=Number(bytes.readBigUInt64BE(offset+8));if(n===0)n=bytes.length-offset;if(n<8)break;atoms.push(type);offset+=n;}
const faststart=atoms.indexOf('moov')>=0&&atoms.indexOf('moov')<atoms.indexOf('mdat');
if(!faststart)errors.push('Faststart');
const decoded=run(['-v','error','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-']);
if(decoded.stderr.trim())errors.push('Decode warnings/errors');
const black=run(['-hide_banner','-i',file,'-vf','blackdetect=d=0.15:pix_th=0.02','-an','-sn','-f','null','-']);
const blackIntervals=black.stderr.split(/\r?\n/).filter(s=>s.includes('black_start:'));
if(blackIntervals.length)errors.push('Black intervals');
const measured=run(['-hide_banner','-i',file,'-af','ebur128=peak=true','-vn','-sn','-f','null','-']);
const summary=measured.stderr.slice(measured.stderr.lastIndexOf('Summary:'));
const integrated=Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
const truePeak=Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
if(!Number.isFinite(truePeak)||truePeak>=0)errors.push('Audio clipping/measurement');
if(!Number.isFinite(integrated)||integrated < -16||integrated > -12)errors.push('Audio loudness');
run(['-v','error','-y','-i',file,'-filter_complex','[0:a]showwavespic=s=1600x380:split_channels=1:colors=0x18212f|0x805400[v]','-map','[v]','-frames:v','1',path.join(out,'hazlo-launch-teaser-v2-audio-waveform.png')]);

async function frame(time){
  return run(['-v','error','-ss',String(time),'-i',file,'-frames:v','1','-f','image2pipe','-c:v','png','pipe:1'],{encoding:null,maxBuffer:12*1024*1024}).stdout;
}
async function sheet(times,columns,name,descriptions=null){
  const cells=[];
  for(let i=0;i<times.length;i++){
    const buffer=await frame(times[i]);
    const title=descriptions?.[i]||'Transition';
    const strip=Buffer.from(`<svg width="640" height="42"><rect width="640" height="42" fill="#20242b"/><text x="14" y="28" fill="#f7f5f0" font-family="Arial" font-size="18">${times[i].toFixed(2)}s — ${title}</text></svg>`);
    const cell=await sharp({create:{width:640,height:402,channels:3,background:'#20242b'}}).composite([{input:await sharp(buffer).resize(640,360).toBuffer(),left:0,top:0},{input:strip,left:0,top:360}]).png().toBuffer();
    cells.push({input:cell,left:(i%columns)*640,top:Math.floor(i/columns)*402});
  }
  await sharp({create:{width:columns*640,height:Math.ceil(times.length/columns)*402,channels:3,background:'#20242b'}}).composite(cells).png().toFile(path.join(out,name));
}
await sheet([1.9,5.2,7.7,10.2,15.2,20.8,24.7,27.1,30.2],3,'hazlo-launch-teaser-v2-contact-sheet.png',['Kinetic hook','Product hero','Voice close-up','Actual typing','Actual task controls','Save + sync','Personal deployment','Closing entrance','CTA / exact URLs']);
await sheet([2.9,3.13,6.9,7.1,8.4,8.64,11.9,12.13,16.9,17.13,21.9,22.13,25.9,26.13,27.55,27.8],4,'hazlo-launch-teaser-v2-transition-sheet.png');
const thumb=await sharp(path.join(out,'hazlo-launch-teaser-v2-thumbnail.png')).metadata();
if(thumb.width!==1280||thumb.height!==720)errors.push('Thumbnail dimensions');
const source=await fs.readFile(path.join(root,'v2/film.js'),'utf8');
if(source.includes('createRadialGradient'))errors.push('Radial background reintroduced');
const report={passed:errors.length===0,errors,technical:metadata,faststart,atoms,fullDecodeExitCode:decoded.status,blackIntervals,audio:{bpm:120,integratedLufs:integrated,truePeakDbfs:truePeak,summary},thumbnail:{width:thumb.width,height:thumb.height},review:['New ivory/charcoal/slate background system; no radial gradients or green lighting','Fresh actual manual-entry and checkbox captures','Speech waveform explicitly illustrative','Successful Notion flow explicitly illustrative','No production POST sent; controlled failure/retry UI captured','Local rule-based extraction and current data-source contract','Exact public app / repository URLs','Original 120 BPM score and separate Foley stems; no third-party music','No app/backend/config changes, README changes or publication']};
await fs.writeFile(path.join(out,'hazlo-launch-teaser-v2-validation.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.passed,errors,duration:metadata.format.duration,bytes:metadata.format.size,frames:v.nb_frames,video:`${v.width}x${v.height} ${v.avg_frame_rate} ${v.codec_name} ${v.pix_fmt}`,audio:`${a.codec_name} ${a.sample_rate} Hz stereo`,integratedLufs:integrated,truePeakDbfs:truePeak,faststart,blackIntervals,fullDecodeExitCode:decoded.status},null,2));
if(errors.length)process.exit(1);
