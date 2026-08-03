# db

Workspace package for PostgreSQL + Prisma. Other apps import the shared client:

```ts
import { db, type User } from "db";
```

`test-apps/graphql` and `test-apps/scripts/seed.ts` depend on this package.

## Day to day

From the repo root, `vp run dev` handles the database for you: ensure a worktree-scoped Postgres (via
[`@cedarjs/pg`](https://www.npmjs.com/package/@cedarjs/pg) + [autopg](https://github.com/automagik-dev/autopg)), apply
migrations, generate the Prisma client, and seed data.

You usually do not need to run anything in this directory manually.

## Layout

| Path                   | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `index.ts`             | Exports `db` (`PrismaClient`) and model types |
| `prisma/schema.prisma` | Schema                                        |
| `prisma/migrations/`   | Migration history                             |
| `vite.config.ts`       | `db#…` task definitions                       |
| `.env`                 | Generated connection URL (gitignored)         |

## Tasks

Run from the repo root with `vp run db#<task>`:

| Task             | When to use                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `prepare`        | Ensure Postgres via `@cedarjs/pg` and refresh `.env` (used by root `dev`) |
| `generate`       | Regenerate `@prisma/client` after schema changes                          |
| `migrate-deploy` | Apply pending migrations (production-style; used by root `seed`)          |

Root tasks that depend on this package:

```bash
vp run dev    # db#prepare → migrate → seed → start apps
vp run seed   # db#migrate-deploy → test-apps/scripts/seed.ts
```

## Schema changes

1. Edit `prisma/schema.prisma`.
2. Create and apply a migration:

```bash
vp run db#prepare
cd test-apps/db && vp exec prisma migrate dev --name describe_your_change
```

1. Commit the new files under `prisma/migrations/`.

`vp run db#generate` runs as part of the root `dev` flow; run it yourself if you only need the client regenerated.

## Environment

**Prisma contract:** `test-apps/db/.env` → `DATABASE_URL` (written by `db#prepare`).

`@cedarjs/pg` also keeps an internal lease file at the repo-root `.cedarpg/dev.env`. Do not point Prisma or app code
at that file — treat it as `@cedarjs/pg` private state.

GraphQL service tests use an ephemeral `@cedarjs/pg` test database via `@rwgql/prisma-dev/test`, so `vp test` does not
read or write the dev database seeded by `test-apps/scripts/seed.ts`.

Override values by editing `.env` locally — it is gitignored.
