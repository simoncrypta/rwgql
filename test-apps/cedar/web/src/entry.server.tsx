import { ApolloProvider } from "@apollo/client/react";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext, RouterContextProvider } from "react-router";
import { ServerRouter } from "react-router";

import { makeClient } from "@/apollo";
import { nonceContext } from "@/context.server";
import { NonceContext } from "@/Document";

// Workers flavour of Apollo's entry.server: renderToReadableStream instead of
// renderToPipeableStream, and wait for the full document for bots.
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  let shellRendered = false;
  const nonce = loadContext.get(nonceContext);
  const userAgent = request.headers.get("user-agent");

  const body = await renderToReadableStream(
    <NonceContext.Provider value={nonce}>
      <ApolloProvider client={makeClient(request)}>
        <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
      </ApolloProvider>
    </NonceContext.Provider>,
    {
      nonce,
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) {
          console.error(error);
        }
      },
    },
  );
  shellRendered = true;

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
