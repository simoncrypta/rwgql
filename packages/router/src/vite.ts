import path from "node:path";

import { generateRoutes, type GenerateRoutesOptions } from "./codegen/generateRoutes.js";

type ViteDevServer = {
  readonly config: { readonly root: string };
  readonly watcher: {
    add(paths: string | readonly string[]): void;
    on(event: "add" | "change" | "unlink", listener: (file: string) => void): void;
  };
};

export type RwgqlRoutesPluginOptions = Omit<GenerateRoutesOptions, "root"> & {
  /** Web root (defaults to Vite's root). */
  readonly root?: string;
};

/**
 * Regenerates the React Router app directory from src/Routes.tsx at startup and whenever
 * Routes.tsx, a page, or a layout changes (page exports such as `loader` are forwarded).
 * Place it before `reactRouter()`.
 */
export const rwgqlRoutes = (options: RwgqlRoutesPluginOptions = {}) => {
  let root = options.root;

  const run = () => {
    try {
      generateRoutes({ ...options, root: root ?? process.cwd() });
    } catch (error) {
      // Keep the dev server alive; the message points at the Routes.tsx node.
      console.error((error as Error).message);
    }
  };

  return {
    name: "rwgql:routes",
    enforce: "pre" as const,
    // React Router's plugin reads routes.ts in its own config hook, so generate here first.
    config(userConfig: { readonly root?: string }) {
      root ??= path.resolve(userConfig.root ?? process.cwd());
      run();
    },
    configureServer(server: ViteDevServer) {
      const srcDir = path.join(root ?? server.config.root, "src");
      const relevant = (file: string) =>
        file === path.join(srcDir, "Routes.tsx") ||
        file.startsWith(path.join(srcDir, "pages") + path.sep) ||
        file.startsWith(path.join(srcDir, "layouts") + path.sep) ||
        /^(App|Document|entry\.(client|server))\.[jt]sx?$/.test(path.relative(srcDir, file));

      for (const event of ["add", "change", "unlink"] as const) {
        server.watcher.on(event, (file) => {
          if (relevant(file)) {
            run();
          }
        });
      }
    },
  };
};
