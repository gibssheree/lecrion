# Business Vertical Navigation Architecture Plan

_Created: 2026-05-16_

## 1. Problem

Lecrion must not show the same sidebar for every tenant/store.

A restaurant needs tables, KDS, menus, recipes, and raw ingredient stock. A warehouse needs branch, cluster, bin/location stock, receiving, picking, packing, and transfers. A generic retail shop needs barcode, variants, stock opname, purchase/receiving, and invoices.

If every module is shown to every tenant, system analysts, operators, and owners will see features that do not match their business. The backend can still contain all modules, but the frontend must show modules based on the tenant/store's verified business category and enabled capabilities.

## 2. Reference Basis

Use official industry classification as the basis, then compress it into product-friendly Lecrion verticals.

External references:

- U.S. BLS NAICS overview: https://www.bls.gov/ces/naics/
- U.S. BLS industries by NAICS code: https://www.bls.gov/iag/tgs/iag_index_naics.htm
- NAICS sector list reference: https://www.naics.com/six-digit-naics/
- BEA goods-producing and services-producing industries: https://www.bea.gov/help/faq/182

NAICS sectors support the major groupings used here: retail trade, wholesale trade, transportation and warehousing, manufacturing, construction, health care, accommodation and food services, and other services.

## 3. Product Rule

Backend owns the truth. Frontend only renders what backend says is enabled.

Do not hardcode:

```ts
businessType === "restaurant" || businessType === "cafe"
```

in sidebar code long term.

Instead, backend returns:

```json
{
  "storeId": "default-store",
  "businessVertical": "restaurant_cafe",
  "verificationStatus": "verified",
  "enabledModules": [
    "core.dashboard",
    "core.pos",
    "core.inventory",
    "core.invoices",
    "core.reports",
    "fnb.tables",
    "fnb.kds",
    "fnb.recipes"
  ]
}
```

Frontend sidebar items declare required modules:

```ts
{
  label: "KDS / Dapur",
  to: "/kds",
  requiredModule: "fnb.kds"
}
```

If the module is not in `enabledModules`, the menu item is hidden and the route is blocked.

## 4. Supported Business Categories

These are the first 10 Lecrion business categories. `general` is the fallback for mixed or unverified businesses.

| Category key | Display name | Source mapping | Core vertical needs |
| --- | --- | --- | --- |
| `general` | General / Mixed Business | Fallback for unclear or mixed sectors | Core POS, inventory, invoices, reports |
| `retail` | Retail Store | NAICS Retail Trade | Barcode, variants, shelf stock, stock opname, customer sales |
| `grocery_minimarket` | Grocery / Minimarket | Retail subset | Fast barcode checkout, expiry/batch later, low-stock alerts, supplier purchase |
| `restaurant_cafe` | Restaurant / Cafe | Accommodation and Food Services | Tables, KDS, recipes/BOM, raw ingredients, dine-in/takeaway |
| `wholesale_distribution` | Wholesale / Distribution | Wholesale Trade | Customer pricing tiers, bulk orders, delivery notes, receivables |
| `warehouse_logistics` | Warehouse / Logistics | Transportation and Warehousing | Multi-warehouse, branch, cluster, bin/location, receiving, picking, dispatch |
| `manufacturing` | Manufacturing / Production | Manufacturing | BOM, production order, raw material issue, finished goods, variance |
| `construction_materials` | Building Materials / Project Supply | Construction + retail/wholesale material trade | Unit conversion, project/customer job, delivery scheduling, bulky stock |
| `service_repair` | Services / Repair Shop | Other Services | Service order, appointment, technician, spare parts, service invoice |
| `health_wellness` | Health / Wellness | Health Care and Social Assistance + service retail | Appointment, customer profile, product/service mix, restricted inventory later |

Future categories can be added without changing the sidebar implementation if they map to `enabledModules`.

## 5. Core Modules Always Visible

These modules should be visible regardless of category, subject only to RBAC:

| Module key | Sidebar label | Notes |
| --- | --- | --- |
| `core.dashboard` | Dashboard | Store health, KPIs, alerts |
| `core.pos` | POS / Kasir | Checkout surface |
| `core.sales` | Sales / Orders | Sales history and order management |
| `core.inventory` | Inventory | Minimum stock visibility for all businesses |
| `core.invoices` | Invoices | Sales invoices, purchase invoices, receivables/payables foundation |
| `core.payments` | Payments / Cashflow | Cash drawer, payment records, expenses |
| `core.reports` | Reports / Analysis | Sales, stock, cashflow, owner reporting |
| `core.customers` | Customers | Customer profiles, purchase history |
| `core.suppliers` | Suppliers | Supplier master data |
| `core.users` | Users / Roles | RBAC and staff management |
| `core.settings` | Settings | Store config, calculation policy |

Core modules can still be hidden by role. For example, cashier may see POS, orders, and limited reports, while owner sees everything.

## 6. Vertical Modules

### Restaurant / Cafe

Enabled modules:

- `fnb.tables`
- `fnb.kds`
- `fnb.recipes`
- `fnb.raw_ingredients`
- `fnb.modifiers`
- `fnb.dine_in`

Sidebar examples:

- Meja
- KDS / Dapur
- Resep / BOM
- Bahan Baku
- Menu Modifier

### Retail

Enabled modules:

- `retail.barcode`
- `retail.variants`
- `retail.stock_opname`
- `retail.price_labels`
- `retail.exchanges`

Sidebar examples:

- Produk
- Barcode
- Variants
- Stock Opname
- Returns / Exchange

### Grocery / Minimarket

Enabled modules:

- `grocery.fast_checkout`
- `grocery.expiry_tracking`
- `grocery.batch_stock`
- `grocery.reorder_alerts`

Sidebar examples:

- Fast Checkout
- Expiry / Batch
- Reorder Alerts

### Wholesale / Distribution

Enabled modules:

- `wholesale.customer_pricing`
- `wholesale.bulk_order`
- `wholesale.delivery_order`
- `wholesale.receivables`

Sidebar examples:

- Bulk Orders
- Delivery Order
- Customer Pricing
- Receivables

### Warehouse / Logistics

Enabled modules:

- `warehouse.locations`
- `warehouse.branch_cluster`
- `warehouse.receiving`
- `warehouse.picking`
- `warehouse.packing`
- `warehouse.dispatch`
- `warehouse.transfer`

Sidebar examples:

- Warehouse
- Branch / Cluster
- Receiving
- Picking / Packing
- Dispatch
- Transfers

### Manufacturing

Enabled modules:

- `manufacturing.bom`
- `manufacturing.production_order`
- `manufacturing.material_issue`
- `manufacturing.finished_goods`
- `manufacturing.variance`

Sidebar examples:

- BOM
- Production Orders
- Material Issue
- Finished Goods

### Construction Materials

Enabled modules:

- `construction.unit_conversion`
- `construction.project_reference`
- `construction.delivery_schedule`
- `construction.bulk_stock`

Sidebar examples:

- Project Jobs
- Delivery Schedule
- Unit Conversion
- Bulk Stock

### Service / Repair

Enabled modules:

- `service.work_order`
- `service.appointment`
- `service.technician`
- `service.spare_parts`
- `service.service_invoice`

Sidebar examples:

- Work Orders
- Appointments
- Technicians
- Spare Parts
- Service Invoice

### Health / Wellness

Enabled modules:

- `health.appointment`
- `health.customer_profile`
- `health.service_catalog`
- `health.product_retail`
- `health.restricted_inventory`

Sidebar examples:

- Appointments
- Customer Profile
- Services
- Product Retail

## 7. Backend Architecture

### 7.1 Short-Term Model

Keep current `store_settings` compatibility:

- `businessType` remains readable and writable.
- Existing values map to new verticals:
  - `restaurant` -> `restaurant_cafe`
  - `cafe` -> `restaurant_cafe`
  - `retail` -> `retail`
  - `service` -> `service_repair`
  - `general` -> `general`

Add backend service logic:

- `BusinessVerticalService`
- `ModuleCapabilityService`
- `getStoreCapabilities(storeId)`

Endpoint:

```http
GET /api/stores/capabilities
```

Response:

```ts
type StoreCapabilitiesResponse = {
  storeId: string;
  businessVertical: BusinessVertical;
  requestedBusinessVertical: BusinessVertical | null;
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  enabledModules: string[];
  coreModules: string[];
  verticalModules: string[];
};
```

### 7.2 Long-Term Data Model

Add proper tables when multi-store architecture is hardened:

```prisma
model business_verticals {
  key          String  @id
  name         String
  description  String?
  is_active    Boolean @default(true)
  created_at   String  @default("datetime('now')")
  updated_at   String  @default("datetime('now')")
}

model platform_modules {
  key          String  @id
  name         String
  group        String
  description  String?
  is_core      Boolean @default(false)
  is_active    Boolean @default(true)
  created_at   String  @default("datetime('now')")
  updated_at   String  @default("datetime('now')")
}

model business_vertical_modules {
  id            Int    @id @default(autoincrement())
  vertical_key  String
  module_key    String
  is_default    Boolean @default(true)

  @@unique([vertical_key, module_key])
}

model store_business_profiles {
  store_id                    String @id
  requested_business_vertical String?
  verified_business_vertical  String @default("general")
  verification_status         String @default("unverified")
  verified_by                 String?
  verified_at                 String?
  notes                       String?
  created_at                  String @default("datetime('now')")
  updated_at                  String @default("datetime('now')")
}

model store_module_overrides {
  id          Int     @id @default(autoincrement())
  store_id    String
  module_key  String
  enabled     Boolean
  reason      String?
  updated_by  String?
  updated_at  String  @default("datetime('now')")

  @@unique([store_id, module_key])
}
```

Notes:

- `verified_business_vertical` is the source of truth.
- Store owner/manager may request a change, but should not directly verify it.
- Platform admin or internal operator verifies the category.
- Overrides allow special cases without changing the base category.

### 7.3 Backend Guards

Add module-level backend enforcement:

```ts
@RequireModule("fnb.kds")
@Get("fnb/kitchen/tickets")
```

Guard behavior:

- If module is enabled: allow.
- If module is disabled: return 403.
- Internal service accounts can bypass only when explicitly allowed.

This matters because hiding frontend navigation is not enough.

## 8. Frontend Architecture

### 8.1 Navigation Registry

Create a shared navigation registry:

```ts
type NavigationItem = {
  id: string;
  label: string;
  path: string;
  icon: IconComponent;
  requiredModule: string;
  requiredPermission?: PermissionKey;
  app: "pos-web" | "dashboard";
  section: "core" | "operations" | "vertical" | "admin";
};
```

Example:

```ts
{
  id: "kds",
  label: "KDS / Dapur",
  path: "/kds",
  requiredModule: "fnb.kds",
  requiredPermission: "canUseKds",
  app: "pos-web",
  section: "vertical"
}
```

### 8.2 Sidebar Rendering Rule

Sidebar visible item condition:

```ts
enabledModules.includes(item.requiredModule)
  && hasPermission(user, item.requiredPermission)
```

No direct business-category checks in the sidebar.

### 8.3 Route Guard

Every route with a required module uses a guard:

```tsx
<ModuleGuard requiredModule="fnb.kds">
  <KdsPage />
</ModuleGuard>
```

If disabled:

- Redirect to dashboard, or
- Show "Module not enabled for this store."

For production UX, redirect is better for accidental access; explicit error is better for deep links from support/debug.

## 9. Migration From Current State

Current state:

- `businessType` exists in settings after the first F&B gate.
- POS sidebar currently gates KDS by `isFnb`.
- Backend has all F&B endpoints mounted.

Target:

- `businessType` becomes compatibility input.
- New `stores/capabilities` endpoint returns `enabledModules`.
- Sidebar uses `enabledModules`.
- KDS route guard uses `enabledModules`.
- Backend F&B endpoints use `@RequireModule("fnb.*")`.

Compatibility mapping:

| Current setting | New vertical |
| --- | --- |
| `general` | `general` |
| `retail` | `retail` |
| `restaurant` | `restaurant_cafe` |
| `cafe` | `restaurant_cafe` |
| `service` | `service_repair` |

## 10. Implementation Plan

### Phase 1 - Capability Contract

Backend:

- Add business vertical constants in shared contracts.
- Add module key constants in shared contracts.
- Add `StoresService.getCapabilities(storeId)`.
- Add `GET /api/stores/capabilities`.
- Keep `GET /api/stores/info` for backward compatibility.

Frontend:

- Add `getStoreCapabilities()` API client.
- Add `useStoreCapabilities()`.
- Add `ModuleGuard`.
- Replace current `FnbGuard` with generic `ModuleGuard`.

Verification:

- `restaurant` and `cafe` show KDS.
- `retail`, `service`, and `general` hide KDS.
- Direct `/kds` access is blocked when module is disabled.

### Phase 2 - Navigation Registry

Frontend:

- Create POS navigation registry.
- Create dashboard navigation registry.
- Replace hardcoded sidebar arrays with registry filtering.
- Keep core modules always eligible.

Verification:

- User role permissions still work.
- Sidebar changes when capabilities change.
- No vertical item appears without an enabled module.

### Phase 3 - Backend Module Guard

Backend:

- Add `@RequireModule()`.
- Add `ModuleCapabilityGuard`.
- Apply to F&B endpoints:
  - tables require `fnb.tables`
  - kitchen tickets require `fnb.kds`
  - future recipes require `fnb.recipes`

Verification:

- Disabled vertical endpoint returns 403.
- Enabled vertical endpoint works.
- Service accounts remain controlled.

### Phase 4 - Persistent Business Profile

Backend:

- Add Prisma migration for:
  - `business_verticals`
  - `platform_modules`
  - `business_vertical_modules`
  - `store_business_profiles`
  - `store_module_overrides`
- Seed core modules and first 10 verticals.
- Backfill from current `store_settings.businessType`.

Verification:

- Existing stores keep current behavior.
- New stores default to `general`.
- Platform admin can verify a store category.

### Phase 5 - Admin Verification Workflow

Dashboard:

- Add platform/admin-only store profile screen.
- Show requested category vs verified category.
- Allow request, verify, reject, and override modules.

Backend:

- Add endpoints:
  - `GET /api/stores/business-profile`
  - `POST /api/stores/business-profile/request`
  - `PATCH /api/admin/stores/:storeId/business-profile/verify`
  - `PATCH /api/admin/stores/:storeId/modules/:moduleKey`

Verification:

- Store owner can request category change.
- Only authorized admin can verify category.
- Sidebar follows verified category, not request.

## 11. Acceptance Criteria

- Core POS/accounting/management modules remain visible for every store.
- Vertical modules appear only when enabled by backend capabilities.
- Direct routes are blocked if module is disabled.
- Backend endpoints for vertical modules enforce module access.
- Store owner cannot self-verify a vertical that changes entitlement.
- Adding a new business category requires backend config and module mapping, not rewriting sidebar code.
- Existing `businessType` setting remains backward compatible during migration.

## 12. Non-Goals

- Do not remove existing F&B backend modules.
- Do not hard-delete current `businessType` setting immediately.
- Do not make every business category a separate frontend app.
- Do not let frontend decide entitlement independently from backend.

