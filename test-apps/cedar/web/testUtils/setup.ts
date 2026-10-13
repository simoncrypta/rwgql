import "@testing-library/jest-dom/vitest";

import { registerRoutes } from "@rwgql/router";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vite-plus/test";

import { routeDefinitions } from "@/routeDefinitions.gen";

import { createMockAuthState, mockUseAuth } from "./mockAuth";

// The generated root route registers these in the app.
registerRoutes(routeDefinitions);

vi.mock("@apollo/client/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@apollo/client/react")>();

  return {
    ...actual,
    useMutation: vi.fn(() => [vi.fn(), { called: false, error: undefined, loading: false }]),
    useQuery: vi.fn(() => ({ data: undefined, error: undefined, loading: true })),
  };
});

afterEach(() => {
  cleanup();
  mockUseAuth.mockReset();
  mockUseAuth.mockImplementation(createMockAuthState);
});
