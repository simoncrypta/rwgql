import { ApolloProvider } from "@apollo/client/react";
import { render } from "@testing-library/react";
import type { ComponentType } from "react";
import { createRoutesStub, type LoaderFunction } from "react-router";

import { makeClient } from "@/apollo";

export type RenderRouteOptions = {
  /** Route pattern for the component (default `/`). */
  readonly path?: string;
  /** URL to start at (default `path`). */
  readonly url?: string;
  readonly loader?: LoaderFunction;
  readonly ErrorBoundary?: ComponentType;
};

/**
 * Render a page or layout inside a React Router data router (needed for Link, useBlocker,
 * loaders) and an Apollo provider, as the generated route modules do in the app.
 */
export const renderRoute = (
  Component: ComponentType,
  { path = "/", url = path, loader, ErrorBoundary }: RenderRouteOptions = {},
) => {
  const Stub = createRoutesStub([{ path, Component, loader, ErrorBoundary }]);

  return render(
    <ApolloProvider client={makeClient()}>
      <Stub initialEntries={[url]} />
    </ApolloProvider>,
  );
};

/** A `fetch` stub that answers every GraphQL request with `data`. */
export const graphqlResponse = (data: unknown) => async () =>
  new Response(JSON.stringify({ data }), { headers: { "content-type": "application/json" } });
