import type { TaskDefinition } from "./vite-task-types.js";

const ROUTER_BUILD_TASK = "@rwgql/router#build";

export type CreateGenerateRoutesTasksOptions = {
  readonly dependsOnBuild?: string;
};

export const createGenerateRoutesTasks = (
  options: CreateGenerateRoutesTasksOptions = {},
): Record<string, TaskDefinition> => ({
  // Generated route modules also depend on page exports, so don't cache on Routes.tsx alone.
  "generate-routes": {
    command: "vp exec rwgql-router-generate-routes",
    dependsOn: [options.dependsOnBuild ?? ROUTER_BUILD_TASK],
    cache: false,
  },
});
