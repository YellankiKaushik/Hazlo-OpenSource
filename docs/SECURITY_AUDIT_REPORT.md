# Hazlo security audit report

## A. Executive summary

- Audit date: **2026-10-28** (owner's Asia/Calcutta date).
- Repository: **YellankiKaushik/Hazlo-OpenSource**, public, GitHub default branch main.
- Baseline: **e6d10b040874cf135d3aaa66353c9b9ba3b0785a**, fetched origin/main before changes.
- Audited branch: **security/comprehensive-hardening**.
- Scope: tracked application/API/configuration/tests/docs, both dependency graphs, editable promotional tooling, generated browser assets and accessible Git history.
- Overall assessment: meaningful reduction of verified weaknesses; safe local-only defaults implemented. Enabled public anonymous Notion writes still carry material residual risk.
- Remediation: removed browser-shared authentication, bounded/validated requests, bounded Notion calls, reduced duplicate retries, safe persistence recovery, security headers, dependency patches and tooling isolation.
- Production readiness: **not approved for production release**. Owner review, environment migration and external abuse-control verification are outstanding.
- Final recommendation: **REVIEW REQUIRED — UNRESOLVED RISKS**.

No login, identity/session/JWT system, CAPTCHA, Redis, paid provider, analytics or external database was added. No production Notion write or intentional deployment was performed. Existing untracked media review files were preserved.

## B. Complete findings table

Evidence below describes source behavior and local tests; it is not a claim of observed exploitation.

| ID | Severity | Vulnerability | Affected file | Evidence | Fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| HZ-01 | High | Browser-public shared value treated as API authentication | src/services/notion.ts; api/notion-sync.js; env/docs | VITE_API_SECRET sent in X-API-Secret; backend compared it to API_SECRET. Vite exposes the value. | Remove the mechanism; separate exact opt-in flags; server-only credentials; explicit anonymous-write model. | Code fixed; owner must retire/rotate reused old values. |
| HZ-02 | High | Public endpoint can write to owner's data source; no default write isolation | api/notion-sync.js; src/store/useStore.ts | Baseline writes depended on publicly obtainable shared value. | Default local-only; explicit server/browser opt-in; Preview writes always disabled. | Default exposure fixed; enabling anonymous public writes remains a High residual risk. |
| HZ-03 | High | No reliable global abuse/rate control verified | API and external Vercel configuration | No edge rate-limit configuration in repository; no durable/global limiter. | Bounded payload/upstream work, four active creates per instance; exact documented external WAF rollout. | Partial: provider enforcement not configured/verified by this task. |
| HZ-04 | Medium | Oversized/invalid payloads and silent task truncation | api/notion-sync.js | No body/transcript/task-count rejection; task text/count silently sliced; status/date accepted/fell back. | 100 KiB/20,000/80/2,000 limits, JSON/content-type/fields/date/ID/status checks, explicit errors. | Fixed in handler; platform may parse bytes before handler. |
| HZ-05 | Medium | Unbounded upstream request and sensitive error logging | api/notion-sync.js | fetch had no deadline; upstream message and exception text logged. | 10s abort/deadline; fixed errors and numeric rejection status only; reject redirects. | Fixed; ambiguous outcome risk documented. |
| HZ-06 | Medium | Blind retries could multiply Notion pages; header had no backend effect | src/services/notion.ts; api/notion-sync.js; store | Automatic retries on network and 5xx; no durable deduplication. | Remove automatic POST retry, preserve snapshot/time, tab and bounded warm-instance coalescing/conflict checks, uncertain confirmation. | Reduced, not eliminated: no cross-instance durable idempotency/exactly-once guarantee. |
| HZ-07 | Low | Connectivity test created an actual Notion page | src/services/notion.ts | testNotionConnection POSTed a connectivity-check entry. | Remove destructive helper; named checkNotionSyncConfiguration uses GET, no upstream call. | Fixed; config check is explicitly not proof of integration connectivity. |
| HZ-08 | Medium | Persisted malformed state could crash/override store; storage failures not surfaced | src/store/useStore.ts | Default JSON hydration/merge, no validation or visible quota recovery. | Validate envelope/entries, copy data fields only, preserve invalid original and block writes, visible warning, legacy compatibility. | Fixed for handling; same-origin storage readability remains inherent. |
| HZ-09 | Low | Non-cryptographic entry IDs increased collisions | src/store/useStore.ts | Math.random substring. | crypto.randomUUID for new entries/rollover; accept old IDs. | Fixed; identifiers are not credentials. |
| HZ-10 | Medium | Missing deployed browser hardening policy | vercel.json; index.html | Only rewrites configured; inline theme script complicated strict CSP. | Self-host theme initializer; CSP/nosniff/framing/referrer/HSTS/permissions policy and API no-store. | Implemented/tested locally; deployment enforcement awaits owner release. |
| HZ-11 | Low | Unrelated hardcoded CORS origin and unnecessary secret header | api/notion-sync.js | Old hazlo-ai origin and X-API-Secret CORS allowance. | Explicit exact NOTION_ALLOWED_ORIGINS, approved preflight/Fetch Metadata, remove shared header. | Fixed; CORS does not prevent forged non-browser requests. |
| HZ-12 | High | Known dependency advisories in development/build tooling | package.json; pnpm-lock.yaml | Initial full audit: 22 advisories (7 high, 11 moderate, 4 low), all reported through dev/build paths. | Compatible same-major/minor-range patches, including Vite 7.3.7, Vitest 4.1.12, PostCSS 8.5.32 and transitives. | Final full and production audits: zero known advisories at execution time. Not proof of vulnerability-free packages. |
| HZ-13 | Low | Promotional Chromium sandbox disabled; server served arbitrary production-root files | tools/promo-video/scripts/lib.mjs; render.mjs; v2/render.mjs | --no-sandbox argument, generic root file server. Loopback exposure reduced scope. | Enable Chromium sandbox; reusable allowlisted loopback server with origin/host/method/path/realpath controls; no dependency build scripts allowed. | Fixed/tested; no video re-encoding or media changes. |
| HZ-14 | Medium | Local ignored Vercel link targets another named project | ignored .vercel/project.json | Selected non-secret metadata named hazlo-kaushik rather than hazlo-opensource. | Avoid Vercel CLI deployment/env commands; document owner verification/relinking. | Owner action required; ignored link untouched. |
| HZ-15 | Informational | Credential/privacy exposure was possible in public configurations/history | tracked text, built frontend, reachable commits | Pattern scan of 13 reachable baseline commits/current text found no token/private-key signature matches; frontend secret design still public by construction. | Retire old mechanism, preserve no-secret examples, add repeatable path-only scan and canary build checks. | No matching historical credential found; arbitrary secrets/audio/remote settings cannot be ruled out by pattern scan. |

## C. Root cause analysis

### Shared-secret/public write boundary (HZ-01, HZ-02, HZ-03)

The frontend needed the same value accepted by the backend, so any visitor could obtain it and imitate an entry request. Server-side Notion credential isolation protects the token's confidentiality but does not authorize the anonymous caller's write. Abusive requests could create pages or consume provider quotas.

The replacement does not invent a new frontend credential. Default false flags prevent writes even when credentials exist accidentally; the server independently checks enablement and refuses Preview writes. Exact origin/Fetch Metadata checks reduce browser cross-site submissions only. Owner-approved public enablement reopens anonymous writes, so external abuse/access controls and a non-sensitive destination remain required. No claim of owner-only access is made.

### Payload/upstream bounds (HZ-04, HZ-05)

Untrusted JSON had broad coercions/fallbacks and silently truncated task arrays/text, while a slow upstream could occupy a function for an unbounded period. Unknown fields and invalid types/statuses/timestamps now fail before upstream. Every accepted task/transcript is retained; the title alone may be shortened to Notion's limit. A fixed deadline bounds waiting and aborts fetch. Since a timeout may follow a remote commit, it is reported as uncertain rather than proof of failure.

Notion error bodies can echo user content. Only a numeric rejection status is logged, and only fixed safe error codes reach the browser. Body limits apply inside the handler; pre-handler platform parsing/invocation cost is not a globally enforced application ingress limit.

### Retry and recovery (HZ-06, HZ-07)

The client automatically repeated non-idempotent creates, including when the previous create could have succeeded. An idempotency-looking header did not guarantee delivery semantics. Automatic POST retry is removed. First-send content/time is persisted, matching concurrent requests coalesce, and manual uncertain retries warn/confirm. Recent warm-instance payload conflicts are rejected.

The bounded cache cannot coordinate different regions/instances or survive restart/expiry, so duplicates remain possible. Implementing durable deduplication correctly requires a shared transactional service and uncertain-outcome reconciliation, or an explicitly designed Notion contract change. No unrequested infrastructure/schema was introduced.

The old connectivity check had a write side effect; it is replaced by clearly named non-writing app-configuration verification. Actual Notion connectivity/schema is an owner-approved test, not a hidden startup write.

### Browser persistence and policy (HZ-08 through HZ-11)

localStorage is user/browser/script-controlled. Blind hydration could allow malformed entry structures into rendering or replace actions through merged state. Validation and field copying isolate the store, preserve legacy entries, and keep interrupted requests recoverable. Invalid original storage is deliberately not overwritten; users see a warning and can back it up. Quota failures keep in-tab edits and warn that persistence is unavailable. No superficial encryption or destructive migration was added.

A same-origin external pre-paint script preserves the existing theme logic under script-src self. React style attributes still require a style-only unsafe-inline exception. None is granted to scripts/eval. Policies retain microphone use and existing PWA metadata.

### Dependencies and tooling (HZ-12 through HZ-14)

Compatible stale tooling versions carried registry advisories, mainly file access/editor handling and denial-of-service risks in dev/build paths. The resolved graph was updated without React/Vite major upgrades; final audits pass. A native esbuild installation script remains allowlisted in the app workspace; independent promotional installation scripts are denied.

Video production opened a loopback server and disabled the browser sandbox. It now serves only expected HTML/JS/image/recording manifests, checks host/origin and resolved paths, and launches sandboxed Chromium. Both editable compositions still load/draw. The unrelated ignored Vercel project link was identified but never used to deploy/pull credentials or mutate a project.

## D. File-level implementation summary

Every changed/new file in this security change is listed below. Source application changes are limited to the requested security behavior; core speech/extraction/theme algorithms, styling, license, media and branding remain intact.

| File | Before → after / reason | Related findings / compatibility |
| --- | --- | --- |
| .env.example | Shared-secret/API-base examples → false sync flags, exact origin and server-only credential examples; retired-key notice. | HZ-01/02/11; existing installations need migration. |
| AGENTS.md | Matching shared-secret instruction → no-login/default-off/Preview/rate-idempotency invariants and audits. | HZ-01/02/03/06. |
| CONTRIBUTING.md | General safety rules → link threat model, mock writes, preserve no-login/Preview boundaries. | HZ-01/02/03/12. |
| Hazlo.md | Old configuration/status notes → optional sync, local state, retired secrets and no-login limits. | HZ-01/02. |
| README.md | Secret-based setup → opt-in configuration, anonymous-write risk, updated troubleshooting; videos/setup identity retained. | HZ-01/02/04/06/08. |
| SECURITY.md | New policy with threat model, disclosure route, owner controls, storage/retry limits and rotation. | All findings. |
| api/notion-sync.js | Permissive secret check/unbounded create → strict bounded handler, explicit config, preview denial, safe errors, deadline, warm coalescing. | HZ-01–07/11; timestamps/oversized tasks now reject, GET is non-writing. |
| api/notion-sync.test.js | Small contract suite → validation/boundary/headers/config/Preview/timeout/conflict/concurrency/cache regressions. | HZ-01–07/11; mocks only. |
| docs/ARCHITECTURE.md | Shared-secret flow → actual trust boundaries/local-first/opt-in/recovery model. | HZ-01–11. |
| docs/DEPLOYMENT.md | Old env/deploy procedure → explicit local-only/personal/Preview modes, owner WAF rollout, migration, verification/rollback. | HZ-01/02/03/10/14. |
| docs/PRODUCTION_CHECKLIST.md | Secret-match checklist → review gates, opt-in/schema/privacy/provider controls and local tests. | All findings. |
| docs/SETUP.md | Generate frontend secret → safe defaults/personal opt-in; retain beginner tool/Notion instructions. | HZ-01/02/06/08. |
| docs/TECHNICAL_DOCUMENTATION.md | Contradictory long old implementation notes → consolidated exact current runtime/API/storage/retry/headers/env reference. | All findings; no obsolete operational examples. |
| docs/SECURITY_AUDIT_REPORT.md | New source-based findings, evidence, complete file inventory and owner release actions. | Independent review deliverable. |
| index.html | Inline pre-paint theme code → external same-origin theme-init.js. | HZ-10; logic unchanged. |
| public/theme-init.js | New file containing previous theme initializer logic. | HZ-10; no inline script permission needed. |
| package.json | Old compatible minimum tooling specifiers → patched compatible versions, same app architecture/major versions. | HZ-12. |
| pnpm-lock.yaml | Old resolved graph → patched registry-resolved locked graph. | HZ-12; frozen install verified. |
| src/components/EntryCard.tsx | Retry without uncertainty distinction → local label/Sync action and confirmation for uncertain outcomes. | HZ-02/06; existing visual design retained. |
| src/pages/Home.tsx | No persistence/mode warning → local-only notice and visible storage warning. | HZ-02/08; no redesign. |
| src/services/notion.ts | Shared secret, cross-origin base, automatic retries/destructive connection check → same-origin/no credential, opt-in, limits/deadline/coalescing, manual recovery and GET config helper. | HZ-01/02/04/06/07; retired exports/env contract documented. |
| src/services/notion.test.ts | Secret/automatic-retry expectations → no-secret/disabled/uncertain/429/snapshot/coalescing/config-check tests. | HZ-01/02/04/06/07. |
| src/store/useStore.ts | Random IDs/blind storage/background sync/logging → UUIDs/safe hydration/opt-in/snapshots/no sensitive logs/local rollover copies. | HZ-02/06/08/09; original entries retained. |
| src/store/useStore.test.ts | Basic creation tests → disabled persistence, stable retry, duplicate retry exclusion, task/entry deletion, rollover and action-injection tests. | HZ-02/06/08/09. |
| src/store/storage.ts | New version-0 compatible validation, recovery copying and no-overwrite storage adapter. | HZ-08; no automatic deletion or stored-note truncation. |
| src/store/storage.test.ts | New legacy/oversize/interrupted/corrupt/quota/blocked-storage coverage. | HZ-08. |
| src/types/index.ts | Three sync statuses → explicit local state, uncertainty and immutable sync-payload types. | HZ-02/06; optional fields preserve old entries. |
| src/utils/security.test.ts | New policy/client-credential/theme initializer configuration regressions. | HZ-01/02/10. |
| vercel.json | SPA rewrites only → same rewrites plus security headers/API no-store. | HZ-10; actual provider enforcement requires reviewed deployment. |
| tools/promo-video/README.md | Render instructions → add sandbox/asset-server/security and historical-film recapture notes. | HZ-13; no video modifications. |
| tools/promo-video/package.json | Render-only scripts → isolated node:test server verification command. | HZ-13; dependency list unchanged. |
| tools/promo-video/pnpm-workspace.yaml | Independent workspace → additionally deny installation lifecycle builds. | HZ-12/13; installed Playwright/sharp still work. |
| tools/promo-video/scripts/lib.mjs | Disabled Chromium sandbox → explicit chromiumSandbox true and no unsafe switch. | HZ-13; run as ordinary user, compatible local browser verified. |
| tools/promo-video/scripts/render.mjs | Generic root file server → shared restricted renderServer. | HZ-13; renderer output logic unchanged. |
| tools/promo-video/v2/render.mjs | Generic root file server → same restricted server with V2 default document. | HZ-13. |
| tools/promo-video/scripts/server.mjs | New allowlisted loopback asset server with CSP/method/host/origin/path/realpath checks. | HZ-13. |
| tools/promo-video/scripts/server.check.mjs | New raw HTTP/asset/private-path/cross-origin/host tests. | HZ-13. |
| tools/security/README.md | New exact reproducible local verification commands and limits. | All verification. |
| tools/security/scan.mjs | New path-only signature scan of tracked/current text/history and browser builds. | HZ-01/15; not a guarantee against arbitrary secrets. |
| tools/security/links-check.mjs | New local Markdown and HTML image/link target check. | Documentation consistency. |
| tools/security/browser-check.mjs | New fresh browser local server/CSP/capture/theme/language/speech-mock/storage/mobile/optional mocked retry integration checks. | HZ-01/02/06/08/10; zero real writes. |
| tools/security/render-check.mjs | New sandboxed loading/frame smoke check for both existing compositions, no full encoding. | HZ-13. |

Unchanged: src/utils/taskExtractor.ts, speech controller/hook, theme helpers/hook, src/index.css, API Notion schema/API version, PWA manifest/icons, LICENSE, all MP4s/thumbnails/captions and production application identity. Root pnpm-workspace esbuild allowlist and independent promo lockfile were already appropriate and unchanged.

## E. Final security architecture

The frontend captures and renders text locally, validates persisted shape and uses no private API credential. Remote sync is a non-secret build-time option. The backend independently defaults off, checks Preview/config, accepts only bounded typed payloads and approved browser origins, creates at a fixed Notion URL with server credentials, and never returns/logs private upstream content.

No user identity is established. Origin/CORS, unguessable UUIDs and rate limits do not establish ownership. Disabled public demos cannot write through this handler. Enabled personal endpoints remain anonymously writable unless independently restricted.

Code contains practical per-instance bounds and temporary coalescing; it deliberately does not claim global rate limiting or durable idempotency. WAF/access configuration remains external owner work. HTTP policies harden browser execution/framing/permissions without altering capture/design. Persisted old data is recoverable rather than silently erased.

## F. Test execution report

Results are from actual local execution, not CI assertions. Node.js **24.16.0**, pnpm **11.2.2**, Vite **7.3.7**, Vitest **4.1.12** were used.

| Test/check | Command | Result | Notes |
| --- | --- | --- | --- |
| Frozen application install | pnpm install --frozen-lockfile | PASS | Exact package/lock agreement. |
| TypeScript | pnpm typecheck | PASS | tsc --noEmit. |
| Unit/security regression | pnpm test | PASS | **9 files, 138 tests, 0 failures**. Baseline suite had 7 files/45 tests. |
| Production build | pnpm build | PASS | 1,685 modules; default local-only output. |
| Runtime dependency audit | pnpm audit --prod | PASS | Zero known advisories at execution time. |
| Complete dependency audit | pnpm audit | PASS | Zero known advisories; baseline 22 dev/build advisories remediated. |
| Independent promo frozen install | pnpm --dir tools/promo-video install --frozen-lockfile | PASS | Existing lock/dependencies retained. |
| Independent promo audit | pnpm --dir tools/promo-video audit | PASS | Zero known advisories before and after. |
| Hardened render server | pnpm --dir tools/promo-video test | PASS | 1 node:test case including assets/private paths/Origin/Fetch Metadata/raw Host checks. |
| Local-only browser regression | node tools/security/browser-check.mjs | PASS | Real Chromium UI/store under enforced headers; manual/tasks/deletion/refresh/theme/language, simulated WebKit speech, mobile/XSS-like text/corrupt-data checks. |
| Enabled browser regression | node tools/security/browser-check.mjs --enabled | PASS | Separate opt-in build, every write mocked; cancel/confirm unknown retry and unchanged payload after local edits. |
| Browser secret canary | Separate opt-in Vite build with fake legacy/server canaries; scan both builds | PASS | Neither marker nor retired secret/token identifiers appear in either emitted frontend. |
| Editable composition smoke | node tools/security/render-check.mjs | PASS | Both sandboxed 1920×1080 compositions load/draw under restricted server; no full re-render. |
| Credential/history scan | node tools/security/scan.mjs --history | PASS | 97 staged/current text files, 8 emitted browser files, 13 reachable baseline commits; no matching signatures. |
| Local documentation paths | node tools/security/links-check.mjs | PASS | 20 Markdown files, 57 local link/image targets, zero broken paths. |
| Whitespace | git diff --check; git diff --cached --check | PASS | Staged and working diffs checked; an earlier trailing EOF blank line was repaired. |
| Real microphone/vendor transcription | Owner browser after approved release | BLOCKED / not exercised | Synthetic recognition used; no live private audio transmitted. Capability/controller unit regressions retained. |
| Real Notion writes/credentials | Owner-controlled single fictional entry after approval | BLOCKED by task scope | Mocks only; no production write permitted. |
| Vercel active firewall/project settings | Read-only target project inspection | BLOCKED | Filtered project listing found hazlo-opensource; detailed get_project returned 404, so live production branch/rules/env enforcement were not independently verified. |
| Provider header enforcement | Reviewed deployment after approval | BLOCKED by release gate | Local harness applied actual config; production not deployed. |
| GitHub Actions | None required | Not used | No .github workflows were present; no workflows/billing changes added. Local results are independent of quota. |

A new render-server test initially failed because Node fetch did not send the requested custom Host header. It was corrected to use raw HTTP so the intended hostile Host actually reaches the server; the server rejected it and the final test passes. No assertion was weakened. Earlier API tests intentionally changed from timestamp fallback/secret/automatic-retry expectations to the stricter requested contract.

Local browser/QC results/screenshots live under ignored artifacts/security; they contain fictional text only and are not committed. Browser speech remains dependent on vendor support and actual permissions. These tests are not a production penetration test or formal proof.

## G. Before/after comparison

| Area | Baseline | Security branch |
| --- | --- | --- |
| Browser secret | Public Vite value treated as shared auth | Removed; no replacement frontend credential. |
| Unauthorized writes | Public shared value allowed writes | Off by default and always off in Preview; enabled anonymous exposure remains. |
| Validation | Permissive coercion, fallback timestamps, sliced tasks | Bounded typed JSON/fields, reject invalid timestamps/oversize without losing local note. |
| Global abuse limits | None verified | Still external; code only adds per-instance capacity bounds. |
| Retry safety | Automatic repeated creates, ineffective header-only semantics | Manual/uncertain confirmation, stable snapshot, tab/warm coalescing; no exactly-once claim. |
| Persistence | Blind hydration, no quota warning | Validate/copy fields; preserve invalid original, warn on temporary changes. |
| Browser headers | Rewrites only | Compatible CSP/permissions/framing/referrer/HSTS/nosniff/API no-store. |
| Supply chain | 22 dev/build advisories | Zero known advisories in both graphs at audit time, compatible updates. |
| Errors/logs | Upstream message/exception content logged | Fixed codes and numeric status only. |
| Connectivity check | Real page write | Removed; clearly named non-writing configuration check. |
| Media tooling | Unsandboxed Chromium/general file serving | Sandboxed Chromium, restricted loopback assets. |

## H. Remaining issues and owner actions

| Issue | Severity | Why it remains | Infrastructure / owner action | Next step |
| --- | --- | --- | --- | --- |
| Anonymous public write access when explicitly enabled | High | No identity/auth by deliberate product requirement | Owner must decide acceptable exposure; independent network/provider restrictions if needed | Keep demos disabled; dedicated minimal-scope Notion destination. |
| Global rate limiting not configured/verified | High for enabled public writes | Warm-instance state cannot enforce cross-instance traffic limits | Owner Vercel Firewall/access config, plan/price review | Log/tune/test/publish endpoint-specific rules before enabling writes; otherwise keep disabled. |
| Durable duplicate protection | Medium | No transactional shared store and uncertain Notion commit outcomes | Additional durable design would require infrastructure/contract approval | Check Notion before manual retry; do not claim exactly-once. |
| Legacy public secret/deployments | Medium | Prior frontend bundles may remain public | Owner removes env values, rotates reused credentials and audits old endpoints/deployments | Retire values and restrict/remove unsafe old deployments after review. |
| Local Vercel link mismatch | Medium operational risk | Existing ignored project metadata belongs to another named project | Owner must verify/relink to intended Hazlo-OpenSource project before CLI work | No CLI deployment/env pull performed here. |
| Browser/localStorage privacy and quotas | Informational/Medium on shared device | Personal local-first architecture and browser policies | User backups/private browser profile | Do not store highly sensitive content; preserve original storage before repairs. |
| Actual provider/voice/Notion verification | Medium release gate | Production changes/writes prohibited; detailed Vercel API access returned 404 | Owner tests reviewed deployment with dedicated fictional data | Follow deployment checklist after approval. |
| Advisory/secret scanning limits | Informational | Registries/signature scanning have incomplete coverage | Continued review/audits | Re-run on future changes; rotate any actually exposed token. |

## I. Exact Vercel/environment migration requirements

No provider values or rules were changed by this task.

1. Confirm the correct Hazlo-OpenSource Vercel team/project and Production branch main. Verify the local ignored Vercel link before using any CLI environment/deploy command.
2. Public demo: set NOTION_SYNC_ENABLED=false and VITE_NOTION_SYNC_ENABLED=false (or leave absent); remove real Notion credentials from its deployment.
3. Personal enabled instance only: add NOTION_SYNC_ENABLED=true, VITE_NOTION_SYNC_ENABLED=true, server-only NOTION_TOKEN and NOTION_DATA_SOURCE_ID, and exact NOTION_ALLOWED_ORIGINS=https://your-own-app.vercel.app (replace with real origin, no trailing slash). Local Development uses its actual localhost origin/port.
4. Do not give Preview Notion credentials. Use VITE_NOTION_SYNC_ENABLED=false for Preview; server VERCEL_ENV=preview always refuses writes.
5. Remove API_SECRET, VITE_API_SECRET and VITE_API_BASE_URL in every environment/local file. Retire the browser-exposed value and rotate it anywhere reused. If a Notion token was exposed/suspected abused, rotate it in Notion and privately update server config; inspect unauthorized pages.
6. Configure exact-path /api/notion-sync, method POST edge rate limiting. Begin generous/log-only (e.g. 60/IP/60s), inspect normal traffic, test Preview enforcement with no live writes, then owner-publish a suitable personal threshold (e.g. 10/IP/60s). Check plan costs/false positives and monitor usage; per-IP enforcement still permits distributed abuse. No paid service added automatically.
7. Independently restrict access if anonymous write exposure is unacceptable, or leave sync disabled. CORS/Origin must never be called authentication.
8. After independent review and explicit release approval, rebuild for browser flag changes and redeploy with the migrated environment. Inspect actual header/CSP behavior, modes, storage/voice/mobile regression and one approved fictional personal sync.
9. Review rollback before release. A previous insecure deployment is not a safe rollback with sensitive writes enabled. Contain via disabled writes/credentials/provider controls; Notion pages and localStorage are not automatically rolled back.

See [SECURITY.md](../SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md), [SETUP.md](SETUP.md) and [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).

## J. Git and release record

- Branch: security/comprehensive-hardening; baseline SHA e6d10b040874cf135d3aaa66353c9b9ba3b0785a.
- Release intent: commit reviewed changes and push **only the security branch** to origin; optional **draft** PR into main. No merge/main push/production deployment authorized.
- Exact final commit identity: resolve with `git log -1 --format='%H %s' origin/security/comprehensive-hardening` after fetch; the final response/remote branch identifies the published commit. A commit cannot embed its own SHA in this tracked report.
- Intended commit: security: harden anonymous Notion sync and local persistence.
- Changed-file inventory: section D, plus `git diff --name-status e6d10b040874cf135d3aaa66353c9b9ba3b0785a...origin/security/comprehensive-hardening`.
- Push/draft-PR outcome: recorded in the final publication addendum after the authorized attempt; do not infer success from intent.
- main: remains at the baseline during implementation; verify again at completion.
- Production: no deploy/promote/rollback or production Notion writes performed.
- Automation: no Actions workflows added/enabled. A branch push may trigger existing Vercel Preview automation; this is not a production release. Live provider settings were not fully accessible.
- Pre-existing untracked media review/QC/V1 exports and production notes were not staged, stashed, deleted or overwritten. Existing branches/history retained.
- GitHub connector identity verified as YellankiKaushik; origin is Hazlo-OpenSource. No other repository remote was used.

## K. Final recommendation

**REVIEW REQUIRED — UNRESOLVED RISKS**

The branch is ready for independent code/security review with passing local checks. It is not a declaration that an enabled anonymous public writer is fully secure or production-ready. Keep public demos local-only and complete owner environment/rate-limit/rotation/deployment checks before an approved release.

References: [Notion request limits](https://developers.notion.com/reference/request-limits), [Vercel WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting), [Vercel Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js). Implementation limits may be stricter than provider limits.
