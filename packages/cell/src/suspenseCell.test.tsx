import React from "react";

import { ApolloClient, ApolloLink, gql, InMemoryCache } from "@apollo/client";
import type { TypedDocumentNode } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import { act, render, screen } from "@testing-library/react";
import { renderToReadableStream } from "react-dom/server.browser";
import { Observable } from "rxjs";
import { describe, expect, test, vi } from "vite-plus/test";

import { createCell } from "./createCell.js";

type Data = { readonly posts: readonly { readonly __typename: "Post"; readonly id: number }[] };
type Variables = { readonly limit: number };

const QUERY: TypedDocumentNode<Data, Variables> = gql`
  query Posts($limit: Int!) {
    posts(limit: $limit) {
      id
    }
  }
`;

const createClient = (result: object, request = vi.fn()) =>
  new ApolloClient({
    cache: new InMemoryCache(),
    link: new ApolloLink(
      (operation) =>
        new Observable((observer) => {
          request(operation.variables);
          setTimeout(() => {
            observer.next(result);
            observer.complete();
          }, 10);
        }),
    ),
  });

const renderWith = async (result: object, ui: React.ReactNode) => {
  const request = vi.fn();
  await act(async () => {
    render(<ApolloProvider client={createClient(result, request)}>{ui}</ApolloProvider>);
  });
  return request;
};

// React only retries a suspended render inside act() in tests.
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

class Boundary extends React.Component<{ children: React.ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  override render() {
    return this.state.error ? <>outer: {this.state.error.message}</> : this.props.children;
  }
}

const Failure = ({ error }: { readonly error: Error }) => <>Failed: {error.message}</>;

const cell = ({ withFailure = true } = {}) =>
  createCell<Data, Variables>({
    QUERY,
    suspense: true,
    Loading: () => <>Loading posts</>,
    Empty: () => <>No posts</>,
    Success: ({ posts }) => <>{`${posts.length} posts`}</>,
    ...(withFailure ? { Failure } : {}),
  });

describe("createCell({ suspense: true })", () => {
  test("suspends with Loading, then renders Success with props as variables", async () => {
    vi.useFakeTimers();
    try {
      const PostsCell = cell();
      const request = await renderWith(
        { data: { posts: [{ __typename: "Post", id: 1 }] } },
        <PostsCell limit={5} />,
      );

      screen.getByText("Loading posts");
      await act(() => vi.runAllTimersAsync());
      expect(screen.getByText("1 posts")).toBeInTheDocument();
      expect(request).toHaveBeenCalledWith({ limit: 5 });
    } finally {
      vi.useRealTimers();
    }
  });

  test("renders Empty for empty results", async () => {
    const PostsCell = cell();
    await renderWith({ data: { posts: [] } }, <PostsCell limit={5} />);

    await settle();
    expect(screen.getByText("No posts")).toBeInTheDocument();
  });

  test("renders Failure for GraphQL errors", async () => {
    const PostsCell = cell();
    await renderWith({ errors: [{ message: "boom" }] }, <PostsCell limit={5} />);

    await settle();
    expect(screen.getByText("Failed: boom")).toBeInTheDocument();
  });

  test("rethrows to the nearest error boundary without a Failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const PostsCell = cell({ withFailure: false });
    await renderWith(
      { errors: [{ message: "boom" }] },
      <Boundary>
        <PostsCell limit={5} />
      </Boundary>,
    );

    await settle();
    expect(screen.getByText("outer: boom")).toBeInTheDocument();
  });

  test("renders the data on the server instead of Loading", async () => {
    const PostsCell = cell();
    const stream = await renderToReadableStream(
      <ApolloProvider client={createClient({ data: { posts: [{ __typename: "Post", id: 1 }] } })}>
        <PostsCell limit={5} />
      </ApolloProvider>,
    );
    await stream.allReady;

    const html = await new Response(stream).text();
    expect(html).toContain("1 posts");
    expect(html).not.toContain("Loading posts");
  });
});
