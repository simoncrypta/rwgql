import {
  buildPath,
  type NamedRoutesFrom,
  type QueryParams,
  type RouteDefinitionEntry,
} from "./buildPath.js";

export const createNamedRoutes = <const T extends readonly RouteDefinitionEntry[]>(
  definitions: T,
): NamedRoutesFrom<T> => {
  return Object.fromEntries(
    definitions.map((entry) => [entry.name, (params?: QueryParams) => buildPath(entry, params)]),
  ) as NamedRoutesFrom<T>;
};
