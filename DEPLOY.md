# Deploy Lecrion

Panduan menjalankan Lecrion di produksi lewat GitHub Actions.

## Ringkasan arsitektur

Lecrion adalah monorepo dengan empat bagian yang berjalan sebagai tiga container:

| Container | Isi | Port publik |
|---|---|---|
| `api` | NestJS — REST `/api/*`, Socket.IO `/ws/realtime`, webhook WhatsApp `/api/bot/webhook` | tidak ada (internal) |
| `worker` | Outbox processor, penjadwal read-model, alert stok menipis | tidak ada (internal) |
| `web` | SPA kasir (React + Vite, PWA) di balik nginx, mem-proxy `/api` ke `api` | tidak ada (internal) |
| `caddy` | Terminasi TLS, sertifikat Let's Encrypt otomatis | 80, 443 |

Dua hal yang menentukan bentuk deployment:

- **Frontend memakai path relatif `/api`**, jadi SPA dan API harus satu origin.
  Hosting statis murni (GitHub Pages, Netlify) tidak cukup — nginx di container
  `web` yang menyatukan keduanya.
- **Database SQLite** (`database/canteen.db`) berupa file, ditulis oleh `api`
  dan `worker` lewat volume Docker bersama. Artinya deployment ini **satu
  node** — jangan menjalankan dua replika `api` di mesin berbeda. Untuk skala
  lebih besar, migrasi ke PostgreSQL; jalurnya sudah dicatat di
  `prisma.config.ts`.

## Yang dibutuhkan

1. **Satu VPS Linux kecil.** 1 vCPU / 1 GB RAM sudah cukup untuk satu toko.
   Yang penting bisa dipasang Docker dan punya IP publik.
2. **Domain** yang A-record-nya mengarah ke IP VPS tersebut.
3. Repo ini di GitHub (sudah ada: `gibssheree/lecrion`).

Alurnya: push ke `main` → GitHub Actions membangun tiga image → mendorongnya ke
GitHub Container Registry (GHCR) → SSH ke VPS → `docker compose pull && up -d`.
Server tidak pernah build sendiri, jadi VPS kecil pun cukup dan deploy cepat.

---

## Langkah 1 — Siapkan server

Masuk ke VPS sebagai root atau user dengan sudo.

```bash
# Pasang Docker
curl -fsSL https://get.docker.com | sh

# Buat user khusus deploy (jangan pakai root untuk SSH otomatis)
adduser --disabled-password --gecos "" deploy
usermod -aG docker deploy

# Direktori stack
mkdir -p /opt/lecrion
chown -R deploy:deploy /opt/lecrion
```

Buka port 80 dan 443 di firewall:

```bash
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw enable
```

## Langkah 2 — Buat kunci SSH untuk GitHub Actions

**Di komputer Anda** (bukan di server):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/lecrion_deploy -N "" -C "github-actions-lecrion"
```

Salin kunci publiknya ke server:

```bash
ssh-copy-id -i ~/.ssh/lecrion_deploy.pub deploy@IP_SERVER
```

Kunci **privat** (`~/.ssh/lecrion_deploy`, seluruh isinya termasuk baris
`-----BEGIN...` dan `-----END...`) nanti dimasukkan sebagai secret GitHub.

## Langkah 3 — Buat `.env` di server

File ini menyimpan seluruh rahasia runtime. Sengaja **tidak** disimpan di
GitHub Secrets: ia hanya perlu ada di server, dan menyimpannya di satu tempat
membuatnya lebih mudah diaudit.

```bash
ssh deploy@IP_SERVER
cd /opt/lecrion
```

Salin isi `.env.example` dari repo ke `/opt/lecrion/.env`, lalu isi minimal:

```bash
# Wajib — API menolak start bila kosong
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Ganti dengan domain Anda
DASHBOARD_ORIGIN=https://pos.contoh.com

# Ganti nilai acak — punya default yang bisa ditebak di dalam kode
BOT_API_KEY=$(openssl rand -hex 24)
WORKER_API_KEY=$(openssl rand -hex 24)
DASHBOARD_API_KEY=$(openssl rand -hex 24)
```

Cara cepat membuatnya langsung di server:

```bash
cat > /opt/lecrion/.env <<EOF_ENV
DATABASE_URL=file:/app/database/canteen.db
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
AUTH_DISABLED=false
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BOT_API_KEY=$(openssl rand -hex 24)
WORKER_API_KEY=$(openssl rand -hex 24)
DASHBOARD_API_KEY=$(openssl rand -hex 24)
DASHBOARD_ORIGIN=https://pos.contoh.com
DEFAULT_STORE_ID=default-store
DEFAULT_TENANT_ID=default
EOF_ENV
chmod 600 /opt/lecrion/.env
```

Ganti `pos.contoh.com` dengan domain Anda. Variabel opsional lainnya
(WhatsApp, Gemini, ambang batas kasir) ada di `.env.example` — bisa ditambahkan
kapan saja, lalu jalankan ulang deploy.

## Langkah 4 — Isi secret di GitHub

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Wajib | Isi |
|---|---|---|
| `SSH_HOST` | ya | IP atau hostname VPS |
| `SSH_USER` | ya | `deploy` |
| `SSH_PRIVATE_KEY` | ya | Seluruh isi `~/.ssh/lecrion_deploy` |
| `LECRION_DOMAIN` | ya | `pos.contoh.com` (tanpa `https://`) |
| `SSH_PORT` | tidak | Default `22` |
| `APP_DIR` | tidak | Default `/opt/lecrion` |

`GITHUB_TOKEN` untuk mendorong image ke GHCR disediakan otomatis oleh Actions —
tidak perlu dibuat.

## Langkah 5 — Deploy

Push ke `main`, atau jalankan manual lewat **Actions → Deploy → Run workflow**.

Workflow akan:

1. Membangun image `api`, `worker`, dan `web`, mendorongnya ke GHCR dengan tag
   `latest` dan commit SHA.
2. Menyalin `docker-compose.prod.yml`, `Caddyfile`, dan `remote-deploy.sh` ke
   server.
3. Menarik image dan menjalankan `docker compose up -d`. Container `api`
   menjalankan `prisma migrate deploy` saat start, dan `worker` menunggu `api`
   sehat — jadi migrasi selalu selesai sebelum ada proses lain menyentuh DB.
4. Memverifikasi `https://DOMAIN/api/health` menjawab `ok`, dan gagal keras bila
   tidak.

Bila secret SSH belum diisi, job deploy tidak error — ia berhenti dengan
ringkasan yang menyebut secret mana yang kurang, sementara image tetap terbangun
dan tersedia di GHCR.

## Langkah 6 — Buat akun pertama

Database baru masih kosong. Isi data awal sekali saja:

```bash
ssh deploy@IP_SERVER
cd /opt/lecrion
docker compose -f infra/docker/docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

Seed membuat akun owner `admin@lecrion.com` / `admin123`.
**Ganti password ini segera setelah login pertama.** Seed juga membuat beberapa
akun QA dengan password yang diketahui publik (ada di `prisma/seed.ts`) — hapus
akun yang tidak Anda perlukan sebelum dipakai pelanggan.

Buka `https://DOMAIN` dan login.

---

## Menghubungkan WhatsApp (Fonnte)

Bot berjalan **di dalam** container `api`, bukan container terpisah. Setelah
punya token Fonnte:

1. Tambahkan ke `/opt/lecrion/.env`:
   ```
   FONNTE_TOKEN=token_anda
   FONNTE_WA_NUMBER=6281234567890
   FONNTE_WEBHOOK_SECRET=nilai_acak_pilihan_anda
   ```
2. Di dashboard Fonnte, arahkan webhook ke:
   `https://DOMAIN/api/bot/webhook`
3. Terapkan ulang: jalankan workflow **Deploy**, atau di server:
   ```bash
   cd /opt/lecrion
   docker compose -f infra/docker/docker-compose.prod.yml up -d
   ```

Untuk fitur AI, tambahkan `GEMINI_API_KEY` dengan cara yang sama.

## Operasional harian

Semua perintah dijalankan dari `/opt/lecrion` di server.

```bash
C="docker compose -f infra/docker/docker-compose.prod.yml"

$C ps                    # status container
$C logs -f api           # log API
$C logs -f worker        # log worker
$C restart api           # restart satu service
```

**Cadangkan database** — ini satu file, dan isinya data penjualan Anda:

```bash
docker run --rm -v lecrion_lecrion_db:/db -v "$PWD":/backup alpine \
  tar czf /backup/lecrion-db-$(date +%F).tar.gz -C /db .
```

Jadwalkan lewat cron. Nama volume mengikuti pola `<nama-direktori>_lecrion_db`;
pastikan dengan `docker volume ls`.

**Reset password** bila terkunci:

```bash
$C exec api npx tsx scripts/reset-password.ts
```

Rinciannya ada di `docs_plan/22-manual-password-reset-runbook.md`.

## Bila deploy gagal

| Gejala | Penyebab umum |
|---|---|
| `.env tidak ada di server` | Langkah 3 terlewat |
| `api tidak menjadi healthy` | `JWT_SECRET` / `JWT_REFRESH_SECRET` kosong. Cek `$C logs api` |
| Sertifikat TLS tidak terbit | A-record domain belum mengarah ke IP server, atau port 80 tertutup |
| `Permission denied (publickey)` | `SSH_PRIVATE_KEY` tidak lengkap — harus termasuk baris BEGIN/END |
| Halaman terbuka tapi API 502 | Container `api` mati; cek `$C logs api` |

## Deploy manual tanpa GitHub Actions

Bila perlu menerapkan dari server secara langsung:

```bash
cd /opt/lecrion
export IMAGE_PREFIX=ghcr.io/gibssheree/lecrion
export IMAGE_TAG=latest
export LECRION_DOMAIN=pos.contoh.com
bash infra/deploy/remote-deploy.sh
```

Bila image di GHCR bersifat privat, `docker login ghcr.io` dulu memakai
Personal Access Token dengan scope `read:packages`.

## Catatan tentang skala

Deployment ini satu node karena SQLite. Batasnya cukup jauh untuk satu sampai
beberapa toko, tapi bila Anda butuh beberapa node atau volume tulis tinggi,
pindah ke PostgreSQL: ubah `provider` di `prisma/schema.prisma`, set
`DATABASE_URL` ke connection string PostgreSQL, jalankan `prisma migrate dev`,
lalu lepas dependensi `better-sqlite3`. Langkah lengkapnya ada di komentar
`prisma.config.ts`.
