import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHandler, LIMITS } from './notion-sync.js';

const SOURCE = '11111111-1111-4111-8111-111111111111';
const PAGE = '22222222-2222-4222-8222-222222222222';
const ORIGIN = 'https://hazlo.example';
const body = (extra = {}) => ({ rawSpeech: 'Pay the card balance', status: 'Not started', clientEntryId: 'entry-test',
  capturedAt: '2026-06-17T08:45:30.000Z', tasks: [{ text: 'Pay the card balance', completed: false }], ...extra });
const request = (value = body(), headers = {}) => ({ method: 'POST', headers: {
  origin: ORIGIN, 'content-type': 'application/json', 'x-idempotency-key': 'entry-test', ...headers,
}, body: value });
function response() {
  return { statusCode: 200, headers: {}, payload: '',
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
    end(payload = '') { this.payload = payload; return this; },
  };
}
const success = () => new Response(JSON.stringify({ id: PAGE }), { status: 200 });
let handler;
async function call(req = request()) { const res = response(); await handler(req, res); return res; }

describe('Notion API security and contract', () => {
  beforeEach(() => {
    vi.stubEnv('NOTION_SYNC_ENABLED', 'true');
    vi.stubEnv('NOTION_TOKEN', 'test-only-notion-credential');
    vi.stubEnv('NOTION_DATA_SOURCE_ID', SOURCE);
    vi.stubEnv('NOTION_ALLOWED_ORIGINS', ORIGIN);
    vi.stubEnv('VERCEL_ENV', 'development');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(success()));
    handler = createHandler();
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it('preserves parent, title, status, original timestamp, transcript and task blocks', async () => {
    expect((await call()).statusCode).toBe(200);
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://api.notion.com/v1/pages');
    expect(options.redirect).toBe('error');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    const page = JSON.parse(options.body);
    expect(page.parent).toEqual({ type: 'data_source_id', data_source_id: SOURCE });
    expect(page.properties).toEqual({
      'Raw Speech': { title: [{ text: { content: 'Pay the card balance' } }] },
      Status: { status: { name: 'Not started' } },
      Date: { date: { start: '2026-06-17T08:45:30.000Z' } },
    });
    expect(page.children[0].paragraph.rich_text[0].text.content).toBe('Pay the card balance');
    expect(page.children[1].to_do).toEqual({ checked: false, rich_text: [{ type: 'text', text: { content: 'Pay the card balance' } }] });
  });
  it('normalizes an offset timestamp without changing capture time', async () => {
    await call(request(body({ capturedAt: '2026-06-17T10:15:30+05:30' })));
    expect(JSON.parse(fetch.mock.calls[0][1].body).properties.Date.date.start).toBe('2026-06-17T04:45:30.000Z');
  });
  it('retains all long transcript text in rich text without splitting emoji pairs', async () => {
    const rawSpeech = 'a'.repeat(1999) + '😀' + 'b'.repeat(9000);
    expect((await call(request(body({ rawSpeech })))).statusCode).toBe(200);
    const page = JSON.parse(fetch.mock.calls[0][1].body);
    const pieces = page.children[0].paragraph.rich_text.map(t => t.text.content);
    expect(pieces.join('')).toBe(rawSpeech);
    expect(pieces.every(s => s.length <= 2000 && !/[\uD800-\uDBFF]$/.test(s))).toBe(true);
    expect(page.properties['Raw Speech'].title[0].text.content.length).toBeLessThanOrEqual(2000);
  });
  it.each([
    ['missing body', undefined], ['malformed JSON', '{'], ['null', null], ['array', []],
    ['empty object', {}], ['empty transcript', body({ rawSpeech: '  ' })],
    ['numeric transcript', body({ rawSpeech: 8 })],
    ['oversize transcript', body({ rawSpeech: 'x'.repeat(20001) })],
    ['control characters', body({ rawSpeech: 'hello\u0000world' })],
    ['excess tasks', body({ tasks: Array.from({ length: 81 }, () => ({ text: 'task' })) })],
    ['long task', body({ tasks: [{ text: 'x'.repeat(2001) }] })],
    ['invalid task', body({ tasks: [null] })], ['nested task', body({ tasks: [[]] })],
    ['blank task', body({ tasks: [{ text: ' ' }] })], ['task boolean', body({ tasks: [{ text: 'task', completed: 'yes' }] })],
    ['task extra key', body({ tasks: [{ text: 'task', url: 'https://evil.example' }] })],
    ['invalid status', body({ status: 'arbitrary' })], ['status object', body({ status: {} })],
    ['invalid timestamp', body({ capturedAt: 'bad-date' })], ['missing timestamp', body({ capturedAt: undefined })],
    ['invalid calendar day', body({ capturedAt: '2026-02-30T10:00:00Z' })],
    ['unsafe ID', body({ clientEntryId: '../entry' })], ['empty ID', body({ clientEntryId: '' })],
    ['oversized ID', body({ clientEntryId: 'x'.repeat(81) })],
    ['extra top-level property', body({ notionToken: 'attacker' })],
    ['prototype key', JSON.stringify({ ...body(), ['__proto__']: { admin: true } })],
  ])('rejects %s before an upstream request', async (_, input) => {
    const req = request(); req.body = input;
    const res = await call(req);
    expect(res.statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['GETT', 'PUT', 'DELETE', 'PATCH'])('rejects method %s', async method => {
    expect((await call({ ...request(), method })).statusCode).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['text/plain', 'application/x-www-form-urlencoded', '', 'application/json; garbage'])('rejects content type %s', async type => {
    expect((await call(request(body(), { 'content-type': type }))).statusCode).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts JSON strings and UTF-8 content type', async () => {
    expect((await call(request(JSON.stringify(body()), { 'content-type': 'application/json; charset=utf-8' }))).statusCode).toBe(200);
  });
  it('rejects invalid UTF-8 bytes rather than replacing user content', async () => {
    expect((await call(request(Buffer.from([123, 34, 255, 34, 125])))).statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('accepts documented boundary lengths without losing text or tasks', async () => {
    const res = await call(request(body({ rawSpeech: 'x'.repeat(20000), tasks: Array.from({ length: 80 }, () => ({ text: 'task', completed: true })) })));
    expect(res.statusCode).toBe(200);
    const page = JSON.parse(fetch.mock.calls[0][1].body);
    expect(page.children).toHaveLength(81);
    expect(page.children[0].paragraph.rich_text.map(t => t.text.content).join('')).toHaveLength(20000);
  });
  it('limits UTF-8 bytes even when all individual strings are within character limits', async () => {
    const payload = body({ rawSpeech: '测'.repeat(20000), tasks: Array.from({ length: 30 }, () => ({ text: '测'.repeat(1000) })) });
    expect((await call(request(payload))).statusCode).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('enforces actual UTF-8 byte limits and declared size', async () => {
    expect((await call(request(' '.repeat(LIMITS.bodyBytes + 1)))).statusCode).toBe(413);
    expect((await call(request(body(), { 'content-length': '102401' }))).statusCode).toBe(413);
    expect((await call(request(body(), { 'content-encoding': 'gzip' }))).statusCode).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['', 'false', 'TRUE'])('disables sync without exact server opt-in (%s)', async value => {
    vi.stubEnv('NOTION_SYNC_ENABLED', value);
    const res = await call();
    expect(JSON.parse(res.payload).error).toBe('sync_disabled');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('always disables preview writes, including inherited opt-in and credentials', async () => {
    vi.stubEnv('VERCEL_ENV', 'preview');
    expect(JSON.parse((await call()).payload).error).toBe('sync_disabled');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['NOTION_TOKEN', 'NOTION_DATA_SOURCE_ID', 'NOTION_ALLOWED_ORIGINS'])('fails closed for missing %s', async name => {
    vi.stubEnv(name, '');
    expect((await call()).statusCode).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(['*', 'https://hazlo.example/', 'https://user:password@hazlo.example', 'http://unsafe.example'])('rejects unsafe allowlist %s', async origin => {
    vi.stubEnv('NOTION_ALLOWED_ORIGINS', origin);
    expect((await call()).statusCode).toBe(503);
  });
  it.each(['https://evil.example', '', 'null'])('rejects unapproved or absent Origin %s', async origin => {
    const res = await call(request(body(), { origin }));
    expect(res.statusCode).toBe(403);
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects browser cross-site requests despite spoofed allowed origin', async () => {
    expect((await call(request(body(), { 'sec-fetch-site': 'cross-site' }))).statusCode).toBe(403);
  });
  it('provides scoped preflight and private no-store responses', async () => {
    const res = await call({ ...request(), method: 'OPTIONS' });
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe(ORIGIN);
    expect(res.headers['Access-Control-Allow-Headers']).not.toContain('Secret');
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('GET checks configuration without creating or reading Notion pages', async () => {
    const res = await call({ ...request(), method: 'GET' });
    expect(JSON.parse(res.payload)).toEqual({ enabled: true, configured: true });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('requires header/body identifier agreement', async () => {
    expect((await call(request(body(), { 'x-idempotency-key': 'other' }))).statusCode).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('coalesces concurrent requests and replays success in one warm instance', async () => {
    let release;
    fetch.mockImplementation(() => new Promise(resolve => { release = resolve; }));
    const first = call(), second = call();
    release(success());
    expect((await first).statusCode).toBe(200);
    expect((await second).statusCode).toBe(200);
    expect((await call()).statusCode).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects conflicting payloads using a recent identifier', async () => {
    await call();
    expect((await call(request(body({ rawSpeech: 'different content' })))).statusCode).toBe(409);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('bounds per-instance concurrent upstream writes without claiming global limits', async () => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    fetch.mockImplementation(() => pending);
    const requests = Array.from({ length: 4 }, (_, i) => call(request(body({ clientEntryId: 'entry-' + i }), { 'x-idempotency-key': 'entry-' + i })));
    expect((await call()).statusCode).toBe(429);
    release(success()); await Promise.all(requests);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it('allows manual retry after an explicit Notion rejection', async () => {
    fetch.mockResolvedValueOnce(new Response('', { status: 429 })).mockResolvedValueOnce(success());
    expect((await call()).headers['Retry-After']).toBe('60');
    expect((await call()).statusCode).toBe(200);
  });
  it('never returns or logs upstream error messages or exception contents', async () => {
    const logs = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetch.mockResolvedValueOnce(new Response('PRIVATE TRANSCRIPT TOKEN', { status: 400 }));
    const res = await call();
    expect(JSON.parse(res.payload)).toEqual({ error: 'notion_sync_failed' });
    expect(JSON.stringify(logs.mock.calls)).toBe(JSON.stringify([['[Hazlo] Notion request rejected', { status: 400 }]]));
  });
  it('bounds timeout and does not blindly repeat an uncertain create', async () => {
    vi.useFakeTimers();
    fetch.mockImplementation(() => new Promise(() => {}));
    const result = call();
    await vi.advanceTimersByTimeAsync(10000);
    const res = await result;
    expect(res.statusCode).toBe(504);
    expect(JSON.parse(res.payload).error).toBe('sync_outcome_unknown');
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await call();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('contains network exception details and caches the uncertain outcome', async () => {
    fetch.mockRejectedValue(new Error('PRIVATE TOKEN TRANSCRIPT'));
    expect(JSON.parse((await call()).payload).error).toBe('sync_outcome_unknown');
    await call(); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('treats an upstream request timeout as uncertain', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetch.mockResolvedValue(new Response('', { status: 408 }));
    expect(JSON.parse((await call()).payload).error).toBe('sync_outcome_unknown');
    await call(); expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('does not promise deduplication across cold instances', async () => {
    await call();
    handler = createHandler();
    await call();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('expires warm-instance records instead of keeping unbounded identifiers', async () => {
    vi.useFakeTimers();
    await call();
    await vi.advanceTimersByTimeAsync(600001);
    await call();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
