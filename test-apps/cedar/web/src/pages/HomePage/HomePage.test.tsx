import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { graphqlResponse, renderRoute } from "../../../testUtils/renderRoute";

import HomePage, { ErrorBoundary, loader } from "./HomePage";

const post = {
  __typename: "Post",
  author: { __typename: "User", email: "ada@example.com", fullName: "Ada Lovelace" },
  body: "Hello",
  createdAt: "2022-01-17T13:57:51.607Z",
  id: 1,
  title: "First post",
};

describe("HomePage", () => {
  it("renders blog posts preloaded by the loader", async () => {
    vi.stubGlobal("fetch", vi.fn(graphqlResponse({ blogPosts: [post] })));

    renderRoute(HomePage, { loader });

    expect(await screen.findByText("First post")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("renders empty when the query returns no posts", async () => {
    vi.stubGlobal("fetch", vi.fn(graphqlResponse({ blogPosts: [] })));

    renderRoute(HomePage, { loader });

    expect(await screen.findByText("Empty")).toBeInTheDocument();
  });

  it("shows the query failure in place when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    renderRoute(HomePage, { loader, ErrorBoundary });

    expect(await screen.findByText(/^Error:/)).toBeInTheDocument();
  });
});
