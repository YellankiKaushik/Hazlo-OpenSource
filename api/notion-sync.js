import { createHash } from 'node:crypto';

const NOTION_VERSION = '2025-09-03';
export const LIMITS = Object.freeze({ bodyBytes: 102400, transcript: 20000, tasks: 80, taskText: 2000, timeoutMs: 10000 });
const ID = /^[a-zA-Z0-9_-]{1,80}$/;
const UUID = /^[a-f0-9]{8}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{4}-?[a-f0-9]{12}$/i;
const STATUSES = ['Not started', 'In progress', 'Done'];
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;
const header = (req, name) => typeof req.headers?.[name] === 'string' ? req.headers[name] : '';
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keysAre = (value, allowed) => Object.keys(value).every(key => allowed.includes(key));

function reply(res, status, body) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

function origins() {
  const values = (process.env.NOTION_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!values.length || values.length > 10) return [];
  try {
    return values.map(value => {
      const url = new URL(value);
      if (url.origin !== value || url.username || url.password ||
          (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) {
        throw new Error('invalid origin');
      }
      return value;
    });
  } catch { return []; }
}

function configured(allowed) {
  const token = process.env.NOTION_TOKEN || '';
  return Boolean(token.trim() && !/\s/.test(token) && !token.includes('your_notion_token') &&
    UUID.test(process.env.NOTION_DATA_SOURCE_ID || '') && allowed.length);
}

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value);
  const calendar = new Date(value.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  return date.toISOString();
}

function validate(body, key) {
  if (!record(body) || !keysAre(body, ['rawSpeech', 'status', 'capturedAt', 'clientEntryId', 'tasks'])) return { error: 'invalid_body' };
  if (typeof body.rawSpeech !== 'string' || !body.rawSpeech.trim() || CONTROL.test(body.rawSpeech)) return { error: 'invalid_transcript' };
  if (body.rawSpeech.length > LIMITS.transcript) return { error: 'transcript_too_long' };
  if (typeof body.clientEntryId !== 'string' || !ID.test(body.clientEntryId) || key !== body.clientEntryId) return { error: 'invalid_entry_id' };
  const capturedAt = timestamp(body.capturedAt);
  if (!capturedAt) return { error: 'invalid_timestamp' };
  const status = body.status === undefined ? 'Not started' : body.status;
  if (!STATUSES.includes(status)) return { error: 'invalid_status' };
  const tasks = body.tasks === undefined ? [] : body.tasks;
  if (!Array.isArray(tasks) || tasks.length > LIMITS.tasks) return { error: 'invalid_tasks' };
  for (const task of tasks) {
    if (!record(task) || !keysAre(task, ['text', 'completed']) || typeof task.text !== 'string' ||
        !task.text.trim() || task.text.length > LIMITS.taskText || CONTROL.test(task.text) ||
        (task.completed !== undefined && typeof task.completed !== 'boolean')) return { error: 'invalid_tasks' };
  }
  return { value: { rawSpeech: body.rawSpeech.trim(), status, capturedAt, clientEntryId: body.clientEntryId,
    tasks: tasks.map(task => ({ text: task.text.trim(), completed: task.completed === true })) } };
}

// Keep UTF-16 surrogate pairs intact at Notion's per-rich-text boundary.
function chunks(text) {
  const result = [];
  let rest = text;
  while (rest.length) {
    let end = Math.min(2000, rest.length);
    if (end < rest.length && /[\uD800-\uDBFF]/.test(rest[end - 1])) end--;
    result.push(rest.slice(0, end));
    rest = rest.slice(end);
  }
  return result;
}

function pagePayload(value) {
  const rich = text => ({ type: 'text', text: { content: text } });
  const title = value.rawSpeech.length <= 2000 ? value.rawSpeech : chunks(value.rawSpeech)[0].slice(0, 1997).replace(/[\uD800-\uDBFF]$/, '') + '...';
  return {
    parent: { type: 'data_source_id', data_source_id: process.env.NOTION_DATA_SOURCE_ID },
    properties: {
      'Raw Speech': { title: [{ text: { content: title } }] },
      Status: { status: { name: value.status } },
      Date: { date: { start: value.capturedAt } },
    },
    children: [
      { object: 'block', type: 'paragraph', paragraph: { rich_text: chunks(value.rawSpeech).map(rich) } },
      ...value.tasks.map(task => ({ object: 'block', type: 'to_do', to_do: { rich_text: [rich(task.text)], checked: task.completed } })),
    ],
  };
}

async function createPage(value) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: { Authorization: 'Bearer ' + process.env.NOTION_TOKEN, 'Content-Type': 'application/json', 'Notion-Version': NOTION_VERSION },
          body: JSON.stringify(pagePayload(value)),
        });
        if (response.status === 429) {
          await response.body?.cancel().catch(() => {});
          return { status: 429, body: { error: 'rate_limited' } };
        }
        if (!response.ok) {
          const status = response.status;
          await response.body?.cancel().catch(() => {});
          // Upstream error bodies may contain user data. Log only a numeric status.
          console.warn('[Hazlo] Notion request rejected', { status });
          return { status: 502, body: { error: status >= 500 || status === 408 ? 'sync_outcome_unknown' : 'notion_sync_failed' } };
        }
        const page = await response.json();
        if (!UUID.test(page?.id || '')) return { status: 502, body: { error: 'sync_outcome_unknown' } };
        return { status: 200, body: { ok: true, pageId: page.id } };
      })(),
      new Promise(resolve => { timer = setTimeout(() => {
        controller.abort();
        resolve({ status: 504, body: { error: 'sync_outcome_unknown' } });
      }, LIMITS.timeoutMs); }),
    ]);
  } catch {
    // A transport failure does not prove Notion did not create the page.
    return { status: 502, body: { error: 'sync_outcome_unknown' } };
  } finally { clearTimeout(timer); }
}

/** Best-effort coalescing within ONE warm instance, never durable idempotency or global rate limiting. */
export function createHandler() {
  const recent = new Map();
  let active = 0;
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    const allowed = origins();
    const origin = header(req, 'origin');
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Idempotency-Key');
    }
    if (!['GET', 'POST', 'OPTIONS'].includes(req.method)) return reply(res, 405, { error: 'method_not_allowed' });
    if (req.method === 'OPTIONS') {
      if (!origin || !allowed.includes(origin)) return reply(res, 403, { error: 'origin_not_allowed' });
      return res.status(204).end();
    }
    const enabled = process.env.NOTION_SYNC_ENABLED === 'true' && process.env.VERCEL_ENV !== 'preview';
    // Configuration check only: never creates a page or calls Notion.
    if (req.method === 'GET') return reply(res, 200, { enabled, configured: enabled && configured(allowed) });
    if (!enabled) return reply(res, 403, { error: 'sync_disabled' });
    if (!configured(allowed)) return reply(res, 503, { error: 'server_not_configured' });
    // Browser CSRF defense, NOT identity/authentication. Non-browser callers can spoof Origin.
    if (!origin || !allowed.includes(origin) || header(req, 'sec-fetch-site') === 'cross-site') return reply(res, 403, { error: 'origin_not_allowed' });
    if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(header(req, 'content-type'))) return reply(res, 415, { error: 'json_required' });
    if (header(req, 'content-encoding') && header(req, 'content-encoding') !== 'identity') return reply(res, 415, { error: 'encoding_not_supported' });
    const length = header(req, 'content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > LIMITS.bodyBytes)) return reply(res, 413, { error: 'body_too_large' });
    let body;
    try {
      const raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? new TextDecoder('utf-8', { fatal: true }).decode(req.body) : JSON.stringify(req.body);
      if (!raw) return reply(res, 400, { error: 'invalid_json' });
      if (Buffer.byteLength(raw, 'utf8') > LIMITS.bodyBytes) return reply(res, 413, { error: 'body_too_large' });
      body = JSON.parse(raw);
    } catch { return reply(res, 400, { error: 'invalid_json' }); }
    const checked = validate(body, header(req, 'x-idempotency-key'));
    if (!checked.value) return reply(res, 400, { error: checked.error });
    const value = checked.value;
    const digest = createHash('sha256').update(JSON.stringify(value)).digest('hex');
    const now = Date.now();
    for (const [key, item] of recent) if (!item.pending && item.expires <= now) recent.delete(key);
    const existing = recent.get(value.clientEntryId);
    if (existing) {
      if (existing.digest !== digest) return reply(res, 409, { error: 'idempotency_conflict' });
      const result = await existing.promise;
      if (result.status === 429) res.setHeader('Retry-After', '60');
      return reply(res, result.status, result.body);
    }
    if (active >= 4 || recent.size >= 256) {
      res.setHeader('Retry-After', '60');
      return reply(res, 429, { error: 'capacity_limited' });
    }
    active++;
    const item = { digest, pending: true, expires: now + 600000, promise: createPage(value) };
    recent.set(value.clientEntryId, item);
    const result = await item.promise;
    item.pending = false;
    active--;
    // Retain uncertain outcomes to discourage accidental repeats in this instance.
    if (result.status !== 200 && result.body.error !== 'sync_outcome_unknown') recent.delete(value.clientEntryId);
    if (result.status === 429) res.setHeader('Retry-After', '60');
    return reply(res, result.status, result.body);
  };
}

export default createHandler();
