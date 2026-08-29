#!/usr/bin/env bash
# infra/deploy/ec2-bootstrap.sh
#
# Menyiapkan satu instance EC2 kosong menjadi server Lecrion yang berjalan.
#
# Bisa dipakai dua cara:
#   1. Tempel isinya ke kolom "User data" saat launch instance EC2 (jalan
#      otomatis sekali, sebagai root, saat boot pertama).
#   2. Jalankan manual di instance yang sudah ada:
#        sudo LECRION_DOMAIN=pos.contoh.com bash infra/deploy/ec2-bootstrap.sh
#
# Aman dijalankan berulang: paket yang sudah ada dilewati, dan .env yang sudah
# ada TIDAK ditimpa (menimpanya akan mengubah JWT_SECRET dan membuat semua
# sesi login yang berjalan langsung tidak valid).
#
# Variabel:
#   LECRION_DOMAIN  (wajib) domain publik, mis. pos.contoh.com
#   LECRION_REPO    (opsional) default https://github.com/gibssheree/lecrion.git
#   LECRION_BRANCH  (opsional) default claude/lecrion-github-deploy-p90c6i
#   APP_DIR         (opsional) default /opt/lecrion

set -euo pipefail

LECRION_REPO="${LECRION_REPO:-https://github.com/gibssheree/lecrion.git}"
LECRION_BRANCH="${LECRION_BRANCH:-claude/lecrion-github-deploy-p90c6i}"
APP_DIR="${APP_DIR:-/opt/lecrion}"

log() { echo "[lecrion-bootstrap] $*"; }
die() { echo "[lecrion-bootstrap] ERROR: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "jalankan sebagai root (pakai sudo)"
[ -n "${LECRION_DOMAIN:-}" ] || die "LECRION_DOMAIN belum diset, mis. LECRION_DOMAIN=pos.contoh.com"

# ── Paket dasar ──────────────────────────────────────────────────────────────
if command -v dnf >/dev/null 2>&1; then
  PKG=dnf            # Amazon Linux 2023
elif command -v apt-get >/dev/null 2>&1; then
  PKG=apt            # Ubuntu / Debian
else
  die "package manager tidak dikenali (bukan Amazon Linux atau Ubuntu?)"
fi

log "Memasang git dan curl (package manager: $PKG)"
if [ "$PKG" = dnf ]; then
  dnf install -y git curl tar >/dev/null
else
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq git curl ca-certificates >/dev/null
fi

# ── Docker ───────────────────────────────────────────────────────────────────
if command -v docker >/dev/null 2>&1; then
  log "Docker sudah terpasang"
else
  log "Memasang Docker"
  if [ "$PKG" = dnf ]; then
    # Amazon Linux 2023 punya paket docker di repo bawaannya. Skrip
    # get.docker.com tidak mendukung AL2023.
    dnf install -y docker >/dev/null
  else
    curl -fsSL https://get.docker.com | sh >/dev/null
  fi
fi

systemctl enable --now docker
# ec2-user (Amazon Linux) atau ubuntu (Ubuntu) supaya bisa docker tanpa sudo.
for u in ec2-user ubuntu; do
  id "$u" >/dev/null 2>&1 && usermod -aG docker "$u" || true
done

# ── Plugin docker compose ────────────────────────────────────────────────────
# Amazon Linux 2023 memasang docker tanpa plugin compose; get.docker.com di
# Ubuntu sudah menyertakannya.
if docker compose version >/dev/null 2>&1; then
  log "docker compose sudah tersedia"
else
  log "Memasang plugin docker compose"
  CLI_PLUGINS=/usr/local/lib/docker/cli-plugins
  mkdir -p "$CLI_PLUGINS"
  ARCH=$(uname -m)   # x86_64 pada t3, aarch64 pada t4g (Graviton)
  curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
    -o "$CLI_PLUGINS/docker-compose"
  chmod +x "$CLI_PLUGINS/docker-compose"
  docker compose version >/dev/null 2>&1 || die "plugin docker compose gagal dipasang"
fi

# ── Swap ─────────────────────────────────────────────────────────────────────
# Build Vite butuh memori. Instance 1 GB (t3.micro / t4g.micro) akan kehabisan
# memori dan build-nya dibunuh OOM killer tanpa swap.
TOTAL_MB=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$TOTAL_MB" -lt 1800 ] && [ ! -f /swapfile ]; then
  log "RAM ${TOTAL_MB}MB — membuat swap 2GB agar build tidak kena OOM"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "RAM ${TOTAL_MB}MB — swap tidak diperlukan"
fi

# ── Source ───────────────────────────────────────────────────────────────────
if [ -d "$APP_DIR/.git" ]; then
  log "Repo sudah ada di $APP_DIR — menarik commit terbaru"
  git -C "$APP_DIR" fetch origin "$LECRION_BRANCH"
  git -C "$APP_DIR" checkout "$LECRION_BRANCH"
  git -C "$APP_DIR" pull origin "$LECRION_BRANCH"
else
  log "Meng-clone $LECRION_REPO (branch $LECRION_BRANCH) ke $APP_DIR"
  git clone --branch "$LECRION_BRANCH" "$LECRION_REPO" "$APP_DIR"
fi

# ── .env ─────────────────────────────────────────────────────────────────────
if [ -f "$APP_DIR/.env" ]; then
  log ".env sudah ada — dibiarkan apa adanya (menimpanya akan mengganti"
  log "JWT_SECRET dan memutus semua sesi login yang sedang berjalan)"
else
  log "Membuat $APP_DIR/.env dengan rahasia acak"
  cat > "$APP_DIR/.env" <<ENV
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
DASHBOARD_ORIGIN=https://${LECRION_DOMAIN}
DEFAULT_STORE_ID=default-store
DEFAULT_TENANT_ID=default
ENV
  chmod 600 "$APP_DIR/.env"
fi

# ── Jalankan ─────────────────────────────────────────────────────────────────
cd "$APP_DIR"
export LECRION_DOMAIN
COMPOSE="docker compose -f infra/docker/docker-compose.selfhost.yml"

log "Membangun dan menjalankan stack (build pertama bisa 5-15 menit)"
$COMPOSE up -d --build

log "Menunggu api healthy"
for _ in $(seq 1 60); do
  if $COMPOSE ps --format json api 2>/dev/null | grep -q '"Health":"healthy"'; then
    log "api healthy"
    break
  fi
  sleep 10
done

$COMPOSE ps

if ! $COMPOSE ps --format json api | grep -q '"Health":"healthy"'; then
  log "api belum healthy. Log terakhir:"
  $COMPOSE logs --tail=100 api
  die "stack gagal naik"
fi

log ""
log "Selesai. Langkah berikutnya:"
log "  1. Pastikan A-record ${LECRION_DOMAIN} mengarah ke Elastic IP instance ini"
log "  2. Pastikan Security Group membuka port 80 dan 443 dari 0.0.0.0/0"
log "     (Caddy butuh port 80 untuk menerbitkan sertifikat TLS)"
log "  3. Isi data awal sekali saja:"
log "       cd $APP_DIR && $COMPOSE exec api npx tsx prisma/seed.ts"
log "  4. Buka https://${LECRION_DOMAIN} dan login admin@lecrion.com / admin123"
log "     lalu SEGERA ganti passwordnya"
