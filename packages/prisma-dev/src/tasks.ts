import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export type TaskDefinition = {
  command: string;
  dependsOn?: string[];
  cache?: boolean;
  input?: string[];
};

export interface CreatePrismaTasksOptions {
  schemaPath?: string;
}

function resolvePrepareDevCommand(): string {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("@rwgql/prisma-dev/package.json");
  const scriptPath = join(dirname(packageJsonPath), "src/cli/prepare-dev.ts");
  return `tsx ${JSON.stringify(scriptPath)}`;
}

/**
 * Vite+ tasks for local Prisma + `@cedarjs/pg`.
 *
 * - `prepare` — ensure worktree DB and write package `.env` (Prisma contract)
 * - `generate` — `prisma generate` (no DB required)
 * - `migrate-deploy` — depends on `prepare`
 */
export function createPrismaTasks(
  options: CreatePrismaTasksOptions = {},
): Record<string, TaskDefinition> {
  const schemaPath = options.schemaPath ?? "prisma/schema.prisma";
  const prepareCommand = resolvePrepareDevCommand();

  return {
    prepare: {
      command: prepareCommand,
      cache: false,
    },
    generate: {
      command: "prisma generate",
      input: [schemaPath],
    },
    "migrate-deploy": {
      command: "prisma migrate deploy",
      dependsOn: ["prepare"],
      cache: false,
    },
  };
}
