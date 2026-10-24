import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { root } from './lib.mjs';
const out=path.resolve(root,process.env.HAZLO_VIDEO_OUTPUT||'renders');
const ranges=[[8,13],[22.5,28.5],[32,37],[71,76],[88,95]];
const f=['[0:v]split=5[sv0][sv1][sv2][sv3][sv4]','[0:a]asplit=5[sa0][sa1][sa2][sa3][sa4]'];
for(let i=0;i<5;i++){const [a,b]=ranges[i];f.push(`[sv${i}]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}]`);f.push(`[sa${i}]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS[a${i}]`);}
let elapsed=5;
for(let i=1;i<5;i++){
  const last=i===1?'v0':`vx${i-1}`,lastA=i===1?'a0':`ax${i-1}`;
  f.push(`[${last}][v${i}]xfade=transition=fade:duration=0.35:offset=${(elapsed-.35).toFixed(2)}[vx${i}]`);
  f.push(`[${lastA}][a${i}]acrossfade=d=0.35:c1=tri:c2=tri[ax${i}]`);
  elapsed+=ranges[i][1]-ranges[i][0]-.35;
}
const result=spawnSync(process.env.FFMPEG||'ffmpeg',['-hide_banner','-loglevel','error','-y','-i',path.join(out,'hazlo-launch-promo.mp4'),'-filter_complex_threads','2','-filter_complex',f.join(';'),'-map','[vx4]','-map','[ax4]','-c:v','libx264','-crf','19','-preset','medium','-pix_fmt','yuv420p','-color_range','tv','-c:a','aac','-b:a','192k','-movflags','+faststart',path.join(out,'hazlo-launch-teaser.mp4')],{encoding:'utf8',maxBuffer:4*1024*1024});
if(result.status!==0)throw new Error(result.stderr);
console.log('26.6-second teaser rendered, including the complete 7-second closing CTA.');
