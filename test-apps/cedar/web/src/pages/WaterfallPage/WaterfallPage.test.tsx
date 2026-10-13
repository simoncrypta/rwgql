import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vite-plus/test";

import { graphqlResponse, renderRoute } from "../../../testUtils/renderRoute";

import WaterfallPage, { loader } from "./WaterfallPage";

describe("WaterfallPage", () => {
  it("renders the post preloaded by the loader for the route id", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        graphqlResponse({
          waterfallBlogPost: {
            __typename: "Post",
            author: { __typename: "User", email: "ada@example.com", fullName: "Ada Lovelace" },
            body: "Hello",
            createdAt: "2022-01-17T13:57:51.607Z",
            id: 42,
            title: "Mocked title",
          },
        }),
      ),
    );

    renderRoute(() => <WaterfallPage id={42} />, {
      loader,
      path: "/waterfall/:id",
      url: "/waterfall/42",
    });

    expect(await screen.findByText("Mocked title")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/graphql"),
      expect.objectContaining({ body: expect.stringContaining('"id":42'), method: "POST" }),
    );
  });
});
