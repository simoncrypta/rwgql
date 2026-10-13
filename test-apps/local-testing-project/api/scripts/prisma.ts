import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { acquire, isCedarPgManagedUrl } from "@cedarjs/pg";
import "./prepare.ts";

const args = process.argv.slice(2);
// cedar-pg's app role deliberately cannot CREATE DATABASE. Give Migrate its own
// independently leased shadow database instead of broadening the app role's privileges.
if (
  args[0] === "migrate" &&
  args[1] === "dev" &&
  !process.env.SHADOW_DATABASE_URL &&
  isCedarPgManagedUrl(process.env.DATABASE_URL)
) {
  const shadow = await acquire({
    root: fileURLToPath(new URL("../.prisma-shadow/", import.meta.url)),
    mode: "dev",
    setEnv: false,
  });
  process.env.SHADOW_DATABASE_URL = shadow.databaseUrl;
}
if (
  process.env.SHADOW_DATABASE_URL &&
  process.env.SHADOW_DATABASE_URL === process.env.DATABASE_URL
) {
  throw new Error("SHADOW_DATABASE_URL must differ from DATABASE_URL");
}
// Forward every argument, including interactive migrate dev / studio, to the real CLI.
const child = spawn("prisma", args, { stdio: "inherit", env: process.env });
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
