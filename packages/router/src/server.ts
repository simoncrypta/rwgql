import { createContext, redirect, type MiddlewareFunction } from "react-router";

export type RouteAuth = {
  readonly isAuthenticated: boolean;
  /** Needed for `<PrivateSet roles>`; without it, role-restricted routes deny access. */
  readonly hasRole?: (roles: readonly string[]) => boolean;
};

/** Set per request by the app's server entry (e.g. from the dbAuth session cookie). */
export const routeAuthContext = createContext<RouteAuth>({ isAuthenticated: false });

export type RequireAuthOptions = {
  readonly loginPath: string;
  readonly roles?: readonly string[];
};

/**
 * Server middleware for `<PrivateSet>` / `<Private>`: redirects to the `unauthenticated` route
 * with `?redirectTo=` when the request is not authenticated (or lacks the required roles).
 */
export const requireAuth =
  ({ loginPath, roles }: RequireAuthOptions): MiddlewareFunction =>
  ({ context, request }, next) => {
    const auth = context.get(routeAuthContext);
    const allowed =
      auth.isAuthenticated && (!roles || roles.length === 0 || Boolean(auth.hasRole?.(roles)));

    if (!allowed) {
      const url = new URL(request.url);
      const login = new URL(loginPath, url);
      login.searchParams.set("redirectTo", `${url.pathname}${url.search}`);
      throw redirect(`${login.pathname}${login.search}`);
    }

    return next();
  };
