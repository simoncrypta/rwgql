import { act, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Outlet, RouterProvider, type RouteObject } from "react-router";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { useBlocker, useMatch, useParams, usePathname, useRouteName } from "./hooks.js";
import { NavLink } from "./links.js";
import { back, navigate, NavigationBridge, Redirect } from "./navigation.js";
import { registerRoutes, routes } from "./registry.js";

const definitions = [
  { name: "home", path: "/", params: {} },
  { name: "posts", path: "/posts", params: {} },
  { name: "post", path: "/posts/:id", params: { id: "Int" } },
  { name: "docs", path: "/docs/*", params: { path: "Glob" } },
] as const;

const Location = () => <p data-testid="location">{usePathname()}</p>;

const renderRoutes = (children: RouteObject[], initialEntries = ["/"]) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <>
            <NavigationBridge />
            <Location />
            <Outlet />
          </>
        ),
        children,
      },
    ],
    { initialEntries },
  );
  render(<RouterProvider router={router} />);
  return router;
};

beforeEach(() => {
  registerRoutes(definitions);
});

describe("routes", () => {
  it("builds paths from the registered definitions", () => {
    expect(routes.home()).toBe("/");
    expect(routes.post({ id: 7, tab: "comments" })).toBe("/posts/7?tab=comments");
    expect(routes.docs({ path: "a/b" })).toBe("/docs/a/b");
    expect("post" in routes).toBe(true);
    expect(Object.keys(routes)).toEqual(["home", "posts", "post", "docs"]);
  });

  it("throws a clear error for unknown names", () => {
    expect(() => routes.nope).toThrow('unknown route name "nope"');
  });
});

describe("navigate / back", () => {
  it("navigates through the bridge, supports replace, and goes back", async () => {
    const router = renderRoutes([
      { index: true, element: <p>home</p> },
      { path: "posts", element: <p>posts</p> },
      { path: "posts/:id", element: <p>post</p> },
    ]);

    await act(async () => navigate(routes.posts()));
    expect(screen.getByTestId("location")).toHaveTextContent("/posts");

    await act(async () => navigate(routes.post({ id: 1 }), { replace: true }));
    expect(router.state.location.pathname).toBe("/posts/1");
    expect(router.state.historyAction).toBe("REPLACE");

    await act(async () => back());
    expect(router.state.location.pathname).toBe("/");
  });
});

describe("NavLink", () => {
  it("uses activeClassName when active and honours matchSubPaths", () => {
    renderRoutes(
      [
        {
          path: "posts/:id",
          element: (
            <>
              <NavLink to="/posts" className="link" activeClassName="active">
                exact
              </NavLink>
              <NavLink to="/posts" className="link" activeClassName="active" matchSubPaths>
                sub
              </NavLink>
            </>
          ),
        },
      ],
      ["/posts/3"],
    );

    expect(screen.getByText("exact")).toHaveClass("link");
    expect(screen.getByText("exact")).not.toHaveClass("active");
    expect(screen.getByText("sub")).toHaveClass("active");
  });
});

describe("hooks", () => {
  it("useParams parses Cedar param types for the matched route; useRouteName names it", () => {
    let seen: unknown;
    let name: string | undefined;
    const Post = () => {
      seen = useParams();
      name = useRouteName();
      return null;
    };

    renderRoutes([{ id: "post", path: "posts/:id", Component: Post }], ["/posts/42"]);

    expect(seen).toEqual({ id: 42 });
    expect(name).toBe("post");
  });

  it("useMatch reports Cedar-style { match }", () => {
    const results: boolean[] = [];
    const Probe = () => {
      results.push(useMatch("/posts").match, useMatch("/posts", { matchSubPaths: true }).match);
      return null;
    };

    renderRoutes([{ path: "posts/:id", Component: Probe }], ["/posts/1"]);

    expect(results.slice(-2)).toEqual([false, true]);
  });

  it("useBlocker maps React Router's blocker to Cedar's states", async () => {
    let blocker: ReturnType<typeof useBlocker> | undefined;
    const Form = () => {
      blocker = useBlocker({ when: true });
      return <p>form {blocker.state}</p>;
    };

    const router = renderRoutes([
      { index: true, Component: Form },
      { path: "posts", element: <p>posts</p> },
    ]);

    await act(async () => navigate("/posts"));
    expect(blocker?.state).toBe("BLOCKED");
    expect(router.state.location.pathname).toBe("/");

    await act(async () => blocker?.confirm());
    expect(router.state.location.pathname).toBe("/posts");
  });
});

describe("Redirect", () => {
  it("navigates on render", () => {
    const router = renderRoutes([
      { index: true, element: <Redirect to="/posts" /> },
      { path: "posts", element: <p>posts</p> },
    ]);

    expect(router.state.location.pathname).toBe("/posts");
    expect(screen.getByText("posts")).toBeInTheDocument();
  });
});

describe("Link clicks", () => {
  it("stay client-side", () => {
    const router = renderRoutes([
      {
        index: true,
        element: (
          <NavLink to="/posts" activeClassName="active">
            go
          </NavLink>
        ),
      },
      { path: "posts", element: <p>posts</p> },
    ]);

    fireEvent.click(screen.getByText("go"));
    expect(router.state.location.pathname).toBe("/posts");
  });
});
