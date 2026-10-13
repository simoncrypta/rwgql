import { describe, expect, it } from "vite-plus/test";
import { fetch } from "./app.js";

describe("API Fetch handler", () => {
  it("serves Cedar's Fetch and legacy functions", async () => {
    const hello = await fetch(new Request("http://localhost/hello?email=valid@example.com"));
    expect(await hello.json()).toMatchObject({ data: "hello from cedar", valid: true });
    const legacy = await fetch(new Request("http://localhost/legacyHello"));
    expect(await legacy.json()).toEqual({ data: "hello from legacy handler" });
  });
  it("protects contact queries before accessing the database", async () => {
    const response = await fetch(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "{ contacts { id } }" }),
      }),
    );
    const result = await response.json();
    expect(result.errors[0].extensions.code).toBe("UNAUTHENTICATED");
  });
  it("allows credentialed CORS only for the configured web origin", async () => {
    for (const origin of ["http://localhost:8920", "https://untrusted.example"]) {
      const response = await fetch(
        new Request("http://localhost/graphql", { method: "OPTIONS", headers: { origin } }),
      );
      expect(response.status).toBe(204);
      expect(response.headers.get("access-control-allow-origin")).toBe(
        origin === "http://localhost:8920" ? origin : null,
      );
      expect(response.headers.get("vary")).toContain("Origin");
    }
  });
});
