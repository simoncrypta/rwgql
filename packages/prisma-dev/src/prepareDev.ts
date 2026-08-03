import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureIfNeeded } from "@cedarjs/pg";

function writeAppEnv(appEnvPath: string, databaseUrl: string): void {
  writeFileSync(
    appEnvPath,
    [`DATABASE_URL=${databaseUrl}`, "PRISMA_HIDE_UPDATE_MESSAGE=true", ""].join("\n"),
  );
}

/**
 * Ensure a worktree-scoped Postgres via `@cedarjs/pg` and sync the package `.env`
 * (Prisma's contract). `@cedarjs/pg` also writes `.cedarpg/dev.env` as its
 * internal lease cache — apps should read `test-apps/db/.env` / `DATABASE_URL`,
 * not the lease file.
 *
 * Production skips provisioning and does not write a localhost `.env`.
 */
export async function prepareDevDatabase(
  options: { appEnvPath?: string; root?: string } = {},
): Promise<void> {
  const appEnvPath = resolve(options.appEnvPath ?? resolve(process.cwd(), ".env"));

  if (process.env.NODE_ENV === "production") {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is required when NODE_ENV=production (local @cedarjs/pg is disabled)",
      );
    }
    console.log("Skipping local @cedarjs/pg; using external DATABASE_URL.");
    return;
  }

  const result = await ensureIfNeeded({
    root: options.root,
    mode: "dev",
    url: process.env.DATABASE_URL,
    setEnv: true,
  });

  const databaseUrl = result.status === "ensured" ? result.databaseUrl : process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("CEDAR_PG is disabled; set DATABASE_URL explicitly");
  }

  writeAppEnv(appEnvPath, databaseUrl);

  if (result.status === "ensured") {
    console.log(`@cedarjs/pg ready: ${result.databaseName}`);
    console.log(`Wrote ${appEnvPath}`);
    return;
  }

  console.log(
    result.reason === "disabled"
      ? `CEDAR_PG disabled; wrote ${appEnvPath}`
      : `Using external DATABASE_URL; wrote ${appEnvPath}`,
  );
}
