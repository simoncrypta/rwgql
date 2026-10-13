import { RouterContextProvider } from "react-router";
import { describe, expect, it, vi } from "vite-plus/test";

import { requireAuth, routeAuthContext, type RouteAuth } from "./server.js";

const run = async (auth: RouteAuth | undefined, roles?: readonly string[]) => {
  const context = new RouterContextProvider();
  if (auth) {
    context.set(routeAuthContext, auth);
  }
  const next = vi.fn(async () => new Response("ok"));
  const middleware = requireAuth({ loginPath: "/login", roles });

  try {
    const result = await middleware(
      {
        context,
        params: {},
        request: new Request("http://localhost/posts/1?tab=x"),
        unstable_pattern: "/posts/:id",
      } as never,
      next,
    );
    return { next, result };
  } catch (thrown) {
    return { next, thrown: thrown as Response };
  }
};

describe("requireAuth", () => {
  it("redirects anonymous requests to the login route with redirectTo", async () => {
    const { next, thrown } = await run(undefined);

    expect(next).not.toHaveBeenCalled();
    expect(thrown?.status).toBe(302);
    expect(thrown?.headers.get("Location")).toBe("/login?redirectTo=%2Fposts%2F1%3Ftab%3Dx");
  });

  it("lets authenticated requests through", async () => {
    const { next, thrown } = await run({ isAuthenticated: true });

    expect(thrown).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it("checks roles and denies when the app provides no hasRole", async () => {
    expect((await run({ isAuthenticated: true }, ["admin"])).thrown?.status).toBe(302);
    expect(
      (await run({ isAuthenticated: true, hasRole: () => false }, ["admin"])).thrown?.status,
    ).toBe(302);
    expect(
      (await run({ isAuthenticated: true, hasRole: (r) => r.includes("admin") }, ["admin"])).next,
    ).toHaveBeenCalledOnce();
  });
});
