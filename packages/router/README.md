# @rwgql/router

Cedar-compatible routing for rwgql. You write Cedar's `src/Routes.tsx`, and it is compiled to
[React Router](https://reactrouter.com) framework-mode route modules. App code keeps Cedar's API:
`routes`, `Link`, `NavLink`, `navigate`, `back`, `useParams`, `useMatch`, `useBlocker`, `Redirect`.

See `test-apps/cedar/web` for a full app.

## Routes.tsx

```tsx
import { Private, Route, Router, Set } from "@rwgql/router";

const Routes = () => (
  <Router>
    <Route path="/login" page={LoginPage} name="login" />
    <Set wrap={BlogLayout} cache>
      <Route path="/" page={HomePage} name="home" />
      <Route path="/blog-post/{id:Int}" page={BlogPostPage} name="blogPost" />
      <Private unauthenticated="login">
        <Route path="/profile" page={ProfilePage} name="profile" />
      </Private>
      <Route notfound page={NotFoundPage} />
    </Set>
  </Router>
);

export default Routes;
```

The file is compiled statically, as Cedar does, and is never rendered. Supported:

- `<Route path page name notfound cache redirect>`. `prerender`, `whileLoadingPage`, and
  `<Router useAuth>` are accepted for Cedar compatibility.
- `<Set wrap={A | [A, B]} {...literal props}>`, `<PrivateSet>`, `<Private>`, `<Set private>`, and
  `roles`.
- Page auto-imports (`ContactNewContactPage` → `src/pages/Contact/NewContactPage/NewContactPage`)
  and directory-named imports (`src/layouts/BlogLayout`).
- Set props must be literals, route names, or imported identifiers. Computed values, spreads, and
  conditional routes fail with a `Routes.tsx:line:col` error.

Cedar's own `__fixtures__/test-project/web/src/Routes.tsx` compiles unchanged (see
`src/codegen/__fixtures__`).

## React Router setup

```ts
// react-router.config.ts
export default {
  appDirectory: ".rwgql", // generated; avoids Routes.tsx vs routes.ts clashing on macOS
  ssr: true,
  future: { v8_middleware: true },
} satisfies Config;

// vite.config.ts: rwgqlRoutes() before reactRouter()
plugins: [rwgqlRoutes(), cloudflare({ viteEnvironment: { name: "ssr" } }), reactRouter()];
```

The generated `.rwgql/` contains `routes.ts`, a `root.tsx` that renders `src/Document.tsx` →
`src/App.tsx`, and `FatalErrorPage`/`NotFoundPage` as error boundaries. It also contains
re-exports of `src/entry.{server,client}.tsx`, one layout module per Set, and one module per route.
Route modules forward a page's `loader`, `headers`, `meta`, `ErrorBoundary`, and so on, and they
pass Cedar-typed params to the page as props.

Server side, set the auth state for `<Private>` per request:

```ts
import { routeAuthContext } from "@rwgql/router/server";

context.set(routeAuthContext, { isAuthenticated: Boolean(session) });
```

Private Sets get `requireAuth` middleware, which responds with a 302 to the `unauthenticated` route
and adds `?redirectTo=`. A server loader on each private Set makes client-side navigations
round-trip, so the check also runs on client-side navigation.

## Route params

Paths use Cedar's param syntax. Params arrive at the page as typed props, and `routes.*` helpers
are typed per route from `src/routeDefinitions.gen.ts`:

| Path segment    | Page prop / helper param type |
| --------------- | ----------------------------- |
| `{id}`          | `string`                      |
| `{slug:String}` | `string`                      |
| `{id:Int}`      | `number`                      |
| `{x:Float}`     | `number`                      |
| `{x:Boolean}`   | `boolean`                     |
| `{path...}`     | `string` (glob, last segment) |

A value that does not match its type (for example `/posts/abc` for `{id:Int}`) responds 404.
`useParams()` returns the typed values for the matched route.
Extra keys passed to a helper become the query string:
`routes.post({ id: 1, tab: "comments" })` → `/posts/1?tab=comments`. Custom param types are not
supported.

## Public routes and edge caching

Pages render on the edge (SSR in a Cloudflare Worker). For public pages, the alternative to Cedar's
build-time prerender is **edge SSR plus CDN caching** rather than static HTML generated at build time.

Mark cacheable routes with `cache`:

```tsx
<Set wrap={BlogLayout} cache>
  <Route path="/about" page={AboutPage} name="about" />
</Set>
```

- `cache` on `<Set>` applies to all public child routes.
- `cache` on `<Route>` applies to that route (or overrides a Set default).
- `cache={false}` opts a route out of an inherited Set policy.
- A custom policy string is supported: `cache="public, max-age=300"`.
- Routes inside `<Private>` never receive cache headers, even under a caching Set.

Default policy: `public, max-age=60, stale-while-revalidate=300`.

The generated route module exports `headers` with `Cache-Control`; a page's own `headers` export takes
precedence.
Cloudflare can then cache the SSR HTML response at the edge.

Auth, form, and session routes should omit `cache` so responses stay private.

## Package exports

| Export                  | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `@rwgql/router`         | Cedar API on React Router: route-tree markers, `routes`, links, hooks    |
| `@rwgql/router/server`  | `routeAuthContext`, `requireAuth` middleware                             |
| `@rwgql/router/vite`    | `rwgqlRoutes()`: compile `Routes.tsx` into `.rwgql/` and keep it in sync |
| `@rwgql/router/codegen` | Parser, module resolution, React Router emitter, route definitions       |
| `@rwgql/router/tasks`   | Vite Task helpers (`createGenerateRoutesTasks`)                          |

## Cedar parity note

Classic Redwood `prerender` and `*.routeHooks.ts` / `routeParameters()` are intentionally **not**
replicated here. They target build-time SSG, which does not match the edge SSR model. `prerender` is
accepted and ignored; use `cache` on public routes instead.
