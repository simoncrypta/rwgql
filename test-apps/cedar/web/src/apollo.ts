import { HttpLink, InMemoryCache } from "@apollo/client";
import { ApolloClient, createApolloLoaderHandler } from "@apollo/client-integration-react-router";
import { useLoaderData, type unstable_SerializesTo } from "react-router";

export const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL ?? "http://localhost:8911/graphql";

/**
 * `request` is only set on the server (SSR + loaders). Forward the cookie so dbAuth-protected
 * queries authenticate during SSR; the browser sends it itself via `credentials: "include"`.
 */
export const makeClient = (request?: Request) =>
  new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      credentials: "include",
      headers: request ? { cookie: request.headers.get("cookie") ?? "" } : undefined,
      uri: graphqlUrl,
    }),
  });

export const apolloLoader = createApolloLoaderHandler(makeClient);

type UnwrapQueryRefs<T> = {
  [K in keyof T]: T[K] extends unstable_SerializesTo<infer Ref> ? Ref : T[K];
};

/**
 * `useLoaderData` for `apolloLoader` loaders: unwraps Apollo's serialized query refs so they can
 * be passed to `useReadQuery` without casts.
 */
export const useApolloLoaderData = <TLoader extends (...args: never[]) => unknown>() =>
  useLoaderData() as UnwrapQueryRefs<Awaited<ReturnType<TLoader>>>;
