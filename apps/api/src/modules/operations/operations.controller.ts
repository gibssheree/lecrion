// apps/api/src/modules/operations/operations.controller.ts

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OperationsService } from './operations.service';
import {
  CancelDocumentDto,
  CreateOperationDocumentDto,
  PostDocumentDto,
  SubmitDocumentDto,
} from './operations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/auth.types';

@Controller('operations/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OperationsController {
  constructor(private readonly operationsService: OperationsService) {}

  /**
   * POST /api/operations/documents
   * Create a new operational document in DRAFT status.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('owner', 'manager', 'inventory_staff')
  createDocument(
    @Body() dto: CreateOperationDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.operationsService.createDocument(dto, user);
  }

  /**
   * GET /api/operations/documents
   * List documents with optional filters.
   */
  @Get()
  @Roles('owner', 'manager', 'inventory_staff', 'cashier')
  listDocuments(
    @Query('storeId') storeId?: string,
    @Query('documentType') documentType?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.operationsService.listDocuments({
      storeId,
      documentType,
      status,
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  /**
   * GET /api/operations/documents/:id
   * Get a single document with its lines.
   */
  @Get(':id')
  @Roles('owner', 'manager', 'inventory_staff', 'cashier')
  getDocumentById(@Param('id', ParseIntPipe) id: number) {
    return this.operationsService.getDocumentById(id);
  }

  /**
   * POST /api/operations/documents/:id/submit
   * Submit a DRAFT document for posting.
   * Transitions: draft → submitted
   */
  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'inventory_staff')
  submitDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.operationsService.submitDocument(id, dto, user);
  }

  /**
   * POST /api/operations/documents/:id/post
   * Post a SUBMITTED document — applies stock movements atomically.
   * Transitions: submitted → posted
   *
   * Posting rules:
   *   purchase_order  → no stock movement
   *   goods_receipt   → RESTOCK per line at destination_location_id
   *   stock_transfer  → TRANSFER_OUT at source + TRANSFER_IN at destination
   *   stock_adjustment → ADJUSTMENT per line at destination_location_id
   */
  @Post(':id/post')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager')
  postDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PostDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.operationsService.postDocument(id, dto, user);
  }

  /**
   * POST /api/operations/documents/:id/cancel
   * Cancel a DRAFT or SUBMITTED document.
   * Posted documents cannot be cancelled — create a stock_adjustment instead.
   * Transitions: draft → cancelled, submitted → cancelled
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('owner', 'manager', 'inventory_staff')
  cancelDocument(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.operationsService.cancelDocument(id, dto, user);
  }
}
