import { Global, Module } from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';

/**
 * DatabaseModule — provides PrismaService globally so every domain module
 * can inject it without re-importing this module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
