import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: {
      tsgo: true,
    },
    // Runtime is TypeScript via package exports + tsx; pack keeps typed artifacts for consumers that need them.
    entry: ["src/index.ts", "src/tasks.ts", "src/prepareDev.ts", "src/testDatabase.ts"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
