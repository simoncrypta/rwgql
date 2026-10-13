import { createAuthDecoder } from "@rwgql/dbauth/decoder";
import { routeAuthContext } from "@rwgql/router/server";
import { createRequestHandler, RouterContextProvider } from "react-router";

import { nonceContext } from "../src/context.server";
import { setCommonHeaders } from "../src/headers.server";

interface Env {
  readonly DB_AUTH_SECRET?: string;
}

// Must match the dbAuth cookie name configured in test-apps/graphql (src/auth/auth.ts).
const cookieName = "session_8911";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

let decodeSession: ReturnType<typeof createAuthDecoder> | undefined;

export default {
  async fetch(request, env) {
    decodeSession ??= createAuthDecoder({ cookieName, secret: env.DB_AUTH_SECRET });

    const session = decodeSession(request);
    const nonce = crypto.randomUUID().replaceAll("-", "");

    const context = new RouterContextProvider();
    context.set(routeAuthContext, { isAuthenticated: Boolean(session) });
    context.set(nonceContext, nonce);

    const response = await requestHandler(request, context);

    return setCommonHeaders(response, nonce);
  },
} satisfies ExportedHandler<Env>;
