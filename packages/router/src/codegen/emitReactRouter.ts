import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "@babel/parser";

import { flattenRoutes } from "./routeIR.js";
import type { ModuleRef, PropValue, RouteEntry, RouteNode, RoutesIR, SetEntry } from "./routeIR.js";
import { findCedarPages, resolveFile, type ModuleTarget } from "./resolveModules.js";

const HEADER = "// Generated from src/Routes.tsx by @rwgql/router. Do not edit.\n";

/** Route-module exports forwarded from a page to its generated route module. */
const FORWARDED_EXPORTS = [
  "action",
  "clientAction",
  "clientLoader",
  "ErrorBoundary",
  "handle",
  "HydrateFallback",
  "links",
  "meta",
  "shouldRevalidate",
] as const;

export type EmitReactRouterOptions = {
  /** Absolute path of the generated React Router appDirectory (e.g. web/.rwgql). */
  readonly appDir: string;
  readonly srcDir: string;
  /** Absolute path of the generated route definitions module (e.g. src/routeDefinitions.gen.ts). */
  readonly definitionsFile: string;
  /** Reads a module's export names; defaults to parsing the file with Babel. */
  readonly readExports?: (file: string) => ReadonlySet<string>;
};

export const readModuleExports = (file: string): ReadonlySet<string> => {
  const names = new globalThis.Set<string>();
  const ast = parse(readFileSync(file, "utf8"), {
    plugins: ["jsx", "typescript"],
    sourceType: "module",
  });

  for (const statement of ast.program.body) {
    if (statement.type === "ExportDefaultDeclaration") {
      names.add("default");
    } else if (statement.type === "ExportNamedDeclaration") {
      const declaration = statement.declaration;
      if (declaration?.type === "VariableDeclaration") {
        for (const declarator of declaration.declarations) {
          if (declarator.id.type === "Identifier") {
            names.add(declarator.id.name);
          }
        }
      } else if (
        (declaration?.type === "FunctionDeclaration" || declaration?.type === "ClassDeclaration") &&
        declaration.id
      ) {
        names.add(declaration.id.name);
      }

      for (const specifier of statement.specifiers) {
        const exported = specifier.exported;
        names.add(exported.type === "Identifier" ? exported.name : exported.value);
      }
    }
  }

  return names;
};

const toPosix = (value: string) => value.split(path.sep).join("/");

const stripExtension = (file: string) => file.replace(/\.(tsx|ts|jsx|js)$/, "");

const routeFileName = (route: RouteEntry) => `routes/${route.name}.tsx`;

const relativeRoutePath = (route: RouteEntry) => route.path.replace(/^\//, "");

const importLine = (local: string, target: ModuleTarget, fromFile: string): string => {
  const specifier =
    target.kind === "package" ? target.specifier : relativeSpecifier(fromFile, target.file);

  return target.exportName === "default"
    ? `import ${local} from ${JSON.stringify(specifier)};`
    : `import { ${target.exportName === local ? local : `${target.exportName} as ${local}`} } from ${JSON.stringify(specifier)};`;
};

const relativeSpecifier = (fromFile: string, toFile: string) => {
  const relative = toPosix(path.relative(path.dirname(fromFile), stripExtension(toFile)));
  return relative.startsWith(".") ? relative : `./${relative}`;
};

export const emitReactRouterApp = (
  ir: RoutesIR,
  targets: ReadonlyMap<string, ModuleTarget>,
  { appDir, srcDir, definitionsFile, readExports = readModuleExports }: EmitReactRouterOptions,
): Map<string, string> => {
  const files = new Map<string, string>();
  const routes = flattenRoutes(ir.children);
  const routesByName = new Map(routes.map((route) => [route.name, route]));
  const target = (ref: ModuleRef) => {
    const resolved = targets.get(ref.identifier);
    if (!resolved) {
      throw new Error(`@rwgql/router: "${ref.identifier}" was not resolved`);
    }
    return resolved;
  };

  const staticPathOf = (name: string, usage: string) => {
    if (name.startsWith("/")) {
      return name;
    }

    const route = routesByName.get(name);
    if (!route) {
      throw new Error(`@rwgql/router: ${usage} references unknown route "${name}"`);
    }
    if (Object.keys(route.params).length > 0 || route.notfound) {
      throw new Error(`@rwgql/router: ${usage} must reference a route without params ("${name}")`);
    }
    return route.path;
  };

  for (const route of routes) {
    const file = path.join(appDir, routeFileName(route));
    const lines: string[] = [HEADER];
    const hasParams = Object.keys(route.params).length > 0;

    if (route.redirect) {
      const to = staticPathOf(route.redirect, `<Route name="${route.name}" redirect>`);
      lines.push(
        `import { redirect } from "react-router";`,
        "",
        `export const loader = () => redirect(${JSON.stringify(to)});`,
        "",
        "export default function Redirect() {",
        "  return null;",
        "}",
      );
      files.set(routeFileName(route), `${lines.join("\n")}\n`);
      continue;
    }

    if (!route.page) {
      throw new Error(
        `@rwgql/router: <Route name="${route.name}"> uses render, which is RWSDK-only; use page={...} with React Router`,
      );
    }

    const page = target(route.page);
    const pageExports =
      page.kind === "file" ? readExports(page.file) : new globalThis.Set<string>(["default"]);
    const pageSpecifier =
      page.kind === "package" ? page.specifier : relativeSpecifier(file, page.file);
    const pageLoader = pageExports.has("loader") && !route.notfound;

    const reactRouterImports = new globalThis.Set<string>();
    const body: string[] = [];

    if (route.notfound) {
      reactRouterImports.add("data");
      body.push("export const loader = () => data(null, { status: 404 });", "");
    } else if (hasParams) {
      reactRouterImports.add("data");
      reactRouterImports.add("useParams");
      reactRouterImports.add("type LoaderFunctionArgs");
      body.push(
        `const paramTypes = ${JSON.stringify(route.params)} as const;`,
        "",
        "// A param that does not match its Cedar type is a 404.",
        "export const loader = (args: LoaderFunctionArgs) => {",
        "  if (!parseRouteParams(paramTypes, args.params)) {",
        "    throw data(null, { status: 404 });",
        "  }",
        "",
        `  return ${pageLoader ? "pageLoader(args as Parameters<typeof pageLoader>[0])" : "null"};`,
        "};",
        "",
      );
    } else if (pageLoader) {
      body.push(`export { loader } from ${JSON.stringify(pageSpecifier)};`, "");
    }

    if (pageExports.has("headers")) {
      body.push(`export { headers } from ${JSON.stringify(pageSpecifier)};`, "");
    } else if (route.cacheControl) {
      body.push(
        `export const headers = () => ({ "Cache-Control": ${JSON.stringify(route.cacheControl)} });`,
        "",
      );
    }

    const forwarded = FORWARDED_EXPORTS.filter((name) => pageExports.has(name));
    if (forwarded.length > 0) {
      body.push(`export { ${forwarded.join(", ")} } from ${JSON.stringify(pageSpecifier)};`, "");
    }

    if (hasParams) {
      body.push(
        `export default function ${componentName(route.name)}Route() {`,
        "  const params = parseRouteParams(paramTypes, useParams());",
        "  if (!params) {",
        "    // Unreachable after the loader's 404; keeps the page props typed.",
        `    throw new Error("@rwgql/router: params do not match ${route.name}");`,
        "  }",
        "",
        "  return <Page {...params} />;",
        "}",
      );
    } else {
      body.push(
        page.exportName === "default"
          ? `export { default } from ${JSON.stringify(pageSpecifier)};`
          : `export { ${page.exportName} as default } from ${JSON.stringify(pageSpecifier)};`,
      );
    }

    if (reactRouterImports.size > 0) {
      lines.push(`import { ${[...reactRouterImports].sort().join(", ")} } from "react-router";`);
    }
    if (hasParams) {
      lines.push(`import { parseRouteParams } from "@rwgql/router";`);
      lines.push(importLine("Page", page, file));
    }
    if (pageLoader && hasParams) {
      lines.push(`import { loader as pageLoader } from ${JSON.stringify(pageSpecifier)};`);
    }
    lines.push("", ...body);

    files.set(routeFileName(route), `${lines.join("\n")}\n`);
  }

  let setCounter = 0;

  const emitSet = (set: SetEntry): string => {
    const name = `set-${setCounter++}`;
    const relativeFile = `sets/${name}.tsx`;
    const file = path.join(appDir, relativeFile);
    const imports = new Map<string, string>();
    const addImport = (ref: ModuleRef) => {
      imports.set(ref.identifier, importLine(ref.identifier, target(ref), file));
    };

    const renderValue = (value: PropValue): string => {
      if (value.kind === "literal") {
        return value.value === null ? "undefined" : JSON.stringify(value.value);
      }
      if (value.kind === "identifier") {
        addImport(value.ref);
        return value.ref.identifier;
      }
      return `[${value.items.map(renderValue).join(", ")}]`;
    };

    const props = Object.entries(set.props)
      .map(([prop, value]) => ` ${prop}={${renderValue(value)}}`)
      .join("");

    let tree = "<Outlet />";
    for (const wrap of [...set.wraps].reverse()) {
      addImport(wrap);
      tree = `<${wrap.identifier}${props}>${tree}</${wrap.identifier}>`;
    }

    const lines = [HEADER, `import { Outlet } from "react-router";`];
    if (set.private) {
      lines.push(`import { requireAuth } from "@rwgql/router/server";`);
    }
    lines.push(...[...imports.values()].sort(), "");

    if (set.private) {
      const loginPath = staticPathOf(set.unauthenticated!, "<PrivateSet unauthenticated>");
      const options = [`loginPath: ${JSON.stringify(loginPath)}`];
      if (set.roles) {
        options.push(`roles: ${JSON.stringify(set.roles)}`);
      }
      lines.push(
        `export const middleware = [requireAuth({ ${options.join(", ")} })];`,
        "",
        "// A server loader makes client-side navigations round-trip so the middleware runs.",
        "export const loader = () => null;",
        "",
      );
    }

    lines.push(`export default function Set${setCounter - 1}() {`, `  return ${tree};`, "}");
    files.set(relativeFile, `${lines.join("\n")}\n`);
    return relativeFile;
  };

  const emitNodes = (nodes: readonly RouteNode[], indent: string): string[] =>
    nodes.flatMap((node) => {
      if (node.kind === "route") {
        const fileName = JSON.stringify(routeFileName(node));
        const id = `{ id: ${JSON.stringify(node.name)} }`;
        return node.path === "/"
          ? [`${indent}index(${fileName}, ${id}),`]
          : [`${indent}route(${JSON.stringify(relativeRoutePath(node))}, ${fileName}, ${id}),`];
      }

      // Sets without wrappers or auth only carry defaults, already applied to their routes.
      if (node.wraps.length === 0 && !node.private) {
        return emitNodes(node.children, indent);
      }

      const layoutFile = emitSet(node);
      return [
        `${indent}layout(${JSON.stringify(layoutFile)}, [`,
        ...emitNodes(node.children, `${indent}  `),
        `${indent}]),`,
      ];
    });

  const routeConfig = emitNodes(ir.children, "  ");
  files.set(
    "routes.ts",
    [
      HEADER,
      `import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";`,
      "",
      "export default [",
      ...routeConfig,
      "] satisfies RouteConfig;",
      "",
    ].join("\n"),
  );

  const rootFile = path.join(appDir, "root.tsx");
  const appModule = resolveFile(path.join(srcDir, "App"));
  const documentModule = resolveFile(path.join(srcDir, "Document"));
  const fatalErrorPage = findCedarPages(path.join(srcDir, "pages")).get("FatalErrorPage");
  const notFoundRoute = routes.find((route) => route.notfound && route.page);
  const notFoundTarget = notFoundRoute ? target(notFoundRoute.page!) : undefined;

  const imports = [
    `import type { ComponentType, ReactNode } from "react";`,
    `import { isRouteErrorResponse, Outlet } from "react-router";`,
    `import { NavigationBridge, registerRoutes } from "@rwgql/router";`,
    "",
    `import { routeDefinitions } from ${JSON.stringify(relativeSpecifier(rootFile, definitionsFile))};`,
    appModule && `import App from ${JSON.stringify(relativeSpecifier(rootFile, appModule))};`,
    documentModule &&
      `import { Document } from ${JSON.stringify(relativeSpecifier(rootFile, documentModule))};`,
    fatalErrorPage &&
      `import FatalErrorPageModule from ${JSON.stringify(relativeSpecifier(rootFile, fatalErrorPage))};`,
    notFoundTarget && importLine("NotFoundPage", notFoundTarget, rootFile),
  ].filter((line): line is string => typeof line === "string");

  const layoutBody = documentModule
    ? "  return <Document>{children}</Document>;"
    : `  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );`;
  const outlet = `      <NavigationBridge />
      <Outlet />`;
  const rootBody = appModule
    ? `  return (
    <App>
${outlet}
    </App>
  );`
    : `  return (
    <>
${outlet}
    </>
  );`;
  const notFoundBranch = notFoundTarget
    ? `  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

`
    : "";
  const fatalBranch = fatalErrorPage
    ? "  return <FatalErrorPage error={error} />;"
    : '  return <h1>{isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : "Something went wrong"}</h1>;';

  files.set(
    "root.tsx",
    `${HEADER}${imports.join("\n")}

${fatalErrorPage ? "// Cedar's FatalErrorPage may or may not declare an `error` prop.\nconst FatalErrorPage = FatalErrorPageModule as ComponentType<{ readonly error?: unknown }>;\n\n" : ""}registerRoutes(routeDefinitions);

export function Layout({ children }: { readonly children: ReactNode }) {
${layoutBody}
}

export default function Root() {
${rootBody}
}

export function ErrorBoundary({ error }: { readonly error: unknown }) {
${notFoundBranch}${fatalBranch}
}
`,
  );

  const entryServer = resolveFile(path.join(srcDir, "entry.server"));
  if (entryServer) {
    const specifier = JSON.stringify(
      relativeSpecifier(path.join(appDir, "entry.server.tsx"), entryServer),
    );
    // Re-export everything so optional exports (streamTimeout, handleError) keep working.
    files.set(
      "entry.server.tsx",
      `${HEADER}export * from ${specifier};\nexport { default } from ${specifier};\n`,
    );
  }

  const entryClient = resolveFile(path.join(srcDir, "entry.client"));
  if (entryClient) {
    // Side-effect module: it hydrates the document.
    files.set(
      "entry.client.tsx",
      `${HEADER}import ${JSON.stringify(relativeSpecifier(path.join(appDir, "entry.client.tsx"), entryClient))};\n`,
    );
  }

  return files;
};

const componentName = (routeName: string) =>
  routeName.charAt(0).toUpperCase() + routeName.slice(1).replace(/[^A-Za-z0-9_]/g, "_");
