# Data Model and Event Contracts

## 1. Core Data Model

The system should treat three ledgers as separate concerns.

These contracts are shared by `apps/api`, `apps/bot`, `apps/dashboard`, and `apps/pos-web` when the cashier UI is split from the admin console.

### A. Revenue Ledger
Tracks recognized sales.

Typical data:
- order id
- order total
- paid amount
- discount
- tax
- payment status
- payment method
- completed timestamp

### B. Cashflow Ledger
Tracks actual money movement.

Typical data:
- cash in
- cash out
- opening balance
- closing balance
- register session
- source reference
- operator id
- payment method

### C. Inventory Ledger
Tracks product and stock movement.

Typical data:
- product id
- quantity before
- quantity change
- quantity after
- movement type
- source reference
- operator id
- tenant id

Keeping these ledgers separate prevents accounting confusion and reduces sync bugs.

## 2. Recommended Tables

The exact schema can vary, but the target system should include tables or equivalents for:

- `tenants`
- `stores`
- `users`
- `roles`
- `sessions`
- `refresh_tokens`
- `products`
- `product_prices`
- `stock_balances`
- `stock_movements`
- `orders`
- `order_items`
- `payments`
- `refunds`
- `cash_register_sessions`
- `cashflow_entries`
- `expense_categories`
- `chatbot_conversations`
- `chatbot_messages`
- `message_dedupes`
- `llm_requests`
- `llm_responses`
- `audit_logs`
- `sync_outbox`
- `sync_inbox`
- `webhook_deliveries`
- `notifications`
- `store_settings`
- `report_snapshots`

## 3. Order Lifecycle

Recommended states:
- `draft`
- `pending_payment`
- `paid`
- `confirmed`
- `completed`
- `cancelled`
- `refunded`

Rules:
- Stock reservation happens before payment finalization if the business needs it.
- Stock deduction happens inside a transaction.
- Revenue reporting should use paid or completed orders only, depending on policy.
- Cancellation and refund must create counter-movements instead of deleting rows.

## 4. Cash Register Lifecycle

Recommended session states:
- `open`
- `suspended`
- `closed`

Recommended data for each session:
- opening cash
- expected cash
- counted cash
- variance
- cashier user id
- opened at
- closed at
- notes

The cash register session is the anchor for per-shift cashflow integrity.

## 5. Event Contracts

Every event should include these fields:
- `event_id`
- `event_type`
- `tenant_id`
- `store_id`
- `aggregate_id`
- `correlation_id`
- `causation_id`
- `source`
- `version`
- `occurred_at`
- `payload`

## 6. Sample Events

### order.created
Payload:
- order id
- tenant id
- store id
- items
- subtotal
- total
- payment method
- operator id

### stock.adjusted
Payload:
- product id
- before
- delta
- after
- reason
- source reference

### cashflow.expense.recorded
Payload:
- amount
- category
- note
- session id
- operator id

### chatbot.message.received
Payload:
- channel
- sender
- message text
- conversation id
- tenant id
- store id

### llm.response.generated
Payload:
- request id
- prompt type
- redacted summary
- token usage if available
- status

## 7. Outbox and Inbox Pattern

Use an outbox table for reliable publish-after-commit behavior.

Write path:
1. Command writes domain rows.
2. Same transaction writes outbox row.
3. Worker publishes outbox row to queue or Socket.IO.
4. Consumer stores inbox marker if needed.
5. Duplicate delivery is ignored.

This pattern is important because webhook and dashboard traffic can both retry.

## 8. Read Models

Do not power dashboards only from raw transactional joins.

Instead create projections for:
- daily revenue
- monthly revenue
- top products
- payment mix
- stock alerts
- open orders
- active register sessions
- bot conversation counts

Projections should be rebuildable from events.

## 9. LLM Data Rules

- Do not send secrets, raw passwords, or webhook tokens to the model.
- Redact phone numbers and sensitive personal fields when possible.
- Store prompts only if you need them for audit or debugging and the policy allows it.
- Prefer structured tool outputs over free-form text for important actions.
- Validate every LLM action with the API before applying changes.
