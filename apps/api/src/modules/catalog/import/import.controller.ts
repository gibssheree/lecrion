// apps/api/src/modules/catalog/import/import.controller.ts
//
// POST /api/products/import — one endpoint for both preview and commit.
// Send commit=false (or omit it) to validate and preview only; commit=true
// to actually write. Same request shape either way.

import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthUser } from '../../auth/auth.types';
import { ImportService } from './import.service';
import { ColumnMapping, IMPORT_FIELDS } from './import.types';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB — generous for a text/spreadsheet catalog file

class ImportRequestDto {
  /** JSON-encoded ColumnMapping — omit to auto-detect. */
  @IsOptional()
  @IsString()
  mapping?: string;

  /** Sheet name (xlsx) or table name (sqlite) — omit to auto-pick. */
  @IsOptional()
  @IsString()
  sourceOverride?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  commit?: string;
}

@Controller('products/import')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post()
  @Roles('owner', 'manager')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
        fields: 5,
        fieldNameSize: 50,
        fieldSize: 20_000, // mapping JSON is small; this is not the product data itself
      },
    }),
  )
  async import(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ImportRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException('No file was uploaded (field name must be "file").');
    }
    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded file is empty.');
    }

    let mapping: ColumnMapping | undefined;
    if (body.mapping) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(body.mapping);
      } catch {
        throw new BadRequestException('mapping must be valid JSON.');
      }
      mapping = sanitizeMapping(parsed);
    }

    const preview = await this.importService.run({
      buffer: file.buffer,
      filename: file.originalname,
      sourceOverride: body.sourceOverride,
      mapping,
      commit: body.commit === 'true',
      storeId: user.storeId,
      actor: user.actor,
    });

    return preview;
  }
}

function sanitizeMapping(parsed: unknown): ColumnMapping {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequestException('mapping must be a JSON object of field -> column index.');
  }
  const mapping: ColumnMapping = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!(IMPORT_FIELDS as readonly string[]).includes(key)) continue;
    if (value === null || value === undefined) continue;
    const idx = Number(value);
    if (Number.isInteger(idx) && idx >= 0) {
      (mapping as Record<string, number>)[key] = idx;
    }
  }
  return mapping;
}
