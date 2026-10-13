// Real GraphQL API (:8911) + Postgres (@cedarjs/pg) + `vp dev` (:8920).
// Usage: `vp run seed` from the repo root, then vp run e2e:fullstack (from test-apps/cedar/web).
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright") as typeof import("playwright");

const web = "http://localhost:8920";
const repoRoot = path.resolve(import.meta.dirname, "../../../..");

const failures: string[] = [];
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(label);
};

const start = (command: string[], cwd: string) => {
  let log = "";
  const child = spawn(command[0]!, command.slice(1), {
    cwd,
    detached: true, // own process group so dev-server children stop too
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => (log += chunk));
  child.stderr?.on("data", (chunk) => (log += chunk));
  return { child, log: () => log };
};

const waitFor = async (url: string, label: string, logs: () => string) => {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET", redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  throw new Error(`${label} did not start:\n${logs().slice(-3000)}`);
};

// Interacting before React hydrates submits forms natively (full-page GET).
const hydrated = (page: import("playwright").Page) =>
  page
    .waitForFunction(() => "__reactRouterRouteModules" in window)
    .then(() => page.waitForLoadState("networkidle"));

const stop = (child: ChildProcess) => {
  try {
    process.kill(-child.pid!, "SIGTERM");
  } catch {
    // already gone
  }
};

// The Worker and the API must decode dbAuth cookies with the same secret.
const workerSecret = existsSync(".dev.vars")
  ? /^DB_AUTH_SECRET=(.*)$/m.exec(readFileSync(".dev.vars", "utf8"))?.[1]
  : undefined;
if (workerSecret !== process.env.DB_AUTH_SECRET) {
  throw new Error(
    "DB_AUTH_SECRET in .dev.vars must match the API's (unset in both for local dev); remove .dev.vars or export the same value",
  );
}

const api = start(["pnpm", "exec", "vp", "run", "graphql#dev"], repoRoot);
let app: ReturnType<typeof start> | undefined;

try {
  // graphql#dev rebuilds the workspace packages (vp pack clears dist/), so start the web dev
  // server only once the API is up.
  await waitFor("http://localhost:8911/graphql?query=%7B__typename%7D", "GraphQL API", api.log);
  app = start(["pnpm", "exec", "vp", "dev", "--port", "8920", "--strictPort"], process.cwd());
  await waitFor(`${web}/about`, "web dev server", app.log);

  const home = await fetch(`${web}/`);
  check(
    "GET / SSR renders seeded posts from Postgres",
    (await home.text()).includes("Migrating Redwood Cells"),
  );

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("dialog", (dialog) => void dialog.accept());

  await page.goto(`${web}/posts`);
  await page.waitForURL(/\/login\?redirectTo=%2Fposts$/);
  check("anonymous /posts redirects to login", true);
  await hydrated(page);

  await page.locator('input[name="username"]').fill("ada@example.com");
  await page.locator('input[name="password"]').fill("password");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(`${web}/posts`);
  check("login (dbAuth) returns to redirectTo", true);
  await page.getByText("Migrating Redwood Cells").waitFor();
  check("PostsCell lists posts from the real API", true);

  const title = `E2E post ${Date.now()}`;
  await page.getByRole("link", { name: "New Post" }).click();
  await page.waitForURL(`${web}/posts/new`);
  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="body"]').fill("Written by the full-stack e2e");
  await page.locator('input[name="authorId"]').fill("1");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(`${web}/posts`);
  await page.getByText(title).waitFor();
  check("create post → navigate(routes.posts()) → listed", true);

  const row = page.locator("tr", { hasText: title });
  await row.locator('a[title^="Edit post"]').click();
  await page.waitForURL(/\/posts\/\d+\/edit$/);
  check("edit link uses typed routes.editPost({ id })", true);
  await page.locator('input[name="title"]').fill(`${title} (edited)`);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(`${web}/posts`);
  await page.getByText(`${title} (edited)`).waitFor();
  check("update post", true);

  await page
    .locator("tr", { hasText: `${title} (edited)` })
    .locator('button[title^="Delete post"]')
    .click();
  await page.getByText(`${title} (edited)`).waitFor({ state: "detached" });
  check("delete post", true);

  await page.goto(`${web}/contacts`);
  await page.getByRole("heading", { name: "Contacts" }).waitFor();
  check("private contacts page renders when logged in", page.url() === `${web}/contacts`);

  await page.goto(`${web}/`);
  await page.getByRole("link", { name: "Log Out" }).click();
  await page.getByRole("link", { name: "Log In" }).waitFor();
  await page.goto(`${web}/posts`);
  await page.waitForURL(/\/login\?redirectTo=%2Fposts$/);
  check("logout clears the session (private route redirects again)", true);

  const signupPage = await browser.newPage();
  const authResponses: string[] = [];
  signupPage.on("response", (response) => {
    if (response.url().includes("/auth?method=")) {
      authResponses.push(`${response.request().method()} ${response.url()} → ${response.status()}`);
    }
  });
  await signupPage.goto(`${web}/signup`);
  await hydrated(signupPage);
  await signupPage.locator('input[name="username"]').fill(`e2e-${Date.now()}@example.com`);
  await signupPage.locator('input[name="password"]').fill("Correct-Horse-42"); // API policy: 12+ chars, 3 character classes
  await signupPage.locator('input[name="full-name"]').fill("E2E User");
  await signupPage.getByRole("button", { name: "Sign Up" }).click();
  try {
    await signupPage.waitForURL(`${web}/`, { timeout: 15_000 });
    await signupPage.getByRole("link", { name: "Log Out" }).waitFor();
  } catch (error) {
    console.error(`signup page at ${signupPage.url()}:\n${authResponses.join("\n")}`);
    console.error((await signupPage.locator("body").innerText()).slice(0, 800));
    throw error;
  }
  check("signup logs the new user in and goes home", true);

  const anonymousProbe = "Failed to load resource: the server responded with a status of 401";
  const unexpected = consoleErrors.filter((message) => !message.startsWith(anonymousProbe));
  check("no unexpected browser console errors", unexpected.length === 0, unexpected.join("\n"));

  await browser.close();
} catch (error) {
  console.error(`\nAPI log:\n${api.log().slice(-2000)}\n\nweb log:\n${app?.log().slice(-2000)}`);
  throw error;
} finally {
  if (app) stop(app.child);
  stop(api.child);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll full-stack e2e checks passed");
