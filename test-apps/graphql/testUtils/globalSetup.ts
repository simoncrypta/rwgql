import { createTestDatabaseGlobalSetup } from "@rwgql/prisma-dev/test";

const dbModuleUrl = new URL("../../db/index.ts", import.meta.url).href;
const cedarSetup = createTestDatabaseGlobalSetup({ dbModuleUrl });

export default async function globalSetup() {
  const teardown = await cedarSetup();

  return async () => {
    try {
      const { db } = await import("db");
      await db.$disconnect();
    } finally {
      await teardown();
    }
  };
}
