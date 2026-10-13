import { defineConfig } from "vite-plus";
export default defineConfig({
  test: { include: ["src/**/*.test.ts"] },
  pack: { entry: ["src/index.ts"], dts: true },
  run: { tasks: { build: { command: "vp pack" }, test: { command: "vp test" } } },
});
