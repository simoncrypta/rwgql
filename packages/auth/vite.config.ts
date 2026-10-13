import { createRequire } from "node:module";
import { defineConfig } from "vite-plus";

export default defineConfig({
  // Yoga uses Node's GraphQL constructor; share it when testing error masking.
  resolve: { alias: { graphql: createRequire(import.meta.url).resolve("graphql") } },
  pack: {
    dts: true,
    entry: ["src/index.ts", "src/graphql.ts"],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
