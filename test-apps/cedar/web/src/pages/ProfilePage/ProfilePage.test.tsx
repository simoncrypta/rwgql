import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vite-plus/test";

import { createMockAuthState, mockUseAuth } from "../../../testUtils/mockAuth";

import { renderRoute } from "../../../testUtils/renderRoute";

import ProfilePage from "./ProfilePage";

describe("ProfilePage", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(
      createMockAuthState({
        currentUser: {
          email: "danny@bazinga.com",
          id: 84849020,
          roles: "BAZINGA",
        },
        isAuthenticated: true,
      }),
    );
  });

  it("renders successfully", async () => {
    expect(() => {
      renderRoute(ProfilePage);
    }).not.toThrow();

    expect(await screen.findByText("danny@bazinga.com")).toBeInTheDocument();
  });
});
