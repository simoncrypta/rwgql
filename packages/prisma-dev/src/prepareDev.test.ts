import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

const acquireIfNeeded = vi.hoisted(() => vi.fn());

vi.mock("@cedarjs/pg", () => ({
  acquireIfNeeded,
}));

import { prepareDevDatabase } from "./prepareDev.ts";

describe("prepareDevDatabase", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "prisma-dev-prepare-"));
    acquireIfNeeded.mockReset();
    delete process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("skips acquire in production and does not write .env", async () => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = "postgresql://render/db";
    const appEnvPath = join(dir, ".env");

    await prepareDevDatabase({ appEnvPath });

    expect(acquireIfNeeded).not.toHaveBeenCalled();
    expect(() => readFileSync(appEnvPath, "utf8")).toThrow();
  });

  it("writes DATABASE_URL when @cedarjs/pg skip policy says disabled", async () => {
    process.env.DATABASE_URL = "postgresql://external/db";
    acquireIfNeeded.mockResolvedValue({ status: "skipped", reason: "disabled" });
    const appEnvPath = join(dir, ".env");

    await prepareDevDatabase({ appEnvPath });

    const body = readFileSync(appEnvPath, "utf8");
    expect(body).toContain("DATABASE_URL=postgresql://external/db");
    expect(body).not.toContain("PRISMA_DATABASE_URL=");
  });

  it("writes DATABASE_URL when @cedarjs/pg skip policy says external-url", async () => {
    process.env.DATABASE_URL = "postgresql://external/db";
    acquireIfNeeded.mockResolvedValue({
      status: "skipped",
      reason: "external-url",
      databaseUrl: "postgresql://external/db",
    });
    const appEnvPath = join(dir, ".env");

    await prepareDevDatabase({ appEnvPath });

    expect(readFileSync(appEnvPath, "utf8")).toContain("postgresql://external/db");
  });

  it("acquires @cedarjs/pg and writes app env", async () => {
    acquireIfNeeded.mockResolvedValue({
      status: "acquired",
      databaseUrl: "postgresql://cpg_role@127.0.0.1:25432/cpg_repo_main_dev_abcd1234",
      databaseName: "cpg_repo_main_dev_abcd1234",
      dispose: vi.fn(),
    });
    const appEnvPath = join(dir, ".env");

    await prepareDevDatabase({ appEnvPath, root: dir });

    expect(acquireIfNeeded).toHaveBeenCalledWith({
      root: dir,
      mode: "dev",
      url: undefined,
      setEnv: true,
    });
    expect(readFileSync(appEnvPath, "utf8")).toContain("cpg_repo_main_dev_abcd1234");
  });
});
