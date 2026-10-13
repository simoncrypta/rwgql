// Spike-only mock GraphQL endpoint. Logs every request so we can count
// server (SSR/loader) vs browser fetches.
import { createServer } from "node:http";

let n = 0;
createServer((req, res) => {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, x-spike-origin");
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    n += 1;
    const origin = req.headers["x-spike-origin"] ?? "unknown";
    const cookieSeen = /spike_session=/.test(req.headers.cookie ?? "");
    const op = (() => {
      try {
        return JSON.parse(body).operationName;
      } catch {
        return "?";
      }
    })();
    console.log(`[mock-graphql] #${n} op=${op} origin=${origin} cookieSeen=${cookieSeen}`);
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ data: { greeting: `Hello from GraphQL (request #${n})`, cookieSeen } }));
  });
}).listen(8999, () => console.log("[mock-graphql] listening on :8999"));
