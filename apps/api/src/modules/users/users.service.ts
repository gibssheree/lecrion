import { Injectable } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

@Injectable()
export class UsersService {
  private readonly DEFAULT_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

  constructor(private readonly prisma: PrismaService) {}

  extractDigits(value: string): string {
    return String(value || '').replace(/\D/g, '');
  }

  normalizePhoneFromWa(value: string): string {
    return this.extractDigits(value);
  }

  buildWaEmail(phoneDigits: string): string {
    return `${phoneDigits || 'guest'}@wa.local`;
  }

  /**
   * Ensures a user exists for the given phone number.
   * Can be used within a Prisma transaction if desired.
   */
  async ensureUserByPhone(waPhone: string, tx?: any) {
    const prisma = tx || this.prisma;
    const phoneDigits = this.normalizePhoneFromWa(waPhone);
    const email = this.buildWaEmail(phoneDigits);

    let user = await prisma.users.findUnique({
      where: { email },
    });

    if (user) {
      return {
        userId: user.id,
        phoneDigits,
        email,
        created: false,
      };
    }

    user = await prisma.users.create({
      data: {
        email,
        password_hash: this.DEFAULT_PASSWORD_HASH,
      },
    });

    return {
      userId: user.id,
      phoneDigits,
      email,
      created: true,
    };
  }
}
