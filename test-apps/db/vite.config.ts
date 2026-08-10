import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: [".cedarpg/**", ".cedar-pg/**"],
  },
  lint: {
    ignorePatterns: [".cedarpg/**", ".cedar-pg/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    environment: "node",
    include: ["*.test.ts"],
    // Unique from graphql (cedar TEMPLATE + fileParallelism: false) so Vitest can schedule both projects.
    sequence: { groupOrder: 10 },
  },
  run: {
    tasks: {
      prepare: {
        command: "tsx scripts/prepare-dev.ts",
        cache: false,
      },
      generate: {
        command: "prisma generate",
        input: ["prisma/schema.prisma"],
      },
      "migrate-deploy": {
        command: "prisma migrate deploy",
        dependsOn: ["prepare"],
        cache: false,
      },
    },
  },
});
