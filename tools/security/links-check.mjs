import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const files = execFileSync('git', ['ls-files', '-z', '*.md'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const broken = [];
let links = 0;
for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8').replace(/```[\s\S]*?```/g, '');
  const references = [...text.matchAll(/\]\(([^\s)]+)\)/g), ...text.matchAll(/(?:href|src)="([^" ]+)"/g)];
  for (const match of references) {
    const href = match[1];
    if (/^(?:[a-z]+:|#|\/\/)/i.test(href)) continue;
    links++;
    const target = decodeURIComponent(href.split('#')[0]);
    if (!fs.existsSync(path.resolve(root, path.dirname(file), target))) broken.push({ file, target });
  }
}
console.log(JSON.stringify({ markdownFiles: files.length, localLinks: links, broken }, null, 2));
if (broken.length) process.exitCode = 1;
