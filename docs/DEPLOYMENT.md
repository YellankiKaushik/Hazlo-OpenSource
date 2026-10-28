# Hazlo deployment guide

Fork the repository into your GitHub account and import the fork through the [Vercel dashboard](https://vercel.com/). Choose Vite, install with `pnpm install --frozen-lockfile`, build with `pnpm build`, output `dist`. Use Node.js 24 LTS and `main` as the Production branch after reviewing changes.

**This security branch is for review only. Do not promote or merge it until the owner approves.** A non-main Git push may create an automatic Preview deployment; it must not become a production deployment. No GitHub Actions workflow is required by this project.

## Local-only demo (recommended public default)

Set `NOTION_SYNC_ENABLED=false` and `VITE_NOTION_SYNC_ENABLED=false` (or leave both absent). Do not assign a real Notion token to the public demo. Capture, extraction, storage, themes and voice/manual input work locally; the app labels entries Saved locally and does not POST to Notion.

## Explicit personal Notion sync

Read [SECURITY.md](../SECURITY.md) before enabling this. There is no login: anyone reaching the enabled endpoint can forge a valid request. A browser flag or Origin check is not owner authentication.

In Project Settings → Environment Variables, add:

| Variable | Where | Value/purpose |
| --- | --- | --- |
| NOTION_SYNC_ENABLED | Server, Production/Development only | Exactly true to permit writes. |
| VITE_NOTION_SYNC_ENABLED | Browser build | Exactly true to attempt sync; public, not a secret. |
| NOTION_TOKEN | Server only | Your own private integration token; no VITE prefix. |
| NOTION_DATA_SOURCE_ID | Server only | Actual UUID of the connected Notion data source. |
| NOTION_ALLOWED_ORIGINS | Server only | Exact HTTPS app origin, no trailing slash. |

Use your own integration and data source with the [documented schema](SETUP.md). Choose minimum read/insert capabilities and a dedicated non-sensitive destination. No additional Notion property is required.

For Development use your actual local runtime origin, for example `http://localhost:3000`. Production should list only the deployed personal app's exact origin, not localhost or broad wildcard domains. Frontend and API must share an origin. `VITE_API_BASE_URL` is retired.

## Preview isolation

Vercel has separate Production, Preview and Development environments. Do not share Production tokens with Preview. The server refuses writes if Vercel sets `VERCEL_ENV=preview`, even if enablement/credentials leaked through environment inheritance. Set the browser flag false for Preview, so it presents local-only mode instead of a failed sync.

To verify enabled Notion behavior before release, use a local Vercel runtime with a dedicated test workspace and explicit owner consent for test writes. The repository tests use mocks and never need live credentials.

## Abuse controls: owner configuration still required

The repository does not install a global rate limiter. Configure Vercel Firewall for exact path /api/notion-sync, method POST. Start by logging a generous per-IP threshold (for example 60 per 60 seconds), inspect traffic, test enforcement in Preview without real Notion writes, and tighten to the personal-use threshold (for example 10 per 60 seconds) after owner review. Availability/pricing depend on plan. Monitor logs/usage and false positives. Do not add mandatory normal-use CAPTCHA.

Follow [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting). If adequate abuse/access protection cannot be configured, leave writes disabled. Per-IP limits cannot stop every unauthorized/distributed write. No firewall rules were changed by this branch.

## Environment migration and rotation

Remove API_SECRET, VITE_API_SECRET, and VITE_API_BASE_URL from Production, Preview, Development and local files. The old frontend shared secret was public: retire it and rotate it anywhere reused. Rebuild and remove/restrict old deployments that still contain the value. Rotate a Notion integration token if exposed or suspected abused; audit the destination for unsolicited pages. Never paste actual values into logs, issues, Git or the audit report.

Vite injects VITE_NOTION_SYNC_ENABLED at build time. After changing it, rebuild/redeploy; changing the server flag alone can stop writes immediately in a runtime that has loaded the new value, but does not change a previously built frontend. Vercel environment changes should be followed by a reviewed redeployment; do not assume an existing deployment has new settings.

## Route, headers and logs

/api/notion-sync supports non-writing GET configuration checks, POST creation, and scoped OPTIONS. GET is not proof that Notion token/permissions/schema work. POST requires approved Origin and JSON with bounded lengths, matching entry/header identifiers and a valid original timestamp.

vercel.json preserves SPA routing and adds CSP, nosniff, no-referrer, DENY framing, HSTS, microphone=self and disabled unrelated permissions. Scripts/connections stay same-origin; React inline styles remain allowed. Inspect actual deployment response headers, including errors, after release.

Function logs show only fixed messages and numeric upstream rejection statuses. Notion response bodies are intentionally not logged because they may echo private input. Investigate token permissions, sharing and exact schema privately; do not enable raw transcript logging to debug.

## Verification after owner-approved release

1. Confirm the live site, PWA metadata, mobile layout and all three themes load without CSP errors.
2. Save a fictional typed entry; check extraction, task completion, deletion and refresh persistence.
3. Test microphone support/permission and language preference in a supported browser.
4. In local-only mode, verify no POST occurs and direct POST returns sync_disabled.
5. In explicitly enabled personal mode, approve one fictional entry, confirm a page in the intended data source with Raw Speech/Status/Date and task blocks.
6. Check GET config and POST error responses are no-store/nosniff.
7. Check a controlled mock failure/retry; ambiguous outcomes require checking Notion before confirming Retry.
8. Confirm firewall enforcement/usage in provider logs. Test rules with no production credentials.

## Troubleshooting

| Symptom | Meaning / action |
| --- | --- |
| Saved locally, no request | Browser flag false; intentional local-only default. |
| 403 sync_disabled | Server flag false/absent or Vercel Preview. |
| 403 origin_not_allowed | Exact origin missing/mismatched, malformed allowlist, or cross-site request. Do not use wildcard origins. |
| 503 server_not_configured | Missing/invalid token, UUID or origin config; fix server settings privately. |
| 400 / 413 / 415 | Input validation, size or content type failed. Full note stays local. |
| 429 | Capacity/upstream/provider limit; wait at least 60 seconds before manual retry. |
| 409 idempotency_conflict | Same recent ID with changed payload. Check Notion; do not blindly create a new ID to bypass it. |
| 502 notion_sync_failed | Notion rejected the write: inspect sharing, token, schema and numeric status. |
| sync_outcome_unknown / 504 | A page may already exist. Check Notion before retrying. |
| Notion 404/403/400 | Respectively inspect data-source ID/access, integration permissions/sharing, exact property schema. |
| Old browser behavior | Rebuild after a VITE flag change; verify correct deployment URL. |
| Browser storage warning | Preserve/back up original localStorage before repair; new changes may be temporary. |

## Rollback

After approval, use Vercel Deployments to select a known-good deployment and its supported rollback/promotion action. Do not roll back to the public-secret model with sensitive Notion credentials enabled. Safer immediate containment is to remove/restrict credentials and disable the write flag with a new reviewed deployment/provider rule. Rollbacks do not undo Notion pages, restore localStorage, or necessarily revert environment settings. Re-test headers, local capture and the disabled API before reopening access.
