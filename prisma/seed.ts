import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcryptjs";
import * as path from "path";

const db = path.resolve(__dirname, "../database/canteen.db");
const adapter = new PrismaBetterSqlite3({ url: db });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const owner = await prisma.users.upsert({
    where: { email: "admin@lecrion.com" },
    update: {},
    create: {
      email: "admin@lecrion.com",
      password_hash: password,
      role: "owner",
      store_id: "default-store",
    },
  });

  const support = await prisma.users.upsert({
    where: { email: "support@lecrion.com" },
    update: {},
    create: {
      email: "support@lecrion.com",
      password_hash: password,
      role: "support",
      store_id: "default-store",
    },
  });

  // ── QA support accounts ──────────────────────────────────────────────────
  // Dedicated support logins for QA testers to exercise every module and
  // business vertical via Support Preview Mode (see support-preview.store.ts).
  const exelPassword = await bcrypt.hash("exeltest123", 10);
  await prisma.users.upsert({
    where: { email: "exel@lecrion.com" },
    update: { password_hash: exelPassword, role: "support" },
    create: {
      email: "exel@lecrion.com",
      password_hash: exelPassword,
      role: "support",
      store_id: "default-store",
    },
  });

  const jassonPassword = await bcrypt.hash("jassontest123", 10);
  await prisma.users.upsert({
    where: { email: "jasson@lecrion.com" },
    update: { password_hash: jassonPassword, role: "support" },
    create: {
      email: "jasson@lecrion.com",
      password_hash: jassonPassword,
      role: "support",
      store_id: "default-store",
    },
  });

  console.log("✅ Users seeded:");
  console.log("   Owner:   admin@lecrion.com   / admin123");
  console.log("   Support: support@lecrion.com / admin123");
  console.log("   Support: exel@lecrion.com    / exeltest123");
  console.log("   Support: jasson@lecrion.com  / jassontest123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
