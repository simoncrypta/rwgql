import { fileURLToPath } from "node:url";

import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import { createGenerateRoutesTasks } from "@rwgql/router/tasks";
import { rwgqlRoutes } from "@rwgql/router/vite";
import { defineConfig, lazyPlugins } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const isTest = Boolean(process.env.VITEST);

const webPackageBuilds = [
  "@rwgql/auth#build",
  "@rwgql/dbauth#build",
  "@rwgql/cell#build",
  "@rwgql/router#build",
] as const;

export default defineConfig({
  resolve: {
    // Array form: the more specific `@/auth` test alias must win over `@`.
    alias: [
      ...(isTest
        ? [
            {
              find: "@/auth",
              replacement: fileURLToPath(new URL("./testUtils/mockAuth.ts", import.meta.url)),
            },
          ]
        : []),
      { find: /^@\//, replacement: `${fileURLToPath(new URL("./src", import.meta.url))}/` },
    ],
  },
  // Discovered late on a cold `vp dev`, which forces a full reload on the first page view.
  optimizeDeps: {
    include: [
      "@apollo/client",
      "@apollo/client/react",
      "@apollo/client-integration-react-router",
      "react-hook-form",
      "react-hot-toast",
    ],
  },
  fmt: {
    ignorePatterns: ["src/**/*.gen.ts", "src/gql/**", ".rwgql/**"],
  },
  lint: {
    ignorePatterns: ["src/**/*.gen.ts", "src/gql/**", ".rwgql/**"],
  },
  plugins: lazyPlugins(() =>
    isTest
      ? []
      : [
          // Compiles src/Routes.tsx into .rwgql/ (React Router's appDirectory) and keeps it in sync.
          rwgqlRoutes(),
          cloudflare({ viteEnvironment: { name: "ssr" } }),
          reactRouter(),
        ],
  ),
  test: {
    browser: {
      enabled: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["testUtils/setup.ts"],
  },
  run: {
    tasks: {
      ...createGenerateRoutesTasks({ reactRouter: true }),
      dev: {
        command: "vp dev --port 8920",
        dependsOn: [...webPackageBuilds, "generate-routes"],
        cache: false,
      },
      build: {
        command: "vp build",
        dependsOn: [...webPackageBuilds, "generate-routes"],
      },
      preview: {
        command: "vp preview --port 8920",
        dependsOn: ["build"],
        cache: false,
      },
      // Production build on workerd against a mock API: SSR, caching, auth, params, hydration.
      e2e: {
        command: "tsx e2e/smoke.ts",
        dependsOn: [...webPackageBuilds, "generate-routes"],
        cache: false,
      },
      // Real API (test-apps/graphql) + Postgres (@cedarjs/pg) + vp dev. Run `vp run seed` first.
      "e2e:fullstack": {
        command: "tsx e2e/fullstack.ts",
        dependsOn: [...webPackageBuilds, "generate-routes"],
        cache: false,
      },
      types: {
        command: ["react-router typegen", "tsc"],
        dependsOn: [...webPackageBuilds, "generate-routes"],
      },
    },
  },
});
