// apps/api/src/modules/pos/pos-calculation.service.ts
//
// PosCalculationService — single source of truth for all POS sale math.
//
// Rules:
//   1. Subtotal is always computed from DB prices × qty. Frontend prices are ignored.
//   2. Order discount is applied before tax and service charge.
//   3. Tax mode:
//      - exclusive (default): tax is added on top of (subtotal - discount)
//      - inclusive: tax is already embedded in the subtotal; no addition
//   4. Service charge is always added on top (never inclusive).
//   5. All money values are rounded to 2 decimal places using banker-safe rounding.
//   6. Discount > 0 requires a non-empty reason.
//   7. Discount cannot exceed subtotal.
//   8. Price override is blocked — unitPrice from DTO is ignored.
//   9. Payment allocation total must equal computed total.
//  10. Cash paidAmount must be >= cash amount.

import { BadRequestException, Injectable } from '@nestjs/common';
import { StoresService } from '../stores/stores.service';

// ── Store calculation policy ──────────────────────────────────────────────────

export interface StoreCalcPolicy {
  /** Tax rate as a decimal fraction, e.g. 0.11 for 11% */
  taxRate: number;
  /** Service charge rate as a decimal fraction, e.g. 0.05 for 5% */
  serviceChargeRate: number;
  /** Tax mode: exclusive (added on top) or inclusive (embedded in price) */
  taxMode: 'exclusive' | 'inclusive';
  /** Maximum discount amount allowed without manager approval (0 = no limit) */
  discountMaxWithoutApproval: number;
}

/** Zero-rate policy for use in unit tests — no tax, no service charge. */
export const ZERO_POLICY_FOR_TEST: StoreCalcPolicy = {
  taxRate: 0,
  serviceChargeRate: 0,
  taxMode: 'exclusive',
  discountMaxWithoutApproval: 0,
};

// Setting keys stored in store_settings
export const CALC_POLICY_KEYS = {
  TAX_RATE: 'calc.tax_rate',
  SERVICE_CHARGE_RATE: 'calc.service_charge_rate',
  TAX_MODE: 'calc.tax_mode',
  DISCOUNT_MAX_WITHOUT_APPROVAL: 'calc.discount_max_without_approval',
} as const;

// ── Calculation input/output ──────────────────────────────────────────────────

export interface CalcLineInput {
  productId: number;
  name: string;
  qty: number;
  /** DB price — always used; DTO unitPrice is ignored */
  dbPrice: number;
  /** Optional line-level discount amount (must be <= lineSubtotal) */
  lineDiscountAmount?: number;
}

export interface CalcLineResult {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
  lineSubtotal: number;
  lineDiscountAmount: number;
  lineTotal: number;
}

export interface CalcInput {
  lines: CalcLineInput[];
  /** Order-level discount amount (applied after line discounts) */
  orderDiscountAmount?: number;
  /** Reason required when any discount > 0 */
  discountReason?: string;
  /**
   * Tax amount override from DTO.
   * If provided, used directly (frontend calculated from store policy).
   * If omitted, calculated from store policy taxRate.
   */
  taxAmountOverride?: number;
  /**
   * Service charge amount override from DTO.
   * If provided, used directly.
   * If omitted, calculated from store policy serviceChargeRate.
   */
  serviceChargeAmountOverride?: number;
  /** Tax mode override from DTO; falls back to store policy */
  taxModeOverride?: 'exclusive' | 'inclusive';
}

export interface CalcResult {
  lines: CalcLineResult[];
  /** Sum of all lineSubtotals (before any discounts) */
  grossSubtotal: number;
  /** Sum of all line discounts */
  totalLineDiscount: number;
  /** Subtotal after line discounts */
  subtotal: number;
  /** Order-level discount */
  orderDiscountAmount: number;
  /** Subtotal after all discounts */
  discountedSubtotal: number;
  /** Tax amount (0 if inclusive mode) */
  taxAmount: number;
  /** Tax mode used */
  taxMode: 'exclusive' | 'inclusive';
  /** Service charge amount */
  serviceChargeAmount: number;
  /** Final total */
  total: number;
  /** Discount reason (passed through) */
  discountReason?: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PosCalculationService {
  constructor(private readonly stores: StoresService) {}

  /**
   * Load the store's calculation policy from store_settings.
   * Returns safe defaults when settings are not configured.
   */
  async getPolicy(storeId = 'default-store'): Promise<StoreCalcPolicy> {
    const settings = await this.stores.getSettings(storeId);

    const taxRate = this.parseRate(settings[CALC_POLICY_KEYS.TAX_RATE], 0);
    const serviceChargeRate = this.parseRate(
      settings[CALC_POLICY_KEYS.SERVICE_CHARGE_RATE],
      0,
    );
    const rawTaxMode = settings[CALC_POLICY_KEYS.TAX_MODE];
    const taxMode: 'exclusive' | 'inclusive' =
      rawTaxMode === 'inclusive' ? 'inclusive' : 'exclusive';
    const discountMaxWithoutApproval = this.parseAmount(
      settings[CALC_POLICY_KEYS.DISCOUNT_MAX_WITHOUT_APPROVAL],
      0,
    );

    return { taxRate, serviceChargeRate, taxMode, discountMaxWithoutApproval };
  }

  /**
   * Compute the full sale breakdown.
   *
   * Validates:
   *   - line discount <= line subtotal
   *   - order discount <= subtotal (after line discounts)
   *   - discount reason required when any discount > 0
   *   - total >= 0
   *
   * Does NOT validate payment allocation — that is done in PosSalesService
   * because it requires the payment lines.
   */
  async calculate(
    input: CalcInput,
    storeId = 'default-store',
  ): Promise<CalcResult> {
    const policy = await this.getPolicy(storeId);
    return this.calculateWithPolicy(input, policy);
  }

  /**
   * Synchronous calculation given an already-loaded policy.
   * Used inside transactions where async calls are not safe.
   */
  calculateWithPolicy(input: CalcInput, policy: StoreCalcPolicy): CalcResult {
    // ── Line-level calculation ──────────────────────────────────────────────
    let grossSubtotal = 0;
    let totalLineDiscount = 0;

    const lines: CalcLineResult[] = input.lines.map((line) => {
      const unitPrice = this.round(Number(line.dbPrice));
      const lineSubtotal = this.round(unitPrice * line.qty);
      const lineDiscountAmount = this.round(
        Math.max(0, Number(line.lineDiscountAmount ?? 0)),
      );

      if (lineDiscountAmount > lineSubtotal) {
        throw new BadRequestException(
          `Line discount (${lineDiscountAmount}) for "${line.name}" exceeds line subtotal (${lineSubtotal})`,
        );
      }

      const lineTotal = this.round(lineSubtotal - lineDiscountAmount);
      grossSubtotal = this.round(grossSubtotal + lineSubtotal);
      totalLineDiscount = this.round(totalLineDiscount + lineDiscountAmount);

      return {
        productId: line.productId,
        name: line.name,
        qty: line.qty,
        unitPrice,
        lineSubtotal,
        lineDiscountAmount,
        lineTotal,
      };
    });

    // ── Subtotal after line discounts ───────────────────────────────────────
    const subtotal = this.round(grossSubtotal - totalLineDiscount);

    // ── Order-level discount ────────────────────────────────────────────────
    const orderDiscountAmount = this.round(
      Math.max(0, Number(input.orderDiscountAmount ?? 0)),
    );

    if (orderDiscountAmount > subtotal) {
      throw new BadRequestException(
        `Order discount (${orderDiscountAmount}) cannot exceed subtotal (${subtotal})`,
      );
    }

    // ── Discount reason validation ──────────────────────────────────────────
    const totalDiscount = this.round(totalLineDiscount + orderDiscountAmount);
    const discountReason = (input.discountReason ?? '').trim() || undefined;

    if (totalDiscount > 0 && !discountReason) {
      throw new BadRequestException(
        'discountReason is required when discount amount is greater than 0',
      );
    }

    // ── Discounted subtotal ─────────────────────────────────────────────────
    const discountedSubtotal = this.round(subtotal - orderDiscountAmount);

    // ── Tax ─────────────────────────────────────────────────────────────────
    const taxMode: 'exclusive' | 'inclusive' =
      input.taxModeOverride ?? policy.taxMode;

    let taxAmount: number;
    if (input.taxAmountOverride !== undefined) {
      // Frontend supplied an explicit amount — validate it is non-negative
      taxAmount = this.round(Math.max(0, Number(input.taxAmountOverride)));
    } else if (taxMode === 'inclusive') {
      // Tax is embedded in prices — no addition to total
      taxAmount = 0;
    } else {
      // Exclusive: compute from policy rate
      taxAmount = this.round(discountedSubtotal * policy.taxRate);
    }

    // ── Service charge ──────────────────────────────────────────────────────
    let serviceChargeAmount: number;
    if (input.serviceChargeAmountOverride !== undefined) {
      serviceChargeAmount = this.round(
        Math.max(0, Number(input.serviceChargeAmountOverride)),
      );
    } else {
      serviceChargeAmount = this.round(
        discountedSubtotal * policy.serviceChargeRate,
      );
    }

    // ── Total ───────────────────────────────────────────────────────────────
    const total = this.round(
      discountedSubtotal + taxAmount + serviceChargeAmount,
    );

    if (total < 0) {
      throw new BadRequestException('Sale total cannot be negative');
    }

    return {
      lines,
      grossSubtotal,
      totalLineDiscount,
      subtotal,
      orderDiscountAmount,
      discountedSubtotal,
      taxAmount,
      taxMode,
      serviceChargeAmount,
      total,
      discountReason,
    };
  }

  /**
   * Validate payment allocation against computed total.
   * Separated from calculate() so it can be called after payment lines are built.
   */
  validatePaymentAllocation(
    payments: Array<{ method: string; amount: number; paidAmount?: number }>,
    total: number,
  ): void {
    const allocatedTotal = this.round(
      payments.reduce((sum, p) => sum + Number(p.amount), 0),
    );
    if (allocatedTotal !== total) {
      throw new BadRequestException(
        `Payment total (${allocatedTotal}) must equal sale total (${total})`,
      );
    }

    for (const p of payments) {
      const lineAmount = Number(p.amount);
      if (lineAmount < 0) {
        throw new BadRequestException(
          `Payment amount for ${p.method} cannot be negative`,
        );
      }
      if (this.isCash(p.method)) {
        const linePaid = Number(p.paidAmount ?? p.amount);
        if (linePaid < lineAmount) {
          throw new BadRequestException(
            `Cash received (${linePaid}) is less than cash amount (${lineAmount})`,
          );
        }
      }
    }
  }

  /** Centralized money rounding — 2 decimal places, half-up. */
  round(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  isCash(method: string): boolean {
    return method.trim().toLowerCase() === 'cash';
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private parseRate(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const n = parseFloat(raw);
    if (isNaN(n) || n < 0 || n > 1) return fallback;
    return n;
  }

  private parseAmount(raw: string | undefined, fallback: number): number {
    if (!raw) return fallback;
    const n = parseFloat(raw);
    if (isNaN(n) || n < 0) return fallback;
    return n;
  }
}
