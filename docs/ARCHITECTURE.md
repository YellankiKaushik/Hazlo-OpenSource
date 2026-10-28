# Architecture

Hazlo is a local-first React/Vite application with an optional Vercel Notion-writing function. It has no user accounts.

```text
Voice (browser speech API) or manual text
  -> React -> Zustand -> rule-based extraction
  -> localStorage (entries + lastRolloverDate)
  -> local-only by default
  -> opt-in: same-origin POST /api/notion-sync
      -> server enablement + approved Origin + strict bounded JSON
      -> best-effort per-instance coalescing/concurrency containment
      -> bounded Notion request -> page + transcript + tasks
```

## Trust boundaries

- Browser input and localStorage are untrusted. React renders text, not injected HTML. Hydration validates persisted data and copies only fields, never actions.
- The browser build uses only `VITE_NOTION_SYNC_ENABLED` as a public feature flag. It sends no secret or cookies.
- The server reads `NOTION_SYNC_ENABLED`, `NOTION_ALLOWED_ORIGINS`, `NOTION_TOKEN`, and `NOTION_DATA_SOURCE_ID`. Preview writes are always disabled.
- Notion credentials never enter browser configuration. External Notion requests use a fixed URL, reject redirects, and time out after 10 seconds.
- Approved Origin/Fetch Metadata protect browsers against cross-site submissions, not forged non-browser traffic. Enabled public writes remain anonymous.

## Data and failure handling

Entries retain raw text, tasks, UUID/legacy ID, original capture time, local date/time and sync state. Statuses are local (Saved locally), pending, synced, and failed. First-send snapshots are persisted for stable retries. Old entries remain compatible; interrupted pending entries recover as uncertain failures without automatic transmission. Invalid storage is preserved and locked against overwrites with a visible warning.

Creation saves locally first. Manual retries preserve timestamps and original snapshot; ambiguous outcomes require checking Notion. There are no automatic POST retries. Task edits/deletes remain local and do not update an already-created Notion page. Midnight rollover makes new local-only copies, with new identifiers and no inherited remote-sync snapshot.

## Notion contract

The parent is `data_source_id` using `NOTION_DATA_SOURCE_ID`. Properties remain `Raw Speech` (Title), `Status` (Status with Not started/In progress/Done), and `Date` (Date from original timestamp). The entire accepted transcript and extracted to-do blocks are stored. Additional columns are allowed.

## Boundaries that remain

The bounded 10-minute warm-instance cache is not durable idempotency and does not provide a global rate limit. Owner-configured edge firewall/rate limits and, if needed, independent access restrictions are required before enabling public writes. No Redis/database/authentication system was introduced. See [security policy](../SECURITY.md) for exact limits and residual risks.
