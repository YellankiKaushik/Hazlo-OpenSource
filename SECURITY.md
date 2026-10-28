# Security policy and deployment model

Hazlo has **no user authentication**. It is a personal, forkable capture app, not a multi-user SaaS. Please report a suspected vulnerability privately through [GitHub private vulnerability reporting](https://github.com/YellankiKaushik/Hazlo-OpenSource/security/advisories/new) if available; otherwise contact the maintainer through the [GitHub profile](https://github.com/YellankiKaushik) to arrange a private channel. Do not post credentials or private transcripts in public issues.

## Default: local-only

Both opt-in flags default to false:

- Server: `NOTION_SYNC_ENABLED`
- Browser build: `VITE_NOTION_SYNC_ENABLED`

Local capture, rule-based extraction, themes, speech language, and browser persistence work without Notion. A browser flag alone cannot enable server writes. The API also refuses writes whenever Vercel sets `VERCEL_ENV=preview`, even with inherited credentials. Do not give Preview environments Notion credentials.

## Personal sync: deliberate anonymous write access

For a personal deployment, set both flags to exactly `true`, provide server-only `NOTION_TOKEN` and `NOTION_DATA_SOURCE_ID`, and set `NOTION_ALLOWED_ORIGINS` to your exact HTTPS app origin (no trailing slash). Multiple approved origins may be comma-separated. Local development permits HTTP localhost/127.0.0.1 with the actual port. Keep frontend and API on the same origin.

**Anyone who can reach an enabled public endpoint can imitate its public request format and write to its configured Notion data source.** Origin, Fetch Metadata, CORS, client entry IDs, and rate limits are not owner authentication. The frontend contains no private credential. Do not enable public writes against a sensitive workspace. Use a dedicated integration/data source with minimum read/insert permissions, or independent network/provider access restrictions. No paid service or user-account system is installed by this project.

## Owner-configured abuse controls

These controls are **not activated by the repository**. Before enabling public writes, inspect your Vercel project's Firewall and plan availability. Add a custom rule scoped to exact path `/api/notion-sync` and method POST. Start with per-IP 60 requests per 60 seconds in log mode; review normal traffic, then test enforcement in Preview using synthetic/no-write requests. After owner review, publish enforcement, for example 10 POSTs per IP per 60 seconds for personal use. Monitor shared-IP false positives, distributed abuse, and usage budgets; adjust thresholds accordingly.

See [Vercel rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) and [firewall CLI](https://vercel.com/docs/cli/firewall). Pricing/availability depend on the plan; do not enable paid features blindly. A distributed attacker can evade per-IP controls. If you cannot enforce acceptable limits, **leave sync disabled**. Repository-level per-instance concurrency limits are only resource containment, not a global rate limiter.

## Request and upstream limits

POST requires JSON, an approved Origin, a matching `X-Idempotency-Key`/`clientEntryId`, and a valid timezone-qualified timestamp. Limits are 100 KiB serialized UTF-8 JSON, 20,000 transcript UTF-16 code units, 80 tasks, and 2,000 code units per task. Unknown fields, invalid types/statuses/dates, and control characters are rejected. Over-limit content stays local and is never silently truncated for sync. Notion's title is shortened if needed, while the entire accepted transcript is retained in rich-text chunks. Upstream calls time out at 10 seconds.

Server config and input errors fail before Notion. Errors contain fixed codes; logs contain only a fixed message/numeric upstream status, never transcripts, tokens, page IDs, or upstream error bodies. API responses are `no-store`.

## Retry and duplicate safety

There are **no automatic POST retries**. After a network error, timeout, ambiguous server response, or interrupted page reload, check Notion before using Retry. The UI asks for confirmation when the outcome is uncertain. A timeout can occur after Notion created the page.

The browser saves an immutable first-send payload alongside the local entry; later task edits do not change a retry payload or original capture time. Within one warm function instance, identical requests coalesce and recent successes/uncertain outcomes are retained for up to 10 minutes (maximum 256 IDs, maximum four active upstream creates). Conflicting payloads for the same recent ID return 409. These caches disappear on cold starts, are separate across instances/regions, and do not guarantee durable or exactly-once delivery. True durable idempotency requires a shared transactional store/queue and reconciliation design, or a carefully designed Notion schema change; neither is installed.

The destructive `testNotionConnection()` helper was removed. Its replacement, `checkNotionSyncConfiguration()`, performs GET configuration verification only. It does not contact Notion, verify integration permissions/schema, or create a test page. Real verification is an owner-approved single fictional entry after inspecting the configuration.

## Browser data

Notes live unencrypted under `hazlo-storage` in localStorage. Same-origin JavaScript, browser extensions, and anyone using the browser profile may read them. Browser clearing/quota policies can remove data; localStorage is not a backup.

Hydration validates the stored envelope and copies data fields only. Corrupt/incompatible storage is left untouched and further writes are blocked for that tab to prevent overwriting original notes. A visible warning explains that new edits are temporary. Back up the original storage before repairing it; do not automatically clear site data. Quota/blocked storage also produces a visible warning. No destructive storage migration or cosmetic encryption is used.

Retry snapshots must match their entry's identifier, original timestamp and transcript. Before each persistence write, the adapter checks whether another tab changed the stored value; if so it preserves the newer storage and warns that this tab's edits are temporary. This is best-effort stale-write detection, not transactional multi-tab merging. Back up temporary changes before reloading and prefer one active editing tab.

## HTTP policy

Vercel responses use CSP with same-origin scripts/connections, no plugins, no framing and no form submissions to other origins; nosniff; DENY framing; no-referrer; one-year HSTS; microphone restricted to self; camera/geolocation/payment/USB disabled. React inline styles require `style-src 'unsafe-inline'`; scripts do not. The pre-paint theme initializer is a same-origin file, preserving the selected theme without inline script allowances.

Headers are applied by Vercel after deployment, not automatically by Vite dev/preview. Test them on the reviewed deployment. Speech recognition is browser-dependent and may send audio to the browser vendor's service; Hazlo itself adds no analytics or transcript tracking. CSP does not turn browser speech processing into offline recognition.

## Retire exposed legacy configuration

Remove `API_SECRET`, `VITE_API_SECRET` and `VITE_API_BASE_URL` from all environments after migration. Treat every previous frontend API secret as public and retire it; rotate it anywhere it was reused. Merely renaming it is not protection. Rotate a Notion token if it was exposed, if reused outside its intended scope, or if suspected abused; inspect/delete unexpected Notion pages. Old deployments/bundles may remain accessible until the owner removes/restricts them. Do not rewrite Git history without separate approval.

Review [deployment instructions](docs/DEPLOYMENT.md) and the [audit report](docs/SECURITY_AUDIT_REPORT.md) before release. This branch requires owner review and does not itself authorize production deployment.
