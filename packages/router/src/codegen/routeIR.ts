import type { ParamTypes } from "../routeParams.js";

export type SourceLocation = {
  readonly line: number;
  readonly column: number;
};

/** How an identifier used in Routes.tsx was imported (absent for Cedar auto-imported pages). */
export type ImportBinding = {
  readonly source: string;
  /** `"default"` for default imports, otherwise the exported name. */
  readonly imported: string;
};

export type ModuleRef = {
  readonly identifier: string;
  readonly binding?: ImportBinding;
};

export type PropValue =
  | { readonly kind: "literal"; readonly value: boolean | number | string | null }
  | { readonly kind: "identifier"; readonly ref: ModuleRef }
  | { readonly kind: "array"; readonly items: readonly PropValue[] };

export type RouteEntry = {
  readonly kind: "route";
  readonly name: string;
  /** React Router pattern (`/posts/:id`, `*` for notfound). */
  readonly path: string;
  readonly params: ParamTypes;
  readonly page?: ModuleRef;
  readonly notfound: boolean;
  readonly redirect?: string;
  readonly cacheControl?: string;
  readonly private: boolean;
  readonly unauthenticated?: string;
  readonly roles?: readonly string[];
  readonly loc: SourceLocation;
};

export type SetEntry = {
  readonly kind: "set";
  readonly wraps: readonly ModuleRef[];
  readonly props: Readonly<Record<string, PropValue>>;
  /** True when this Set itself adds an auth requirement (`<PrivateSet>`, `<Private>`, `<Set private>`). */
  readonly private: boolean;
  readonly unauthenticated?: string;
  readonly roles?: readonly string[];
  readonly children: readonly RouteNode[];
  readonly loc: SourceLocation;
};

export type RouteNode = RouteEntry | SetEntry;

export type RoutesIR = {
  readonly children: readonly RouteNode[];
};

/** Depth-first list of every route, in declaration order. */
export const flattenRoutes = (nodes: readonly RouteNode[]): RouteEntry[] =>
  nodes.flatMap((node) => (node.kind === "route" ? [node] : flattenRoutes(node.children)));
