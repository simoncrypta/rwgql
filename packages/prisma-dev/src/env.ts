import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface EnsurePrismaDatabaseUrlOptions {
  levelsUp?: number;
  envFiles?: string[];
}

function readEnvValue(envPath: string, key: string): string | undefined {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(new RegExp(`^${key}=(.*)$`));
    if (!match) {
      continue;
    }

    return match[1]!.replace(/^["']|["']$/g, "");
  }

  return undefined;
}

/**
 * Ensure `DATABASE_URL` is available for Prisma.
 * Prefer process env; optionally accept a legacy `PRISMA_DATABASE_URL` deploy shim;
 * otherwise load `DATABASE_URL` from package `.env` / `.env.defaults`.
 */
export function ensurePrismaDatabaseUrl(
  moduleUrl: string,
  options: EnsurePrismaDatabaseUrlOptions = {},
): void {
  if (!process.env.DATABASE_URL && process.env.PRISMA_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.PRISMA_DATABASE_URL;
  }

  if (process.env.DATABASE_URL) {
    return;
  }

  const levelsUp = options.levelsUp ?? 1;
  const packageRoot = resolve(
    dirname(fileURLToPath(moduleUrl)),
    ...Array.from({ length: levelsUp }, () => ".."),
  );

  for (const fileName of options.envFiles ?? [".env", ".env.defaults"]) {
    const envPath = resolve(packageRoot, fileName);
    if (!existsSync(envPath)) {
      continue;
    }

    const databaseUrl = readEnvValue(envPath, "DATABASE_URL");
    if (!databaseUrl) {
      continue;
    }

    process.env.DATABASE_URL = databaseUrl;
    return;
  }
}
