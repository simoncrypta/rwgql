import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    dts: true,
    entry: ["src/index.ts"],
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
