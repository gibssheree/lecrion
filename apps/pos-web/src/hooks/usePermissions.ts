// apps/pos-web/src/hooks/usePermissions.ts
//
// Role-based permission checks for POS UI.
//
// Hierarchy (top → bottom):
//   support  120  — Lecrion platform team (developer/system owner)
//   owner    100  — merchant owner
//   manager  80   — outlet manager
//   cashier  60   — cashier
//   inventory_staff 50
//
// Support is intentionally placed ABOVE owner because they own the system,
// but their permissions are restricted to platform-level operations:
// merchant management, verification, LLM platform config, audit, health.
// They explicitly DO NOT have access to merchant-internal data
// (cashflow, invoices, sale-level reports).
//
// Usage:
//   const { canVoid, canRefund, canDiscount, canCloseRegister } = usePermissions();
//   if (!canVoid) return null; // hide the button

import { useAuthStore } from "../store/auth.store";

const ROLE_LEVEL: Record<string, number> = {
  support: 120,
  owner: 100,
  manager: 80,
  cashier: 60,
  inventory_staff: 50,
};

function level(role: string): number {
  return ROLE_LEVEL[role] ?? 0;
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "cashier";
  const userLevel = level(role);
  const isSupport = role === "support";

  return {
    role,
    isSupport,

    // ── Merchant operational actions ────────────────────────────────────────
    // Support intentionally CANNOT do these — these belong to the merchant.
    canOpenRegister: !isSupport && userLevel >= level("cashier"),
    canCloseRegister: !isSupport && userLevel >= level("cashier"),
    canSuspendRegister: !isSupport && userLevel >= level("cashier"),
    canCreateSale: !isSupport && userLevel >= level("cashier"),
    canVoid: !isSupport && userLevel >= level("cashier"),
    canRefund: !isSupport && userLevel >= level("cashier"),
    canReturnItems: !isSupport && userLevel >= level("cashier"),
    canApplyDiscount: !isSupport && userLevel >= level("cashier"),

    // ── Merchant management actions ────────────────────────────────────────
    // Support cannot view merchant-internal financials, but CAN manage products
    // (e.g. when assisting onboarding) — gated case-by-case.
    canApproveWithoutPin: !isSupport && userLevel >= level("manager"),
    canViewAllReports: !isSupport && userLevel >= level("manager"),
    canManageProducts: !isSupport && userLevel >= level("manager"),
    canManageInventory:
      !isSupport && ["owner", "manager", "inventory_staff"].includes(role),
    canViewCashflow: !isSupport && userLevel >= level("manager"),
    canViewAnalytics: !isSupport && userLevel >= level("manager"),

    // ── Merchant-owner actions ─────────────────────────────────────────────
    canManageUsers: role === "owner",
    canChangeSettings: role === "owner",

    // ── Platform support actions (support-only) ───────────────────────────
    canVerifyStores: isSupport,
    canManageAllStores: isSupport,
    canConfigureLlmPlatform: isSupport,
    canViewSystemHealth: isSupport,
    canViewAuditLogs: isSupport,
    canImpersonateOwner: isSupport,
  };
}

export type PermissionKey = Exclude<
  keyof ReturnType<typeof usePermissions>,
  "role" | "isSupport"
>;
