import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vite-plus/test";

import { generateRouteDefinitionsFileContent } from "./generateRoutes.js";
import { extractRouteNamesFromSource } from "./extractRouteNamesFromSource.js";

// Tests run from the package or the repo root (vitest projects).
const findRoutesFile = () => {
  const relativePath = path.join("test-apps", "cedar", "web", "src", "Routes.tsx");
  const candidates = [
    path.resolve(process.cwd(), relativePath),
    path.resolve(process.cwd(), "..", "..", relativePath),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`Could not find ${relativePath} from ${process.cwd()}`);
  }
  return found;
};

describe("extractRouteNamesFromSource", () => {
  it("lists the routes of test-apps/cedar/web Routes.tsx in declaration order", () => {
    const routesFile = findRoutesFile();

    expect(
      extractRouteNamesFromSource(readFileSync(routesFile, "utf8"), routesFile).map(
        ({ name }) => name,
      ),
    ).toEqual([
      "double",
      "login",
      "signup",
      "forgotPassword",
      "resetPassword",
      "newContact",
      "editContact",
      "contact",
      "contacts",
      "newPost",
      "editPost",
      "post",
      "posts",
      "waterfall",
      "profile",
      "blogPost",
      "contactUs",
      "about",
      "home",
      "notFound",
    ]);
  });

  it("extracts Cedar param types and emits them in the generated definitions", () => {
    const source = `
      <Router>
        <Route path="/" page={HomePage} name="home" />
        <Route path="/posts/{id:Int}/{slug}" page={PostPage} name="post" />
        <Route path="/docs/{path...}" page={DocsPage} name="docs" />
      </Router>
    `;

    const routes = extractRouteNamesFromSource(source);

    expect(routes).toEqual([
      { name: "home", path: "/", params: {} },
      { name: "post", path: "/posts/:id/:slug", params: { id: "Int", slug: "String" } },
      { name: "docs", path: "/docs/*", params: { path: "Glob" } },
    ]);
    expect(generateRouteDefinitionsFileContent(routes)).toContain(
      '  { name: "post", path: "/posts/:id/:slug", params: { id: "Int", slug: "String" } },',
    );
  });
});
