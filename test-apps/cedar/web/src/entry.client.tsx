import { ApolloProvider } from "@apollo/client/react";
import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

import { makeClient } from "@/apollo";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <ApolloProvider client={makeClient()}>
        <HydratedRouter />
      </ApolloProvider>
    </StrictMode>,
  );
});
