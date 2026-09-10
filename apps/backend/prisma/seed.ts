/**
 * @file Database seed script.
 * Creates the initial admin user and, on a fresh database, a demo dashboard
 * with a public broadcast link so the live/TV view is immediately usable.
 * Reads credentials from ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars.
 *
 * When ADMIN_PASSWORD is absent the well-known default below is used and the
 * account is flagged `mustChangePassword`, so the first login forces a reset.
 *
 * Usage: npx tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

/** Minimum admin password length, matching the register endpoint. */
const MIN_PASSWORD_LENGTH = 12;

/** Default admin password used when ADMIN_PASSWORD is not provided. */
const DEFAULT_ADMIN_PASSWORD = 'eventiumadmin123';

/**
 * Resolve the initial admin password: the configured one when it is strong
 * enough, otherwise the well-known default (which forces a change on first
 * login via `mustChangePassword`).
 *
 * @returns The password and whether it is the forced-change default.
 */
function resolveAdminPassword(): { password: string; isDefault: boolean } {
  const configured = process.env.ADMIN_PASSWORD;

  if (configured && configured.length >= MIN_PASSWORD_LENGTH) {
    return { password: configured, isDefault: false };
  }

  if (configured) {
    throw new Error(
      `ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters. ` +
        'Unset it to use the default (eventiumadmin123).',
    );
  }

  return { password: DEFAULT_ADMIN_PASSWORD, isDefault: true };
}

/**
 * Creates a demo page with a couple of static design-layer blocks and a public
 * broadcast link. The blocks carry no bindings yet — once a GitLab/Nexus source
 * is installed, the user adds components and binds fields to build a live board.
 *
 * @param userId - Owner of the broadcast link.
 */
async function createDemoDashboard(userId: string): Promise<void> {
  if ((await prisma.dashboard.count()) > 0) return;

  const dashboard = await prisma.dashboard.create({
    data: {
      name: 'Operations',
      description: 'Live operations overview',
      isDefault: true,
      layout: { columns: 12 },
      blocks: {
        create: [
          {
            componentType: 'separator',
            title: '',
            slots: {},
            options: { label: 'Operations Overview' },
            position: { x: 0, y: 0 },
            size: { w: 12, h: 1 },
            sortOrder: 0,
          },
          {
            componentType: 'text',
            title: 'Getting started',
            slots: { content: { values: [] } },
            options: {
              text: 'Install a GitLab or Nexus data source, then add components and bind their fields to build your live board.',
            },
            position: { x: 0, y: 1 },
            size: { w: 12, h: 2 },
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const link = await prisma.broadcastLink.create({
    data: {
      name: 'Operations TV',
      createdBy: userId,
      dashboards: { create: [{ dashboardId: dashboard.id, sortOrder: 0 }] },
    },
  });

  console.log(`Demo dashboard created: ${dashboard.name} (${dashboard.id})`);
  console.log(`Public broadcast link token: ${link.token}`);
}

async function seed(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@eventium.local').toLowerCase();
  const name = process.env.ADMIN_NAME ?? 'Admin';

  const existingCount = await prisma.user.count();

  if (existingCount > 0) {
    console.log('Database already has users. Skipping seed.');
    return;
  }

  const { password, isDefault } = resolveAdminPassword();
  const passwordHash = await argon2.hash(password);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role: 'ADMIN',
      // Default password → force a change on first login.
      mustChangePassword: isDefault,
    },
  });

  console.log(`Admin user created: ${user.email} (${user.id})`);
  if (isDefault) {
    console.log('');
    console.log('  ┌─────────────────────────────────────────────────────────┐');
    console.log('  │  Default admin credentials — change on first login:     │');
    console.log(`  │  email:    ${email.padEnd(45)} │`);
    console.log(`  │  password: ${password.padEnd(45)} │`);
    console.log('  └─────────────────────────────────────────────────────────┘');
    console.log('');
  }

  await createDemoDashboard(user.id);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
