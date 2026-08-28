# Production Verification Checklist

Use this checklist before or after deploying Hazlo to Vercel.

## Vercel Environment

- [ ] `NOTION_TOKEN` is set in Vercel.
- [ ] `NOTION_DATA_SOURCE_ID` is set in Vercel.
- [ ] `API_SECRET` is set in Vercel.
- [ ] `VITE_API_SECRET` is set and matches `API_SECRET`.
- [ ] `VITE_API_BASE_URL` is empty for same-origin production deploys, or points to the intended backend for local testing.

## Notion Setup

- [ ] The Notion integration is active.
- [ ] The target Notion data source is shared with the integration.
- [ ] The data source ID, not only the database ID, is saved as `NOTION_DATA_SOURCE_ID`.
- [ ] The data source has a `Raw Speech` title property.
- [ ] The data source has a `Status` status property with `Not started`, `In progress`, and `Done`.
- [ ] The data source has a custom `Date` date property.

## Core App Checks

- [ ] Create a voice entry in the deployed app.
- [ ] Confirm the entry appears locally immediately.
- [ ] Confirm the entry shows `Syncing`, then `Synced`.
- [ ] Confirm a Notion page is created.
- [ ] Confirm extracted tasks appear as Notion `to_do` blocks.
- [ ] Simulate or observe a sync failure and confirm `Retry` is visible only for failed entries.
- [ ] Click `Retry` and confirm the status can recover.

## Localhost Checks

- [ ] Run `pnpm dev` for frontend-only work.
- [ ] Run `vercel env pull .env.local --environment=development` before full local API testing.
- [ ] Run `vercel dev` and submit a voice entry through `/api/notion-sync`.
- [ ] If using a separate backend URL, set `VITE_API_BASE_URL` intentionally and remove it when done.

## Secret Safety

- [ ] `.env` and `.env.local` are not staged.
- [ ] No real Notion token, data source ID, API secret, or Vercel token appears in `git diff`.
- [ ] `.env.example` contains placeholders only.

## Required Commands

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `git diff --check`
