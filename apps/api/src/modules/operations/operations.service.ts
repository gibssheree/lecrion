// apps/api/src/modules/operations/operations.service.ts
//
// OperationsService — enterprise operational document lifecycle.
//
// ── Document lifecycle ────────────────────────────────────────────────────────
//   draft → submitted → posted   (stock movements applied atomically on post)
//   draft → cancelled
//   submitted → cancelled
//   posted and cancelled are terminal — no further transitions allowed.
//
// ── Posting rules ─────────────────────────────────────────────────────────────
//   purchase_order  → no stock movement (intent only; stock moves on goods_receipt)
//   goods_receipt   → RESTOCK movement per line at destination_location_id
//   stock_transfer  → TRANSFER_OUT at source_location_id + TRANSFER_IN at destination
//   stock_adjustment → ADJUSTMENT movement per line at destination_location_id
//
// ── Document number format ────────────────────────────────────────────────────
//   {TYPE_PREFIX}-{YYYYMMDD}-{STORE_SHORT}-{SEQ:04d}
//   e.g. GR-20260515-DEF-0001, PO-20260515-DEF-0002, ST-20260515-DEF-0001
//   Sequence is per (store_id, document_type, business_date).
//   Collision-safe via DB unique constraint + upsert increment.
//
// ── Integration with InventoryLedgerService ───────────────────────────────────
//   writeMovement() is called inside the post transaction.
//   stock_change_logs.source_ref is set to the document_number.
//   location_id is set when a destination/source location is specified.
//   menu.stock is always updated (legacy path preserved).

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { InventoryLedgerService } from '../inventory/inventory-ledger.service';
import { StoresService } from '../stores/stores.service';
import {
  OperationDocumentStatus,
  OperationDocumentType,
  StockMovementType,
} from '@libs/contracts/src/enums';
import {
  OPERATION_DOCUMENT_EVENTS,
  STOCK_EVENTS,
} from '@libs/contracts/src/events';
import { AuthUser } from '../auth/auth.types';
import {
  CancelDocumentDto,
  CreateOperationDocumentDto,
  DocumentLineResponse,
  OperationDocumentResponse,
  PostDocumentDto,
  PostDocumentResponse,
  PostingMovement,
  SubmitDocumentDto,
} from './operations.dto';

// ── Type prefix map ───────────────────────────────────────────────────────────
// Using string literals to avoid module initialization order issues in tests.
const DOC_TYPE_PREFIX: Record<string, string> = {
  purchase_order: 'PO',
  goods_receipt: 'GR',
  stock_transfer: 'ST',
  stock_adjustment: 'SA',
};

// ── Terminal statuses ─────────────────────────────────────────────────────────
// Using string literals to avoid module initialization order issues in tests.
const TERMINAL = new Set(['posted', 'cancelled']);

@Injectable()
export class OperationsService {
  private readonly logger = new Logger(OperationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
    private readonly ledger: InventoryLedgerService,
    private readonly stores: StoresService,
  ) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async createDocument(
    dto: CreateOperationDocumentDto,
    user?: AuthUser,
  ): Promise<OperationDocumentResponse> {
    const createdBy = user?.actor ?? 'system';
    // user.storeId takes precedence over dto.storeId — same SEC-05/06 sibling
    // bug class as pos-sales.service.ts: the reverse order let an
    // authenticated user submit an arbitrary dto.storeId and create
    // documents (and, on posting, stock movements) in a store they don't
    // belong to. dto.storeId still applies with no authenticated user
    // (tests, internal callers) — the HTTP endpoint always provides one via
    // @CurrentUser().
    const storeId = user?.storeId ?? dto.storeId ?? 'default-store';
    const now = new Date().toISOString();

    // Purchase order & goods receipt are Enterprise-only ("Purchase Order &
    // penerimaan barang" on the pricing page). Stock transfer/adjustment
    // stay open to every tier — Business needs transfer for its
    // multi-location feature, and adjustment is a basic correction any
    // store can need.
    if (
      dto.documentType === OperationDocumentType.PURCHASE_ORDER ||
      dto.documentType === OperationDocumentType.GOODS_RECEIPT
    ) {
      const tier = await this.stores.getStoreTier(storeId);
      if (tier !== 'enterprise') {
        throw new BadRequestException(
          `Dokumen ${dto.documentType === OperationDocumentType.PURCHASE_ORDER ? 'purchase order' : 'penerimaan barang'} memerlukan paket Enterprise.`,
        );
      }
    }

    // Validate location requirements
    this.validateLocationRequirements(dto);

    // Validate all menu_ids exist
    const menuIds = dto.lines.map((l) => l.menuId);
    const products = await this.prisma.menu.findMany({
      where: { id: { in: menuIds } },
      select: { id: true, name: true },
    });
    if (products.length !== new Set(menuIds).size) {
      const found = new Set(products.map((p) => p.id));
      const missing = menuIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Products not found: ${missing.join(', ')}`,
      );
    }

    const documentNumber = await this.nextDocumentNumber(
      storeId,
      dto.documentType,
      now,
    );

    const doc = await this.prisma.$transaction(async (tx) => {
      const created = await tx.operation_documents.create({
        data: {
          document_number: documentNumber,
          document_type: dto.documentType,
          status: 'draft',
          store_id: storeId,
          source_location_id: dto.sourceLocationId ?? null,
          destination_location_id: dto.destinationLocationId ?? null,
          supplier_id: dto.supplierId ?? null,
          supplier_name: dto.supplierName ?? null,
          linked_document_id: dto.linkedDocumentId ?? null,
          created_by: createdBy,
          notes: dto.notes ?? null,
          created_at: now,
        },
      });

      for (const line of dto.lines) {
        await tx.operation_document_lines.create({
          data: {
            document_id: created.id,
            menu_id: line.menuId,
            qty: line.qty,
            unit_cost: line.unitCost ?? null,
            metadata: line.metadata ?? null,
            created_at: now,
          },
        });
      }

      await this.sync.writeOutboxInTx(
        tx,
        'operation_document.created',
        {
          documentId: created.id,
          documentNumber,
          documentType: dto.documentType,
          storeId,
          createdBy,
        },
        { source: 'operations', storeId },
      );

      return created;
    });

    this.audit.record({
      actor: createdBy,
      action: 'operation_document.created',
      resource: 'operation_documents',
      resourceId: doc.id,
      after: { documentNumber, documentType: dto.documentType, storeId },
      storeId,
      channel: 'api',
    });

    this.logger.log(
      `Document created: ${documentNumber} (${dto.documentType}) by ${createdBy}`,
    );

    return this.getDocumentById(doc.id);
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async submitDocument(
    documentId: number,
    dto: SubmitDocumentDto,
    user?: AuthUser,
  ): Promise<OperationDocumentResponse> {
    const operatorId = dto.operatorId ?? user?.actor ?? 'system';
    const now = new Date().toISOString();

    const doc = await this.loadDocument(documentId, user?.storeId);

    if (doc.status !== 'draft') {
      throw new BadRequestException(
        `Document #${documentId} is ${doc.status} and cannot be submitted`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.operation_documents.update({
        where: { id: documentId },
        data: {
          status: 'submitted',
          submitted_by: operatorId,
          submitted_at: now,
        },
      });

      await this.sync.writeOutboxInTx(
        tx,
        'operation_document.submitted',
        { documentId, documentNumber: doc.document_number, operatorId },
        { source: 'operations', storeId: doc.store_id },
      );
    });

    this.audit.record({
      actor: operatorId,
      action: 'operation_document.submitted',
      resource: 'operation_documents',
      resourceId: documentId,
      before: { status: 'draft' },
      after: { status: 'submitted' },
      storeId: doc.store_id,
      channel: 'api',
    });

    this.logger.log(
      `Document submitted: ${doc.document_number} by ${operatorId}`,
    );

    return this.getDocumentById(documentId);
  }

  // ── Post ─────────────────────────────────────────────────────────────────────

  async postDocument(
    documentId: number,
    dto: PostDocumentDto,
    user?: AuthUser,
  ): Promise<PostDocumentResponse> {
    const operatorId = dto.operatorId ?? user?.actor ?? 'system';
    const now = new Date().toISOString();

    const doc = await this.loadDocument(documentId, user?.storeId);

    if (doc.status === 'posted') {
      throw new BadRequestException(
        `Document #${documentId} is already posted`,
      );
    }
    if (doc.status === 'cancelled') {
      throw new BadRequestException(
        `Document #${documentId} is cancelled and cannot be posted`,
      );
    }
    if (doc.status === 'draft') {
      throw new BadRequestException(
        `Document #${documentId} must be submitted before posting`,
      );
    }

    // Load lines with product names
    const lines = await this.prisma.operation_document_lines.findMany({
      where: { document_id: documentId },
      include: { menu: { select: { id: true, name: true } } },
    });

    if (lines.length === 0) {
      throw new BadRequestException(
        `Document #${documentId} has no lines and cannot be posted`,
      );
    }

    const movements: PostingMovement[] = [];

    await this.prisma.$transaction(async (tx) => {
      // Mark document as posted
      await tx.operation_documents.update({
        where: { id: documentId },
        data: {
          status: 'posted',
          posted_by: operatorId,
          posted_at: now,
        },
      });

      // Apply stock movements based on document type
      if (doc.document_type !== 'purchase_order') {
        for (const line of lines) {
          const productName = line.menu.name;
          const sourceRef = doc.document_number;

          if (doc.document_type === 'goods_receipt') {
            // RESTOCK at destination location
            const movement = await this.ledger.writeMovement(
              {
                menuId: line.menu_id,
                qtyChange: line.qty,
                movementType: 'restock',
                note: `Goods receipt ${doc.document_number}`,
                sourceRef,
                operatorId,
                storeId: doc.store_id,
                createdAt: now,
              },
              tx as any,
            );
            movements.push({
              menuId: line.menu_id,
              productName,
              movementType: 'restock',
              qtyChange: line.qty,
              locationId: doc.destination_location_id,
              stockBefore: movement.qtyBefore,
              stockAfter: movement.qtyAfter,
            });
          } else if (
            doc.document_type === 'stock_transfer'
          ) {
            // TRANSFER_OUT at source location
            const outMovement = await this.ledger.writeMovement(
              {
                menuId: line.menu_id,
                qtyChange: -line.qty,
                movementType: 'transfer',
                note: `Transfer out ${doc.document_number} → dest #${doc.destination_location_id}`,
                sourceRef,
                operatorId,
                storeId: doc.store_id,
                createdAt: now,
              },
              tx as any,
            );
            movements.push({
              menuId: line.menu_id,
              productName,
              movementType: `${'transfer'}_out`,
              qtyChange: -line.qty,
              locationId: doc.source_location_id,
              stockBefore: outMovement.qtyBefore,
              stockAfter: outMovement.qtyAfter,
            });

            // TRANSFER_IN at destination location
            // Note: for single-store, both movements update the same menu.stock.
            // When Agent J's multi-location balance is fully active, this will
            // update inventory_stock_balances per location instead.
            const inMovement = await this.ledger.writeMovement(
              {
                menuId: line.menu_id,
                qtyChange: line.qty,
                movementType: 'transfer',
                note: `Transfer in ${doc.document_number} ← src #${doc.source_location_id}`,
                sourceRef,
                operatorId,
                storeId: doc.store_id,
                createdAt: now,
              },
              tx as any,
            );
            movements.push({
              menuId: line.menu_id,
              productName,
              movementType: `${'transfer'}_in`,
              qtyChange: line.qty,
              locationId: doc.destination_location_id,
              stockBefore: inMovement.qtyBefore,
              stockAfter: inMovement.qtyAfter,
            });
          } else if (
            doc.document_type === 'stock_adjustment'
          ) {
            // ADJUSTMENT — qty can be positive (add) or negative (remove)
            // The line qty is the signed change (positive = add, negative = remove)
            const movement = await this.ledger.writeMovement(
              {
                menuId: line.menu_id,
                qtyChange: line.qty,
                movementType: 'adjustment',
                note: `Stock adjustment ${doc.document_number}`,
                sourceRef,
                operatorId,
                storeId: doc.store_id,
                createdAt: now,
              },
              tx as any,
            );
            movements.push({
              menuId: line.menu_id,
              productName,
              movementType: 'adjustment',
              qtyChange: line.qty,
              locationId: doc.destination_location_id,
              stockBefore: movement.qtyBefore,
              stockAfter: movement.qtyAfter,
            });
          }
        }
      }

      // Emit outbox events
      await this.sync.writeOutboxInTx(
        tx,
        'operation_document.posted',
        {
          documentId,
          documentNumber: doc.document_number,
          documentType: doc.document_type,
          operatorId,
          movementCount: movements.length,
        },
        { source: 'operations', storeId: doc.store_id },
      );

      for (const m of movements) {
        await this.sync.writeOutboxInTx(
          tx,
          'stock.adjusted',
          {
            productId: m.menuId,
            qtyChange: m.qtyChange,
            qtyAfter: m.stockAfter,
            reason: m.movementType,
            documentNumber: doc.document_number,
          },
          { source: 'operations', storeId: doc.store_id },
        );
      }
    });

    this.audit.record({
      actor: operatorId,
      action: 'operation_document.posted',
      resource: 'operation_documents',
      resourceId: documentId,
      before: { status: 'submitted' },
      after: {
        status: 'posted',
        movementCount: movements.length,
      },
      storeId: doc.store_id,
      channel: 'api',
    });

    this.logger.log(
      `Document posted: ${doc.document_number} by ${operatorId}. ` +
        `Movements: ${movements.length}`,
    );

    const updated = await this.getDocumentById(documentId);
    return { ...updated, movements };
  }

  // ── Cancel ───────────────────────────────────────────────────────────────────

  async cancelDocument(
    documentId: number,
    dto: CancelDocumentDto,
    user?: AuthUser,
  ): Promise<OperationDocumentResponse> {
    const operatorId = dto.operatorId ?? user?.actor ?? 'system';
    const reason = dto.reason.trim();
    if (!reason) {
      throw new BadRequestException('reason is required for cancellation');
    }

    const doc = await this.loadDocument(documentId, user?.storeId);

    if (doc.status === 'posted') {
      throw new BadRequestException(
        `Document #${documentId} is already posted and cannot be cancelled. ` +
          `Create a stock_adjustment to reverse the movements.`,
      );
    }
    if (doc.status === 'cancelled') {
      throw new BadRequestException(
        `Document #${documentId} is already cancelled`,
      );
    }

    const now = new Date().toISOString();

    await this.prisma.$transaction(async (tx) => {
      await tx.operation_documents.update({
        where: { id: documentId },
        data: {
          status: 'cancelled',
          cancelled_by: operatorId,
          cancelled_at: now,
          notes: doc.notes
            ? `${doc.notes}\nCancelled: ${reason}`
            : `Cancelled: ${reason}`,
        },
      });

      await this.sync.writeOutboxInTx(
        tx,
        'operation_document.cancelled',
        {
          documentId,
          documentNumber: doc.document_number,
          reason,
          operatorId,
        },
        { source: 'operations', storeId: doc.store_id },
      );
    });

    this.audit.record({
      actor: operatorId,
      action: 'operation_document.cancelled',
      resource: 'operation_documents',
      resourceId: documentId,
      before: { status: doc.status },
      after: { status: 'cancelled', reason },
      storeId: doc.store_id,
      channel: 'api',
    });

    this.logger.log(
      `Document cancelled: ${doc.document_number} by ${operatorId}: ${reason}`,
    );

    return this.getDocumentById(documentId);
  }

  // ── Read ─────────────────────────────────────────────────────────────────────

  async getDocumentById(
    documentId: number,
  ): Promise<OperationDocumentResponse> {
    const doc = await this.prisma.operation_documents.findUnique({
      where: { id: documentId },
      include: {
        lines: {
          include: { menu: { select: { id: true, name: true } } },
        },
      },
    });
    if (!doc) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }
    return this.toResponse(doc);
  }

  async listDocuments(params: {
    storeId?: string;
    documentType?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ documents: OperationDocumentResponse[]; total: number }> {
    const limit = Math.min(Number(params.limit) || 20, 100);
    const offset = Number(params.offset) || 0;

    const where: Record<string, unknown> = {};
    if (params.storeId) where['store_id'] = params.storeId;
    if (params.documentType) where['document_type'] = params.documentType;
    if (params.status) where['status'] = params.status;

    const [rows, total] = await Promise.all([
      this.prisma.operation_documents.findMany({
        where,
        include: {
          lines: {
            include: { menu: { select: { id: true, name: true } } },
          },
        },
        orderBy: { created_at: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.operation_documents.count({ where }),
    ]);

    return {
      documents: rows.map((r) => this.toResponse(r)),
      total,
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  /**
   * `expectedStoreId`, when given, enforces that the document belongs to
   * that store — same class of cross-tenant gap as SEC-05/06: without this,
   * any authenticated user could submit/post/cancel another store's
   * document by id. Skipped only when there's no authenticated store to
   * compare against (e.g. a system-originated call), matching how
   * `operatorId` already falls back to 'system' in the three callers below.
   */
  private async loadDocument(documentId: number, expectedStoreId?: string) {
    const doc = await this.prisma.operation_documents.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }
    if (expectedStoreId && doc.store_id !== expectedStoreId) {
      throw new NotFoundException(`Document #${documentId} not found`);
    }
    return doc;
  }

  private validateLocationRequirements(dto: CreateOperationDocumentDto): void {
    const type = dto.documentType;

    if (
      type === 'goods_receipt' ||
      type === 'stock_adjustment'
    ) {
      if (!dto.destinationLocationId) {
        throw new BadRequestException(`${type} requires destinationLocationId`);
      }
    }

    if (type === 'stock_transfer') {
      if (!dto.sourceLocationId) {
        throw new BadRequestException(
          `stock_transfer requires sourceLocationId`,
        );
      }
      if (!dto.destinationLocationId) {
        throw new BadRequestException(
          `stock_transfer requires destinationLocationId`,
        );
      }
      if (dto.sourceLocationId === dto.destinationLocationId) {
        throw new BadRequestException(
          `stock_transfer source and destination locations must be different`,
        );
      }
    }
  }

  /**
   * Get the next document number for a given store/type/date.
   * Uses an upsert on operation_document_sequences to atomically increment.
   * Format: {PREFIX}-{YYYYMMDD}-{STORE_SHORT}-{SEQ:04d}
   */
  private async nextDocumentNumber(
    storeId: string,
    documentType: string,
    now: string,
  ): Promise<string> {
    const businessDate = now.slice(0, 10).replace(/-/g, '');
    const prefix = DOC_TYPE_PREFIX[documentType] ?? 'DOC';
    const storeShort = storeId
      .slice(0, 3)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, 'X');

    // Atomic increment via raw SQL upsert (SQLite-compatible)
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO operation_document_sequences (store_id, document_type, business_date, sequence, created_at, updated_at)
       VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
       ON CONFLICT(store_id, document_type, business_date)
       DO UPDATE SET sequence = sequence + 1, updated_at = datetime('now')`,
      storeId,
      documentType,
      businessDate,
    );

    const row = await this.prisma.operation_document_sequences.findFirst({
      where: {
        store_id: storeId,
        document_type: documentType,
        business_date: businessDate,
      },
      select: { sequence: true },
    });

    const seq = row?.sequence ?? 1;
    return `${prefix}-${businessDate}-${storeShort}-${String(seq).padStart(4, '0')}`;
  }

  private toResponse(doc: any): OperationDocumentResponse {
    const lines: DocumentLineResponse[] = (doc.lines ?? []).map((l: any) => ({
      id: l.id,
      menuId: l.menu_id,
      productName: l.menu?.name ?? `Product #${l.menu_id}`,
      qty: l.qty,
      unitCost: l.unit_cost ?? null,
      metadata: l.metadata ?? null,
    }));

    return {
      id: doc.id,
      documentNumber: doc.document_number,
      documentType: doc.document_type,
      status: doc.status,
      storeId: doc.store_id,
      sourceLocationId: doc.source_location_id ?? null,
      destinationLocationId: doc.destination_location_id ?? null,
      supplierId: doc.supplier_id ?? null,
      supplierName: doc.supplier_name ?? null,
      linkedDocumentId: doc.linked_document_id ?? null,
      createdBy: doc.created_by,
      submittedBy: doc.submitted_by ?? null,
      postedBy: doc.posted_by ?? null,
      cancelledBy: doc.cancelled_by ?? null,
      notes: doc.notes ?? null,
      createdAt: doc.created_at,
      submittedAt: doc.submitted_at ?? null,
      postedAt: doc.posted_at ?? null,
      cancelledAt: doc.cancelled_at ?? null,
      lines,
    };
  }
}


