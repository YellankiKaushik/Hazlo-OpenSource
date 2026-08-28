# Codex Repository Instructions

## Repository

- Repository: `YellankiKaushik/Hazlo-OpenSource`
- `main` is authoritative for this repository.
- Treat this as a standalone maintained open-source project.
- Preserve the repository identity, Git history, license, and `origin` remote.

## Development

- Use `pnpm` for dependency management and scripts.
- Prefer small, focused changes that are easy to review.
- Preserve working application behavior unless the task explicitly asks to change it.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm build` after meaningful changes.
- Run `git diff --check` before committing.

## Security

- Never commit `.env`, `.env.local`, real Notion tokens, API secrets, Vercel credentials, or other private credentials.
- Keep `NOTION_TOKEN` server-side.
- Treat all `VITE_` variables as browser-visible.
- `VITE_API_SECRET` must match `API_SECRET`, but it is not a truly private browser credential.

## Architecture Invariants

- Keep the Notion property contract stable: `Raw Speech` as Title, `Status` as Status, and `Date` as Date.
- Use `NOTION_DATA_SOURCE_ID` for the Notion parent data source.
- Keep speech recognition capability-based and support both `SpeechRecognition` and `webkitSpeechRecognition`.
- Preserve manual "Type instead" fallback behavior and the shared entry-creation pipeline.
- Preserve local Zustand/localStorage persistence, Notion retry behavior, and original `Entry.createdAt` values.
- Keep theme behavior centralized and use semantic light/dark CSS tokens.
