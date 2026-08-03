import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { setup as setupCedarPgTest } from "@cedarjs/pg/vitest";

export interface EphemeralTestDatabaseOptions {
  /** Module URL of the db workspace package (for example test-apps/db/index.ts). */
  dbModuleUrl: string;
}

let teardown: (() => Promise<void>) | null = null;

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
 * Compose `@cedarjs/pg/vitest` setup, normalize Prisma env, and migrate.
 * Teardown is the adapter's skip-aware dispose (no-op when ensure was skipped).
 */
export async function startEphemeralTestDatabase(
  options: EphemeralTestDatabaseOptions,
): Promise<void> {
  if (teardown) {
    return;
  }

  const dbPackageRoot = resolveDbPackageRoot(options.dbModuleUrl);
  teardown = await setupCedarPgTest();

  const databaseUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("CEDAR_PG is disabled; set TEST_DATABASE_URL or DATABASE_URL for tests");
  }

  applyDatabaseEnv(databaseUrl);
  runMigrations(dbPackageRoot);
}

export async function stopEphemeralTestDatabase(): Promise<void> {
  if (!teardown) {
    return;
  }

  await teardown();
  teardown = null;
}
