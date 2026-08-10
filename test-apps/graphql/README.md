# GraphQL

GraphQL Yoga on `node:http` — SDL, services, directives, and dbAuth. The HTTP surface is a Web
`fetch` handler (`src/app.ts`); Vite+ and production both adapt that handler.

## Day to day

From the repo root, `vp run dev` starts this app on port **8911** (Vite+ + `fetchDevServer`) alongside the web app.

Useful tasks:

```bash
vp run graphql#dev           # Vite TUI (cedar-pg `d` / `p` shortcuts)
vp run graphql#codegen       # one-shot schema export + codegen
vp run graphql#codegen-watch # optional continuous codegen
vp run graphql#build         # pack Node server → dist/server.mjs
```

## Layout

| Path                | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `src/app.ts`        | `fetch` handler (`/graphql`, `/auth`, CORS) |
| `src/nodeHttp.ts`   | IncomingMessage ↔ Request / Response bridge |
| `src/server.ts`     | Production `node:http` entry                |
| `src/graphql.ts`    | Yoga factory                                |
| `fetchDevServer.ts` | Vite middleware for `vp dev` + cedar-pg     |
| `vite.config.ts`    | Vite+ tasks, fetchDevServer, cedar-pg       |
