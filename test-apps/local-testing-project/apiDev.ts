import { fileURLToPath } from "node:url";
import type { Plugin } from "vite-plus";
import { toWebRequest, sendWebResponse } from "./api/src/nodeHttp.ts";
const entry = fileURLToPath(new URL("./api/src/app.ts", import.meta.url));
const routes = new Set(["/graphql", "/auth", "/hello", "/legacyHello"]);
// Mount the same Fetch handler before React Router. Vite invalidates its modules on source edits.
export function apiDev(): Plugin {
  return {
    name: "local-testing-api",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!routes.has((req.url ?? "").split("?", 1)[0])) {
          next();
          return;
        }
        void (async () => {
          try {
            const app = (await server.ssrLoadModule(entry)) as {
              fetch: (request: Request) => Promise<Response>;
            };
            await sendWebResponse(res, await app.fetch(toWebRequest(req)));
          } catch (error) {
            next(error);
          }
        })();
      });
    },
  };
}
