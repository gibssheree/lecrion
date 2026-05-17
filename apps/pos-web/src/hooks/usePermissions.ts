// apps/pos-web/src/hooks/usePermissions.ts
//
// Phase 9: Role-based permission checks for POS UI.
//
// Usage:
//   const { canVoid, canRefund, canDiscount, canCloseRegister } = usePermissions();
//   if (!canVoid) return null; // hide the button

import { useAuthStore } from "../store/auth.store";

const ROLE_LEVEL: Record<string, number> = {
  owner: 100,
  manager: 80,
  cashier: 60,
  inventory_staff: 50,
  support: 40,
};

function level(role: string): number {
  return ROLE_LEVEL[role] ?? 0;
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "cashier";
  const userLevel = level(role);

  return {
    role,

    // Register management
    canOpenRegister: userLevel >= level("cashier"),
    canCloseRegister: userLevel >= level("cashier"),
    canSuspendRegister: userLevel >= level("cashier"),

    // Sales
    canCreateSale: userLevel >= level("cashier"),

    // Corrections — cashier can initiate but needs manager approval above threshold
    canVoid: userLevel >= level("cashier"),
    canRefund: userLevel >= level("cashier"),
    canReturnItems: userLevel >= level("cashier"),

    // Discounts — cashier can apply small discounts; large ones need approval
    canApplyDiscount: userLevel >= level("cashier"),

    // Manager-only actions (no PIN needed — role is sufficient)
    canApproveWithoutPin: userLevel >= level("manager"),
    canViewAllReports: userLevel >= level("manager"),
    canManageProducts: userLevel >= level("manager"),
    canManageInventory: ["owner", "manager", "inventory_staff"].includes(role),
    canViewCashflow: userLevel >= level("manager"),
    canViewAnalytics: userLevel >= level("manager"),

    // Owner-only
    canManageUsers: role === "owner",
    canChangeSettings: role === "owner",

    // Platform support
    canVerifyStores: role === "support",
  };
}

export type PermissionKey = Exclude<keyof ReturnType<typeof usePermissions>, "role">;
