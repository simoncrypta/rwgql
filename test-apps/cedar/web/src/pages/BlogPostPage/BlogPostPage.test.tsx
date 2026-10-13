import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { graphqlResponse, renderRoute } from "../../../testUtils/renderRoute";

import BlogPostPage, { loader } from "./BlogPostPage";

describe("BlogPostPage", () => {
  it("renders the post preloaded by the loader for the route id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        graphqlResponse({
          blogPost: {
            __typename: "Post",
            author: { __typename: "User", email: "ada@example.com", fullName: "Ada Lovelace" },
            body: "Hello",
            createdAt: "2022-01-17T13:57:51.607Z",
            id: 42,
            title: "A post",
          },
        }),
      ),
    );

    renderRoute(() => <BlogPostPage id={42} />, {
      loader,
      path: "/blog-post/:id",
      url: "/blog-post/42",
    });

    expect(await screen.findByText("A post")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({ body: expect.stringContaining('"id":42'), method: "POST" }),
    );
  });
});
