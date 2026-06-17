const NOTION_API_VERSION = '2022-06-28';

// Notion rich-text blocks accept up to 2000 characters each.
const NOTION_TEXT_LIMIT = 2000;
const MAX_TASK_BLOCKS = 80;
const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'https://hazlo-ai.vercel.app',
]);
const ALLOWED_METHODS = 'POST, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, X-API-Secret, X-Idempotency-Key';

function mapStatus(status) {
  if (status === 'In progress' || status === 'Done') return status;
  return 'Not started';
}

/**
 * Build a title string for the Notion "title" property.
 * - If text fits within the Notion limit, use it as-is.
 * - If it exceeds the limit, truncate for the title only;
 *   the full text will be stored in the page body instead.
 */
function buildTitle(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= NOTION_TEXT_LIMIT) return trimmed;
  return trimmed.slice(0, NOTION_TEXT_LIMIT - 3) + '...';
}

/**
 * Split long text into chunks of up to `NOTION_TEXT_LIMIT` characters
 * for use in Notion rich-text arrays (paragraph blocks).
 */
function splitIntoChunks(text) {
  const chunks = [];
  for (let i = 0; i < text.length; i += NOTION_TEXT_LIMIT) {
    chunks.push(text.slice(i, i + NOTION_TEXT_LIMIT));
  }
  return chunks;
}

function json(res, code, payload) {
  res.status(code).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const origin = getHeaderValue(req.headers.origin);
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
}

function getHeaderValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function parseBody(body) {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch (_) {
      return null;
    }
  }

  if (body && typeof body === 'object') {
    return body;
  }

  return null;
}

function validateTasks(input) {
  if (input === undefined) return { ok: true, tasks: [] };
  if (!Array.isArray(input)) return { ok: false, tasks: [] };

  const tasks = [];
  for (const task of input) {
    if (!task || typeof task !== 'object') {
      return { ok: false, tasks: [] };
    }

    const text = typeof task.text === 'string' ? task.text.trim() : '';
    if (!text) {
      return { ok: false, tasks: [] };
    }

    if (
      task.completed !== undefined &&
      typeof task.completed !== 'boolean'
    ) {
      return { ok: false, tasks: [] };
    }

    tasks.push({
      text: text.slice(0, NOTION_TEXT_LIMIT),
      completed: task.completed === true,
    });
  }

  return { ok: true, tasks };
}

function buildTranscriptBlock(rawSpeech) {
  return {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: splitIntoChunks(rawSpeech).map(chunk => ({
        type: 'text',
        text: { content: chunk },
      })),
    },
  };
}

function buildTaskBlocks(tasks) {
  return tasks.slice(0, MAX_TASK_BLOCKS).map(task => ({
    object: 'block',
    type: 'to_do',
    to_do: {
      rich_text: [{ type: 'text', text: { content: task.text } }],
      checked: task.completed,
    },
  }));
}

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'method_not_allowed' });
  }

  const notionToken = process.env.NOTION_TOKEN || '';
  const notionDatabaseId = process.env.NOTION_DATABASE_ID || '';
  const apiSecret = process.env.API_SECRET || '';

  const clientSecret = getHeaderValue(req.headers['x-api-secret']);

  if (!apiSecret || clientSecret !== apiSecret) {
    console.error('[Hazlo/Vercel] Unauthorized sync attempt');
    return json(res, 401, { error: 'unauthorized' });
  }

  if (!notionToken || !notionDatabaseId) {
    console.error('[Hazlo/Vercel] Missing NOTION_TOKEN or NOTION_DATABASE_ID');
    return json(res, 500, { error: 'server_not_configured' });
  }

  const body = parseBody(req.body);
  if (!body) {
    return json(res, 400, { error: 'invalid_json' });
  }

  const rawSpeech = typeof body.rawSpeech === 'string' ? body.rawSpeech.trim() : '';
  const status = mapStatus(body.status);
  const clientEntryId = typeof body.clientEntryId === 'string' ? body.clientEntryId : 'none';
  const taskValidation = validateTasks(body.tasks);

  if (!rawSpeech) {
    return json(res, 400, { error: 'rawSpeech_required' });
  }

  if (!taskValidation.ok) {
    return json(res, 400, { error: 'invalid_tasks' });
  }

  const title = buildTitle(rawSpeech);
  const tasks = taskValidation.tasks;

  // Build the page creation payload
  const pagePayload = {
    parent: {
      type: 'data_source_id',
      data_source_id: notionDatabaseId,
    },
    properties: {
      'Raw Speech': {
        title: [{ text: { content: title } }],
      },
      Status: {
        status: { name: status },
      },
    },
  };

  pagePayload.children = [
    buildTranscriptBlock(rawSpeech),
    ...buildTaskBlocks(tasks),
  ];

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_API_VERSION,
      },
      body: JSON.stringify(pagePayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Hazlo/Vercel] notion-sync failed', {
        clientEntryId,
        statusCode: response.status,
        errorHint: errorBody.slice(0, 200), // log safely without leaking full raw details to client
      });
      return json(res, 502, { error: 'notion_sync_failed' });
    }

    const notionPage = await response.json();
    console.log('[Hazlo/Vercel] notion-sync success', {
      clientEntryId,
      pageId: notionPage?.id,
      textLength: rawSpeech.length,
    });
    return json(res, 200, { ok: true, pageId: notionPage?.id ?? null });
  } catch (error) {
    console.error('[Hazlo/Vercel] notion-sync exception', {
      clientEntryId,
      error: error instanceof Error ? error.message : String(error),
    });
    return json(res, 502, { error: 'notion_sync_failed' });
  }
}
