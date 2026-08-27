import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcryptjs";
import * as path from "path";

const db = path.resolve(__dirname, "../database/canteen.db");
const adapter = new PrismaBetterSqlite3({ url: db });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  await prisma.stores.upsert({
    where: { id: "default-store" },
    update: {},
    create: {
      id: "default-store",
      name: "Lecrion",
      tier: "starter",
    },
  });

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

  // ── Leadership owner accounts ────────────────────────────────────────────
  const exelOwnerPassword = await bcrypt.hash("exel123", 10);
  await prisma.users.upsert({
    where: { email: "exel@support.com" },
    update: { password_hash: exelOwnerPassword, role: "owner" },
    create: {
      email: "exel@support.com",
      password_hash: exelOwnerPassword,
      role: "owner",
      store_id: "default-store",
    },
  });

  const jassonOwnerPassword = await bcrypt.hash("jasson123", 10);
  await prisma.users.upsert({
    where: { email: "jasson@support.com" },
    update: { password_hash: jassonOwnerPassword, role: "owner" },
    create: {
      email: "jasson@support.com",
      password_hash: jassonOwnerPassword,
      role: "owner",
      store_id: "default-store",
    },
  });

  // ── Operator & manager accounts ──────────────────────────────────────────
  // "Operator" here maps to the "cashier" role (the till/POS operator role
  // in UserRole — see libs/contracts/src/enums/index.ts). There is no
  // separate "operator" role in the schema.
  const operatorPassword = await bcrypt.hash("operator123", 10);
  await prisma.users.upsert({
    where: { email: "operator@lecrion.com" },
    update: { password_hash: operatorPassword, role: "cashier" },
    create: {
      email: "operator@lecrion.com",
      password_hash: operatorPassword,
      role: "cashier",
      store_id: "default-store",
    },
  });

  const managerPassword = await bcrypt.hash("manager123", 10);
  await prisma.users.upsert({
    where: { email: "manager@lecrion.com" },
    update: { password_hash: managerPassword, role: "manager" },
    create: {
      email: "manager@lecrion.com",
      password_hash: managerPassword,
      role: "manager",
      store_id: "default-store",
    },
  });

  console.log("✅ Users seeded:");
  console.log("   Owner:    admin@lecrion.com    / admin123");
  console.log("   Support:  support@lecrion.com  / admin123");
  console.log("   Support:  exel@lecrion.com     / exeltest123");
  console.log("   Support:  jasson@lecrion.com   / jassontest123");
  console.log("   Owner:    exel@support.com     / exel123");
  console.log("   Owner:    jasson@support.com   / jasson123");
  console.log("   Operator: operator@lecrion.com / operator123");
  console.log("   Manager:  manager@lecrion.com  / manager123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
