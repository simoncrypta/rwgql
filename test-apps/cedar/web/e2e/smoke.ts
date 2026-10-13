// End-to-end smoke test for the Cedar-shaped app on React Router (workerd via `vp preview`).
// Usage (from test-apps/cedar/web, after generate-routes): pnpm exec tsx e2e/smoke.ts
// Builds, starts a mock API on :8911 and the production build on :8920, then checks SSR, caching,
// auth redirects, typed params, 404s, hydration without refetch, and client navigation.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { setTimeout as sleep } from "node:timers/promises";

import { createSessionPayload, encryptSession } from "../../../../packages/dbauth/src/cookie.ts";
import { startMockApi } from "./mockApi.ts";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright") as typeof import("playwright");

const base = "http://localhost:8920";
const secret = "e2e-only-dbauth-secret";
const cookieName = "session_8911";
const sessionCookie = `${cookieName}=${encryptSession(createSessionPayload(1, 3600), secret)}`;
const publicCache = "public, max-age=60, stale-while-revalidate=300";

const failures: string[] = [];
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(label);
};

// The Worker reads DB_AUTH_SECRET from .dev.vars (gitignored). The Cloudflare plugin copies it
// into the build output at build time, so build after writing it. The original file is restored
// at the end so `vp dev` keeps using the same secret as the real API.
const previousDevVars = existsSync(".dev.vars") ? readFileSync(".dev.vars", "utf8") : undefined;
const restoreDevVars = () =>
  previousDevVars === undefined
    ? rmSync(".dev.vars", { force: true })
    : writeFileSync(".dev.vars", previousDevVars);
writeFileSync(".dev.vars", `DB_AUTH_SECRET=${secret}\n`);
// Production builds only allow the API origins named here in CSP connect-src.
execFileSync("pnpm", ["exec", "vp", "build"], {
  env: {
    ...process.env,
    VITE_AUTH_URL: "http://localhost:8911/auth",
    VITE_GRAPHQL_URL: "http://localhost:8911/graphql",
  },
  stdio: "ignore",
});

const api = await startMockApi({ port: 8911, secret, cookieName });
const preview = spawn("pnpm", ["exec", "vp", "preview", "--port", "8920", "--strictPort"], {
  // Own process group so workerd children are stopped too.
  detached: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let previewLog = "";
preview.stdout.on("data", (chunk) => (previewLog += chunk));
preview.stderr.on("data", (chunk) => (previewLog += chunk));

const get = (path: string, cookie?: string) =>
  fetch(`${base}${path}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });

try {
  for (let attempt = 0; ; attempt += 1) {
    try {
      if ((await get("/about")).status === 200) break;
    } catch {
      // workerd not up yet
    }
    if (attempt > 60) throw new Error(`preview did not start:\n${previewLog}`);
    await sleep(500);
  }
  api.calls.length = 0;

  // --- HTTP ---------------------------------------------------------------------------------
  const home = await get("/");
  const homeHtml = await home.text();
  check("GET / → 200", home.status === 200, String(home.status));
  check("GET / is edge-cacheable", home.headers.get("cache-control") === publicCache);
  check("GET / SSR includes loader-preloaded posts", homeHtml.includes("First post"));
  const nonce = /'nonce-([a-f0-9]+)'/.exec(home.headers.get("content-security-policy") ?? "")?.[1];
  check("CSP nonce is applied to scripts", Boolean(nonce) && homeHtml.includes(`nonce="${nonce}"`));
  check("security headers are set", home.headers.get("x-content-type-options") === "nosniff");

  check("GET /about cached", (await get("/about")).headers.get("cache-control") === publicCache);
  check(
    "GET /contact opts out of cache",
    (await get("/contact")).headers.get("cache-control") !== publicCache,
  );

  const blogPost = await get("/blog-post/2");
  check(
    "GET /blog-post/2 SSR (typed Int param → loader)",
    (await blogPost.text()).includes("Second post"),
  );

  const anonymous = await get("/posts");
  check(
    "GET /posts anonymous → 302 /login?redirectTo=%2Fposts",
    anonymous.status === 302 && anonymous.headers.get("location") === "/login?redirectTo=%2Fposts",
    `${anonymous.status} ${anonymous.headers.get("location")}`,
  );
  const authed = await get("/posts", sessionCookie);
  check("GET /posts with session → 200", authed.status === 200, String(authed.status));
  check("private route has no public cache", authed.headers.get("cache-control") !== publicCache);

  const badParam = await get("/posts/abc", sessionCookie);
  check(
    "GET /posts/abc (Int param mismatch) → 404",
    badParam.status === 404,
    String(badParam.status),
  );

  const missing = await get("/no-such-page");
  const missingHtml = await missing.text();
  check("unknown path → 404", missing.status === 404, String(missing.status));
  check(
    "notfound renders NotFoundPage inside BlogLayout",
    missingHtml.includes("Redwood Blog") && /not found/i.test(missingHtml),
  );

  // --- Browser ------------------------------------------------------------------------------
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];
  const watch = (page: import("playwright").Page) => {
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
  };

  const anon = await browser.newPage();
  watch(anon);
  api.calls.length = 0;
  await anon.goto(`${base}/`, { waitUntil: "networkidle" });
  await anon.evaluate(() => ((window as { marker?: boolean }).marker = true));
  check(
    "hydration does not refetch BlogPostsQuery in the browser",
    !api.calls.some((call) => call.fromBrowser && call.operationName === "BlogPostsQuery"),
    JSON.stringify(api.calls),
  );

  await anon.getByRole("link", { name: "About" }).click();
  await anon.waitForURL(`${base}/about`);
  check(
    "NavLink click is a client-side navigation",
    await anon.evaluate(() => (window as { marker?: boolean }).marker === true),
  );
  check(
    "NavLink marks the active route",
    (await anon.getByRole("link", { name: "About" }).getAttribute("class"))?.includes(
      "underline",
    ) ?? false,
  );

  await anon.getByRole("link", { name: "Admin" }).click();
  await anon.waitForURL(/\/login\?redirectTo=%2Fposts$/);
  check("client nav to a private route redirects to login", true);

  const authedContext = await browser.newContext();
  await authedContext.addCookies([
    { name: cookieName, value: sessionCookie.split("=")[1]!, url: base },
    { name: cookieName, value: sessionCookie.split("=")[1]!, url: "http://localhost:8911" },
  ]);
  const user = await authedContext.newPage();
  watch(user);
  await user.goto(`${base}/posts`, { waitUntil: "networkidle" });
  const cellRendered = await user
    .getByText("Second post")
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  check("PostsCell renders posts (Cell via useQuery)", cellRendered, consoleErrors.join("\n"));
  if (!cellRendered) throw new Error("PostsCell did not render");

  await user.locator(`a[title="Show post 2 detail"]`).click();
  await user.waitForURL(`${base}/posts/2`);
  await user.getByText("World").waitFor();
  check("routes.post({ id }) link → PostCell with typed id", true);

  await user.goBack();
  await user.waitForURL(`${base}/posts`);
  check("back() returns to the list", true);

  // dbAuth's getToken answers 401 for anonymous visitors (same as the real API), which browsers
  // log as a failed resource load. Tolerate exactly that; anything else fails the run.
  const anonymousAuthProbe = "Failed to load resource: the server responded with a status of 401";
  const unexpected = consoleErrors.filter((message) => !message.startsWith(anonymousAuthProbe));
  console.log(`info: ${consoleErrors.length - unexpected.length} anonymous getToken 401(s) logged`);
  check("no unexpected browser console errors", unexpected.length === 0, unexpected.join("\n"));
  await browser.close();
} catch (error) {
  console.error(`\npreview log:\n${previewLog.slice(-3000)}`);
  throw error;
} finally {
  restoreDevVars();
  process.kill(-preview.pid!, "SIGTERM");
  await api.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed`);
  process.exit(1);
}
console.log("\nAll e2e checks passed");
