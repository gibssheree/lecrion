// apps/api/src/modules/pos/pos-calculation.service.spec.ts
//
// Unit tests for PosCalculationService.
// All tests use calculateWithPolicy() (synchronous) with an explicit policy
// so no DB or async calls are needed.

import { BadRequestException } from '@nestjs/common';
import {
  PosCalculationService,
  StoreCalcPolicy,
} from './pos-calculation.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeService(): PosCalculationService {
  // StoresService is only needed for getPolicy() — not used in these tests
  return new PosCalculationService(null as any);
}

const ZERO_POLICY: StoreCalcPolicy = {
  taxRate: 0,
  serviceChargeRate: 0,
  taxMode: 'exclusive',
  discountMaxWithoutApproval: 0,
};

const TAX_11_POLICY: StoreCalcPolicy = {
  taxRate: 0.11,
  serviceChargeRate: 0,
  taxMode: 'exclusive',
  discountMaxWithoutApproval: 0,
};

const SC_5_POLICY: StoreCalcPolicy = {
  taxRate: 0,
  serviceChargeRate: 0.05,
  taxMode: 'exclusive',
  discountMaxWithoutApproval: 0,
};

const INCLUSIVE_TAX_POLICY: StoreCalcPolicy = {
  taxRate: 0.11,
  serviceChargeRate: 0,
  taxMode: 'inclusive',
  discountMaxWithoutApproval: 0,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PosCalculationService', () => {
  let svc: PosCalculationService;

  beforeEach(() => {
    svc = makeService();
  });

  // ── Basic subtotal ─────────────────────────────────────────────────────────

  describe('subtotal from DB prices', () => {
    it('computes subtotal as sum of (dbPrice × qty)', () => {
      const result = svc.calculateWithPolicy(
        {
          lines: [
            { productId: 1, name: 'A', qty: 2, dbPrice: 10000 },
            { productId: 2, name: 'B', qty: 3, dbPrice: 5000 },
          ],
        },
        ZERO_POLICY,
      );

      expect(result.grossSubtotal).toBe(35000);
      expect(result.subtotal).toBe(35000);
      expect(result.total).toBe(35000);
    });

    it('ignores any unitPrice override — only dbPrice is used', () => {
      // The DTO unitPrice field is not passed to calculateWithPolicy;
      // only dbPrice (from DB) is accepted. This test confirms the service
      // uses dbPrice exclusively.
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 10000 }],
        },
        ZERO_POLICY,
      );

      expect(result.lines[0].unitPrice).toBe(10000);
      expect(result.total).toBe(10000);
    });
  });

  // ── Order discount ─────────────────────────────────────────────────────────

  describe('order discount', () => {
    it('reduces total by discount amount', () => {
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 20000 }],
          orderDiscountAmount: 5000,
          discountReason: 'Member discount',
        },
        ZERO_POLICY,
      );

      expect(result.subtotal).toBe(20000);
      expect(result.orderDiscountAmount).toBe(5000);
      expect(result.discountedSubtotal).toBe(15000);
      expect(result.total).toBe(15000);
      expect(result.discountReason).toBe('Member discount');
    });

    it('requires discountReason when discount > 0', () => {
      expect(() =>
        svc.calculateWithPolicy(
          {
            lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 20000 }],
            orderDiscountAmount: 5000,
            // discountReason omitted
          },
          ZERO_POLICY,
        ),
      ).toThrow(BadRequestException);
    });

    it('requires discountReason when discount > 0 (empty string)', () => {
      expect(() =>
        svc.calculateWithPolicy(
          {
            lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 20000 }],
            orderDiscountAmount: 5000,
            discountReason: '   ', // whitespace only
          },
          ZERO_POLICY,
        ),
      ).toThrow(BadRequestException);
    });

    it('does NOT require discountReason when discount is 0', () => {
      expect(() =>
        svc.calculateWithPolicy(
          {
            lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 20000 }],
            orderDiscountAmount: 0,
          },
          ZERO_POLICY,
        ),
      ).not.toThrow();
    });

    it('rejects discount exceeding subtotal', () => {
      expect(() =>
        svc.calculateWithPolicy(
          {
            lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 20000 }],
            orderDiscountAmount: 25000,
            discountReason: 'Too much',
          },
          ZERO_POLICY,
        ),
      ).toThrow(BadRequestException);
    });

    it('allows discount equal to subtotal (100% discount)', () => {
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 20000 }],
          orderDiscountAmount: 20000,
          discountReason: 'Full comp',
        },
        ZERO_POLICY,
      );

      expect(result.total).toBe(0);
    });
  });

  // ── Line discount ──────────────────────────────────────────────────────────

  describe('line discount', () => {
    it('reduces line total and subtotal', () => {
      const result = svc.calculateWithPolicy(
        {
          lines: [
            {
              productId: 1,
              name: 'A',
              qty: 2,
              dbPrice: 10000,
              lineDiscountAmount: 2000,
            },
          ],
          discountReason: 'Line promo',
        },
        ZERO_POLICY,
      );

      expect(result.lines[0].lineSubtotal).toBe(20000);
      expect(result.lines[0].lineDiscountAmount).toBe(2000);
      expect(result.lines[0].lineTotal).toBe(18000);
      expect(result.subtotal).toBe(18000);
      expect(result.totalLineDiscount).toBe(2000);
    });

    it('rejects line discount exceeding line subtotal', () => {
      expect(() =>
        svc.calculateWithPolicy(
          {
            lines: [
              {
                productId: 1,
                name: 'A',
                qty: 1,
                dbPrice: 10000,
                lineDiscountAmount: 15000,
              },
            ],
            discountReason: 'Too much',
          },
          ZERO_POLICY,
        ),
      ).toThrow(BadRequestException);
    });
  });

  // ── Tax calculation ────────────────────────────────────────────────────────

  describe('tax calculation', () => {
    it('adds exclusive tax on top of discounted subtotal', () => {
      // subtotal = 100000, tax = 11% = 11000, total = 111000
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
        },
        TAX_11_POLICY,
      );

      expect(result.taxAmount).toBe(11000);
      expect(result.taxMode).toBe('exclusive');
      expect(result.total).toBe(111000);
    });

    it('does NOT add tax in inclusive mode', () => {
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
        },
        INCLUSIVE_TAX_POLICY,
      );

      expect(result.taxAmount).toBe(0);
      expect(result.taxMode).toBe('inclusive');
      expect(result.total).toBe(100000);
    });

    it('uses taxAmountOverride when provided', () => {
      // Policy says 11% but DTO overrides to 5000
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
          taxAmountOverride: 5000,
        },
        TAX_11_POLICY,
      );

      expect(result.taxAmount).toBe(5000);
      expect(result.total).toBe(105000);
    });

    it('applies tax after discount', () => {
      // subtotal = 100000, discount = 10000, discounted = 90000
      // tax = 11% of 90000 = 9900, total = 99900
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
          orderDiscountAmount: 10000,
          discountReason: 'Promo',
        },
        TAX_11_POLICY,
      );

      expect(result.discountedSubtotal).toBe(90000);
      expect(result.taxAmount).toBe(9900);
      expect(result.total).toBe(99900);
    });
  });

  // ── Service charge ─────────────────────────────────────────────────────────

  describe('service charge', () => {
    it('adds service charge on top of discounted subtotal', () => {
      // subtotal = 100000, sc = 5% = 5000, total = 105000
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
        },
        SC_5_POLICY,
      );

      expect(result.serviceChargeAmount).toBe(5000);
      expect(result.total).toBe(105000);
    });

    it('uses serviceChargeAmountOverride when provided', () => {
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
          serviceChargeAmountOverride: 3000,
        },
        SC_5_POLICY,
      );

      expect(result.serviceChargeAmount).toBe(3000);
      expect(result.total).toBe(103000);
    });
  });

  // ── Combined tax + service charge ──────────────────────────────────────────

  describe('combined tax and service charge', () => {
    it('adds both tax and service charge', () => {
      // subtotal = 100000, tax 11% = 11000, sc 5% = 5000, total = 116000
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 1, dbPrice: 100000 }],
        },
        {
          taxRate: 0.11,
          serviceChargeRate: 0.05,
          taxMode: 'exclusive',
          discountMaxWithoutApproval: 0,
        },
      );

      expect(result.taxAmount).toBe(11000);
      expect(result.serviceChargeAmount).toBe(5000);
      expect(result.total).toBe(116000);
    });
  });

  // ── Rounding ───────────────────────────────────────────────────────────────

  describe('rounding', () => {
    it('rounds to 2 decimal places', () => {
      // 3 × 3333 = 9999, tax 11% = 1099.89, total = 9999 + 1099.89 = 11098.89
      const result = svc.calculateWithPolicy(
        {
          lines: [{ productId: 1, name: 'A', qty: 3, dbPrice: 3333 }],
        },
        TAX_11_POLICY,
      );

      expect(result.taxAmount).toBe(1099.89);
      expect(result.total).toBe(11098.89);
    });

    it('round() is consistent with Math.round half-up', () => {
      expect(svc.round(1.005)).toBe(1.01);
      expect(svc.round(1.004)).toBe(1.0);
      expect(svc.round(0.1 + 0.2)).toBe(0.3);
    });
  });

  // ── Payment allocation validation ──────────────────────────────────────────

  describe('validatePaymentAllocation', () => {
    it('passes when payment sum equals total', () => {
      expect(() =>
        svc.validatePaymentAllocation(
          [{ method: 'Cash', amount: 20000, paidAmount: 20000 }],
          20000,
        ),
      ).not.toThrow();
    });

    it('rejects when payment sum does not equal total', () => {
      expect(() =>
        svc.validatePaymentAllocation(
          [{ method: 'Cash', amount: 15000, paidAmount: 15000 }],
          20000,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejects when cash paidAmount < cash amount', () => {
      expect(() =>
        svc.validatePaymentAllocation(
          [{ method: 'Cash', amount: 20000, paidAmount: 10000 }],
          20000,
        ),
      ).toThrow(BadRequestException);
    });

    it('passes when cash paidAmount > cash amount (change scenario)', () => {
      expect(() =>
        svc.validatePaymentAllocation(
          [{ method: 'Cash', amount: 20000, paidAmount: 50000 }],
          20000,
        ),
      ).not.toThrow();
    });

    it('does not check paidAmount for non-cash methods', () => {
      expect(() =>
        svc.validatePaymentAllocation(
          [{ method: 'QRIS', amount: 20000 }],
          20000,
        ),
      ).not.toThrow();
    });

    it('rejects negative payment amount', () => {
      expect(() =>
        svc.validatePaymentAllocation(
          [{ method: 'Cash', amount: -1000, paidAmount: 0 }],
          20000,
        ),
      ).toThrow(BadRequestException);
    });
  });

  // ── isCash helper ──────────────────────────────────────────────────────────

  describe('isCash', () => {
    it('returns true for "Cash" (case-insensitive)', () => {
      expect(svc.isCash('Cash')).toBe(true);
      expect(svc.isCash('cash')).toBe(true);
      expect(svc.isCash('CASH')).toBe(true);
    });

    it('returns false for non-cash methods', () => {
      expect(svc.isCash('QRIS')).toBe(false);
      expect(svc.isCash('Transfer')).toBe(false);
      expect(svc.isCash('GoPay')).toBe(false);
    });
  });
});
