# Workspace scripts

Project-specific scripts live here. Shared dev tooling lives in packages:

- [`@cedarjs/pg`](https://www.npmjs.com/package/@cedarjs/pg) — worktree-isolated local Postgres via autopg
  (`0.1.0-alpha.0` / npm `alpha` dist-tag)
- [`@rwgql/prisma-dev`](../../packages/prisma-dev) — Prisma env loading, `@cedarjs/pg` prepare, and Vite tasks
  (`prepare`, `generate`, `migrate-deploy`)

Local Postgres for this app is provisioned by `vp run db#prepare`. Prisma tasks live in
[`db/vite.config.ts`](../db/vite.config.ts).

## Local scripts

- `seed.ts` — database seed data (`vp run seed`)

## Vite tasks

Root [`vite.config.ts`](../../vite.config.ts) orchestrates workspace flows:

- `bootstrap` — packs workspace tooling packages via `dependsOn` (`vp run bootstrap`; also runs automatically before `dev`
  and `ready`)
- `dev` — depends on `bootstrap`, `db#prepare`, `seed`, and `graphql#codegen`; then runs
  `rwsdk#dev` and `graphql#dev` in parallel via `vp run --parallel`. Each package handles its own shutdown on Ctrl+C
- `seed` — runs `test-apps/scripts/seed.ts`; depends on `db#migrate-deploy`
- `ready` — format, lint, type-check, tests, and build across the workspace (`vp run ready`)

[`db/vite.config.ts`](../db/vite.config.ts) owns the db task graph via `createPrismaTasks()`:

- `prepare`
- `generate`, `migrate-deploy`

Cross-package ordering uses Vite+ `package#task` notation in `dependsOn` (e.g. `db#migrate-deploy`).

Generated files (gitignored): `db/.env` (Prisma contract) and repo-root `.cedarpg/` (`@cedarjs/pg` internal lease cache).
