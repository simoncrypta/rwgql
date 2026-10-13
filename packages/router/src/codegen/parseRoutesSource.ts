import { parse } from "@babel/parser";
import type * as t from "@babel/types";

import { resolveCacheControl, resolveRouteCacheControl } from "../cacheControl.js";
import { parseRoutePath } from "../routeParams.js";
import type {
  ImportBinding,
  ModuleRef,
  PropValue,
  RouteEntry,
  RouteNode,
  RoutesIR,
  SetEntry,
  SourceLocation,
} from "./routeIR.js";

type Context = {
  readonly cacheControl?: string;
  readonly private: boolean;
  readonly unauthenticated?: string;
  readonly roles?: readonly string[];
};

const SET_CONTROL_PROPS = new globalThis.Set([
  "cache",
  "children",
  "private",
  "roles",
  "unauthenticated",
  "whileLoadingAuth",
  "wrap",
]);

const ROUTE_PROPS = new globalThis.Set([
  "cache",
  "name",
  "notfound",
  "page",
  "path",
  "prerender",
  "private",
  "redirect",
  "whileLoadingPage",
]);

class RoutesSyntaxError extends Error {
  constructor(fileName: string, loc: SourceLocation | undefined, message: string) {
    super(`@rwgql/router: ${fileName}${loc ? `:${loc.line}:${loc.column + 1}` : ""} ${message}`);
    this.name = "RoutesSyntaxError";
  }
}

const locOf = (node: t.Node): SourceLocation => ({
  line: node.loc?.start.line ?? 0,
  column: node.loc?.start.column ?? 0,
});

const isNode = (value: unknown): value is t.Node =>
  typeof value === "object" && value !== null && typeof (value as t.Node).type === "string";

/** Depth-first search over a Babel AST without pulling in @babel/traverse. */
const findNode = <N extends t.Node>(
  root: t.Node,
  predicate: (node: t.Node) => node is N,
): N | undefined => {
  if (predicate(root)) {
    return root;
  }

  for (const [key, value] of Object.entries(root)) {
    if (key === "loc" || key === "leadingComments" || key === "trailingComments") {
      continue;
    }

    const children = Array.isArray(value) ? value : [value];
    for (const child of children) {
      if (isNode(child)) {
        const found = findNode(child, predicate);
        if (found) {
          return found;
        }
      }
    }
  }

  return undefined;
};

const collectImports = (program: t.Program): Map<string, ImportBinding> => {
  const imports = new Map<string, ImportBinding>();

  for (const statement of program.body) {
    if (statement.type !== "ImportDeclaration" || statement.importKind === "type") {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type === "ImportDefaultSpecifier") {
        imports.set(specifier.local.name, { source: statement.source.value, imported: "default" });
      } else if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") {
        const imported =
          specifier.imported.type === "Identifier"
            ? specifier.imported.name
            : specifier.imported.value;
        imports.set(specifier.local.name, { source: statement.source.value, imported });
      }
    }
  }

  return imports;
};

const elementName = (element: t.JSXElement): string | undefined => {
  const name = element.openingElement.name;
  return name.type === "JSXIdentifier" ? name.name : undefined;
};

const isRouterElement = (node: t.Node): node is t.JSXElement =>
  node.type === "JSXElement" && elementName(node) === "Router";

export type ParseRoutesSourceOptions = {
  readonly fileName?: string;
};

export const parseRoutesSource = (
  source: string,
  { fileName = "Routes.tsx" }: ParseRoutesSourceOptions = {},
): RoutesIR => {
  const fail = (node: t.Node | undefined, message: string): never => {
    throw new RoutesSyntaxError(fileName, node ? locOf(node) : undefined, message);
  };

  let ast: t.File;
  try {
    ast = parse(source, {
      plugins: ["jsx", "typescript"],
      sourceFilename: fileName,
      sourceType: "module",
    });
  } catch (error) {
    throw new RoutesSyntaxError(
      fileName,
      undefined,
      `could not be parsed: ${(error as Error).message}`,
    );
  }

  const imports = collectImports(ast.program);
  const router = findNode(ast.program, isRouterElement);
  if (!router) {
    return fail(undefined, "has no <Router> element");
  }

  const moduleRef = (identifier: string): ModuleRef => {
    const binding = imports.get(identifier);
    return binding ? { identifier, binding } : { identifier };
  };

  const attributesOf = (element: t.JSXElement) => {
    const attributes = new Map<string, t.JSXAttribute>();

    for (const attribute of element.openingElement.attributes) {
      if (attribute.type === "JSXSpreadAttribute") {
        fail(attribute, `<${elementName(element)}> cannot use spread props in a route tree`);
      } else if (attribute.name.type === "JSXIdentifier") {
        attributes.set(attribute.name.name, attribute);
      }
    }

    return attributes;
  };

  const readValue = (attribute: t.JSXAttribute, label: string): PropValue => {
    const value = attribute.value;
    if (!value) {
      return { kind: "literal", value: true };
    }

    if (value.type === "StringLiteral") {
      return { kind: "literal", value: value.value };
    }

    if (value.type !== "JSXExpressionContainer" || value.expression.type === "JSXEmptyExpression") {
      return fail(attribute, `${label} must be a literal, a route name, or an imported identifier`);
    }

    return readExpression(value.expression, label);
  };

  const readExpression = (expression: t.Expression, label: string): PropValue => {
    switch (expression.type) {
      case "StringLiteral":
      case "NumericLiteral":
      case "BooleanLiteral":
        return { kind: "literal", value: expression.value };
      case "NullLiteral":
        return { kind: "literal", value: null };
      case "TemplateLiteral":
        if (expression.expressions.length === 0) {
          return { kind: "literal", value: expression.quasis[0]?.value.cooked ?? "" };
        }
        break;
      case "Identifier":
        if (expression.name === "undefined") {
          return { kind: "literal", value: null };
        }
        return { kind: "identifier", ref: moduleRef(expression.name) };
      case "ArrayExpression":
        return {
          kind: "array",
          items: expression.elements.map((item) => {
            if (!item || item.type === "SpreadElement") {
              return fail(expression, `${label} arrays cannot contain spreads or holes`);
            }
            return readExpression(item, label);
          }),
        };
      case "TSAsExpression":
      case "TSSatisfiesExpression":
        return readExpression(expression.expression, label);
      default:
        break;
    }

    return fail(
      expression,
      `${label} must be a literal, a route name, or an imported identifier (got ${expression.type}); route trees are compiled statically`,
    );
  };

  const readString = (attribute: t.JSXAttribute | undefined, label: string) => {
    if (!attribute) {
      return undefined;
    }

    const value = readValue(attribute, label);
    if (value.kind !== "literal" || typeof value.value !== "string") {
      return fail(attribute, `${label} must be a string`);
    }

    return value.value;
  };

  const readBoolean = (attribute: t.JSXAttribute | undefined, label: string) => {
    if (!attribute) {
      return undefined;
    }

    const value = readValue(attribute, label);
    if (value.kind !== "literal" || typeof value.value !== "boolean") {
      return fail(attribute, `${label} must be a boolean`);
    }

    return value.value;
  };

  const readCache = (attribute: t.JSXAttribute | undefined, label: string) => {
    if (!attribute) {
      return undefined;
    }

    const value = readValue(attribute, label);
    if (value.kind !== "literal" || !["boolean", "string"].includes(typeof value.value)) {
      return fail(attribute, `${label} must be true, false, or a Cache-Control string`);
    }

    return value.value as boolean | string;
  };

  const readRoles = (attribute: t.JSXAttribute | undefined, label: string) => {
    if (!attribute) {
      return undefined;
    }

    const value = readValue(attribute, label);
    if (value.kind === "literal" && typeof value.value === "string") {
      return [value.value];
    }

    if (
      value.kind === "array" &&
      value.items.every((item) => item.kind === "literal" && typeof item.value === "string")
    ) {
      return value.items.map((item) => (item as { value: string }).value);
    }

    return fail(attribute, `${label} must be a string or an array of strings`);
  };

  const readComponent = (attribute: t.JSXAttribute | undefined, label: string) => {
    if (!attribute) {
      return undefined;
    }

    const value = readValue(attribute, label);
    if (value.kind !== "identifier") {
      return fail(attribute, `${label} must be a component identifier`);
    }

    return value.ref;
  };

  const childElements = (element: t.JSXElement): t.JSXElement[] =>
    element.children.flatMap((child) => {
      if (child.type === "JSXElement") {
        return [child];
      }

      if (child.type === "JSXText" && child.value.trim() === "") {
        return [];
      }

      if (
        child.type === "JSXExpressionContainer" &&
        child.expression.type === "JSXEmptyExpression"
      ) {
        return [];
      }

      if (child.type === "JSXFragment") {
        return fail(child, "route trees cannot contain fragments; use <Set> to group routes");
      }

      return fail(
        child,
        "route trees may only contain <Route>, <Set>, <PrivateSet>, and <Private>",
      );
    });

  const parseRoute = (element: t.JSXElement, context: Context): RouteEntry => {
    const attributes = attributesOf(element);

    for (const [name, attribute] of attributes) {
      if (!ROUTE_PROPS.has(name)) {
        fail(attribute, `<Route> does not support prop "${name}"`);
      }
    }

    if (childElements(element).length > 0) {
      fail(element, "<Route> cannot have children");
    }

    const notfound = readBoolean(attributes.get("notfound"), "<Route notfound>") ?? false;
    const redirect = readString(attributes.get("redirect"), "<Route redirect>");
    const page = readComponent(attributes.get("page"), "<Route page>");
    const rawPath = readString(attributes.get("path"), "<Route path>");
    const isPrivate = readBoolean(attributes.get("private"), "<Route private>") ?? context.private;
    const cache = readCache(attributes.get("cache"), "<Route cache>");
    const name =
      readString(attributes.get("name"), "<Route name>") ?? (notfound ? "notFound" : undefined);

    if (!page && !redirect) {
      fail(element, "<Route> requires page (or redirect)");
    }

    if (notfound) {
      if (rawPath) {
        fail(element, "<Route notfound> cannot also have a path");
      }
    } else if (!rawPath) {
      fail(element, "<Route> requires path unless notfound is set");
    }

    if (!name) {
      return fail(element, `<Route path="${rawPath}"> requires name`);
    }

    let parsedPath;
    try {
      parsedPath = notfound ? { path: "*", params: {} } : parseRoutePath(rawPath!);
    } catch (error) {
      return fail(attributes.get("path"), (error as Error).message.replace("@rwgql/router: ", ""));
    }

    return {
      kind: "route",
      name,
      ...parsedPath,
      page,
      notfound,
      redirect,
      cacheControl: isPrivate ? undefined : resolveRouteCacheControl(cache, context.cacheControl),
      private: isPrivate,
      unauthenticated: isPrivate ? context.unauthenticated : undefined,
      roles: isPrivate ? context.roles : undefined,
      loc: locOf(element),
    };
  };

  const parseSet = (element: t.JSXElement, context: Context, kind: string): SetEntry => {
    const attributes = attributesOf(element);
    const isPrivateSet = kind === "PrivateSet" || kind === "Private";

    if (kind === "Private" && attributes.has("wrap")) {
      fail(element, "<Private> cannot wrap; use <PrivateSet wrap={...}>");
    }

    const wrapAttribute = attributes.get("wrap");
    const wrapValue = wrapAttribute ? readValue(wrapAttribute, `<${kind} wrap>`) : undefined;
    const wraps: ModuleRef[] = [];
    if (wrapValue?.kind === "identifier") {
      wraps.push(wrapValue.ref);
    } else if (wrapValue?.kind === "array") {
      for (const item of wrapValue.items) {
        if (item.kind !== "identifier") {
          fail(wrapAttribute, `<${kind} wrap> arrays may only contain components`);
        }
        wraps.push((item as { ref: ModuleRef }).ref);
      }
    } else if (wrapValue) {
      fail(wrapAttribute, `<${kind} wrap> must be a component or an array of components`);
    }

    const ownPrivate =
      isPrivateSet || (readBoolean(attributes.get("private"), `<${kind} private>`) ?? false);
    const unauthenticated = readString(
      attributes.get("unauthenticated"),
      `<${kind} unauthenticated>`,
    );
    const roles = readRoles(attributes.get("roles"), `<${kind} roles>`);

    if (ownPrivate && !unauthenticated) {
      fail(element, `<${kind}> requires unauthenticated="<route name>"`);
    }

    const props: Record<string, PropValue> = {};
    for (const [name, attribute] of attributes) {
      if (!SET_CONTROL_PROPS.has(name)) {
        props[name] = readValue(attribute, `<${kind} ${name}>`);
      }
    }

    const isPrivate = context.private || ownPrivate;
    const cache = readCache(attributes.get("cache"), `<${kind} cache>`);
    const childContext: Context = ownPrivate
      ? { private: true, unauthenticated, roles: roles ?? context.roles }
      : {
          ...context,
          cacheControl: isPrivate
            ? undefined
            : cache === undefined
              ? context.cacheControl
              : resolveCacheControl(cache),
        };

    return {
      kind: "set",
      wraps,
      props,
      private: ownPrivate,
      unauthenticated: ownPrivate ? unauthenticated : undefined,
      roles: ownPrivate ? roles : undefined,
      children: parseChildren(element, childContext),
      loc: locOf(element),
    };
  };

  const parseChildren = (element: t.JSXElement, context: Context): RouteNode[] =>
    childElements(element).map((child) => {
      const kind = elementName(child);

      if (kind === "Route") {
        return parseRoute(child, context);
      }

      if (kind === "Set" || kind === "PrivateSet" || kind === "Private") {
        return parseSet(child, context, kind);
      }

      return fail(
        child,
        `route trees may only contain <Route>, <Set>, <PrivateSet>, and <Private> (got <${kind ?? "?"}>)`,
      );
    });

  const children = parseChildren(router, { private: false });
  checkUnique(children, fail);

  return { children };
};

const checkUnique = (
  nodes: readonly RouteNode[],
  fail: (node: t.Node | undefined, message: string) => never,
) => {
  const names = new Map<string, RouteEntry>();
  const paths = new Map<string, RouteEntry>();

  const visit = (node: RouteNode) => {
    if (node.kind === "set") {
      node.children.forEach(visit);
      return;
    }

    const at = (entry: RouteEntry) => `line ${entry.loc.line}`;
    const sameName = names.get(node.name);
    if (sameName) {
      fail(undefined, `duplicate route name "${node.name}" (${at(sameName)} and ${at(node)})`);
    }
    names.set(node.name, node);

    const samePath = paths.get(node.path);
    if (samePath) {
      fail(
        undefined,
        `duplicate route path "${node.path}" ("${samePath.name}" and "${node.name}")`,
      );
    }
    paths.set(node.path, node);
  };

  nodes.forEach(visit);
};
