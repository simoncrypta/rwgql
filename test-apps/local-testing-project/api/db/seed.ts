import { hashPassword } from "@rwgql/dbauth/server";
import { db } from "../src/lib/db.js";
try {
  const { hashedPassword, salt } = hashPassword("password");
  const user = await db.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      fullName: "Cedar Admin",
      roles: "ADMIN",
      hashedPassword,
      salt,
    },
  });
  const existing = await db.post.findFirst({ where: { title: "Hello from Cedar on Vite+" } });
  if (!existing)
    await db.post.create({
      data: {
        title: "Hello from Cedar on Vite+",
        body: "The original Cedar Cells, services and scaffold pages, running together on rwgql.",
        authorId: user.id,
      },
    });
} finally {
  await db.$disconnect();
}
