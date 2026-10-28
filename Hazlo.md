# Hazlo Product Notes

Hazlo is a lightweight voice-first task capture app. It helps a user capture a thought quickly, extract likely tasks, keep the entry in the browser, and sync it to the user's own Notion workspace.

Hazlo was created and is maintained by Kaushik (YellankiKaushik).

## Current Product Shape

Hazlo currently supports:

- Voice input through browser `SpeechRecognition` or `webkitSpeechRecognition`.
- Manual "Type instead" entry creation.
- Rule-based task extraction.
- Local entries and tasks stored with Zustand and `localStorage`.
- Daily rollover for incomplete local tasks.
- Optional, explicitly enabled personal Notion sync through the Vercel `/api/notion-sync` function.
- Sync status and retry for failed Notion writes.
- System, light, and dark themes.
- PWA manifest metadata and install icons.

Hazlo is not currently:

- A full SaaS product.
- A multi-user workspace.
- A full authentication system.
- An AI transcription backend.
- A complete task manager replacement.

## Current User Flow

```text
Speak or type a thought
  -> Hazlo creates a local entry
  -> Hazlo extracts likely tasks
  -> Browser storage keeps the entry after refresh
  -> Vercel Function syncs the entry to Notion
```

## Current Data Model

Local entries include:

- raw transcript or typed text
- extracted tasks
- local date and time
- `createdAt` and `updatedAt`
- sync status: `local`, `pending`, `synced`, or `failed`
- optional sync error details

Notion receives:

- `Raw Speech` title property
- `Status` status property
- `Date` date property
- transcript paragraph block
- extracted task `to_do` blocks

## Important Setup Contract

Hazlo expects these environment variables:

- `NOTION_TOKEN`
- `NOTION_DATA_SOURCE_ID`
- `NOTION_SYNC_ENABLED` and browser build flag `VITE_NOTION_SYNC_ENABLED` (both false by default)
- `NOTION_ALLOWED_ORIGINS` (exact app origin, when enabling writes)

The old shared-secret/API-base variables are retired. `NOTION_TOKEN` stays server-side. Sync is opt-in; Preview writes are disabled. There is no login, so enabled public writes remain anonymous despite Origin checks. See [SECURITY.md](SECURITY.md).

The Notion data source must contain:

| Property name | Type |
| --- | --- |
| `Raw Speech` | Title |
| `Status` | Status |
| `Date` | Date |

## Important Files

| Path | Purpose |
| --- | --- |
| `src/components/VoiceInput.tsx` | Voice and manual text entry UI. |
| `src/utils/speechRecognition.ts` | Speech capability detection, language preference, transcript handling, and error handling. |
| `src/utils/taskExtractor.ts` | Rule-based task extraction. |
| `src/store/useStore.ts` | Entries, tasks, local persistence, sync status, retry, and rollover. |
| `src/services/notion.ts` | Frontend client for `/api/notion-sync`. |
| `api/notion-sync.js` | Vercel Function that writes to Notion. |
| `src/utils/theme.ts` | Centralized system/light/dark theme helpers. |
| `public/manifest.webmanifest` | PWA metadata. |

## Documentation Map

- `README.md` is the public entry point.
- `docs/SETUP.md` is the detailed beginner setup manual.
- `docs/DEPLOYMENT.md` explains GitHub to Vercel deployment.
- `docs/ARCHITECTURE.md` gives a short architecture overview.
- `docs/TECHNICAL_DOCUMENTATION.md` gives deeper implementation details.
- `docs/PRODUCTION_CHECKLIST.md` is the deployment verification checklist.
- `CONTRIBUTING.md` explains how to contribute safely.

## Product Philosophy

Hazlo should stay fast, understandable, and personal-first. The current product values:

- low-friction capture
- local-first feedback
- transparent Notion sync
- small, inspectable code
- safe handling of user secrets
- clear setup for self-hosters

## Future Ideas

Future work should be treated as roadmap exploration, not current behavior:

- better abuse controls for personal no-login deployments
- better task extraction
- optional AI-based structuring
- calendar or reminder integrations
- import/export
- improved offline behavior
- richer Notion updates after local task edits

Any future change to the Notion schema, sync contract, speech flow, or storage behavior should update tests and documentation in the same change.
