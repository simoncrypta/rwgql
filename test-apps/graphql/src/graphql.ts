import type { DocumentNode } from "graphql";
import { createYoga, type Plugin } from "graphql-yoga";
import { createAuthDecoder } from "@rwgql/dbauth/server";
import { createAuthYogaPlugin } from "@rwgql/auth/graphql";

import { dbAuthOptions } from "./auth/dbAuthConfig.ts";
import { cookieName, getCurrentUser } from "./auth/auth.ts";
import { getSchema } from "./getSchema.gen.ts";

export type YogaContext = {
  readonly currentUser: Awaited<ReturnType<typeof getCurrentUser>>;
  readonly request: Request;
};

const authDecoder = createAuthDecoder({ cookieName, secret: dbAuthOptions.secret });

const getOperationName = (
  document: DocumentNode | undefined,
  fallback: string | null | undefined,
): string | undefined => {
  if (fallback) {
    return fallback;
  }

  const operation = document?.definitions.find((def) => def.kind === "OperationDefinition");
  return operation && "name" in operation ? operation.name?.value : undefined;
};

// Emits one lean log per GraphQL operation: the operation/resolver name plus
// its execution time, e.g. `ListPosts 12.4ms`.
const createOperationLoggerPlugin = (): Plugin<YogaContext> => ({
  onExecute({ args }) {
    const start = performance.now();

    return {
      onExecuteDone() {
        const responseTime = performance.now() - start;
        const operationName = getOperationName(args.document, args.operationName);
        const label = operationName ?? "anonymous operation";
        console.info(`${label} ${responseTime.toFixed(1)}ms`);
      },
    };
  },
});

export const createGraphqlYoga = () =>
  createYoga<YogaContext>({
    context: ({ request }) => ({
      currentUser: null,
      request,
    }),
    fetchAPI: {
      fetch,
      Request,
      Response,
      ReadableStream,
    },
    graphqlEndpoint: "/graphql",
    landingPage: true,
    logging: {
      debug: (...args) => args.forEach((arg) => console.debug(arg)),
      error: (...args) => args.forEach((arg) => console.error(arg)),
      info: (...args) => args.forEach((arg) => console.info(arg)),
      warn: (...args) => args.forEach((arg) => console.warn(arg)),
    },
    plugins: [
      createOperationLoggerPlugin(),
      createAuthYogaPlugin({
        decodeSession: (request) => {
          if (!(request instanceof Request)) {
            throw new Error("Expected a Web Request for auth decode");
          }
          return authDecoder(request);
        },
        getCurrentUser: (session) => getCurrentUser(session as { id: number }),
      }),
    ],
    schema: getSchema(),
  });
