import type { ComponentType, ReactNode } from "react";

import type { CacheOption } from "./cacheControl.js";

/**
 * Cedar route-tree markers. `src/Routes.tsx` is compiled to React Router route modules by
 * `rwgql-router-generate-routes`; these components never render anything themselves.
 */

export type CedarRouteProps = {
  readonly cache?: CacheOption;
  readonly children?: never;
  readonly name?: string;
  readonly notfound?: boolean;
  readonly page?: ComponentType<any>;
  readonly path?: string;
  /** Accepted for Cedar compatibility; use `cache` for edge caching instead. */
  readonly prerender?: boolean;
  /** Path (`/new`) or route name (`home`) to redirect to. */
  readonly redirect?: string;
  /** Accepted for Cedar compatibility; currently ignored. */
  readonly whileLoadingPage?: ComponentType<any>;
};

export type CedarSetProps = {
  readonly cache?: CacheOption;
  readonly children: ReactNode;
  readonly private?: boolean;
  readonly roles?: string | readonly string[];
  readonly unauthenticated?: string;
  /** Accepted for Cedar compatibility; currently ignored. */
  readonly whileLoadingAuth?: ComponentType<any>;
  readonly wrap?: ComponentType<any> | readonly ComponentType<any>[];
  readonly [prop: string]: unknown;
};

export type CedarPrivateSetProps = Omit<CedarSetProps, "private" | "unauthenticated"> & {
  readonly unauthenticated: string;
};

export type CedarRouterProps = {
  readonly children: ReactNode;
  /** Accepted for Cedar compatibility; auth is checked on the server per request. */
  readonly useAuth?: unknown;
};

export const Route = (_props: CedarRouteProps) => null;

export const Set = (_props: CedarSetProps) => null;

export const PrivateSet = (_props: CedarPrivateSetProps) => null;

/** Cedar's older spelling of `<PrivateSet>`. */
export const Private = (_props: CedarPrivateSetProps) => null;

export const Router = (_props: CedarRouterProps) => null;
