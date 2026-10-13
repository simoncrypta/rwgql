// Cedar-compatible router API on React Router (framework mode).
export { Private, PrivateSet, Route, Router, Set } from "./markers.js";
export type {
  CedarPrivateSetProps,
  CedarRouteProps,
  CedarRouterProps,
  CedarSetProps,
} from "./markers.js";
export { Link, NavLink } from "./links.js";
export type { LinkProps, NavLinkProps } from "./links.js";
export { back, navigate, NavigationBridge, Redirect } from "./navigation.js";
export type { NavigateOptions, RedirectProps } from "./navigation.js";
export {
  useBlocker,
  useLocation,
  useMatch,
  useParams,
  usePathname,
  useRouteName,
  useSearchParams,
} from "./hooks.js";
export type { BlockerState, UseMatchOptions } from "./hooks.js";
export { registerRoutes, routes } from "./registry.js";
export type { AppRoutes, RegisteredRoutes, RouteName } from "./registry.js";
export { buildPath } from "./buildPath.js";
export { parseRouteParams, parseRoutePath } from "./routeParams.js";
export type {
  NamedRouteFn,
  NamedRouteFnFor,
  NamedRoutes,
  NamedRoutesFrom,
  QueryParams,
} from "./buildPath.js";
export type { ParamType, ParamTypes, ParsedParams } from "./routeParams.js";
