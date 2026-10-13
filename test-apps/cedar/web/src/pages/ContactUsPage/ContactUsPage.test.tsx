import { describe, expect, it } from "vite-plus/test";

import { renderRoute } from "../../../testUtils/renderRoute";

import ContactUsPage from "./ContactUsPage";

describe("ContactUsPage", () => {
  it("renders successfully", () => {
    expect(() => {
      renderRoute(ContactUsPage);
    }).not.toThrow();
  });
});
