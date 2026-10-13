export type GlobWithBase = {
  pattern: string;
  base: "package" | "workspace";
};

/** vite-plus 1.x task cache settings (`input` / `output` / `env` live under `cache`). */
export type TaskCacheConfig = {
  env?: string[];
  untrackedEnv?: string[];
  input?: Array<string | GlobWithBase>;
  output?: Array<string | GlobWithBase>;
};

export type Task = {
  command: string | string[];
  cwd?: string;
  dependsOn?: string[];
  cache?: boolean | TaskCacheConfig;
};

export type TaskDefinition = Task | string | string[];
