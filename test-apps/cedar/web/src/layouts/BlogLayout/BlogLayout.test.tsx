import { describe, expect, it } from "vite-plus/test";

import { renderRoute } from "../../../testUtils/renderRoute";

import BlogLayout from "./BlogLayout";

describe("BlogLayout", () => {
  it("renders successfully", () => {
    expect(() => {
      renderRoute(BlogLayout);
    }).not.toThrow();
  });
});
