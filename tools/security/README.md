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
