import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: [
      "src/index.ts",
      "src/server.ts",
      "src/vite.ts",
      "src/codegen/index.ts",
      "src/tasks.ts",
      "src/cli/generate-routes.ts",
    ],
    dts: true,
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/test/setup.ts"],
  },
  lint: {
    // Verbatim third-party fixtures stay byte-for-byte as upstream.
    ignorePatterns: ["src/**/__fixtures__/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    ignorePatterns: ["src/**/__fixtures__/**"],
  },
});
