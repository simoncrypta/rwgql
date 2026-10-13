import { createYoga, type Plugin } from "graphql-yoga";
import { createAuthYogaPlugin } from "@rwgql/auth/graphql";
import { createAuthDecoder } from "@rwgql/dbauth/server";
import { cookieName, getCurrentUser } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import { dbAuthOptions } from "./auth.js";
import { getSchema } from "../getSchema.gen.js";
export type YogaContext = {
  request: Request;
  currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
};
const decodeSession = createAuthDecoder({ cookieName, secret: dbAuthOptions.secret });
const operationLogger: Plugin = {
  onExecute({ args }) {
    const start = performance.now();
    return {
      onExecuteDone() {
        logger.info({
          operationName: args.operationName ?? "GraphQL",
          responseTime: performance.now() - start,
        });
      },
    };
  },
};
export const yoga = createYoga({
  graphqlEndpoint: "/graphql",
  schema: getSchema(),
  plugins: [
    operationLogger,
    createAuthYogaPlugin({
      decodeSession,
      getCurrentUser: (session) => getCurrentUser(session as { id: string | number }),
    }),
  ],
});
