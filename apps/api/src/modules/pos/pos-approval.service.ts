// apps/api/src/modules/pos/pos-approval.service.ts
//
// PosApprovalService — manager approval policy engine.
//
// Responsibilities:
//   1. Evaluate whether an action requires manager approval (policy check).
//   2. Create approval request records.
//   3. Verify manager PIN and resolve (approve/reject) requests.
//   4. Provide inline approval (request + approve in one step).
//   5. Write audit logs for every approval decision.
//
// ── Policy defaults (override via env) ───────────────────────────────────────
//
//   REFUND_APPROVAL_THRESHOLD_IDR   = 100000  (Rp 100.000)
//   DISCOUNT_APPROVAL_THRESHOLD_IDR = 50000   (Rp 50.000)
//   VOID_MAX_AGE_MINUTES            = 30      (30 minutes)
//   MANAGER_PIN                     = "1234"  (override in production)
//
// In production, MANAGER_PIN should be stored as a bcrypt hash in the DB
// or environment. For this phase, a single env-configured PIN is used as
// a placeholder until a full user-role PIN system is built.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@libs/db/src/prisma';
import { AuditService } from '../audit/audit.service';
import { SyncService } from '../sync/sync.service';
import { StoresService } from '../stores/stores.service';
import { ManagerApprovalStatus } from '@libs/contracts/src/enums';
import { MANAGER_APPROVAL_EVENTS } from '@libs/contracts/src/events';
import {
  ApprovalType,
  ApprovalPolicyResult,
  InlineApprovalDto,
  InlineApprovalResponse,
  RequestApprovalDto,
  RequestApprovalResponse,
  ResolveApprovalDto,
  RejectApprovalDto,
  ResolveApprovalResponse,
} from './pos-approval.dto';

// ── Policy thresholds ─────────────────────────────────────────────────────────

function getRefundThreshold(): number {
  return parseInt(process.env.REFUND_APPROVAL_THRESHOLD_IDR ?? '100000', 10);
}

function getDiscountThreshold(): number {
  return parseInt(process.env.DISCOUNT_APPROVAL_THRESHOLD_IDR ?? '50000', 10);
}

function getVoidMaxAgeMinutes(): number {
  return parseInt(process.env.VOID_MAX_AGE_MINUTES ?? '30', 10);
}

function getManagerPin(): string {
  return process.env.MANAGER_PIN ?? '1234';
}

@Injectable()
export class PosApprovalService {
  private readonly logger = new Logger(PosApprovalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sync: SyncService,
    private readonly stores: StoresService,
  ) {}

  // ── Policy checks ─────────────────────────────────────────────────────────

  /**
   * Check whether a refund requires manager approval.
   * Approval required when refundAmount > threshold — but only for
   * Business+ stores. Starter's pricing is explicit: "hanya catat selisih"
   * (variance logging only, no approval gate) — see TIER_MODULES /
   * PlatformModule.POS_SHIFT_APPROVAL. Variance calculation itself lives in
   * RegisterService/CashflowService and is untouched by this — Starter
   * still gets that, it just skips the approval requirement layered on top.
   */
  async checkRefundPolicy(
    storeId: string,
    refundAmount: number,
  ): Promise<ApprovalPolicyResult> {
    if ((await this.stores.getStoreTier(storeId)) === 'starter') {
      return { required: false };
    }
    const threshold = getRefundThreshold();
    if (refundAmount > threshold) {
      return {
        required: true,
        reason: `Refund Rp${refundAmount.toLocaleString('id-ID')} melebihi batas Rp${threshold.toLocaleString('id-ID')}`,
        approvalType: 'refund',
      };
    }
    return { required: false };
  }

  /**
   * Check whether a void requires manager approval.
   * Approval required when order age > VOID_MAX_AGE_MINUTES — Starter-tier
   * exempt, same reasoning as checkRefundPolicy above.
   */
  async checkVoidPolicy(
    storeId: string,
    orderCreatedAt: string,
  ): Promise<ApprovalPolicyResult> {
    if ((await this.stores.getStoreTier(storeId)) === 'starter') {
      return { required: false };
    }
    const maxAgeMs = getVoidMaxAgeMinutes() * 60 * 1000;
    const orderAge = Date.now() - new Date(orderCreatedAt).getTime();
    if (orderAge > maxAgeMs) {
      const ageMinutes = Math.round(orderAge / 60000);
      return {
        required: true,
        reason: `Order berumur ${ageMinutes} menit melebihi batas void ${getVoidMaxAgeMinutes()} menit`,
        approvalType: 'void',
      };
    }
    return { required: false };
  }

  /**
   * Check whether a discount requires manager approval.
   * Approval required when discountAmount > threshold.
   */
  checkDiscountPolicy(discountAmount: number): ApprovalPolicyResult {
    const threshold = getDiscountThreshold();
    if (discountAmount > threshold) {
      return {
        required: true,
        reason: `Diskon Rp${discountAmount.toLocaleString('id-ID')} melebihi batas Rp${threshold.toLocaleString('id-ID')}`,
        approvalType: 'discount_override',
      };
    }
    return { required: false };
  }

  /**
   * Price override always requires manager approval.
   */
  checkPriceOverridePolicy(): ApprovalPolicyResult {
    return {
      required: true,
      reason: 'Override harga selalu memerlukan persetujuan manajer',
      approvalType: 'price_override',
    };
  }

  // ── Verify PIN ────────────────────────────────────────────────────────────

  /**
   * Verify manager PIN.
   * Throws ForbiddenException if PIN is wrong.
   *
   * TODO: In production, replace with bcrypt hash comparison against
   * a manager user record. For now, a single env-configured PIN is used.
   */
  verifyManagerPin(pin: string): void {
    const expected = getManagerPin();
    if (!pin || pin.trim() !== expected) {
      throw new ForbiddenException('PIN manajer salah');
    }
  }

  // ── Request approval ──────────────────────────────────────────────────────

  async requestApproval(
    dto: RequestApprovalDto,
  ): Promise<RequestApprovalResponse> {
    const now = new Date().toISOString();

    const approval = await this.prisma.manager_approvals.create({
      data: {
        approval_type: dto.approvalType,
        requested_by: dto.requestedBy,
        reason: dto.reason,
        status: ManagerApprovalStatus.PENDING,
        created_at: now,
      },
    });

    this.audit.record({
      actor: dto.requestedBy,
      action: MANAGER_APPROVAL_EVENTS.REQUESTED,
      resource: 'manager_approvals',
      resourceId: approval.id,
      after: {
        approvalType: dto.approvalType,
        reason: dto.reason,
        status: ManagerApprovalStatus.PENDING,
      },
      channel: 'api',
    });

    this.logger.log(
      `Approval requested: type=${dto.approvalType} by=${dto.requestedBy}`,
    );

    return {
      approvalId: approval.id,
      approvalType: dto.approvalType as ApprovalType,
      status: 'pending',
      requestedBy: dto.requestedBy,
      reason: dto.reason,
      createdAt: now,
    };
  }

  // ── Resolve (approve) ─────────────────────────────────────────────────────

  async approveRequest(
    approvalId: number,
    dto: ResolveApprovalDto,
  ): Promise<ResolveApprovalResponse> {
    this.verifyManagerPin(dto.managerPin);

    const approval = await this.prisma.manager_approvals.findUnique({
      where: { id: approvalId },
    });
    if (!approval) {
      throw new NotFoundException(`Approval #${approvalId} not found`);
    }
    if (approval.status !== ManagerApprovalStatus.PENDING) {
      throw new BadRequestException(
        `Approval #${approvalId} is already ${approval.status}`,
      );
    }

    const now = new Date().toISOString();

    await this.prisma.manager_approvals.update({
      where: { id: approvalId },
      data: {
        status: ManagerApprovalStatus.APPROVED,
        approved_by: dto.approvedBy,
        resolved_at: now,
      },
    });

    this.audit.record({
      actor: dto.approvedBy,
      action: MANAGER_APPROVAL_EVENTS.APPROVED,
      resource: 'manager_approvals',
      resourceId: approvalId,
      before: { status: ManagerApprovalStatus.PENDING },
      after: {
        status: ManagerApprovalStatus.APPROVED,
        approvedBy: dto.approvedBy,
        note: dto.note,
      },
      channel: 'api',
    });

    this.logger.log(`Approval #${approvalId} approved by ${dto.approvedBy}`);

    return {
      approvalId,
      status: 'approved',
      approvedBy: dto.approvedBy,
      resolvedAt: now,
    };
  }

  // ── Reject ────────────────────────────────────────────────────────────────

  async rejectRequest(
    approvalId: number,
    dto: RejectApprovalDto,
  ): Promise<ResolveApprovalResponse> {
    const approval = await this.prisma.manager_approvals.findUnique({
      where: { id: approvalId },
    });
    if (!approval) {
      throw new NotFoundException(`Approval #${approvalId} not found`);
    }
    if (approval.status !== ManagerApprovalStatus.PENDING) {
      throw new BadRequestException(
        `Approval #${approvalId} is already ${approval.status}`,
      );
    }

    const now = new Date().toISOString();

    await this.prisma.manager_approvals.update({
      where: { id: approvalId },
      data: {
        status: ManagerApprovalStatus.REJECTED,
        approved_by: dto.rejectedBy,
        resolved_at: now,
      },
    });

    this.audit.record({
      actor: dto.rejectedBy,
      action: MANAGER_APPROVAL_EVENTS.REJECTED,
      resource: 'manager_approvals',
      resourceId: approvalId,
      before: { status: ManagerApprovalStatus.PENDING },
      after: {
        status: ManagerApprovalStatus.REJECTED,
        rejectedBy: dto.rejectedBy,
        reason: dto.reason,
      },
      channel: 'api',
    });

    this.logger.log(`Approval #${approvalId} rejected by ${dto.rejectedBy}`);

    return {
      approvalId,
      status: 'rejected',
      rejectedBy: dto.rejectedBy,
      resolvedAt: now,
    };
  }

  // ── Inline approval (single-step) ─────────────────────────────────────────

  /**
   * Create and immediately approve an approval request in one step.
   * Used when the manager is physically present and enters PIN on the same device.
   *
   * Returns the approvalId so the caller can attach it to a pos_corrections row.
   */
  async inlineApprove(dto: InlineApprovalDto): Promise<InlineApprovalResponse> {
    this.verifyManagerPin(dto.managerPin);

    const now = new Date().toISOString();

    const approval = await this.prisma.manager_approvals.create({
      data: {
        approval_type: dto.approvalType,
        requested_by: dto.requestedBy,
        approved_by: dto.approvedBy,
        reason: dto.reason,
        status: ManagerApprovalStatus.APPROVED,
        created_at: now,
        resolved_at: now,
      },
    });

    this.audit.record({
      actor: dto.approvedBy,
      action: MANAGER_APPROVAL_EVENTS.APPROVED,
      resource: 'manager_approvals',
      resourceId: approval.id,
      after: {
        approvalType: dto.approvalType,
        requestedBy: dto.requestedBy,
        approvedBy: dto.approvedBy,
        reason: dto.reason,
        status: ManagerApprovalStatus.APPROVED,
        inline: true,
      },
      channel: 'api',
    });

    this.logger.log(
      `Inline approval: type=${dto.approvalType} by=${dto.approvedBy} for=${dto.requestedBy}`,
    );

    return {
      approvalId: approval.id,
      approvalType: dto.approvalType as ApprovalType,
      status: 'approved',
      requestedBy: dto.requestedBy,
      approvedBy: dto.approvedBy,
      reason: dto.reason,
      createdAt: now,
      resolvedAt: now,
    };
  }

  // ── Get approval ──────────────────────────────────────────────────────────

  async getApproval(approvalId: number) {
    const approval = await this.prisma.manager_approvals.findUnique({
      where: { id: approvalId },
    });
    if (!approval) {
      throw new NotFoundException(`Approval #${approvalId} not found`);
    }
    return approval;
  }

  async requireApprovedApproval(
    approvalId: number,
    approvalType: ApprovalType,
  ) {
    const approval = await this.getApproval(approvalId);
    if (approval.approval_type !== approvalType) {
      throw new ForbiddenException(
        `Approval #${approvalId} is for ${approval.approval_type}, not ${approvalType}`,
      );
    }
    if (approval.status !== ManagerApprovalStatus.APPROVED) {
      throw new ForbiddenException(
        `Approval #${approvalId} is ${approval.status}, not approved`,
      );
    }
    return approval;
  }

  // ── Policy thresholds (for frontend display) ──────────────────────────────

  getThresholds() {
    return {
      refundApprovalThresholdIdr: getRefundThreshold(),
      discountApprovalThresholdIdr: getDiscountThreshold(),
      voidMaxAgeMinutes: getVoidMaxAgeMinutes(),
    };
  }
}
