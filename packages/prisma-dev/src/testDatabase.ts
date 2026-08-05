import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  cloneWorkerDatabase,
  createGlobalSetup,
  type SetupTemplateModeOptions,
} from "@cedarjs/pg/vitest/template";

export { cloneWorkerDatabase };
export type { SetupTemplateModeOptions };

export interface TestDatabaseGlobalSetupOptions {
  /** Module URL of the db workspace package (for example test-apps/db/index.ts). */
  dbModuleUrl: string;
  /** Optional worktree root passed through to `@cedarjs/pg`. */
  root?: string;
}

function resolveDbPackageRoot(dbModuleUrl: string): string {
  return resolve(dirname(fileURLToPath(dbModuleUrl)));
}

function resolvePrismaCli(dbPackageRoot: string): string {
  const requireFromDb = createRequire(resolve(dbPackageRoot, "package.json"));

  try {
    return requireFromDb.resolve("prisma/build/index.js");
  } catch {
    throw new Error(
      "Could not resolve prisma. Add prisma as a devDependency of the db workspace package.",
    );
  }
}

function applyDatabaseEnv(databaseUrl: string): void {
  process.env.DATABASE_URL = databaseUrl;
  process.env.TEST_DATABASE_URL = databaseUrl;
  process.env.PRISMA_HIDE_UPDATE_MESSAGE = "true";
}

function runMigrations(dbPackageRoot: string): void {
  const prismaCli = resolvePrismaCli(dbPackageRoot);

  execSync(`node "${prismaCli}" migrate deploy`, {
    cwd: dbPackageRoot,
    env: process.env,
    stdio: "pipe",
  });
}

/**
 * Vitest `globalSetup` factory: acquire → Prisma migrate once → mark TEMPLATE.
 * Pair with `cloneWorkerDatabase()` in a setupFile so each worker gets a clone.
 *
 * Stock `@cedarjs/pg/vitest` is one shared test DB only; this uses
 * `@cedarjs/pg/vitest/template` so migrate stays app-owned (Prisma) while cedar-pg
 * owns TEMPLATE + per-worker clones + role-scoped dispose.
 */
export function createTestDatabaseGlobalSetup(options: TestDatabaseGlobalSetupOptions) {
  const dbPackageRoot = resolveDbPackageRoot(options.dbModuleUrl);
  let migratedByTemplate = false;

  const cedarSetup = createGlobalSetup({
    root: options.root,
    migrate: async ({ databaseUrl }) => {
      applyDatabaseEnv(databaseUrl);
      runMigrations(dbPackageRoot);
      migratedByTemplate = true;
    },
  });

  return async () => {
    const teardown = await cedarSetup();

    // When acquire was skipped (external URL / CEDAR_PG=0), template migrate did not
    // run — still migrate so Prisma apps keep a usable schema on the shared DB.
    if (!migratedByTemplate) {
      const databaseUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
      if (!databaseUrl) {
        throw new Error("CEDAR_PG is disabled; set TEST_DATABASE_URL or DATABASE_URL for tests");
      }
      applyDatabaseEnv(databaseUrl);
      runMigrations(dbPackageRoot);
    }

    return teardown;
  };
}
