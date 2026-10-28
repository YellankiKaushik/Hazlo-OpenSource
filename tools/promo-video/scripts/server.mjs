import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

// Render assets only; never serve .env, source maps, dependencies or arbitrary project files.
export function renderServer(root, defaultPage = 'index.html') {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    try {
      if (req.method !== 'GET' || req.headers['sec-fetch-site'] === 'cross-site') throw new Error('not allowed');
      const host = new URL('http://' + req.headers.host);
      if (host.hostname !== '127.0.0.1') throw new Error('not loopback');
      if (req.headers.origin && req.headers.origin !== host.origin) throw new Error('foreign origin');
      const rel = decodeURIComponent(new URL(req.url, host).pathname).slice(1) || defaultPage;
      if (!/^(?:index\.html|src\/[\w-]+\.js|v2\/(?:index\.html|film\.js|timeline\.js)|assets\/[\w/.-]+\.(?:png|jpg|mp4|json))$/.test(rel) ||
          rel.split('/').some(part => part.startsWith('.'))) throw new Error('not an asset');
      const base = await fs.realpath(root);
      const file = await fs.realpath(path.resolve(root, rel));
      const relative = path.relative(base, file);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('outside root');
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.json': 'application/json' };
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)], 'Content-Length': body.length });
      res.end(body);
    } catch { res.writeHead(404); res.end('not found'); }
  });
}
