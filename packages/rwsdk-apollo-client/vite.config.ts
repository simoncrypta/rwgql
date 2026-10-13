import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/client.ts", "src/rsc.ts", "src/server.ts", "src/worker.ts"],
    dts: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
