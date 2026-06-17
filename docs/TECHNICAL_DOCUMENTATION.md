# Hazlo Technical Documentation

## 1. Project Overview

Hazlo is a voice-first productivity app for capturing tasks from spoken thoughts. It lets a user speak a note, daily plan, or task dump into the browser, turns that speech into text with the browser's native speech-recognition support, extracts likely tasks with local rule-based logic, stores the entry in the browser, and syncs the transcript plus extracted tasks into a connected Notion database.

Hazlo is designed as a personal, self-hosted, open-source productivity tool. The current implementation favors a small, understandable system over a large SaaS architecture: React renders the UI, Zustand owns local state and persistence, a Vercel Serverless Function protects the Notion token, and Notion becomes the long-term productivity workspace.

Hazlo is useful for:

- Developers who want fast task capture while coding.
- Students who think through work out loud.
- Builders, makers, and freelancers who need low-friction capture.
- People who use Notion as their productivity system.
- People who think faster than they write.
- Anyone who wants a forkable voice-to-Notion workflow.

Hazlo is not currently:

- A full SaaS product.
- A multi-user workspace app.
- An AI agent.
- A replacement for full task managers.
- A full authentication-based production SaaS.
- A custom speech-to-text backend.

## 2. Why Hazlo Exists

People often remember tasks while walking, thinking, working, speaking after a meeting, or switching between projects. Most task systems require opening an app, choosing a workspace or database, typing a title, adding properties, and organizing the result manually. That friction is enough for small but important tasks to disappear.

Hazlo reduces capture friction by making the first step voice-first. The goal is to move quickly from thought to spoken note to structured Notion entry:

```text
thought -> spoken note -> transcript -> local entry -> Notion page with tasks
```

Example:

```text
I need to finish the landing page, send the update to Rahul, and review the Vercel deployment.
```

Hazlo stores the full transcript as the source of truth. Its current rule-based extractor can identify some obvious task patterns, especially command-like phrases, numbered lists, bullet lists, and simple "and" separated actions. It does not fully understand every natural sentence yet, so it may preserve wording such as "I need to..." instead of rewriting it into a polished task title. That is intentional for the current implementation: capture first, keep the raw thought, and extract helpful structure when the pattern is clear.

## 3. Core Capabilities

### Voice Capture

The user taps the microphone button in `src/components/VoiceInput.tsx`. The component creates a browser `SpeechRecognition` or `webkitSpeechRecognition` instance when the API is available. The recognition engine runs with:

- `continuous = true`
- `interimResults = true`
- `lang = 'en-US'`

As the browser emits results, Hazlo reconstructs a live transcript from final and interim speech segments and displays it above the microphone button.

### Entry Creation

When recording stops, `VoiceInput` reads the latest transcript from the Zustand store. If the transcript is non-empty, it calls `addEntry(rawText)` in `src/store/useStore.ts`. The store trims the text, extracts tasks, creates a local `Entry`, marks it as `pending`, saves it immediately, and starts background Notion sync.

### Task Extraction

`src/utils/taskExtractor.ts` extracts tasks locally with deterministic pattern matching. It looks for numbered lists, bullet lists, simple "and" separated actions, and short imperative phrases. It does not call an AI model or external parsing service.

### Local Persistence

The Zustand store uses the `persist` middleware with the storage key `hazlo-storage`. Only `entries` and `lastRolloverDate` are persisted. Voice UI state such as `isRecording`, `currentTranscript`, and `error` is runtime-only.

### Notion Sync

`src/services/notion.ts` sends entries to `/api/notion-sync`. The backend route in `api/notion-sync.js` validates the API secret, validates the request body, reads server-side Notion credentials, creates a Notion page, and appends the transcript plus extracted tasks as page children.

### Sync Status

Each local entry can move through these sync states:

| State | UI Label | Meaning |
| --- | --- | --- |
| `pending` | Syncing | The entry is saved locally and a Notion sync attempt is in progress. |
| `synced` | Synced | The backend accepted the entry and Notion page creation succeeded. |
| `failed` | Sync failed | The entry remains local, but Notion sync failed or returned an unsafe response. |

### Retry

`EntryCard` shows a retry button only when `entry.syncStatus === 'failed'`. Clicking it calls `retrySyncEntry(entry.id)`, which changes the entry back to `pending`, clears `syncError`, and sends the same entry through the Notion sync client again.

### Open-Source Self-Hosting

Hazlo is intended to be forked and deployed by the person using it. A user can connect their own Vercel project, Notion integration, and Notion database. The public repository and live demo show the app, but each self-hosted user should provide their own secrets and send data to their own Notion workspace.

## 4. Tech Stack

| Layer | Technology | Purpose | Why it is used |
| --- | --- | --- | --- |
| Frontend UI | React 18 | Builds the interactive app UI. | React provides component-based rendering for the voice input, entry list, entry cards, and task controls. |
| Build tool | Vite 7 | Runs local development and creates production bundles. | Vite gives fast startup, simple React integration, and optimized static builds for Vercel. |
| Language | TypeScript | Adds type checking for frontend code. | The app has explicit `Entry`, `Task`, and `SyncStatus` types, reducing mistakes in state and service calls. |
| Styling | Tailwind CSS | Provides utility-first styling. | The UI is compact and component-driven, which maps well to Tailwind classes. |
| State | Zustand | Owns global app state and actions. | Zustand is lightweight and includes persistence middleware without requiring a large state framework. |
| Voice capture | Browser Web Speech API | Converts microphone speech into text. | Hazlo can capture voice without running a custom speech-recognition backend. |
| Backend | Vercel Serverless Functions | Hosts `/api/notion-sync`. | Serverless functions keep the Notion token out of the browser while fitting the Vite/Vercel deployment model. |
| External API | Notion API | Creates pages and task blocks in Notion. | Notion is the long-term workspace where users can organize captured tasks. |
| Tests | Vitest | Runs unit tests. | Vitest integrates naturally with Vite and is used for task extraction and Notion client tests. |
| Package manager | pnpm | Installs dependencies and runs scripts. | pnpm provides lockfile-based installs and efficient dependency storage. |

## 5. System Architecture

```text
User
  |
  | speaks
  v
Browser Web Speech API
  |
  | transcript
  v
React UI Components
  |
  | create entry
  v
Zustand Store
  |
  | persist selected state
  v
localStorage
  |
  | sync request
  v
src/services/notion.ts
  |
  | POST /api/notion-sync
  v
Vercel Serverless Function
  |
  | validate secret and payload
  v
Notion API
  |
  | create page
  v
Notion Database
```

Step-by-step responsibilities:

| Step | Input | Responsibility | Output | File or component |
| --- | --- | --- | --- | --- |
| User speaks | Microphone audio | User starts and stops recording. | Browser speech events. | `VoiceInput.tsx` |
| Browser Web Speech API | Audio | Converts speech to interim and final transcript text. | Transcript string. | Browser API used by `VoiceInput.tsx` |
| React UI | Transcript | Displays live transcript and recording state. | User-visible draft. | `VoiceInput.tsx` |
| Zustand store | Final transcript | Creates an entry, extracts tasks, persists locally, starts sync. | Local `Entry` with `pending` status. | `src/store/useStore.ts` |
| localStorage | Persisted state slice | Keeps entries available after reload. | `hazlo-storage` persisted data. | Zustand `persist` middleware |
| Notion service | `Entry` | Builds a safe sync payload and sends it to the backend. | HTTP request to `/api/notion-sync`. | `src/services/notion.ts` |
| Serverless backend | JSON body and headers | Validates method, secret, env vars, raw speech, and tasks. | Notion page creation request. | `api/notion-sync.js` |
| Notion API | Page payload | Creates the page in the configured database. | Notion page ID on success. | Notion API |
| UI status update | Sync result | Updates `syncStatus`, `syncedAt`, and `syncError`. | Synced or failed local entry. | `src/store/useStore.ts` |

## 6. Runtime Data Flow

### Step 1: User starts recording

The user taps the fixed microphone button rendered by `VoiceInput`. The component checks for `window.SpeechRecognition` or `window.webkitSpeechRecognition`. If neither exists, it sets `isSpeechSupported` to `false` and shows "Voice input is not supported in this browser."

### Step 2: Browser produces transcript

The recognition object emits `onresult` events containing speech results. `VoiceInput` separates final results from interim results, combines them with any previously accumulated session text, trims the display text, and calls `setTranscript(display)` in the store.

### Step 3: App creates an entry

When the user stops recording, the recognition `onend` handler calls `saveTranscript()`. That function reads `currentTranscript` from `useHazloStore.getState()`. If the transcript has text, it calls `addEntry(text)`.

An entry contains:

| Field | Purpose |
| --- | --- |
| `id` | Local random identifier generated with `Math.random().toString(36).substring(2, 11)`. |
| `rawText` | Full trimmed transcript. |
| `tasks` | Extracted local tasks. |
| `syncStatus` | Starts as `pending`. |
| `syncError` | Cleared on creation. |
| `date` | Local date in `YYYY-MM-DD`. |
| `time` | Local time in `HH:mm`. |
| `createdAt` | ISO timestamp. |
| `updatedAt` | ISO timestamp. |
| `syncedAt` | Added only after successful sync. |

### Step 4: Task extractor runs

`addEntry` calls `extractTasks(rawText)`. The extractor returns an array of `Task` objects. Each task contains `id`, `text`, `completed: false`, and `createdAt`.

### Step 5: Entry is saved locally

The store immediately prepends the new entry to `entries`, clears `currentTranscript`, and clears `error`. Zustand persistence writes the selected state slice to browser localStorage under `hazlo-storage`.

### Step 6: Frontend sends sync request

After local save, the store calls `applySyncResult(newEntry)` without blocking the UI. That function calls `saveToNotion(entry)` from `src/services/notion.ts`.

The service sends:

- `POST` to `${VITE_API_BASE_URL || ''}/api/notion-sync`
- `Content-Type: application/json`
- `X-Idempotency-Key: entry.id`
- `X-API-Secret: import.meta.env.VITE_API_SECRET || ''`

### Step 7: Backend validates request

`api/notion-sync.js` handles `OPTIONS` and `POST`. For `POST`, it validates:

- `X-API-Secret` matches server-side `API_SECRET`.
- `NOTION_TOKEN` and `NOTION_DATABASE_ID` exist.
- The body is valid JSON or an object.
- `rawSpeech` is a non-empty string after trimming.
- `tasks`, if present, is an array of objects with non-empty `text` and optional boolean `completed`.

### Step 8: Backend creates Notion page

The backend builds a Notion page payload using:

- parent type `data_source_id`
- `data_source_id: NOTION_DATABASE_ID`
- `Raw Speech` title property from the transcript
- `Status` status property mapped to `Not started`, `In progress`, or `Done`
- one paragraph child block for the full transcript
- up to 80 `to_do` child blocks from extracted tasks

Long transcript text is split into rich-text chunks of up to 2000 characters. Task text is trimmed and sliced to 2000 characters.

### Step 9: UI updates sync status

If `saveToNotion` returns `{ ok: true }`, the store marks the entry as `synced`, sets `syncedAt`, clears `syncError`, and updates `updatedAt`.

If it returns `{ ok: false, error }`, the store marks the entry as `failed`, saves a safe error message in `syncError`, and updates `updatedAt`.

### Step 10: User can retry failed sync

When an entry is failed, `EntryCard` displays a `Retry` button. The retry action only runs for failed entries. It creates a retry copy with `syncStatus: 'pending'`, clears `syncError`, updates `updatedAt`, and calls the same `applySyncResult` path.

## 7. Folder Structure

```text
hazlo/
|-- api/
|   `-- notion-sync.js
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- PRODUCTION_CHECKLIST.md
|   `-- TECHNICAL_DOCUMENTATION.md
|-- src/
|   |-- components/
|   |   |-- EntryCard.tsx
|   |   |-- EntryList.tsx
|   |   |-- Header.tsx
|   |   |-- TaskItem.tsx
|   |   `-- VoiceInput.tsx
|   |-- pages/
|   |   `-- Home.tsx
|   |-- services/
|   |   |-- notion.test.ts
|   |   `-- notion.ts
|   |-- store/
|   |   `-- useStore.ts
|   |-- types/
|   |   `-- index.ts
|   |-- utils/
|   |   |-- dateUtils.ts
|   |   |-- taskExtractor.test.ts
|   |   `-- taskExtractor.ts
|   |-- App.tsx
|   |-- index.css
|   |-- main.tsx
|   `-- vite-env.d.ts
|-- .env.example
|-- .gitignore
|-- index.html
|-- package.json
|-- pnpm-lock.yaml
|-- tsconfig.json
|-- vercel.json
|-- vite.config.ts
`-- README.md
```

Important files:

| File or folder | Purpose |
| --- | --- |
| `api/notion-sync.js` | Vercel Serverless Function that writes entries to Notion. |
| `docs/ARCHITECTURE.md` | Short architecture overview. |
| `docs/PRODUCTION_CHECKLIST.md` | Deployment and verification checklist. |
| `docs/TECHNICAL_DOCUMENTATION.md` | Deep technical documentation for developers and self-hosters. |
| `src/main.tsx` | React entry point that mounts `<App />`. |
| `src/App.tsx` | Renders the `Home` page. |
| `src/pages/Home.tsx` | Composes header, grouped entries, pending task banner, and voice input. |
| `src/components/VoiceInput.tsx` | Manages browser speech recognition and transcript capture. |
| `src/components/EntryList.tsx` | Renders entries grouped by date. |
| `src/components/EntryCard.tsx` | Displays one entry, sync status, retry, delete, and tasks. |
| `src/components/TaskItem.tsx` | Displays and updates one local task. |
| `src/store/useStore.ts` | Global state, persistence, entry creation, retry, task updates, and rollover. |
| `src/services/notion.ts` | Frontend sync client for `/api/notion-sync`. |
| `src/utils/taskExtractor.ts` | Rule-based task extraction. |
| `src/utils/dateUtils.ts` | Date formatting, grouping, and rollover helpers. |
| `src/types/index.ts` | Shared `Task`, `Entry`, `EntryGroup`, and `SyncStatus` types. |
| `.env.example` | Placeholder environment variable template. |
| `vercel.json` | Vercel framework setting and SPA rewrites for non-API routes. |
| `vite.config.ts` | Vite React setup and dev server port `5173`. |

## 8. Frontend Architecture

The frontend is a small React app with one main page and a handful of focused components.

| Component | What it does | Data it receives | Actions it triggers |
| --- | --- | --- | --- |
| `main.tsx` | Mounts the React app into `#root`. | None. | Renders `<App />` inside `StrictMode`. |
| `App.tsx` | App-level component. | None. | Renders `Home`. |
| `Home.tsx` | Main screen. | Reads `entries` from Zustand. | Calls `performMidnightRollover()` on mount. |
| `Header.tsx` | Sticky app header. | None. | No state actions. |
| `VoiceInput.tsx` | Voice recording and transcript UI. | Reads recording, processing, transcript, and error state. | Starts/stops speech recognition, updates transcript, adds entries. |
| `EntryList.tsx` | Grouped list renderer. | `EntryGroup[]`. | No store actions directly. |
| `EntryCard.tsx` | Entry display and sync controls. | One `Entry`. | Deletes entry or retries failed sync. |
| `TaskItem.tsx` | Task row with checkbox and delete control. | One `Task` and parent entry ID. | Toggles completion or deletes task locally. |

`Home` groups entries with `groupEntriesByDate(entries)`. It also derives a count of incomplete tasks and displays a pending task banner when any task is incomplete. The voice input is fixed at the bottom of the page, so capture stays available while the user scrolls entries.

Sync status UI is handled in `EntryCard`:

- `pending` displays as `Syncing`.
- `synced` displays as `Synced`.
- `failed` displays as `Sync failed`.
- The retry button appears only for `failed` entries.
- A failed entry's `syncError` is placed in the status badge title.

Task updates are local. Toggling or deleting a task updates the persisted browser state but does not currently trigger a new Notion update for an already-created page.

## 9. Voice Input Implementation

Voice capture lives in `src/components/VoiceInput.tsx`. It uses browser-native speech recognition:

```ts
window.SpeechRecognition || window.webkitSpeechRecognition
```

When the user starts recording, Hazlo:

1. Creates a new recognition instance.
2. Enables continuous mode.
3. Enables interim results.
4. Sets language to `en-US`.
5. Clears the previous transcript.
6. Attaches `onresult`, `onerror`, `onstart`, and `onend` handlers.
7. Calls `recognition.start()`.

The `onresult` handler loops through `event.results`, separates final and interim text, combines it with accumulated text from previous automatic recognition sessions, and writes the display transcript into Zustand.

The `onend` handler has two paths:

- If recording is still supposed to be active, Hazlo attempts to restart recognition and preserve accumulated text.
- If the user stopped recording, Hazlo saves the current transcript as an entry.

Unsupported browser behavior:

- If `SpeechRecognition` and `webkitSpeechRecognition` are missing, the microphone button is disabled.
- The UI shows "Voice input is not supported in this browser."

Error handling:

| Browser error | User-facing message |
| --- | --- |
| `no-speech` | Ignored. |
| `aborted` | Ignored. |
| `audio-capture` | "No microphone found. Check your device settings." |
| `not-allowed` | "Microphone access denied. Please allow microphone access." |
| `network` | "Network error. Please check your connection." |
| Other | `Speech error: <error>` |

Limitations:

- Browser compatibility varies.
- Microphone permission is required.
- Transcription quality depends on the browser, microphone, environment, accent, and noise level.
- This is browser-native speech recognition, not a custom AI transcription model.
- Hazlo avoids running its own speech backend, which keeps hosting simpler but leaves transcription behavior to the browser.

## 10. State Management with Zustand

Hazlo uses Zustand because the app needs lightweight shared state without a large framework. The store in `src/store/useStore.ts` owns entries, voice state, task actions, sync actions, and date rollover.

Key state fields:

| Field | Persisted | Purpose |
| --- | --- | --- |
| `entries` | Yes | Local entries, tasks, sync statuses, and timestamps. |
| `lastRolloverDate` | Yes | Tracks whether rollover has already happened for the current day. |
| `isRecording` | No | Runtime recording state for the microphone UI. |
| `isProcessing` | No | Runtime processing flag. It is present in state and used to disable the mic button, but current entry creation does not set it. |
| `currentTranscript` | No | Live transcript draft while recording. |
| `error` | No | Runtime voice or app error shown near the mic button. |

Persisted storage:

```ts
name: 'hazlo-storage'
partialize: state => ({
  entries: state.entries,
  lastRolloverDate: state.lastRolloverDate,
})
```

Entry creation flow:

1. `addEntry(rawText)` rejects empty or non-string input.
2. It creates timestamps with `new Date()`.
3. It calls `extractTasks(rawText)`.
4. It creates an `Entry` with `syncStatus: 'pending'`.
5. It prepends the entry to `entries`.
6. It clears `currentTranscript` and `error`.
7. It starts background sync with `applySyncResult(newEntry)`.

Sync result flow:

| Result | Store update |
| --- | --- |
| Success | `syncStatus: 'synced'`, `syncedAt: now`, `syncError: undefined`, `updatedAt: now`. |
| Failure | `syncStatus: 'failed'`, `syncError: safe message`, `updatedAt: now`. |

Retry flow:

1. `retrySyncEntry(entryId)` finds the entry.
2. It exits unless the current status is `failed`.
3. It marks the entry `pending`.
4. It clears `syncError`.
5. It calls the same background sync function.

Local persistence matters because entries remain in the browser even when Notion sync fails. This gives the user a chance to retry instead of losing the captured thought.

The store also includes a midnight rollover helper. On mount, `Home` calls `performMidnightRollover()`. If the stored rollover date is not today, incomplete tasks from yesterday are copied into new entries for today. This is local-only behavior and does not currently sync those rollover copies to Notion.

## 11. Task Extraction Logic

`src/utils/taskExtractor.ts` is rule-based. It does not use AI, embeddings, LLMs, or an external service. It receives a raw string and returns an array of `Task` objects.

Supported patterns:

| Pattern | Example input | Extracted task text |
| --- | --- | --- |
| Numbered list | `1. Call mom` | `Call mom` |
| Numbered list with parenthesis | `1) Send the report` | `Send the report` |
| Bullet list | `- Buy milk` | `Buy milk` |
| Star bullet | `* Book dentist` | `Book dentist` |
| Simple "and" split | `Call Ana and email Sam` | `Call Ana`, `email Sam` |
| Short imperative | `Finish budget review` | `Finish budget review` |

Example:

```text
Input:
Finish the landing page and send an update to Rahul.

Possible extracted tasks:
- Finish the landing page
- send an update to Rahul
```

The extractor uses these main steps:

1. Trim the input.
2. Extract numbered tasks with a multiline regular expression.
3. Extract bullet tasks with a multiline regular expression.
4. Split text into sentences and look for a simple `X and Y` pattern.
5. If no explicit tasks were found, test whether the whole text looks like a short imperative task.
6. Return tasks whose text is longer than 2 characters and shorter than 200 characters.

Empty input:

- Returns an empty array.

Noisy input:

- Returns an empty array when no clear task pattern is found.
- Example from tests: `I had a vague thought about the weekend and the weather.` returns no tasks.

Current limitations:

- The extractor does not understand meaning.
- It does not rewrite natural phrasing into polished task titles.
- It may keep leading phrases such as "I need to" if the pattern matches that way.
- It only splits simple "and" structures, not complex comma-separated lists.
- It does not infer due dates, priorities, assignees, projects, or tags.
- It filters out tasks of 200 characters or more.

Rule-based extraction is used because it is local, fast, free to run, testable, and does not require sending the transcript to an AI provider. Future AI-based extraction could improve natural-language understanding, normalize task wording, detect dates, infer priorities, support multiple languages, and produce richer Notion properties.

## 12. Notion Sync Client

The frontend sync client lives in `src/services/notion.ts`. Its main exported function is:

```ts
saveToNotion(entry: Entry): Promise<NotionSyncResult>
```

It builds a top-level payload from the local entry:

```json
{
  "rawSpeech": "Today I need to finish the docs and deploy the app.",
  "status": "Not started",
  "clientEntryId": "entry-123",
  "tasks": [
    { "text": "finish the docs", "completed": false },
    { "text": "deploy the app", "completed": false }
  ]
}
```

Sample request:

```text
POST /api/notion-sync
Headers:
  Content-Type: application/json
  X-Idempotency-Key: entry-123
  X-API-Secret: your_matching_frontend_secret

Body:
{
  "rawSpeech": "Today I need to finish the docs and deploy the app.",
  "status": "Not started",
  "clientEntryId": "entry-123",
  "tasks": [
    { "text": "finish the docs", "completed": false },
    { "text": "deploy the app", "completed": false }
  ]
}
```

Important behavior:

- `VITE_API_BASE_URL` is optional. If empty, the endpoint is `/api/notion-sync`.
- `VITE_API_SECRET` is attached as `X-API-Secret`.
- `X-Idempotency-Key` is set to the local entry ID.
- Empty `rawSpeech` is rejected client-side without calling the API.
- Fetch network failures are retried twice after 400 ms and 1200 ms.
- HTTP `408`, `429`, and `5xx` responses are retried.
- `401` returns a safe authorization message.
- `429` returns a safe rate-limit message.
- `5xx` returns a safe temporary failure message.
- Other non-OK responses return a generic retry message.

The frontend does not call the Notion API directly because the Notion token must remain server-side. Calling Notion from the browser would expose the integration token to anyone who can inspect the frontend bundle or network requests.

The file also exports `testNotionConnection()`, which posts a small connectivity-check body to the same endpoint. It is not currently wired into the visible UI.

## 13. Backend API Route

The backend route is `api/notion-sync.js`, deployed by Vercel as:

```text
/api/notion-sync
```

It exists so Hazlo can write to Notion without exposing `NOTION_TOKEN` to the browser.

| Concern | Implementation |
| --- | --- |
| Secret protection | `X-API-Secret` checked against `API_SECRET`. |
| Notion auth | `NOTION_TOKEN` used server-side in the `Authorization` header. |
| Database target | `NOTION_DATABASE_ID` used as the Notion `data_source_id`. |
| Tasks | Converted into Notion `to_do` blocks. |
| Errors | Returned safely without exposing Notion token or raw Notion responses to the client. |

Supported methods:

| Method | Behavior |
| --- | --- |
| `OPTIONS` | Returns `204` for CORS preflight. |
| `POST` | Validates and syncs an entry. |
| Other | Returns `405` with `{ "error": "method_not_allowed" }`. |

CORS behavior:

- Allowed origins are currently `http://localhost:5173` and `https://hazlo-ai.vercel.app`.
- Allowed methods are `POST, OPTIONS`.
- Allowed headers are `Content-Type, X-API-Secret, X-Idempotency-Key`.
- Same-origin production requests do not need cross-origin CORS access.
- If a separate frontend origin calls this backend, that origin must be allowed by the backend code or hosted same-origin.

Validation behavior:

| Validation | Failure response |
| --- | --- |
| Missing or mismatched API secret | `401 { "error": "unauthorized" }` |
| Missing Notion env vars | `500 { "error": "server_not_configured" }` |
| Invalid JSON/body | `400 { "error": "invalid_json" }` |
| Empty `rawSpeech` | `400 { "error": "rawSpeech_required" }` |
| Invalid `tasks` shape | `400 { "error": "invalid_tasks" }` |
| Notion API non-OK response | `502 { "error": "notion_sync_failed" }` |
| Fetch exception | `502 { "error": "notion_sync_failed" }` |

Notion page creation:

```js
{
  parent: {
    type: 'data_source_id',
    data_source_id: notionDatabaseId
  },
  properties: {
    'Raw Speech': {
      title: [{ text: { content: title } }]
    },
    Status: {
      status: { name: status }
    }
  },
  children: [
    transcriptParagraphBlock,
    ...taskToDoBlocks
  ]
}
```

Transcript block:

- One paragraph block is created.
- Its `rich_text` array contains chunks of the transcript.
- Each chunk is capped at 2000 characters.

Task blocks:

- Each task becomes a Notion `to_do` block.
- `checked` is set from `task.completed`.
- Only the first 80 tasks are included.
- Task text is capped at 2000 characters.

Status mapping:

- `In progress` stays `In progress`.
- `Done` stays `Done`.
- Any other value maps to `Not started`.

Logging:

- Unauthorized attempts are logged without secrets.
- Notion failures log the client entry ID, status code, and a short error hint.
- Successful sync logs the client entry ID, page ID, and transcript length.

## 14. Notion Database Model

Hazlo maps each local entry to one Notion page in the configured database.

Database requirements:

| Notion field | Required type | How Hazlo uses it |
| --- | --- | --- |
| `Raw Speech` | Title | Stores the transcript title, truncated to Notion's 2000-character rich-text limit if needed. |
| `Status` | Status | Stores `Not started`, `In progress`, or `Done`. The frontend currently sends `Not started`. |

Page body:

- The full transcript is added as a paragraph child block.
- Extracted tasks are appended as `to_do` child blocks.
- Completed local tasks sync with `checked: true`; new extracted tasks start as `false`.

Hazlo does not currently create or update Notion properties for due dates, priority, tags, project, client, source URL, or assignee. Those would require additional Notion database properties and code changes.

### Required Notion Setup

1. Create a Notion integration from the Notion integrations page.
2. Copy the integration token.
3. Create or choose a Notion database.
4. Add a `Raw Speech` title property if it does not already exist.
5. Add a `Status` status property with values such as `Not started`, `In progress`, and `Done`.
6. Share the database with the integration.
7. Copy the database ID.
8. Add the token, database ID, and API secret values to Vercel environment variables.
9. Redeploy after setting or changing frontend `VITE_` variables.

## 15. Environment Variables

| Variable | Used By | Required In | Purpose | Safe to commit? |
| --- | --- | --- | --- | --- |
| `NOTION_TOKEN` | `api/notion-sync.js` | Vercel/server runtime | Authenticates the serverless function to Notion. | No |
| `NOTION_DATABASE_ID` | `api/notion-sync.js` | Vercel/server runtime | Tells the backend which Notion database/data source to create pages in. | No for real values |
| `API_SECRET` | `api/notion-sync.js` | Vercel/server runtime | Server-side expected shared secret for sync requests. | No |
| `VITE_API_SECRET` | `src/services/notion.ts` | Frontend build/runtime | Sent from frontend as `X-API-Secret`; must match `API_SECRET`. | No for real values |
| `VITE_API_BASE_URL` | `src/services/notion.ts` | Frontend build/runtime | Optional base URL for calling a separate backend. Empty means same-origin `/api/notion-sync`. | Only placeholder/empty values |

Details:

- `NOTION_TOKEN` must stay server-side. Never expose it in frontend code.
- `NOTION_DATABASE_ID` identifies where Notion pages are created.
- `API_SECRET` protects the backend endpoint from requests that do not know the shared secret.
- `VITE_API_SECRET` is included in the frontend build and must match `API_SECRET`.
- Because `VITE_API_SECRET` is visible to browser users, it is not strong user authentication.
- `VITE_API_BASE_URL` is mainly useful when a local Vite frontend needs to call a separately deployed backend.
- In same-origin Vercel production deployments, `VITE_API_BASE_URL` should usually be omitted or empty.
- `.env.example` is a template with placeholders only.

Never commit:

- `.env`
- `.env.local`
- Notion tokens
- API secrets
- Vercel tokens
- Real database IDs
- Any copied production credentials

## 16. Security Model

Hazlo's current security model is intentionally lightweight and suited to personal or self-hosted deployments.

What it protects:

- The Notion integration token stays in server-side environment variables.
- The browser sends sync requests to Hazlo's backend, not directly to Notion.
- The backend checks `X-API-Secret` against `API_SECRET`.
- The backend returns safe error codes instead of exposing full Notion responses to the frontend.
- `.gitignore` excludes common local env files.

What it does not provide:

- Full user authentication.
- Per-user authorization.
- Multi-tenant isolation.
- Strong protection against a determined attacker who can inspect the frontend bundle.
- A complete SaaS-grade abuse prevention system.

Important caveat:

`VITE_API_SECRET` is compiled into the frontend and sent from the browser. It can protect against casual or accidental requests, but it should not be treated as a private credential once the app is public. For a public multi-user SaaS, Hazlo would need real authentication, server-side sessions or tokens, per-user Notion connections, and stronger authorization checks.

CORS is useful for browser request control, but it is not a complete security boundary. Non-browser clients can still send HTTP requests. The API secret check is the actual gate in this implementation, and it is lightweight.

## 17. Local Development Guide

1. Fork or clone the repository.

```bash
git clone https://github.com/YellankiKaushik/Hazlo-OpenSource.git
cd Hazlo-OpenSource
```

2. Install dependencies.

```bash
pnpm install --frozen-lockfile
```

3. Create a Notion integration.

- Go to the Notion integrations page.
- Create an internal integration.
- Copy the integration token for local/server configuration.

4. Create and share a Notion database.

- Create a database with `Raw Speech` and `Status` properties.
- Share the database with the integration.
- Copy the database ID.

5. Create `.env.local` from the template.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

6. Add local placeholder-shaped values with your real private values in `.env.local`.

```env
NOTION_TOKEN=your_notion_token_here
NOTION_DATABASE_ID=your_notion_database_id_here
API_SECRET=your_random_api_secret_here
VITE_API_SECRET=your_same_random_api_secret_here
VITE_API_BASE_URL=
```

7. Run the frontend.

```bash
pnpm dev
```

Local backend options:

- For frontend-only work, `pnpm dev` runs Vite on port `5173`.
- Vite alone does not run Vercel serverless functions.
- For full local API testing, use Vercel's local runtime.

```bash
vercel link
vercel env pull .env --environment=development
vercel dev
```

If using only the Vite dev server while calling a deployed backend, set `VITE_API_BASE_URL` to the deployed backend origin intentionally. Remove it or leave it empty for same-origin production on Vercel.

## 18. Vercel Deployment Guide

1. Import the GitHub repository into Vercel.
2. Select the Vite framework preset if Vercel does not auto-detect it.
3. Use the install command:

```bash
pnpm install --frozen-lockfile
```

4. Use the build command:

```bash
pnpm build
```

5. Use the output directory:

```text
dist
```

6. Add environment variables in Vercel Project Settings:

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`
- `API_SECRET`
- `VITE_API_SECRET`
- `VITE_API_BASE_URL` only if needed

7. Deploy.
8. Redeploy after changing environment variables.
9. Test the full voice-to-Notion flow:

- Open the deployed app.
- Allow microphone access.
- Record a short task.
- Confirm the entry appears locally.
- Confirm the sync badge changes from `Syncing` to `Synced`.
- Confirm a Notion page appears in the target database.
- Confirm extracted tasks appear as `to_do` blocks when extraction found tasks.

Important Vercel note:

Vite injects `VITE_` variables at build time. After changing `VITE_API_SECRET` or `VITE_API_BASE_URL`, redeploy the app so the frontend bundle receives the new values.

If Notion sync fails, check:

- The database is shared with the Notion integration.
- `NOTION_TOKEN` is correct.
- `NOTION_DATABASE_ID` is the correct database/data source ID.
- `API_SECRET` and `VITE_API_SECRET` match.
- The Notion database contains `Raw Speech` and `Status`.

## 19. Testing Strategy

Hazlo currently uses Vitest for focused unit tests.

Current test files:

| Test file | What it covers |
| --- | --- |
| `src/utils/taskExtractor.test.ts` | Numbered lists, bullet lists, simple "and" tasks, short imperatives, empty input, noisy input, and mixed longer text. |
| `src/services/notion.test.ts` | Successful sync, API headers, safe `401` error, retries for `500`, retries for network errors, and empty-entry handling. |

The Notion service tests mock `fetch`. They do not call real Notion, do not require real Notion credentials, and do not use production secrets.

Commands:

```bash
pnpm test
pnpm typecheck
pnpm build
git diff --check
```

What each command validates:

| Command | Purpose |
| --- | --- |
| `pnpm test` | Runs Vitest unit tests. |
| `pnpm typecheck` | Runs `tsc --noEmit` against `src`. |
| `pnpm build` | Builds the production Vite bundle. |
| `git diff --check` | Checks the diff for whitespace errors. |

## 20. Troubleshooting Guide

| Problem | Likely Cause | Fix |
| --- | --- | --- |
| Voice input does not work | Browser does not support `SpeechRecognition` or `webkitSpeechRecognition`. | Use a Chromium-based browser and confirm the UI does not show the unsupported browser message. |
| Browser asks for microphone permission | First-time microphone access prompt. | Allow microphone access for the site. |
| Browser does not support speech recognition | Browser API is missing. | Switch browsers or use a platform that supports Web Speech API recognition. |
| Entry appears but Notion sync fails | Local save succeeded, backend or Notion write failed. | Check the sync badge error, Vercel function logs, env vars, and Notion integration sharing. |
| `Sync failed` appears | `saveToNotion` returned a safe failure message. | Click `Retry` after checking configuration or network state. |
| API secret mismatch | `VITE_API_SECRET` does not match `API_SECRET`. | Set both values to the same secret and redeploy after changing `VITE_API_SECRET`. |
| Notion database not shared with integration | The integration cannot access the database. | Open the database in Notion and share it with the integration. |
| Missing env vars in Vercel | Backend cannot read required values. | Add `NOTION_TOKEN`, `NOTION_DATABASE_ID`, and `API_SECRET` in Vercel settings. |
| Vercel env vars changed but app was not redeployed | Frontend bundle still has old `VITE_` values. | Redeploy the project after changing any `VITE_` variable. |
| Localhost cannot call API | Vite dev server does not run Vercel functions by itself. | Use `vercel dev` for local API routes or set `VITE_API_BASE_URL` to a deployed backend. |
| CORS/preflight issue | Separate frontend origin is not in `ALLOWED_ORIGINS`. | Host frontend/backend same-origin or update the allowed origins in the backend route. |
| Tasks are not extracted perfectly | Extractor is rule-based and simple. | Use clearer bullet, numbered, or imperative phrasing; improve `taskExtractor.ts` in a fork if needed. |
| Notion page created but tasks missing | Extractor returned no tasks, tasks were invalid, or task count exceeded handling limits. | Check the local entry tasks; try numbered or bullet task input. |
| Notion returns configuration errors | Database schema does not match expectations. | Confirm `Raw Speech` is a title property and `Status` is a status property. |

## 21. Limitations

- Voice support depends on browser support for the Web Speech API.
- Microphone permission is required.
- Task extraction is rule-based and does not understand all natural language.
- The API secret model is lightweight and not full authentication.
- Hazlo is not a full multi-user SaaS.
- There are no user accounts yet.
- The Notion schema is simple: `Raw Speech`, `Status`, transcript body, and `to_do` blocks.
- Offline support is limited to browser local persistence after the app has loaded.
- Data is persisted locally in the browser and synced to the configured Notion workspace.
- Local task edits after sync do not currently update the already-created Notion page.
- Rollover copies incomplete tasks locally and does not currently create a new Notion page for those rollover copies.
- Browser localStorage can be cleared by the user or browser, so it should not be treated as permanent backup.

## 22. Future Improvements

Realistic roadmap ideas:

- Stronger authentication.
- AI-based task extraction.
- Better multilingual support.
- Calendar integration.
- Reminders.
- Recurring tasks.
- Better Notion database schema.
- Mobile and PWA improvements.
- Export/import.
- Multi-workspace support.
- User onboarding wizard.
- Browser compatibility improvements.
- More complete local API development documentation.
- Optional Notion page update after local task edits.
- Better CORS configuration for custom deployments.

## 23. How to Fork and Use Hazlo Personally

Hazlo is meant to be forkable. A public user does not need the original maintainer's Notion token and should never ask for it.

Personal setup:

1. Fork the GitHub repository.
2. Clone or import the fork into Vercel.
3. Create your own Notion integration.
4. Create your own Notion database.
5. Share that database with your integration.
6. Copy your own integration token and database ID.
7. Add your own env vars in Vercel:
   - `NOTION_TOKEN`
   - `NOTION_DATABASE_ID`
   - `API_SECRET`
   - `VITE_API_SECRET`
   - optional `VITE_API_BASE_URL`
8. Deploy to your own Vercel account.
9. Use the deployed URL as your personal voice-to-Notion task capture app.

Your data goes to your own Notion workspace when configured correctly. The original project owner does not need access to your Notion integration, token, database, or entries.

## 24. Example Daily Use Cases

| Use case | How Hazlo helps |
| --- | --- |
| Morning planning | Speak the day's tasks quickly before opening a full planner. Hazlo stores the transcript and pushes extracted tasks to Notion. |
| Capturing tasks while working | Record interruptions or follow-ups without switching deeply out of the current task. |
| After-meeting thought dump | Speak action items immediately after a call, then review them later in Notion. |
| Project updates | Capture a short spoken update and preserve the raw context alongside tasks. |
| Freelance or client work | Quickly log follow-ups such as emails, invoices, reviews, or deployment checks. |
| Mental clutter cleanup | Turn scattered thoughts into a saved entry instead of holding them in memory. |
| Personal accountability journal | Keep a spoken record of what you planned or committed to doing. |
| Daily standup notes | Speak yesterday/today/blockers style notes and extract obvious action items. |

## 25. Impact

Hazlo reduces the friction of task capture. Instead of forcing a user to type, categorize, and structure every thought before saving it, Hazlo lets the user speak first and organize later. The raw transcript preserves context, extracted tasks add structure, local persistence protects the moment of capture, and Notion sync moves the result into a workspace the user already controls.

As an open-source project, Hazlo also makes the workflow inspectable and adaptable. Developers can understand the system end to end, fork it, change the task extraction rules, adjust the Notion schema, or deploy it for their own productivity process.

## 26. Final Summary

Hazlo is a simple, self-hosted, open-source voice-to-task system that turns spoken thoughts into structured Notion entries. It is intentionally lightweight, understandable, and forkable so anyone can adapt it for their own productivity workflow.
