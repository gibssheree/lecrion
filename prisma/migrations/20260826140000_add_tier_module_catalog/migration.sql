-- Catalog rows for the new tier-gated PlatformModule keys (see
-- libs/contracts/src/modules/index.ts — TIER_MODULES). Without a row here,
-- StoresService#setModuleOverride's moduleExists() check rejects any
-- manual override on these keys with "Unknown platform module", even
-- though getCapabilities() already grants them automatically via a store's
-- tier. This just lets support staff hand-adjust an individual store's
-- access to one of these (e.g. a Starter store getting an exception).

INSERT INTO "platform_modules" ("key", "name", "group", "description", "is_core", "is_active")
VALUES
  ('tier.split_payment', 'Split Payment', 'tier', 'Pay one sale with more than one payment method', false, true),
  ('tier.shift_approval', 'Shift Approval', 'tier', 'Manager PIN approval required for refunds/discounts over threshold', false, true),
  ('tier.multi_location_inventory', 'Multi-Location Inventory', 'tier', 'Track stock across more than one location per store', false, true),
  ('tier.advanced_analytics', 'Advanced Analytics', 'tier', 'Cashier performance, promo performance, repeat-customer rate, revenue forecast', false, true),
  ('tier.csv_export', 'CSV Export', 'tier', 'Export report data as CSV', false, true),
  ('tier.purchase_order', 'Purchase Order & Receiving', 'tier', 'Formal purchase-order and goods-receipt document workflow', false, true),
  ('tier.chatbot_ordering', 'Chatbot Ordering', 'tier', 'Customer ordering via the WhatsApp chatbot', false, true),
  ('tier.chatbot_nutrition_assistant', 'Chatbot Nutrition Assistant', 'tier', 'F&B nutrition/allergen Q&A via the chatbot', false, true)
ON CONFLICT("key") DO NOTHING;
