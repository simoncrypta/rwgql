// @vitest-environment node
import { createYoga, createSchema } from "graphql-yoga";
import { expect, it } from "vite-plus/test";
import { AuthenticationError, ForbiddenError } from "./errors.js";

it.each([
  [AuthenticationError, "UNAUTHENTICATED"],
  [ForbiddenError, "FORBIDDEN"],
] as const)(
  "keeps expected auth errors visible through Yoga masking (%s)",
  async (ErrorType, code) => {
    const yoga = createYoga({
      schema: createSchema({
        typeDefs: "type Query { private: String }",
        resolvers: {
          Query: {
            private: () => {
              throw new ErrorType();
            },
          },
        },
      }),
    });
    const response = await yoga.fetch(
      new Request("http://localhost/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "{ private }" }),
      }),
    );
    expect((await response.json()).errors[0].extensions.code).toBe(code);
  },
);
