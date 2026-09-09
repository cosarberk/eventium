-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plugin_instances" (
    "id" TEXT NOT NULL,
    "plugin_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plugin_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "plugin_instance_id" TEXT NOT NULL,
    "source_type" TEXT NOT NULL DEFAULT '',
    "event_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "severity" "Severity" NOT NULL DEFAULT 'INFO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "layout" JSONB NOT NULL DEFAULT '{}',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboard_blocks" (
    "id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "component_type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "slots" JSONB NOT NULL DEFAULT '{}',
    "options" JSONB NOT NULL DEFAULT '{}',
    "position" JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
    "size" JSONB NOT NULL DEFAULT '{"w": 6, "h": 4}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "dashboard_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event_pattern" TEXT NOT NULL,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "actions" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "broadcast_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_link_dashboards" (
    "id" TEXT NOT NULL,
    "broadcast_link_id" TEXT NOT NULL,
    "dashboard_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "broadcast_link_dashboards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "plugin_instances_plugin_id_idx" ON "plugin_instances"("plugin_id");

-- CreateIndex
CREATE INDEX "events_plugin_instance_id_idx" ON "events"("plugin_instance_id");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_severity_idx" ON "events"("severity");

-- CreateIndex
CREATE INDEX "events_created_at_idx" ON "events"("created_at");

-- CreateIndex
CREATE INDEX "dashboard_blocks_dashboard_id_idx" ON "dashboard_blocks"("dashboard_id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_links_token_key" ON "broadcast_links"("token");

-- CreateIndex
CREATE INDEX "broadcast_link_dashboards_broadcast_link_id_idx" ON "broadcast_link_dashboards"("broadcast_link_id");

-- CreateIndex
CREATE UNIQUE INDEX "broadcast_link_dashboards_broadcast_link_id_dashboard_id_key" ON "broadcast_link_dashboards"("broadcast_link_id", "dashboard_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_plugin_instance_id_fkey" FOREIGN KEY ("plugin_instance_id") REFERENCES "plugin_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboard_blocks" ADD CONSTRAINT "dashboard_blocks_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_links" ADD CONSTRAINT "broadcast_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_link_dashboards" ADD CONSTRAINT "broadcast_link_dashboards_broadcast_link_id_fkey" FOREIGN KEY ("broadcast_link_id") REFERENCES "broadcast_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "broadcast_link_dashboards" ADD CONSTRAINT "broadcast_link_dashboards_dashboard_id_fkey" FOREIGN KEY ("dashboard_id") REFERENCES "dashboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

