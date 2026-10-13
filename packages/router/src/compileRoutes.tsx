import type { ComponentType, ReactNode } from "react";
import { route, type Route, type RouteMiddleware } from "rwsdk/router";
import type { RequestInfo } from "rwsdk/worker";

import type { NamedRoutes } from "./buildPath.js";
import { parseRouteParams, type ParamTypes } from "./routeParams.js";
import { createCacheControl } from "./createCacheControl.js";
import type { LayoutWrapper } from "./withLayout.js";

export type RouteDefinition<T extends RequestInfo = RequestInfo> = {
  readonly cacheControl?: string;
  readonly name: string;
  readonly path: string;
  readonly params?: ParamTypes;
  readonly layoutWrapper?: LayoutWrapper;
  readonly private?: boolean;
  readonly unauthenticated?: string;
  readonly requireAuth?: RouteMiddleware<T>;
  readonly page?: ComponentType<any>;
  readonly pageProps?: (requestInfo: T) => Record<string, unknown>;
  readonly render?: (requestInfo: T) => ReactNode;
};

export type CompileRoutesOptions<T extends RequestInfo = RequestInfo> = {
  readonly renderPage: (requestInfo: T, children: ReactNode) => Response | Promise<Response>;
  readonly routes: NamedRoutes;
};

export type CompiledRoutes<T extends RequestInfo = RequestInfo> = {
  readonly routes: NamedRoutes;
  readonly workerRoutes: Route<T>[];
};

const NO_MATCH = Symbol("rwgql.noMatch");

const identityLayout: LayoutWrapper = (children) => children;

// RWSDK names the trailing wildcard `$0`.
const RWSDK_SPLAT_KEY = "$0";

const notFound = () => new Response("Not Found", { status: 404 });

const resolvePageProps = <T extends RequestInfo>(
  entry: RouteDefinition<T>,
  requestInfo: T,
): Record<string, unknown> | undefined => {
  if (entry.pageProps) {
    return entry.pageProps(requestInfo);
  }

  if (!entry.params || Object.keys(entry.params).length === 0) {
    return {};
  }

  // Cedar typed params: a value that does not match its type means the route does not match.
  return parseRouteParams(entry.params, requestInfo.params, { splatKey: RWSDK_SPLAT_KEY });
};

const renderRoutePage = <T extends RequestInfo>(
  entry: RouteDefinition<T>,
  requestInfo: T,
): ReactNode | typeof NO_MATCH => {
  if (entry.render) {
    return entry.render(requestInfo);
  }

  if (!entry.page) {
    throw new Error(`@rwgql/router: route "${entry.name}" is missing page or render`);
  }

  const pageProps = resolvePageProps(entry, requestInfo);
  if (!pageProps) {
    return NO_MATCH;
  }

  const Page = entry.page;

  return <Page {...pageProps} />;
};

export const compileRoutes = <
  const D extends readonly RouteDefinition<T>[],
  T extends RequestInfo = RequestInfo,
>(
  definitions: D,
  options: CompileRoutesOptions<T>,
): CompiledRoutes<T> => {
  for (const entry of definitions) {
    if (entry.private && !entry.requireAuth) {
      throw new Error(`@rwgql/router: private route "${entry.name}" requires requireAuth`);
    }
  }

  const workerRoutes = definitions.map((entry) => {
    const layout = entry.layoutWrapper ?? identityLayout;

    const handler = (requestInfo: T) => {
      const page = renderRoutePage(entry, requestInfo);
      if (page === NO_MATCH) {
        return notFound();
      }

      const wrapped = layout(page, requestInfo);
      return options.renderPage(requestInfo, wrapped);
    };

    const routeMiddleware: RouteMiddleware<T>[] = [
      ...(entry.cacheControl ? [createCacheControl<T>(entry.cacheControl)] : []),
      ...(entry.private ? [entry.requireAuth!] : []),
    ];

    if (routeMiddleware.length === 0) {
      return route(entry.path, handler);
    }

    return route(entry.path, [...routeMiddleware, handler]);
  });

  return { routes: options.routes, workerRoutes };
};
