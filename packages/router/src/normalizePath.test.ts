import { describe, expect, it } from "vite-plus/test";

import { normalizePathname, normalizeRedwoodPath } from "./normalizePath.js";

describe("normalizeRedwoodPath", () => {
  it("converts Redwood path params to RWSdk colon params", () => {
    expect(normalizeRedwoodPath("/contacts/{id:Int}")).toBe("/contacts/:id");
    expect(normalizeRedwoodPath("/posts/{id:Int}/edit")).toBe("/posts/:id/edit");
    expect(normalizeRedwoodPath("/waterfall/{id}")).toBe("/waterfall/:id");
  });

  it("converts a trailing glob to a splat", () => {
    expect(normalizeRedwoodPath("/docs/{path...}")).toBe("/docs/*");
  });

  it("leaves static paths unchanged", () => {
    expect(normalizeRedwoodPath("/about")).toBe("/about");
  });
});

describe("normalizePathname", () => {
  it("strips trailing slashes except for root", () => {
    expect(normalizePathname("/contact/")).toBe("/contact");
    expect(normalizePathname("/")).toBe("/");
  });
});
