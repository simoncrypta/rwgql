import "dotenv/config";
import { defineConfig } from "prisma/config";

const config = {
  schema: "db/schema.prisma",
  migrations: { path: "db/migrations", seed: "tsx db/seed.ts" },
};
export default defineConfig(
  process.env.DATABASE_URL
    ? {
        ...config,
        engine: "classic",
        datasource: {
          url: process.env.DATABASE_URL,
          shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
        },
      }
    : config,
);
