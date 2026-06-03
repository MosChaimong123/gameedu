# Repo Tracking Checklist

Use this checklist before staging a production deploy. The goal is to keep deploy commits focused on app source code, schema, tests, and docs that intentionally describe the product.

## Keep In Repo

- [ ] Application source code under `src/`
- [ ] API routes under `src/app/api/`
- [ ] UI components under `src/components/`
- [ ] Shared libraries under `src/lib/`
- [ ] Prisma schema under `prisma/schema.prisma`
- [ ] Product plans and intentional documentation under `docs/`
- [ ] Tests that verify product behavior
- [ ] Package manifests and lockfiles
- [ ] Public assets that the app serves intentionally

## Do Not Track

- [ ] Generated build output such as `dist/`, `.next/`, `out/`, and `build/`
- [ ] Temporary debug logs such as `debug.log`, `npm-debug.log*`, `yarn-debug.log*`, and `yarn-error.log*`
- [ ] Local assistant/editor config such as `.claude/`
- [ ] Local planning/tool workspace such as `.kiro/`
- [ ] Repo-analysis cache and metadata such as `.understand-anything/`
- [ ] Local agent skill packs under `.agents/skills/`
- [ ] Local environment files such as `.env`, `.env.local`, and `.env*.local`

## Notes

- `.gitignore` only prevents new untracked files from being added.
- If a generated or local file was already tracked, remove it from git with `git rm --cached` while keeping the local file on disk.
- Before deploy, check `git diff --cached --name-only` and make sure only the intended production files are staged.
