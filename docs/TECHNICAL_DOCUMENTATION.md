# Hazlo technical documentation

## Product and scope

Hazlo by Kaushik is a personal, forkable voice/manual task-capture app. React 18/Vite/TypeScript render the interface; Zustand and localStorage preserve entries; a deterministic rule-based extractor creates tasks. Optional Vercel-to-Notion sync keeps private integration credentials on the server. There is no login, multi-user authorization, AI extraction service, analytics, or custom transcription backend.

Start with [setup](SETUP.md), [deployment](DEPLOYMENT.md), [architecture](ARCHITECTURE.md), [security policy](../SECURITY.md) and the [review report](SECURITY_AUDIT_REPORT.md). Promotional videos represent captured versions of the app; sync is now explicitly opt-in.

## Runtime and trust boundaries

1. VoiceInput handles manual form submission and the useSpeechRecognition hook.
2. The controller detects SpeechRecognition or webkitSpeechRecognition, requests the microphone only on user action, collects final/interim segments, and saves finalized text on Stop. Cancel discards the session; permission failures offer typing. Browser recognition may send audio to its vendor.
3. Both capture paths call addEntry. Text is trimmed, tasks extracted and a UUID assigned. Entry.createdAt is recorded once. The store saves locally before any remote activity.
4. Default capture is local-only. The public VITE_NOTION_SYNC_ENABLED build flag must be exactly true to attempt sync; it is not a credential.
5. Enabled capture persists an immutable first-send syncPayload and submits same-origin JSON to /api/notion-sync, with X-Idempotency-Key matching clientEntryId. It sends no API secret or cookies.
6. The server checks its own opt-in, environment, server config, Origin/Fetch Metadata and bounded JSON. Only then does it call the fixed Notion pages endpoint.
7. Success updates syncStatus/syncedAt without changing createdAt. Errors keep all local text/tasks and expose fixed messages.
8. Retry is manual. An uncertain outcome requires checking Notion and explicit UI confirmation, because the original create may already have succeeded.

## Important files

| Path | Responsibility |
| --- | --- |
| src/components/VoiceInput.tsx | Voice/manual UI, language selector, shared entry pipeline. |
| src/hooks/useSpeechRecognition.ts | React lifecycle and speech controller integration. |
| src/utils/speechRecognition.ts | Capability detection, language persistence, error/restart handling, finalized speech. |
| src/utils/taskExtractor.ts | Numbered lists, bullets, simple and-separated actions, short imperative patterns. |
| src/store/useStore.ts | Entries, actions, sync state, immutable snapshots, local rollover. |
| src/store/storage.ts | Envelope validation, safe data recovery, storage failure containment. |
| src/services/notion.ts | Same-origin non-retrying sync client and configuration check. |
| api/notion-sync.js | Strict API validation, bounded upstream call, per-instance coalescing. |
| src/components/EntryCard.tsx | Status, safe errors, uncertain retry confirmation, local task controls. |
| src/utils/theme.ts / src/hooks/useTheme.ts | Centralized light/dark/system behavior. |
| public/theme-init.js | External pre-paint theme initializer compatible with CSP. |
| public/manifest.webmanifest | PWA metadata and install icons. |
| vercel.json | SPA rewrites and deployed HTTP headers. |
| tools/promo-video | Isolated editable video tooling and dependency graph. |

## Data model and persistence

Entry fields are id, rawText, tasks, date (local YYYY-MM-DD), time (HH:mm), createdAt, updatedAt and optional syncStatus, syncedAt, syncError, syncUncertain, syncPayload. Each task has id, text, completed and createdAt.

| State | Label | Meaning |
| --- | --- | --- |
| local | Saved locally | No remote success claimed; no POST while browser sync is disabled. |
| pending | Syncing | Local save succeeded; first-send/manual retry in progress. |
| synced | Synced | Backend confirmed Notion page creation. |
| failed | Sync failed | Local entry retained; manual recovery available when enabled. |

The persist key remains hazlo-storage, envelope version 0. Only entries and lastRolloverDate are saved. Old short entry IDs remain valid; new IDs use crypto.randomUUID(). No destructive migration runs. Existing entries without syncStatus retain their historical display semantics; pending entries restored after reload become failed/uncertain without auto-submission.

Hydration validates types, timestamps, task arrays, sync metadata and snapshot shapes. It copies data fields, ignoring unknown store/action keys. Malformed/incompatible storage is not overwritten: reads return no unsafe state, writes are locked for that tab, and a warning tells the user to back up original storage. Quota/blocked storage errors keep in-memory capture usable with an explicit temporary-data warning. localStorage is unencrypted, same-origin-readable and not permanent backup.

Snapshot identity, original capture time and transcript must match the owning entry. A stale tab cannot overwrite a different stored value observed immediately before a write; it warns and keeps its own new edits temporary. This check does not make localStorage transactional or implement automatic cross-tab merging. The frontend also checks the aggregate 100 KiB UTF-8 JSON limit before sending a sync request.

Task completion/deletion and entry deletion remain local; they do not update/delete already-created Notion pages. Midnight rollover copies yesterday's incomplete tasks once to today using new IDs/time, local-only status and no inherited remote snapshot. It preserves the original entry and makes no automatic Notion write.

## API contract

### GET /api/notion-sync

Returns enabled/configured booleans with no-store, without contacting Notion. The checkNotionSyncConfiguration() client function calls this route. The old destructive testNotionConnection() helper was removed. This verifies configuration only, not actual credentials, permissions or schema; it never creates a connectivity-check page.

### POST /api/notion-sync

Content-Type must be application/json (optional UTF-8 charset). The browser Origin must exactly match NOTION_ALLOWED_ORIGINS; obvious cross-site browser requests are rejected. Requests without Origin are rejected; non-browser callers can forge it. CORS is not authentication.

Example fictional request:

```json
{
  "rawSpeech": "Finish the landing page and review the deployment",
  "status": "Not started",
  "capturedAt": "2026-06-17T08:45:30.000Z",
  "clientEntryId": "entry-example",
  "tasks": [
    { "text": "Finish the landing page", "completed": false },
    { "text": "review the deployment", "completed": false }
  ]
}
```

Send X-Idempotency-Key: entry-example. IDs contain 1–80 alphanumeric, underscore or hyphen characters (legacy short IDs and UUIDs supported). capturedAt must be a valid ISO datetime with seconds and an explicit Z/offset; invalid/missing timestamps are rejected rather than silently changing capture time. Status is Not started, In progress or Done; omission defaults to Not started. Tasks may be omitted. Unknown properties, null/array top-level bodies, malformed JSON and invalid task fields fail closed.

| Limit | Value |
| --- | --- |
| Serialized request body | 102,400 UTF-8 bytes (100 KiB), checked before JSON parsing for raw bodies and against parsed bodies. |
| Transcript | 20,000 UTF-16 code units. |
| Tasks | 80. |
| Task text | 2,000 UTF-16 code units, no silent truncation. |
| Upstream time | 10 seconds, including response parsing. |
| Client time | 12 seconds. |
| Warm-instance active creates | 4. |
| Warm-instance recent identifiers | 256 for up to 10 minutes. |

Vercel may parse/reject a request before this handler. The application limit does not prevent receiving platform-level bytes/invocations; edge controls are still required.

POST returns 200 with ok/pageId on success. Fixed error codes distinguish disabled sync (403), rejected origins (403), configuration (503), content type (415), body size (413), invalid fields (400), recent-ID conflicts (409), rate/capacity limits (429), Notion rejection (502) and uncertain outcomes (502/504). API responses use no-store and nosniff. Logs contain only fixed diagnostics/numeric upstream rejection status. Provider error bodies and exception messages are not logged or returned.

## Notion payload

API version stays 2025-09-03. Parent uses data_source_id from NOTION_DATA_SOURCE_ID. Schema remains:

| Property | Type | Details |
| --- | --- | --- |
| Raw Speech | Title | Transcript title, shortened at the 2,000-unit boundary if needed. |
| Status | Status | Not started, In progress, Done. |
| Date | Date | Original capture timestamp normalized to UTC, not sync/retry time. |

The custom Date property is required; Notion's Created time is not a substitute. The full accepted transcript is stored as a paragraph with safe rich-text chunks, preserving UTF-16 surrogate pairs; each task becomes a to_do block with its original checked state. Additional Notion columns are allowed. No new idempotency property is required.

Redirects are rejected and fetch is aborted after the deadline. A timeout/connection failure cannot establish whether Notion already wrote a page. Integration token/permissions, data-source sharing and schema must be verified by the owner using a dedicated fictional entry, not automated production tests.

## Retry and idempotency

Automatic POST retries have been removed because blind retries can multiply pages. The browser coalesces active requests for one ID and persists the first-send payload. Later task edits and updatedAt changes do not modify the retried content or original capture time.

One warm server instance coalesces matching concurrent requests, replays recent confirmed/uncertain outcomes and rejects conflicting content for the same ID. Failed explicit Notion rejection can be retried manually; 429 asks the user to wait at least 60 seconds. Maps are bounded and have expiry, but are not shared/durable. Different instances, restarts and cache expiry can allow duplicate creation. Exactly-once delivery is not guaranteed. No external database/queue is silently installed. Durable delivery would require additional infrastructure and reconciliation design.

## Environment contract and public write model

| Variable | Scope | Default / requirement |
| --- | --- | --- |
| NOTION_SYNC_ENABLED | Server | false; exact true opts into writes. |
| VITE_NOTION_SYNC_ENABLED | Browser build | false; exact true enables attempts. |
| NOTION_TOKEN | Server only | Required only for enabled personal sync. |
| NOTION_DATA_SOURCE_ID | Server only | UUID of the shared personal data source. |
| NOTION_ALLOWED_ORIGINS | Server only | Exact HTTPS origins, comma separated if needed; local HTTP localhost/127.0.0.1 permitted. |

Vercel Preview writes are always disabled. Retire API_SECRET, VITE_API_SECRET and VITE_API_BASE_URL; no replacement browser credential exists. Rebuild after changing the public build flag. Never assign a private token a VITE prefix.

Enabled anonymous public Notion writes are callable by non-owners. Owner-configured Vercel edge rate limits and independent access restrictions can reduce abuse; neither Origin nor per-IP limits proves identity. See SECURITY.md for rollout instructions and residual risks. Public demos should remain local-only without real Notion credentials.

## HTTP/browser policy

Vercel config preserves SPA rewrites and adds same-origin CSP scripts/connections, no framing/plugins, no-referrer, nosniff, HSTS and restricted permissions. Microphone remains enabled for self. Inline React styling is supported; inline scripts/eval/third-party scripts are not allowed. The pre-paint initializer moved unchanged to public/theme-init.js. Vite dev does not enforce deployment headers.

React renders user text, with no dangerouslySetInnerHTML or tracking. Web Speech behavior remains capability-based; mobile layout/themes and PWA manifest/icons are preserved. PWA metadata alone does not imply complete offline/service-worker behavior.

## Development, deployment and tests

Use pnpm install --frozen-lockfile; pnpm dev for local-only frontend; vercel dev for same-origin local API testing with explicit configuration. Never pull environment files over local changes without backing them up. Follow SETUP.md/DEPLOYMENT.md for the full fork→Notion→Vercel process, provider controls, logs, verification and rollback.

Run pnpm typecheck, pnpm test, pnpm build, pnpm audit --prod, the full pnpm audit, git diff --check and the documented security checks. Tests mock network/browser behavior and do not require a production microphone/Notion token. Security tests cover bounded input, safe headers/errors, disabled/Preview writes, duplicate/conflict/timeouts, secret-free client, persisted-data recovery and core regression behavior. GitHub Actions is not required.

Promotional tooling is a separate pnpm workspace. Its Chromium sandbox is enabled; its loopback server serves only permitted assets and rejects cross-origin/private paths. Its dependency audit is independent; no video was re-rendered for the security changes.
