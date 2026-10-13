import { HttpLink, InMemoryCache } from "@apollo/client";
import {
  ApolloClient,
  createApolloLoaderHandler,
} from "@apollo/client-integration-react-router";

// Spike only: the browser talks to the mock server directly so a duplicate
// (post-hydration) fetch would show up in its log.
const GRAPHQL_URL = "http://localhost:8999/graphql";

// `request` is only defined on the server (SSR + loaders).
export const makeClient = (request?: Request) =>
  new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: GRAPHQL_URL,
      headers: request
        ? { cookie: request.headers.get("cookie") ?? "", "x-spike-origin": "server" }
        : { "x-spike-origin": "browser" },
    }),
  });

export const apolloLoader = createApolloLoaderHandler(makeClient);
