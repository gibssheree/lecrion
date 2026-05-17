// apps/api/src/modules/pos/pos-approval.service.spec.ts
//
// Tests for PosApprovalService — policy checks, PIN verification, inline approval.

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ManagerApprovalStatus } from '@libs/contracts/src/enums';
import { MANAGER_APPROVAL_EVENTS } from '@libs/contracts/src/events';
import { PosApprovalService } from './pos-approval.service';

// ── Harness ───────────────────────────────────────────────────────────────────

function makeHarness(
  options: {
    existingApproval?: any;
    envOverrides?: Record<string, string>;
  } = {},
) {
  // Apply env overrides before service construction
  const originalEnv: Record<string, string | undefined> = {};
  if (options.envOverrides) {
    for (const [key, value] of Object.entries(options.envOverrides)) {
      originalEnv[key] = process.env[key];
      process.env[key] = value;
    }
  }

  const prisma = {
    manager_approvals: {
      create: jest.fn().mockResolvedValue({
        id: 1,
        approval_type: 'refund',
        requested_by: 'cashier-1',
        approved_by: null,
        reason: 'test reason',
        status: ManagerApprovalStatus.PENDING,
        created_at: new Date().toISOString(),
        resolved_at: null,
      }),
      findUnique: jest.fn().mockResolvedValue(options.existingApproval ?? null),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const audit = { record: jest.fn() };
  const sync = { writeOutboxInTx: jest.fn() };

  const service = new PosApprovalService(
    prisma as any,
    audit as any,
    sync as any,
  );

  function restoreEnv() {
    if (options.envOverrides) {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  }

  return { service, prisma, audit, sync, restoreEnv };
}

// ── Policy check tests ────────────────────────────────────────────────────────

describe('PosApprovalService — policy checks', () => {
  it('refund below threshold does not require approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { REFUND_APPROVAL_THRESHOLD_IDR: '100000' },
    });
    const result = service.checkRefundPolicy(50000);
    expect(result.required).toBe(false);
    restoreEnv();
  });

  it('refund above threshold requires approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { REFUND_APPROVAL_THRESHOLD_IDR: '100000' },
    });
    const result = service.checkRefundPolicy(150000);
    expect(result.required).toBe(true);
    expect(result.approvalType).toBe('refund');
    expect(result.reason).toContain('150.000');
    restoreEnv();
  });

  it('refund exactly at threshold does not require approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { REFUND_APPROVAL_THRESHOLD_IDR: '100000' },
    });
    const result = service.checkRefundPolicy(100000);
    expect(result.required).toBe(false);
    restoreEnv();
  });

  it('void within age window does not require approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { VOID_MAX_AGE_MINUTES: '30' },
    });
    // Order created 5 minutes ago
    const recentOrder = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = service.checkVoidPolicy(recentOrder);
    expect(result.required).toBe(false);
    restoreEnv();
  });

  it('void beyond age window requires approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { VOID_MAX_AGE_MINUTES: '30' },
    });
    // Order created 60 minutes ago
    const oldOrder = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const result = service.checkVoidPolicy(oldOrder);
    expect(result.required).toBe(true);
    expect(result.approvalType).toBe('void');
    restoreEnv();
  });

  it('discount below threshold does not require approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { DISCOUNT_APPROVAL_THRESHOLD_IDR: '50000' },
    });
    const result = service.checkDiscountPolicy(30000);
    expect(result.required).toBe(false);
    restoreEnv();
  });

  it('discount above threshold requires approval', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { DISCOUNT_APPROVAL_THRESHOLD_IDR: '50000' },
    });
    const result = service.checkDiscountPolicy(75000);
    expect(result.required).toBe(true);
    expect(result.approvalType).toBe('discount_override');
    restoreEnv();
  });

  it('price override always requires approval', () => {
    const { service } = makeHarness();
    const result = service.checkPriceOverridePolicy();
    expect(result.required).toBe(true);
    expect(result.approvalType).toBe('price_override');
  });
});

// ── PIN verification tests ────────────────────────────────────────────────────

describe('PosApprovalService — PIN verification', () => {
  it('accepts correct PIN', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { MANAGER_PIN: '9999' },
    });
    expect(() => service.verifyManagerPin('9999')).not.toThrow();
    restoreEnv();
  });

  it('rejects wrong PIN', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { MANAGER_PIN: '9999' },
    });
    expect(() => service.verifyManagerPin('0000')).toThrow(ForbiddenException);
    restoreEnv();
  });

  it('rejects empty PIN', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: { MANAGER_PIN: '9999' },
    });
    expect(() => service.verifyManagerPin('')).toThrow(ForbiddenException);
    restoreEnv();
  });
});

// ── Inline approval tests ─────────────────────────────────────────────────────

describe('PosApprovalService — inline approval', () => {
  it('creates and approves in one step with correct PIN', async () => {
    const { service, prisma, audit, restoreEnv } = makeHarness({
      envOverrides: { MANAGER_PIN: '1234' },
    });

    const result = await service.inlineApprove({
      approvalType: 'refund',
      requestedBy: 'cashier-1',
      approvedBy: 'manager-1',
      reason: 'customer request',
      managerPin: '1234',
    });

    expect(prisma.manager_approvals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_type: 'refund',
          requested_by: 'cashier-1',
          approved_by: 'manager-1',
          status: ManagerApprovalStatus.APPROVED,
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: MANAGER_APPROVAL_EVENTS.APPROVED,
        resource: 'manager_approvals',
      }),
    );
    expect(result.status).toBe('approved');
    expect(result.approvedBy).toBe('manager-1');
    restoreEnv();
  });

  it('rejects inline approval with wrong PIN', async () => {
    const { service, prisma, restoreEnv } = makeHarness({
      envOverrides: { MANAGER_PIN: '1234' },
    });

    await expect(
      service.inlineApprove({
        approvalType: 'refund',
        requestedBy: 'cashier-1',
        approvedBy: 'manager-1',
        reason: 'customer request',
        managerPin: 'wrong',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.manager_approvals.create).not.toHaveBeenCalled();
    restoreEnv();
  });
});

// ── Request / approve / reject tests ─────────────────────────────────────────

describe('PosApprovalService — request and resolve', () => {
  it('creates a pending approval request', async () => {
    const { service, prisma, audit } = makeHarness();

    const result = await service.requestApproval({
      approvalType: 'void',
      requestedBy: 'cashier-1',
      reason: 'customer changed mind',
    });

    expect(prisma.manager_approvals.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          approval_type: 'void',
          requested_by: 'cashier-1',
          status: ManagerApprovalStatus.PENDING,
        }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: MANAGER_APPROVAL_EVENTS.REQUESTED,
      }),
    );
    expect(result.status).toBe('pending');
  });

  it('approves a pending request with correct PIN', async () => {
    const pendingApproval = {
      id: 5,
      approval_type: 'refund',
      status: ManagerApprovalStatus.PENDING,
      requested_by: 'cashier-1',
    };
    const { service, prisma, audit, restoreEnv } = makeHarness({
      existingApproval: pendingApproval,
      envOverrides: { MANAGER_PIN: '5678' },
    });

    const result = await service.approveRequest(5, {
      managerPin: '5678',
      approvedBy: 'manager-1',
    });

    expect(prisma.manager_approvals.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: expect.objectContaining({
        status: ManagerApprovalStatus.APPROVED,
        approved_by: 'manager-1',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: MANAGER_APPROVAL_EVENTS.APPROVED }),
    );
    expect(result.status).toBe('approved');
    restoreEnv();
  });

  it('rejects approval with wrong PIN', async () => {
    const pendingApproval = {
      id: 5,
      approval_type: 'refund',
      status: ManagerApprovalStatus.PENDING,
    };
    const { service, prisma, restoreEnv } = makeHarness({
      existingApproval: pendingApproval,
      envOverrides: { MANAGER_PIN: '5678' },
    });

    await expect(
      service.approveRequest(5, {
        managerPin: 'wrong',
        approvedBy: 'manager-1',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.manager_approvals.update).not.toHaveBeenCalled();
    restoreEnv();
  });

  it('rejects approval of already-resolved request', async () => {
    const approvedApproval = {
      id: 5,
      approval_type: 'refund',
      status: ManagerApprovalStatus.APPROVED,
    };
    const { service, restoreEnv } = makeHarness({
      existingApproval: approvedApproval,
      envOverrides: { MANAGER_PIN: '1234' },
    });

    await expect(
      service.approveRequest(5, {
        managerPin: '1234',
        approvedBy: 'manager-1',
      }),
    ).rejects.toThrow(BadRequestException);
    restoreEnv();
  });

  it('rejects approval of non-existent request', async () => {
    const { service } = makeHarness({ existingApproval: null });

    await expect(
      service.approveRequest(999, {
        managerPin: '1234',
        approvedBy: 'manager-1',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects a pending request', async () => {
    const pendingApproval = {
      id: 7,
      approval_type: 'void',
      status: ManagerApprovalStatus.PENDING,
    };
    const { service, prisma, audit } = makeHarness({
      existingApproval: pendingApproval,
    });

    const result = await service.rejectRequest(7, {
      rejectedBy: 'manager-1',
      reason: 'policy violation',
    });

    expect(prisma.manager_approvals.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({
        status: ManagerApprovalStatus.REJECTED,
        approved_by: 'manager-1',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: MANAGER_APPROVAL_EVENTS.REJECTED }),
    );
    expect(result.status).toBe('rejected');
  });
});

// ── Threshold getter ──────────────────────────────────────────────────────────

describe('PosApprovalService — thresholds', () => {
  it('returns configured thresholds', () => {
    const { service, restoreEnv } = makeHarness({
      envOverrides: {
        REFUND_APPROVAL_THRESHOLD_IDR: '200000',
        DISCOUNT_APPROVAL_THRESHOLD_IDR: '75000',
        VOID_MAX_AGE_MINUTES: '45',
      },
    });

    const thresholds = service.getThresholds();
    expect(thresholds.refundApprovalThresholdIdr).toBe(200000);
    expect(thresholds.discountApprovalThresholdIdr).toBe(75000);
    expect(thresholds.voidMaxAgeMinutes).toBe(45);
    restoreEnv();
  });
});
