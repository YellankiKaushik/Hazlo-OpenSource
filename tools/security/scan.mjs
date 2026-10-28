import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
// Report paths only, never matched credential values.
const signatures = /(?:\b(?:ntn_|secret_)[A-Za-z0-9]{25,}|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}|\bvcp_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;
const files = git(['ls-files', '-z']).split('\0').filter(Boolean);
const findings = [];
let checked = 0;
for (const file of files) {
  if (/\.(?:mp4|png|jpg|woff2?)$/.test(file)) continue;
  const bytes = fs.readFileSync(path.join(root, file));
  if (bytes.includes(0)) continue;
  checked++;
  if (signatures.test(bytes.toString('utf8'))) findings.push(file);
  if (/(?:^|\/)\.env(?:$|\.)/.test(file) && file !== '.env.example') findings.push(file + ' (environment file tracked)');
}
let browserFiles = 0;
for (const directory of ['dist', 'artifacts/security/enabled']) {
const built = path.join(root, directory);
if (fs.existsSync(built)) for (const file of fs.readdirSync(built, { recursive: true })) {
  if (!/\.(?:html|js|css)$/.test(file)) continue;
  browserFiles++;
  const text = fs.readFileSync(path.join(built, file), 'utf8');
  if (signatures.test(text) || /VITE_API_SECRET|X-API-Secret|NOTION_TOKEN|HAZLO_PRIVATE_CANARY/.test(text)) findings.push(directory + '/' + file);
}
}
let commits = 0;
if (process.argv.includes('--history')) {
  const regex = '(ntn_|secret_)[A-Za-z0-9]{25,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|vcp_[A-Za-z0-9]{20,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY';
  for (const commit of git(['rev-list', '--all']).trim().split('\n').filter(Boolean)) {
    commits++;
    try {
      const names = git(['grep', '-I', '-l', '-E', regex, commit, '--', '.', ':!pnpm-lock.yaml', ':!tools/promo-video/pnpm-lock.yaml']).trim();
      if (names) findings.push(...names.split('\n'));
    } catch (error) { if (error.status !== 1) throw error; }
  }
}
console.log(JSON.stringify({ checkedTextFiles: checked, browserFiles, historyCommits: commits, findings: [...new Set(findings)],
  limitation: 'Pattern-based credential scan; cannot prove absence of arbitrary secrets or inspect audiovisual content.' }, null, 2));
if (findings.length) process.exitCode = 1;
