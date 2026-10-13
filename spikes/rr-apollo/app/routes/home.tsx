import { gql } from "@apollo/client";
import { useReadQuery } from "@apollo/client/react";
import { Link, useLoaderData } from "react-router";

import { apolloLoader } from "../apollo";
import type { Route } from "./+types/home";

const GREETING_QUERY = gql`
  query Greeting {
    greeting
    cookieSeen
  }
`;

export const loader = apolloLoader<Route.LoaderArgs>()(({ preloadQuery }) => ({
  greetingRef: preloadQuery(GREETING_QUERY),
}));

export function headers() {
  return { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" };
}

export default function Home() {
  const { greetingRef } = useLoaderData<typeof loader>();
  const { data } = useReadQuery(greetingRef) as {
    data: { greeting: string; cookieSeen: boolean };
  };
  return (
    <main>
      <h1 data-testid="greeting">{data.greeting}</h1>
      <p data-testid="cookie">cookieSeen={String(data.cookieSeen)}</p>
      <Link to="/about">About</Link>
    </main>
  );
}
