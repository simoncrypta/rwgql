import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { acquireIfNeeded } from "@cedarjs/pg";
import { config } from "dotenv";

const root = fileURLToPath(new URL("../", import.meta.url));
const envFile = new URL("../.env", import.meta.url);
config({ path: envFile });
if (process.env.NODE_ENV === "production") {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required in production");
} else {
  const result = await acquireIfNeeded({
    root,
    mode: "dev",
    url: process.env.DATABASE_URL,
    setEnv: true,
  });
  const url = result.status === "acquired" ? result.databaseUrl : process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL when CEDAR_PG is disabled");
  let contents = "";
  try {
    contents = await readFile(envFile, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const next = /^DATABASE_URL=.*$/m.test(contents)
    ? contents.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url}`)
    : `${contents}${contents && !contents.endsWith("\n") ? "\n" : ""}DATABASE_URL=${url}\n`;
  if (next !== contents) await writeFile(envFile, next);
}
