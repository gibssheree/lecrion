/**
 * useTenderLines — manages multiple payment tender lines for split payment.
 *
 * Rules:
 * - Each line has a method, an allocated amount, and (for cash) a paidAmount.
 * - Sum of line amounts must equal the final total before checkout is allowed.
 * - Cash paidAmount must be >= cash amount.
 * - Non-cash paidAmount is always equal to amount (no physical overpay).
 * - A single-method sale is just one tender line — same code path.
 */

import { useState, useCallback } from "react";

export interface TenderLine {
  id: string; // local key for React
  method: string;
  amount: string; // string so input is editable; parse to number on submit
  paidAmount: string; // only meaningful for Cash; empty = exact
  reference: string; // for QRIS/Transfer reference
}

function newLine(method: string, amount = ""): TenderLine {
  return {
    id: `${method}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    method,
    amount,
    paidAmount: "",
    reference: "",
  };
}

export function useTenderLines(total: number) {
  const [lines, setLines] = useState<TenderLine[]>([newLine("Cash")]);

  // ── Derived values ────────────────────────────────────────────────────────

  const allocatedTotal = lines.reduce(
    (sum, l) => sum + (parseFloat(l.amount) || 0),
    0,
  );
  const remaining = Math.max(0, total - allocatedTotal);
  const isFullyAllocated = total > 0 && Math.abs(allocatedTotal - total) < 0.01;

  // For each cash line: paidAmount defaults to amount when empty
  const cashLines = lines.filter((l) => l.method.toLowerCase() === "cash");
  const totalCashPaid = cashLines.reduce((sum, l) => {
    const amt = parseFloat(l.amount) || 0;
    const paid = parseFloat(l.paidAmount) || amt;
    return sum + paid;
  }, 0);
  const totalCashAmount = cashLines.reduce(
    (sum, l) => sum + (parseFloat(l.amount) || 0),
    0,
  );
  const change = Math.max(0, totalCashPaid - totalCashAmount);

  // Validation: cash paidAmount must be >= cash amount
  const cashUnderPaid = cashLines.some((l) => {
    const amt = parseFloat(l.amount) || 0;
    const paid = parseFloat(l.paidAmount) || amt;
    return amt > 0 && paid < amt;
  });

  const canPay =
    isFullyAllocated &&
    !cashUnderPaid &&
    lines.every((l) => parseFloat(l.amount) > 0);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const setLineField = useCallback(
    (id: string, field: keyof TenderLine, value: string) => {
      setLines((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
      );
    },
    [],
  );

  const addLine = useCallback(
    (method: string) => {
      setLines((prev) => {
        // Auto-fill remaining amount for the new line
        const allocated = prev.reduce(
          (sum, l) => sum + (parseFloat(l.amount) || 0),
          0,
        );
        const rem = Math.max(0, total - allocated);
        return [...prev, newLine(method, rem > 0 ? String(rem) : "")];
      });
    },
    [total],
  );

  const removeLine = useCallback((id: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev; // always keep at least one line
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  /** Switch to a single method — replaces all lines */
  const setSingleMethod = useCallback(
    (method: string) => {
      setLines([newLine(method, total > 0 ? String(total) : "")]);
    },
    [total],
  );

  /** Fill the last line's amount to cover remaining */
  const fillRemaining = useCallback(
    (id: string) => {
      setLines((prev) => {
        const allocated = prev
          .filter((l) => l.id !== id)
          .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
        const rem = Math.max(0, total - allocated);
        return prev.map((l) =>
          l.id === id ? { ...l, amount: String(rem) } : l,
        );
      });
    },
    [total],
  );

  const reset = useCallback(
    (method = "Cash") => {
      setLines([newLine(method, total > 0 ? String(total) : "")]);
    },
    [total],
  );

  /** Build the payments array for CreatePosSaleRequest */
  const buildPayments = useCallback(() => {
    return lines.map((l) => {
      const amount = parseFloat(l.amount) || 0;
      const isCash = l.method.toLowerCase() === "cash";
      const paidAmount = isCash ? parseFloat(l.paidAmount) || amount : amount;
      return {
        method: l.method,
        amount,
        paidAmount,
        reference: l.reference || undefined,
      };
    });
  }, [lines]);

  return {
    lines,
    allocatedTotal,
    remaining,
    isFullyAllocated,
    change,
    cashUnderPaid,
    canPay,
    setLineField,
    addLine,
    removeLine,
    setSingleMethod,
    fillRemaining,
    reset,
    buildPayments,
  };
}
