import { PrismaClient } from "@prisma/client";
import { ensurePrismaDatabaseUrl } from "./env.ts";

ensurePrismaDatabaseUrl(import.meta.url, { levelsUp: 0 });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

process.env.DATABASE_URL = databaseUrl;

// Pin the datasource URL so Prisma does not override it from test-apps/db/.env written during build.
export const db = new PrismaClient({
  datasources: {
    db: { url: databaseUrl },
  },
});

export type * from "@prisma/client";
