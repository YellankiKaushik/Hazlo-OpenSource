# Codex Repository Instructions

## Repository

- Writable target repository: `YellankiKaushik/Hazlo-OpenSource`
- Source of truth: `YellankiKaushik/Hazlo---Kaushik`
- The source-of-truth repository is read-only for this project. Never push to it.
- Preserve Repository B's open-source identity, history, and origin remote.

## Development

- Use `pnpm` for dependency management and scripts.
- Preserve current application behavior synchronized from Hazlo---Kaushik unless explicitly asked to change it.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build` after meaningful changes.
- Run `git diff --check` before committing.

## Security

- Never commit `.env`, `.env.local`, real Notion tokens, API secrets, Vercel credentials, or other private credentials.
- Keep `NOTION_TOKEN` server-side. `VITE_API_SECRET` is browser-visible and must not be treated as a genuinely private credential.

## Architecture invariants

- Keep speech recognition capability-based and support both `SpeechRecognition` and `webkitSpeechRecognition`.
- Preserve manual **Type instead** fallback behavior and the shared entry-creation pipeline.
- Preserve local Zustand/localStorage persistence, Notion retry behavior, and original `Entry.createdAt` values.
- Keep theme behavior centralized and use semantic light/dark CSS tokens.
