import { describe, expect, it } from "vite-plus/test";

import { parseRoutesSource } from "./parseRoutesSource.js";
import { flattenRoutes, type RouteEntry, type SetEntry } from "./routeIR.js";

const parse = (jsx: string) => parseRoutesSource(`const Routes = () => (${jsx});`);

const routesOf = (jsx: string) =>
  Object.fromEntries(flattenRoutes(parse(jsx).children).map((route) => [route.name, route]));

const DEFAULT_CACHE = "public, max-age=60, stale-while-revalidate=300";

describe("parseRoutesSource", () => {
  it("finds the Router inside a Cedar Routes component and records import bindings", () => {
    const ir = parseRoutesSource(`
      import { Router, Route } from "@rwgql/router";
      import HomePage from "@/pages/HomePage/HomePage";
      import { AboutPage as About } from "./pages";

      const Routes = () => {
        return (
          <Router useAuth={useAuth}>
            <Route path="/" page={HomePage} name="home" prerender />
            <Route path="/about" page={About} name="about" />
            <Route path="/auto" page={AutoPage} name="auto" />
          </Router>
        );
      };

      export default Routes;
    `);

    const [home, about, auto] = ir.children as RouteEntry[];
    expect(home?.page).toEqual({
      identifier: "HomePage",
      binding: { source: "@/pages/HomePage/HomePage", imported: "default" },
    });
    expect(about?.page).toEqual({
      identifier: "About",
      binding: { source: "./pages", imported: "AboutPage" },
    });
    // Not imported: resolved later as a Cedar auto-imported page.
    expect(auto?.page).toEqual({ identifier: "AutoPage" });
  });

  it("parses Cedar param types and the notfound route", () => {
    const routes = routesOf(`
      <Router>
        <Route path="/posts/{id:Int}/{slug}" page={PostPage} name="post" />
        <Route path="/docs/{path...}" page={DocsPage} name="docs" />
        <Route notfound page={NotFoundPage} />
      </Router>
    `);

    expect(routes.post).toMatchObject({
      path: "/posts/:id/:slug",
      params: { id: "Int", slug: "String" },
    });
    expect(routes.docs).toMatchObject({ path: "/docs/*", params: { path: "Glob" } });
    expect(routes.notFound).toMatchObject({ path: "*", notfound: true, params: {} });
  });

  it("keeps Set wrappers, wrap arrays, and layout props", () => {
    const [set] = parse(`
      <Router>
        <Set wrap={[OuterLayout, InnerLayout]} title="Posts" titleTo="posts" count={2} flag={false} icon={PostIcon}>
          <Route path="/posts" page={PostsPage} name="posts" />
        </Set>
      </Router>
    `).children as SetEntry[];

    expect(set?.wraps.map((wrap) => wrap.identifier)).toEqual(["OuterLayout", "InnerLayout"]);
    expect(set?.props).toEqual({
      title: { kind: "literal", value: "Posts" },
      titleTo: { kind: "literal", value: "posts" },
      count: { kind: "literal", value: 2 },
      flag: { kind: "literal", value: false },
      icon: { kind: "identifier", ref: { identifier: "PostIcon" } },
    });
  });

  it("inherits Private/PrivateSet auth and roles, including nested and route-level private", () => {
    const routes = routesOf(`
      <Router>
        <Route path="/login" page={LoginPage} name="login" />
        <Route path="/admin-login" page={LoginPage} name="adminLogin" />
        <Set wrap={Layout}>
          <Private unauthenticated="login">
            <Route path="/profile" page={ProfilePage} name="profile" />
            <PrivateSet unauthenticated="adminLogin" roles={["admin", "editor"]}>
              <Route path="/admin" page={AdminPage} name="admin" />
            </PrivateSet>
          </Private>
          <Set private unauthenticated="login" roles="owner">
            <Route path="/billing" page={BillingPage} name="billing" />
          </Set>
          <Route path="/settings" page={SettingsPage} name="settings" private />
        </Set>
      </Router>
    `);

    expect(routes.login).toMatchObject({ private: false, unauthenticated: undefined });
    expect(routes.profile).toMatchObject({ private: true, unauthenticated: "login" });
    expect(routes.admin).toMatchObject({
      private: true,
      unauthenticated: "adminLogin",
      roles: ["admin", "editor"],
    });
    expect(routes.billing).toMatchObject({ private: true, roles: ["owner"] });
    expect(routes.settings).toMatchObject({ private: true });
  });

  it("resolves cache: Set default, route override, opt-out, custom policy, never under Private", () => {
    const routes = routesOf(`
      <Router>
        <Route path="/double" page={DoublePage} name="double" cache />
        <Route path="/login" page={LoginPage} name="login" />
        <Set wrap={BlogLayout} cache>
          <Route path="/" page={HomePage} name="home" />
          <Route path="/contact" page={ContactPage} name="contact" cache={false} />
          <Route path="/feed" page={FeedPage} name="feed" cache="public, max-age=5" />
          <Private unauthenticated="login">
            <Route path="/profile" page={ProfilePage} name="profile" cache />
          </Private>
        </Set>
      </Router>
    `);

    expect(routes.double?.cacheControl).toBe(DEFAULT_CACHE);
    expect(routes.login?.cacheControl).toBeUndefined();
    expect(routes.home?.cacheControl).toBe(DEFAULT_CACHE);
    expect(routes.contact?.cacheControl).toBeUndefined();
    expect(routes.feed?.cacheControl).toBe("public, max-age=5");
    expect(routes.profile?.cacheControl).toBeUndefined();
  });

  it("parses redirect routes", () => {
    const routes = routesOf(`
      <Router>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/old-home" redirect="home" name="oldHome" />
      </Router>
    `);

    expect(routes.oldHome).toMatchObject({ redirect: "home", page: undefined });
  });

  it.each([
    [
      "duplicate names",
      `<Router><Route path="/a" page={A} name="x" /><Route path="/b" page={B} name="x" /></Router>`,
      'duplicate route name "x"',
    ],
    [
      "duplicate paths",
      `<Router><Route path="/a" page={A} name="a" /><Route path="/a" page={B} name="b" /></Router>`,
      'duplicate route path "/a"',
    ],
    [
      "computed Set props",
      `<Router><Set wrap={L} title={getTitle()}><Route path="/a" page={A} name="a" /></Set></Router>`,
      "must be a literal, a route name, or an imported identifier (got CallExpression)",
    ],
    [
      "spread props",
      `<Router><Set wrap={L} {...props}><Route path="/a" page={A} name="a" /></Set></Router>`,
      "cannot use spread props",
    ],
    [
      "unknown elements",
      `<Router><Wrapper><Route path="/a" page={A} name="a" /></Wrapper></Router>`,
      "got <Wrapper>",
    ],
    [
      "conditional routes",
      `<Router>{enabled && <Route path="/a" page={A} name="a" />}</Router>`,
      "route trees may only contain",
    ],
    ["missing name", `<Router><Route path="/a" page={A} /></Router>`, "requires name"],
    ["missing page", `<Router><Route path="/a" name="a" /></Router>`, "requires page"],
    [
      "private without unauthenticated",
      `<Router><PrivateSet><Route path="/a" page={A} name="a" /></PrivateSet></Router>`,
      'requires unauthenticated="<route name>"',
    ],
    [
      "unsupported route props",
      `<Router><Route path="/a" page={A} name="a" exact /></Router>`,
      'does not support prop "exact"',
    ],
    [
      "invalid param types",
      `<Router><Route path="/a/{id:Uuid}" page={A} name="a" /></Router>`,
      'unsupported param type "Uuid"',
    ],
  ])("rejects %s with a located error", (_label, jsx, message) => {
    expect(() => parse(jsx)).toThrow(message);
    expect(() => parse(jsx)).toThrow(/Routes\.tsx:\d+:\d+|Routes\.tsx /);
  });

  it("errors when there is no Router", () => {
    expect(() => parseRoutesSource("export default 1;")).toThrow("has no <Router> element");
  });
});
