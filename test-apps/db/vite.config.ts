import { defineConfig } from "vite-plus";
import { createPrismaTasks } from "@rwgql/prisma-dev/tasks";

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
  run: {
    tasks: createPrismaTasks(),
  },
});
