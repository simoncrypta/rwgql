import { describe, expect, it } from "vite-plus/test";

import { buildPath } from "./buildPath.js";

describe("buildPath", () => {
  it("returns static paths unchanged", () => {
    expect(buildPath({ path: "/posts" })).toBe("/posts");
  });

  it("replaces every colon param with its encoded value", () => {
    expect(buildPath({ path: "/posts/:id" }, { id: 42 })).toBe("/posts/42");
    expect(buildPath({ path: "/u/:slug/:active" }, { slug: "a b", active: true })).toBe(
      "/u/a%20b/true",
    );
  });

  it("fills a trailing glob, keeping slashes", () => {
    expect(
      buildPath({ path: "/docs/*", params: { path: "Glob" } }, { path: "guides/intro x" }),
    ).toBe("/docs/guides/intro%20x");
  });

  it("serializes extra keys as a query string and skips nullish values", () => {
    expect(buildPath({ path: "/posts/:id" }, { id: 1, tab: "comments", page: 2 })).toBe(
      "/posts/1?tab=comments&page=2",
    );
    expect(buildPath({ path: "/posts" }, { q: "a&b", empty: undefined, none: null })).toBe(
      "/posts?q=a%26b",
    );
  });

  it("throws when a path param is missing", () => {
    expect(() => buildPath({ path: "/posts/:id" })).toThrow(
      'route "/posts/:id" requires params.id',
    );
  });
});
