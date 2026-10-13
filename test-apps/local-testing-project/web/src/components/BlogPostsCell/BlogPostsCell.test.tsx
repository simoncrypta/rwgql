import { render, screen } from "@testing-library/react";
import { MockedProvider } from "@apollo/client/testing/react";
import { MemoryRouter } from "react-router";
import { registerRoutes } from "@rwgql/router";
import { describe, expect, it } from "vite-plus/test";
import BlogPostsCell, { QUERY } from "./BlogPostsCell";
import { routeDefinitions } from "../../routeDefinitions.gen";

registerRoutes(routeDefinitions);
const renderCell = (posts: unknown[]) =>
  render(
    <MemoryRouter>
      <MockedProvider
        mocks={[
          {
            request: { query: QUERY, variables: {} },
            result: { data: { blogPosts: posts } },
            delay: 5,
          },
        ]}
      >
        <BlogPostsCell />
      </MockedProvider>
    </MemoryRouter>,
  );
describe("Cedar BlogPostsCell on rwgql", () => {
  it("renders loading then the original post UI and typed route", async () => {
    renderCell([
      {
        id: 42,
        title: "Cedar migration",
        body: "Still a Cell",
        createdAt: "2026-10-13T00:00:00Z",
        author: { email: "admin@example.com", fullName: "Cedar Admin" },
      },
    ]);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: "Cedar migration" })).toHaveAttribute(
      "href",
      "/blog-post/42",
    );
    expect(screen.getByText("Still a Cell")).toBeInTheDocument();
  });
  it("renders Empty for an empty collection", async () => {
    renderCell([]);
    expect(await screen.findByText("Empty")).toBeInTheDocument();
  });
});
