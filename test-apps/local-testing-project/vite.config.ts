import { defineConfig } from "vite-plus";
export default defineConfig({
  run: {
    tasks: {
      dev: {
        command: "LOCAL_TESTING_API=1 vp run local-testing-web#dev",
        dependsOn: ["local-testing-api#seed"],
        cache: false,
      },
      build: { command: "vp run --filter local-testing-api --filter local-testing-web build" },
      prisma: { command: "vp run local-testing-api#prisma", cache: false },
      e2e: {
        command: "tsx e2e/smoke.ts",
        dependsOn: ["local-testing-api#seed", "local-testing-api#build", "local-testing-web#build"],
        cache: false,
      },
    },
  },
});
