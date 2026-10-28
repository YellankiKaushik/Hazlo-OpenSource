# Security release readiness — Phase 2

> Phase 3 follow-up (2026-10-28): the sections below retain Phase 2 evidence. The current decision, provider-operation ledger, exact failed gates and owner resolution steps are in [SECURITY_FINAL_RELEASE_REPORT.md](SECURITY_FINAL_RELEASE_REPORT.md). Fresh Phase 3 checks passed with 146 tests / 9 files. The ignored local project link has been safely corrected and both new Preview-only flags were added as false. Main/Production remain at e6d10b040874cf135d3aaa66353c9b9ba3b0785a; PR creation still fails with connector 403. **BLOCKED — RELEASE GATES NOT SATISFIED** because review, active endpoint throttling and Production settings are incomplete. Historical statements that the local link is untouched or all new flags are absent no longer describe the Phase 3 state.

Audit date: **2026-10-28**, Asia/Calcutta. This is an independent follow-up to the [Phase 1 audit](SECURITY_AUDIT_REPORT.md). Results below were re-executed or inspected; prior claims were not accepted solely from the earlier report.

## A. Executive decision

**REVIEW REQUIRED — UNRESOLVED RISKS**

Code fixes and local verification are complete, with **146 passing Vitest tests across 9 files**, zero final test failures and zero known registry advisories in both dependency graphs. The corrected security Preview was verified at the exact implementation commit, including real headers, disabled API behavior and browser interaction. Its accidental test-runner function has been removed.

Production remains on the original main commit. Production environment migration and endpoint-specific global rate limiting are **not complete**. An enabled anonymous public writer is not owner-only; durable exactly-once delivery is not provided. A merge without preparing the new flags will intentionally stop automatic Notion sync. Independent owner approval is required before release.

Operational exception: Vercel CLI curl unexpectedly created one persistent protection-bypass token for the incorrectly linked hazlo-kaushik project. It was never disclosed or committed. After the owner's explicit narrow authorization, that exact newly created token was identified and revoked without regeneration; remaining token count is zero and no bound automation-bypass environment entry remains. No production app deployment, Notion write, Notion credential rotation, firewall mutation or paid activation occurred. See D and M for evidence and safeguards.

## B. Repository identification

| Item | Independently verified value |
| --- | --- |
| Repository | [YellankiKaushik/Hazlo-OpenSource](https://github.com/YellankiKaushik/Hazlo-OpenSource) |
| Branch | security/comprehensive-hardening |
| Phase 2 starting SHA | efd576e4406208d9ad296fbe901b1d6f49dc1ef5 |
| Corrected implementation / tested Preview SHA | **6cf0b173e86fc03aa1cb650271386968acc7af79** |
| Main / origin/main / original comparison baseline | **e6d10b040874cf135d3aaa66353c9b9ba3b0785a** |
| Phase 1 implementation | 4765e16aecd6eb23defa47c4c57b9c2be762f7dd |
| Commits at implementation verification | 3 ahead / 0 behind main; final report publication adds one documentation-only commit. |
| Changed files | 44 paths at corrected implementation; this new readiness file makes **45** paths versus main. Phase 2 implementation commit changes 12 paths, including a 99%-preserved test move; this report and the audit addendum are documentation follow-up. |
| Mergeability | Clean git merge-tree --write-tree origin/main HEAD; no branch integration performed. |
| Draft PR | BLOCKED: GitHub connector HTTP 403, Resource not accessible by integration; gh CLI unavailable. |
| Comparison / create-PR entry | [main...security/comprehensive-hardening](https://github.com/YellankiKaushik/Hazlo-OpenSource/compare/main...security/comprehensive-hardening?expand=1) |

The final report publication commit cannot embed its own SHA in this file. Resolve the final branch publication SHA with git log -1 --format='%H %s' origin/security/comprehensive-hardening after fetching; the final task delivery also provides it. The exact code/runtime verification point above is immutable. A documentation-only publication does not change the tested application code.

Initial fetch confirmed main had not moved and the security branch contained exactly the two known Phase 1 commits. Existing untracked media/QC/V1 exports and notes were not overwritten, stashed, deleted or staged. No branch was deleted, recreated, rebased or force-pushed.

## C. Previous findings independently verified

PASS means the stated code protection was verified, not that all associated risk vanished.

| ID | Severity | Claimed fix | Independent verification | Result | Remaining risk |
| --- | --- | --- | --- | --- | --- |
| HZ-01 | High | Remove browser shared-secret auth | Reviewed client/API/env/docs; unit protocol assertions; canary builds; actual Preview JS scan. No VITE_API_SECRET/X-API-Secret protocol remains. | PASS in branch | Legacy production env/bundles still require retirement at approved cutover. |
| HZ-02 | High | Default-off writes and Preview denial | API tests exact flag/Preview/missing config; actual Preview GET enabled=false/configured=false; synthetic POST 403 sync_disabled. | PASS | Explicitly enabled public writes remain anonymous. |
| HZ-03 | High | Bounds plus owner global abuse controls | Four-active/256-ID bounds tested; correct project's custom rules list returned empty/no draft. | PARTIAL | No endpoint-specific global rate limit is active; owner must configure before anonymous writes. |
| HZ-04 | Medium | Strict bounded validation | API malformed JSON/UTF-8/content type/encoding/fields/status/calendar/ID/byte/Unicode/task boundaries; title/body preservation; new client aggregate-byte guard. | PASS | Platform parsing/invocation cost occurs before handler rejection. |
| HZ-05 | Medium | Deadline/safe diagnostics | Mocked hung fetch, abort, upstream 408/5xx/errors; fixed safe responses and numeric-status-only logging inspected. | PASS | A timeout cannot prove Notion did not commit a page. |
| HZ-06 | Medium | Manual recovery/snapshots/coalescing | Concurrent/conflict/expiry/cold-instance tests; local mocked browser confirms original payload after edits; new HTTP 408/409 uncertainty fix. | PASS for mitigation | Warm cache is not durable; different instances/restarts/expiry may duplicate. |
| HZ-07 | Low | Non-writing configuration check | Client checkNotionSyncConfiguration GET and actual deployed GET; no upstream Notion request in config path. | PASS | Config check is not proof of token permissions/schema/live connectivity. |
| HZ-08 | Medium | Defensive storage/recovery | Legacy/corrupt/quota/blocked/pending hydration tests; real local/Preview persistence and corrupt warning; new cross-tab and snapshot-binding tests. | PASS with additional fixes | Same-origin readability remains; stale detection is not transactional multi-tab merging. |
| HZ-09 | Low | UUID new identifiers / legacy support | Store code and UUID assertion, legacy hydration fixtures, original capture time preservation. | PASS | IDs are not identity/authentication. |
| HZ-10 | Medium | Compatible HTTP policy | Actual Preview root/API CSP, nosniff, referrer, framing, HSTS, permissions and no-store; zero observed CSP errors during real browser flows. | PASS in Preview | Production HEAD confirms these new headers are not deployed there yet, except existing provider HSTS. |
| HZ-11 | Low | Exact CORS / remove obsolete origins/header | API origin/preflight/Fetch Metadata tests; source no stale hazlo-ai origin or shared-secret allowance. | PASS | A non-browser client can forge Origin; no identity inferred. |
| HZ-12 | High | Patch dependency advisories | Reinstalled frozen lockfiles; reran production/full/root and isolated promo audits; no added dependency or lockfile change in Phase 2. | PASS: zero known advisories | Registry audit is not proof of absence of unknown supply-chain vulnerabilities. |
| HZ-13 | Low | Sandbox/restrict video tooling | Isolated node:test server checks; both existing compositions load/draw in sandboxed Chromium. | PASS | Ordinary local tools still need trusted source/executables; no full video regeneration performed. |
| HZ-14 | Medium | Identify wrong ignored Vercel link / avoid unsafe commands | Root link still names hazlo-kaushik; verified separate project ID/Git association for hazlo-opensource through CLI; isolated context used for further checks. | PARTIAL; incident cleaned up | Root link must be corrected before future project-context operations; CLI curl can mutate protection settings. |
| HZ-15 | Informational | Credential/history/bundle scan | Repeat signature scan over tracked/current text, accessible history and both generated builds; actual Preview JS checked; no matches. | PASS within scan scope | Cannot rule out arbitrary secrets, inaccessible history, audiovisual/private provider content. |

## D. New findings, reproductions and fixes

### P2-01 — Unnecessary deployed test-runner function (Medium)

Evidence: vercel inspect on the Phase 1 Preview listed **api/notion-sync.test** (288.34 KB) beside the real API. Source api/notion-sync.test.js:1 lived inside Vercel's deployable route tree. This confirms extra attack/build surface and resource cost; no credential disclosure or remote code execution was demonstrated.

Fix: moved the existing test file to [tests/api/notion-sync.test.js](../tests/api/notion-sync.test.js), preserving all assertions and adding an explicit Notion API-version assertion. [src/utils/security.test.ts:7](../src/utils/security.test.ts) prevents test-runner files returning to api. The corrected Preview's actual deployment lists only api/notion-sync (5.52 KB). No test was deleted to obtain passing results.

### P2-02 — Timeout/conflict retry warning gap (Medium)

File: src/services/notion.ts:31 and :50. A gateway HTTP 408 or recent-ID 409 could produce a failed entry without syncUncertain; the UI could then retry without its duplicate warning. A retry after an ambiguous create could produce a duplicate, particularly across instances.

Focused tests first failed for both statuses. The client now classifies 408 as unknown and 409 as uncertain, preserving manual confirmation and never automatically repeating POST. Regression tests pass. Durable exactly-once delivery remains out of scope.

### P2-03 — Stale tab could overwrite newer saved notes (Medium)

File: src/store/storage.ts:43–73. Two independently hydrated tabs could save whole snapshots, silently replacing a newer note from the other tab. A focused storage test reproduced this data loss.

The adapter now compares the current persisted string with its last read/write before updating. A different value locks further writes for that tab, preserves the newer stored data and warns that this tab's new edits are temporary. Unit and real two-page local browser tests pass. This is best-effort stale-write detection, not atomic cross-tab transactions; back up temporary edits before reload, and prefer one editing tab.

### P2-04 — Retry snapshot shape lacked ownership binding (Low)

File: src/store/storage.ts:21–22. A syntactically valid persisted syncPayload could identify another entry or carry a different capture time/transcript. This is a confirmed state-integrity gap; an attacker who already controls same-origin JavaScript has broader powers, so it is not an independent remote privilege escalation.

Validation now binds snapshot clientEntryId, normalized capture instant and raw transcript to its owning entry. Tests cover all three mismatches; invalid storage remains recoverable rather than erased. Local task edits remain allowed to differ from the immutable first-send task snapshot.

### P2-05 — Client omitted aggregate request-byte preflight (Low)

File: src/services/notion.ts:67. Individually acceptable Unicode fields could serialize beyond the backend's 100 KiB limit, causing an unnecessary large request. Server-side enforcement already prevented upstream writes, so the backend was not bypassed.

A new failing test used valid-length multibyte strings. The client now measures serialized UTF-8 with TextEncoder before fetch and shows all sync limits, including 100 KiB, while retaining the full local entry. The regression passes with zero fetch calls.

### P2-06 — CLI protected-access side effect on mismatched local project (Medium operational incident; cleaned up)

During read-only Preview access, Vercel CLI 54.4.1 curl unexpectedly generated a persistent deployment-protection bypass token using the original local link, even though a different explicit deployment was supplied. The request then failed because PowerShell's script shim/argument forwarding sent --scope to curl. No protected page request succeeded via that command.

Affected provider project: hazlo-kaushik, prj_HHJWd3ACeT8xdbgrZ24U1bXNYb62. Token creation timestamp: **2026-10-28 11:31:34.278 UTC / 17:01:34.278 IST**. No value was printed, saved in repository source, or committed.

The owner specifically authorized identifying/revoking **only this new token** and instructed preserving existing tokens/settings. Metadata showed exactly one automation-bypass token, matching that exact creation timestamp and current CLI actor. The cleanup rechecked project identity and uniqueness, revoked that token through the standard API with regenerate=false, then verified zero remaining tokens and no bound VERCEL_AUTOMATION_BYPASS_SECRET env entry. No pre-existing tokens were present.

Further protected tests used a correctly linked ignored isolated context and short-lived development OIDC, scoped to the exact Preview origin. No additional persistent bypass secret was created. Future read-only reviews must avoid this CLI curl auto-generation behavior. The original ignored link remains untouched; owner correction is required.

### P2-07 — Confirmed production migration gap (High release blocker; no provider mutation performed)

Read-only variable metadata shows NOTION_TOKEN/NOTION_DATA_SOURCE_ID in Production and API_SECRET/VITE_API_SECRET in Production + Preview. None of NOTION_SYNC_ENABLED, VITE_NOTION_SYNC_ENABLED or NOTION_ALLOWED_ORIGINS is configured. Development has no listed application variables.

Merging without owner preparation deploys the intentional default-off behavior and stops current automatic Notion syncing. This is a required configuration migration, not grounds to remove secure defaults. See H and L for safe sequencing. Credential values were never printed.

## E. GitHub review status

- Current feature branch is pushed and preserved; no main push, merge, force push or branch deletion.
- Implementation history: 4765e16 (Phase 1 hardening), efd576e (Phase 1 report), **6cf0b17 (Phase 2 verified fixes)**. This readiness/audit publication adds one documentation-only commit; exact publication SHA is delivered separately.
- The code commit changes 12 paths; full branch versus main is 45 paths after this report. The API tests were moved, not dropped. No binary/media/license/extraction/speech/theme-styling changes.
- Clean merge-tree verification; zero commits behind main. Main remains at e6d10b040874cf135d3aaa66353c9b9ba3b0785a.
- Draft creation retried using authenticated YellankiKaushik connector: **403 Resource not accessible by integration**. Installed gh CLI unavailable. No permission, repository setting or credential was changed to work around this.
- [Exact review/create-PR URL](https://github.com/YellankiKaushik/Hazlo-OpenSource/compare/main...security/comprehensive-hardening?expand=1). This is a comparison URL, not a fabricated PR.
- GitHub reported successful Vercel status for the prior branch head; queried PR-triggered workflow runs were empty, and no .github workflows are configured. No workflow/quota/billing mutation was made.

Prepared draft title: **security: harden anonymous Notion sync and prepare Hazlo for secure release**.

Prepared summary: remove exposed frontend authentication; preserve no-login/local-first capture; require explicit personal sync; enforce bounded typed JSON and safe upstream failures; provide manual uncertain recovery/best-effort coalescing; protect stored notes; apply tested headers; retain compatible dependency patches; include 146 passing tests and real Preview verification. State anonymous-write/durable-idempotency/rate-limit limitations, required environment/credential migration and pending owner production approval. Link this report and the Phase 1 audit. Do not merge automatically.

## F. Vercel deployment verification

| Field | Verified evidence |
| --- | --- |
| Team | Kaushik Yellanki Project / kaushik-yellanki-project |
| Team ID | team_UYEpjjRaObtrYF55SYu5rqUl |
| Plan | Hobby (read-only team metadata). |
| Correct project | **hazlo-opensource**, prj_j31V27y7KOW9YrXYTWfqQxB8XAGW |
| Git integration | github / YellankiKaushik / Hazlo-OpenSource |
| Production branch / root / Node | main / repository root (null setting, CLI displays .) / 24.x |
| Production deployment | dpl_C4xKNuuFpPkSGRg69NXh3L54GkiU, main, baseline SHA e6d10b0… |
| Original security Preview | [efd576e Preview](https://hazlo-opensource-7aa3pa3u0-kaushik-yellanki-project.vercel.app), Ready, target Preview, dpl_8uL4KQJZYsTv6u4CZi4KvyTLBZ9B |
| Corrected code Preview | [6cf0b17 Preview](https://hazlo-opensource-o5zlmoyk1-kaushik-yellanki-project.vercel.app), Ready, target Preview, dpl_EuW7GrMMHdNLkYVExhvogFbGXNaQ |
| Corrected Preview SHA | 6cf0b173e86fc03aa1cb650271386968acc7af79 |
| Protection | Existing Vercel Authentication, all_except_custom_domains; anonymous Preview request redirects to SSO. |
| Authorized test access | Short-lived development OIDC; header scoped only to exact verified Preview origin; no global browser credential header. |
| Functions after fix | Only api/notion-sync (5.52 KB); earlier test-runner function absent. |
| Provider access limitation | Connector explicit team/project calls returned empty/404/403; scoped CLI read-only calls succeeded. Full firewall overview hits an optional Pro/Enterprise IP Bypass 402; custom rules listing succeeds independently. |

Both immutable Previews were tested. For each: configuration GET 200 with enabled=false/configured=false; one fictional POST 403 sync_disabled; API Cache-Control=no-store; zero real Notion writes. The actual app browser made zero sync POSTs while capturing in local-only mode.

Actual deployed root and API headers match configuration:

- CSP: default/script/connect/font/worker self; style self + unsafe-inline; images self/data; media self/blob; no objects, framing, external base/form destinations; upgrade insecure requests.
- X-Content-Type-Options: nosniff.
- Referrer-Policy: no-referrer.
- X-Frame-Options: DENY.
- Strict-Transport-Security: max-age=31536000.
- Permissions-Policy: microphone=(self); camera/geolocation/payment/USB disabled.
- Root HTML: public, max-age=0, must-revalidate. API configuration/rejection: no-store.

Real Preview browser PASS: app/JS/CSS load; manual entry; rule-based tasks; task complete/incomplete/delete; entry delete; refresh persistence; light/dark/system themes; pre-paint theme restoration; 390px responsive layout; manifest and three PNG icons; corrupt-storage warning/preservation; no runtime exceptions; no observed CSP violations; no third-party request attempts; loaded JS had no credential-signature/retired-secret identifier matches.

A production-only read-only HEAD returned 200 with existing provider HSTS max-age=63072000; includeSubDomains; preload, but no CSP/nosniff/referrer/frame/permissions headers. This is evidence that the new policy is **not in production**, not a failed Preview fix. No production note or API write was attempted.

Safe browser evidence is ignored under artifacts/security, including phase2-preview-efd576e4.json and phase2-preview-6cf0b173.json. They contain only fictional test data, headers, URLs and pass results, never tokens. The later documentation-only branch publication may create another Preview; code identity is unchanged and final publication verification is reported in task delivery.

## G. Firewall and abuse protection

Verified custom rule list: **rules=[]; hasDraft=false; pendingChanges=0** for the correct project. No endpoint-specific global limiter is configured. Automatic platform DDoS services are distinct from application write quotas; no claim is made that they provide owner authorization.

Current [Vercel documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) lists one Hobby rate-limit rule within three custom rules, IP counting and fixed windows; the published included allowance is one million allowed requests. Regional pricing is documented (example $0.50/million allowed requests). Owner must review the actual plan/billing confirmation before publishing; no entitlement upgrade or charge was activated here.

Proposed owner rule: exact path **/api/notion-sync**, method **POST**, count **IP**, fixed **60s** window. Start **60 requests/IP/window**, action **Log**; inspect normal usage. After reviewing shared-IP/mobile retry behavior, consider **10/IP/60s**, action **rate_limit (429)**. Do not apply the rule to assets or unrelated routes. Distributed clients can evade per-IP limits; no rate limit makes this owner-only.

Exact owner dashboard steps (not executed):

1. Open the verified hazlo-opensource project → Firewall → custom rules.
2. Add matching conditions Path equals /api/notion-sync AND Method equals POST.
3. Select rate limit, IP counting, fixed 60-second window, initial 60 request limit and Log on excess.
4. Review cost/availability and full draft; owner approves/publishes only after confirming the target.
5. Inspect Firewall traffic filtered to this rule; account for NAT/shared IPs and manual retries.
6. Test Preview enforcement with sync disabled and fictional requests, then inspect proposed Production conditions and tighten only after owner approval.
7. Monitor matched/limited traffic and usage. Roll back only this rule to log/disabled if false positives appear; do not disable unrelated protections.

Optional CLI preparation, after owner fixes/verifies the local project link:

```sh
vercel firewall rules add "Hazlo sync observation" \
  --condition '{"type":"path","op":"eq","value":"/api/notion-sync"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 60 \
  --rate-limit-keys ip --rate-limit-action log --yes
vercel firewall rules inspect "Hazlo sync observation" --json
vercel firewall diff
```

These commands stage provider changes and **were not run**. Publishing/enforcement requires separate owner action. See [CLI documentation](https://vercel.com/docs/cli/firewall). Use the dashboard for staged rollout if CLI feature gates differ. Keep writes disabled if acceptable protection cannot be established.

## H. Environment migration

Names/targets were read without printing values:

- NOTION_TOKEN and NOTION_DATA_SOURCE_ID: sensitive, Production only.
- API_SECRET and VITE_API_SECRET: sensitive, Production and Preview.
- New enablement/origin settings: absent.
- Development application variables: none listed.
- Sensitive classification does not keep a VITE variable private after a frontend build.

| Variable | Scope | Required value type | Purpose | Owner action |
| --- | --- | --- | --- | --- |
| NOTION_SYNC_ENABLED | Private server configuration; flag itself not a credential | Exactly false for demo, true only for approved personal sync | Server write enablement; defaults off | Add correct value for approved mode/environment before cutover. |
| VITE_NOTION_SYNC_ENABLED | Public browser build | Exactly false for demo/Preview; true for personal sync | Frontend sync behavior | Add before reviewed build; changing it requires rebuild. |
| NOTION_TOKEN | Private server, Production/authorized Development only | Own private minimal-scope integration credential | Authorize server → Notion | Keep out of Preview and VITE namespace; rotate only if owner decides exposure/abuse requires it. |
| NOTION_DATA_SOURCE_ID | Server configuration, Production/authorized Development | Correct connected data-source UUID | Notion destination | Verify actual shared data source and exact schema. |
| NOTION_ALLOWED_ORIGINS | Server configuration | Exact HTTPS app origin(s), no trailing slash/wildcard | Browser cross-origin request restriction | For personal Production use https://hazlo-opensource.vercel.app for this instance; forks use their own origin. Development uses actual localhost origin/port. |
| API_SECRET | Retired server shared value | Remove at coordinated cutover | Old implementation only | Retire; do not remove early if continued old-code syncing is required until approved cutover. |
| VITE_API_SECRET | Retired browser-public value | Remove at coordinated cutover | Old public bundle credential | Retire and rotate wherever reused; restrict/remove old bundles/deployments as owner approves. |
| VITE_API_BASE_URL | Retired browser config | Absent | Same-origin client now fixed | Remove if it exists in other local/environments; not in current listed provider metadata. |

**Sync-continuity blocker:** merging with current provider settings deploys false defaults, so personal Notion sync stops while local capture continues. The owner must explicitly select local-only versus personal mode and prepare flags/origins/provider controls before merging. Do not make code fail open to avoid migration.

New flags do not control the legacy main implementation. Setting NOTION_SYNC_ENABLED=false does not contain the currently deployed old handler. Do not remove legacy API_SECRET before cutover if the owner requires continuity; doing so would break old-code sync. For urgent abuse on old code, owner-approved provider endpoint restrictions and credential containment are needed.

For personal continuation, prepare new flags/origin first, verify protections, approve merge, inspect the new deployment, then retire legacy values and old deployments in the coordinated rollout. For public demo, approve disabled mode and remove sensitive Notion credentials at the reviewed cutover. No environment value was changed by this task, apart from automatic creation/revocation of the accidental bypass binding described in D; its absence was verified after cleanup.

## I. Actual test results

| Command/check | Result | Evidence | Notes |
| --- | --- | --- | --- |
| pnpm install --frozen-lockfile | PASS | Exact existing graph installed, lock agreement. | No Phase 2 dependency changes. |
| pnpm typecheck | PASS | tsc --noEmit, exit 0. | Source/test type checks. |
| pnpm test | PASS | **9 files / 146 tests / 0 failed**. | 138 original hardening tests plus 8 new regression cases; all Notion traffic mocked. |
| pnpm build | PASS | Vite 7.3.7; 1,685 modules. | Default local-only bundle. |
| pnpm audit --prod | PASS | Zero known advisories. | Not proof of zero unknown vulnerabilities. |
| pnpm audit | PASS | Zero known advisories. | Full dev/build graph included. |
| pnpm --dir tools/promo-video install --frozen-lockfile | PASS | Existing independent lockfile. | No duplication/dependency additions. |
| pnpm --dir tools/promo-video test | PASS | 1 node:test, 0 failures. | Host/origin/private-path/asset controls. |
| pnpm --dir tools/promo-video audit | PASS | Zero known advisories. | Independent graph. |
| node tools/security/browser-check.mjs | PASS | Manual/tasks/persistence/themes/simulated WebKit speech/mobile/XSS-like text, corrupt data and two-tab stale-write checks. | No real microphone or Notion writes. |
| Separate enabled build + node tools/security/browser-check.mjs --enabled | PASS | Mocked failure/confirmation/retry with original payload; zero CSP/runtime errors. | Fake canaries only; server writes never enabled. |
| node tools/security/render-check.mjs | PASS | Both existing 1920×1080 compositions load/draw in sandbox. | No MP4 re-encoding or asset changes. |
| node tools/security/preview-check.mjs under short-lived OIDC | PASS | Both efd576e and corrected 6cf0b17 Previews; results in F. | Exact target verified first; no persistent bypass used for successful tests. |
| Deployed function inventory | PASS | Corrected Preview contains only api/notion-sync. | Confirms actual P2-01 remediation. |
| Deployed HTTP/API/CSP checks | PASS in Preview | Actual headers, configuration and disabled POST response. | Production headers unchanged, as expected. |
| node tools/security/scan.mjs --history | PASS | No matching credential signatures in tracked/current text, accessible history or 8 emitted browser files across both builds. | Path-only reporting; new docs included at final staging. |
| node tools/security/links-check.mjs | PASS | Local documentation/image targets checked. | Final quantities recorded after staging. |
| git diff --check / cached check | PASS | Whitespace review. | Run again before commits. |
| Global endpoint limiter | NOT CONFIGURED | Custom rules empty/no draft. | Must configure before enabling anonymous public writes. |
| Real production Notion entry | NOT RUN — owner release gate | No dedicated expressly authorized live test destination. | Mock schema/API-version/payload/time/timeout tests pass. |
| Real microphone/vendor recognition | NOT RUN | Simulated standard/WebKit controller and UI checks used. | Owner uses supported browser after approval. |
| GitHub draft PR | BLOCKED | Connector 403; gh unavailable. | Comparison and prepared draft summary provided. |
| Full firewall overview | BLOCKED for optional IP Bypass portion | Hobby 402 for Pro/Enterprise-only capability. | Independent custom-rules inspection succeeded; no upgrade attempted. |
| GitHub Actions | NOT RUN / not required | Queried PR-triggered runs empty; no configured .github workflows. | No new workflow or billing change. |

Before remediation, five focused cases failed (408, 409, stale-tab overwrite, mismatched snapshot ID, deployed test filename). A later aggregate-byte case also failed before its fix. Final tests all pass; neither tests nor protections were weakened.

## J. Functional compatibility

Preserved: no-login design; user-initiated standard/WebKit speech support; manual fallback; language preference; task extraction; local save/refresh; original timestamps; local task/entry controls; rollover; themes; responsive layout; PWA metadata; MIT/Kaushik attribution; all existing media.

Deliberate security behavior changes remain: sync is opt-in, Preview writes are disabled, invalid/oversize input rejects without losing the local note, automatic POST retries are absent, uncertain/conflicting retries warn, malformed/stale storage warns and preserves prior data. Personal Notion synchronization capability remains, but real integration correctness is an owner test after approved configuration.

No new authentication, session, tracking, paid service or deployment architecture was introduced.

## K. Remaining risk register

1. **High when enabled:** anonymous public writes can be forged; Origin/CORS/UUID/public flags are not owner identity.
2. **High release gate for enabled mode:** no active global endpoint rate rule. Per-instance capacity is not a substitute; per-IP rules still permit distributed abuse.
3. **Medium:** no durable transactional idempotency across instances, cold starts or expiry. A confirmed retry can duplicate a committed page.
4. **Medium on shared devices:** localStorage is unencrypted, same-origin/extension/profile-readable and not a backup. Stale-value checks do not provide atomic multi-tab merging.
5. **High release coordination:** missing enablement/origin variables mean sync stops at merge unless deliberately configured.
6. **Medium:** old public frontend secrets/deployments remain until owner retirement; their current authentication value must be treated as public.
7. **Medium release gate:** real Notion permissions/sharing/schema not exercised with production credentials. Dedicated destination/minimum capabilities required.
8. **Medium operational:** root ignored Vercel link is still wrong. Use the verified isolated context; avoid mutation-prone CLI protected-access commands.
9. **Medium release gate:** actual microphone/vendor flow and newly released Production runtime have not been tested.
10. **Review access:** draft PR creation blocked; owner must open a draft/review through an authorized account/tool. No permissions modified.
11. **Supply chain:** zero known advisories/signature matches is a bounded audit result, not a guarantee against unknown packages/secrets.

## L. Exact owner actions and release ordering — prepared, not executed

### Must complete before merging

1. Review the [comparison](https://github.com/YellankiKaushik/Hazlo-OpenSource/compare/main...security/comprehensive-hardening?expand=1), audit/readiness report and immutable tested code SHA 6cf0b173e86fc03aa1cb650271386968acc7af79. Fetch and verify the final report-only commit separately; its application tree should match.
2. Open the prepared PR as **Draft** with the title/summary in E through an authorized GitHub account. Resolve review requirements; do not treat connector permissions as passed review.
3. Verify correct Vercel project/team/Git/main/root. Back up the ignored local link, then owner-correct it if needed with `vercel link --yes --team kaushik-yellanki-project --project hazlo-opensource`; inspect the resolved link before any subsequent project command. This local correction was not performed here.
4. Explicitly choose a local-only public demo or personal opt-in release. Prepare settings in H; missing flags are a known sync-continuity blocker, not a reason to weaken defaults.
5. Review costs, define acceptable anonymous exposure and approve provider protections for enabled mode. If the risk is unacceptable, release only local-only mode.
6. Prepare rollback/containment and storage backups. Check the corrected Preview and required local results. No live Notion test is needed to inspect code.

### Must complete before enabling Notion sync

1. Use a dedicated personal/test data source, not sensitive shared production data. Create an internal Notion integration with minimum read/insert capabilities and share/connect that data source.
2. Verify exact schema: **Raw Speech → Title; Status → Status (Not started, In progress, Done); Date → custom Date**. Obtain the data-source UUID, not the parent database ID.
3. Put token/ID only in server configuration. Configure both enablement flags true and exact app origin before building the personal deployment. Preview stays false/no credentials and server-enforced disabled.
4. Owner configure, stage, inspect and publish endpoint-specific WAF/access controls in the sequence in G; verify observed enforcement. Do not activate a paid entitlement without consent.
5. Accept documented duplicate/anonymous-write limits, or keep disabled.

### Must complete before Production release, then post-release checks

1. Prepare new Production variables **before the approved merge** so the desired mode is intentional; current old code ignores the new flags. Do not retire the legacy old-code secret early if continued sync is needed during cutover.
2. Owner approves merge only after independent review; then monitor the ordinary main deployment, confirm repository/branch/SHA/root and successful build. Do not promote an unrelated Preview.
3. Inspect actual Production headers/CSP, assets, local/manual/voice/task/refresh/theme/mobile flows and configured mode.
4. For demo mode verify no browser POST and server disabled; keep real Notion credentials absent.
5. For personal mode, the owner explicitly approves **one fictional entry**: type “Finish the Hazlo release check and review the documentation”, save once, record its original capture time locally, then inspect the intended Notion data source for exactly one page with matching title/status/custom Date, full accepted transcript and expected to-do blocks. Do not use the configuration GET as a connectivity test.
6. If the result is ambiguous, inspect Notion before Retry; do not repeatedly submit. Record safe status/verification without publishing notes/tokens.
7. At coordinated cutover remove retired variables, rotate the legacy value anywhere reused, decide whether to rotate Notion credentials based on actual exposure/abuse, and owner-remove/restrict old deployments/bundles. Rebuild for public flag changes.
8. Monitor safe function errors, rule traffic, Notion page counts and provider usage; apply approved containment/rollback if necessary.

### Optional future improvements

Design durable queue/transactional deduplication and reconciliation only after separate architecture/infrastructure approval. Consider explicit export/import backups and carefully designed multi-tab coordination. Continue dependency/security reviews. Do not add user authentication, automatic paid storage or mandatory CAPTCHA under this task.

## M. Rollback, containment and recovery

- On the new implementation, owner set NOTION_SYNC_ENABLED=false and release the reviewed disabled configuration; rebuild with browser flag false so the UI reflects local-only mode. Environment edits may require a deployment; do not assume old runtime values changed.
- During active abuse, owner restrict the exact API route at the provider or revoke the affected integration credential after assessing service impact. No such control was changed here.
- The legacy main handler ignores new flags. Do not blindly roll back to it with writable Notion credentials and the public secret mechanism still active.
- For incorrect rollout, inspect the exact project/deployment/SHA and roll back to a reviewed safe version using the provider-supported owner workflow. Coordinate environment variables; rollback does not delete Notion pages, restore browser notes or undo credential rotation.
- Preserve local data: back up the original hazlo-storage value privately and copy temporary in-tab edits before reload/clear. Malformed/stale/quota failures do not authorize automatic deletion.
- For wrong environment configuration, correct only the intended project's values after owner approval; rebuild public flags and re-test disabled mode first. Never paste secrets into issue/PR/report logs.
- CLI incident cleanup is complete: only the newly generated token was revoked, regeneration false, zero remaining tokens and no bound env entry. No more cleanup mutation is required for that token. The incorrect original local link remains an owner verification task.

## N. Final recommendation

**REVIEW REQUIRED — UNRESOLVED RISKS**

Recommend independent review of the corrected branch, not automatic merge or production approval. Code-level regressions identified in this phase are fixed and locally/Preview verified. Remaining blockers are owner coordination of environment cutover and anonymous-write protections, draft PR access, real microphone/Notion release checks and legacy deployment/credential retirement.

Residual risk is High for publicly enabled anonymous writes without acceptable edge/access controls, Medium for duplicate delivery and browser data assumptions, and substantially lower for the default local-only public demo. No user authentication was added. Main and production application code remain unchanged; the only provider-side exception was the disclosed accidental bypass-token creation followed by explicitly authorized revocation.
