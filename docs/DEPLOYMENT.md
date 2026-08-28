# Hazlo Deployment Guide

This guide covers deploying Hazlo from GitHub to Vercel, configuring environment variables, checking logs, and verifying that Notion sync works after deployment.

## Deployment Model

Hazlo is a Vite React app plus one Vercel Function:

```text
GitHub main branch
  -> Vercel build
  -> dist frontend
  -> /api/notion-sync serverless route
  -> Notion API
```

The frontend is built once per deployment. The backend function reads server-side environment variables at runtime.

## GitHub to Vercel Connection

1. Push your Hazlo repository to GitHub.
2. Open [Vercel](https://vercel.com/).
3. Create a new project.
4. Import the GitHub repository.
5. Select the Vite framework preset if Vercel does not detect it automatically.
6. Deploy from the `main` branch.

## Production Branch

Use `main` as the production branch unless you intentionally choose a different branch in Vercel settings.

For this repository, normal maintenance should happen on short-lived branches and merge into `main` through pull requests. Direct commits to `main` should be limited to trusted maintenance work.

## Build Behavior

Recommended Vercel settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm build` |
| Output directory | `dist` |

`vercel.json` rewrites non-API routes to `index.html`, so the React app can handle browser navigation.

## Environment Variables

Add these in Vercel Project Settings.

Required for Production:

| Variable | Purpose |
| --- | --- |
| `NOTION_TOKEN` | Server-side Notion integration token. |
| `NOTION_DATA_SOURCE_ID` | Target Notion data source ID. |
| `API_SECRET` | Backend shared secret. |
| `VITE_API_SECRET` | Frontend copy of `API_SECRET`; must match exactly. |

Optional:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend origin when frontend and API are hosted separately. Leave blank for normal same-origin Vercel deploys. |

Never put real secrets in the repository.

## Production vs Preview Environments

Vercel lets you set variables for Production, Preview, and Development.

- Production variables affect deployments from the production branch.
- Preview variables affect pull request and non-production deployments.
- Development variables can be pulled locally with `vercel env pull`.

Make sure every required variable is enabled in the environment you are testing.

## VITE Variable Build-Time Behavior

Vite exposes only variables prefixed with `VITE_` to frontend code.

Hazlo uses:

- `VITE_API_SECRET`
- `VITE_API_BASE_URL`

These are injected into the frontend bundle during `pnpm build`. If you change either value in Vercel, redeploy before expecting the browser app to use the new value.

Server-only variables such as `NOTION_TOKEN`, `NOTION_DATA_SOURCE_ID`, and `API_SECRET` are read by the Vercel Function and must not be exposed in browser code.

## Serverless API Route

The backend route is:

```text
/api/notion-sync
```

It is implemented in `api/notion-sync.js`.

The function:

1. Allows `OPTIONS` preflight.
2. Accepts `POST` requests.
3. Checks `X-API-Secret` against `API_SECRET`.
4. Verifies `NOTION_TOKEN` and `NOTION_DATA_SOURCE_ID`.
5. Validates the request body.
6. Creates a Notion page with `Raw Speech`, `Status`, and `Date`.
7. Adds the transcript and extracted tasks as page blocks.

Same-origin Vercel deployments do not require cross-origin CORS access. If you host the frontend and backend on different origins, check `ALLOWED_ORIGINS` in `api/notion-sync.js`.

## Redeployment

Redeploy when:

- You merge changes into `main`.
- You change `VITE_API_SECRET`.
- You change `VITE_API_BASE_URL`.
- You change Notion schema-related code.
- You want a Preview deployment promoted to Production.

Changing server-only variables may take effect for new function invocations, but redeploying after environment changes is still the simplest and most reproducible path.

## Checking Logs

Use Vercel logs when Notion sync fails.

1. Open the Vercel project.
2. Open the latest deployment.
3. Find function logs for `/api/notion-sync`.
4. Look for safe error codes such as `unauthorized`, `server_not_configured`, or `notion_sync_failed`.

The backend intentionally avoids logging raw secrets.

## Rollback Basics

If a deployment breaks:

1. Open the Vercel project.
2. Go to Deployments.
3. Choose a previous successful deployment.
4. Promote or redeploy it according to Vercel's UI.
5. Re-test Notion sync after rollback.

Rollback does not change your Notion schema or environment variables. If the problem was caused by an env change, fix the variable as well.

## Post-Deploy Verification

After deployment:

- Website loads at the deployed URL.
- Theme toggle works.
- "Type instead" creates an entry.
- Voice input works in a supported browser.
- Entry remains after refresh.
- Task extraction works for simple phrasing.
- Entry reaches `Synced`.
- A Notion page appears in the target data source.
- The Notion page contains `Raw Speech`, `Status`, and `Date`.
- Extracted tasks appear as Notion `to_do` blocks.

## Troubleshooting Failed Notion Sync

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `401 unauthorized` | `API_SECRET` and `VITE_API_SECRET` mismatch. | Set both to the same value and redeploy after changing `VITE_API_SECRET`. |
| `500 server_not_configured` | Missing `NOTION_TOKEN` or `NOTION_DATA_SOURCE_ID`. | Add the missing Vercel variable in the current environment. |
| `502 notion_sync_failed` | Notion rejected the page creation request. | Check logs for Notion status/code, then verify token, sharing, data source ID, and schema. |
| Notion `object_not_found` | Wrong data source ID or integration lacks access. | Copy the data source ID again and share the data source with the integration. |
| Notion `restricted_resource` | Integration permission issue. | Reconnect/share the data source and confirm integration capabilities. |
| Notion `validation_error` | Property schema mismatch. | Confirm exact properties: `Raw Speech` as Title, `Status` as Status, `Date` as Date. |
| Local works but Production does not | Production env variables missing or different. | Check the Production environment in Vercel settings. |
| Preview works but Production does not | Variables set only for Preview. | Enable required variables for Production. |
| Updated secret still fails | Frontend bundle still has old `VITE_API_SECRET`. | Redeploy after changing any `VITE_` variable. |

## Manual Production Test

Use this simple entry:

```text
Finish the Hazlo deployment check and confirm Notion sync
```

Expected result:

1. The entry appears immediately in Hazlo.
2. At least one task is extracted.
3. The sync badge changes from `Syncing` to `Synced`.
4. Notion contains a new page with the transcript and task blocks.
