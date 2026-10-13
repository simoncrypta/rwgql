# Cedar local-testing-project on Vite+

A migration of [Cedar's local-testing-project](https://github.com/cedarjs/cedar/tree/main/local-testing-project),
pinned in [upstream.json](upstream.json). This demo intentionally keeps Cedar's `api/` and `web/` layout,
UUID user IDs, GraphQL SDL/services/directives, scaffold forms, pages, layouts, styles, and shared validators.
The original MIT license is included in [LICENSE](LICENSE).

From the repository root:

```sh
vp install
vp run local-testing-project#dev
```

One Vite server serves the web app, `/graphql`, `/auth`, `/hello`, and `/legacyHello` at
**http://localhost:8920**. Both web and API source changes use Vite's module graph; API code runs in Node.
The task generates Prisma/GraphQL types, acquires an app-scoped PostgreSQL lease via `@cedarjs/pg` 0.3.0,
applies migrations, and seeds an admin and a blog post. It leaves the existing demos' databases alone.
Login: **admin@example.com / password**.

Separate development is also supported:

```sh
vp run local-testing-api#dev
VITE_API_URL=http://localhost:8921 API_URL=http://localhost:8921 vp run local-testing-web#dev
```

## What changed

- Tooling: Vite+, pnpm workspace packages, Oxlint/Oxfmt (`vp check`), Vitest. Cedar CLI, ESLint,
  Prettier, Babel, Storybook, and the Cedar-specific test/scenario harness are replaced.
- Routing: mechanical `@cedarjs/router` → `@rwgql/router` imports. The route tree and paths remain;
  React Router framework mode generates `.rwgql/`. Page imports are explicit for TypeScript.
  `prerender` is accepted for source compatibility; these builds use runtime SSR, not static prerendering.
  Auth middleware lives in `src/root.ts`; reset tokens are read with `useSearchParams`.
- Cells: explicit `gql` imports and `export default createCell(...)`, retaining each QUERY and lifecycle
  component. The aggregated Cell composes its author fragment explicitly. Public Cells keep their original
  browser fetching behavior; the initial SSR HTML contains Loading, then Apollo renders the data.
- Apollo: direct Apollo 4 providers/hooks. A small app-local adapter supplies Apollo 3's error shape to
  **`@cedarjs/forms`**, which remains a standalone dependency. Its pinned `react-hook-form` version is shared
  by the app so form contexts and types use one instance.
- API: Fetch-native Yoga/dbAuth handlers, explicit generated schema/service registries,
  `@rwgql/auth` directives, and `@rwgql/log-formatter` operation logs. Cedar's Fetch hello function and
  legacy response shape both work. Validation helpers stay app-local.
- Database: the original models use PostgreSQL instead of SQLite, with a fresh PostgreSQL migration.
  Prisma **6.19** matches this repository's current Prisma baseline; upstream's Prisma 7 SQLite adapter
  is replaced. A generated client under `api/db/generated/client` avoids collisions with the other demo.
  Prisma's generated CommonJS boundary is loaded natively by Node; application code remains ESM.
- Shared validators retain their upstream source and package name. Tests cover Cells, the original
  formatters/validator, auth directives, and real HTTP flows.

The SDK also gains string-ID dbAuth sessions, standard GraphQL auth error codes, and optional React Router
root exports from `src/root.ts`. These let the migrated app preserve its UUID schema and private routes.
Generated files and local database/environment state are ignored by Git, Oxlint, and Oxfmt.

## Prisma

Commands run from the repository root, forward their arguments to the real Prisma CLI, and prepare the
app's database/environment first. `migrate dev` also acquires an independent cedar-pg shadow lease;
the application role never needs permission to create databases. For external databases, supply your own
`SHADOW_DATABASE_URL` when the database role cannot create one:

```sh
vp run local-testing-project#prisma validate
vp run local-testing-project#prisma generate
vp run local-testing-project#prisma migrate status
vp run local-testing-project#prisma migrate dev --name example
vp run local-testing-project#prisma studio
vp run local-testing-project#prisma db seed
```

You can also `cd test-apps/local-testing-project/api` and use `vp exec prisma ...` after `vp run prepare`.
`prisma.config.ts` supplies the schema, migration directory, and seed command. Preparing preserves other
keys in `api/.env`. `CEDAR_PG=0` with `DATABASE_URL` uses an external development database. In production,
set `NODE_ENV=production` and `DATABASE_URL`; local Postgres provisioning is disabled.

## Separate deployment

The API and web have independent builds and runtimes. They need the installed workspace packages and
built rwgql packages; no Cedar framework runtime is required.

```sh
# API build; generate runs without provisioning a database.
vp run local-testing-api#build
# API release migration (set production DATABASE_URL first).
NODE_ENV=production vp run local-testing-api#prisma migrate deploy
# API runtime (working directory: test-apps/local-testing-project/api).
NODE_ENV=production DATABASE_URL=... DB_AUTH_SECRET=... WEB_ORIGIN=https://web.example.com PORT=8921 vp run local-testing-api#start

# Web build: bake the public API origin into the browser bundle.
VITE_API_URL=https://api.example.com vp run local-testing-web#build
# Web runtime (working directory: test-apps/local-testing-project/web).
NODE_ENV=production API_URL=https://api.example.com PORT=8920 vp run local-testing-web#start
```

API output: `api/dist/server.mjs`, with its generated Prisma client in `api/db/generated/client` and
installed runtime dependencies. Web output: `web/build/client` and `web/build/server`, with installed web
runtime dependencies. The web deployment has **no Prisma client, database connection, or dbAuth secret**;
its server auth middleware validates forwarded session cookies against the API.

For authenticated SSR across subdomains, set `DB_AUTH_COOKIE_DOMAIN=.example.com` on the API so both
web and API receive the session cookie. Serve production over HTTPS; secure cookies are enabled.
For cross-site browser requests, configure `DB_AUTH_COOKIE_SAMESITE=None` and an exact `WEB_ORIGIN`.
Unrelated domains cannot share the cookie for SSR; use sibling domains for this demo's private pages.
`WEB_ORIGIN` accepts a comma-separated allowlist. The API echoes only an allowed origin for credentialed CORS.

## Validation

```sh
vp check
vp test --project local-testing-api --project local-testing-web --project @my-org/validators
vp run local-testing-project#build
vp run local-testing-project#e2e
```

The new web tests run in jsdom. The HTTP smoke test starts isolated servers, validates public and private
routes, typed params/404s, UUID login/signup/password-reset cookies, role enforcement, post/contact CRUD,
validation errors, API hot reload, and independent production builds with a separate browser API origin.
It cleans up only its own records and child processes. It uses ports 18920–18922.

The repo's existing Cedar web browser tests still require the configured Playwright environment.
This app does not recreate Cedar's Storybook, scenario runner, or generator/CLI parity.
