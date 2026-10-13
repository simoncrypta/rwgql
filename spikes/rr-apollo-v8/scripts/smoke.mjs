// Spike-only browser smoke test. Usage: node scripts/smoke.mjs <baseUrl>
import { createRequire } from "node:module";
const require = createRequire(new URL("../../../test-apps/rwsdk/web/package.json", import.meta.url));
const { chromium } = require("playwright");

const base = process.argv[2] ?? "http://localhost:5199";
const browser = await chromium.launch();
const context = await browser.newContext();
await context.addCookies([{ name: "spike_session", value: "test", url: base }]);
const page = await context.newPage();
const graphqlFromBrowser = [];
const dataRequests = [];
const consoleIssues = [];
page.on("request", (r) => {
  if (r.url().includes(":8999")) graphqlFromBrowser.push(`${r.method()} ${r.url()}`);
  if (r.url().includes(".data")) dataRequests.push(r.url());
});
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) consoleIssues.push(`${m.type()}: ${m.text()}`);
});
page.on("pageerror", (e) => consoleIssues.push(`pageerror: ${e.message}`));

await page.goto(base + "/", { waitUntil: "networkidle" });
const hydrated = await page.evaluate(() => Boolean(window.__reactRouterRouteModules));
const ssrGreeting = await page.textContent("[data-testid=greeting]");
console.log("after load: hydrated =", hydrated, "| greeting =", ssrGreeting);
console.log("graphql requests from browser after hydration:", graphqlFromBrowser.length);

// Client-side navigation away and back: loader should run on the server via .data
await page.click("text=About");
await page.waitForSelector("h1:text('About')");
await page.click("text=Home");
await page.waitForSelector("[data-testid=greeting]");
await page.waitForLoadState("networkidle");
console.log("after client nav back: greeting =", await page.textContent("[data-testid=greeting]"));
console.log("single-fetch .data requests:", dataRequests);
console.log("graphql requests from browser total:", graphqlFromBrowser.length, graphqlFromBrowser);
console.log("console errors/warnings:", consoleIssues.length ? consoleIssues : "none");
await browser.close();
