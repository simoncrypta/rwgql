# Migrating a RedwoodJS (Cedar) app to rwgql

This guide walks through migrating a classic RedwoodJS GraphQL (Cedar) app to rwgql: `@rwgql/*`
packages, a Cedar-compatible web side on [React Router](https://reactrouter.com/) + Apollo Client, and the
[Vite+](https://viteplus.dev/guide/) toolchain.

"Before" snippets use the classic Cedar layout (`web/` + `api/`). "After" snippets point at the migrated
demo in [`test-apps/`](test-apps/) in this repository.

## 1. Before you start

### Target architecture

RedwoodJS splits an app into two yarn workspaces, `web/` and `api/`. rwgql splits it into three pnpm workspace
packages, each independently runnable:

```text
RedwoodJS (Cedar)                rwgql
─────────────────                ─────
web/                             test-apps/cedar/web/  Cedar-shaped web side: React Router SSR on a Worker + Apollo Client
api/  (functions, graphql,      test-apps/graphql/    GraphQL Yoga on node:http, SDL + services + directives
       services, directives)    test-apps/db/         Prisma schema, migrations, client — its own package
api/db/ (Prisma)
```

### Prerequisites

- [Vite+](https://viteplus.dev/guide/) (`vp`): `curl -fsSL https://vite.plus | bash`. Vite+ manages Node.js
  (>= 22.18.0) and pnpm for the repo — you do not install them separately.
- A RedwoodJS 8.x app using dbAuth, Prisma/PostgreSQL, and Cells (the shape this guide assumes).

### Features that are dropped by design

rwgql deliberately does not replace everything. Before migrating, know what goes away:

| RedwoodJS feature                                             | Status                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `<Metadata>` and `RedwoodProvider` `titleTemplate`            | Dropped. The `<title>` lives in `Document.tsx`; pages can export `meta`. |
| `FatalErrorBoundary`, `DevFatalErrorPage`                     | Dropped. The generated root route renders `FatalErrorPage` on errors.    |
| Prisma query logging (`emitLogLevels`, `handlePrismaLogging`) | Dropped. Use a bare `PrismaClient`.                                      |
| Storybook, Cell `.mock.ts` files, `mockGraphQLQuery`          | Dropped. Tests use Vitest + Testing Library instead.                     |
| `prerender` route flag (SSG)                                  | Dropped. Worker SSR + `@rwgql/router` `cache` headers replace it.        |
| Custom route param types                                      | Dropped. `Int`, `Float`, `Boolean`, `String`, and globs work.            |
| Generators and scaffolds (`yarn rw g ...`)                    | Dropped.                                                                 |
| The `yarn rw` CLI                                             | Replaced by `vp` and per-package Vite+ tasks.                            |

### Principles that drive the mechanical changes

- **ESM everywhere** — every `package.json` gets `"type": "module"`; no CommonJS, no Babel.
- **Zero magic** — no global `gql` and no glob imports (`import services from 'src/services/**/*.ts'`).
  Everything becomes an explicit import (`Routes.tsx` still accepts Cedar's auto-imported pages, for upgrades).
  Generated files are `*.gen.ts` / `.rwgql/`, produced by Vite+ tasks.
- **First-class dependencies** — Apollo Client, Yoga, Prisma, react-hook-form, and react-hot-toast are used directly
  instead of through `@redwoodjs/*` re-exports.

## 2. Scaffold the workspace

Replace yarn 4 workspaces and the Redwood toolchain (`@redwoodjs/core`, `@redwoodjs/project-config`,
`@redwoodjs/eslint-config`, `redwood.toml`, prettier, jest configs) with a pnpm workspace managed by Vite+.

1. Create `pnpm-workspace.yaml` at the root (see the root [`pnpm-workspace.yaml`](pnpm-workspace.yaml)):

   ```yaml
   packages:
     - test-apps/*
     - packages/*
   ```

2. Delete `redwood.toml`, `.eslintrc`/`eslintConfig`, `prettier.config.js`, `jest.config.js`, and the
   `@redwoodjs/core` / `@redwoodjs/project-config` devDependencies. Formatting and linting come from `vp check`
   (Oxfmt + Oxlint), configured in the root [`vite.config.ts`](vite.config.ts).
3. Ports move from `redwood.toml` into per-app config: the web dev server port lives in the web app's `dev` task
   (`vp dev --port 8910`) and the API port in the graphql `server` task (`vp dev --port 8911`).
4. Root-level orchestration (`yarn rw dev` equivalent) becomes Vite+ tasks in the root `vite.config.ts`. The `dev`
   task in this repo builds workspace packages, starts Postgres, migrates, seeds, and runs web + GraphQL in parallel.

From here on, run `vp install` instead of `yarn install`, and `vp check` / `vp test` instead of
`yarn rw lint` / `yarn rw test`.

## 3. Move the database to its own package

In RedwoodJS, Prisma lives under `api/db/` and the client under `api/src/lib/db.ts`. In rwgql it becomes a
standalone `db` workspace package that both the GraphQL server and scripts import.

1. Create `test-apps/db/` and move `schema.prisma` + `migrations/` into `test-apps/db/prisma/`.
2. Replace `api/src/lib/db.ts` with a package entry point. Before, the client in `api/src/lib/db.ts` wires
   Redwood's Prisma logging; after ([`test-apps/db/index.ts`](test-apps/db/index.ts)) it is intentionally minimal:

   ```ts
   // test-apps/db/index.ts
   import { PrismaClient } from "@prisma/client";
   import { ensurePrismaDatabaseUrl } from "./env.ts";

   ensurePrismaDatabaseUrl(import.meta.url, { levelsUp: 0 });

   export const db = new PrismaClient();

   export type * from "@prisma/client";
   ```

3. Wire local Postgres and Prisma tasks with `@cedarjs/pg` in the db package (see
   [`test-apps/db/vite.config.ts`](test-apps/db/vite.config.ts) and `prepareDev.ts`):

   ```ts
   // test-apps/db/vite.config.ts
   export default defineConfig({
     run: {
       tasks: {
         prepare: { command: "tsx scripts/prepare-dev.ts", cache: false },
         generate: { command: "prisma generate", input: ["prisma/schema.prisma"] },
         "migrate-deploy": {
           command: "prisma migrate deploy",
           dependsOn: ["prepare"],
           cache: false,
         },
       },
     },
   });
   ```

   This replaces `yarn rw prisma ...` commands with tasks like `vp run db#generate`, `vp run db#migrate-deploy`,
   and `vp run db#prepare` (acquire Postgres via `@cedarjs/pg` and sync `DATABASE_URL`).

4. Move `scripts/seed.ts` (previously run with `yarn rw exec seed`) to a plain script executed with `tsx` — in this
   repo it lives at [`test-apps/scripts/seed.ts`](test-apps/scripts/seed.ts) and runs as the root `seed` task. Any other
   `yarn rw exec` scripts become `tsx` scripts the same way.

## 4. Stand up the GraphQL server

RedwoodJS serves GraphQL from a serverless function, `api/src/functions/graphql.ts`, built with
`createGraphQLHandler` and glob imports:

```ts
// Before: api/src/functions/graphql.ts
import { createAuthDecoder } from "@redwoodjs/auth-dbauth-api";
import { createGraphQLHandler } from "@redwoodjs/graphql-server";

import directives from "src/directives/**/*.{js,ts}";
import sdls from "src/graphql/**/*.sdl.{js,ts}";
import services from "src/services/**/*.{js,ts}";

export const handler = createGraphQLHandler({
  authDecoder,
  getCurrentUser,
  directives,
  sdls,
  services /* ... */,
});
```

rwgql replaces it with GraphQL Yoga on Node `http` (Vite+ `vp dev` via a thin fetch middleware), and replaces the glob imports with a
generated, checked-in schema registry from `@rwgql/graphql-typegen`.

1. Create `test-apps/graphql/` and move `api/src/graphql/*.sdl.ts`, `api/src/services/*`, and `api/src/directives/*` into
   `test-apps/graphql/src/` — the SDL, services, and directives move over nearly as-is (see step 5 for auth details and
   the note on `ServiceResolver` below).
2. Add the schema registry codegen. `@rwgql/graphql-typegen` scans `src/graphql/`, `src/directives/`, and
   `src/services/` and generates `typeDefs.gen.ts`, `services.gen.ts`, and `getSchema.gen.ts` — explicit imports
   instead of Redwood's build-time globs. See the `regenerate-registry`, `export-schema`, and `codegen` tasks in
   [`test-apps/graphql/vite.config.ts`](test-apps/graphql/vite.config.ts).
3. Create the Yoga instance ([`test-apps/graphql/src/graphql.ts`](test-apps/graphql/src/graphql.ts)):

   ```ts
   import { createYoga } from "graphql-yoga";
   import { createAuthDecoder } from "@rwgql/dbauth/server";
   import { createAuthYogaPlugin } from "@rwgql/auth/graphql";

   import { getSchema } from "./getSchema.gen.ts";

   const authDecoder = createAuthDecoder({ cookieName, secret: dbAuthOptions.secret });

   export const createGraphqlYoga = () =>
     createYoga({
       graphqlEndpoint: "/graphql",
       plugins: [
         createAuthYogaPlugin({
           decodeSession: (request) => authDecoder(request),
           getCurrentUser: (session) => getCurrentUser(session as { id: number }),
         }),
       ],
       schema: getSchema(),
     });
   ```

4. Create a fetch-first HTTP app ([`test-apps/graphql/src/app.ts`](test-apps/graphql/src/app.ts)) and serve it with
   `node:http` in production / Vite middleware (`fetchDevServer`) in `vp dev`. Mount Yoga and dbAuth on Web Standard
   `Request`/`Response` — no framework HTTP layer. Lean operation logs can stay as a Yoga plugin writing to `console`.

5. Update service resolver types. Redwood generated `QueryResolvers` / `MutationResolvers` types via
   `yarn rw g types`; rwgql generates the same names from the exported SDL via graphql-codegen (the `codegen`
   task) and wraps them in `ServiceResolver` so services stay plain functions callable from tests:

   ```ts
   // Before                                                    // After
   export const posts: QueryResolvers['posts'] =                export const posts: ServiceResolver<QueryResolvers["posts"]> =
     () => db.post.findMany()                                     () => db.post.findMany();
   ```

   Relation resolvers (`Post: { author }`) keep the same shape. One behavioral difference: Prisma's fluent API
   (`db.post.findUnique(...).author()`) is replaced with explicit queries — see
   [`test-apps/graphql/src/services/posts/posts.ts`](test-apps/graphql/src/services/posts/posts.ts).

## 5. Migrate auth (API side)

dbAuth survives the migration almost configuration-for-configuration via `@rwgql/dbauth`.

1. `api/src/functions/auth.ts` (`DbAuthHandler` inside a serverless function) becomes a `DbAuthHandlerOptions` object.
   Move the options into a typed config module, then mount auth on the fetch handler with `handleDbAuthRequest`:

   ```ts
   // test-apps/graphql/src/auth/dbAuthConfig.ts
   import type { DbAuthHandlerOptions } from "@rwgql/dbauth/server";

   export const dbAuthOptions: DbAuthHandlerOptions = {
     authModelAccessor: "user",
     authFields: { id: "id", username: "email", hashedPassword: "hashedPassword" /* ... */ },
     login: {/* same handlers, errors, expires as before */},
     signup: {/* ... */},
     forgotPassword: {/* ... */},
     resetPassword: {/* ... */},
     cookie: { name: cookieName, attributes: { HttpOnly: true, Path: "/", SameSite: "Lax" } },
     secret: process.env.DB_AUTH_SECRET,
   };
   ```

   ```ts
   // test-apps/graphql/src/app.ts
   import { handleDbAuthRequest } from "@rwgql/dbauth/server";

   if (pathname === "/auth") {
     return handleDbAuthRequest(request, dbAuthOptions);
   }
   ```

   The `login`/`signup`/`forgotPassword`/`resetPassword` option shapes intentionally mirror
   `@redwoodjs/auth-dbauth-api`, so this is mostly a copy-paste. Compare
   `api/src/functions/auth.ts` with
   [`test-apps/graphql/src/auth/dbAuthConfig.ts`](test-apps/graphql/src/auth/dbAuthConfig.ts). Note that dbAuth sessions
   now require an explicit `secret` (`DB_AUTH_SECRET` env var) instead of Redwood's `SESSION_SECRET` convention.

2. `api/src/lib/auth.ts` keeps its job (`getCurrentUser`, `requireAuth`, `hasRole`) but swaps imports: `Decoded` from
   `@redwoodjs/api` and errors from `@redwoodjs/graphql-server` become `@rwgql/auth/graphql` exports. One structural
   change: there is no global `context` — `requireAuth(context, { roles })` takes the context explicitly. See
   [`test-apps/graphql/src/auth/auth.ts`](test-apps/graphql/src/auth/auth.ts).
3. The `requireAuth` / `skipAuth` directives are near drop-ins — `createValidatorDirective` moves from
   `@redwoodjs/graphql-server` to `@rwgql/auth/graphql`, and the SDL becomes a plain string (no `gql` tag needed):

   ```ts
   // After: test-apps/graphql/src/directives/requireAuth/requireAuth.ts
   import { createValidatorDirective, type ValidatorDirectiveFunc } from "@rwgql/auth/graphql";

   export const schema = `
     directive @requireAuth(roles: [String]) on FIELD_DEFINITION
   `;

   const validate: ValidatorDirectiveFunc<{ roles?: string[] }> = ({ context, directiveArgs }) => {
     applicationRequireAuth(context as AuthContext, { roles: directiveArgs.roles });
   };

   export default createValidatorDirective(schema, validate);
   ```

## 6. Scaffold the web app (React Router)

The web side keeps Cedar's shape (`Routes.tsx`, `App.tsx`, pages, layouts, Cells) but runs on
[React Router](https://reactrouter.com/start/framework/installation) framework mode: pages are server-rendered on a
Cloudflare Worker and hydrate in the browser. The full app is [`test-apps/cedar/web/`](test-apps/cedar/web/).

1. Replace `@redwoodjs/vite` with React Router, the Cloudflare Vite plugin, and `rwgqlRoutes()` from
   `@rwgql/router`, which compiles `src/Routes.tsx` into React Router route modules
   ([`vite.config.mts`](test-apps/cedar/web/vite.config.mts)):

   ```ts
   import { cloudflare } from "@cloudflare/vite-plugin";
   import { reactRouter } from "@react-router/dev/vite";
   import { rwgqlRoutes } from "@rwgql/router/vite";
   import { defineConfig } from "vite-plus";

   export default defineConfig({
     plugins: [rwgqlRoutes(), cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()],
   });
   ```

   and add [`react-router.config.ts`](test-apps/cedar/web/react-router.config.ts):

   ```ts
   export default {
     // Generated from src/Routes.tsx (gitignored). Cedar's Routes.tsx and React Router's routes.ts
     // would collide on case-insensitive filesystems, so the app directory is generated.
     appDirectory: ".rwgql",
     ssr: true,
     future: { v8_middleware: true, v8_viteEnvironmentApi: true },
   } satisfies Config;
   ```

2. Keep Cedar's entry files, adapted to server rendering:
   - [`src/Document.tsx`](test-apps/cedar/web/src/Document.tsx) replaces `web/index.html` (the `<title>` and
     stylesheets live here).
   - [`src/App.tsx`](test-apps/cedar/web/src/App.tsx) keeps the provider chain. `FatalErrorBoundary` is not needed:
     the generated root route renders `src/pages/FatalErrorPage` as its error boundary.
   - [`src/apollo.ts`](test-apps/cedar/web/src/apollo.ts) replaces `RedwoodApolloProvider`. It builds the client with
     [`@apollo/client-integration-react-router`](https://www.apollographql.com/docs/react/integrations/react-router)
     and forwards the session cookie during SSR:

     ```ts
     import {
       ApolloClient,
       createApolloLoaderHandler,
     } from "@apollo/client-integration-react-router";

     export const makeClient = (request?: Request) =>
       new ApolloClient({
         cache: new InMemoryCache(),
         link: new HttpLink({
           credentials: "include",
           headers: request ? { cookie: request.headers.get("cookie") ?? "" } : undefined,
           uri: graphqlUrl,
         }),
       });

     export const apolloLoader = createApolloLoaderHandler(makeClient);
     ```

   - [`src/entry.server.tsx`](test-apps/cedar/web/src/entry.server.tsx) and
     [`src/entry.client.tsx`](test-apps/cedar/web/src/entry.client.tsx) wrap React Router in `ApolloProvider`
     (streaming SSR on the server, hydration in the browser).
   - [`workers/app.ts`](test-apps/cedar/web/workers/app.ts) is the Worker entry. It decodes the dbAuth session cookie
     and tells the router who is logged in:

     ```ts
     import { routeAuthContext } from "@rwgql/router/server";

     const context = new RouterContextProvider();
     context.set(routeAuthContext, { isAuthenticated: Boolean(decodeSession(request)) });
     return requestHandler(request, context);
     ```

3. Migrate the auth client. `web/src/auth.ts` changes two imports and nothing else conceptually:

   ```ts
   // Before                                                // After
   import { createDbAuthClient, createAuth }                import { createAuthentication } from "@rwgql/auth";
     from '@redwoodjs/auth-dbauth-web'                      import { createDbAuthClient } from "@rwgql/dbauth/web";

   const dbAuthClient = createDbAuthClient()                const client = createDbAuthClient({ authUrl });

   export const { AuthProvider, useAuth } =                 export const { AuthProvider, useAuth } =
     createAuth(dbAuthClient)                                 createAuthentication(client);
   ```

## 7. Migrate routes

`Routes.tsx` keeps Cedar's file and vocabulary — `Router`, `Route`, `Set`, `PrivateSet`/`Private`,
`path="/posts/{id:Int}"`, `name`, `wrap`, `notfound` — and only the import changes. Compare `web/src/Routes.tsx`
with [`test-apps/cedar/web/src/Routes.tsx`](test-apps/cedar/web/src/Routes.tsx).

1. Import the route primitives from `@rwgql/router`:

   ```tsx
   import { Private, Route, Router, Set } from "@rwgql/router";

   const Routes = () => (
     <Router useAuth={useAuth}>
       <Route path="/login" page={LoginPage} name="login" />
       <Set wrap={BlogLayout} cache>
         <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />
         <Private unauthenticated="login">
           <Route path="/profile" page={ProfilePage} name="profile" />
         </Private>
         <Route path="/" page={HomePage} name="home" />
         <Route notfound page={NotFoundPage} />
       </Set>
     </Router>
   );

   export default Routes;
   ```

   The file is compiled statically and never rendered. Cedar's page auto-imports and `src/` directory-named imports
   still work (Cedar's own test-project `Routes.tsx` compiles unchanged), but explicit imports type-check, so the
   demo uses them.

2. `routes`, `Link`, `NavLink`, `navigate`, `back`, `useParams`, `useMatch`, and `useBlocker` come from
   `@rwgql/router`, as from `@redwoodjs/router`. `routes` is typed per app by the generated
   `src/routeDefinitions.gen.ts`; there is no local `routes` module.
3. Typed params (`{id:Int}`, `{x:Float}`, `{x:Boolean}`, `{slug:String}`, `{path...}`) reach the page as typed props.
   A value that does not match its type responds 404.
4. `<Private>` is enforced on the server: logged-out requests, including client-side navigations, are redirected to
   the `unauthenticated` route with `?redirectTo=`.
5. Replace `prerender` flags with `cache`. There is no SSG pass; public routes are server-rendered and cached at the
   edge via `cache` on a `Route` or `Set` (see [`packages/router/README.md`](packages/router/README.md)).

## 8. Migrate pages, layouts, and components

This step is a mechanical import swap across `src/pages/`, `src/layouts/`, and `src/components/`.

| RedwoodJS import                                                           | Replacement                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `import { useMutation } from '@redwoodjs/web'`                             | `import { useMutation } from "@apollo/client/react"`                                                               |
| `import type { TypedDocumentNode } from '@redwoodjs/web'`                  | `@graphql-typed-document-node/core` (usually replaced by `graphql()` documents, step 9)                            |
| `import { toast, Toaster } from '@redwoodjs/web/toast'`                    | `import { toast, Toaster } from "react-hot-toast"`                                                                 |
| `import { Link, NavLink, navigate, routes } from '@redwoodjs/router'`      | same names from `@rwgql/router`                                                                                    |
| `import type { CellSuccessProps, CellFailureProps } from '@redwoodjs/web'` | `@rwgql/cell` (or app-local aliases, see [`test-apps/cedar/web/types/cell.ts`](test-apps/cedar/web/types/cell.ts)) |
| `import { Form, TextField, ... } from '@redwoodjs/forms'`                  | app-local shim over react-hook-form (below)                                                                        |
| `import { Metadata } from '@redwoodjs/web'`                                | delete — use React Router's `meta` export if you need per-page tags                                                |
| global `gql` template tag                                                  | `graphql()` from `@/gql` (step 9)                                                                                  |

### Cells

Cells keep their `QUERY` / `Loading` / `Empty` / `Failure` / `Success` exports, but the file wires itself up
explicitly with `createCell` from `@rwgql/cell` instead of being transformed at build time. Compare
`web/src/components/AuthorCell/AuthorCell.tsx` with
[`test-apps/cedar/web/src/components/AuthorCell/AuthorCell.tsx`](test-apps/cedar/web/src/components/AuthorCell/AuthorCell.tsx):

```tsx
import { createCell } from "@rwgql/cell";
import { graphql } from "@/gql";
import type { ResultOf, VariablesOf } from "@graphql-typed-document-node/core";

export const QUERY = graphql(`
  query FindAuthorQuery($id: Int!) {
    author: user(id: $id) {
      email
      fullName
    }
  }
`);

export const Loading = () => <span>Loading...</span>;
export const Empty = () => <span>Empty</span>;
export const Failure = ({ error }: CellFailureProps<VariablesOf<typeof QUERY>>) => (
  <span style={{ color: "red" }}>Error: {error?.message}</span>
);
export const Success = ({ author }: CellSuccessProps<ResultOf<typeof QUERY>>) => (
  <span className="author-cell">{author?.fullName}</span>
);

export default createCell<ResultOf<typeof QUERY>, VariablesOf<typeof QUERY>>({
  QUERY,
  Loading,
  Empty,
  Failure,
  Success,
});
```

Cells fetch in the browser, like in Cedar, so the server-rendered HTML shows `Loading`. Add `suspense: true` to
`createCell` to render the Cell's data on the server instead (the demo does this for
[`PostsCell`](test-apps/cedar/web/src/components/Post/PostsCell/PostsCell.tsx)).

Pages can also skip Cells and load their data in a route loader with Apollo's `preloadQuery`, which streams the
result into the server-rendered HTML — that is what the demo's cached blog pages do
([`HomePage`](test-apps/cedar/web/src/pages/HomePage/HomePage.tsx)):

```tsx
export { QueryErrorBoundary as ErrorBoundary } from "@/components/QueryError/QueryError";

export const loader = apolloLoader<LoaderFunctionArgs>()(({ preloadQuery }) => ({
  blogPostsRef: preloadQuery(BlogPostsQueryDocument),
}));

const HomePage = () => {
  const { blogPostsRef } = useApolloLoaderData<typeof loader>();
  const { data } = useReadQuery(blogPostsRef);
  // ...
};
```

### Forms

`@redwoodjs/forms` was a wrapper over react-hook-form. rwgql uses react-hook-form directly plus a small
app-local shim that recreates the familiar components — copy
[`test-apps/cedar/web/src/lib/forms.tsx`](test-apps/cedar/web/src/lib/forms.tsx) into your app. It provides `Form`,
`Label`, `TextField`, `TextAreaField`, `NumberField`, `PasswordField`, `Submit`, `FieldError`, `FormError`, and the
`RWGqlError` type, so form JSX is unchanged:

```tsx
// Before                                                   // After
import {                                                    import {
  Form, TextField, TextAreaField,                             Form, TextField, TextAreaField,
  Submit, FieldError, Label,                                  Submit, FieldError, Label,
} from '@redwoodjs/forms'                                   } from "@/lib/forms";
```

A fully migrated page combining all of the swaps (forms, `useMutation`, toast, `useBlocker`, typed documents) is
[`test-apps/cedar/web/src/pages/ContactUsPage/ContactUsPage.tsx`](test-apps/cedar/web/src/pages/ContactUsPage/ContactUsPage.tsx);
diff it against `web/src/pages/ContactUsPage/ContactUsPage.tsx`.

## 9. Web typegen

Redwood generated `types/graphql` from a `graphql.config.js` project file plus the global `gql` tag. rwgql uses
standard GraphQL Code Generator with the client preset:

1. The GraphQL app exports its schema to `schema.graphql` (the `export-schema` task), and
   [`test-apps/graphql/codegen.ts`](test-apps/graphql/codegen.ts) generates:
   - `test-apps/cedar/web/src/gql/` — the client preset output. Queries are written as `graphql(\`...\`)`calls and
     get typed document nodes automatically, replacing both the global`gql`tag and the`import type { ... } from 'types/graphql'` pairs.
   - `types/graphql.d.ts` on the server — `QueryResolvers`, `MutationResolvers`, and relation resolver types via
     `createRedwoodResolverGenerateEntry()` from `@rwgql/graphql-typegen/codegen` (replaces `yarn rw g types`).
2. Add [`@0no-co/graphqlsp`](https://github.com/0no-co/graphqlsp) as a TypeScript plugin for in-editor validation of
   the embedded documents, replacing `graphql.config.js`.
3. Run it with `vp run graphql#codegen`; the task graph re-exports the schema and regenerates the registry first.

## 10. Migrate tests

Jest and `@redwoodjs/testing` are replaced by Vitest through Vite+, with different strategies per side.

### Web tests

- Test runner: Vitest browser mode with Playwright Chromium plus `@testing-library/react` — see the `test` block in
  [`test-apps/cedar/web/vite.config.mts`](test-apps/cedar/web/vite.config.mts). Run them with `vp run test`, which
  generates `src/gql` and the route definitions first.
- Delete `.mock.ts` files and `.stories.tsx` files (`mockGraphQLQuery` and Storybook are dropped).
- Pages and layouts that use router hooks or loaders render through a small `renderRoute` helper built on React
  Router's `createRoutesStub` ([`testUtils/renderRoute.tsx`](test-apps/cedar/web/testUtils/renderRoute.tsx)), and
  GraphQL is stubbed at `fetch` — see
  [`HomePage.test.tsx`](test-apps/cedar/web/src/pages/HomePage/HomePage.test.tsx):

  ```tsx
  vi.stubGlobal("fetch", vi.fn(graphqlResponse({ blogPosts: [post] })));

  renderRoute(HomePage, { loader });

  expect(await screen.findByText("First post")).toBeInTheDocument();
  ```

- Modules like `@/auth` that need a browser-safe stand-in are swapped with a Vite alias in test mode (see the
  `resolve.alias` block in the web `vite.config`).
- End to end: `vp run e2e` runs the production Worker build against a mock API, and `vp run e2e:fullstack` runs
  `vp dev` against the real API and database.

### API tests

- Scenarios (`defineScenario`, `ScenarioData`, `*.scenarios.ts`) are replaced by plain fixture functions plus a real
  ephemeral test database. App-local helpers use `@cedarjs/pg/vitest/template`: migrate once in Vitest
  `globalSetup`, mark TEMPLATE, clone per worker via `setupFiles`, then role-scoped dispose (see
  [`test-apps/graphql/testUtils/globalSetup.ts`](test-apps/graphql/testUtils/globalSetup.ts) and
  [`test-apps/graphql/testUtils/cedarWorker.ts`](test-apps/graphql/testUtils/cedarWorker.ts)); each test resets tables and
  seeds what it needs (see [`test-apps/graphql/testUtils/db.ts`](test-apps/graphql/testUtils/db.ts)).
- Services are called through `callService` from `@rwgql/graphql-typegen/yoga`, which mirrors Redwood's service call
  convention (args first, optional root):

  ```ts
  import { callService } from "@rwgql/graphql-typegen/yoga";

  const result = await callService(post, { id: fixture.post.one.id });
  const author = await callService(Post.author!, {}, result!);
  ```

- `mockRedwoodDirective` / `getDirectiveName` become a small app-local `mockValidatorDirective` helper (copy
  [`test-apps/graphql/testUtils/directives.ts`](test-apps/graphql/testUtils/directives.ts)); directive tests otherwise read
  the same. Compare
  [`test-apps/graphql/src/directives/requireAuth/requireAuth.test.ts`](test-apps/graphql/src/directives/requireAuth/requireAuth.test.ts)
  with its classic Cedar counterpart.

## 11. Clean up and verify

Delete everything the new stack replaced:

- `redwood.toml`, `graphql.config.js`, all `jest.config.js` files, `prettier.config.js`
- `api/src/functions/` (both `graphql.ts` and `auth.ts` — replaced by the Yoga/`node:http` server)
- `api/src/lib/logger.ts` and the Prisma logging in `db.ts`
- `*.mock.ts`, `*.stories.tsx`, and Storybook config
- All `@redwoodjs/*` entries in every `package.json`

Then verify:

```bash
vp install        # install workspace dependencies
vp check          # format, lint, type-check
vp run -r test    # unit + browser tests (generates gql + routes first)
vp run dev        # postgres + migrate + seed + web (8910) + graphql (8911)
```

Smoke-test parity by hand: signup/login/logout, forgot/reset password, Posts and Contacts scaffold CRUD (behind
auth), and the public blog pages.

## Appendix: package mapping reference

| RedwoodJS package / export                                                                           | Replacement                                                       | Kind      |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------- |
| `@redwoodjs/web` → `useMutation`                                                                     | `@apollo/client/react`                                            | npm       |
| `@redwoodjs/web` → `TypedDocumentNode`                                                               | `@graphql-typed-document-node/core` / codegen documents           | npm       |
| `@redwoodjs/web` → Cells, `CellSuccessProps`, `CellFailureProps`                                     | `@rwgql/cell`                                                     | rwgql     |
| `@redwoodjs/web` → `Metadata`, `RedwoodProvider`                                                     | dropped (title in `Document.tsx`, React Router `meta`)            | dropped   |
| `@redwoodjs/web` → `FatalErrorBoundary`, `DevFatalErrorPage`                                         | generated root `ErrorBoundary` renders `FatalErrorPage`           | rwgql     |
| `@redwoodjs/web/toast`                                                                               | `react-hot-toast`                                                 | npm       |
| `@redwoodjs/web/apollo` → `RedwoodApolloProvider`                                                    | `@apollo/client-integration-react-router` (`apollo.ts`)           | npm       |
| `@redwoodjs/router` (Link, NavLink, navigate, useBlocker, Router, Route, Private, Set, named routes) | `@rwgql/router` (compiled to React Router)                        | rwgql     |
| `@redwoodjs/router` → `prerender`                                                                    | worker SSR + `cache` headers (`@rwgql/router`)                    | rwgql     |
| `@redwoodjs/forms`                                                                                   | react-hook-form + app-local `lib/forms.tsx` shim                  | npm       |
| `@redwoodjs/auth-dbauth-web`                                                                         | `@rwgql/dbauth/web` + `@rwgql/auth`                               | rwgql     |
| `@redwoodjs/auth-dbauth-api`                                                                         | `@rwgql/dbauth/server` + `/decoder`                               | rwgql     |
| `@redwoodjs/graphql-server` → `createGraphQLHandler`                                                 | Yoga + `node:http` + `@rwgql/graphql-typegen` registry            | rwgql     |
| `@redwoodjs/graphql-server` → directives, errors                                                     | `@rwgql/auth/graphql`                                             | rwgql     |
| `@redwoodjs/api` → `Decoded`, auth decoding                                                          | `@rwgql/dbauth/decoder`                                           | rwgql     |
| `@redwoodjs/api/logger`                                                                              | Yoga plugin / console (optional `@rwgql/log-formatter`)           | rwgql/npm |
| `@redwoodjs/api/logger` → Prisma log helpers                                                         | dropped                                                           | dropped   |
| `@redwoodjs/testing/web`                                                                             | Vitest browser mode + `@testing-library/react`                    | npm       |
| `@redwoodjs/testing/api` → scenarios                                                                 | fixtures + `@cedarjs/pg/vitest/template`                          | npm       |
| `@redwoodjs/testing/api` → `mockRedwoodDirective`                                                    | app-local `mockValidatorDirective` helper                         | app code  |
| `@redwoodjs/vite`                                                                                    | `@react-router/dev` + `@cloudflare/vite-plugin` + `rwgqlRoutes()` | npm       |
| `@redwoodjs/core`, `project-config`, `eslint-config`                                                 | Vite+ (`vp check`, `vp test`, tasks)                              | Vite+     |
| `yarn rw` CLI, `rw exec` scripts                                                                     | `vp` tasks + `tsx` scripts                                        | Vite+     |
| Redwood web typegen (`types/graphql`) + `graphql.config.js`                                          | graphql-codegen client preset + `@0no-co/graphqlsp`               | npm       |
| Storybook + Cell mocks                                                                               | dropped                                                           | dropped   |
| Generators / scaffolds                                                                               | dropped                                                           | dropped   |
