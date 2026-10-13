import { ApolloProvider } from "@apollo/client/react";
import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";

import { makeClient } from "./apollo";

// Workers flavour of the Apollo README's entry.server (renderToReadableStream
// instead of renderToPipeableStream).
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  let shellRendered = false;
  const userAgent = request.headers.get("user-agent");
  const client = makeClient(request);

  const body = await renderToReadableStream(
    <ApolloProvider client={client}>
      <ServerRouter context={routerContext} url={request.url} />
    </ApolloProvider>,
    {
      onError(error: unknown) {
        responseStatusCode = 500;
        if (shellRendered) console.error(error);
      },
    },
  );
  shellRendered = true;

  if ((userAgent && isbot(userAgent)) || routerContext.isSpaMode) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html");
  return new Response(body, { headers: responseHeaders, status: responseStatusCode });
}
