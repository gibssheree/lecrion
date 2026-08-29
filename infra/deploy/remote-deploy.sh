#!/usr/bin/env bash
# infra/deploy/remote-deploy.sh
#
# Dijalankan DI SERVER oleh .github/workflows/deploy.yml (via ssh), atau
# manual saat Anda ingin menerapkan ulang tanpa lewat GitHub Actions.
#
# Variabel yang dibaca dari environment:
#   APP_DIR         direktori stack di server (mis. /opt/lecrion)
#   IMAGE_PREFIX    mis. ghcr.io/gibssheree/lecrion
#   IMAGE_TAG       tag image yang di-deploy (commit SHA)
#   LECRION_DOMAIN  domain publik, dipakai Caddy untuk menerbitkan sertifikat
#   GHCR_USER       user untuk `docker login ghcr.io`
#   GHCR_TOKEN      token untuk `docker login ghcr.io`

set -euo pipefail

: "${APP_DIR:?APP_DIR belum diset}"
: "${IMAGE_PREFIX:?IMAGE_PREFIX belum diset}"
: "${IMAGE_TAG:?IMAGE_TAG belum diset}"
: "${LECRION_DOMAIN:?LECRION_DOMAIN belum diset}"

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $APP_DIR/.env tidak ada di server." >&2
  echo "Buat dari .env.example, lalu isi JWT_SECRET dan JWT_REFRESH_SECRET." >&2
  echo "API sengaja menolak start tanpa keduanya (SEC-02). Lihat DEPLOY.md." >&2
  exit 1
fi

if [ -n "${GHCR_TOKEN:-}" ]; then
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "${GHCR_USER:?}" --password-stdin
fi

export IMAGE_PREFIX IMAGE_TAG LECRION_DOMAIN
compose() { docker compose -f infra/docker/docker-compose.prod.yml "$@"; }

echo "--- menarik image $IMAGE_PREFIX-*:$IMAGE_TAG ---"
compose pull

# Service `api` menjalankan `prisma migrate deploy` saat start, dan `worker`
# menunggu api healthy, sehingga migrasi selesai sebelum ada yang membaca DB.
echo "--- menerapkan stack ---"
compose up -d --remove-orphans

echo "--- menunggu api healthy ---"
healthy=false
for _ in $(seq 1 60); do
  if compose ps --format json api 2>/dev/null | grep -q '"Health":"healthy"'; then
    healthy=true
    break
  fi
  sleep 5
done

compose ps

if [ "$healthy" != true ]; then
  echo "ERROR: api tidak menjadi healthy dalam 5 menit. Log terakhir:" >&2
  compose logs --tail=100 api >&2
  exit 1
fi

echo "--- membersihkan image lama ---"
docker image prune -f

echo "Deploy selesai: $IMAGE_PREFIX-*:$IMAGE_TAG"
