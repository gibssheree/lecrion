# Deploy Lecrion

Panduan menjalankan Lecrion di produksi.

Ada tiga jalur:

- **Opsi PaaS — Railway / Render** (paling sederhana). Hubungkan repo GitHub,
  tiap push langsung deploy. Tidak perlu menyewa atau mengurus server.
- **Opsi A — VPS + GitHub Actions** (otomatis, push ke `main` langsung deploy).
  Butuh GitHub Actions aktif di akun Anda.
- **Opsi B — VPS, build di server** (manual, tanpa Actions sama sekali).

> **Status akun saat ini:** GitHub Actions di akun `gibssheree` sedang terkunci —
> setiap job berhenti dengan *"The job was not started because your account is
> locked due to a billing issue."* Repo ini publik, jadi ini bukan soal kuota
> menit (public repo dapat menit tanpa batas), melainkan tagihan atau metode
> pembayaran di akun. Selesaikan di **https://github.com/settings/billing**,
> lalu Opsi A langsung bisa dipakai. Sampai itu beres, **pakai Opsi B** — hasil
> akhirnya identik.

---

# Opsi PaaS — Railway / Render

Jalur paling sederhana: tidak ada server yang perlu Anda urus, dan deploy
terhubung langsung ke repo GitHub ini.

## Kenapa satu service, bukan tiga

Di Docker Compose, Lecrion berjalan sebagai tiga container (api, worker, web).
Di PaaS itu tidak bisa, karena dua batasan nyata:

- **Persistent disk hanya menempel ke satu service.** API dan worker
  menulis file SQLite yang sama, jadi keduanya harus satu container.
- **SPA harus satu origin dengan API.** Frontend memanggil API dengan path
  relatif dan membuka Socket.IO ke `window.location.origin`.

Karena itu ada `infra/docker/Dockerfile.allinone`: satu image berisi API
(sekaligus menyajikan SPA), worker, dan migrasi. Tidak ada nginx — API
menyajikan file SPA sendiri lewat `CLIENT_DIST_DIR`. Worker dijalankan sebagai
JavaScript terkompilasi, jadi tidak ada devDependency yang ikut ke produksi.

`scripts/start-allinone.js` mengurus urutannya: migrasi → worker → API. Bila
salah satu proses mati, container ikut berhenti supaya platform me-restart-nya
— lebih baik terlihat mati daripada jalan separuh.

## Biaya — baca ini dulu

**Tier gratis tidak bisa dipakai.** Baik Render maupun Railway menghapus
penyimpanan pada tier gratis, dan Lecrion menyimpan seluruh transaksi di file
SQLite. Tanpa persistent disk berbayar, data penjualan Anda hilang setiap kali
service restart.

Perkiraan biaya (verifikasi harga terkini di situs masing-masing, bisa berubah):

| Platform | Perkiraan | Catatan |
|---|---|---|
| Railway | ~$5/bln | Volume termasuk. Region Singapura tersedia |
| Render | ~$7/bln + disk | Blueprint `render.yaml` sudah disiapkan di repo ini |

Keduanya memakai image yang sama, jadi Anda bisa pindah kapan saja.

## Render (blueprint sudah siap)

Repo ini sudah berisi `render.yaml`, jadi Render bisa membuat service-nya
sendiri:

1. **Dashboard Render → New → Blueprint** → pilih repo `gibssheree/lecrion`.
2. Pilih branch `claude/lecrion-github-deploy-p90c6i` (perbaikannya ada di
   sana, belum di `main`).
3. Render membaca `render.yaml` dan menyiapkan service, disk 1 GB di
   `/app/database`, serta mengacak sendiri `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   dan ketiga API key.
4. Build pertama ~5–10 menit.

Setelah service hidup, sambungkan domain Anda:

- **Settings → Custom Domain** → masukkan `pos.domainanda.com`
- Render memberi target CNAME; buat record itu di DNS Anda
- TLS diterbitkan otomatis

Lalu isi dua environment variable yang sengaja dikosongkan:

- `DASHBOARD_ORIGIN` = `https://pos.domainanda.com`
- `SEED_ON_START` = `true` **hanya untuk boot pertama**

Setelah deploy pertama selesai dan Anda bisa login, **kembalikan
`SEED_ON_START` ke `false`**. Kalau dibiarkan `true`, akun QA yang Anda hapus
akan muncul lagi tiap restart.

## Railway

Railway tidak butuh file konfigurasi — ia membaca Dockerfile langsung:

1. **New Project → Deploy from GitHub repo** → pilih repo ini, branch
   `claude/lecrion-github-deploy-p90c6i`.
2. **Settings → Build** → set Dockerfile path ke
   `infra/docker/Dockerfile.allinone`.
3. **Settings → Volumes** → tambahkan volume dengan mount path
   `/app/database`. **Jangan lewatkan langkah ini** — tanpa volume, database
   hilang tiap deploy.
4. **Variables** → isi seperti daftar di bawah.
5. **Settings → Networking → Custom Domain** → masukkan domain Anda, lalu buat
   CNAME sesuai yang Railway berikan.

Variable yang wajib diisi di Railway (Render mengisinya otomatis lewat
blueprint):

```
DATABASE_URL=file:/app/database/canteen.db
CLIENT_DIST_DIR=/app/apps/pos-web/dist
NODE_ENV=production
AUTH_DISABLED=false
JWT_SECRET=<acak, 32 byte hex>
JWT_REFRESH_SECRET=<acak, 32 byte hex>
BOT_API_KEY=<acak>
WORKER_API_KEY=<acak>
DASHBOARD_API_KEY=<acak>
DASHBOARD_ORIGIN=https://pos.domainanda.com
DEFAULT_STORE_ID=default-store
DEFAULT_TENANT_ID=default
SEED_ON_START=true   # kembalikan ke false setelah login pertama berhasil
```

Buat nilai acaknya dengan `openssl rand -hex 32`.

## Login pertama

Buka domain Anda, login `admin@lecrion.com` / `admin123`.

**Ganti password itu segera.** Seed juga membuat beberapa akun QA yang
password-nya tertulis di `prisma/seed.ts` — dan repo Anda publik. Hapus akun
yang tidak dipakai sebelum dipakai pelanggan.

## Webhook WhatsApp

Sama seperti pada VPS: arahkan webhook Fonnte ke
`https://pos.domainanda.com/api/bot/webhook`, lalu isi `FONNTE_TOKEN`,
`FONNTE_WA_NUMBER`, dan `FONNTE_WEBHOOK_SECRET` di Variables. Service akan
restart otomatis.

## Batasan yang perlu Anda tahu

Karena SQLite, service ini **tidak boleh di-scale lebih dari satu instance**.
Di Railway maupun Render, biarkan replica tetap 1. Bila nanti butuh lebih,
pindah ke PostgreSQL — jalurnya tercatat di `prisma.config.ts`.

---

# Opsi A & B — VPS sendiri

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

## Langkah 2 — Buat kunci SSH untuk GitHub Actions (Opsi A)

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

## Langkah 4 — Isi secret di GitHub (Opsi A)

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

## Langkah 5 — Deploy (Opsi A: GitHub Actions)

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

## Langkah 5b — Deploy (Opsi B: build di server, tanpa Actions)

Lewati Langkah 2 dan 4 — tidak ada SSH key atau secret yang perlu disiapkan.

Di server, ambil source dan bangun langsung di sana:

```bash
ssh deploy@IP_SERVER
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/gibssheree/lecrion.git /opt/lecrion
cd /opt/lecrion
```

Buat `/opt/lecrion/.env` seperti pada Langkah 3, lalu:

```bash
export LECRION_DOMAIN=pos.contoh.com
docker compose -f infra/docker/docker-compose.selfhost.yml up -d --build
```

Build pertama memakan beberapa menit. Bila VPS Anda hanya 1 GB RAM, aktifkan
swap dulu supaya build Vite tidak kehabisan memori:

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

Cek hasilnya:

```bash
docker compose -f infra/docker/docker-compose.selfhost.yml ps
curl https://pos.contoh.com/api/health
```

**Update ke versi terbaru** cukup tarik commit baru lalu bangun ulang:

```bash
cd /opt/lecrion && git pull
docker compose -f infra/docker/docker-compose.selfhost.yml up -d --build
```

Untuk perintah operasional di bawah, ganti `docker-compose.prod.yml` menjadi
`docker-compose.selfhost.yml`.

## Langkah 6 — Buat akun pertama

Database baru masih kosong. Isi data awal sekali saja:

```bash
ssh deploy@IP_SERVER
cd /opt/lecrion
docker compose -f infra/docker/docker-compose.prod.yml exec api npx tsx prisma/seed.ts
```

Pada Opsi B, ganti `docker-compose.prod.yml` menjadi `docker-compose.selfhost.yml`.

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
