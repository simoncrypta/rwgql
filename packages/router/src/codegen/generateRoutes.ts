import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { emitReactRouterApp } from "./emitReactRouter.js";
import { routeNameEntriesFromIR, type RouteNameEntry } from "./extractRouteNamesFromSource.js";
import { parseRoutesSource } from "./parseRoutesSource.js";
import { resolveModules } from "./resolveModules.js";

export const DEFAULT_ROUTES_FILE = "src/Routes.tsx";
export const DEFAULT_ROUTE_DEFINITIONS_OUTPUT = "src/routeDefinitions.gen.ts";
export const DEFAULT_REACT_ROUTER_APP_DIR = ".rwgql";

export type GenerateRoutesOptions = {
  readonly root: string;
  readonly routesFile?: string;
  readonly outputFile?: string;
  /**
   * Also emit a React Router framework-mode app directory (routes.ts, root.tsx, route modules).
   * Defaults to true when the web root has a react-router.config.* file.
   */
  readonly reactRouter?: boolean;
  readonly appDir?: string;
};

const formatParams = (params: RouteNameEntry["params"]): string => {
  const entries = Object.entries(params);
  if (entries.length === 0) {
    return "{}";
  }

  return `{ ${entries.map(([name, type]) => `${name}: ${JSON.stringify(type)}`).join(", ")} }`;
};

export const generateRouteDefinitionsFileContent = (
  routes: RouteNameEntry[],
  { registerTypes = false }: { readonly registerTypes?: boolean } = {},
): string => {
  const definitions = routes
    .map(
      (route) =>
        `  { name: ${JSON.stringify(route.name)}, path: ${JSON.stringify(route.path)}, params: ${formatParams(route.params)} },`,
    )
    .join("\n");

  const registration = registerTypes
    ? `
// Types \`routes\` from @rwgql/router for this app (Cedar's web-routes type augmentation).
declare module "@rwgql/router" {
  interface RegisteredRoutes {
    definitions: typeof routeDefinitions;
  }
}
`
    : "";

  return `// Generated from src/Routes.tsx by @rwgql/router. Do not edit.

export const routeDefinitions = [
${definitions}
] as const;
${registration}`;
};

const hasReactRouterConfig = (root: string) =>
  ["ts", "mts", "js", "mjs"].some((extension) =>
    existsSync(path.join(root, `react-router.config.${extension}`)),
  );

const writeIfChanged = (file: string, content: string) => {
  if (existsSync(file) && readFileSync(file, "utf8") === content) {
    return;
  }

  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
};

const listFiles = (dir: string, prefix = ""): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`)
          : [`${prefix}${entry.name}`],
      )
    : [];

export const generateRoutes = ({
  root,
  routesFile = DEFAULT_ROUTES_FILE,
  outputFile = DEFAULT_ROUTE_DEFINITIONS_OUTPUT,
  reactRouter = hasReactRouterConfig(root),
  appDir = DEFAULT_REACT_ROUTER_APP_DIR,
}: GenerateRoutesOptions) => {
  const routesFilePath = path.resolve(root, routesFile);
  const outputPath = path.resolve(root, outputFile);
  const source = readFileSync(routesFilePath, "utf8");
  const ir = parseRoutesSource(source, { fileName: routesFilePath });
  const routes = routeNameEntriesFromIR(ir);

  if (routes.length === 0) {
    throw new Error(`No <Route> entries found in ${routesFilePath}`);
  }

  writeIfChanged(
    outputPath,
    generateRouteDefinitionsFileContent(routes, { registerTypes: reactRouter }),
  );

  if (reactRouter) {
    const appDirPath = path.resolve(root, appDir);
    const srcDir = path.dirname(routesFilePath);
    const targets = resolveModules(ir, { routesFile: routesFilePath, srcDir });
    const files = emitReactRouterApp(ir, targets, {
      appDir: appDirPath,
      definitionsFile: outputPath,
      srcDir,
    });

    for (const [relative, content] of files) {
      writeIfChanged(path.join(appDirPath, relative), content);
    }

    // The app directory is fully generated: drop modules for routes that no longer exist.
    for (const relative of listFiles(appDirPath)) {
      if (!files.has(relative)) {
        rmSync(path.join(appDirPath, relative));
      }
    }
  }

  return outputPath;
};
