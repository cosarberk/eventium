# syntax=docker/dockerfile:1
#
# Tek image: backend (node) + frontend (nginx) aynı container'da.
# nginx statik SPA'yı servis eder ve /api·/graphql·/socket.io'yu 127.0.0.1:4000'e
# proxy'ler. Ayrı ayrı ölçekleme gerekmeyen self-host kurulumlar için.

# ── Base ──────────────────────────────────────────────────
FROM node:22-alpine AS base
# openssl: Prisma query engine (musl). libc6-compat: bazı native modüller.
# tini: zombie reap + SIGTERM iletimi. nginx: frontend'i servis eder.
RUN apk add --no-cache openssl libc6-compat tini nginx \
    && corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app
ENV CI=true
ENV HUSKY=0

# ── Bağımlılıkları store'a çek ─────────────────────────────
FROM base AS deps
# argon2 gibi native modüller için musl prebuild yoksa toolchain gerekir.
RUN apk add --no-cache --virtual .build-deps python3 make g++
COPY pnpm-lock.yaml ./
RUN pnpm fetch --frozen-lockfile

# ── Build (backend + frontend + plugins) ──────────────────
FROM deps AS build
# Vite build-time değişkenleri; same-origin default'lar (nginx proxy'liyor).
ARG VITE_GRAPHQL_URL=/graphql
ARG VITE_WS_URL=
ARG VITE_API_BASE_URL=/api
ENV VITE_GRAPHQL_URL=$VITE_GRAPHQL_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY . .
RUN pnpm install --frozen-lockfile --offline
RUN pnpm --filter @eventium/shared build \
    && pnpm --filter @eventium/plugin-sdk build \
    && pnpm --filter @eventium/backend exec prisma generate \
    && pnpm --filter @eventium/backend build \
    && pnpm --filter @eventium/frontend build \
    && pnpm --filter "./plugins/*" build

# Prod ağacına indir. Frontend'in dist'ini KORU (nginx buradan servis edecek),
# yalnızca frontend node_modules'ı at. Backend runtime bağımlılıkları (prisma, tsx)
# --prod reinstall ile korunur.
RUN rm -rf apps/frontend/node_modules \
           .turbo apps/*/.turbo packages/*/.turbo plugins/*/.turbo \
    && find . -name '*.tsbuildinfo' -delete \
    && pnpm install --frozen-lockfile --offline --prod

# ── Production ─────────────────────────────────────────────
FROM base AS production
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app /app
COPY docker/nginx.single.conf /etc/nginx/nginx.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --chown=node:node docker/eventium-entrypoint.sh /usr/local/bin/eventium-entrypoint.sh
RUN chmod +x /usr/local/bin/eventium-entrypoint.sh

# Non-root çalış: nginx temp/pid yolları /tmp/nginx'e (config), logları stdout/stderr'e.
USER node
WORKDIR /app/apps/backend
EXPOSE 8080

# nginx her zaman ayakta olduğu için liveness onu yoklar; backend sağlığı
# readiness ile /health üzerinden kontrol edilir (k8s probe'u).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/eventium-entrypoint.sh"]
