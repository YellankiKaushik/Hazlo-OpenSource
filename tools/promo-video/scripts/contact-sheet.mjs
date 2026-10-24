import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, dependency } from './lib.mjs';
const sharp=dependency('sharp');
const out=path.resolve(root,process.env.HAZLO_VIDEO_OUTPUT||'renders');
const video=path.join(out,'hazlo-launch-promo.mp4');
const times=[2.4,13,26.5,37.2,51.5,61,76.8,84.5,92.5];
const names=['A fleeting thought','Meet Hazlo','Actual manual capture','Local rule-based extraction','Local to Notion (illustrative)','A practical stack','Fork / configure / deploy','Real light + dark UI','Try Hazlo'];
async function sheet(samples,columns,name){
  const cells=[];
  for(let i=0;i<samples.length;i++){
    const time=samples[i];
    const frame=spawnSync(process.env.FFMPEG||'ffmpeg',['-v','error','-ss',String(time),'-i',video,'-frames:v','1','-f','image2pipe','-c:v','png','pipe:1'],{maxBuffer:12*1024*1024});
    if(frame.status!==0)throw new Error(frame.stderr.toString());
    const w=640,h=360;
    const label=Buffer.from(`<svg width="640" height="42"><rect width="640" height="42" fill="#20242b"/><text x="15" y="28" font-family="Arial" font-size="18" fill="#f7f5f0">${time.toFixed(2)}s — ${name.includes('transition')?'Transition inspection':names[i]}</text></svg>`);
    const cell=await sharp({create:{width:w,height:h+42,channels:3,background:'#15171a'}}).composite([{input:await sharp(frame.stdout).resize(w,h).toBuffer(),top:0,left:0},{input:label,top:h,left:0}]).png().toBuffer();
    cells.push({input:cell,left:(i%columns)*w,top:Math.floor(i/columns)*(h+42)});
  }
  await sharp({create:{width:columns*640,height:Math.ceil(samples.length/columns)*402,channels:3,background:'#15171a'}}).composite(cells).png().toFile(path.join(out,name));
}
await sheet(times,3,'hazlo-launch-contact-sheet.png');
await sheet([7.9,8.2,16.9,17.2,29.9,30.2,40.9,41.2,54.9,55.2,64.9,65.2,78.9,79.2,87.9,88.2],4,'hazlo-launch-transition-sheet.png');
console.log('Contact and transition sheets extracted from the encoded MP4.');
