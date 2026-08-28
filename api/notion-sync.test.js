import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './notion-sync.js';

const ORIGINAL_ENV = { ...process.env };

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    payload: '',
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },
    end(payload = '') {
      this.payload = payload;
      return this;
    },
  };
}

function createPostRequest(body = {}) {
  return {
    method: 'POST',
    headers: {
      'x-api-secret': 'test-secret',
    },
    body: {
      rawSpeech: 'Pay the card balance',
      status: 'Not started',
      clientEntryId: 'entry-test',
      capturedAt: '2026-06-17T08:45:30.000Z',
      tasks: [{ text: 'Pay the card balance', completed: false }],
      ...body,
    },
  };
}

function getNotionPayload(fetchMock) {
  const [, options] = fetchMock.mock.calls[0];
  return JSON.parse(options.body);
}

describe('notion-sync handler', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      NOTION_TOKEN: 'test-notion-token',
      NOTION_DATA_SOURCE_ID: 'test-data-source-id',
      API_SECRET: 'test-secret',
    };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates Notion pages under the configured data source parent with captured date and tasks', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'page-id' }),
    });

    const res = createResponse();
    await handler(createPostRequest(), res);

    expect(res.statusCode).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const payload = getNotionPayload(fetchMock);

    expect(payload.parent).toEqual({
      type: 'data_source_id',
      data_source_id: 'test-data-source-id',
    });
    expect(payload.parent).not.toHaveProperty('database_id');
    expect(payload.properties).toEqual({
      'Raw Speech': {
        title: [{ text: { content: 'Pay the card balance' } }],
      },
      Status: {
        status: { name: 'Not started' },
      },
      Date: {
        date: {
          start: '2026-06-17T08:45:30.000Z',
        },
      },
    });
    expect(payload.properties.Date.date).not.toHaveProperty('time_zone');
    expect(payload.children).toEqual([
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: 'Pay the card balance' },
          }],
        },
      },
      {
        object: 'block',
        type: 'to_do',
        to_do: {
          rich_text: [{
            type: 'text',
            text: { content: 'Pay the card balance' },
          }],
          checked: false,
        },
      },
    ]);
  });

  it('normalizes captured timestamps that include a timezone offset', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'page-id' }),
    });

    const res = createResponse();
    await handler(createPostRequest({
      capturedAt: '2026-06-17T10:15:30+05:30',
    }), res);

    expect(res.statusCode).toBe(200);
    expect(getNotionPayload(fetchMock).properties.Date.date.start).toBe('2026-06-17T04:45:30.000Z');
  });

  it('falls back safely when capturedAt is invalid', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-17T12:00:00.000Z'));

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 'page-id' }),
    });
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const res = createResponse();
    await handler(createPostRequest({
      capturedAt: 'not-a-date',
    }), res);

    expect(res.statusCode).toBe(200);
    expect(getNotionPayload(fetchMock).properties.Date.date.start).toBe('2026-06-17T12:00:00.000Z');
    expect(consoleWarn).toHaveBeenCalledWith('[Hazlo/Vercel] Missing or invalid capturedAt; using server timestamp fallback', {
      clientEntryId: 'entry-test',
      capturedAtProvided: true,
    });

    const warningText = JSON.stringify(consoleWarn.mock.calls);
    expect(warningText).not.toContain('Pay the card balance');
    expect(warningText).not.toContain('test-secret');

    vi.useRealTimers();
  });

  it('logs safe Notion diagnostics while returning a generic browser error', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue(JSON.stringify({
        code: 'validation_error',
        message: 'Parent database could not be found.',
      })),
    });
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = createResponse();
    await handler(createPostRequest(), res);

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.payload)).toEqual({ error: 'notion_sync_failed' });
    expect(consoleError).toHaveBeenCalledWith('[Hazlo/Vercel] notion-sync failed', {
      clientEntryId: 'entry-test',
      notionStatus: 400,
      notionErrorCode: 'validation_error',
      notionErrorMessage: 'Parent database could not be found.',
    });

    const logText = JSON.stringify(consoleError.mock.calls);
    expect(logText).not.toContain('test-notion-token');
    expect(logText).not.toContain('test-secret');
    expect(logText).not.toContain('test-data-source-id');
    expect(res.payload).not.toContain('Parent database could not be found.');
  });
});
