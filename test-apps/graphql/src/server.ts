import { createServer } from "node:http";

import { fetch } from "./app.ts";
import { sendWebResponse, toWebRequest } from "./nodeHttp.ts";

const port = Number(process.env.PORT ?? process.env.GRAPHQL_PORT ?? 8911);

createServer((req, res) => {
  void (async () => {
    try {
      const response = await fetch(toWebRequest(req));
      await sendWebResponse(res, response);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        res.statusCode = 500;
      }
      res.end();
    }
  })();
}).listen(port, () => {
  console.info(`GraphQL listening on http://localhost:${port}/graphql`);
});
