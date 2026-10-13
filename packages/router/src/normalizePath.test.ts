import { describe, expect, it } from "vite-plus/test";

import { normalizePathname } from "./normalizePath.js";

describe("normalizePathname", () => {
  it("strips trailing slashes except for root", () => {
    expect(normalizePathname("/contact/")).toBe("/contact");
    expect(normalizePathname("/")).toBe("/");
  });
});
