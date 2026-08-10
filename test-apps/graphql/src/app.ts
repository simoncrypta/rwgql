import { handleDbAuthRequest } from "@rwgql/dbauth/server";
import { db } from "db";

import { dbAuthOptions } from "./auth/dbAuthConfig.ts";
import { createGraphqlYoga } from "./graphql.ts";

const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:8910";
const yoga = createGraphqlYoga();

function applyCors(request: Request, response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", webOrigin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("Access-Control-Request-Headers") ?? "content-type",
  );
  headers.set("Vary", "Origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function pathnameOf(request: Request): string {
  return new URL(request.url).pathname;
}

/**
 * Platform-agnostic HTTP handler: CORS + `/auth` (dbAuth) + `/graphql` (Yoga).
 * Serve with `node:http` in production / Vite middleware in `vp dev`.
 */
export async function fetch(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return applyCors(request, new Response(null, { status: 204 }));
  }

  const pathname = pathnameOf(request);
  let response: Response;

  if (pathname === "/auth") {
    response = await handleDbAuthRequest(request, dbAuthOptions);
  } else if (pathname === "/graphql" || pathname.startsWith("/graphql/")) {
    response = await yoga.fetch(request);
  } else {
    response = new Response("Not Found", { status: 404 });
  }

  return applyCors(request, response);
}

export default { fetch };

const disconnect = async () => {
  await db.$disconnect();
};

process.on("SIGINT", () => {
  void disconnect();
});
process.on("SIGTERM", () => {
  void disconnect();
});
