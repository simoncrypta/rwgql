import { routeAuthContext } from "@rwgql/router/server";
import type { MiddlewareFunction } from "react-router";
// Authenticate against the deployed API. The web deployment needs no database or auth secret.
const authenticate: MiddlewareFunction = async ({ request, context }, next) => {
  let user: { roles?: string | null } | null = null;
  if (request.headers.has("cookie")) {
    const apiUrl =
      process.env.API_URL ?? import.meta.env.VITE_API_URL ?? new URL(request.url).origin;
    const response = await fetch(`${apiUrl}/auth?method=getToken`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (response.ok) user = await response.json();
  }
  context.set(routeAuthContext, {
    isAuthenticated: Boolean(user),
    hasRole: (roles) => Boolean(user?.roles && roles.includes(user.roles)),
  });
  return next();
};
export const middleware = [authenticate];
