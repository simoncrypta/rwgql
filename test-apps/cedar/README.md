# Cedar-shaped test app (React Router + Apollo)

This app is laid out like a [Cedar](https://github.com/cedarjs/cedar) project so it can show that a
Cedar web side runs on RedwoodGQL with few changes. Its routes, pages, layouts, and Cells are ported from
Cedar's `__fixtures__/test-project`.

| Cedar                                      | Here                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| `web/src/Routes.tsx`                       | `web/src/Routes.tsx` (same `<Router>/<Set>/<Private>`) |
| `web/src/App.tsx`                          | `web/src/App.tsx` (providers)                          |
| `web/index.html`                           | `web/src/Document.tsx`                                 |
| `web/src/entry.client.tsx`                 | `web/src/entry.client.tsx` + `entry.server.tsx` (SSR)  |
| `import { routes } from '@cedarjs/router'` | `import { routes } from "@rwgql/router"`               |
| Cells (`QUERY`/`Success` exports)          | `createCell` from `@rwgql/cell`                        |
| `api/`                                     | `test-apps/graphql` + `test-apps/db` for now           |

`@rwgql/router` compiles `Routes.tsx` into React Router framework-mode route modules under
`web/.rwgql/` (generated, gitignored). The `rwgqlRoutes()` Vite plugin keeps that directory in sync.
Pages are served with SSR on a Cloudflare Worker, and `cache` routes are edge-cacheable.
`<Private>` is checked on the server. Pages can export a `loader` that uses Apollo's `preloadQuery`
(see `HomePage`), and the data streams into the HTML.

```bash
cd test-apps/cedar/web
vp run dev     # http://localhost:8910 (needs the GraphQL API on :8911: `vp run graphql#dev`)
vp test        # component tests (browser mode)
vp run types   # react-router typegen + tsc
vp run e2e     # production build on workerd against a mock API (no database needed)
```
