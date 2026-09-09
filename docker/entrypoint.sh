#!/bin/sh
# Backend container entrypoint.
#
# Applies pending database migrations before the server accepts traffic, then
# hands off to the process given as CMD. Schema drift between a rolling image and
# its database is the most common cause of a deploy that starts but fails every
# request, so this runs by default; set RUN_MIGRATIONS=false to manage migrations
# out of band.
#
# Binaries are invoked through node_modules/.bin rather than `pnpm exec`: the
# latter re-enters corepack, which tries to fetch a package manager at runtime and
# fails on a network-isolated host.
set -e

BIN=./node_modules/.bin

run_tool() {
  tool="$1"
  shift
  if [ -x "$BIN/$tool" ]; then
    "$BIN/$tool" "$@"
  elif [ -x "../../node_modules/.bin/$tool" ]; then
    "../../node_modules/.bin/$tool" "$@"
  else
    echo "[entrypoint] $tool is not installed in this image." >&2
    return 127
  fi
}

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

exec "$@"
