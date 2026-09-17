# Contributing to Hazlo

Hazlo is maintained by Kaushik ([@YellankiKaushik](https://github.com/YellankiKaushik)). Contributions are welcome through pull requests.

Keep contributions focused, testable, and safe for people who self-host the app with their own Notion workspace.

## Workflow

1. Fork the repository.
2. Clone your fork.
3. Create a branch from `main`.
4. Install dependencies with pnpm.
5. Make your changes.
6. Run validation.
7. Commit the change.
8. Push your branch.
9. Open a pull request.

Example:

```bash
git clone https://github.com/YOUR_USERNAME/Hazlo-OpenSource.git
cd Hazlo-OpenSource
git switch -c feature/short-description
pnpm install
pnpm test
pnpm typecheck
pnpm build
git diff --check
git add -A
git commit -m "describe your change"
git push origin feature/short-description
```

## Branch Names

Useful branch prefixes:

- `feature/...` for new user-facing behavior.
- `fix/...` for bug fixes.
- `docs/...` for documentation-only changes.
- `test/...` for test coverage.
- `chore/...` for maintenance.

## Required Checks

Run these before opening a pull request:

```bash
pnpm test
pnpm typecheck
pnpm build
git diff --check
```

What they check:

- `pnpm test` runs Vitest tests.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm build` verifies the production bundle.
- `git diff --check` catches whitespace problems in changed lines.

## Security Rules

- Do not commit `.env`, `.env.local`, real Notion tokens, API secrets, Vercel credentials, or copied production values.
- Do not include real Notion data source IDs in docs, tests, screenshots, or pull requests.
- Use placeholders in examples.
- Rotate any token that was accidentally exposed.
- Remember that `VITE_` variables are visible in browser code.

## Notion Contract

Do not change the Notion API contract casually. Hazlo currently expects:

| Property name | Type |
| --- | --- |
| `Raw Speech` | Title |
| `Status` | Status |
| `Date` | Date |

The backend writes to a Notion parent of type `data_source_id`, using `NOTION_DATA_SOURCE_ID`.

If your change modifies this contract, update tests and every setup/deployment document in the same pull request.

## Code Style

- Prefer small, focused changes.
- Follow the existing React, TypeScript, Zustand, and Tailwind patterns.
- Keep user-facing behavior stable unless the pull request is intentionally changing it.
- Add or update tests when changing shared behavior, sync logic, speech handling, theme logic, or task extraction.
- Keep documentation beginner-friendly when setup steps change.

## License

By contributing, you agree that your contribution may be distributed under this repository's MIT License. This project does not use a contributor license agreement.
