import type { Connect, Plugin } from "vite";

import { sendWebResponse, toWebRequest } from "./src/nodeHttp.ts";

export type FetchDevServerOptions = {
  /** App module that default-exports `{ fetch }` or named-exports `fetch`. */
  entry: string;
};

function shouldHandle(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  const pathname = url.split("?", 1)[0] ?? "";
  return pathname === "/graphql" || pathname.startsWith("/graphql/") || pathname === "/auth";
}

/**
 * Vite middleware that serves a Web-standard `fetch` handler (Yoga / dbAuth).
 * Registered in `configureServer` (not the post-hook) so API routes run before
 * Vite's HTML/404 fallback.
 */
export function fetchDevServer(options: FetchDevServerOptions): Plugin {
  return {
    name: "fetch-dev-server",
    enforce: "pre",
    configureServer(server) {
      const handler: Connect.NextHandleFunction = (req, res, next) => {
        if (!shouldHandle(req.url)) {
          next();
          return;
        }

        void (async () => {
          try {
            const mod = (await server.ssrLoadModule(options.entry)) as {
              default?: { fetch?: (request: Request) => Promise<Response> };
              fetch?: (request: Request) => Promise<Response>;
            };
            const fetchHandler = mod.fetch ?? mod.default?.fetch;
            if (!fetchHandler) {
              throw new Error(
                `fetchDevServer: ${options.entry} must export fetch or default.fetch`,
              );
            }

            const response = await fetchHandler(toWebRequest(req));
            await sendWebResponse(res, response);
          } catch (error) {
            console.error("[fetch-dev-server]", error);
            next(error);
          }
        })();
      };

      server.middlewares.use(handler);
    },
  };
}
