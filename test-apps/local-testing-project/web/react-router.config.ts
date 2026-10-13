import type { Config } from "@react-router/dev/config";

export default {
  // Generated from src/Routes.tsx by @rwgql/router. Cedar's Routes.tsx and React Router's
  // routes.ts would collide on case-insensitive filesystems, so the app directory is generated.
  appDirectory: ".rwgql",
  ssr: true,
  future: {
    v8_middleware: true,
  },
} satisfies Config;
