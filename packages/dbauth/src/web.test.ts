import { describe, expect, it, vi } from "vite-plus/test";

import { createDbAuthClient } from "./web.js";

const clientAnswering = (body: unknown) =>
  createDbAuthClient({
    authUrl: "http://api.test/auth",
    fetch: vi.fn(async () => Response.json(body)),
  });

describe("createDbAuthClient", () => {
  it("returns the user from getToken and getUserMetadata", async () => {
    const client = clientAnswering({ email: "ada@example.com", id: 1 });

    expect(await client.getUserMetadata()).toEqual({ email: "ada@example.com", id: 1 });
    expect(await client.getToken()).toBe('{"email":"ada@example.com","id":1}');
  });

  it("treats a null getToken payload as logged out", async () => {
    const client = clientAnswering(null);

    expect(await client.getUserMetadata()).toBeNull();
    expect(await client.getToken()).toBeNull();
  });
});
