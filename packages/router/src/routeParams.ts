/** Cedar route param types: `{id:Int}`, `{x:Float}`, `{x:Boolean}`, `{slug:String}`, glob `{path...}`. */
export type ParamType = "Boolean" | "Float" | "Glob" | "Int" | "String";

export type ParamTypes = Readonly<Record<string, ParamType>>;

export type ParamValue<T extends ParamType> = T extends "Float" | "Int"
  ? number
  : T extends "Boolean"
    ? boolean
    : string;

export type ParsedParams<P extends ParamTypes> = {
  readonly [K in keyof P]: ParamValue<P[K]>;
};

export type ParsedRoutePath = {
  /** Colon/splat pattern: `{id:Int}` → `:id`, a trailing `{path...}` glob → `*`. */
  readonly path: string;
  readonly params: ParamTypes;
};

const PARAM_TYPES: ReadonlySet<string> = new Set(["Boolean", "Float", "Int", "String"]);

const CEDAR_PARAM = /\{([A-Za-z_][A-Za-z0-9_]*)(\.\.\.)?(?::([^}]*))?\}/g;

export const parseRoutePath = (cedarPath: string): ParsedRoutePath => {
  const params: Record<string, ParamType> = {};
  let globName: string | undefined;

  const path = cedarPath.replace(
    CEDAR_PARAM,
    (_match, name: string, glob: string | undefined, type: string | undefined) => {
      if (name in params) {
        throw new Error(`@rwgql/router: duplicate param "${name}" in route path "${cedarPath}"`);
      }

      if (glob) {
        if (type !== undefined) {
          throw new Error(
            `@rwgql/router: glob param "${name}..." cannot declare a type in "${cedarPath}"`,
          );
        }

        if (globName) {
          throw new Error(`@rwgql/router: route path "${cedarPath}" has more than one glob param`);
        }

        globName = name;
        params[name] = "Glob";
        return "*";
      }

      const paramType = type ?? "String";
      if (!PARAM_TYPES.has(paramType)) {
        throw new Error(
          `@rwgql/router: unsupported param type "${paramType}" for "${name}" in "${cedarPath}" (supported: Int, Float, Boolean, String, glob)`,
        );
      }

      params[name] = paramType as ParamType;
      return `:${name}`;
    },
  );

  if (globName && !path.endsWith("/*")) {
    throw new Error(
      `@rwgql/router: glob param "${globName}..." must be the last path segment in "${cedarPath}"`,
    );
  }

  return { path, params };
};

const INT = /^-?\d+$/;
const FLOAT = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

const parseParamValue = (type: ParamType, raw: string): boolean | number | string | undefined => {
  switch (type) {
    case "Int":
      return INT.test(raw) ? Number(raw) : undefined;
    case "Float":
      return FLOAT.test(raw) ? Number(raw) : undefined;
    case "Boolean":
      return raw === "true" ? true : raw === "false" ? false : undefined;
    case "Glob":
    case "String":
      return raw;
  }
};

/**
 * Parse raw string params into Cedar-typed values. Returns `undefined` when a value does not
 * match its declared type (Cedar treats that as "route does not match").
 */
export const parseRouteParams = <P extends ParamTypes>(
  types: P,
  raw: Readonly<Record<string, string | undefined>>,
): ParsedParams<P> | undefined => {
  const parsed: Record<string, boolean | number | string> = {};

  for (const [name, type] of Object.entries(types)) {
    const value = type === "Glob" ? (raw[name] ?? raw["*"]) : raw[name];
    if (value === undefined) {
      return undefined;
    }

    const typed = parseParamValue(type, value);
    if (typed === undefined) {
      return undefined;
    }

    parsed[name] = typed;
  }

  return parsed as ParsedParams<P>;
};
