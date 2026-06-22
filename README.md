# Hazlo

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=111)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=fff)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-ready-000?logo=vercel&logoColor=fff)](https://vercel.com/)
[![Notion API](https://img.shields.io/badge/Notion-API-000?logo=notion&logoColor=fff)](https://developers.notion.com/)

**Live Demo:** [https://hazlo-opensource.vercel.app](https://hazlo-opensource.vercel.app/)
**GitHub Repo:** [https://github.com/YellankiKaushik/Hazlo-OpenSource](https://github.com/YellankiKaushik/Hazlo-OpenSource)

Hazlo is a voice-first task capture app for turning spoken thoughts into organized tasks. It is built for moments when opening a full task manager is too much friction: speak once, keep the raw thought, extract tasks locally, and sync the result to Notion.

## What It Solves

Most productivity tools ask you to organize before you capture. Hazlo flips that flow:

1. Speak naturally.
2. Hazlo extracts likely tasks.
3. Entries save locally right away.
4. The transcript and tasks sync to Notion in the background.

Hazlo is currently designed for personal or self-hosted use. It does not include full multi-user authentication yet.

## Core Features

- Voice capture through the browser Web Speech API.
- Local task extraction from spoken transcripts.
- Local persistence with Zustand and `localStorage`.
- Vercel Serverless Function for Notion sync.
- Notion page creation with extracted tasks as `to_do` blocks.
- Sync states: `Syncing`, `Synced`, `Sync failed`, and `Retry`.
- API secret protection between the frontend and backend endpoint.

## Tech Stack

- React 18
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- Vitest
- Vercel Serverless Functions
- Notion API

## Architecture

```text
Browser
  VoiceInput -> Zustand store -> localStorage
       |             |
       |             +-> taskExtractor.ts
       |
       +-> src/services/notion.ts
              POST /api/notion-sync
                    |
                    +-> api/notion-sync.js
                          validates API secret
                          writes transcript and to_do blocks to Notion
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for more detail.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Production Checklist](docs/PRODUCTION_CHECKLIST.md)
- [Technical Documentation](docs/TECHNICAL_DOCUMENTATION.md)

## Voice Input

Hazlo uses the browser `SpeechRecognition` API where available. While recording, interim and final transcript segments are shown in the UI. When recording stops, Hazlo saves the final transcript as an entry, extracts tasks, persists the entry locally, and starts Notion sync.

Voice support depends on the browser. Chromium-based browsers provide the best support.

## Notion Sync

The frontend sends entries to `/api/notion-sync`. The Vercel function:

- checks `X-API-Secret` against `API_SECRET`
- validates the request body
- uses server-side `NOTION_TOKEN` and `NOTION_DATABASE_ID`
- creates a Notion page
- appends extracted tasks as Notion `to_do` blocks
- returns a safe success or failure response

Real Notion credentials stay server-side and are never required in the browser bundle.

## Setup

Clone the repository:

```bash
git clone https://github.com/YellankiKaushik/Hazlo.git
cd Hazlo
```

Install dependencies:

```bash
pnpm install
```

Create a Notion integration:

1. Go to https://www.notion.so/profile/integrations.
2. Create an internal integration.
3. Copy the integration token.
4. Create or choose a Notion database.
5. Share the database with the integration.
6. Copy the database ID from the database URL.

Hazlo expects the database to include:

- `Raw Speech`: title property
- `Status`: status property with `Not started`, `In progress`, and `Done`

## Environment Variables

Copy `.env.example` for local use, or configure these in Vercel Project Settings:

```env
NOTION_TOKEN=your_notion_token_here
NOTION_DATABASE_ID=your_notion_database_id_here
API_SECRET=your_random_api_secret_here
VITE_API_SECRET=your_same_random_api_secret_here
```

Notes:

- `NOTION_TOKEN`, `NOTION_DATABASE_ID`, and `API_SECRET` are server-side Vercel variables.
- `VITE_API_SECRET` is compiled into the frontend and must match `API_SECRET`.

## Local Development

Frontend-only development:

```bash
pnpm dev
```

Full local API testing with Vercel:

```bash
vercel link
vercel env pull .env --environment=development
vercel dev
```

If you run Vite separately while pointing at another backend, set `VITE_API_BASE_URL` intentionally and remove it when done.

## Vercel Deployment

1. Connect the GitHub repository to Vercel.
2. Add the required environment variables in Vercel Project Settings.
3. Deploy from `main` or run:

```bash
pnpm deploy:vercel
```

Vercel serves `api/notion-sync.js` as the backend route. `vercel.json` keeps non-API routes pointed at the React app.

## Testing

Run these before shipping changes:

```bash
pnpm test
pnpm typecheck
pnpm build
git diff --check
```

The current unit tests cover task extraction and the Notion sync client with mocked `fetch`. They do not call real Notion.

## Security Notes

- Never commit `.env` or `.env.local`.
- Never commit real Notion tokens, database IDs, Vercel tokens, or API secrets.
- Rotate the Notion token immediately if it is exposed.
- `API_SECRET` and `VITE_API_SECRET` must match.
- This app is intended for personal or self-hosted usage and does not yet provide full multi-user auth.

## Production Checklist

Use [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) before or after production deploys.

## Troubleshooting

- `401 Unauthorized`: `VITE_API_SECRET` does not match `API_SECRET`.
- `server_not_configured`: `NOTION_TOKEN` or `NOTION_DATABASE_ID` is missing in Vercel.
- `rawSpeech_required`: the frontend sent an empty transcript.
- `Notion sync failed`: retry from the entry card, then check Vercel function logs.
- Microphone unavailable: use a Chromium-based browser and allow microphone access.
