// Mock of the test-apps/graphql API (GraphQL + dbAuth getToken) for e2e runs without a database.
// Logs every GraphQL request with its origin so tests can assert on SSR vs browser fetches.
import { createServer, type IncomingMessage } from "node:http";

import { decryptSession, parseCookieHeader } from "../../../../packages/dbauth/src/cookie.ts";

export type GraphqlCall = { readonly operationName: string; readonly fromBrowser: boolean };

const createdAt = "2022-01-17T13:57:51.607Z";
const author = { __typename: "User", email: "ada@example.com", fullName: "Ada Lovelace" };
const posts = [
  { __typename: "Post", id: 1, title: "First post", body: "Hello", authorId: 1, createdAt, author },
  {
    __typename: "Post",
    id: 2,
    title: "Second post",
    body: "World",
    authorId: 1,
    createdAt,
    author,
  },
];

const responses: Record<string, (variables: Record<string, unknown>) => unknown> = {
  BlogPostsQuery: () => ({ blogPosts: posts }),
  FindBlogPostQuery: ({ id }) => ({ blogPost: posts.find((post) => post.id === id) ?? null }),
  FindWaterfallBlogPostQuery: ({ id }) => ({
    waterfallBlogPost: posts.find((post) => post.id === id) ?? null,
  }),
  FindAuthorQuery: () => ({ author }),
  FindPosts: () => ({ posts }),
  FindPostById: ({ id }) => ({ post: posts.find((post) => post.id === id) ?? null }),
  FindContacts: () => ({ contacts: [] }),
};

const readBody = (request: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let body = "";
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => resolve(body));
  });

export const startMockApi = ({
  port,
  secret,
  cookieName,
}: {
  readonly port: number;
  readonly secret: string;
  readonly cookieName: string;
}) => {
  const calls: GraphqlCall[] = [];

  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("access-control-allow-credentials", "true");
      response.setHeader("access-control-allow-headers", "content-type");
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");
    const session = decryptSession(
      parseCookieHeader(request.headers.cookie ?? null, cookieName) ?? "",
      secret,
    );

    if (url.pathname === "/auth") {
      if (url.searchParams.get("method") === "getToken" && session) {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ id: session.id, email: "ada@example.com", roles: "admin" }));
      } else {
        response.writeHead(401).end();
      }
      return;
    }

    const { operationName, variables = {} } = JSON.parse(await readBody(request)) as {
      operationName: string;
      variables?: Record<string, unknown>;
    };
    // Browsers send Origin on cross-origin fetches; the Worker's server-side fetch does not.
    calls.push({ operationName, fromBrowser: Boolean(origin) });

    const resolve = responses[operationName];
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify(
        resolve
          ? { data: resolve(variables) }
          : { data: null, errors: [{ message: `mock: no response for ${operationName}` }] },
      ),
    );
  });

  return new Promise<{ calls: GraphqlCall[]; close: () => Promise<void> }>((resolve) => {
    server.listen(port, () =>
      resolve({
        calls,
        close: () => new Promise((done) => server.close(() => done())),
      }),
    );
  });
};
