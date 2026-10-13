import { describe, expect, it } from "vite-plus/test";

import { parseRouteParams, parseRoutePath } from "./routeParams.js";

describe("parseRoutePath", () => {
  it("converts every Cedar param type to a colon pattern with declared types", () => {
    expect(parseRoutePath("/a/{id}/{n:Int}/{f:Float}/{b:Boolean}/{s:String}")).toEqual({
      path: "/a/:id/:n/:f/:b/:s",
      params: { id: "String", n: "Int", f: "Float", b: "Boolean", s: "String" },
    });
  });

  it("converts a trailing glob to a splat", () => {
    expect(parseRoutePath("/docs/{path...}")).toEqual({
      path: "/docs/*",
      params: { path: "Glob" },
    });
  });

  it("leaves static paths unchanged", () => {
    expect(parseRoutePath("/about")).toEqual({ path: "/about", params: {} });
  });

  it("rejects unsupported types, duplicate names, and non-trailing or repeated globs", () => {
    expect(() => parseRoutePath("/a/{id:Uuid}")).toThrow('unsupported param type "Uuid"');
    expect(() => parseRoutePath("/a/{id}/{id:Int}")).toThrow('duplicate param "id"');
    expect(() => parseRoutePath("/a/{rest...}/edit")).toThrow("must be the last path segment");
    expect(() => parseRoutePath("/a/{x...}/{y...}")).toThrow("more than one glob param");
    expect(() => parseRoutePath("/a/{x...:Int}")).toThrow("cannot declare a type");
  });
});

describe("parseRouteParams", () => {
  const types = { n: "Int", f: "Float", b: "Boolean", s: "String" } as const;

  it("parses raw strings into typed values", () => {
    expect(parseRouteParams(types, { n: "-42", f: "1.5", b: "false", s: "hello" })).toEqual({
      n: -42,
      f: 1.5,
      b: false,
      s: "hello",
    });
  });

  it("returns undefined when a value does not match its type", () => {
    expect(parseRouteParams({ n: "Int" }, { n: "4.2" })).toBeUndefined();
    expect(parseRouteParams({ n: "Int" }, { n: "abc" })).toBeUndefined();
    expect(parseRouteParams({ f: "Float" }, { f: "1e5" })).toBeUndefined();
    expect(parseRouteParams({ b: "Boolean" }, { b: "yes" })).toBeUndefined();
    expect(parseRouteParams({ s: "String" }, {})).toBeUndefined();
  });

  it("reads the glob by name or from the host splat key", () => {
    expect(parseRouteParams({ path: "Glob" }, { "*": "a/b" })).toEqual({ path: "a/b" });
    expect(parseRouteParams({ path: "Glob" }, { $0: "a/b" }, { splatKey: "$0" })).toEqual({
      path: "a/b",
    });
    expect(parseRouteParams({ path: "Glob" }, { path: "c" })).toEqual({ path: "c" });
  });
});
