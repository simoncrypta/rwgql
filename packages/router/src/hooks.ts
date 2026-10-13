import {
  matchPath,
  useBlocker as useReactRouterBlocker,
  useLocation as useReactRouterLocation,
  useMatches,
  useParams as useReactRouterParams,
} from "react-router";

import { normalizePathname } from "./normalizePath.js";
import { isRegisteredRoute, paramTypesFor } from "./registry.js";
import { parseRouteParams } from "./routeParams.js";

export { useLocation, useSearchParams } from "react-router";

/** Name of the deepest matched route from src/Routes.tsx (Cedar's `useRouteName`). */
export const useRouteName = (): string | undefined => {
  const matches = useMatches();

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const id = matches[index]?.id;
    if (id && isRegisteredRoute(id)) {
      return id;
    }
  }

  return undefined;
};

/** Route params, typed per the route's Cedar param types (`{id:Int}` → number). */
export const useParams = (): Record<string, boolean | number | string | undefined> => {
  const raw = useReactRouterParams();
  const types = paramTypesFor(useRouteName());

  return (types && parseRouteParams(types, raw)) || raw;
};

/** Current pathname without a trailing slash. */
export const usePathname = (): string => normalizePathname(useReactRouterLocation().pathname);

export type UseMatchOptions = {
  readonly matchSubPaths?: boolean;
};

/** Cedar's `useMatch(to)` → `{ match }`. */
export const useMatch = (to: string, { matchSubPaths = false }: UseMatchOptions = {}) => {
  const { pathname } = useReactRouterLocation();
  const target = to.split("?")[0] ?? to;

  return { match: matchPath({ path: target, end: !matchSubPaths }, pathname) !== null };
};

export type BlockerState = "BLOCKED" | "IDLE" | "PROCEEDING";

/** Cedar's `useBlocker({ when })` over React Router's blocker. */
export const useBlocker = ({ when }: { readonly when: boolean }) => {
  const blocker = useReactRouterBlocker(when);
  const state: BlockerState =
    blocker.state === "blocked"
      ? "BLOCKED"
      : blocker.state === "proceeding"
        ? "PROCEEDING"
        : "IDLE";

  return {
    abort: () => blocker.reset?.(),
    confirm: () => blocker.proceed?.(),
    state,
  };
};
