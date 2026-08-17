// scripts/reset-password.ts
//
// Manual password reset (AUTH-01 stopgap).
//
// There is no self-service "forgot password" flow yet — no endpoint, no
// page, no email delivery. Until that's built, this is the supported way
// to reset a user's password: run this script directly against the
// database, the same way prisma/seed.ts does.
//
// Usage:
//   npx tsx scripts/reset-password.ts <email> <new-password>
//
// or via the npm script:
//   npm run db:reset-password -- <email> <new-password>

import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import * as bcrypt from "bcryptjs";
import * as path from "path";

const MIN_PASSWORD_LENGTH = 8;

async function main() {
  const [email, newPassword] = process.argv.slice(2);

  if (!email || !newPassword) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email> <new-password>");
    process.exit(1);
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const db = path.resolve(__dirname, "../database/canteen.db");
  const adapter = new PrismaBetterSqlite3({ url: db });
  const prisma = new PrismaClient({ adapter } as any);

  try {
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      console.error(`No user found with email "${email}". Nothing changed.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.users.update({
      where: { email },
      data: { password_hash: passwordHash, updated_at: new Date().toISOString() },
    });

    // This is a real password reset for a real account — confirm what
    // happened without ever echoing the password itself back to the
    // terminal (it may end up in shell history / a screen share either way,
    // but there's no reason to print it a second time here).
    console.log(
      `Password reset for ${email} (id ${user.id}, role ${user.role}, store ${user.store_id}).`,
    );
    console.log(
      "This does not invalidate any of their existing sessions — if the " +
        "reset was prompted by a compromised account rather than a forgotten " +
        "password, rotate JWT_SECRET too (kills all sessions, not just this one).",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Password reset failed:", err);
  process.exit(1);
});
