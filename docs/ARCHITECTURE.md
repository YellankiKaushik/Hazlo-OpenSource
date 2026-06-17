# Architecture

Hazlo is a Vercel-hosted React app with a small serverless backend for Notion sync. The app is intentionally simple: capture speech quickly, persist locally first, then sync in the background.

## Runtime Flow

```text
User speaks
  |
  v
VoiceInput.tsx
  |
  v
Zustand store
  |-- saves entry to localStorage
  |-- extracts tasks with taskExtractor.ts
  |
  v
src/services/notion.ts
  |
  v
POST /api/notion-sync
  |
  v
api/notion-sync.js
  |-- validates X-API-Secret
  |-- reads server-side Notion env vars
  |-- creates a Notion page
  |-- appends tasks as to_do blocks
```

## Frontend

- `src/components/VoiceInput.tsx`: controls browser speech recognition.
- `src/store/useStore.ts`: owns entries, sync status, retry, task toggles, and local persistence.
- `src/utils/taskExtractor.ts`: extracts tasks using local heuristics.
- `src/services/notion.ts`: sends entries to the serverless sync endpoint and maps failures to safe UI messages.

## Backend

- `api/notion-sync.js`: Vercel Serverless Function for Notion writes.
- Required server-side env vars: `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `API_SECRET`.
- Required frontend env var: `VITE_API_SECRET`, which must match `API_SECRET`.

## Data Model

Each local entry stores:

- raw transcript text
- extracted tasks
- local date and time
- sync status: `pending`, `synced`, or `failed`
- optional sync error details for retry/debugging

The Notion page stores the transcript in the `Raw Speech` title property and appends extracted tasks as `to_do` blocks.

## Failure Handling

Local save happens before Notion sync. If the network or server fails, the entry remains available locally and shows `Sync failed`. The retry action sends the same entry through the sync endpoint again.

## Boundaries

Hazlo currently has no user accounts and no shared multi-user authorization model. It is best suited for personal use or self-hosted deployments where the Vercel project and Notion integration are controlled by one owner.
