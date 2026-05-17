// apps/api/src/modules/pos/pos-approval.dto.ts
//
// DTOs and response shapes for manager approval flows.
//
// Policy thresholds (configurable via env or future store settings):
//   REFUND_APPROVAL_THRESHOLD  — refund amount above this requires manager approval
//   DISCOUNT_APPROVAL_THRESHOLD — discount amount above this requires manager approval
//   VOID_MAX_AGE_MINUTES        — void requires approval if order is older than this
//
// Approval types:
//   "refund"           — refund above threshold
//   "void"             — void of order older than policy window
//   "discount_override" — discount above threshold
//   "price_override"   — price override (always requires approval)

import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const APPROVAL_TYPES = [
  'refund',
  'void',
  'discount_override',
  'price_override',
] as const;

export type ApprovalType = (typeof APPROVAL_TYPES)[number];

// ── Request approval ──────────────────────────────────────────────────────────

export class RequestApprovalDto {
  @IsIn(APPROVAL_TYPES)
  approvalType!: ApprovalType;

  @IsString()
  @MinLength(1)
  requestedBy!: string;

  @IsString()
  @MinLength(3)
  reason!: string;
}

export interface RequestApprovalResponse {
  approvalId: number;
  approvalType: ApprovalType;
  status: 'pending';
  requestedBy: string;
  reason: string;
  createdAt: string;
}

// ── Approve / reject ──────────────────────────────────────────────────────────

export class ResolveApprovalDto {
  /** Manager PIN — verified against stored hash */
  @IsString()
  @MinLength(4)
  managerPin!: string;

  @IsString()
  @MinLength(1)
  approvedBy!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class RejectApprovalDto {
  @IsString()
  @MinLength(1)
  rejectedBy!: string;

  @IsString()
  @MinLength(1)
  reason!: string;
}

export interface ResolveApprovalResponse {
  approvalId: number;
  status: 'approved' | 'rejected';
  approvedBy?: string;
  rejectedBy?: string;
  resolvedAt: string;
}

// ── Inline approval (single-step: request + approve together) ─────────────────
// Used when the manager is physically present and enters PIN on the same device.

export class InlineApprovalDto {
  @IsIn(APPROVAL_TYPES)
  approvalType!: ApprovalType;

  @IsString()
  @MinLength(1)
  requestedBy!: string;

  @IsString()
  @MinLength(3)
  reason!: string;

  /** Manager PIN — verified inline */
  @IsString()
  @MinLength(4)
  managerPin!: string;

  @IsString()
  @MinLength(1)
  approvedBy!: string;
}

export interface InlineApprovalResponse {
  approvalId: number;
  approvalType: ApprovalType;
  status: 'approved';
  requestedBy: string;
  approvedBy: string;
  reason: string;
  createdAt: string;
  resolvedAt: string;
}

// ── Policy check result ───────────────────────────────────────────────────────

export interface ApprovalPolicyResult {
  /** Whether manager approval is required for this action */
  required: boolean;
  /** Human-readable reason why approval is required */
  reason?: string;
  /** The approval type to request */
  approvalType?: ApprovalType;
}
