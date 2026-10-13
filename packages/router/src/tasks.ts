import type { TaskDefinition } from "./vite-task-types.js";
import { DEFAULT_ROUTE_DEFINITIONS_OUTPUT, DEFAULT_ROUTES_FILE } from "./codegen/generateRoutes.js";

const ROUTER_BUILD_TASK = "@rwgql/router#build";

export type CreateGenerateRoutesTasksOptions = {
  readonly routesFile?: string;
  readonly outputFile?: string;
  readonly dependsOnBuild?: string;
  /**
   * React Router mode: generated route modules also depend on page exports, so the task is not
   * cached on Routes.tsx alone.
   */
  readonly reactRouter?: boolean;
};

export const createGenerateRoutesTasks = (
  options: CreateGenerateRoutesTasksOptions = {},
): Record<string, TaskDefinition> => {
  const routesFile = options.routesFile ?? DEFAULT_ROUTES_FILE;
  const outputFile = options.outputFile ?? DEFAULT_ROUTE_DEFINITIONS_OUTPUT;
  const dependsOnBuild = options.dependsOnBuild ?? ROUTER_BUILD_TASK;

  return {
    "generate-routes": options.reactRouter
      ? {
          command: "vp exec rwgql-router-generate-routes",
          dependsOn: [dependsOnBuild],
          cache: false,
        }
      : {
          command: "vp exec rwgql-router-generate-routes",
          dependsOn: [dependsOnBuild],
          cache: {
            input: [routesFile],
            output: [outputFile],
          },
        },
  };
};
