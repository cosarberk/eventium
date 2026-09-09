#!/bin/sh
# Tek-container (eventium) launcher: migration -> backend (node) + frontend (nginx)
# aynı anda. Biri ölürse diğerini de kapatıp container'ı düşürür ki orchestrator
# yeniden başlatabilsin. SIGTERM ikisine birden iletilir (graceful shutdown).
set -e

BIN=./node_modules/.bin

run_tool() {
  tool="$1"; shift
  if [ -x "$BIN/$tool" ]; then
    "$BIN/$tool" "$@"
  elif [ -x "../../node_modules/.bin/$tool" ]; then
    "../../node_modules/.bin/$tool" "$@"
  else
    echo "[entrypoint] $tool is not installed in this image." >&2
    return 127
  fi
}

# ── Migrations ─────────────────────────────────────────────
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  if ! run_tool prisma migrate deploy --schema=prisma/schema.prisma; then
    echo "[entrypoint] Migration failed; refusing to start." >&2
    exit 1
  fi
  echo "[entrypoint] Migrations up to date."
else
  echo "[entrypoint] RUN_MIGRATIONS=false — skipping migrations."
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seeding initial data..."
  run_tool tsx prisma/seed.ts || echo "[entrypoint] Seed skipped or failed; continuing." >&2
fi

# ── nginx için yazılabilir temp dizinleri ──────────────────
mkdir -p /tmp/nginx/client_body /tmp/nginx/proxy /tmp/nginx/fastcgi /tmp/nginx/uwsgi /tmp/nginx/scgi

# ── Backend (node) ─────────────────────────────────────────
echo "[entrypoint] Starting backend on :4000..."
node dist/index.js &
BACKEND_PID=$!

# ── Frontend (nginx) ───────────────────────────────────────
echo "[entrypoint] Starting nginx on :8080..."
nginx -g 'daemon off;' &
NGINX_PID=$!

term() {
  echo "[entrypoint] Shutting down..."
  kill -TERM "$BACKEND_PID" "$NGINX_PID" 2>/dev/null || true
}
trap term TERM INT

# Biri ölürse ikisini de kapat.
while kill -0 "$BACKEND_PID" 2>/dev/null && kill -0 "$NGINX_PID" 2>/dev/null; do
  sleep 2
done

echo "[entrypoint] A process exited; stopping the container." >&2
term
wait 2>/dev/null || true
