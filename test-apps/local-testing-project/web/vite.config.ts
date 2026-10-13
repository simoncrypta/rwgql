import { fileURLToPath } from "node:url";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { rwgqlRoutes } from "@rwgql/router/vite";
import { createGenerateRoutesTasks } from "@rwgql/router/tasks";
import { defineConfig } from "vite-plus";
import { apiDev } from "../apiDev.ts";
const builds = [
  "@rwgql/auth#build",
  "@rwgql/dbauth#build",
  "@rwgql/cell#build",
  "@rwgql/router#build",
];
export default defineConfig({
  resolve: { alias: { src: fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 8920, strictPort: true, cors: false },
  plugins: process.env.VITEST
    ? [rwgqlRoutes()]
    : [
        rwgqlRoutes(),
        tailwindcss(),
        ...(process.env.LOCAL_TESTING_API === "1" ? [apiDev()] : []),
        reactRouter(),
      ],
  fmt: {
    ignorePatterns: [
      ".rwgql/**",
      ".react-router/**",
      "build/**",
      "types/graphql.d.ts",
      "src/*.gen.ts",
    ],
  },
  lint: {
    ignorePatterns: [
      ".rwgql/**",
      ".react-router/**",
      "build/**",
      "types/graphql.d.ts",
      "src/*.gen.ts",
    ],
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx"],
    setupFiles: ["testUtils/setup.ts"],
  },
  run: {
    tasks: {
      ...createGenerateRoutesTasks(),
      dev: {
        command: "vp dev",
        dependsOn: [...builds, "generate-routes", "local-testing-api#codegen"],
        cache: false,
      },
      build: {
        command: "vp build",
        dependsOn: [...builds, "generate-routes", "local-testing-api#codegen"],
      },
      test: {
        command: "vp test",
        dependsOn: [...builds, "generate-routes", "local-testing-api#codegen"],
        cache: false,
      },
      types: {
        command: ["react-router typegen", "tsc"],
        dependsOn: [...builds, "generate-routes", "local-testing-api#codegen"],
      },
    },
  },
});
