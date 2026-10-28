# Production verification checklist

This branch requires independent owner security review. Do not merge/deploy it automatically.

## Before enabling remote writes

- [ ] Review [SECURITY.md](../SECURITY.md) and [audit report](SECURITY_AUDIT_REPORT.md).
- [ ] Keep public demonstrations local-only: both flags false, no production Notion token.
- [ ] For personal sync only: both NOTION_SYNC_ENABLED and VITE_NOTION_SYNC_ENABLED are exactly true.
- [ ] Server-only NOTION_TOKEN and valid NOTION_DATA_SOURCE_ID belong to your own dedicated integration/data source.
- [ ] NOTION_ALLOWED_ORIGINS contains only exact approved origins; no trailing slash/wildcard.
- [ ] Retire API_SECRET/VITE_API_SECRET/VITE_API_BASE_URL; rotate exposed/reused credentials.
- [ ] Preview receives no Notion token and a false browser flag. Verify server Preview writes fail closed.
- [ ] Configure and verify edge firewall/rate-limit/access controls; they are not implemented globally in code.
- [ ] Accept documented anonymous-write and duplicate-page risks, or leave sync disabled.

## Schema and functionality

- [ ] Raw Speech is Title; Status is Status with Not started/In progress/Done; Date is a custom Date property.
- [ ] Integration is connected to the data source with minimum read/insert capabilities.
- [ ] Voice (both supported constructors), manual capture and speech-language persistence work.
- [ ] Local entries survive refresh; tasks toggle/delete; entries delete; rollover makes local copies once.
- [ ] Light, dark and system themes, responsive layout, manifest/icons remain intact.
- [ ] Disabled capture shows Saved locally and issues no sync POST.
- [ ] For owner-approved personal tests only, one fictional entry reaches Notion with original capture time and all accepted tasks.
- [ ] Failed sync remains recoverable; check Notion before confirming Retry for uncertain outcomes.
- [ ] Corrupt/quota-blocked storage warns without overwriting original saved notes.

## HTTP and privacy

- [ ] Actual deployed CSP permits self scripts/connections, styles and microphone; no CSP errors.
- [ ] nosniff, no-referrer, DENY framing, HSTS and Permissions-Policy are present.
- [ ] API errors/success/config checks use no-store.
- [ ] Malformed/oversized/cross-site POSTs fail without upstream requests.
- [ ] No credentials/transcripts appear in browser assets, logs or the staged diff.
- [ ] Existing old deployments no longer expose a reused secret or a sensitive writable endpoint.

## Local verification

- [ ] pnpm install --frozen-lockfile
- [ ] pnpm typecheck
- [ ] pnpm test
- [ ] pnpm build
- [ ] pnpm audit --prod and complete pnpm audit
- [ ] Isolated tools/promo-video frozen install and audit
- [ ] git diff --check and security scan

Use pnpm dev for local-only UI; use vercel dev for same-origin local API tests. Do not overwrite a manually configured .env.local with vercel env pull. No real production writes, deployment or GitHub Actions quota changes are required for local verification.
