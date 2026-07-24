# Lecrion — Pilot Execution Plan (Week 1)

> **Goal:** Onboard 3 pilot merchants (1 hotel, 2 vape stores, 3 cafés)
> dalam 7 hari dengan Lecrion sebagai SaaS pre-production.
>
> **Mode:** Solo developer + AI agents (semua coding di-handle agent).
> **Human tasks:** keputusan, akun eksternal, DNS, testing, pilot onboarding.
>
> Dokumen ini referensi dari `18-production-readiness-roadmap.md`.

---

## Confirmed Decisions

| #   | Decision              | Status                          | Notes                                                                                                                                      |
| --- | --------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Domain**            | Belum dibeli                    | Beli `.id` (lebih relevan ke pasar Indonesia, lebih murah Rp 200rb/tahun di IDwebhost/Niagahoster). Saran: `lecrion.id` atau `lecrion.app` |
| 2   | **Postgres hosting**  | DigitalOcean Managed Postgres   | Same DC dengan API & pos-web yang sudah jalan                                                                                              |
| 3   | **Server hosting**    | Existing — DigitalOcean droplet | Sudah ada untuk chatbot & pos-web                                                                                                          |
| 4   | **Email provider**    | Resend                          | Free 3k/bulan, modern API                                                                                                                  |
| 5   | **Verification flow** | Manual verify by support        | Untuk semua self-register, tidak auto-approve                                                                                              |
| 6   | **Payment gateway**   | SKIP — manual reconciliation    | Defer ke minggu depan                                                                                                                      |

### Pilot Merchants

| #   | Bisnis     | Vertical          | Tingkat Risiko Testing                             |
| --- | ---------- | ----------------- | -------------------------------------------------- |
| 1   | Hotel      | `accommodation`   | Low — module kamar/check-in masih basic            |
| 2   | Vape Store | `retail_store`    | Medium — barcode scanning, varian produk           |
| 3   | Cafe       | `restaurant_cafe` | High — KDS, dapur, multi-meja, paling banyak fitur |

---

## Day-by-Day Execution

### Hari 1 — Foundation Setup (TODAY)

**Manusia (Gilbert):**

- [ ] Beli domain `lecrion.id` di registrar (IDwebhost / Niagahoster / Rumahweb), ~Rp 200rb
- [ ] Daftar account di Resend (https://resend.com), ambil API key (sandbox dulu, JANGAN setup domain dulu)
- [ ] Daftar DigitalOcean Managed Postgres (atau pakai existing DO account):
  - Plan: Basic $15/mo, 1GB RAM, 1 CPU, 10GB SSD
  - Region: SAMA dengan droplet API kamu (Singapore biasanya)
  - Database name: `lecrion_prod`
  - Backup: daily, 7 days retention (default)
  - Note: dapat connection string `DATABASE_URL`
- [ ] Daftar Sentry (sentry.io) — free tier, 2 project: `lecrion-api` + `lecrion-web`
- [ ] Kasih ke Agent: `DATABASE_URL`, `RESEND_API_KEY`, `SENTRY_DSN_API`, `SENTRY_DSN_WEB`

**Agent:**

- [ ] A1: Cleanup `dist/` dari git tracking
- [ ] A1: Buat `.env.example` di root + `apps/api/.env.example`
- [ ] A1: Audit `.gitignore` — pastikan `.env.local`, `dist/`, `*.db` di-ignore
- [ ] A2: Install `helmet` & `@nestjs/throttler` di apps/api
- [ ] A2: Update `apps/api/src/main.ts` — helmet + CORS dari env
- [ ] A2: Register `ThrottlerModule` global, apply throttle ke `/api/auth/login` (5/min) dan `/api/auth/register` (3/hour)
- [ ] A5: Add `prisma migrate` workflow scripts ke `package.json`

**Acceptance:**

- Repo bersih, no `dist/` tracked
- `curl POST /api/auth/login` 6× dalam 1 menit → 429 Too Many Requests
- `helmet` headers visible di response (`X-Content-Type-Options`, `Strict-Transport-Security`)
- `.env.example` lengkap, kamu bisa `cp .env.example .env.local` dan isi

**Total estimated effort:** Manusia 2 jam, Agent 4 jam.

---

### Hari 2 — Postgres Migration + Money Int

**Manusia:**

- [ ] Pastikan `DATABASE_URL` dari DO sudah aktif (bisa connect via `psql` atau TablePlus untuk verify)
- [ ] Backup `database/canteen.db` (file copy) sebelum agent mulai migrate
- [ ] Setelah agent selesai migrate: spot check 3 transaksi historis → uang harus exact match (tidak ada precision drift)

**Agent:**

- [ ] A3: Update `prisma/schema.prisma` — `provider = "postgresql"`
- [ ] A3: Convert semua `String @default("datetime('now')")` → `DateTime @default(now())`
- [ ] A3: Update raw SQL di `stores.service.ts` yang masih pakai `datetime('now')` → `NOW()`
- [ ] A3: Generate migration: `npx prisma migrate dev --name init_postgres`
- [ ] A3: Migration script: copy data dari `canteen.db` → Postgres (kalau ada data dev yang harus dipertahankan, opsional)
- [ ] A3: Run all 169 tests against Postgres → harus tetap 169/169 PASS
- [ ] A4: Identifikasi semua money fields (lihat list di `18-production-readiness-roadmap.md` Phase A4)
- [ ] A4: Migration: ALTER COLUMN money fields ke `BIGINT`
- [ ] A4: Update Prisma `Float` → `Int`
- [ ] A4: Update `pos-calculation.service.ts` integer-only arithmetic
- [ ] A4: Update `apps/pos-web/src/utils/fmt.ts` untuk integer rupiah
- [ ] A4: Update semua test files
- [ ] A4: Run all tests → 169/169 PASS

**Acceptance:**

- `psql $DATABASE_URL -c "\dt"` shows all tables
- 169 tests pass against Postgres
- Sample sale: 2× Rp 10.000 + 1× Rp 7.500 = Rp 27.500 exact
- DB query: `SELECT total FROM pos_sales LIMIT 1` returns BIGINT, no decimal

**Risk flag:**

- Float → Int conversion bisa hilang precision di legacy data. Migration script harus log warnings kalau ada nilai yang tidak bulat (seperti Rp 10.000,50). Manusia harus review log.

**Total estimated effort:** Manusia 2 jam, Agent 8 jam.

---

### Hari 3 — Email Auth Backend

**Manusia:**

- [ ] DNS domain setup di registrar:
  - SPF record: `v=spf1 include:_spf.resend.com ~all`
  - DKIM records (3 CNAME) — copy dari Resend dashboard "Domains" page
  - DMARC: `v=DMARC1; p=none; rua=mailto:postmaster@lecrion.id`
  - Wait propagation (~30 menit, max 24 jam)
- [ ] Verify domain di Resend dashboard → status "Verified"
- [ ] Set `EMAIL_FROM=Lecrion <noreply@lecrion.id>` di `.env.local`
- [ ] Test send via Resend dashboard ke email kamu sendiri → cek inbox (bukan spam)

**Agent:**

- [ ] B2: Create `apps/api/src/modules/email/`:
  - `email.module.ts`, `email.service.ts`, `email.types.ts`
  - `templates/verify-email.ts`, `password-reset.ts`, `welcome.ts`
- [ ] B2: Install `resend` SDK di apps/api
- [ ] B2: Methods: `sendVerificationEmail`, `sendPasswordResetEmail`, `sendWelcomeEmail`
- [ ] B3: Migration — tables `email_otps`, `password_reset_tokens`
- [ ] B3: Add `email_verified_at`, `two_factor_enabled` ke `users` table
- [ ] B4: Update `auth.service.ts`:
  - `register()`: create user, generate OTP, send email, return `{ needsVerification: true, email }`
  - `verifyEmail(email, code)`: validate, set `email_verified_at`, return tokens
  - `forgotPassword(email)`: generate token, send email, always 200
  - `resetPassword(token, password)`: validate token, update password
  - `login()`: block kalau `!email_verified_at` → 403
- [ ] B4: Add controllers + DTOs
- [ ] B4: Apply throttle: forgot-password 3/hour per email, verify-email 5 attempts/OTP

**Acceptance:**

- Test register via curl → email landing di inbox
- Test wrong OTP 6× → account locked 15 menit
- Test forgot password → email landing
- Test reset password → bisa login dengan password baru
- Email tidak masuk spam folder Gmail (test 2-3 akun)

**Risk flag:**

- Domain baru = spam folder kemungkinan tinggi. Mitigation: untuk 3 pilot merchant, kamu kasih instruksi cek spam folder + whitelist `noreply@lecrion.id`.

**Total estimated effort:** Manusia 2 jam (DNS + verify), Agent 10 jam.

---

### Hari 4 — Email Auth Frontend + Compliance

**Manusia:**

- [ ] Test sebagai end user: register flow lengkap di browser (kasih feedback ke agent kalau ada UX gap)
- [ ] Test forgot password flow di browser
- [ ] Test login dengan akun yang belum verify → harus reject

**Agent:**

- [ ] B5: Create pages:
  - `apps/pos-web/src/pages/VerifyEmailPage.tsx` — input 6-digit OTP, autosubmit, resend countdown 60s
  - `apps/pos-web/src/pages/ForgotPasswordPage.tsx` — input email, generic success message
  - `apps/pos-web/src/pages/ResetPasswordPage.tsx` — token from URL param, new password + strength meter
- [ ] B5: Update `RegisterPage.tsx` → setelah submit, redirect ke `/verify-email?email=...`
- [ ] B5: Update `LoginPage.tsx` → tambah link "Lupa password?", handle 403 "email belum diverifikasi" → redirect ke verify
- [ ] B5: Add routes di `apps/pos-web/src/routes/index.tsx`
- [ ] B5: Update `services/api.ts` — endpoints baru
- [ ] C1: Migration — add `store_id` to `menu` table, backfill `'default-store'`, add `@@unique([store_id, sku])`
- [ ] C1: Update `CatalogService` — semua query scoped per `storeId`
- [ ] C3: Update `PosSalesService.createSale` — REJECT kalau `dto.taxAmount` atau `dto.serviceChargeAmount` provided (400 error)
- [ ] C3: Server-side recalculate semua tax/SC dari `getCalcPolicy(storeId)`
- [ ] C3: Update frontend pos web — hapus tax calculation di client, baca dari API saja
- [ ] C6: Set `verification_status = 'pending'` di `auth.service.ts register()` (bukan auto-approved)
- [ ] C6: Update support dashboard untuk show pending merchants prominently

**Acceptance:**

- Browser test: register → email → verify → otomatis login
- Browser test: forgot → email → reset → login dengan password baru
- POST sale dengan `taxAmount: 999999` → 400 error
- Self-register hotel → status `pending`, support harus approve manual
- Catalog dari Hotel A tidak terlihat di Vape Store B

**Total estimated effort:** Manusia 3 jam (testing), Agent 10 jam.

---

### Hari 5 — Multi-Tenant Foundation + Backup + Sentry

**Manusia:**

- [ ] Verify backup script jalan: `psql $DATABASE_URL -c "\dt" | wc -l` di hari sebelum dan sesudah backup → angka sama
- [ ] Setup Sentry dashboard: assign owner, configure alert email

**Agent:**

- [ ] C2 (minimal viable): Tenant_id real
  - Buat tabel `tenants` (id, name, plan, created_at, suspended_at)
  - Migration: setiap unique store_id → unique tenant_id
  - Update `register()` flow: create tenant + store dalam 1 transaksi
  - Update JWT payload: `tenantId` populated correctly
  - Update `TenantGuard` enforcement (saat ini guard ada tapi value selalu `'default'`)
- [ ] C5: Backup script
  - `infra/scripts/backup.sh` — `pg_dump | gzip | upload to DO Spaces`
  - Cron via DO Droplet: daily 02:00 WIB
  - Retention: 7 daily, 4 weekly, 3 monthly
- [ ] D1: Sentry integration
  - Backend: `@sentry/nestjs` setup di `main.ts` dengan `SENTRY_DSN_API`
  - Frontend: `@sentry/react` setup di `main.tsx` dengan `SENTRY_DSN_WEB`
  - Source maps upload di build pipeline
  - PII scrubbing: redact `email`, `phone`, `password_hash`, `password`
- [ ] D3: Health check deeper
  - `/api/health/live` — process alive
  - `/api/health/ready` — DB reachable, can serve
  - `/api/health/startup` — semua module loaded

**Acceptance:**

- Backup script berhasil upload ke DO Spaces
- Tenant A merchant cannot read Tenant B data via raw SQL
- Test error di backend (throw at endpoint) → muncul di Sentry dashboard dengan readable stack trace
- `curl /api/health/ready` returns 200 with DB latency

**Risk flag:**

- Tenant isolation rush — pasti ada query yang missed `where: { tenant_id }`. Mitigation: pilot manually onboarded, public registration di-block sementara.

**Total estimated effort:** Manusia 1 jam, Agent 10 jam.

---

### Hari 6 — Bug Hunt + Polish + Documentation

**Manusia:**

- [ ] Full smoke test: pilot merchant flow end-to-end di browser
  - Register baru sebagai owner hotel
  - Verify email
  - Login
  - Buat 5 produk
  - Buat 3 transaksi
  - Logout, login lagi
  - Forgot password flow
- [ ] Catat semua bug yang ditemukan, kasih ke agent

**Agent:**

- [ ] Fix semua bug dari testing manusia
- [ ] Polish UI yang ke-skip:
  - Verify-email page polish (countdown, paste handling)
  - Forgot-password page polish (success message UX)
  - Login error states yang baru (email not verified, account locked)
- [ ] Documentation:
  - `docs_plan/22-pilot-merchant-onboarding-guide.md` — step-by-step buat merchant
  - `docs_plan/23-deploy-runbook-pilot.md` — deploy procedure
- [ ] Performance audit:
  - N+1 query check di catalog, orders
  - Slow query log di Postgres
  - Bundle size pos-web — kalau >1MB, lazy load aggressive

**Acceptance:**

- Manusia approve: 0 critical bug, max 3 minor bug acceptable
- Pos-web bundle <1MB gzipped untuk initial load
- Deploy runbook clear, kamu bisa replicate sendiri

**Total estimated effort:** Manusia 4 jam, Agent 8 jam.

---

### Hari 7 — Deploy + Pilot Onboarding

**Manusia:**

- [ ] Setup DNS records final di registrar:
  - `app.lecrion.id` → CNAME ke pos-web droplet IP
  - `api.lecrion.id` → CNAME ke API droplet IP
- [ ] Set environment variables di production droplet:
  - `DATABASE_URL` (DO Managed Postgres)
  - `JWT_SECRET` (generate fresh dengan `openssl rand -base64 32`)
  - `RESEND_API_KEY`
  - `SENTRY_DSN_API`, `SENTRY_DSN_WEB`
  - `EMAIL_FROM`, `CORS_ORIGINS`
- [ ] Deploy pakai script dari runbook
- [ ] Smoke test di production URL
- [ ] Onboarding pilot merchants:
  - Hotel: schedule call 30 menit, walk-through register + 5 transaksi pertama
  - Vape stores: same
  - Cafes: same (paling kompleks, ekstra waktu untuk KDS setup)
- [ ] Setiap merchant: kasih panduan PDF dari `22-pilot-merchant-onboarding-guide.md`

**Agent:**

- [ ] Deploy scripts final (`infra/deploy/deploy-prod.sh`)
- [ ] Dockerfile audit — pastikan production-ready (multi-stage build, non-root user, health check)
- [ ] On-call: standby untuk fix bug yang ditemukan saat pilot onboarding
- [ ] Monitor Sentry → fix critical errors immediately

**Acceptance:**

- 3 pilot merchants berhasil register, verify, login, buat transaksi pertama
- Sentry: 0 unresolved errors selama 4 jam pertama setelah onboarding
- Manusia confirm: pilot berjalan normal

**Risk flag:**

- Day 7 paling intense. Sediakan minimum 8 jam standby untuk fix issues.

**Total estimated effort:** Manusia 8 jam, Agent 6 jam.

---

## Total Effort Summary

| Hari      | Fokus                            | Manusia | Agent   |
| --------- | -------------------------------- | ------- | ------- |
| 1         | Foundation + security            | 2h      | 4h      |
| 2         | Postgres + money int             | 2h      | 8h      |
| 3         | Email auth backend               | 2h      | 10h     |
| 4         | Email auth frontend + compliance | 3h      | 10h     |
| 5         | Multi-tenant + backup + Sentry   | 1h      | 10h     |
| 6         | Bug hunt + polish                | 4h      | 8h      |
| 7         | Deploy + pilot onboarding        | 8h      | 6h      |
| **Total** |                                  | **22h** | **56h** |

**Manusia load:** ~3 jam/hari rata-rata, peak 8 jam di hari 7.
**Agent load:** ~8 jam/hari rata-rata.

---

## Risk Tracker

| Risk                                 | Likelihood | Impact   | Mitigation                                                      |
| ------------------------------------ | ---------- | -------- | --------------------------------------------------------------- |
| Postgres migration data loss         | Low        | Critical | Backup `canteen.db` sebelum migrate, dry-run script             |
| Money calculation bug post Float→Int | Medium     | Critical | All 169 tests must pass + manual reconcile sample data          |
| Email deliverability (spam)          | High       | High     | Domain warming gradual, kasih instruksi pilot merchant cek spam |
| Tenant data leak                     | Medium     | Critical | Pilot manually onboarded, public registration disabled          |
| Resend API quota hit                 | Low        | Medium   | Free tier 3k/bulan = ~100/hari, pilot 3 merchant aman           |
| DO Postgres outage                   | Low        | High     | Daily backup, restore drill di hari 6                           |
| Bug critical di production day 7     | High       | High     | Manusia standby 8 jam, agent on-call                            |
| Pilot merchant lose data karena bug  | Low        | Critical | Daily backup, comm channel dengan merchant                      |

---

## Yang Skip (Defer ke Minggu 2+)

| Item                                                   | Defer ke                  |
| ------------------------------------------------------ | ------------------------- |
| Real multi-tenancy hardening (full audit setiap query) | Week 2                    |
| Per-merchant WhatsApp bot                              | Week 2                    |
| Subscription billing                                   | Week 3                    |
| Payment gateway QRIS                                   | Week 3-4                  |
| CI/CD pipeline (GitHub Actions)                        | Week 2                    |
| Staging environment proper                             | Week 2                    |
| Code splitting aggressive                              | Week 2                    |
| PWA icons polish                                       | Week 2                    |
| i18n setup                                             | Post-pilot                |
| Privacy policy & ToS pages                             | Week 2 (legal compliance) |
| e-Faktur integration                                   | Post-pilot                |
| Load testing                                           | Week 3                    |
| SOC 2 readiness                                        | Post-pilot                |

---

## Daily Check-in Protocol

Setiap hari **end of day**:

1. Manusia review apa yang agent selesaikan
2. Run all tests: `npm test` di apps/api → harus 169/169 pass
3. Build check: `npm run build` di apps/pos-web → no errors
4. Update task list di file ini (centang yang done)
5. Identify blockers untuk besok

Kalau hari N ada delay, **defer item ke hari N+1 jangan rush**. Lebih baik 6 hari + 1 hari buffer daripada 7 hari rush dengan bug.

---

## Reference Files

- `18-production-readiness-roadmap.md` — full roadmap with all 40 items
- `20-agent-execution-instructions.md` — instruksi detail untuk AI agent
- Architecture: `lecrion.md`, `01-blueprint.md`, `03-file-architecture.md`
- Current implementation status: `implementation-status.md`
