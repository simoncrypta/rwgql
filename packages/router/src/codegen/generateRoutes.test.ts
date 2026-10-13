import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vite-plus/test";

import { generateRoutes } from "./generateRoutes.js";

const roots: string[] = [];

const makeWebRoot = (files: Record<string, string>, { reactRouter = true } = {}) => {
  const root = mkdtempSync(path.join(tmpdir(), "rwgql-router-"));
  roots.push(root);

  if (reactRouter) {
    files = { "react-router.config.ts": "export default {};\n", ...files };
  }

  for (const [relative, content] of Object.entries(files)) {
    const file = path.join(root, relative);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }

  return root;
};

const read = (root: string, relative: string) => readFileSync(path.join(root, relative), "utf8");

const component = "export default () => null;\n";

// Tests run from the package or the repo root (vitest projects).
const fixturePath = (relative: string) => {
  const inPackage = path.join("src", "codegen", "__fixtures__", relative);
  const candidates = [
    path.resolve(process.cwd(), inPackage),
    path.resolve(process.cwd(), "packages", "router", inPackage),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not find fixture ${relative} from ${process.cwd()}`);
  }
  return found;
};

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("generateRoutes (React Router)", () => {
  it("compiles Cedar's test-project Routes.tsx unchanged", () => {
    const cedarRoutes = readFileSync(fixturePath("cedar-test-project/Routes.tsx.fixture"), "utf8");
    const pages = [
      "AboutPage/AboutPage",
      "AggregatedBlogPostPage/AggregatedBlogPostPage",
      "BlogPostPage/BlogPostPage",
      "ChangePasswordPage/ChangePasswordPage",
      "Contact/ContactPage/ContactPage",
      "Contact/ContactsPage/ContactsPage",
      "Contact/EditContactPage/EditContactPage",
      "Contact/NewContactPage/NewContactPage",
      "ContactUsPage/ContactUsPage",
      "DoublePage/DoublePage",
      "FatalErrorPage/FatalErrorPage",
      "ForgotPasswordPage/ForgotPasswordPage",
      "HomePage/HomePage",
      "LoginPage/LoginPage",
      "NotFoundPage/NotFoundPage",
      "Post/EditPostPage/EditPostPage",
      "Post/NewPostPage/NewPostPage",
      "Post/PostPage/PostPage",
      "Post/PostsPage/PostsPage",
      "ProfilePage/ProfilePage",
      "ResetPasswordPage/ResetPasswordPage",
      "SignupPage/SignupPage",
      "WaterfallPage/WaterfallPage",
    ];
    const root = makeWebRoot({
      "src/Routes.tsx": cedarRoutes,
      "src/auth.ts": "export const useAuth = () => null;\n",
      "src/layouts/BlogLayout/BlogLayout.tsx": component,
      "src/layouts/ScaffoldLayout/ScaffoldLayout.tsx": component,
      ...Object.fromEntries(pages.map((page) => [`src/pages/${page}.tsx`, component])),
    });

    generateRoutes({ root });

    const definitions = read(root, "src/routeDefinitions.gen.ts");
    for (const name of [
      "double",
      "changePassword",
      "newContact",
      "editContact",
      "aggregatedBlogPost",
      "waterfall",
      "profile",
      "home",
      "notFound",
    ]) {
      expect(definitions).toContain(`name: "${name}"`);
    }
    expect(definitions).toContain(
      '{ name: "editContact", path: "/contacts/:id/edit", params: { id: "Int" } }',
    );

    // Auto-imported page (ContactNewContactPage) and directory-named layout import.
    expect(read(root, ".rwgql/routes/newContact.tsx")).toContain(
      'export { default } from "../../src/pages/Contact/NewContactPage/NewContactPage";',
    );
    expect(read(root, ".rwgql/sets/set-0.tsx")).toContain(
      'import ScaffoldLayout from "../../src/layouts/ScaffoldLayout/ScaffoldLayout";',
    );

    // <Private unauthenticated="login"> under the BlogLayout Set.
    const routeConfig = read(root, ".rwgql/routes.ts");
    expect(routeConfig).toContain('route("profile", "routes/profile.tsx", { id: "profile" })');
    const privateSet = read(root, ".rwgql/sets/set-3.tsx");
    expect(privateSet).toContain('requireAuth({ loginPath: "/login" })');
    expect(privateSet).toContain("export const loader = () => null;");

    // The fixture's Router never imports the root files; the generated root still works.
    expect(read(root, ".rwgql/root.tsx")).toContain(
      'import FatalErrorPageModule from "../src/pages/FatalErrorPage/FatalErrorPage";',
    );
  });

  it("emits a stable app directory (golden)", () => {
    const root = makeWebRoot({
      "src/Routes.tsx": `
        import { Private, Route, Router, Set } from "@rwgql/router";
        import AppLayout from "@/layouts/AppLayout";
        import { Icon } from "@my-org/ui";

        const Routes = () => (
          <Router>
            <Route path="/login" page={LoginPage} name="login" />
            <Set wrap={AppLayout} title="App" icon={Icon} cache>
              <Route path="/" page={HomePage} name="home" />
              <Route path="/posts/{id:Int}" page={PostPage} name="post" />
              <Route path="/old" redirect="home" name="old" />
              <Private unauthenticated="login" roles="admin">
                <Route path="/admin" page={AdminPage} name="admin" />
              </Private>
              <Route notfound page={NotFoundPage} />
            </Set>
          </Router>
        );

        export default Routes;
      `,
      "src/App.tsx": component,
      "src/Document.tsx": "export const Document = () => null;\n",
      "src/entry.client.tsx": "console.log('hydrate');\n",
      "src/entry.server.tsx": component,
      "src/layouts/AppLayout/AppLayout.tsx": component,
      "src/pages/LoginPage/LoginPage.tsx": component,
      "src/pages/HomePage/HomePage.tsx": `${component}export const meta = () => [];\n`,
      "src/pages/PostPage/PostPage.tsx": `${component}export const loader = async () => ({ ok: true });\nexport function headers() { return {}; }\n`,
      "src/pages/AdminPage/AdminPage.tsx": component,
      "src/pages/NotFoundPage/NotFoundPage.tsx": component,
    });

    generateRoutes({ root });

    const files = [
      "routes.ts",
      "root.tsx",
      "entry.client.tsx",
      "entry.server.tsx",
      "sets/set-0.tsx",
      "sets/set-1.tsx",
      "routes/login.tsx",
      "routes/home.tsx",
      "routes/post.tsx",
      "routes/old.tsx",
      "routes/admin.tsx",
      "routes/notFound.tsx",
    ];
    const output = Object.fromEntries(files.map((file) => [file, read(root, `.rwgql/${file}`)]));
    expect(output).toMatchSnapshot();
    expect(read(root, "src/routeDefinitions.gen.ts")).toMatchSnapshot();
  });

  it("removes modules for routes that were deleted and leaves unchanged files untouched", () => {
    const root = makeWebRoot({
      "src/Routes.tsx": `<Router>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/about" page={AboutPage} name="about" />
      </Router>`,
      "src/pages/HomePage/HomePage.tsx": component,
      "src/pages/AboutPage/AboutPage.tsx": component,
    });
    generateRoutes({ root });
    expect(existsSync(path.join(root, ".rwgql/routes/about.tsx"))).toBe(true);

    writeFileSync(
      path.join(root, "src/Routes.tsx"),
      `<Router><Route path="/" page={HomePage} name="home" /></Router>`,
    );
    generateRoutes({ root });

    expect(existsSync(path.join(root, ".rwgql/routes/about.tsx"))).toBe(false);
    expect(existsSync(path.join(root, ".rwgql/routes/home.tsx"))).toBe(true);
  });

  it.each([
    [
      "redirect to a route with params",
      `<Router><Route path="/p/{id:Int}" page={HomePage} name="p" /><Route path="/x" redirect="p" name="x" /></Router>`,
      'must reference a route without params ("p")',
    ],
    [
      "unknown unauthenticated route",
      `<Router><Private unauthenticated="nope"><Route path="/" page={HomePage} name="home" /></Private></Router>`,
      'references unknown route "nope"',
    ],
    [
      "RWSDK render routes",
      `<Router><Route path="/" render={() => null} name="home" /></Router>`,
      "uses render, which is RWSDK-only",
    ],
    [
      "unresolvable pages",
      `<Router><Route path="/" page={MissingPage} name="home" /></Router>`,
      '"MissingPage" is not imported and is not a Cedar page under src/pages',
    ],
  ])("rejects %s", (_label, routes, message) => {
    const root = makeWebRoot({
      "src/Routes.tsx": routes,
      "src/pages/HomePage/HomePage.tsx": component,
    });

    expect(() => generateRoutes({ root })).toThrow(message);
  });
});

describe("generateRoutes (legacy RWSDK)", () => {
  it("only writes route definitions, without the @rwgql/router type registration", () => {
    const root = makeWebRoot(
      {
        "src/Routes.tsx": `<Router>
          <Route path="/" page={HomePage} name="home" />
          <Route path="/reset" render={() => null} name="reset" />
        </Router>`,
      },
      { reactRouter: false },
    );

    generateRoutes({ root });

    expect(read(root, "src/routeDefinitions.gen.ts")).not.toContain("declare module");
    expect(existsSync(path.join(root, ".rwgql"))).toBe(false);
  });
});
