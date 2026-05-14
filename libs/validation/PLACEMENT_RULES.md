# DTO and Validation Placement Rules

**Phase 2 definition — docs_plan/07-ultimate-tasks.md**

This document defines where validation schemas, DTOs, and middleware live in the lecrion monorepo.

---

## Placement Map

| Layer | Location | Purpose |
|---|---|---|
| **Schema** | `libs/validation/src/schemas/<domain>.schema.js` | Field definitions, type rules, bounds, enums |
| **DTO** | `apps/api/src/modules/<module>/dto/<name>.dto.js` | Request shape + `.from(raw)` factory |
| **Middleware** | `apps/api/src/middleware/validate.js` | Express `validateBody()`, `validateQuery()` |
| **Service** | `apps/api/src/modules/<module>/<module>.service.js` | Receives clean plain objects — no req/res |
| **Bot commands** | `apps/bot/src/commands/<domain>Commands.js` | May call `validateOrThrow()` on WA message fields |

---

## Rules

### 1. Schemas are domain-owned, not module-owned

Schemas live in `libs/validation/` so they can be shared by both the API and the bot:

```
libs/validation/src/schemas/
  checkout.schema.js   ← used by checkout.service + checkoutCommands
  order.schema.js      ← used by orders module + reportCommands
  settings.schema.js   ← used by dashboardRoutes + storeSettings
  webhook.schema.js    ← used by fonnteTransport
```

### 2. DTOs are module-owned

DTOs add structure and the `.from(raw)` factory pattern. They live with their module:

```
apps/api/src/modules/checkout/dto/create-order.dto.js
apps/api/src/modules/orders/dto/order-status.dto.js
apps/api/src/modules/inventory/dto/stock-adjustment.dto.js
```

DTOs import their schema from `libs/validation/` — they do NOT define their own field rules.

### 3. Services receive plain objects

Service methods must NOT accept Express `req` objects. Example:

```js
// ✅ CORRECT — service receives plain object
async function createOrderFromCart({ sender, orderType, ... }) { ... }

// ❌ WRONG — service depends on Express internals
async function createOrder(req, res) { ... }
```

Validation happens BEFORE the service call, in the route handler or middleware:

```js
app.post('/orders', validateBody(CREATE_ORDER_SCHEMA), async (req, res) => {
  // req.body is now validated and coerced
  const result = await checkoutService.createOrderFromCart(req.body);
  res.json(result);
});
```

### 4. Bot commands validate WhatsApp message fields directly

```js
const { validateOrThrow } = require('../../../libs/validation/src');
const { CART_ITEM_SCHEMA } = require('../../../libs/validation/src/schemas/checkout.schema');

// Inside a command handler:
const input = validateOrThrow({ sender, productId: parsedId, qty: parsedQty }, CART_ITEM_SCHEMA);
await cartService.addItem(input);
```

### 5. Unknown fields are stripped (whitelist mode)

All body validation uses `whitelist: true` by default:
- Extra keys are silently dropped before reaching the service
- Prevents parameter pollution and unexpected field writes

### 6. Validation errors return 400 JSON

```json
{
  "status": "validation_error",
  "errors": [
    "sender is required",
    "qty must be >= 1"
  ]
}
```

Use the `validationErrorHandler` Express middleware to catch `ValidationError` thrown by services:

```js
app.use(validationErrorHandler);  // register LAST, after all routes
```

---

## Existing Schemas

| Schema file | Covers |
|---|---|
| `checkout.schema.js` | `CREATE_ORDER_SCHEMA`, `CART_ITEM_SCHEMA` |
| `order.schema.js` | `ORDER_STATUS_UPDATE_SCHEMA`, `ORDER_QUERY_SCHEMA`, `STOCK_ADJUSTMENT_SCHEMA` |
| `settings.schema.js` | `STORE_SETTINGS_SCHEMA`, `SETTINGS_UPSERT_SCHEMA` |
| `webhook.schema.js` | `FONNTE_WEBHOOK_SCHEMA` |

---

## Adding a New Schema

1. Create `libs/validation/src/schemas/<domain>.schema.js`
2. Export named constants: `const MY_SCHEMA = { ... }; module.exports = { MY_SCHEMA };`
3. Add it to `libs/validation/src/index.js` schemas map
4. If you need a DTO: create `apps/api/src/modules/<module>/dto/<name>.dto.js`
5. Test the schema with `validate(sampleInput, MY_SCHEMA)`
