import { handleDbAuthRequest } from "@rwgql/dbauth/server";
import { dbAuthOptions } from "./functions/auth.js";
import { yoga } from "./functions/graphql.js";
import { handleRequest as hello } from "./functions/hello.js";
import { handler as legacyHello } from "./functions/legacyHello.js";
export async function fetch(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  let response: Response;
  if (request.method === "OPTIONS") response = new Response(null, { status: 204 });
  else if (path === "/auth") response = await handleDbAuthRequest(request, dbAuthOptions);
  else if (path === "/graphql") response = await yoga.fetch(request);
  else if (path === "/hello") response = await hello(request);
  else if (path === "/legacyHello") {
    const result = await legacyHello();
    response = new Response(result.body, { status: result.statusCode, headers: result.headers });
  } else response = new Response("Not Found", { status: 404 });
  const origin = request.headers.get("origin");
  const allowed = (process.env.WEB_ORIGIN ?? "http://localhost:8920")
    .split(",")
    .map((value) => value.trim());
  const headers = new Headers(response.headers);
  if (origin && allowed.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type");
  }
  headers.append("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}
export default { fetch };
