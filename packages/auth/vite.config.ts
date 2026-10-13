import { defineConfig } from "vite-plus";

export default defineConfig({
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
