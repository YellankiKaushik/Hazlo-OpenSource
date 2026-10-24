# Hazlo teaser V2 — Build your own Hazlo

A separate 32-second, 1080p/30 fps redesign of the launch teaser. The original film, teaser, music and editable source remain intact.

## What changed

- A new background system uses ivory paper, charcoal and neutral slate, with subtle static grain and directional shading. No radial lighting, green orb, decorative sphere, particle field, or looping background animation is used.
- Seven compositions replace the previous repeated left-text/right-browser layout: full-frame type, large centered product reveal, input close-up, real task-row transformation, horizontal sync flow, an editorial deployment strip, and a changing product-to-URL closing sequence.
- Real product views occupy approximately 74–79% of frame width. UI crops preserve proportions and make task/input text readable. The source app is never restyled or modified.
- The soundtrack is entirely new: an original 120 BPM two-step/minimal-house instrumental with shuffled hats, syncopated kicks, layered snare/clap, bass and short extended-chord stabs. Separate music and effects stems are regenerated locally.
- Scene boundaries fall on beat divisions. Text, card, checkbox, workflow and logo accents share exact timeline markers with the soundtrack and Foley.

## Regenerate

Use the existing tooling package in `tools/promo-video`; no application dependency changes are needed.

```sh
pnpm install --frozen-lockfile
pnpm v2:audio
pnpm v2:preview
pnpm v2:render
pnpm v2:verify
```

Node 22+, installed Chrome, FFmpeg/ffprobe with libx264/AAC, and the existing Playwright/Sharp dependencies are required. Windows Bahnschrift and Segoe UI provide the reference typography; system fallbacks may change text metrics. No font binaries are redistributed.

Default output is the ignored `renders-v2/` directory. `HAZLO_V2_OUTPUT` can override that path. The result is `hazlo-launch-teaser-v2.mp4` with H.264 CRF 18, yuv420p, BT.709, AAC stereo, 48 kHz and faststart. The film uses prominent scene text, a selectable English subtitle track, and a standalone SRT. It is music-led, without voiceover.

The thumbnail is `hazlo-launch-teaser-v2-thumbnail.png` at 1280×720. Scene previews, encoded-frame contact sheets, transition sheets, soundtrack waveform, and validation JSON accompany it. Publishing is never performed by these scripts.

## Files

- `film.js`: all seven redesigned motion compositions, camera crops, masks, typography and transitions.
- `timeline.js`: exact scene times, captions, tempo and editorial accents.
- `audio.mjs`: deterministic, original drums, bass, chord stabs and synchronized Foley; writes music, effects and mixed WAV stems.
- `capture.mjs`: real UI capture in an isolated browser, with intercepted sync requests.
- `render.mjs`: preview export, deterministic frame rendering and final encode.
- `verify.mjs`: encode validation and encoded-output visual/audio QC artifacts.
- `storyboard.md`: exact narrative and beat-aware scene timing.
- `MUSIC-LICENSE.md`: original-score provenance and redistribution terms.
- `../assets/v2/`: authentic UI screenshots, recorded input clip and capture provenance.

## Recapture

```sh
pnpm v2:capture
```

The capture visits the public app by default. Set `HAZLO_CAPTURE_URL` to use a local frontend. All `/api/notion-sync` requests are intercepted; the harness eventually returns a controlled failure so the real retry UI can be captured. No production writes are sent, no credentials are used, and no personal browser profile is opened.

The fictional transcript is `Finish the landing page and review the deployment`. The final full stop is omitted because the current deterministic `and` pattern handles the unpunctuated sample as two tasks. No extraction behavior was changed. The second task retains the app's actual lowercase `review`.

The real manual-entry clip is generated with timing recorded in `capture-manifest.json`. Its frames are extracted into an ignored directory during render. Task rows are captured from actual DOM elements, including a real completed-checkbox state.

The speech waveform is labelled illustrative. The successful Notion state is labelled illustrative. The local save and failure/retry controls are authentic. Toggling a local task is not represented as a live update to an existing Notion page.

The final CTA displays the exact live and GitHub URLs, attributes Kaushik, and preserves the MIT/open-source identity. Configuration visuals use `NOTION_DATA_SOURCE_ID` and the documented Raw Speech/Status/Date contract, without values.

## Distribution

The reviewed V2 MP4, thumbnail and SRT are published in [docs/media](../../../docs/media/README.md) alongside the full 95-second overview. Earlier promotional media is preserved. The production scripts generate local outputs only; publishing remains a separate maintainer action. Application functionality, backend and deployment configuration are unaffected. Generated WAV stems, raw recordings, frame caches and render directories remain ignored.
