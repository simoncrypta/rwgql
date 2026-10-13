import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";
import { apiDev } from "../apiDev.ts";
const builds = [
  "@rwgql/auth#build",
  "@rwgql/dbauth#build",
  "@rwgql/graphql-typegen#build",
  "@rwgql/log-formatter#build",
];
export default defineConfig({
  // Keep GraphQL error constructors identical to Yoga's native Node imports.
  resolve: {
    alias: {
      ...(process.env.VITEST ? { graphql: createRequire(import.meta.url).resolve("graphql") } : {}),
      src: fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: process.env.VITEST ? [] : [apiDev()],
  server: { port: 8921, strictPort: true, cors: false },
  fmt: {
    ignorePatterns: ["db/generated/**", "src/*.gen.ts", "types/graphql.d.ts", "schema.graphql"],
  },
  lint: {
    ignorePatterns: ["db/generated/**", "src/*.gen.ts", "types/graphql.d.ts", "schema.graphql"],
  },
  pack: { entry: ["src/server.ts"], dts: false },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
  run: {
    tasks: {
      prepare: { command: "tsx scripts/prepare.ts", cache: false },
      prisma: { command: "tsx scripts/prisma.ts", cache: false },
      generate: { command: "prisma generate", cache: false },
      "migrate-deploy": { command: "prisma migrate deploy", dependsOn: ["prepare"], cache: false },
      seed: {
        command: "prisma db seed",
        dependsOn: ["migrate-deploy", "generate", "@rwgql/dbauth#build"],
        cache: false,
      },
      "regenerate-registry": {
        command: "tsx scripts/regenerate-registry.ts",
        dependsOn: builds,
        cache: false,
      },
      "export-schema": {
        command: "tsx scripts/export-schema.ts",
        dependsOn: ["regenerate-registry", "generate"],
        cache: false,
      },
      codegen: {
        command: "graphql-codegen --config codegen.ts",
        dependsOn: ["export-schema"],
        cache: false,
      },
      build: { command: "vp pack", dependsOn: [...builds, "generate", "codegen"] },
      dev: { command: "vp dev", dependsOn: ["seed", "codegen"], cache: false },
      test: { command: "vp test", dependsOn: ["generate", "codegen"], cache: false },
    },
  },
});
