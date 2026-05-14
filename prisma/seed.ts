import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcryptjs";
import * as path from "path";

const db = path.resolve(__dirname, "../database/canteen.db");
const adapter = new PrismaBetterSqlite3({ url: db });
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  const password = await bcrypt.hash("admin123", 10);

  const user = await prisma.users.upsert({
    where: { email: "admin@lecrion.com" },
    update: {},
    create: {
      email: "admin@lecrion.com",
      password_hash: password,
    },
  });

  console.log("✅ User created:", user.email);
  console.log("   Email:    admin@lecrion.com");
  console.log("   Password: admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
