// apps/pos-web/src/hooks/useStoreCalcPolicy.ts
//
// Fetches the store's calculation policy (tax rate, service charge rate,
// tax mode) from GET /api/stores/calc-policy.
//
// Used by PaymentDrawer to display tax/service charge amounts before checkout.
// Falls back to zero-rate policy when the API is unavailable or not yet loaded.

import { useEffect, useState } from "react";
import { getStoreCalcPolicy, StoreCalcPolicy } from "../services/api";

const ZERO_POLICY: StoreCalcPolicy = {
  taxRate: 0,
  serviceChargeRate: 0,
  taxMode: "exclusive",
  discountMaxWithoutApproval: 0,
};

interface UseStoreCalcPolicyResult {
  policy: StoreCalcPolicy | null;
  loading: boolean;
  error: string | null;
}

export function useStoreCalcPolicy(): UseStoreCalcPolicyResult {
  const [policy, setPolicy] = useState<StoreCalcPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await getStoreCalcPolicy();
        if (!cancelled) {
          setPolicy(result);
          setError(null);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          // Non-fatal: fall back to zero policy so checkout still works
          setPolicy(ZERO_POLICY);
          setError(
            err instanceof Error ? err.message : "Failed to load calc policy",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { policy, loading, error };
}
