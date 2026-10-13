import { describe, expect, expectTypeOf, it } from "vite-plus/test";

import { createNamedRoutes } from "./namedRoutes.js";

const routes = createNamedRoutes([
  { name: "home", path: "/", params: {} },
  { name: "post", path: "/posts/:id", params: { id: "Int" } },
  { name: "rate", path: "/rate/:score/:on", params: { score: "Float", on: "Boolean" } },
  { name: "user", path: "/u/:slug", params: { slug: "String" } },
  { name: "docs", path: "/docs/*", params: { path: "Glob" } },
] as const);

describe("createNamedRoutes", () => {
  it("builds static routes, with optional query params", () => {
    expect(routes.home()).toBe("/");
    expect(routes.home({ ref: "nav" })).toBe("/?ref=nav");
  });

  it("builds param routes for every Cedar type", () => {
    expect(routes.post({ id: 3 })).toBe("/posts/3");
    expect(routes.rate({ score: 4.5, on: false })).toBe("/rate/4.5/false");
    expect(routes.user({ slug: "simon" })).toBe("/u/simon");
    expect(routes.docs({ path: "a/b" })).toBe("/docs/a/b");
  });

  it("appends extra keys as a query string", () => {
    expect(routes.post({ id: 3, tab: "edit" })).toBe("/posts/3?tab=edit");
  });

  it("types each route's params exactly", () => {
    expectTypeOf(routes.home).parameters.toEqualTypeOf<
      [query?: Readonly<Record<string, boolean | number | string | null | undefined>>]
    >();
    expectTypeOf(routes.post).parameter(0).toHaveProperty("id").toEqualTypeOf<number>();
    expectTypeOf(routes.rate).parameter(0).toHaveProperty("on").toEqualTypeOf<boolean>();
    expectTypeOf(routes.user).parameter(0).toHaveProperty("slug").toEqualTypeOf<string>();
    expectTypeOf(routes.docs).parameter(0).toHaveProperty("path").toEqualTypeOf<string>();

    // Type-only assertions; never called.
    const _typeErrors = () => {
      // @ts-expect-error Int params take numbers, not strings
      routes.post({ id: "3" });
      // @ts-expect-error required params cannot be omitted
      routes.post();
      // @ts-expect-error Boolean params take booleans
      routes.rate({ score: 1, on: "true" });
    };
    expect(_typeErrors).toBeTypeOf("function");
  });
});
