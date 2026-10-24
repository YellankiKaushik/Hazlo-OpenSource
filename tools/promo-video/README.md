# Hazlo launch film production

Editable source for the 95-second Hazlo product film, **Capture first. Organize later.**

The separately redesigned 32-second teaser is documented in [v2/README.md](v2/README.md). Its source, captures, 120 BPM score and outputs use separate V2 paths. Run `pnpm v2:audio`, `pnpm v2:render` and `pnpm v2:verify` to regenerate it; V1 remains intact.

The renderer uses a deterministic Canvas 2D composition in Chromium, Playwright for real application capture and frame delivery, and FFmpeg for H.264/AAC encoding. It renders each of 2,850 frames at an explicit timeline time. Animated masks, typography, scene wipes, parallax, waveforms, task cards, data pulses and UI camera moves are code-driven; this is not a slideshow export.

The tooling is isolated from the Hazlo application. No app package or lockfile changes are needed.

## Requirements

- Node.js 22 or newer and pnpm.
- Google Chrome installed (default), or a Playwright Chromium installation.
- FFmpeg and ffprobe on PATH, with libx264 and AAC encoding.
- Windows Segoe UI for the reference typography. Other operating systems fall back to Arial/sans-serif; font metrics may differ. No commercial font files are distributed.

## Install

From `tools/promo-video`:

```sh
pnpm install --frozen-lockfile
```

If you use a custom Chrome binary, set `HAZLO_CHROME` to its path. For an environment that already supplies the dependencies, `HAZLO_NODE_MODULES` may point to its Node package directory. These are machine settings, never hardcoded into this source project. `FFMPEG` and `FFPROBE` can override executable paths.

## Regenerate the film

```sh
pnpm audio
pnpm preview
pnpm render
pnpm verify
pnpm teaser
```

`preview` produces all nine scene frames, the contact sheet, thumbnail, and SRT. `render` also produces the final video. These use the supplied authentic captures and recording, so network access and Notion credentials are not needed to render.

Default output is the ignored `renders/` directory:

- `hazlo-launch-promo.mp4`: 1920×1080, 30 fps, H.264/yuv420p, stereo AAC, faststart, 95 seconds.
- `hazlo-launch-thumbnail.png`: 1280×720.
- `hazlo-launch-captions.srt`: 20 timed English text cues.
- `hazlo-launch-contact-sheet.png`: representative compositions from all nine scenes.
- `previews/`: full-resolution still for each scene.
- `validation.json`: ffprobe metadata, full decode result, audio measurement, editorial notes.
- `hazlo-launch-teaser.mp4`: optional 26.6-second cut with crossfaded picture/audio and the complete closing CTA.

The video has readable captions burned into the picture, plus a selectable English MP4 subtitle track and the standalone SRT. It is a music-and-typography edition; it contains no voiceover. `narration.md` is a separate script for a human recording, not a claim that speech is present in this version.

Set `HAZLO_VIDEO_OUTPUT` to a relative or absolute destination to change the output directory. To update approved release assets, copy the finished MP4, thumbnail, SRT, contact sheet, and validation report into `docs/media/` after review. Rendering does not publish, commit, or push anything.

## Recapture the actual app

```sh
pnpm capture
```

The default target is the public Hazlo deployment. `HAZLO_CAPTURE_URL` can point to a local instance. A fresh isolated browser context is used; it never opens your personal browser profile. The route interceptor blocks every `/api/notion-sync` request and returns a controlled failure. It never supplies or accesses production credentials and sends no Notion writes. Do not remove this interceptor just to make a success badge appear.

The capture script uses the actual manual input control, saves a fictional entry, checks task creation, refreshes to confirm persistence, and captures light/dark/mobile states. A raw WebM is recorded. The included portable clip is `assets/recordings/manual-entry.mp4`. After recapturing, convert the new non-empty WebM to that filename:

```sh
ffmpeg -i path-to-capture.webm -an -c:v libx264 -crf 18 -pix_fmt yuv420p -movflags +faststart assets/recordings/manual-entry.mp4
```

Clip timing is editorially mapped in `src/film.js`. If recapture timing changes, review and adjust it. The renderer extracts deterministic JPEG frames into an ignored temporary directory.

## Editing

- `src/film.js`: palette, typography, shapes, UI crops, animations and nine scene functions.
- `src/timeline.js`: scene boundaries and timed caption text.
- `scripts/audio.mjs`: original instrumental composition and synchronized sound effects.
- `scripts/capture.mjs`: fresh browser capture and blocked-sync safety boundary.
- `scripts/render.mjs`: local asset server, preview export and full encode.
- `scripts/verify.mjs`: technical validation and complete audio/video decode.
- `scripts/contact-sheet.mjs`: contact and transition sheets extracted from the actual encode.
- `scripts/teaser.mjs`: reproducible shorter editorial cut.
- `storyboard.md`: narrative and scene direction.
- `narration.md`: recording-ready optional narration.
- `assets/capture-manifest.json`: provenance and verified behaviors.

All animation derives from the frame number. Never use wall-clock CSS animations or random values for render-critical elements. Inspect the contact sheet and transitions after changing layout, timing or text.

## Accuracy and distribution

The film is based on the repository and actual deployed application. Extraction is local and rule-based. Speech uses the browser's supported recognition API. The waveform is explicitly illustrative. A successful Notion flow and page are explicitly illustrative; no successful live Notion write is claimed. Self-hosting needs the viewer's own integration and configuration. No multi-user accounts, AI parsing, inferred deadlines, or bidirectional sync are claimed.

The two reviewed final exports are intentionally tracked under the [published media directory](../../docs/media/README.md): `hazlo-full-promotional-video.mp4` and `hazlo-launch-teaser-v2.mp4`. The full renderer still produces `hazlo-launch-promo.mp4` and `hazlo-launch-thumbnail.png`; publication renames them to `hazlo-full-promotional-video.mp4` and `hazlo-full-promotional-thumbnail.png` without transcoding. Generated frames, caches, WAV stems, and unapproved/intermediate exports remain ignored. The earlier promotional video is preserved at its existing path.

See `MEDIA-LICENSE.md` for provenance. The application's features, styles, API, configuration, main package dependencies, README, and existing media were not changed for this production.
