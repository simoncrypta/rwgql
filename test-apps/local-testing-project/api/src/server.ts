import { createServer } from "node:http";
import { fetch } from "./app.js";
import { db } from "./lib/db.js";
import { logger } from "./lib/logger.js";
import { toWebRequest, sendWebResponse } from "./nodeHttp.js";
const server = createServer((req, res) => {
  void fetch(toWebRequest(req))
    .then((response) => sendWebResponse(res, response))
    .catch((error: unknown) => {
      logger.error(error);
      res.statusCode = 500;
      res.end("Internal Server Error");
    });
});
server.listen(Number(process.env.PORT ?? 8921), "0.0.0.0", () =>
  logger.info({ msg: "API listening" }),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    server.close(() => {
      void db.$disconnect();
    });
  });
