# Lecrion — AI Agent Execution Instructions

> **Read this file first** sebelum mulai task apapun.
> Companion files: `18-production-readiness-roadmap.md` (strategy), `19-pilot-execution-plan-week1.md` (day-by-day tasks).
>
> **Audience:** AI coding agents (Claude/GPT/etc) yang akan eksekusi task per hari.

---

## Mission Brief

Bangun Lecrion dari 4.5/10 SaaS-readiness ke 6.5/10 dalam 7 hari, **siap pilot 3 merchant** (1 hotel, 2 vape store, 3 cafe). Fokus: Postgres, money integer, email auth, multi-tenant basic, observability.

**Out of scope minggu ini:** payment gateway, billing/subscription, CI/CD pipeline, e-Faktur, i18n, full multi-tenancy hardening, per-merchant WA.

---

## Cara Pakai Dokumen Ini

1. **Baca dulu** `19-pilot-execution-plan-week1.md` untuk konteks hari ini.
2. **Identifikasi task hari ini** dari section "Day-by-Day Execution".
3. **Sebelum tulis kode**, baca file relevan di codebase yang akan disentuh.
4. **Setelah selesai task**, run validation (test, build) sebelum lanjut ke task berikutnya.
5. **Update checkbox** di file 19 setiap task selesai.

---

## Codebase Quick Reference

### Struktur Monorepo

```
lecrion/
├── apps/
│   ├── api/               NestJS backend, port 3000
│   ├── pos-web/           React + Vite cashier UI, port 5174
│   ├── bot/               WhatsApp bot
│   └── worker/            Background workers
├── libs/
│   ├── contracts/         Shared types, enums, events
│   ├── db/                Prisma service
│   ├── common/            Logger, telemetry
│   ├── queue/             Outbox + BullMQ
│   └── realtime/          Socket.IO
├── prisma/
│   └── schema.prisma      DB schema (currently SQLite, target Postgres)
├── infra/                 Docker, deploy scripts
├── database/canteen.db    Dev database (will be migrated)
└── docs_plan/             Documentation (you are reading file 20)
```

### Stack

- Backend: NestJS 10, Prisma, JWT, Socket.IO, bcryptjs
- Frontend: React 18, Vite 5, Zustand, React Router v6, Framer Motion
- DB: SQLite (dev) → PostgreSQL (target)
- Tests: Jest, 169 specs covering money paths

### Environment

- Node version: see `.nvmrc` or `package.json` engines
- Package manager: npm (workspaces)
- Run dev: `npm run start:api:dev` + `npm run dev:pos`
- Run tests: `cd apps/api && npm test`
- Build: `npm run build` per app

---

## Critical Rules — JANGAN DILANGGAR

### Rule 1: Money fields harus integer (after Day 2)

Setelah Day 2 migration:

- ❌ JANGAN: `price: 12.5`
- ✅ HARUS: `price: 12500` (rupiah penuh)
- ❌ JANGAN: `Math.round(subtotal * tax_rate)` di middle of arithmetic
- ✅ HARUS: kerjakan di integer end-to-end, format hanya saat display: `Rp{n.toLocaleString('id-ID')}`

Money fields list: lihat `19-pilot-execution-plan-week1.md` Day 2 Phase A4.

### Rule 2: Server-authoritative pricing — JANGAN BACKDOOR

POS sale calculation dilakukan **server-side only**.

- ❌ JANGAN: trust `dto.taxAmount`, `dto.serviceChargeAmount`, `dto.unitPrice` dari client
- ✅ HARUS: lookup harga dari `menu.price` di DB, hitung tax dari `getCalcPolicy(storeId)`
- Server harus REJECT (400 error) kalau client kirim tax/SC override

### Rule 3: Tenant isolation di SETIAP query

- ❌ JANGAN: `prisma.menu.findMany()` tanpa where clause
- ✅ HARUS: `prisma.menu.findMany({ where: { store_id: storeId } })`

Untuk admin/support endpoints yang cross-tenant: explicit comment `// CROSS-TENANT — support only`.

### Rule 4: Idempotency keys harus dipakai untuk write yang penting

POS sale: `clientSaleId` mandatory.
Payment: `idempotency_key` mandatory.
Saat agent buat new write endpoint, tanya: "Apa konsekuensi kalau client retry karena network timeout?" Kalau jawabannya bad, butuh idempotency.

### Rule 5: Audit log untuk SETIAP money-related action

Setelah action create/update/delete yang melibatkan uang:

```ts
await this.audit.record({
  actor: user.actor,
  action: 'pos.sale.created',
  resource: 'pos_sales',
  resourceId: sale.id,
  after: { total: sale.total, ... },
  storeId,
  tenantId,
});
```

### Rule 6: Tests must pass before commit

Sebelum agent melaporkan task selesai:

```bash
cd apps/api && npm test         # 169/169 must pass
cd apps/pos-web && npm run build # must succeed
```

Kalau test break karena perubahan agent, FIX TEST atau revert. Jangan commit broken state.

### Rule 7: Migration files versioned

Setelah Day 2:

- ❌ JANGAN: `prisma db push` (skip migration files)
- ✅ HARUS: `prisma migrate dev --name <descriptive>` (creates migration file)
- Migration file harus committed ke git
- Migration tidak boleh diedit setelah applied

### Rule 8: Secrets jangan checked-in

- `.env.local` → gitignored, contains real secrets
- `.env.example` → checked-in, contains placeholder values
- Generate JWT secret untuk production: `openssl rand -base64 32`
- Production env vars di server, BUKAN di file

---

## Task Execution Protocol

### Sebelum Mulai Task

1. **Baca task description** lengkap di file 19
2. **Identifikasi file yang akan disentuh** — list out, jangan kerjakan blind
3. **Baca existing code** yang akan diubah
4. **Identifikasi tests** yang related — run dulu untuk baseline
5. **Plan migration strategy** kalau touch schema

### Saat Implementasi

1. **Small commits**: 1 task = 1-3 commits, tidak satu mega-commit
2. **Commit message format**:
   - `feat(api): add email verification flow`
   - `fix(pos-web): money formatting after int migration`
   - `chore(prisma): switch provider to postgresql`
   - `test(pos): cover refund with split payment`
3. **Comment WHY, not WHAT**: kode jelas WHAT-nya, comment jelaskan kenapa decision dibuat
4. **No magic numbers**: extract ke constant dengan nama jelas

### Setelah Task Selesai

1. **Run validation:**
   ```bash
   cd apps/api && npm test
   cd apps/api && npm run build
   cd apps/pos-web && npm run build
   ```
2. **Manual smoke test** untuk task yang touch UI
3. **Update file 19** — centang task di checkbox
4. **Document edge cases** yang ditemukan di comment atau separate doc
5. **Flag blocker** kalau ada — tulis di top of file 19 sebagai TODO untuk manusia

---

## Specific Task Patterns

### Pattern: Schema Migration (Day 2 Postgres + others)

```bash
# 1. Edit schema.prisma
# 2. Generate migration
cd apps/api  # or wherever Prisma is
npx prisma migrate dev --name <descriptive_name>

# 3. Verify migration file in prisma/migrations/<timestamp>_<name>/migration.sql
# 4. Test: drop dev DB, re-migrate, run seeds
# 5. Run tests
```

**Critical:** SQLite & Postgres syntax differences:

- SQLite: `String @default("datetime('now')")` → Postgres: `DateTime @default(now())`
- SQLite: `Boolean` stored as `Int` 0/1 → Postgres: native `BOOLEAN`
- SQLite raw query `datetime('now')` → Postgres `NOW()`

### Pattern: Money Field Float → Int

For each model with money:

```prisma
// Before
total Float

// After
total Int  // integer rupiah, no decimal
```

Migration SQL:

```sql
ALTER TABLE pos_sales
  ALTER COLUMN total TYPE BIGINT
  USING ROUND(total)::BIGINT;
```

TypeScript:

```ts
// Before
const total = subtotal * (1 + taxRate); // possibly float

// After
const total = subtotal + Math.round(subtotal * taxRate); // integer
```

Display:

```tsx
// Before
<span>Rp{(total / 100).toFixed(2)}</span>

// After
<span>Rp{total.toLocaleString('id-ID')}</span>
```

### Pattern: Email Send

```ts
// In any service
constructor(private readonly emailService: EmailService) {}

async someMethod() {
  await this.emailService.sendVerificationEmail({
    to: user.email,
    code: '123456',
    name: user.name,
  });
}
```

### Pattern: Throttle a Specific Endpoint

```ts
import { Throttle } from '@nestjs/throttler';

@Throttle({ default: { ttl: 60_000, limit: 5 } })  // 5 req/min
@Post('login')
async login(@Body() dto: LoginDto) { ... }
```

### Pattern: Tenant-Scoped Query

```ts
// In any service that reads tenant data
async findProducts(tenantId: string, storeId: string) {
  return this.prisma.menu.findMany({
    where: {
      store_id: storeId,
      // tenant_id removed if menu has no tenant_id; rely on store_id
    },
  });
}
```

For models that have BOTH tenant_id and store_id (like `pos_sales`):

```ts
where: { tenant_id: tenantId, store_id: storeId }
```

### Pattern: New Frontend Page

1. Create file: `apps/pos-web/src/pages/<PageName>.tsx`
2. Wrap with `PosAppShell` for layout (or PosShell for cashier-style)
3. Use existing primitives: `dashboard-card`, `summary-card`, `pos-data-table`
4. Add route in `apps/pos-web/src/routes/index.tsx`
5. Add nav item in `apps/pos-web/src/navigation/navigation.registry.tsx` if visible in sidebar
6. Use shared hooks: `useApi`, `useToast`, `usePagination`

---

## Common Pitfalls — JANGAN ULANGI

### Pitfall 1: Strip CSS Berlebihan

Pernah terjadi: agent strip CSS dari `index.css` dengan range marker, malah hapus 1265 baris non-related.

**Solusi:** Jangan pakai script broad-strip untuk CSS. Pakai `str_replace` dengan exact context yang short, atau read seluruh file dulu sebelum modify.

### Pitfall 2: Modify File Tanpa Baca Dulu

Agent edit file blind, ternyata structure sudah berubah karena prettier auto-format → str_replace gagal match.

**Solusi:** Baca file dengan `read_file` sebelum `str_replace`. Pakai exact whitespace match.

### Pitfall 3: NestJS Module Tidak Import Dependency

Pernah terjadi: `SupportModule` pakai `JwtAuthGuard` tapi tidak import `AuthModule` → resolve dependency error at boot.

**Solusi:** Saat tambah controller dengan `@UseGuards`, cek dependency injection di module dengan controller serupa, copy import pattern.

### Pitfall 4: SQLite-Specific Syntax di Schema

`String @default("datetime('now')")` adalah workaround SQLite, tidak compatible Postgres.

**Solusi:** Setelah Day 2, ganti ke `DateTime @default(now())` di seluruh schema.

### Pitfall 5: Test Pass tapi UI Break

Agent fix backend test, tapi tidak test UI yang depend on response shape baru.

**Solusi:** Setiap perubahan API response, run `npm run build` di pos-web — TypeScript akan catch breaking change kalau API client di-import dengan strict types.

### Pitfall 6: Vertical/Constants Hardcoded di Banyak Tempat

Sudah terjadi: business verticals di-hardcode di 5 file beda → minggu ini sudah di-consolidate ke `apps/pos-web/src/constants/verticals.ts`.

**Solusi:** Saat tambah enum/constant baru, cari "single source of truth" file dulu. Kalau belum ada, BUAT di `constants/` atau `libs/contracts/`. Jangan duplicate.

---

## Decision Authority

**Agent boleh decide sendiri:**

- Code structure, naming, file organization
- TypeScript types, interfaces
- Internal helper functions
- CSS class names, component structure
- Test cases dan coverage

**Agent HARUS tanya manusia:**

- Database schema breaking change (drop column, rename)
- API contract change (URL, method, request shape)
- Permission/role definition baru
- Business logic edge case yang ambigu (misal: "kalau refund melebihi paid_amount, error atau accept dengan warning?")
- Pricing calculation yang affect uang

---

## Communication Protocol

### Saat Agent Selesai Task

Lapor manusia dengan format:

```
✅ Task: [task name]
📁 Files changed: [list]
🧪 Tests: 169/169 pass
🏗️ Build: success
📝 Notes: [edge cases, decisions made, follow-up needed]
```

### Saat Agent Stuck atau Butuh Decision

Lapor manusia dengan format:

```
🚧 Blocker: [what's blocking]
📁 Context: [files involved]
💡 Options:
  A. [approach 1] — pros: ..., cons: ...
  B. [approach 2] — pros: ..., cons: ...
🔮 Recommendation: [agent's suggestion]
```

### Saat Bug Production di Day 7

Severity classification:

- **P0** (data loss, financial bug, total outage): drop everything, fix in <1h
- **P1** (feature broken, partial outage): fix in <4h
- **P2** (UX issue, edge case): backlog, fix Day 8+

---

## Tools Yang Boleh Dipakai Agent

✅ Read/write file dalam codebase
✅ Run shell command (test, build, prisma migrate, npm install)
✅ Modify schema.prisma + generate migration
✅ Install npm packages
✅ Edit `.env.example` (placeholder values)
✅ Search codebase

❌ Edit `.env.local` (secrets)
❌ Push to git remote (manusia review dulu)
❌ Deploy ke production
❌ Make external API call dengan production credentials
❌ Modify file di `docs_plan/` selain update checkbox di file 19 (untuk preserve plan integrity)

---

## Definition of Done — Day 7 (End of Week 1)

Bisa dilihat **production-ready untuk 3 pilot merchant** kalau semua ini check:

### Backend

- [ ] Postgres connected, all tests pass against PG
- [ ] Money fields integer everywhere, no precision drift in test data
- [ ] Helmet + throttler + CORS env-driven all working
- [ ] Email auth full flow: register → verify → login
- [ ] Forgot password flow working end-to-end
- [ ] `store_id` di menu, queries scoped
- [ ] Server-side tax/SC enforcement
- [ ] tenant_id real (bukan hardcoded)
- [ ] Backup script running daily, verified once
- [ ] Sentry capturing errors

### Frontend

- [ ] Verify-email page polished
- [ ] Forgot-password page polished
- [ ] Reset-password page polished
- [ ] Login error states handle "email not verified"
- [ ] Verticals consolidated to 5 (already done)
- [ ] Money display correct (Rp{n.toLocaleString('id-ID')})
- [ ] Bundle <1MB gzipped initial load

### Operations

- [ ] Deploy script tested
- [ ] DNS configured for app + api subdomain
- [ ] HTTPS via Cloudflare or Let's Encrypt
- [ ] Smoke test on production URL pass
- [ ] 3 pilot merchants registered, verified, logged in, made first transaction
- [ ] Sentry: 0 unresolved errors at 4h post-launch

### Documentation

- [ ] `19-pilot-execution-plan-week1.md` all checkboxes done
- [ ] `22-pilot-merchant-onboarding-guide.md` written
- [ ] `23-deploy-runbook-pilot.md` written

---

## Quick Start for First-Time Agent

Kalau ini pertama kali kamu (agent) baca dokumen ini, langkah:

1. Baca `lecrion.md` untuk pahami arsitektur high-level
2. Baca `18-production-readiness-roadmap.md` untuk pahami 40-item plan
3. Baca `19-pilot-execution-plan-week1.md` untuk pahami priority & timeline
4. Identifikasi hari ini hari ke berapa (Day 1 to Day 7)
5. Cek checkbox yang belum centang di hari itu
6. Mulai task pertama yang belum done
7. Follow protocol di file ini saat eksekusi

**Bonne chance.** Kerja smart, bukan hanya cepat. Quality > speed untuk uang.

Yang Aman Dikerjakan SEKARANG (Tanpa External)
Task-task ini bisa langsung mulai, tidak butuh akun eksternal:

Day 1 tasks:

✅ Cleanup dist/ dari git tracking
✅ Buat .env.example
✅ Audit .gitignore
✅ Install + setup helmet
✅ Install + setup throttler
✅ CORS dari env (default fallback ke localhost untuk dev)
✅ Setup prisma migrate workflow scripts
Code refactor (tambahan dari analisis tadi):

✅ Generate proper Prisma types untuk hilangkan 30+ as any di auth.service, support.service
✅ Replace 2 TODO (pos-approval PIN, bot phone resolution) dengan implementasi proper
✅ Implementasi BullMQ scaffold (sudah ada placeholder)
✅ Frontend UX improvements minor
Day 2 partial:

✅ Update
schema.prisma
ke postgresql provider (tapi belum bisa migrate sampai DB ready)
✅ Convert all String @default("datetime('now')") → DateTime @default(now())
✅ Update raw SQL datetime('now') → NOW() di stores.service
✅ Money fields Float → Int conversion di schema + code (TANPA running migration — schema saja)
Yang TIDAK Aman Sebelum Eksternal Ready
Task Butuh Apa Dulu
Run Postgres migration DATABASE_URL dari DO Managed PG
Run all 169 tests against PG DB ready
Email sending integration RESEND_API_KEY + domain verified
Email DNS test deliverability Domain dibeli + DNS propagasi
Sentry integration SENTRY_DSN
Production deploy Server access, domain, SSL
Risiko Spesifik
Risiko 1: Postgres schema migration tanpa real DB Kalau saya update schema.prisma ke postgresql provider, lalu tidak ada DB postgres yang bisa di-test, kita tidak tahu apakah migration akan jalan. Saya bisa minimize risk dengan:

Spin up Postgres lokal via Docker (1 command, 30 detik)
Test migration di sana
Pas DO PG ready, replay migration yang sama
Risiko 2: Money Float → Int kehilangan precision di legacy data Saya bisa tulis migration script yang LOG warning kalau ada data yang tidak bulat. Manusia review sebelum apply ke production. Aman kalau follow ini.

Risiko 3: Tests break selama refactor 169 tests jadi safety net. Kalau ada yang break karena perubahan, fix dulu sebelum lanjut. Aman karena visible immediately.

Risiko 4: Email auth tanpa Resend integration Saya bisa implement struktur full (modules, tables, controllers) dengan mock email service. Pas kamu kasih API key, swap mock dengan real Resend. Aman.

Rekomendasi
Eksekusi 2 mode paralel:

Mode A — Saya kerjakan SEKARANG (low risk, no external dep):

Day 1 tasks lengkap (cleanup, helmet, throttler, .env.example)
Code quality fixes (as any cleanup, console.log scan, TODO resolution)
Schema refactor untuk Postgres compatibility (tanpa migrate)
Money Float → Int di schema + code (tanpa migrate)
Email auth structure (modules, tables, mock service)
Test suite tetap 169 pass
Mode B — Tunggu kamu setup external:

Postgres migrate actual
Email Resend wiring
Sentry integration
DNS configuration
Production deploy
Setelah Mode A selesai, kalau Mode B external ready dalam 1-2 hari → swap mock ke real, run migrate, deploy. Total acceleration ~3-4 hari.

Quick Risk Check
Saya re-list yang perlu kamu tahu sebelum saya mulai Mode A:

Concern Status
Saya akan break 169 tests? Tidak. Kalau break, saya stop dan fix dulu.
Saya akan modify file di luar scope task? Tidak, kecuali dependencies (misal update import)
Saya akan delete data dev kamu (canteen.db)? Tidak. Saya touch schema saja, data SQLite masih ada untuk dev.
Saya akan commit dan push? Tidak. Saya stop di "ready to commit", kamu review.
Email auth akan kirim email beneran? Tidak. Pakai mock service yang log to console sampai Resend wired.
as any cleanup akan break runtime? Risk rendah karena saya verify dengan TypeScript compiler + tests.
Verdict: AMAN kalau kerjakan Mode A. Kerjakan 8-12 jam Mode A, kamu setup external paralel, lalu Mode B sehari setelahnya.

Mau saya mulai Mode A sekarang?

Kalau iya, urutan eksekusi yang saya saranin:

Pre-flight: backup canteen.db, verify all 169 tests pass current
Day 1 quick wins: cleanup, helmet, throttler, .env.example (1-2 jam)
Code quality: cleanup obvious as any, replace TODO PIN dengan bcrypt (2-3 jam)
Schema refactor for PG: provider switch, datetime fix, raw SQL fix (2-3 jam)
Money Float → Int: schema + code update (TANPA migrate yet) (3-4 jam)
Email auth structure: tables, module, mock service (3-4 jam)
Total: 11-16 jam equivalent kerja Mode A. Bisa saya kerjakan parallel selama kamu setup external.

Konfirmasi: lanjut Mode A sekarang?

Est. Credits Used: 5.93
Elapsed time: 4
