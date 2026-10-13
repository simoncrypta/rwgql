import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { db } from "../api/src/lib/db.ts";

const appRoot = new URL("../", import.meta.url);
const children: ChildProcess[] = [];
let output = "";
function start(command: string, args: string[], side: string, env: Record<string, string>) {
  const child = spawn(command, args, {
    cwd: fileURLToPath(new URL(side, appRoot)),
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout?.on("data", (chunk) => {
    output += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    output += String(chunk);
  });
  children.push(child);
  return child;
}
async function ready(url: string, child: ChildProcess) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* server starting */
    }
    await delay(100);
  }
  throw new Error(`Server failed to start: ${url}\n${output}`);
}
async function stop(child: ChildProcess) {
  if (!child.pid) return;
  const exited =
    child.exitCode === null && child.signalCode === null ? once(child, "exit") : Promise.resolve();
  const kill = (signal: NodeJS.Signals) => {
    try {
      process.kill(-child.pid!, signal);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
    }
  };
  kill("SIGTERM");
  const timer = setTimeout(() => kill("SIGKILL"), 2000);
  await exited;
  clearTimeout(timer);
}
async function graphql(
  api: string,
  query: string,
  variables: Record<string, unknown> = {},
  cookie = "",
) {
  const response = await fetch(`${api}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify({ query, variables }),
  });
  assert.equal(response.status, 200);
  return await response.json();
}
async function auth(api: string, method: string, body: Record<string, unknown> = {}, cookie = "") {
  return fetch(`${api}/auth?method=${method}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}
async function exercise(web: string, api: string) {
  const page = await fetch(`${web}/about`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /mastery of Cedar/);
  assert.equal((await fetch(`${web}/blog-post/invalid`)).status, 404);
  assert.equal((await fetch(`${web}/does-not-exist`)).status, 404);
  const profile = await fetch(`${web}/profile`, { redirect: "manual" });
  assert.equal(profile.status, 302);
  assert.match(profile.headers.get("location") ?? "", /login\?redirectTo=/);
  assert.equal((await fetch(`${api}/hello?email=valid@example.com`)).status, 200);
  assert.deepEqual(await (await fetch(`${api}/legacyHello`)).json(), {
    data: "hello from legacy handler",
  });
  const publicPosts = await graphql(api, "{ posts { id title author { id fullName } } }");
  assert.ok(publicPosts.data.posts.length > 0);
  const denied = await graphql(api, "{ contacts { id } }");
  assert.equal(denied.errors[0].extensions.code, "UNAUTHENTICATED");
  const login = await auth(api, "login", { username: "admin@example.com", password: "password" });
  assert.equal(login.status, 200);
  const admin = await login.json();
  assert.equal(typeof admin.id, "string");
  const cookie = login.headers.get("set-cookie")!.split(";", 1)[0];
  assert.equal((await fetch(`${web}/profile`, { headers: { cookie } })).status, 200);
  const title = `Smoke ${crypto.randomUUID()}`;
  let postId: number | undefined;
  let contactId: number | undefined;
  const email = `smoke-${crypto.randomUUID()}@example.com`;
  try {
    const created = await graphql(
      api,
      "mutation($input: CreatePostInput!) { createPost(input: $input) { id title } }",
      { input: { title, body: "Original Cedar service", authorId: admin.id } },
      cookie,
    );
    assert.equal(created.data.createPost.title, title);
    postId = created.data.createPost.id;
    const duplicate = await graphql(
      api,
      "mutation($input: CreatePostInput!) { createPost(input: $input) { id } }",
      { input: { title, body: "duplicate", authorId: admin.id } },
      cookie,
    );
    assert.equal(duplicate.errors[0].extensions.code, "BAD_USER_INPUT");
    const changed = await graphql(
      api,
      "mutation($id: Int!, $input: UpdatePostInput!) { updatePost(id: $id, input: $input) { body } }",
      { id: postId, input: { body: "Updated" } },
      cookie,
    );
    assert.equal(changed.data.updatePost.body, "Updated");
    for (const route of ["blog-post", "waterfall", "aggregated-blog-post"])
      assert.equal((await fetch(`${web}/${route}/${postId}`)).status, 200);
    const contact = await graphql(
      api,
      "mutation($input: CreateContactInput!) { createContact(input: $input) { id } }",
      { input: { name: "Smoke", email, message: "Contact form" } },
    );
    contactId = contact.data.createContact.id;
    const contacts = await graphql(api, "{ contacts { id } }", {}, cookie);
    assert.ok(contacts.data.contacts.some((row: { id: number }) => row.id === contactId));
    const invalid = await graphql(
      api,
      "mutation($input: CreateContactInput!) { createContact(input: $input) { id } }",
      { input: { name: "Smoke", email: "invalid", message: "Invalid" } },
    );
    assert.equal(invalid.errors[0].extensions.code, "BAD_USER_INPUT");
    const signup = await auth(api, "signup", {
      username: email,
      password: "CedarSmoke-2026!",
      "full-name": "New Cedar User",
    });
    assert.equal(signup.status, 200);
    const newCookie = signup.headers.get("set-cookie")!.split(";", 1)[0];
    assert.equal((await (await auth(api, "getToken", {}, newCookie)).json()).email, email);
    const newUser = await db.user.findUniqueOrThrow({ where: { email } });
    assert.equal(newUser.fullName, "New Cedar User");
    const forbidden = await graphql(
      api,
      "mutation($id: Int!) { deleteContact(id: $id) { id } }",
      { id: contactId },
      newCookie,
    );
    assert.equal(forbidden.errors[0].extensions.code, "FORBIDDEN");
    await auth(api, "forgotPassword", { username: email });
    const resetUser = await db.user.findUniqueOrThrow({ where: { email } });
    assert.ok(resetUser.resetToken);
    const reset = await auth(api, "resetPassword", {
      resetToken: resetUser.resetToken,
      password: "NewCedarPassword-2026!",
    });
    assert.equal(reset.status, 200);
    assert.equal(
      (
        await (
          await auth(api, "getToken", {}, reset.headers.get("set-cookie")!.split(";", 1)[0])
        ).json()
      ).id,
      newUser.id,
    );
    assert.equal((await auth(api, "logout", {}, newCookie)).status, 200);
  } finally {
    if (postId !== undefined)
      await graphql(
        api,
        "mutation($id: Int!) { deletePost(id: $id) { id } }",
        { id: postId },
        cookie,
      );
    if (contactId !== undefined)
      await graphql(
        api,
        "mutation($id: Int!) { deleteContact(id: $id) { id } }",
        { id: contactId },
        cookie,
      );
    await db.user.deleteMany({ where: { email } });
  }
}
try {
  const combined = "http://localhost:18920";
  const dev = start("vp", ["dev", "--port", "18920"], "web", { LOCAL_TESTING_API: "1" });
  await ready(`${combined}/hello`, dev);
  await exercise(combined, combined);
  // A real source edit proves the API is served by Vite's module graph.
  const greeting = new URL("api/src/lib/greeting.ts", appRoot);
  const original = await readFile(greeting, "utf8");
  try {
    await writeFile(greeting, original.replace("hello from cedar", "hello from hot reload"));
    let reloaded = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      await delay(100);
      const result = await (await fetch(`${combined}/hello`)).json();
      if (result.data === "hello from hot reload") {
        reloaded = true;
        break;
      }
    }
    assert.ok(reloaded, "API source changes should be served without restarting Vite");
  } finally {
    await writeFile(greeting, original);
  }
  await stop(dev);
  console.info("Combined Vite dev: routes, auth, CRUD, UUID sessions and API hot reload passed.");
  const databaseUrl =
    process.env.DATABASE_URL ??
    (await readFile(new URL("api/.env", appRoot), "utf8")).match(/^DATABASE_URL=(.+)$/m)![1];
  const apiUrl = "http://localhost:18921";
  const webUrl = "http://localhost:18922";
  const separateApi = start("vp", ["dev", "--port", "18921"], "api", {});
  const separateWeb = start("vp", ["dev", "--port", "18922"], "web", {
    VITE_API_URL: apiUrl,
    API_URL: apiUrl,
  });
  await ready(`${apiUrl}/hello`, separateApi);
  await ready(`${webUrl}/about`, separateWeb);
  await exercise(webUrl, apiUrl);
  await Promise.all([stop(separateApi), stop(separateWeb)]);
  console.info("Separate Vite dev: web/API routes, auth and CRUD passed.");
  const build = start("vp", ["build"], "web", { VITE_API_URL: apiUrl });
  const [buildCode] = await once(build, "exit");
  assert.equal(buildCode, 0, output);
  const assetDirectory = new URL("web/build/client/assets/", appRoot);
  const assets = await readdir(assetDirectory);
  const scripts = await Promise.all(
    assets
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFile(new URL(name, assetDirectory), "utf8")),
  );
  assert.ok(
    scripts.some((script) => script.includes(apiUrl)),
    "deployed browser bundles must target the separate API",
  );
  assert.ok(
    scripts.every((script) => !script.includes("PrismaClient")),
    "the web build must not contain Prisma",
  );
  const env = {
    NODE_ENV: "production",
    DB_AUTH_SECRET: "local-testing-smoke-secret-for-production",
    DATABASE_URL: databaseUrl,
  };
  const api = start(process.execPath, ["dist/server.mjs"], "api", {
    ...env,
    PORT: "18921",
    WEB_ORIGIN: webUrl,
  });
  // Build-time VITE_API_URL is for the browser; runtime API_URL is for server middleware.
  const web = start("vp", ["exec", "react-router-serve", "build/server/index.js"], "web", {
    ...env,
    PORT: "18922",
    API_URL: apiUrl,
  });
  await ready(`${apiUrl}/hello`, api);
  await ready(`${webUrl}/about`, web);
  await exercise(webUrl, apiUrl);
  console.info("Separate web/API deployments: routes, auth, CRUD and UUID sessions passed.");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  await Promise.all(children.map(stop));
  await db.$disconnect();
}
