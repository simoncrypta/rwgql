import type { ParamTypes } from "../routeParams.js";
import { parseRoutesSource } from "./parseRoutesSource.js";
import { flattenRoutes, type RoutesIR } from "./routeIR.js";

export type RouteNameEntry = {
  readonly name: string;
  readonly path: string;
  readonly params: ParamTypes;
};

export const routeNameEntriesFromIR = (ir: RoutesIR): RouteNameEntry[] =>
  flattenRoutes(ir.children).map((route) => ({
    name: route.name,
    // Named-route helpers keep the absolute form for the catch-all.
    path: route.notfound ? "/*" : route.path,
    params: route.params,
  }));

export const extractRouteNamesFromSource = (
  source: string,
  fileName = "Routes.tsx",
): RouteNameEntry[] => routeNameEntriesFromIR(parseRoutesSource(source, { fileName }));

export const routeNameEntriesFromTree = (
  entries: ReadonlyArray<RouteNameEntry>,
): RouteNameEntry[] => entries.map(({ name, path, params }) => ({ name, path, params }));
