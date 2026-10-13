import type { ReactElement, ReactNode } from "react";
import type { RequestInfo } from "rwsdk/worker";
import { describe, expect, it, vi } from "vite-plus/test";

import { compileRoutes } from "./compileRoutes.js";
import type { NamedRoutes } from "./buildPath.js";
import { createNamedRoutes } from "./namedRoutes.js";
import { createRequireAuth } from "./createRequireAuth.js";

const HomePage = () => null;
const PostPage = () => null;

import type { LayoutWrapper } from "./withLayout.js";

const blogLayout: LayoutWrapper = (children) => children;

type Handler = (requestInfo: RequestInfo) => Response | Promise<Response>;

const handlerOf = (route: unknown) => (route as { readonly handler: Handler }).handler;

const requestInfoWith = (params: Record<string, string>) => ({ params }) as unknown as RequestInfo;

describe("compileRoutes", () => {
  it("generates worker route handlers from route definitions", () => {
    const renderPage = vi.fn((_requestInfo, children) => new Response(String(children)));
    const definitions = [
      { name: "home", path: "/", params: {}, page: HomePage, layoutWrapper: blogLayout },
      {
        name: "post",
        path: "/posts/:id",
        params: { id: "Int" },
        page: PostPage,
        layoutWrapper: blogLayout,
        private: true,
        requireAuth: createRequireAuth({ isAuthenticated: () => true }),
      },
    ] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;

    const { workerRoutes } = compileRoutes(definitions, { renderPage, routes });

    expect(routes.home()).toBe("/");
    expect(routes.post({ id: 7 })).toBe("/posts/7");
    expect(workerRoutes).toHaveLength(2);
  });

  it("passes Cedar-typed params to the page as props", async () => {
    const renderPage = vi.fn((_requestInfo, children: ReactNode) =>
      Response.json((children as ReactElement).props),
    );
    const definitions = [
      {
        name: "post",
        path: "/posts/:id/:published",
        params: { id: "Int", published: "Boolean" },
        page: PostPage,
      },
      { name: "docs", path: "/docs/*", params: { path: "Glob" }, page: PostPage },
    ] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;
    const { workerRoutes } = compileRoutes(definitions, { renderPage, routes });
    const [postHandler, docsHandler] = workerRoutes.map(handlerOf);

    const post = await postHandler!(requestInfoWith({ id: "7", published: "true" }));
    expect(await post.json()).toEqual({ id: 7, published: true });

    const docs = await docsHandler!(requestInfoWith({ $0: "guides/intro" }));
    expect(await docs.json()).toEqual({ path: "guides/intro" });
  });

  it("responds 404 when a param does not match its type", async () => {
    const renderPage = vi.fn();
    const definitions = [
      { name: "post", path: "/posts/:id", params: { id: "Int" }, page: PostPage },
    ] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;
    const { workerRoutes } = compileRoutes(definitions, { renderPage, routes });

    const response = await handlerOf(workerRoutes[0])(requestInfoWith({ id: "abc" }));

    expect(response.status).toBe(404);
    expect(renderPage).not.toHaveBeenCalled();
  });

  it("throws when private routes omit requireAuth", () => {
    const definitions = [
      { name: "home", path: "/", params: {}, page: HomePage, private: true },
    ] as const;
    const routes = createNamedRoutes(definitions) as NamedRoutes;

    expect(() =>
      compileRoutes(definitions, {
        renderPage: vi.fn(),
        routes,
      }),
    ).toThrow('@rwgql/router: private route "home" requires requireAuth');
  });
});
