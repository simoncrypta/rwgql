import { cloneWorkerDatabase } from "@rwgql/prisma-dev/test";

// Per-worker TEMPLATE clone (VITEST_POOL_ID). Must be a setupFile so top-level await
// runs in the worker process — pack emits CJS+ESM for `@cedarjs/pg/vitest/template`.
await cloneWorkerDatabase();
