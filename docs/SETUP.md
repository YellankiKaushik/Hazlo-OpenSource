# Hazlo Setup Guide

This guide walks through a fresh Hazlo setup from an empty machine to a working local project and a Notion-connected deployment. It assumes you know how to open a terminal, but it does not assume you already know pnpm, Vercel, or Notion integrations.

## 1. Install Git

Git downloads the repository and tracks code changes.

Check whether Git is installed:

```bash
git --version
```

If that command fails, install Git from [git-scm.com](https://git-scm.com/downloads), then open a new terminal and run the version command again.

## 2. Install Node.js

Node.js runs the JavaScript tools used by Hazlo.

Check whether Node is installed:

```bash
node --version
npm --version
```

Use a current LTS version of Node.js. If Node is missing, install it from [nodejs.org](https://nodejs.org/), then open a new terminal.

## 3. Install pnpm

Hazlo uses pnpm instead of npm or Yarn for dependency installation.

Check whether pnpm is installed:

```bash
pnpm --version
```

If it is missing, install it with npm:

```bash
npm install -g pnpm
```

## 4. Clone Hazlo

Clone the repository:

```bash
git clone https://github.com/YellankiKaushik/Hazlo-OpenSource.git
cd Hazlo-OpenSource
```

## 5. Install Dependencies

Install the exact dependency set from the lockfile:

```bash
pnpm install --frozen-lockfile
```

For day-to-day development, `pnpm install` is also fine. Use `--frozen-lockfile` when you want to verify the lockfile and `package.json` agree.

## 6. Understand Environment Variables

Environment variables are settings that live outside the code. Hazlo uses them for Notion and API configuration.

Local values go in `.env.local`. That file is ignored by Git and must not be committed.

Create it from the template:

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Your `.env.local` should contain these keys:

```env
NOTION_TOKEN=your_notion_token_here
NOTION_DATA_SOURCE_ID=your_notion_data_source_id_here
API_SECRET=generate_a_random_value
VITE_API_SECRET=use_the_same_value_as_API_SECRET
VITE_API_BASE_URL=
```

Do not paste real values into `.env.example`; that file is committed as a public template.

## 7. Create a Notion Integration

The Notion integration gives Hazlo permission to create pages in your workspace.

1. Open [Notion integrations](https://www.notion.so/profile/integrations).
2. Create a new internal integration.
3. Give it a clear name, such as `Hazlo`.
4. In the integration capabilities, allow the integration to read and insert content.
5. Copy the integration token.
6. Put the token in `.env.local` as `NOTION_TOKEN`.

Keep this token private. Anyone with the token and access to the right workspace resources may be able to use the integration.

## 8. Create or Choose a Notion Data Source

Hazlo writes one Notion page per entry. In the Notion app, the destination usually looks like a database table. Hazlo uses the [Notion data source API](https://developers.notion.com/reference/data-source), so it needs the data source ID for that table.

You can create a new Notion database called `Hazlo Entries`, or use an existing one.

Required properties:

| Property name | Type | Required details |
| --- | --- | --- |
| `Raw Speech` | Title | Stores the transcript title. |
| `Status` | Status | Must include `Not started`, `In progress`, and `Done`. |
| `Date` | Date | Stores the original entry timestamp from Hazlo. |

Extra Notion properties are okay. Hazlo ignores them.

Important: a built-in Notion "Created time" column is not a replacement for the custom `Date` property. The backend writes to a property literally named `Date`.

## 9. Share the Data Source With the Integration

The integration cannot write to a Notion data source until you connect it.

1. Open the Notion database/data source as a full page.
2. Open the share, connections, or three-dot menu.
3. Choose the integration you created for Hazlo.
4. Confirm it has access.

If this step is skipped, Notion commonly returns `object_not_found` or `restricted_resource`.

## 10. Find the Notion Data Source ID

Use the data source ID, not the old database ID.

The easiest current path in Notion is:

1. Open the database as a full page.
2. Open the database settings menu.
3. Choose "Manage data sources".
4. Open the menu for the data source Hazlo should use.
5. Choose "Copy data source ID".

If your Notion UI does not show that option, copy the database ID from the URL and use Notion's [Retrieve database API](https://developers.notion.com/reference/retrieve-a-database) to read the `data_sources` array. The item in that array contains the data source `id` Hazlo needs.

Put the value in `.env.local`:

```env
NOTION_DATA_SOURCE_ID=your_notion_data_source_id_here
```

## 11. Generate the API Secret

Hazlo uses a lightweight shared secret between the frontend and backend.

Generate one with Node:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Use the exact same generated value for:

```env
API_SECRET=paste_generated_value_here
VITE_API_SECRET=paste_generated_value_here
```

`API_SECRET` is read by the backend. `VITE_API_SECRET` is bundled into the frontend, so it is browser-visible. This is useful for a personal/self-hosted app, but it is not full authentication for a public multi-user product.

## 12. Run Frontend-Only Development

Start Vite:

```bash
pnpm dev
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173
```

This mode is enough to test:

- Layout and responsive UI.
- Theme switching.
- Manual "Type instead" entry creation.
- Browser localStorage persistence.
- Task extraction.

Notion sync may fail in this mode because Vite does not run Vercel Functions by itself.

## 13. Run Full-Stack Local Development With Vercel

Use this when you want local `/api/notion-sync` behavior.

Install Vercel CLI:

```bash
npm install -g vercel
```

Link your local folder to a Vercel project:

```bash
vercel link
```

Pull development environment variables from Vercel if you already configured them there:

```bash
vercel env pull .env.local --environment=development
```

If you filled `.env.local` manually, you do not need to pull env values from Vercel. Be careful: pulling env values can replace the local file.

Run the Vercel local runtime:

```bash
vercel dev
```

Vercel will serve the frontend and the `api/notion-sync.js` serverless route together.

## 14. Deploy to Vercel

You can deploy through the Vercel website without installing the CLI.

1. Push your copy of Hazlo to GitHub.
2. Open [Vercel](https://vercel.com/).
3. Create a new project.
4. Import your GitHub repository.
5. Confirm the framework preset is Vite.
6. Confirm the build command is `pnpm build`.
7. Confirm the output directory is `dist`.
8. Add the environment variables in Project Settings.
9. Deploy.

Required Vercel variables:

- `NOTION_TOKEN`
- `NOTION_DATA_SOURCE_ID`
- `API_SECRET`
- `VITE_API_SECRET`

Optional:

- `VITE_API_BASE_URL`

For normal same-origin Vercel deployments, leave `VITE_API_BASE_URL` blank.

## 15. First Sync Test

After deployment:

1. Open the deployed app.
2. Use "Type instead".
3. Enter a simple task, such as `Finish the Hazlo setup guide and test Notion sync`.
4. Save the entry.
5. Confirm it appears locally.
6. Wait for the sync badge to change to `Synced`.
7. Open Notion and confirm a new page appeared in the data source.
8. Confirm the page has `Raw Speech`, `Status`, and `Date` populated.
9. Confirm extracted tasks appear as Notion `to_do` blocks when the text contains task-like wording.

## 16. How to Verify Success

Local success:

- `pnpm dev` starts without errors.
- The app loads in the browser.
- Theme switching works.
- Manual entry works.
- Refresh keeps local entries.

Full-stack success:

- `/api/notion-sync` does not return `401`, `500`, or `502`.
- A saved entry reaches `Synced`.
- A Notion page appears in the configured data source.

Project validation:

```bash
pnpm test
pnpm typecheck
pnpm build
git diff --check
```

## 17. Common Mistakes

| Mistake | What happens | Fix |
| --- | --- | --- |
| Putting real secrets in `.env.example` | Secrets may be committed publicly. | Put real values only in `.env.local` or Vercel settings. |
| Using the old database-ID variable name | Backend reports missing configuration. | Use `NOTION_DATA_SOURCE_ID`. |
| Copying the database ID instead of data source ID | Notion may reject page creation. | Copy the data source ID from "Manage data sources" or retrieve it from the API. |
| Forgetting to share the data source with the integration | Notion returns access errors. | Connect/share the data source with the integration. |
| Missing the custom `Date` property | Notion returns a validation error. | Add a `Date` property named exactly `Date`. |
| `API_SECRET` and `VITE_API_SECRET` do not match | Backend returns `401`. | Use the exact same value for both and redeploy. |
| Changing `VITE_` variables without redeploying | Production still uses old frontend values. | Redeploy after changing `VITE_API_SECRET` or `VITE_API_BASE_URL`. |
| Expecting `pnpm dev` to run the backend | Notion sync fails locally. | Use `vercel dev` for full-stack local testing. |

## 18. Files You Should Never Commit

Never commit:

- `.env`
- `.env.local`
- `.env.production`
- Notion tokens
- API secrets
- Vercel tokens
- Personal credentials
- Machine-specific paths or private local configuration

The committed `.env.example` file must contain placeholders only.
