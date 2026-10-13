import type { ParamTypes, ParsedParams } from "./routeParams.js";

/** Extra keys passed to a named route become the query string (Cedar behavior). */
export type QueryParams = Readonly<Record<string, boolean | number | string | null | undefined>>;

export type RoutePathDefinition = {
  readonly path: string;
  readonly params?: ParamTypes;
};

const COLON_PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;

const requireValue = (path: string, name: string, values: QueryParams) => {
  const value = values[name];
  if (value === undefined || value === null) {
    throw new Error(`@rwgql/router: route "${path}" requires params.${name}`);
  }

  return String(value);
};

export const buildPath = (
  { path, params: types = {} }: RoutePathDefinition,
  values: QueryParams = {},
): string => {
  const used = new Set<string>();

  let built = path.replace(COLON_PARAM, (_match, name: string) => {
    used.add(name);
    return encodeURIComponent(requireValue(path, name, values));
  });

  const globName = Object.keys(types).find((name) => types[name] === "Glob");
  if (globName) {
    used.add(globName);
    const glob = requireValue(path, globName, values).split("/").map(encodeURIComponent).join("/");
    built = built.replace(/\*$/, glob);
  }

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (!used.has(key) && value !== undefined && value !== null) {
      search.append(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `${built}?${query}` : built;
};

export type NamedRouteFnFor<P extends ParamTypes> = string extends keyof P
  ? (params?: QueryParams) => string
  : [keyof P] extends [never]
    ? (query?: QueryParams) => string
    : (params: ParsedParams<P> & QueryParams) => string;

export type RouteDefinitionEntry = {
  readonly name: string;
  readonly path: string;
  readonly params: ParamTypes;
};

export type NamedRoutesFrom<T extends readonly RouteDefinitionEntry[]> = {
  [K in T[number] as K["name"]]: NamedRouteFnFor<K["params"]>;
};

// Method syntax keeps params bivariant so every typed route fn is assignable to the widened form.
export type NamedRouteFn = {
  bivarianceHack(params?: QueryParams): string;
}["bivarianceHack"];

export type NamedRoutes = Readonly<Record<string, NamedRouteFn>>;
