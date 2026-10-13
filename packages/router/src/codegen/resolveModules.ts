import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import type { ModuleRef, PropValue, RouteNode, RoutesIR } from "./routeIR.js";

export type ModuleTarget =
  | { readonly kind: "file"; readonly file: string; readonly exportName: string }
  | { readonly kind: "package"; readonly specifier: string; readonly exportName: string };

export type ResolveModulesOptions = {
  readonly routesFile: string;
  /** Absolute path of the web side's src directory (target of `@/` and Cedar's `src/`). */
  readonly srcDir: string;
};

const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

const isFile = (file: string) => existsSync(file) && statSync(file).isFile();

/** Resolve a module path the way Vite + Cedar's directory-named imports do. */
export const resolveFile = (base: string): string | undefined => {
  const candidates = [
    base,
    ...EXTENSIONS.map((extension) => `${base}${extension}`),
    ...EXTENSIONS.map((extension) => path.join(base, `index${extension}`)),
    // Cedar: `src/layouts/BlogLayout` → `src/layouts/BlogLayout/BlogLayout.tsx`
    ...EXTENSIONS.map((extension) => path.join(base, `${path.basename(base)}${extension}`)),
  ];

  return candidates.find(isFile);
};

/**
 * Cedar auto-imports every page under src/pages: `pages/HomePage/HomePage.tsx` → `HomePage`,
 * `pages/Contact/NewContactPage/NewContactPage.tsx` → `ContactNewContactPage`.
 */
export const findCedarPages = (pagesDir: string): Map<string, string> => {
  const pages = new Map<string, string>();

  const walk = (dir: string, segments: readonly string[]) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walk(full, [...segments, entry.name]);
        continue;
      }

      const extension = path.extname(entry.name);
      if (!EXTENSIONS.includes(extension) || /\.(test|spec|stories|mock)\./.test(entry.name)) {
        continue;
      }

      const baseName = entry.name.slice(0, -extension.length);
      if (!baseName.endsWith("Page")) {
        continue;
      }

      const isDirectoryNamed = segments.at(-1) === baseName;
      const importName = (isDirectoryNamed ? segments : [...segments, baseName]).join("");
      if (!pages.has(importName)) {
        pages.set(importName, full);
      }
    }
  };

  if (existsSync(pagesDir)) {
    walk(pagesDir, []);
  }

  return pages;
};

const collectRefs = (nodes: readonly RouteNode[], refs: ModuleRef[] = []): ModuleRef[] => {
  const fromValue = (value: PropValue) => {
    if (value.kind === "identifier") {
      refs.push(value.ref);
    } else if (value.kind === "array") {
      value.items.forEach(fromValue);
    }
  };

  for (const node of nodes) {
    if (node.kind === "route") {
      if (node.page) {
        refs.push(node.page);
      }
      continue;
    }

    refs.push(...node.wraps);
    Object.values(node.props).forEach(fromValue);
    collectRefs(node.children, refs);
  }

  return refs;
};

/** Resolve every identifier Routes.tsx refers to (pages, wrappers, Set prop values). */
export const resolveModules = (
  ir: RoutesIR,
  { routesFile, srcDir }: ResolveModulesOptions,
): Map<string, ModuleTarget> => {
  const targets = new Map<string, ModuleTarget>();
  let cedarPages: Map<string, string> | undefined;

  const fail = (ref: ModuleRef, message: string): never => {
    throw new Error(`@rwgql/router: ${routesFile}: "${ref.identifier}" ${message}`);
  };

  for (const ref of collectRefs(ir.children)) {
    if (targets.has(ref.identifier)) {
      continue;
    }

    const binding = ref.binding;
    if (!binding) {
      cedarPages ??= findCedarPages(path.join(srcDir, "pages"));
      const file = cedarPages.get(ref.identifier);
      if (!file) {
        fail(ref, "is not imported and is not a Cedar page under src/pages");
      }
      targets.set(ref.identifier, { kind: "file", file: file!, exportName: "default" });
      continue;
    }

    const { source, imported } = binding;
    let base: string | undefined;
    if (source.startsWith("./") || source.startsWith("../")) {
      base = path.resolve(path.dirname(routesFile), source);
    } else if (source.startsWith("@/")) {
      base = path.join(srcDir, source.slice(2));
    } else if (source.startsWith("src/")) {
      base = path.join(srcDir, source.slice(4));
    }

    if (!base) {
      targets.set(ref.identifier, { kind: "package", specifier: source, exportName: imported });
      continue;
    }

    const file = resolveFile(base);
    if (!file) {
      fail(ref, `is imported from "${source}", which does not resolve to a file`);
    }
    targets.set(ref.identifier, { kind: "file", file: file!, exportName: imported });
  }

  return targets;
};
