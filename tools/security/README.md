# Local security verification

No GitHub Actions quota, real Notion token or production deployment is needed. Run from the repository root with Node.js 24 LTS and pnpm:

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm audit --prod
pnpm audit
node tools/security/scan.mjs --history
node tools/security/links-check.mjs
git diff --check
```

The scan checks tracked/current text, reachable commits and generated browser assets for known credential signatures and retired frontend secret identifiers. It reports paths only, never matched values. Stage only intended new source files before the final scan so they are included. It is not proof against every arbitrary secret or audiovisual disclosure.

Browser/render checks reuse the optional, independent video workspace's Playwright dependency and installed Chrome. No application dependency is added:

```sh
pnpm --dir tools/promo-video install --frozen-lockfile
pnpm --dir tools/promo-video test
pnpm --dir tools/promo-video audit
node tools/security/browser-check.mjs
node tools/security/render-check.mjs
```

The browser harness serves the actual production build locally with headers from vercel.json. It tests fictional capture, storage, themes, a simulated WebKit speech engine, mobile layout and disabled API behavior. It never enables server writes. Real microphone/vendor speech access and provider header/rule enforcement still need owner testing after approval. The render check loads two existing compositions and draws a frame without re-encoding or altering any published video.

For a separate opt-in browser build, set VITE_NOTION_SYNC_ENABLED=true **only for the following build process**, run `pnpm exec vite build --outDir artifacts/security/enabled`, then `node tools/security/browser-check.mjs --enabled`. This harness mocks every Notion sync request and verifies uncertain retry cancellation/confirmation and an unchanged first-send payload. The output stays under ignored artifacts; it does not replace dist or deploy anything. Clear/reset the shell environment after testing. To check secret isolation, use fake HAZLO_PRIVATE_CANARY values for retired/server variables during that isolated build and rerun the scan.

Do not point these tests at production, provide actual credentials, disable Chromium sandboxing, run Vercel deploy, or change provider firewall settings as part of this local verification.

## Protected Preview verification

`preview-check.mjs` is an optional non-production check. First independently verify the target project's Git repository, Preview deployment, commit SHA and root with scoped read-only Vercel metadata. Use a separate ignored local CLI directory linked only to that verified project; do not reuse an unverified `.vercel/project.json`.

Set HAZLO_SECURITY_PREVIEW_URL to that exact HTTPS deployment origin and HAZLO_SECURITY_PREVIEW_SHA to the verified 40-character SHA. From the verified isolated context, run `vercel.cmd env run --environment development --scope kaushik-yellanki-project --non-interactive -- node <absolute-path-to-preview-check.mjs>` on Windows; use the native CLI equivalent on other systems. The native .cmd shim preserves the `--` separator in PowerShell.

This documented access path uses the existing Vercel authentication to inject a short-lived development OIDC token into the subprocess. The script forwards it only to the exact Preview origin, never prints/persists it, refuses unexpected config responses, and sends one fictional POST only after GET proves sync disabled. It tests actual headers, capture/storage/themes/mobile/PWA behavior and records safe results under ignored artifacts/security. It never tests enabled real Notion writes.

Avoid `vercel curl` for read-only audits with this CLI version: it can automatically create a persistent project-level protection-bypass secret using the local project link, even when an explicit deployment is supplied. Do not disable protection, create bypass secrets or change Trusted Sources to make a test pass. If OIDC access is unavailable, report the Preview check blocked. Production release and real microphone/Notion checks remain owner gates.

API tests live in `tests/api/`, not `api/`; Vercel otherwise deploys test files as functions. Keep tests outside the deployable route tree.
