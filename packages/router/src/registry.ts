import type { NamedRoutes, NamedRoutesFrom, RouteDefinitionEntry } from "./buildPath.js";
import { createNamedRoutes } from "./namedRoutes.js";
import type { ParamTypes } from "./routeParams.js";

/**
 * Augmented by the generated `src/routeDefinitions.gen.ts` so `routes` is typed per app
 * (the equivalent of Cedar's generated web-routes types).
 */
// oxlint-disable-next-line no-empty-interface -- augmented by generated code
export interface RegisteredRoutes {}

type RegisteredDefinitions = RegisteredRoutes extends {
  readonly definitions: infer D extends readonly RouteDefinitionEntry[];
}
  ? D
  : never;

export type AppRoutes = [RegisteredDefinitions] extends [never]
  ? NamedRoutes
  : NamedRoutesFrom<RegisteredDefinitions>;

export type RouteName = keyof AppRoutes;

let registered: NamedRoutes | undefined;
const paramTypesByName = new Map<string, ParamTypes>();

/** Called by the generated root module before anything renders. */
export const registerRoutes = (definitions: readonly RouteDefinitionEntry[]) => {
  registered = createNamedRoutes(definitions) as NamedRoutes;
  paramTypesByName.clear();
  for (const definition of definitions) {
    paramTypesByName.set(definition.name, definition.params);
  }
};

export const paramTypesFor = (name: string | undefined): ParamTypes | undefined =>
  name === undefined ? undefined : paramTypesByName.get(name);

export const isRegisteredRoute = (name: string): boolean => paramTypesByName.has(name);

/** Cedar's `routes`: `routes.post({ id: 1 })` → `/posts/1`. */
export const routes: AppRoutes = new Proxy({} as AppRoutes, {
  get(_target, name) {
    if (typeof name !== "string") {
      return undefined;
    }

    if (!registered) {
      throw new Error(
        `@rwgql/router: routes.${name} was used before the route definitions were registered (run generate-routes)`,
      );
    }

    const route = registered[name];
    if (!route) {
      throw new Error(`@rwgql/router: unknown route name "${name}"`);
    }

    return route;
  },
  has(_target, name) {
    return typeof name === "string" && Boolean(registered?.[name]);
  },
  ownKeys() {
    return registered ? Reflect.ownKeys(registered) : [];
  },
  getOwnPropertyDescriptor(_target, name) {
    return typeof name === "string" && registered?.[name]
      ? { configurable: true, enumerable: true, value: registered[name] }
      : undefined;
  },
});
