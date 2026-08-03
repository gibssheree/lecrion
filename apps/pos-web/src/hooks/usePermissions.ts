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
import { useSupportPreviewStore } from "../store/support-preview.store";

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
  const isPreviewActive = useSupportPreviewStore((s) => s.isPreviewActive);
  const role = user?.role ?? "cashier";
  const userLevel = level(role);
  const isSupport = role === "support";
  const isSupportInPreview = isSupport && isPreviewActive;

  return {
    role,
    isSupport,
    isSupportInPreview,

    // ── Merchant operational actions ────────────────────────────────────────
    canOpenRegister: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canCloseRegister: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canSuspendRegister: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canCreateSale: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canVoid: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canRefund: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canReturnItems: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),
    canApplyDiscount: isSupportInPreview || (!isSupport && userLevel >= level("cashier")),

    // ── Merchant management actions ────────────────────────────────────────
    canApproveWithoutPin: isSupportInPreview || (!isSupport && userLevel >= level("manager")),
    canViewAllReports: isSupportInPreview || (!isSupport && userLevel >= level("manager")),
    canManageProducts: isSupportInPreview || (!isSupport && userLevel >= level("manager")),
    canManageInventory:
      isSupportInPreview || (!isSupport && ["owner", "manager", "inventory_staff"].includes(role)),
    canViewCashflow: isSupportInPreview || (!isSupport && userLevel >= level("manager")),
    canViewAnalytics: isSupportInPreview || (!isSupport && userLevel >= level("manager")),

    // ── Merchant-owner actions ─────────────────────────────────────────────
    canManageUsers: isSupportInPreview || role === "owner",
    canChangeSettings: isSupportInPreview || role === "owner",

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
