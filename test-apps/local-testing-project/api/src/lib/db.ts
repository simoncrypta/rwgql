import { createRequire } from "node:module";
import { config } from "dotenv";
config({ path: new URL("../../.env", import.meta.url) });
// Prisma 6 generates CommonJS. Load it natively so Vite never evaluates it as ESM.
const { PrismaClient } = createRequire(import.meta.url)(
  "#db-client",
) as typeof import("#db-client");
export const db = new PrismaClient();
export type * from "#db-client";
