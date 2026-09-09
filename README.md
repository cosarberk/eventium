# Eventium

**Plugin-based event monitoring and notification dashboard platform.**

Eventium is a real-time, plugin-driven dashboard that aggregates events from your entire infrastructure — GitLab, GitHub, Nexus, Artifactory, Verdaccio, MinIO, and more — into a single, beautiful live screen. Think of it as the Backstage for your war room TV.

## Features

- **Pure Data-Source Plugins** — Every integration is a self-contained folder with a `manifest.json`. A plugin is *only* a data source: it declares a **capability descriptor** (the entities, fields, and event types it exposes), answers **resource queries**, and streams normalized events. It ships **no** UI and never decides how anything is displayed. Drop it in `plugins/` and it is discovered automatically — no core changes. GitLab and Nexus ship as working examples.
- **Notion-style Design Layer** — Users build pages from generic **components** (stat, table, badge, timeline, line/bar chart, gauge, text, separator) and bind each component *slot* to any source field via a portable address like `gitlab:repository.createdAt`. Binding is **cross-source**: one table can put a `gitlab:` column beside a `nexus:` column. Add conditional color rules ("value under 40 turns red") and formatting per value — all without code.
- **Grafana-style Grid Builder** — A true 12-column grid (react-grid-layout) with drag, resize, and free positioning. Compose many components, each bound to many sources, on one screen.
- **Portable Pages** — Export any page to plain JSON and share it. Bindings reference source *types*, not instances, so importing only asks you to map each referenced type (e.g. `gitlab`) to a locally installed instance.
- **Live TV / Kiosk View** — Publish a page to a public, no-login URL for a wall display. Auto-rotation, cursor auto-hide, fullscreen.
- **Hospital-style Announcements** — When a release/publish or a failure/critical event fires, the TV erupts in a full-screen flashing alarm with sound — e.g. *"acme-api 1.4.2 published to releases"*.
- **Real-time Events** — WebSocket-powered live feed and component refresh. No page reloads.
- **Self-hosted** — Your data stays on your servers. No external dependencies.

## Architecture

```
┌────────────────────────────────────────────────────┐
│                 Frontend (React 19)                 │
│   Design Layer: Component Registry · Binding UI     │
│   Page Grid  ·  Live/TV View                        │
├────────────────────────────────────────────────────┤
│         WebSocket (Socket.io)  ·  GraphQL           │
├────────────────────────────────────────────────────┤
│                 Backend (Fastify)                   │
│  ┌───────────────┐  ┌──────────────────────────┐   │
│  │  Binding      │  │   Data-Source Manager     │   │
│  │  Resolver     │  │   (capabilities + query)  │   │
│  └──────┬────────┘  └───────────┬──────────────┘   │
│         │                       │                   │
│  ┌──────▼───────────────────────▼───────────────┐  │
│  │        Unified Data Layer  ·  Event Bus       │  │
│  │   queryResource · stream · emit · subscribe   │  │
│  └──┬────────┬────────┬────────┬────────┬────────┘  │
│     │        │        │        │        │           │
│   GitLab   Nexus     GH       AF      MinIO  …      │
│   (each a pure data-source plugin)                  │
├────────────────────────────────────────────────────┤
│              PostgreSQL  ·  Redis                   │
└────────────────────────────────────────────────────┘
```

### Core Concepts

| Concept | Description |
|---------|-------------|
| **Data Source** | A plugin. Declares a capability descriptor, answers resource queries, and streams events. Ships no UI. |
| **Capability Descriptor** | The machine-readable surface of a source: entities → fields (with types) + event types. Drives the binding vocabulary. |
| **Binding** | A portable address `sourceType:entity.field` (+ instance, filters, aggregation) that feeds one design-layer slot. |
| **Component Registry** | The set of render components (stat, table, chart, …). Adding one = a descriptor + a renderer, no core change. |
| **Binding Resolver** | Turns each binding into a scalar/series/list, matching the slot it feeds. Cross-source by design. |
| **Event Bus** | Central broker. Sources emit events; the notification engine and live alarm subscribe. |
| **Notification Engine** | Routes events to sound alerts, toasts, and banners based on user-defined rules. |

### Data-Source Interface

A plugin's entry module exports these named members (see `@eventium/plugin-sdk`):

```typescript
import type { Capabilities, ResourceResolver, WebhookHandler } from '@eventium/plugin-sdk';

/** What this source exposes: queryable entities/fields + streamed event types. */
export const capabilities: Capabilities;

/** Answer a resource query (entity + params) with flat rows. */
export const queryResource: ResourceResolver;

/** (optional) Translate an inbound webhook into normalized events. */
export const handleWebhook?: WebhookHandler;

/** (optional) Pull dynamic metadata (project lists, repos, …) after install. */
export const fetchMetadata?: MetadataFetcher;

/** (optional) Self-manage webhooks on monitorable targets. */
export const webhookTargets?: WebhookTargetProvider;
```

There is exactly one contract — no class hierarchy, no decorators, no UI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | React 19 · TypeScript · Vite 6 |
| UI | Radix UI · Tailwind CSS v4 |
| Client State | Zustand |
| Server State | TanStack React Query v5 · urql (GraphQL) |
| Routing | TanStack Router |
| Backend | Fastify · Mercurius (GraphQL) |
| ORM | Prisma |
| Realtime | Socket.io |
| Queue | BullMQ + Redis |
| Database | PostgreSQL 16 |
| Linter | Biome |
| Container | Docker + Docker Compose |

## Project Structure

```
eventium/
├── apps/
│   ├── backend/             # Fastify + Mercurius API server
│   └── frontend/            # React + Vite dashboard client
├── packages/
│   ├── shared/              # Shared types, Zod schemas, SVG icon validation
│   └── plugin-sdk/          # The data-source contract types + webhook helpers
├── plugins/
│   ├── gitlab/              # GitLab integration plugin (example)
│   └── nexus/               # Sonatype Nexus integration plugin (example)
├── docker/
│   ├── Dockerfile             # Tek image: backend (node) + frontend (nginx)
│   ├── eventium-entrypoint.sh # Migration + nginx & node launcher
│   ├── nginx.single.conf
│   └── security-headers.conf
├── docker-compose.yml
├── k8s/                       # Kubernetes manifestleri (kustomize)
├── turbo.json
├── pnpm-workspace.yaml
└── biome.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose (for PostgreSQL and Redis)

### Installation

```bash
# Clone the repository
git clone https://github.com/relteco/eventium.git
cd eventium

# Install dependencies
pnpm install

# Copy environment variables and generate the two required secrets
cp .env.example .env
echo "JWT_SECRET=$(openssl rand -base64 48)"     >> .env
echo "ENCRYPTION_KEY=$(openssl rand -base64 48)" >> .env

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d postgres redis

# Create the database schema
pnpm db:deploy      # applies migrations; use db:push for throwaway databases

# Seed an admin user + demo dashboard + public broadcast link
pnpm db:seed

# Start development servers
pnpm dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:4000`.
The dev server proxies `/api`, `/graphql`, and `/socket.io` to the backend, so the
app runs same-origin in development just as it does in production.

The seed creates `admin@eventium.local` and **prints a generated password once** —
copy it before the output scrolls away. (Set `ADMIN_PASSWORD` in `.env` beforehand
to choose your own; it must be at least 12 characters.) It also prints a public
broadcast token: open the live TV view at `http://localhost:5173/b/<token>`, tap
once to enable sound, then leave it on a wall display.

> **Required secrets.** The backend refuses to start without `JWT_SECRET`, and
> without `ENCRYPTION_KEY` it derives the credential-encryption key from
> `JWT_SECRET` — which couples rotating your session secret to losing every stored
> plugin token. Set both explicitly.

> **Note:** the bundled `docker-compose.yml` binds PostgreSQL, Redis, and the API
> to `127.0.0.1` only. If host port `5432` is already in use, set `POSTGRES_PORT`
> in `.env` (and update `DATABASE_URL`) before starting.

## Receiving Events (Webhooks)

Panels (projects, versions, pipelines) work with just an access token — those are
outbound API calls. The **live event feed and the TV alarm** rely on **inbound
webhooks**, which means the external service (GitLab/Nexus) must be able to reach
this instance.

**Production (recommended):** set `PUBLIC_URL` to your own domain (e.g.
`PUBLIC_URL=https://eventium.example.com`) in `.env`. Then in **Plugins →
Installed → GitLab → Projects**, toggle the repositories you want and click
**Apply**; Eventium installs the webhook on each selected repo automatically via
the API. No need to open each project's settings.

**Local testing without a public address:** an optional bundled **Cloudflare quick
tunnel** can stand in. It is opt-in, because it publishes the whole instance on a
public URL for as long as it runs:

```bash
docker compose --profile tunnel up -d
# then leave PUBLIC_URL empty and set:
#   TUNNEL_METRICS_URL=http://cloudflared:2000
```

The backend discovers the generated `https://<random>.trycloudflare.com` hostname
and uses it as the webhook base. The URL changes on restart; saved project
webhooks are re-registered against the new one automatically on startup.

> **Security note:** while the tunnel runs, anyone with the generated URL can reach
> this instance. Use it for local testing only; in production use your own domain.

**Requirements:** the GitLab token needs the `api` scope to create webhooks. Set a
**Webhook Secret** in the plugin config — it is applied to the hooks Eventium
creates and verified on every inbound delivery. With
`WEBHOOK_REQUIRE_SECRET=true` (the default in production) an instance without a
webhook secret rejects inbound deliveries outright, because anyone who can reach
the ingress could otherwise forge events and trigger the TV alarm.

## Security Model

| Area | Behaviour |
|------|-----------|
| **Sessions** | Argon2id password hashing, JWT in an `HttpOnly` cookie, `Secure` in production (`COOKIE_SECURE=false` for deliberate plain-HTTP deployments). |
| **Roles** | `VIEWER` reads; `EDITOR` builds pages, rules, and broadcast links; `ADMIN` installs and configures data sources. Enforced per GraphQL resolver, not just in the UI. |
| **Registration** | `POST /api/auth/register` is disabled in production (`ALLOW_REGISTRATION`). The first account created owns the instance as `ADMIN`. |
| **Credentials at rest** | Config fields a manifest declares as `secret` are encrypted with AES-256-GCM (`ENCRYPTION_KEY`) and never returned by the API — reads come back as `••••••••`. Submitting the mask unchanged keeps the stored value. |
| **Public broadcast links** | A token grants exactly one thing: reading its own page and resolving *the bindings that page declares*. It cannot resolve arbitrary bindings, and its live event stream is scoped to the source types that page uses. |
| **Webhook ingress** | Shared secrets are compared in constant time. Authentication failures are refused; a delivery that authenticated but failed to parse is still acknowledged, so a parser fault cannot make GitLab disable the hook. |
| **Outbound webhooks** | Notification targets are resolved and refused if they land on loopback, RFC1918, link-local, or cloud-metadata addresses (`ALLOW_PRIVATE_NETWORK_WEBHOOKS` to opt in), with a timeout and bounded retries. |
| **Plugin icons** | Manifest SVGs are validated as inert markup before they are ever injected into the DOM; anything with a script, handler, or remote reference is dropped. |
| **Rate limiting** | Global, plus stricter budgets for the credential endpoints and webhook ingress. |
| **Error responses** | Validation, auth, and not-found errors keep their message and a machine-readable code; anything else is logged in full and returned as a generic internal error, so driver and filesystem details never reach a client. |
| **Retention** | Events older than `EVENT_RETENTION_DAYS` (default 30) are pruned daily; oversized event payloads are truncated before storage. |

### Verifying a deployment

`scripts/verify-deployment.sh` probes a running instance for the boundaries above.
It is read-only unless `--with-writes` is passed:

```bash
BASE_URL=https://eventium.example.com \
ADMIN_EMAIL=admin@eventium.local ADMIN_PASSWORD='…' \
BROADCAST_TOKEN='…' pnpm verify
```

## Deployment

The bundled images are built for restricted clusters (Rancher/Kubernetes with a
non-root policy):

- both containers run as an unprivileged user; Nginx listens on `8080`
- the backend applies pending migrations on start (`RUN_MIGRATIONS=false` to
  manage them yourself) and refuses to start if a migration fails
- `HEALTHCHECK` targets `/health`, which reports the database and Redis; a
  degraded instance answers `503` so the orchestrator stops routing to it
- `/health/live` is a dependency-free liveness probe
- `SIGTERM` drains the HTTP server, WebSocket connections, and BullMQ workers
  before exit

```bash
# Required in .env: JWT_SECRET, ENCRYPTION_KEY, POSTGRES_PASSWORD
docker compose up -d --build

# First run only: create the initial admin
RUN_SEED=true docker compose up -d backend
```

Only the frontend publishes a host port (`WEB_PORT`, default `80`); the API,
PostgreSQL, and Redis are reachable on `127.0.0.1` only, with the frontend
proxying `/api`, `/graphql`, and `/socket.io` to the backend. The frontend image
is hostname-agnostic — it talks to its own origin, so the same build works behind
any domain without a rebuild.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Run Biome linter |
| `pnpm lint:fix` | Fix linting issues |
| `pnpm db:push` | Sync the schema to the database (no migration files) |
| `pnpm db:migrate` | Create a new migration from schema changes (development) |
| `pnpm db:deploy` | Apply pending migrations (production) |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:seed` | Seed admin user + demo dashboard + broadcast link |
| `pnpm docker:up` | Start Docker services |
| `pnpm docker:down` | Stop Docker services |
| `pnpm verify` | Probe a running instance's security boundaries (see below) |

## Writing a Data-Source Plugin

A plugin is a folder under `plugins/` with a `manifest.json` and a compiled entry
module. The platform discovers it at startup — no core changes required. Use
`plugins/gitlab` and `plugins/nexus` as complete references.

### 1. The manifest (`plugins/<id>/manifest.json`)

Identity, the config fields shown in the install form, and the entry module:

```jsonc
{
  "id": "myservice",
  "name": "My Service",
  "version": "1.0.0",
  "author": "You",
  "icon": "<svg …/>",
  "main": "./dist/index.js",          // exports the DataSourceModule
  "configFields": [
    { "key": "url", "label": "Base URL", "type": "string", "required": true },
    { "key": "token", "label": "API Token", "type": "secret", "required": false }
  ]
}
```

### 2. Capabilities — what you expose

Declare your entities (with typed fields) and the event types you stream. This is the
sole source of the binding vocabulary the design layer offers (`myservice:thing.name`):

```typescript
import { f, type Capabilities } from '@eventium/plugin-sdk';

export const capabilities: Capabilities = {
  entities: [
    {
      key: 'thing', label: 'Thing',
      fields: [
        f.string('name', 'Name'),
        f.number('size', 'Size', { unit: 'bytes' }),
        f.datetime('createdAt', 'Created'),
      ],
    },
  ],
  events: [
    { type: 'myservice.thing.published', label: 'Thing Published',
      description: 'A thing was published', defaultSeverity: 'INFO' },
  ],
};
```

### 3. Resource queries — `queryResource(query, ctx)`

Return flat rows (field key → value) for the requested entity. The design layer binds
and shapes them; you never produce UI or view models:

```typescript
import type { ResourceResolver } from '@eventium/plugin-sdk';

export const queryResource: ResourceResolver = async (query, ctx) => {
  if (query.entity === 'thing') {
    const things = await fetchThings(ctx.config);
    return { rows: things.map((t) => ({ name: t.name, size: t.size, createdAt: t.created_at })) };
  }
  return { rows: [] };
};
```

### 4. Streaming — `handleWebhook(payload, headers, ctx)` *(optional)*

Translate an inbound webhook into events via `ctx.emitEvent(...)`. Events whose type
matches `release` / `publish` / `deploy` (or severity `ERROR` / `CRITICAL`) trigger the
full-screen TV announcement automatically. `fetchMetadata` and `webhookTargets` are also
optional — see the SDK types.

Build the plugin with `tsc` (so `dist/` exists), then restart the backend — it appears
in the marketplace ready to install.

## License

Licensed under the [Apache License 2.0](./LICENSE).

Copyright 2026 [Relteco](https://relteco.com).
