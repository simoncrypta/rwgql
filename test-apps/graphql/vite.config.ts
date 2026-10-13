import { defineConfig } from "vite-plus";

import { fetchDevServer } from "./fetchDevServer.ts";

const isTest = Boolean(process.env.VITEST);

const graphqlPackageBuilds = [
  "@rwgql/auth#build",
  "@rwgql/dbauth#build",
  "@rwgql/graphql-typegen#build",
  "@rwgql/log-formatter#build",
] as const;

export default defineConfig({
  server: {
    // App fetch handler owns credentialed CORS (WEB_ORIGIN).
    cors: false,
  },
  plugins: isTest ? [] : [fetchDevServer({ entry: "/src/app.ts" })],
  test: {
    environment: "node",
    // Keep module state across files so `@cedarjs/pg` cloneWorkerDatabase()
    // (process-once TEMPLATE clone) is not re-run under a fresh isolate.
    isolate: false,
    fileParallelism: false,
    // Unique group: fileParallelism:false changes maxWorkers vs other projects.
    sequence: { groupOrder: 20 },
    globalSetup: ["testUtils/globalSetup.ts"],
    include: ["src/**/*.test.ts"],
    setupFiles: ["testUtils/cedarWorker.ts", "testUtils/setup.ts"],
  },
  fmt: {
    ignorePatterns: ["dist/**", "schema.graphql", "src/**/*.gen.ts", "types/graphql.d.ts"],
  },
  lint: {
    ignorePatterns: ["dist/**", "schema.graphql", "src/**/*.gen.ts", "types/graphql.d.ts"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  pack: {
    dts: false,
    entry: ["src/server.ts"],
  },
  run: {
    tasks: {
      build: {
        command: "vp pack",
        dependsOn: [...graphqlPackageBuilds, "codegen", "db#generate"],
      },
      check: {
        command: "vp check",
        dependsOn: [...graphqlPackageBuilds, "codegen"],
      },
      server: {
        command: "vp dev --port 8911",
        dependsOn: [...graphqlPackageBuilds, "regenerate-registry"],
        cache: false,
      },
      "codegen-watch": {
        command: "graphql-codegen --config codegen.ts --watch",
        dependsOn: ["export-schema", ...graphqlPackageBuilds],
        cache: false,
      },
      // Vite API server. Run `vp run graphql#codegen-watch` separately for watch mode;
      // root `dev` already one-shots codegen before start.
      // Do NOT `vp run --parallel server codegen-watch` — extra tokens become
      // args to `vp dev` and break the fetch middleware.
      dev: {
        command: "vp run server",
        dependsOn: [...graphqlPackageBuilds, "regenerate-registry"],
        cache: false,
      },
      codegen: {
        command: "graphql-codegen --config codegen.ts",
        dependsOn: ["export-schema", ...graphqlPackageBuilds],
        input: [
          "codegen.ts",
          "schema.graphql",
          { pattern: "test-apps/rwsdk/web/src/components/**/*.{ts,tsx}", base: "workspace" },
          { pattern: "test-apps/rwsdk/web/src/pages/**/*.{ts,tsx}", base: "workspace" },
          { pattern: "test-apps/cedar/web/src/components/**/*.{ts,tsx}", base: "workspace" },
          { pattern: "test-apps/cedar/web/src/pages/**/*.{ts,tsx}", base: "workspace" },
          { pattern: "packages/graphql-typegen/src/**/*.ts", base: "workspace" },
        ],
        output: [
          { pattern: "test-apps/rwsdk/web/src/gql/**", base: "workspace" },
          { pattern: "test-apps/cedar/web/src/gql/**", base: "workspace" },
          "types/graphql.d.ts",
        ],
      },
      "export-schema": {
        command: "tsx scripts/export-schema.ts",
        dependsOn: ["regenerate-registry", ...graphqlPackageBuilds],
        input: [
          "scripts/export-schema.ts",
          "src/graphql/**/*.ts",
          "src/directives/**/*.ts",
          "src/**/*.gen.ts",
        ],
        output: ["schema.graphql"],
      },
      "regenerate-registry": {
        // Gen files are in fmt.ignorePatterns; `vp fmt` on them fails even when named.
        command: "tsx scripts/regenerate-registry.ts",
        dependsOn: [...graphqlPackageBuilds],
        input: [
          "scripts/regenerate-registry.ts",
          "src/graphql/**/*.ts",
          "src/directives/**/*.ts",
          "src/services/**/*.ts",
        ],
        output: ["src/typeDefs.gen.ts", "src/services.gen.ts", "src/getSchema.gen.ts"],
      },
    },
  },
});
