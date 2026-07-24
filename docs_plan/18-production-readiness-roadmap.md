# Lecrion — Production Readiness Roadmap

> Dibuat: 2026-05-28
> Status saat ini: **8/10 logika revenue, 4.5/10 kesiapan SaaS**
> Target: **production-ready multi-tenant SaaS yang bisa onboard merchant berbayar**

Dokumen ini adalah turunan konkret dari [SaaS production.md](SaaS%20production.md) — diaudit ulang, ditambah temuan baru, lalu dipecah jadi tasks dengan acceptance criteria & file yang harus disentuh.

---

## Ringkasan Audit Akhir

### ✅ Sudah Production-Grade

- Atomic POS transaction (`createSale` dengan idempotency)
- Server-authoritative pricing (harga dari DB, bukan dari client)
- Receipt sequence gapless per store/sesi/hari
- Stock ledger append-only (`stock_change_logs`)
- Audit log immutable (`audit_logs`)
- Manager approval untuk void/refund/discount
- 169/169 tests passing — covers semua money-path
- Outbox pattern untuk event publishing
- RBAC + Tenant guard di global level
- Idempotency keys untuk anti double-charge

### 🔴 P0 — Blocker untuk Production SaaS

| #   | Item                                                         | Risk                                | Effort |
| --- | ------------------------------------------------------------ | ----------------------------------- | ------ |
| 1   | **SQLite → PostgreSQL**                                      | Single-writer bottleneck            | M      |
| 2   | **Money: `Float` → `Int`**                                   | Floating-point precision drift      | M      |
| 3   | **Schema migrations versioned**                              | No rollback, no env replay          | S      |
| 4   | **CORS dari env, tidak hardcoded**                           | Breaks production deploy            | XS     |
| 5   | **Rate limiting** (login + register)                         | Brute force vulnerability           | S      |
| 6   | **Helmet security headers**                                  | Missing XSS/clickjacking protection | XS     |
| 7   | **Secrets dari env, bukan checked-in**                       | Credential leak via git             | S      |
| 8   | **Email auth foundation** (provider + verify + reset)        | Tidak bisa onboard real user        | L      |
| 9   | **`store_id` di `menu` table**                               | Katalog bocor antar merchant        | S      |
| 10  | **Server-side tax/SC** (reject client override)              | Fiscal compliance violation         | S      |
| 11  | **WhatsApp bot per-merchant**                                | Privacy leak antar merchant         | M      |
| 12  | **Database backup automation**                               | Single point of failure             | S      |
| 13  | **`dist/` dihapus dari git**                                 | Repo bloat, merge conflict          | XS     |
| 14  | **Real multi-tenancy** (`tenant_id` real, bukan `'default'`) | Data leak antar tenant              | M      |
| 15  | **Resolve verification flow inconsistency**                  | UX confusion + fiscal risk          | XS     |

### 🟡 P1 — Critical untuk Onboarding Merchant Bayar

| #   | Item                                                                        | Risk                        | Effort |
| --- | --------------------------------------------------------------------------- | --------------------------- | ------ |
| 16  | **Service API key di DB + rotation**                                        | Static credential abuse     | M      |
| 17  | **Forgot password flow**                                                    | UX friction parah           | S      |
| 18  | **Email verification gating** (block login sebelum verified)                | Spam registration           | XS     |
| 19  | **Audit log retention policy**                                              | Disk runaway                | XS     |
| 20  | **WAF / IP allowlist untuk admin routes**                                   | Targeted attack             | M      |
| 21  | **Sentry / error tracking**                                                 | Blind to production errors  | S      |
| 22  | **Structured logging** (sudah ada, perlu ship ke aggregator)                | No production observability | S      |
| 23  | **Health check endpoint** (sudah ada `/health`, perlu deeper checks)        | Monitoring incomplete       | XS     |
| 24  | **CI/CD pipeline** (GitHub Actions / GitLab CI)                             | Manual deploy = error-prone | M      |
| 25  | **Staging environment**                                                     | No safe pre-prod testing    | M      |
| 26  | **Subscription / billing model**                                            | Tidak bisa charge merchant  | L      |
| 27  | **Email notifications untuk operational events** (low stock, daily summary) | UX gap                      | S      |
| 28  | **Phone-based 2FA via WhatsApp** (alternative ke email)                     | Indonesia user preference   | M      |

### 🟢 P2 — Scale & Polish

| #   | Item                                                      | Risk                          | Effort |
| --- | --------------------------------------------------------- | ----------------------------- | ------ |
| 29  | **Redis untuk idempotency + sessions**                    | DB lock contention saat scale | M      |
| 30  | **Payment gateway** (QRIS via Midtrans/Xendit)            | Manual reconciliation         | L      |
| 31  | **e-Faktur integration** (untuk merchant PKP)             | Fiscal compliance             | XL     |
| 32  | **Code splitting + lazy loading lebih aggressive**        | Slow initial load             | S      |
| 33  | **PWA icons proper set** (favicon, apple-touch, manifest) | Mobile install UX             | XS     |
| 34  | **i18n setup** (untuk expansion ke region lain)           | Lock-in to Bahasa             | M      |
| 35  | **Privacy policy & ToS pages**                            | Legal requirement (UU PDP)    | S      |
| 36  | **GDPR/UU PDP data deletion endpoint**                    | Legal requirement             | M      |
| 37  | **Load testing** (k6 / Artillery)                         | Unknown scale ceiling         | S      |
| 38  | **Disaster recovery drill documented**                    | Untested backup = no backup   | S      |
| 39  | **Monitoring dashboard** (Grafana / Datadog)              | Reactive vs proactive         | M      |
| 40  | **SOC 2 / ISO 27001 readiness checklist**                 | Enterprise sales blocker      | XL     |

**Total: 40 items.**

---

## Ringkasan Effort

| Tier | Count | Effort      | Estimasi    |
| ---- | ----- | ----------- | ----------- |
| P0   | 15    | mostly S/M  | ~2 minggu   |
| P1   | 13    | mostly S/M  | ~2-3 minggu |
| P2   | 12    | mix S to XL | ~3-6 minggu |

**Pilot 1-3 toko**: P0 cukup → 2 minggu
**Production SaaS multi-merchant**: P0 + P1 → 4-5 minggu
**Enterprise-ready**: + P2 → 2-3 bulan

---

## Phase A — Foundation (Week 1-2, P0 #1-7, #13)

Goal: backend siap untuk traffic real, security baseline ada.

### A1. Pre-flight cleanup (Day 1)

**Tasks:**

- Hapus `apps/api/dist/` dan `apps/pos-web/dist/` dari git tracking
- Add `dist/` ke `.gitignore` (cek dulu, mungkin sudah ada tapi commit lama tidak di-remove)
- Buat `.env.example` di root — list semua env vars dengan placeholder
- Move secrets aktual dari `.env` ke `.env.local` (gitignored)
- Setup branch protection di GitHub: main require PR, no direct push

**Acceptance:**

- `git ls-files | grep dist/` empty
- `.env.example` contains all keys, no secret values
- `.env.local` exists, gitignored, contains real secrets

### A2. CORS + Helmet + Rate Limit (Day 1-2)

**Tasks:**

- Install `helmet` dan `@nestjs/throttler` di `apps/api`
- Update `apps/api/src/main.ts`:
  - `app.use(helmet())`
  - Read `CORS_ORIGINS` dari env, split by comma, fallback ke localhost di dev
- Register `ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])` di `AppModule`
- Apply specific throttle ke auth routes:
  - `POST /api/auth/login` → 5 per minute per IP
  - `POST /api/auth/register` → 3 per hour per IP
  - `POST /api/auth/forgot-password` → 3 per hour per email
- Apply `ThrottlerGuard` global

**Files:**

- `apps/api/src/main.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/modules/auth/auth.controller.ts`

**Acceptance:**

- `curl -X POST /api/auth/login` 6× dalam 1 menit → 429
- Response headers include `X-Frame-Options`, `Strict-Transport-Security`
- Production deploy: only `CORS_ORIGINS` listed origins allowed

### A3. SQLite → PostgreSQL Migration (Day 2-4)

**Tasks:**

- Setup `infra/docker/docker-compose.yml` dengan PostgreSQL 16
- Update `prisma/schema.prisma`:
  - `provider = "postgresql"`
  - Convert all `String @default("datetime('now')")` → `DateTime @default(now())`
  - Convert all `Boolean @default(true/false)` (sudah benar di Prisma)
  - Update raw SQL di `stores.service.ts` yang pakai `datetime('now')` → `NOW()`
- Generate first migration: `npx prisma migrate dev --name init`
- Update `.env`: `DATABASE_URL=postgresql://...`
- Backfill timestamps (kalau perlu migrate data dari SQLite dump)
- Run all 169 tests against Postgres
- Update `docker-compose.yml` API container depends on Postgres

**Files:**

- `prisma/schema.prisma`
- `prisma/migrations/` (new folder)
- `apps/api/src/modules/stores/stores.service.ts` (raw SQL)
- `infra/docker/docker-compose.yml`

**Rollback plan:**

- Keep `feature/postgres` branch separate from `main`
- Tag last SQLite-stable commit
- Test data migration script bidirectional

**Acceptance:**

- `npm run test` di apps/api: 169/169 pass against Postgres
- `prisma migrate status`: clean
- Docker compose up: API connects to PG, healthcheck pass

### A4. Money: `Float` → `Int` (Day 4-6)

**Strategy: integer rupiah penuh (no decimal cents)** — Indonesia transaksi bulat ke rupiah, tidak butuh cents.

**Tasks:**

- Identifikasi semua money fields:
  - `pos_sales`: subtotal, discount_amount, tax_amount, service_charge_amount, total, paid_total, change_amount
  - `pos_sale_items`: unit_price, line_total
  - `payments`: amount, paid_amount, discount, tax
  - `cashflow_entries`: amount
  - `cash_register_sessions`: opening_cash, expected_cash, counted_cash, variance
  - `menu`: price, cost_price
  - `pos_corrections`: amount
  - `invoices`: subtotal, discount, tax, total
  - `invoice_lines`: unit_price, total
  - `promotions`: discount_value, min_order_amount, max_discount_amount
  - `vouchers`: discount_value, min_order_amount, max_discount_amount
  - `loyalty_programs`: earn_rate (CAREFUL — ini rate, bukan amount)
- Migration SQL: `ALTER COLUMN ... TYPE BIGINT USING ROUND(... )`
- Update `prisma/schema.prisma` `Float` → `Int` (for money) atau `BigInt` kalau > 2.1M
- Update TypeScript types — semua money fields jadi `number` integer
- Update `pos-calculation.service.ts` — semua aritmatika jadi integer-only (no `Math.round`, no division yang menghasilkan decimal)
- Update display di POS web — `Rp{value.toLocaleString('id-ID')}` (no /100)
- Update tests — input/expected money pakai integer
- DON'T forget: rate fields (tax_rate, service_charge_rate, earn_rate) tetap float — itu persentase/multiplier

**Files:**

- `prisma/schema.prisma`
- `prisma/migrations/xxxx_money_to_int/migration.sql`
- `apps/api/src/modules/pos/pos-calculation.service.ts`
- `apps/api/src/modules/pos/pos-sales.service.ts`
- `apps/api/src/modules/pos/pos-corrections.service.ts`
- `apps/api/src/modules/cashflow/*.service.ts`
- `apps/api/src/modules/customers/loyalty.service.ts`
- `apps/api/src/modules/customers/promotions.service.ts`
- All test files yang assert money values
- `apps/pos-web/src/utils/fmt.ts`
- All POS web pages yang display money

**Acceptance:**

- All 169 tests pass dengan integer money
- Sample sale: 2× Rp 10.000 + 1× Rp 7.500 = Rp 27.500 (exact, no precision drift)
- DB: SELECT total FROM pos_sales WHERE id = 1 → returns BIGINT, no decimal

### A5. Schema Migrations Discipline (Day 6)

**Tasks:**

- Setup migration workflow:
  - Dev: `npx prisma migrate dev` (auto-generate + apply)
  - Staging: `npx prisma migrate deploy` (apply only, no generate)
  - Prod: same as staging
- Document migration rules:
  - Never edit applied migration files
  - Always test migration on staging first
  - Backward-compatible only (no DROP COLUMN without 2-phase rollout)
- Add migration check to CI: `prisma migrate diff` should be empty
- Add `prisma generate` to postinstall script

**Files:**

- `package.json` (scripts)
- `docs_plan/19-migration-runbook.md` (new)
- `.github/workflows/ci.yml` (later in P1)

**Acceptance:**

- New schema change → migration file generated, reviewable in PR
- `prisma migrate status` clean on every env

---

## Phase B — Email Auth Foundation (Week 2, P0 #8)

Goal: kirim email verification, OTP, password reset bekerja end-to-end.

### B1. Email Provider Setup (Day 7)

**Choice: Resend** (recommended) atau AWS SES.

**Tasks:**

- Daftar Resend, dapatkan API key
- Verify domain (lecrion.id atau lecrion.com):
  - Add DNS records: SPF (`TXT`), DKIM (`TXT` 3 records dari Resend), DMARC (`TXT`)
  - Tunggu propagasi (~30 menit)
- Test send via Resend dashboard
- Add env: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `noreply@lecrion.id`)

**Acceptance:**

- DKIM check pass di mxtoolbox.com
- Resend dashboard shows verified domain
- Test email arrives in inbox (not spam) untuk Gmail, Outlook

### B2. EmailModule Backend (Day 8-9)

**Tasks:**

- Install `resend` SDK di `apps/api`
- Create `apps/api/src/modules/email/`:
  - `email.module.ts`
  - `email.service.ts` — wrapper Resend client + retry logic
  - `email.types.ts`
  - `templates/` — HTML email templates (use `react-email` atau handcrafted)
- Methods di `EmailService`:
  - `sendVerificationEmail(to, code, name)`
  - `sendPasswordResetEmail(to, token, name)`
  - `sendLoginOtp(to, code)` — opsional 2FA
  - `sendWelcomeEmail(to, name, storeName)`
- All methods: idempotent send (use Resend message ID for dedup)
- Log all sends to audit_logs (for debugging deliverability)

**Files:**

- `apps/api/src/modules/email/` (new module)
- `apps/api/src/app.module.ts` (register)

**Acceptance:**

- Unit test: mock Resend, verify call shape
- Integration test: send to test email, verify content + sender

### B3. OTP & Token Tables (Day 9)

**Migration:**

```prisma
model email_otps {
  id          Int      @id @default(autoincrement())
  email       String
  code_hash   String       // bcrypt hash dari 6-digit code
  purpose     String       // verify_email | login_otp | reset_password
  expires_at  DateTime
  used_at     DateTime?
  attempts    Int      @default(0)
  created_at  DateTime @default(now())

  @@index([email, purpose])
  @@index([expires_at])
}

model password_reset_tokens {
  id          Int      @id @default(autoincrement())
  user_id     Int
  token_hash  String   @unique
  expires_at  DateTime
  used_at     DateTime?
  created_at  DateTime @default(now())

  @@index([user_id])
  @@index([token_hash])
}
```

Add to `users`:

```prisma
email_verified_at DateTime?
two_factor_enabled Boolean @default(false)
```

**Acceptance:**

- Migration applied
- Prisma client regenerated

### B4. Auth Flows (Day 10-11)

**Endpoints baru di `auth.controller.ts`:**

```
POST /api/auth/verify-email      { email, code }       → returns tokens
POST /api/auth/resend-otp         { email, purpose }   → 200
POST /api/auth/forgot-password    { email }            → 200 (always)
POST /api/auth/reset-password     { token, password }  → 200
POST /api/auth/enable-2fa         (auth required)      → returns backup codes
POST /api/auth/login/verify-otp   { otpId, code }      → returns tokens
```

**Update existing:**

- `POST /api/auth/register`:
  - Generate OTP, hash, store di `email_otps`
  - Send verification email
  - Return `{ needsVerification: true, email }` (no tokens yet)
- `POST /api/auth/login`:
  - Kalau `!email_verified_at` → 403 "Email belum diverifikasi"
  - Kalau `two_factor_enabled` → generate OTP, send email, return `{ needsOtp: true, otpId }`

**Files:**

- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.types.ts`

**Acceptance:**

- Register flow: email → OTP → verify → tokens (3-step)
- Forgot password flow: request → email link → reset → login
- Wrong OTP code: 400 + increment attempts; after 5 attempts: 423 locked
- Expired OTP: 410 gone

### B5. Frontend Pages (Day 12)

**Pages baru:**

- `/verify-email` — input 6-digit OTP, autosubmit on 6 chars, resend after 60s cooldown
- `/forgot-password` — input email, success message identik untuk valid/invalid (anti enumeration)
- `/reset-password?token=...` — input new password (with strength meter), token validated
- `/login/2fa` — 6-digit OTP input (kalau 2FA enabled)

**Update RegisterPage:**

- Setelah submit success → redirect ke `/verify-email?email=...`

**Update LoginPage:**

- Add "Lupa password?" link di bawah password field

**Files:**

- `apps/pos-web/src/pages/VerifyEmailPage.tsx` (new)
- `apps/pos-web/src/pages/ForgotPasswordPage.tsx` (new)
- `apps/pos-web/src/pages/ResetPasswordPage.tsx` (new)
- `apps/pos-web/src/pages/Login2faPage.tsx` (new)
- `apps/pos-web/src/routes/index.tsx` (add routes)
- `apps/pos-web/src/features/auth/RegisterPage.tsx` (redirect after submit)
- `apps/pos-web/src/services/api.ts` (new endpoints)

**Acceptance:**

- E2E: register → email arrives → OTP → login → tokens
- E2E: forgot → email arrives → link → new password → login
- Visual: matches existing auth design (purple brand, light bg)

---

## Phase C — Multi-Tenancy & Compliance (Week 3, P0 #9-12, #14-15)

Goal: setiap merchant terisolasi, tax server-side, bot per-merchant.

### C1. `store_id` di `menu` (Day 13)

**Tasks:**

- Migration: ADD COLUMN `store_id String NOT NULL DEFAULT 'default-store'`
- Backfill existing rows ke `'default-store'`
- Update unique constraints:
  - `@@unique([store_id, sku])`
  - `@@unique([store_id, barcode])`
- Update queries di:
  - `CatalogService.getProducts()` — add `where: { store_id }`
  - `CatalogService.createProduct()` — set `store_id` from auth context
  - `InventoryLedgerService` — pass through
- Update tests yang assume global catalog

**Acceptance:**

- Two stores create product with same name "Kopi" — both succeed (different store_id)
- Store A's catalog query never returns Store B's products

### C2. Real Multi-Tenancy (Day 14-15)

**Tasks:**

- New table: `tenants { id, name, plan, created_at, suspended_at }`
- Migration: backfill — every existing store → unique tenant
- `register` flow: create tenant pertama kali, tenant_id flow downstream
- Update `TenantGuard` — enforce `req.user.tenantId === resource.tenant_id`
- Update JWT payload — `tenantId` already there, ensure populated correctly

**Files:**

- `prisma/schema.prisma`
- `apps/api/src/modules/auth/auth.service.ts` (register)
- `apps/api/src/common/guards/tenant.guard.ts`

**Acceptance:**

- Two tenants cannot read each other's data even with raw query
- Audit log shows correct `tenant_id` per request

### C3. Server-Side Tax & Service Charge (Day 16)

**Tasks:**

- Update `PosSalesService.createSale()`:
  - REJECT if `dto.taxAmount` or `dto.serviceChargeAmount` provided (400 error)
  - Recalculate tax/SC dari `getCalcPolicy(storeId)` exclusively
  - Document: client display preview only, server is authority
- Update `PosCalculationService` — confirm calculation strictly server-side
- Update frontend: hapus tax/SC calculation di client, fetch dari `/api/stores/calc-policy` for display
- Update tests: assert server rejects client-provided tax

**Acceptance:**

- POST sale dengan `taxAmount: 999999` → 400 error
- Server-calculated tax matches `getCalcPolicy.taxRate × subtotal`
- Frontend: tax preview matches server result on submit

### C4. WhatsApp Bot Per-Merchant (Day 17-18)

**Tasks:**

- New settings keys: `bot.fonnte_token`, `bot.fonnte_device_id`, `bot.enabled`
- Add UI di `/settings` (owner) — input Fonnte credentials per store
- `BotDispatchService.send(storeId, message)`:
  - Resolve token from `store_settings`
  - Fail gracefully kalau bot disabled atau no token
- Webhook router `POST /api/bot/webhook/:tokenHint`:
  - Lookup which store owns this token
  - Route message to correct store's chat handler
- Migration: existing single-token deployment → assign ke `default-store`

**Files:**

- `apps/bot/src/main.ts` (token resolution)
- `apps/api/src/modules/bot/bot-dispatch.service.ts`
- `apps/pos-web/src/pages/SettingsPage.tsx` (UI)

**Acceptance:**

- Store A WA token → Store A receives messages
- Store B WA token → Store B receives messages
- Cross-contamination test: Store A message never sent to Store B

### C5. Database Backup Automation (Day 19)

**Tasks:**

- For SQLite (legacy): file copy + rotation script
- For Postgres (production):
  - Cron job daily: `pg_dump | gzip | aws s3 cp s3://lecrion-backups/`
  - Retention: 30 daily, 12 monthly, indefinite yearly
  - Use Backblaze B2 atau AWS S3 (B2 cheaper)
  - Encrypt at rest (server-side encryption)
- Document restore procedure: `aws s3 cp ... | gunzip | psql`
- Quarterly drill: actual restore to staging, verify data integrity

**Files:**

- `infra/scripts/backup.sh` (new)
- `docs_plan/20-backup-runbook.md` (new)

**Acceptance:**

- Daily backup runs automatically (cron / GitHub Actions schedule)
- Backups encrypted at rest
- Restore drill: data restored to staging matches prod (sample audit)

### C6. Resolve Verification Flow (Day 19)

**Decision needed from product:**

Option A: All self-register → `pending`, support harus approve manual
Option B: Auto-approve untuk `general` vertical, manual untuk sensitive (F&B, retail)
Option C: Self-register `auto_approved` (current state) — UI verifikasi cuma untuk migration support

**Tasks:**

- Pilih option (saya recommend B — sensitive vertical butuh KYC)
- Update `auth.service.ts register` flow accordingly
- Update support dashboard untuk match flow
- Document di `docs_plan/`

---

## Phase D — Observability & DevOps (Week 4, P1 #20-25)

### D1. Sentry Error Tracking (Day 20)

**Tasks:**

- Daftar Sentry, get DSN (free tier OK untuk start)
- Install `@sentry/node` di `apps/api`, `@sentry/react` di pos-web
- Initialize at bootstrap dengan `SENTRY_DSN` env
- Configure release tracking via Git SHA
- Source maps upload ke Sentry untuk readable stack traces
- PII scrubbing: redact email, phone, password fields

**Files:**

- `apps/api/src/main.ts`
- `apps/pos-web/src/main.tsx`

**Acceptance:**

- Test error: throw in dev → appears in Sentry dashboard
- Source maps: stack trace shows .ts line numbers, not minified

### D2. Structured Logging Pipeline (Day 21)

**Tasks:**

- Already have structured logger (`libs/common/src/telemetry`) — verify outputs JSON
- Add log shipping to aggregator:
  - Option: Better Stack (Logtail) — simple, free tier
  - Option: Grafana Loki — self-hosted
- Configure log levels per env (DEBUG di dev, INFO di prod)
- Correlation ID propagation via header `X-Request-Id`

### D3. Health Checks Deeper (Day 22)

**Already exists `/health`. Add:**

- `/health/live` — process alive (always 200 if running)
- `/health/ready` — DB reachable, Redis (when added) reachable, can serve traffic
- `/health/startup` — used by orchestrator, returns 200 only after all modules loaded

Add metrics endpoint kalau belum:

- `/metrics` — Prometheus format (request count, latency p50/p95/p99, DB pool stats)

### D4. CI/CD Pipeline (Day 23-25)

**Tasks:**

- Create `.github/workflows/ci.yml`:
  - On PR: lint, typecheck, test, build
  - On merge main: deploy to staging
  - On tag `v*`: deploy to production (manual approval)
- Use GitHub Actions cache untuk node_modules
- Use `act` untuk local CI testing
- Document deploy procedure

**Files:**

- `.github/workflows/ci.yml` (new)
- `.github/workflows/deploy-staging.yml` (new)
- `.github/workflows/deploy-prod.yml` (new)
- `docs_plan/21-deploy-runbook.md` (new)

### D5. Staging Environment (Day 25)

**Tasks:**

- Setup staging server (smallest VPS / Fly.io / Railway)
- Staging DB: separate Postgres
- Staging email: Resend test domain (`@staging.lecrion.id`)
- Staging WA: Fonnte sandbox
- Auto-deploy on every main merge
- Mark with banner "STAGING — not real data"

---

## Phase E — Billing & Operations (Week 5, P1 #26-28)

### E1. Subscription Model (Day 26-28)

**Tasks:**

- New tables: `subscription_plans`, `subscriptions`, `subscription_invoices`
- Plans: Starter, Growth, Scale (per landing page)
- Trial: 14 hari free, otomatis suspended kalau tidak upgrade
- Integration: Midtrans Recurring atau Stripe (kalau target merchant Indonesian only, Midtrans lebih cocok)
- Webhook: payment success → extend subscription, payment failed → suspend after 3 retries
- UI: `/settings/billing` untuk owner

### E2. Operational Email Notifications (Day 29)

**Tasks:**

- Daily summary email (8 AM) — kemarin: revenue, transaksi, top product
- Low stock alert (immediate)
- Failed payment alert
- Subscription expiry warning (7 hari, 3 hari, 1 hari)
- Implement via worker scheduler

### E3. WhatsApp 2FA (Day 30)

**Tasks:**

- Alternative ke email OTP — kirim via Fonnte
- User opt-in di `/settings`
- Phone verification first (kirim test message, user reply YA)

---

## Phase F — Scale Preparation (Week 6+, P2)

### F1. Redis Integration

**For:**

- Idempotency keys cache (replace SQLite table)
- Session store
- Rate limiter store (Throttler dengan Redis)
- Bull queue (replace SQLite outbox runner)

### F2. Payment Gateway QRIS

**Provider: Midtrans atau Xendit**

**Tasks:**

- Daftar merchant account
- Implement `PaymentsService.createQrisPayment()` → return QR string
- Webhook `/api/payments/webhook/qris` untuk settle
- Display QR di POS web, tunggu webhook callback
- Reconciliation: daily report dari Midtrans match dengan `payments` table

### F3. e-Faktur Integration

**For PKP merchants only.**

**Vendor:**

- Pakai aggregator (OnlinePajak, Pajakku) atau langsung DJP API
- Generate Faktur Pajak Elektronik
- Sync ke Coretax DJP

### F4. Code Splitting & Bundle Optimization

**Tasks:**

- Audit bundle: `npx vite-bundle-visualizer`
- Identify big chunks: framer-motion, recharts (kalau dipakai)
- Lazy load non-critical: chatbot pages, support pages
- Image optimization: `lecrion_3d.png` (1MB) → WebP, lazy load

### F5. PWA Polish

**Tasks:**

- Generate proper icon set: 192, 512, maskable
- favicon.ico
- apple-touch-icon (180×180)
- manifest.json: name, short_name, theme_color, background_color, display
- Test install on Android + iOS

### F6. i18n Setup

**Tasks:**

- Install `react-i18next`
- Extract all hardcoded Bahasa ke `id.json`
- Setup language switcher (kalau target expand: id, en, su, jv)

### F7. Privacy Policy & ToS

**Tasks:**

- Buat halaman `/kebijakan-privasi` (sudah ada link, tapi page belum)
- Buat halaman `/syarat-ketentuan`
- Compliant dengan UU PDP Indonesia (2022)
- Konsultasi legal counsel

### F8. Data Deletion Endpoint (UU PDP)

**Tasks:**

- `POST /api/auth/delete-account` — soft delete + email confirmation
- 30 hari grace period sebelum hard delete
- Cascade: anonymize user-linked data (orders → "Deleted User")
- Audit trail kept (legal requirement)

### F9. Load Testing

**Tasks:**

- Setup k6 atau Artillery
- Scenarios:
  - 100 concurrent kasir creating sales
  - 50 concurrent dashboard users
  - WhatsApp burst: 200 messages in 1 minute
- Identify bottleneck, document SLA

### F10. Monitoring Dashboard

**Stack:**

- Grafana + Prometheus + Loki (self-hosted)
- Atau Datadog (paid, simpler)
- Dashboards: API latency, error rate, DB connections, queue depth, active sessions

### F11. SOC 2 / ISO 27001 Readiness

**For enterprise sales — skip kalau focus SMB only.**

**Tasks:**

- Document security policies
- Implement access reviews quarterly
- Pen-testing annual
- Engagement dengan auditor (Vanta, Drata, atau langsung)

---

## Decision Points (Need Product Input)

1. **Database hosting**: Self-hosted Postgres atau Managed (RDS, Supabase, Neon)?
2. **Email provider final**: Resend vs SES vs SendGrid?
3. **Payment gateway**: Midtrans (Indonesia-first) vs Xendit (regional) vs Stripe (global)?
4. **Subscription billing**: Recurring via Midtrans Snap atau manual invoice?
5. **Sentry tier**: Free (5k events/mo) atau Team ($26/mo, 50k events)?
6. **Verification flow**: Auto-approve, manual-approve, atau hybrid by vertical?
7. **WhatsApp strategy**: Per-merchant token (tiap merchant beli Fonnte sendiri) atau platform proxy (Lecrion central, charge per message)?
8. **Pricing finalization**: Starter Rp 299k/bln OK? Atau usage-based?
9. **Domain**: lecrion.id vs lecrion.com?
10. **Tax inclusion in pricing**: harga PPN-included atau add-on?

---

## Risk Register

| Risk                                            | Likelihood | Impact   | Mitigation                                    |
| ----------------------------------------------- | ---------- | -------- | --------------------------------------------- |
| Postgres migration data loss                    | Low        | Critical | Backup before, test restore                   |
| Email deliverability (spam)                     | Medium     | High     | Domain warming, DKIM/SPF, monitor bounce rate |
| Fonnte API outage                               | Medium     | High     | Fallback to email OTP, queue retry            |
| DDoS attack on login                            | Medium     | Medium   | Cloudflare, throttler, fail2ban               |
| Money calculation bug after Float→Int migration | Low        | Critical | All 169 tests pass, manual reconcile          |
| Tenant data leak via raw SQL                    | Low        | Critical | Code review checklist, integration test       |
| Payment gateway integration bugs                | Medium     | High     | Sandbox testing, manual reconciliation period |
| Customer data breach                            | Low        | Critical | Encryption at rest, access audit, pen-test    |

---

## Success Metrics

**For Pilot (after Phase A-C):**

- 3 merchants live, 0 transaction loss in 30 days
- p95 API latency < 300ms
- Email verification rate > 95%
- Zero critical Sentry errors

**For SaaS Launch (after Phase D-E):**

- 50 merchants onboarded
- 99.9% uptime in 90 days
- Subscription renewal rate > 80%
- Avg support ticket < 2 per merchant per month

**For Enterprise (after Phase F):**

- Multi-region deployment
- SOC 2 Type 1 certification
- Load tested to 10k concurrent users
- 99.95% SLA contracted

---

## Next Action

Mulai dari **Phase A1** (cleanup + .env) — paling rendah risk, foundation untuk semua phase berikut.

Setelah selesai semua Phase A-C, codebase sudah cukup untuk **pilot 1-3 merchant berbayar**. Phase D-E menambah operational maturity untuk skala 50+. Phase F untuk enterprise.

**Estimasi realistis untuk solo developer:**

- Phase A-C: 3 minggu
- Phase D-E: 2 minggu
- Phase F: 4-6 minggu
- **Total: ~3 bulan untuk full production-ready SaaS**

Dengan tim 2-3 developer: 6-8 minggu.
